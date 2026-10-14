-- 先执行本文件，再创建并绑定 Zakery 的登录账号；可重复执行，不删除数据。
begin;
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
commit;
