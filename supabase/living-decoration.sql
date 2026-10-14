-- 在已启用 decoration.sql / zakery.sql 的项目执行一次；可重复执行，不覆盖已有布置。
begin;
create table if not exists public.vt_common_decor (
 id smallint primary key check(id=1),
 config jsonb not null default '{"colors":{},"items":[]}',
 version integer not null default 0,
 updated_at timestamptz not null default now()
);
insert into public.vt_common_decor(id) values(1) on conflict do nothing;
alter table public.vt_common_decor enable row level security;
revoke all on public.vt_common_decor from public,anon,authenticated;
grant select on public.vt_common_decor to authenticated;
drop policy if exists vt_common_decor_read on public.vt_common_decor;
create policy vt_common_decor_read on public.vt_common_decor for select to authenticated using((select public.vt_is_member()));
create or replace function public.vt_validate_decor(p_config jsonb,p_common boolean)
returns void language plpgsql set search_path='' as $$
declare item jsonb;c text;ids text[]:=array[]::text[];
begin
 if p_config is null or jsonb_typeof(p_config)<>'object' or jsonb_typeof(p_config->'items') is distinct from 'array' or jsonb_typeof(p_config->'colors') is distinct from 'object' then raise exception '无效的布置'; end if;
 if octet_length(p_config::text)>12000 or jsonb_array_length(p_config->'items')>12 then raise exception '最多摆放十二件装饰'; end if;
 for c in select jsonb_object_keys(p_config->'colors') loop
  if c not in ('wall','floor','rug') or not ((p_config->'colors'->>c) = any(array['#dfc2bd','#c6d7c5','#c8bfdc','#e6d2aa','#a6becd','#9e806a'])) then raise exception '无效的配色'; end if;
 end loop;
 for item in select value from jsonb_array_elements(p_config->'items') loop
  if jsonb_typeof(item)<>'object' or item->>'type' is null or item->>'type' not in ('plant','lamp','stool','table','cushion','rug','arcade','turntable','guitarstand','speaker','neon','recordrack','terrarium','aquarium','catTower','teaCart','flowerstand','telescope','sofa','armchair','coffeeTable','bookcase','bench','screen','jukebox','gumball','rocket','chess','petBed','musicMobile','wallArt','clock','wallShelf','pegboard') or item->>'id' is null or item->>'id' !~ '^[a-f0-9-]{36}$' or item->>'id'=any(ids) then raise exception '无效的装饰'; end if;
  if item->>'type' in ('wallArt','clock','wallShelf','pegboard') and (not p_common or (item->>'z')::numeric<>2.08 or (item->>'rotation')::numeric<>0) then raise exception '墙饰仅可放在客厅墙面'; end if;
  ids:=array_append(ids,item->>'id');
  if jsonb_typeof(item->'x') is distinct from 'number' or jsonb_typeof(item->'z') is distinct from 'number' or jsonb_typeof(item->'rotation') is distinct from 'number' then raise exception '无效的位置'; end if;
  if (item->>'x')::numeric not between (case when p_common then -16.25 else -6.05 end) and (case when p_common then 14.35 else 4.15 end) or (item->>'z')::numeric not between (case when p_common then 2.05 else -3.65 end) and (case when p_common then 12.15 else 8.95 end) or (item->>'rotation')::numeric not in (0,1,2,3) or item->>'color' is null or not (item->>'color'=any(array['#dfc2bd','#c6d7c5','#c8bfdc','#e6d2aa','#a6becd','#9e806a'])) then raise exception '无效的装饰参数'; end if;
 end loop;
end $$;
revoke all on function public.vt_validate_decor(jsonb,boolean) from public,anon,authenticated;
create or replace function public.vt_save_decor(p_config jsonb,p_version integer)
returns public.vt_decor language plpgsql security definer set search_path='' as $$
declare r public.vt_decor;
begin
 if not public.vt_is_member() then raise exception '仅家人可布置房间'; end if;
 perform public.vt_validate_decor(p_config,false);
 select * into r from public.vt_decor where room_id=public.vt_my_room() for update;
 if not found then raise exception '房间尚未初始化'; end if;
 if p_version is distinct from r.version then raise exception '其他设备已更新房间，请重新加载'; end if;
 update public.vt_decor set config=p_config,version=version+1,updated_at=now() where room_id=r.room_id returning * into r;
 return r;
end $$;
create or replace function public.vt_save_common_decor(p_config jsonb,p_version integer)
returns public.vt_common_decor language plpgsql security definer set search_path='' as $$
declare r public.vt_common_decor;
begin
 if not public.vt_is_member() then raise exception '仅家人可布置客厅'; end if;
 perform public.vt_validate_decor(p_config,true);
 select * into r from public.vt_common_decor where id=1 for update;
 if not found then raise exception '客厅尚未初始化'; end if;
 if p_version is distinct from r.version then raise exception '其他设备已更新客厅，请重新加载'; end if;
 update public.vt_common_decor set config=p_config,version=version+1,updated_at=now() where id=1 returning * into r;
 return r;
end $$;
revoke all on function public.vt_save_decor(jsonb,integer),public.vt_save_common_decor(jsonb,integer) from public,anon;
grant execute on function public.vt_save_decor(jsonb,integer),public.vt_save_common_decor(jsonb,integer) to authenticated;
commit;
