-- 家具工作台。保留现有布置；草稿不会影响小屋，发布在同一事务内更新四个空间。
begin;
create table if not exists public.vt_model_catalog(
 id smallint primary key check(id=1),config jsonb not null default '{}',version integer not null default 0,updated_at timestamptz not null default now()
);
create table if not exists public.vt_model_workspace(
 id smallint primary key check(id=1),draft jsonb,draft_base jsonb,previous jsonb,published_versions jsonb,version integer not null default 0,updated_at timestamptz not null default now()
);
insert into public.vt_model_catalog(id) values(1) on conflict do nothing;
insert into public.vt_model_workspace(id) values(1) on conflict do nothing;
alter table public.vt_model_catalog enable row level security;
alter table public.vt_model_workspace enable row level security;
revoke all on public.vt_model_catalog,public.vt_model_workspace from public,anon,authenticated;
grant select on public.vt_model_catalog,public.vt_model_workspace to authenticated;
drop policy if exists vt_model_catalog_read on public.vt_model_catalog;
create policy vt_model_catalog_read on public.vt_model_catalog for select to authenticated using((select public.vt_is_member()));
drop policy if exists vt_model_workspace_read on public.vt_model_workspace;
create policy vt_model_workspace_read on public.vt_model_workspace for select to authenticated using((select public.vt_is_admin()));
create or replace function public.vt_validate_decor(p_config jsonb,p_common boolean)
returns void language plpgsql set search_path='' as $$
declare item jsonb;c text;ids text[]:=array[]::text[];
begin
 if p_config is null or jsonb_typeof(p_config)<>'object' or jsonb_typeof(p_config->'items') is distinct from 'array' or jsonb_typeof(p_config->'colors') is distinct from 'object' then raise exception '无效的布置'; end if;
 if octet_length(p_config::text)>12000 or jsonb_array_length(p_config->'items')>(case when p_common then 30 else 12 end) then raise exception '当前空间最多摆放 % 件装饰',case when p_common then 30 else 12 end; end if;
 for c in select jsonb_object_keys(p_config->'colors') loop
  if c not in ('wall','floor','rug') or not ((p_config->'colors'->>c) = any(array['#dfc2bd','#c6d7c5','#c8bfdc','#e6d2aa','#a6becd','#9e806a'])) then raise exception '无效的配色'; end if;
 end loop;
 for item in select value from jsonb_array_elements(p_config->'items') loop
  if jsonb_typeof(item)<>'object' or item->>'type' is null or item->>'type' not in ('plant','lamp','stool','table','cushion','rug','arcade','turntable','guitarstand','speaker','neon','recordrack','terrarium','aquarium','catTower','teaCart','flowerstand','telescope','sofa','armchair','coffeeTable','bookcase','bench','screen','jukebox','gumball','rocket','chess','petBed','musicMobile','wallArt','clock','wallShelf','pegboard') or item->>'id' is null or item->>'id' !~ '^[a-f0-9-]{36}$' or item->>'id'=any(ids) then raise exception '无效的装饰'; end if;
  if item->>'type' in ('wallArt','clock','wallShelf','pegboard') and (not p_common or (item->>'z')::numeric<>2.08 or (item->>'rotation')::numeric<>0) then raise exception '墙饰仅可放在客厅墙面'; end if;
  if item ? 'scale' and (jsonb_typeof(item->'scale') is distinct from 'number' or (item->>'scale')::numeric not between .5 and 1.8) then raise exception '尺寸倍数需在 0.5 到 1.8 之间'; end if;
  if item ? 'collision' and jsonb_typeof(item->'collision') is distinct from 'boolean' then raise exception '无效的碰撞设置'; end if;
  ids:=array_append(ids,item->>'id');
  if jsonb_typeof(item->'x') is distinct from 'number' or jsonb_typeof(item->'z') is distinct from 'number' or jsonb_typeof(item->'rotation') is distinct from 'number' then raise exception '无效的位置'; end if;
  if (item->>'x')::numeric not between (case when p_common then -16.25 else -6.05 end) and (case when p_common then 14.35 else 4.15 end) or (item->>'z')::numeric not between (case when p_common then 2.05 else -3.65 end) and (case when p_common then 12.15 else 8.95 end) or (item->>'rotation')::numeric not in (0,1,2,3) or item->>'color' is null or not (item->>'color'=any(array['#dfc2bd','#c6d7c5','#c8bfdc','#e6d2aa','#a6becd','#9e806a'])) then raise exception '无效的装饰参数'; end if;
 end loop;
end $$;
revoke all on function public.vt_validate_decor(jsonb,boolean) from public,anon,authenticated;

create or replace function public.vt_models_snapshot() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not public.vt_is_admin() then raise exception '仅管理员可管理模型' using errcode='42501'; end if;
 return jsonb_build_object('state',(select to_jsonb(w) from public.vt_model_workspace w where id=1),
 'catalog',(select config from public.vt_model_catalog where id=1),
 'rooms',(select jsonb_object_agg(room_id::text,config) from (select room_id,config from public.vt_decor where room_id between 0 and 2 union all select 3,config from public.vt_common_decor where id=1) r),
 'versions',(select jsonb_object_agg(room_id::text,version) from (select room_id,version from public.vt_decor where room_id between 0 and 2 union all select 3,version from public.vt_common_decor where id=1) r));
end $$;
create or replace function public.vt_models_action(p_action text,p_version integer,p_config jsonb default null,p_base jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare w public.vt_model_workspace; live jsonb; versions jsonb; target jsonb; entry record; prop text; r integer; updated_versions jsonb; old_state jsonb;
begin
 if not public.vt_is_admin() then raise exception '仅管理员可管理模型' using errcode='42501'; end if;
 select * into w from public.vt_model_workspace where id=1 for update;
 if p_version is distinct from w.version then raise exception '模型草稿已被其他设备更新，请重新载入' using errcode='40001'; end if;
 -- 所有发布与恢复使用一致的锁顺序，普通成员保存也会受房间行锁保护。
 perform 1 from public.vt_decor where room_id between 0 and 2 order by room_id for update;
 perform 1 from public.vt_common_decor where id=1 for update;
 live:=public.vt_models_snapshot();versions:=live->'versions';
 if (select count(*) from jsonb_object_keys(versions))<>4 then raise exception '请先初始化三个卧室和客厅布置'; end if;
 if p_action='draft' then
  if p_config is null or jsonb_typeof(p_config) is distinct from 'object' or octet_length(p_config::text)>65000 or jsonb_typeof(p_config->'catalog') is distinct from 'object' or jsonb_typeof(p_config->'rooms') is distinct from 'object' then raise exception '无效的模型草稿'; end if;
  if p_base is distinct from versions then raise exception '家人已更新布置，请丢弃旧草稿，从小屋重新开始' using errcode='40001'; end if;
  if (select count(*) from jsonb_object_keys(p_config->'rooms'))<>4 then raise exception '草稿需要包含四个空间'; end if;
  for r in 0..3 loop perform public.vt_validate_decor(p_config->'rooms'->r::text,r=3); end loop;
  for entry in select key,value from jsonb_each(p_config->'catalog') loop
   if entry.key not in ('plant','lamp','stool','table','cushion','rug','arcade','turntable','guitarstand','speaker','neon','recordrack','terrarium','aquarium','catTower','teaCart','flowerstand','telescope','sofa','armchair','coffeeTable','bookcase','bench','screen','jukebox','gumball','rocket','chess','petBed','musicMobile','wallArt','clock','wallShelf','pegboard') or jsonb_typeof(entry.value) is distinct from 'object' then raise exception '未知的模型'; end if;
   for prop in select jsonb_object_keys(entry.value) loop
    if prop not in ('name','desc','enabled','scale','color','rooms','collision') then raise exception '无效的模型属性'; end if;
   end loop;
   if entry.value ? 'name' and (jsonb_typeof(entry.value->'name') is distinct from 'string' or char_length(btrim(entry.value->>'name')) not between 1 and 30) then raise exception '模型名称需为一至三十字'; end if;
   if entry.value ? 'desc' and (jsonb_typeof(entry.value->'desc') is distinct from 'string' or char_length(entry.value->>'desc')>100) then raise exception '模型介绍最多一百字'; end if;
   if entry.value ? 'scale' and (jsonb_typeof(entry.value->'scale') is distinct from 'number' or (entry.value->>'scale')::numeric not between .5 and 1.8) then raise exception '尺寸倍数需在 0.5 到 1.8 之间'; end if;
   if entry.value ? 'enabled' and jsonb_typeof(entry.value->'enabled') is distinct from 'boolean' or entry.value ? 'collision' and jsonb_typeof(entry.value->'collision') is distinct from 'boolean' then raise exception '无效的模型开关'; end if;
   if entry.value ? 'color' and (entry.value->>'color' is null or not (entry.value->>'color'=any(array['#dfc2bd','#c6d7c5','#c8bfdc','#e6d2aa','#a6becd','#9e806a']))) then raise exception '无效的模型配色'; end if;
   if entry.value ? 'rooms' then
    if jsonb_typeof(entry.value->'rooms') is distinct from 'array' or jsonb_array_length(entry.value->'rooms')>4 then raise exception '无效的可用房间'; end if;
    if exists(select 1 from jsonb_array_elements(entry.value->'rooms') e where e not in ('0'::jsonb,'1'::jsonb,'2'::jsonb,'3'::jsonb) or entry.key in ('wallArt','clock','wallShelf','pegboard') and e<>'3'::jsonb) then raise exception '墙饰仅可用于客厅'; end if;
   end if;
  end loop;
  update public.vt_model_workspace set draft=p_config,draft_base=p_base,version=version+1,updated_at=now() where id=1 returning * into w;
 elsif p_action in ('publish','restore') then
  if p_action='publish' then
   if w.draft is null then raise exception '请先保存模型草稿'; end if;
   if w.draft_base is distinct from versions then raise exception '家人已更新布置，请丢弃旧草稿，从小屋重新开始' using errcode='40001'; end if;
   target:=w.draft;
  else
   if w.previous is null then raise exception '还没有可恢复的版本'; end if;
   if w.published_versions is distinct from versions then raise exception '发布后家人已修改布置，为保留修改已停止恢复' using errcode='40001'; end if;
   target:=w.previous;
  end if;
  old_state:=jsonb_build_object('catalog',live->'catalog','rooms',live->'rooms');
  for r in 0..3 loop
   perform public.vt_validate_decor(target->'rooms'->r::text,r=3);
   if r=3 then update public.vt_common_decor set config=target->'rooms'->'3',version=version+1,updated_at=now() where id=1;
   else update public.vt_decor set config=target->'rooms'->r::text,version=version+1,updated_at=now() where room_id=r; end if;
  end loop;
  update public.vt_model_catalog set config=target->'catalog',version=version+1,updated_at=now() where id=1;
  updated_versions:=(public.vt_models_snapshot())->'versions';
  update public.vt_model_workspace set previous=old_state,published_versions=updated_versions,draft=null,draft_base=null,version=version+1,updated_at=now() where id=1 returning * into w;
 elsif p_action='discard' then
  update public.vt_model_workspace set draft=null,draft_base=null,version=version+1,updated_at=now() where id=1 returning * into w;
 else raise exception '无效的模型操作'; end if;
 insert into public.vt_admin_log(actor,kind,action,target,before_data,after_data) values(auth.uid(),'model','save',p_action,jsonb_build_object('version',p_version),jsonb_build_object('version',w.version));
 return to_jsonb(w);
end $$;
revoke all on function public.vt_models_snapshot(),public.vt_models_action(text,integer,jsonb,jsonb) from public,anon;
grant execute on function public.vt_models_snapshot(),public.vt_models_action(text,integer,jsonb,jsonb) to authenticated;
commit;
