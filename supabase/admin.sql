-- 在现有小家项目的 SQL Editor 执行一次。默认把已绑定的 Piggy 账号设为管理员。
-- 不创建密码、不删除内容；普通成员原有权限保持不变。可重复执行。
begin;
-- 兼容尚未启用第四位成员的旧项目，保留已有绑定与内容。

alter table public.vt_members drop constraint if exists vt_members_id_check;
alter table public.vt_members add constraint vt_members_id_check check(id between 0 and 3);
alter table public.vt_members add column if not exists room_id smallint;
update public.vt_members set room_id=least(id,2) where room_id is null;
alter table public.vt_members alter column room_id set not null;
alter table public.vt_members drop constraint if exists vt_members_room_id_check;
alter table public.vt_members add constraint vt_members_room_id_check check(room_id between 0 and 2);
insert into public.vt_members(id,name,status,room_id) values(3,'Zakery','Joey 的男朋友',2) on conflict(id) do nothing;
create or replace function public.vt_my_room() returns smallint
language sql stable security definer set search_path='' as $$
 select room_id from public.vt_members where user_id=(select auth.uid())
$$;
create or replace function public.vt_my_member() returns smallint
language sql stable security definer set search_path='' as $$
 select id from public.vt_members where user_id=(select auth.uid())
$$;
revoke all on function public.vt_my_member(),public.vt_my_room() from public,anon;
grant execute on function public.vt_my_member(),public.vt_my_room() to authenticated;
-- 个人资料按成员身份授权；卧室、装饰、相框、花圃沿用所属房间授权。
drop policy if exists vt_member_edit on public.vt_members;
create policy vt_member_edit on public.vt_members for update to authenticated
using(id=(select public.vt_my_member())) with check(id=(select public.vt_my_member()));
-- 仍然只授权姓名和心情，网页不能修改账号绑定或所属房间。
revoke update on public.vt_members from authenticated;
grant update(name,status) on public.vt_members to authenticated;

-- 已启用互动家具时更新成绩逻辑，让 Joey 和 Zakery 分开排名。
do $migration$ begin
 if to_regprocedure('public.vt_play_action(integer,text,jsonb)') is not null then
 execute $function$
create or replace function public.vt_play_action(p_room integer,p_action text,p_value jsonb default '{}')
returns public.vt_play language plpgsql security definer set search_path='' as $$
declare r public.vt_play; member_id smallint; amount integer; stamp timestamptz:=now(); content text;
begin
 if not public.vt_is_member() then raise exception '仅家人可互动'; end if;
 select id into member_id from public.vt_members where user_id=auth.uid();
 select * into r from public.vt_play where room_id=p_room for update;
 if not found then raise exception '互动家具尚未初始化'; end if;
 if p_action='score' then
  if jsonb_typeof(p_value->'score') is distinct from 'number' then raise exception '无效的分数'; end if;
  amount:=(p_value->>'score')::integer;
  if amount<0 or amount>2000 then raise exception '无效的分数'; end if;
  update public.vt_play set scores=jsonb_set(scores,array[member_id::text],to_jsonb(greatest(amount,coalesce((scores->>member_id::text)::integer,0))),true) where room_id=p_room returning * into r;
 elsif p_action='feed' then
  if r.fed_at is not null and stamp-r.fed_at<interval '10 minutes' then raise exception '小鱼刚吃过，十分钟后再来'; end if;
  update public.vt_play set fed_at=stamp,fed_by=auth.uid() where room_id=p_room returning * into r;
 elsif p_action='name' then
  if public.vt_my_room()<>p_room then raise exception '只有房间主人可以给小鱼改名'; end if;
  if jsonb_typeof(p_value->'names') is distinct from 'array' or jsonb_array_length(p_value->'names')<>2 then raise exception '请给两条小鱼起名字'; end if;
  if jsonb_typeof(p_value->'names'->0) is distinct from 'string' or jsonb_typeof(p_value->'names'->1) is distinct from 'string' or char_length(btrim(p_value->'names'->>0)) not between 1 and 12 or char_length(btrim(p_value->'names'->>1)) not between 1 and 12 then raise exception '鱼名需为一至十二个字'; end if;
  if p_value ? 'colors' then
   if jsonb_typeof(p_value->'colors') is distinct from 'array' or jsonb_array_length(p_value->'colors')<>2 or p_value->'colors'->>0 is null or p_value->'colors'->>1 is null or not ((p_value->'colors'->>0)=any(array['#dfad69','#d99eae','#87b2cd','#92b89b'])) or not ((p_value->'colors'->>1)=any(array['#dfad69','#d99eae','#87b2cd','#92b89b'])) then raise exception '请选择有效的小鱼配色'; end if;
  end if;
  update public.vt_play set fish_colors=coalesce(p_value->'colors',fish_colors),fish_names=jsonb_build_array(btrim(p_value->'names'->>0),btrim(p_value->'names'->>1)) where room_id=p_room returning * into r;
 elsif p_action='wish' then
  content:=btrim(p_value->>'content');
  if content is null or char_length(content) not between 1 and 120 then raise exception '愿望需为一至一百二十个字'; end if;
  -- 成员行锁让跨房间重复提交也按同一成员串行校验。
  perform 1 from public.vt_members where id=member_id for update;
  if exists(select 1 from public.vt_wishes where creator=auth.uid() and stamp-created_at<interval '1 minute') then raise exception '愿望已经留下，一分钟后再许愿'; end if;
  insert into public.vt_wishes(room_id,creator,content) values(p_room,auth.uid(),content);
 else raise exception '不支持的互动'; end if;
 return r;
end $$;
revoke all on function public.vt_play_action(integer,text,jsonb) from public,anon;
grant execute on function public.vt_play_action(integer,text,jsonb) to authenticated;
$function$;
 end if;
end $migration$;


do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.vt_frames'::regclass and contype='c' and (pg_get_constraintdef(oid) like '%slot%' or pg_get_constraintdef(oid) like '%path%') loop
  execute format('alter table public.vt_frames drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.vt_frames add constraint vt_frames_slot_check check(slot between 0 and 2 or (room_id=2 and slot between 3 and 8));
alter table public.vt_frames add constraint vt_frames_path_check check(path ~ '^frames/([0-2]/[0-2]|2/[3-8])/[a-f0-9-]{36}\.jpg$' and split_part(path,'/',2)=room_id::text and split_part(path,'/',3)=slot::text);
drop policy if exists vt_storage_add on storage.objects;
create policy vt_storage_add on storage.objects for insert to authenticated with check(
 bucket_id='very-three' and (select public.vt_is_member()) and (
  (name ~ '^frames/([0-2]/[0-2]|2/[3-8])/[a-f0-9-]{36}\.jpg$' and split_part(name,'/',2)=(select public.vt_my_room())::text)
  or (name ~ '^memories/[a-f0-9-]{36}/[a-f0-9-]{36}\.jpg$' and split_part(name,'/',2)=(select auth.uid())::text)
 ));
drop policy if exists vt_storage_delete on storage.objects;
create policy vt_storage_delete on storage.objects for delete to authenticated using(
 bucket_id='very-three' and (select public.vt_is_member()) and (
  (name ~ '^frames/([0-2]/[0-2]|2/[3-8])/[a-f0-9-]{36}\.jpg$' and split_part(name,'/',2)=(select public.vt_my_room())::text)
  or (name ~ '^memories/[a-f0-9-]{36}/[a-f0-9-]{36}\.jpg$' and split_part(name,'/',2)=(select auth.uid())::text)
 ));

create table if not exists public.vt_admin_users(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
insert into public.vt_admin_users(user_id) select user_id from public.vt_members where id=0 and user_id is not null on conflict do nothing;
create or replace function public.vt_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vt_admin_users a join public.vt_members m on m.user_id=a.user_id where a.user_id=(select auth.uid()))
$$;
revoke all on function public.vt_is_admin() from public,anon;
grant execute on function public.vt_is_admin() to authenticated;
alter table public.vt_admin_users enable row level security;
revoke all on public.vt_admin_users from public,anon,authenticated;
grant select on public.vt_admin_users to authenticated;
drop policy if exists vt_admin_self on public.vt_admin_users;
create policy vt_admin_self on public.vt_admin_users for select to authenticated using(user_id=(select auth.uid()));
create table if not exists public.vt_settings(id smallint primary key check(id=1),config jsonb not null,version integer not null default 0,updated_at timestamptz not null default now());
insert into public.vt_settings(id,config) values(1,jsonb_build_object('welcomeTitle',E'世界很大，\n我们有个小家。','welcomeNote',E'四个人，各有可爱。\n在这里，可以自在做自己。','dayStart',7,'dayEnd',20)) on conflict do nothing;
alter table public.vt_settings enable row level security;
revoke all on public.vt_settings from public,anon,authenticated;
grant select on public.vt_settings to authenticated;
drop policy if exists vt_settings_read on public.vt_settings;
create policy vt_settings_read on public.vt_settings for select to authenticated using((select public.vt_is_member()));
create table if not exists public.vt_admin_log(id bigint generated always as identity primary key,actor uuid not null references auth.users(id),kind text not null,action text not null,target text,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());
alter table public.vt_admin_log enable row level security;
revoke all on public.vt_admin_log from public,anon,authenticated;
grant select on public.vt_admin_log to authenticated;
drop policy if exists vt_admin_log_read on public.vt_admin_log;
create policy vt_admin_log_read on public.vt_admin_log for select to authenticated using((select public.vt_is_admin()));
alter table public.vt_photos add column if not exists sort_order integer not null default 0;
-- 普通成员继续上传时，新照片始终排在相册末尾，兼容管理员排序。
create or replace function public.vt_limit_photos() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(884031);
 if (select count(*) from public.vt_photos)>=8 then raise exception '最多保留 8 张共享照片'; end if;
 new.sort_order:=coalesce((select max(sort_order)+1 from public.vt_photos),0);
 return new;
end $$;
revoke all on function public.vt_limit_photos() from public,anon,authenticated;
-- 管理员只能对已知图片目录操作，仍使用现有私有桶。
drop policy if exists vt_admin_storage_add on storage.objects;
create policy vt_admin_storage_add on storage.objects for insert to authenticated with check(bucket_id='very-three' and (select public.vt_is_admin()) and (name ~ '^frames/([0-2]/[0-2]|2/[3-8])/[a-f0-9-]{36}\.jpg$' or name ~ '^memories/[a-f0-9-]{36}/[a-f0-9-]{36}\.jpg$'));
drop policy if exists vt_admin_storage_delete on storage.objects;
create policy vt_admin_storage_delete on storage.objects for delete to authenticated using(bucket_id='very-three' and (select public.vt_is_admin()) and (name ~ '^frames/([0-2]/[0-2]|2/[3-8])/[a-f0-9-]{36}\.jpg$' or name ~ '^memories/[a-f0-9-]{36}/[a-f0-9-]{36}\.jpg$'));
create or replace function public.vt_admin_status() returns jsonb language sql stable security definer set search_path='' as $$ select jsonb_build_object('is_admin',public.vt_is_admin()) $$;
create or replace function public.vt_admin_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.vt_is_admin() then raise exception '仅管理员可访问管理台' using errcode='42501'; end if;
 return jsonb_build_object(
 'members',(select coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('email',u.email,'is_admin',exists(select 1 from public.vt_admin_users a where a.user_id=m.user_id)) order by m.id),'[]') from public.vt_members m left join auth.users u on u.id=m.user_id),
 'rooms',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]') from public.vt_rooms r),
 'frames',(select coalesce(jsonb_agg(to_jsonb(f) order by f.room_id,f.slot),'[]') from public.vt_frames f),
 'photos',(select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order,p.created_at),'[]') from public.vt_photos p),
 'notes',(select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]') from public.vt_notes n),
 'plans',(select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc),'[]') from public.vt_plans p),
 'settings',(select to_jsonb(s) from public.vt_settings s where id=1),
 'logs',(select coalesce(jsonb_agg(to_jsonb(l) order by l.id desc),'[]') from (select * from public.vt_admin_log order by id desc limit 80) l));
end $$;
create or replace function public.vt_admin_mutate(p_kind text,p_key text,p_action text,p_data jsonb default '{}',p_before jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare old jsonb; result jsonb; actor uuid:=auth.uid(); member_id integer; room integer; slot_id integer; object_path text; owner uuid; item jsonb; counter integer:=0; cfg jsonb;
begin
 if not public.vt_is_admin() then raise exception '仅管理员可修改小家' using errcode='42501'; end if;
 if p_action not in ('save','delete') or p_action is null or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>16000 then raise exception '无效的管理操作'; end if;
 if p_kind='member' then
  member_id:=p_key::integer;
  select to_jsonb(m) into old from public.vt_members m where id=member_id for update;
  if old is null or old is distinct from p_before then raise exception '资料已被更新，请刷新后重试' using errcode='40001'; end if;
  if p_action<>'save' then raise exception '成员只能编辑资料'; end if;
  owner:=nullif(p_data->>'user_id','')::uuid;
  if (old->>'user_id')::uuid=actor and owner is distinct from actor then raise exception '不能解除当前管理员的账号绑定'; end if;
  if owner is not null and not exists(select 1 from auth.users where id=owner) then raise exception '找不到这个登录账号，请先在 Supabase 创建账号'; end if;
  update public.vt_members set name=btrim(p_data->>'name'),status=coalesce(p_data->>'status',''),user_id=owner where id=member_id returning to_jsonb(vt_members.*) into result;
 elsif p_kind='room' then
  select to_jsonb(r) into old from public.vt_rooms r where id=p_key::integer for update;
  if old is null or old is distinct from p_before then raise exception '房间已被更新，请刷新后重试' using errcode='40001'; end if;
  if p_action<>'save' then raise exception '房间不能删除'; end if;
  update public.vt_rooms set title=btrim(p_data->>'title'),note=coalesce(p_data->>'note','') where id=p_key::integer returning to_jsonb(vt_rooms.*) into result;
 elsif p_kind in ('note','plan') then
  if p_key is not null then
   if p_kind='note' then select to_jsonb(n) into old from public.vt_notes n where id=p_key::uuid for update;
   else select to_jsonb(p) into old from public.vt_plans p where id=p_key::uuid for update; end if;
   if old is null then raise exception '内容已删除，请刷新' using errcode='40001'; end if;
  end if;
  if old is distinct from p_before then raise exception '内容已被更新，请刷新后重试' using errcode='40001'; end if;
  if p_kind='note' then
   if p_action='delete' then delete from public.vt_notes where id=p_key::uuid;
   elsif p_key is null then insert into public.vt_notes(creator,text) values(actor,btrim(p_data->>'text')) returning to_jsonb(vt_notes.*) into result;
   else update public.vt_notes set text=btrim(p_data->>'text') where id=p_key::uuid returning to_jsonb(vt_notes.*) into result; end if;
  else
   if p_action='delete' then delete from public.vt_plans where id=p_key::uuid;
   elsif p_key is null then insert into public.vt_plans(creator,text,done) values(actor,btrim(p_data->>'text'),coalesce((p_data->>'done')::boolean,false)) returning to_jsonb(vt_plans.*) into result;
   else update public.vt_plans set text=btrim(p_data->>'text'),done=coalesce((p_data->>'done')::boolean,false) where id=p_key::uuid returning to_jsonb(vt_plans.*) into result; end if;
  end if;
 elsif p_kind='frame' then
  if p_key !~ '^[0-2]:[0-8]$' then raise exception '无效的相框'; end if;
  room:=split_part(p_key,':',1)::integer;slot_id:=split_part(p_key,':',2)::integer;
  if room<>2 and slot_id>2 then raise exception '无效的相框'; end if;
  select to_jsonb(f) into old from public.vt_frames f where room_id=room and slot=slot_id for update;
  if old is distinct from p_before then raise exception '相框已被更新，请刷新后重试' using errcode='40001'; end if;
  if p_action='delete' then delete from public.vt_frames where room_id=room and slot=slot_id;
  else
   object_path:=p_data->>'path';
   if object_path is null or not exists(select 1 from storage.objects where bucket_id='very-three' and name=object_path) then raise exception '图片尚未上传完成'; end if;
   if old is null then insert into public.vt_frames(room_id,slot,path,name) values(room,slot_id,object_path,coalesce(p_data->>'name','')) returning to_jsonb(vt_frames.*) into result;
   else update public.vt_frames set path=object_path,name=coalesce(p_data->>'name','') where room_id=room and slot=slot_id returning to_jsonb(vt_frames.*) into result; end if;
  end if;
 elsif p_kind='photo' then
  perform pg_advisory_xact_lock(884031);
  if p_key is not null then select to_jsonb(p) into old from public.vt_photos p where id=p_key::uuid for update; if old is null then raise exception '照片已删除' using errcode='40001'; end if; end if;
  if old is distinct from p_before then raise exception '照片已被更新，请刷新后重试' using errcode='40001'; end if;
  if p_action='delete' then delete from public.vt_photos where id=p_key::uuid;
  else
   object_path:=p_data->>'path';owner:=coalesce((old->>'creator')::uuid,actor);
   if object_path is null or not exists(select 1 from storage.objects where bucket_id='very-three' and name=object_path) then raise exception '图片尚未上传完成'; end if;
   if old is null then insert into public.vt_photos(creator,path,caption,sort_order) values(owner,object_path,btrim(p_data->>'caption'),coalesce((select max(sort_order)+1 from public.vt_photos),0)) returning to_jsonb(vt_photos.*) into result;
   else update public.vt_photos set path=object_path,caption=btrim(p_data->>'caption') where id=p_key::uuid returning to_jsonb(vt_photos.*) into result; end if;
  end if;
 elsif p_kind='photo_order' then
  if p_action<>'save' then raise exception '无效的排序操作'; end if;
  perform pg_advisory_xact_lock(884031);perform 1 from public.vt_photos for update;
  select coalesce(jsonb_agg(to_jsonb(p) order by sort_order,created_at),'[]') into old from public.vt_photos p;
  if old is distinct from p_before then raise exception '相册已变化，请刷新后重排' using errcode='40001'; end if;
  if jsonb_typeof(p_data->'ids') is distinct from 'array' or jsonb_array_length(p_data->'ids')<>(select count(*) from public.vt_photos) or (select count(distinct value) from jsonb_array_elements_text(p_data->'ids'))<>jsonb_array_length(p_data->'ids') then raise exception '无效的照片顺序'; end if;
  for item in select value from jsonb_array_elements(p_data->'ids') loop
   if not exists(select 1 from public.vt_photos where id=(item#>>'{}')::uuid) then raise exception '照片不存在'; end if;
   update public.vt_photos set sort_order=counter where id=(item#>>'{}')::uuid;counter:=counter+1;
  end loop;
  result:=p_data;
 elsif p_kind='settings' then
  select to_jsonb(s) into old from public.vt_settings s where id=1 for update;
  if old is distinct from p_before then raise exception '设置已变化，请刷新后重试' using errcode='40001'; end if;
  if p_action<>'save' then raise exception '设置不能删除'; end if;
  cfg:=p_data;
  if jsonb_typeof(cfg->'welcomeTitle') is distinct from 'string' or (char_length(btrim(cfg->>'welcomeTitle'))<1 or char_length(cfg->>'welcomeTitle')>80) or jsonb_typeof(cfg->'welcomeNote') is distinct from 'string' or char_length(cfg->>'welcomeNote')>160 or jsonb_typeof(cfg->'dayStart') is distinct from 'number' or jsonb_typeof(cfg->'dayEnd') is distinct from 'number' then raise exception '无效的小屋设置'; end if;
  if (cfg->>'dayStart')::numeric<>(cfg->>'dayStart')::integer or (cfg->>'dayEnd')::numeric<>(cfg->>'dayEnd')::integer or (cfg->>'dayStart')::integer<0 or (cfg->>'dayEnd')::integer>23 or (cfg->>'dayStart')::integer>=(cfg->>'dayEnd')::integer then raise exception '白天起止时间需为 0–23 点的整数，结束晚于开始'; end if;
  cfg:=jsonb_build_object('welcomeTitle',cfg->>'welcomeTitle','welcomeNote',cfg->>'welcomeNote','dayStart',(cfg->>'dayStart')::integer,'dayEnd',(cfg->>'dayEnd')::integer);
  update public.vt_settings set config=cfg,version=version+1,updated_at=now() where id=1 returning to_jsonb(vt_settings.*) into result;
 else raise exception '不支持的管理操作';
 end if;
 insert into public.vt_admin_log(actor,kind,action,target,before_data,after_data) values(actor,p_kind,p_action,p_key,old,result);
 return jsonb_build_object('ok',true,'record',result);
end $$;
revoke all on function public.vt_admin_status(),public.vt_admin_snapshot(),public.vt_admin_mutate(text,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.vt_admin_status(),public.vt_admin_snapshot(),public.vt_admin_mutate(text,text,text,jsonb,jsonb) to authenticated;
commit;
