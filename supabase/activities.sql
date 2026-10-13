-- 已执行 setup.sql 的项目使用；可重复执行，不覆盖原有数据。
begin;
create table if not exists public.vt_play(
 room_id smallint primary key references public.vt_members(id),
 scores jsonb not null default '{}',
 fish_names jsonb not null default '["小橘","小桃"]',
 fish_colors jsonb not null default '["#dfad69","#d99eae"]',
 fed_at timestamptz,
 fed_by uuid references auth.users(id)
);
alter table public.vt_play add column if not exists fish_colors jsonb not null default '["#dfad69","#d99eae"]';
insert into public.vt_play(room_id) select id from public.vt_members on conflict do nothing;
create table if not exists public.vt_wishes(
 id uuid primary key default gen_random_uuid(),
 room_id smallint not null references public.vt_members(id),
 creator uuid not null references auth.users(id),
 content text not null check(char_length(content) between 1 and 120),
 created_at timestamptz not null default now()
);
alter table public.vt_play enable row level security;
alter table public.vt_wishes enable row level security;
revoke all on public.vt_play,public.vt_wishes from public,anon,authenticated;
grant select on public.vt_play,public.vt_wishes to authenticated;
drop policy if exists vt_play_read on public.vt_play;
create policy vt_play_read on public.vt_play for select to authenticated using((select public.vt_is_member()));
drop policy if exists vt_wish_read on public.vt_wishes;
create policy vt_wish_read on public.vt_wishes for select to authenticated using((select public.vt_is_member()));
create or replace function public.vt_play_action(p_room integer,p_action text,p_value jsonb default '{}')
returns public.vt_play language plpgsql security definer set search_path='' as $$
declare r public.vt_play; member_id smallint; amount integer; stamp timestamptz:=now(); content text;
begin
 if not public.vt_is_member() then raise exception '仅家人可互动'; end if;
 member_id:=public.vt_my_room();
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
  if member_id<>p_room then raise exception '只有房间主人可以给小鱼改名'; end if;
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
commit;
