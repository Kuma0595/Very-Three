-- 在 Supabase SQL Editor 执行。只创建 Very Three 的表和策略，不删除已有数据。
begin;
create table if not exists public.vt_members (
 id smallint primary key check (id between 0 and 2),
 user_id uuid unique references auth.users(id) on delete set null,
 name text not null check (char_length(name) between 1 and 12),
 status text not null default '' check (char_length(status)<=30)
);
insert into public.vt_members(id,name,status) values
 (0,'Piggy','摇滚与电玩'),(1,'4010','黑胶与欧美音乐'),(2,'Joey','亚文化与 K-pop') on conflict(id) do nothing;
create table if not exists public.vt_rooms (
 id smallint primary key references public.vt_members(id),
 title text not null check(char_length(title) between 1 and 20),
 note text not null default '' check(char_length(note)<=120)
);
insert into public.vt_rooms values
 (0,'摇滚开场，下一局见','吉他有点响，游戏刚开场。'),
 (1,'让唱针慢慢落下','把喜欢的欧美音乐，放进黑胶里。'),
 (2,'今天也要有自己的风格','亚文化、K-pop，和一点不一样的自己。') on conflict(id) do nothing;
create table if not exists public.vt_frames (
 room_id smallint not null references public.vt_rooms(id),
 slot smallint not null check(slot between 0 and 2),
 path text not null,
 name text not null default '' check(char_length(name)<=120),
 primary key(room_id,slot),
 check(path ~ '^frames/[0-2]/[0-2]/[a-f0-9-]{36}\.jpg$'
  and split_part(path,'/',2)=room_id::text and split_part(path,'/',3)=slot::text)
);
create table if not exists public.vt_notes (
 id uuid primary key default gen_random_uuid(),
 creator uuid not null references auth.users(id),
 text text not null check(char_length(text) between 1 and 240),
 created_at timestamptz not null default now()
);
create table if not exists public.vt_plans (
 id uuid primary key default gen_random_uuid(),
 creator uuid not null references auth.users(id),
 text text not null check(char_length(text) between 1 and 80),
 done boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.vt_photos (
 id uuid primary key default gen_random_uuid(),
 creator uuid not null references auth.users(id),
 path text not null unique,
 caption text not null check(char_length(caption) between 1 and 40),
 created_at timestamptz not null default now(),
 check(path ~ '^memories/[a-f0-9-]{36}/[a-f0-9-]{36}\.jpg$' and split_part(path,'/',2)=creator::text)
);
-- Security definer 只查询当前身份，避免成员表策略递归。
create or replace function public.vt_is_member() returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vt_members where user_id=(select auth.uid()))
$$;
create or replace function public.vt_my_room() returns smallint
 language sql stable security definer set search_path='' as $$
 select id from public.vt_members where user_id=(select auth.uid())
$$;
revoke all on function public.vt_is_member(),public.vt_my_room() from public,anon;
grant execute on function public.vt_is_member(),public.vt_my_room() to authenticated;
-- 禁止前端绑定身份、更改记录所有者；只授予需要写入的列。
revoke all on public.vt_members,public.vt_rooms,public.vt_frames,public.vt_notes,public.vt_plans,public.vt_photos from anon,authenticated;
grant select on public.vt_members,public.vt_rooms,public.vt_frames,public.vt_notes,public.vt_plans,public.vt_photos to authenticated;
grant update(name,status) on public.vt_members to authenticated;
grant update(title,note) on public.vt_rooms to authenticated;
grant insert,delete on public.vt_frames,public.vt_notes,public.vt_plans,public.vt_photos to authenticated;
grant update(path,name) on public.vt_frames to authenticated;
grant update(done) on public.vt_plans to authenticated;
alter table public.vt_members enable row level security;
alter table public.vt_rooms enable row level security;
alter table public.vt_frames enable row level security;
alter table public.vt_notes enable row level security;
alter table public.vt_plans enable row level security;
alter table public.vt_photos enable row level security;
do $$ declare t text; begin
 foreach t in array array['vt_members','vt_rooms','vt_frames','vt_notes','vt_plans','vt_photos'] loop
  execute format('drop policy if exists vt_read on public.%I',t);
  execute format('create policy vt_read on public.%I for select to authenticated using ((select public.vt_is_member()))',t);
 end loop;
end $$;
drop policy if exists vt_member_edit on public.vt_members;
create policy vt_member_edit on public.vt_members for update to authenticated using(id=(select public.vt_my_room())) with check(id=(select public.vt_my_room()));
drop policy if exists vt_room_edit on public.vt_rooms;
create policy vt_room_edit on public.vt_rooms for update to authenticated using(id=(select public.vt_my_room())) with check(id=(select public.vt_my_room()));
drop policy if exists vt_frame_add on public.vt_frames;
create policy vt_frame_add on public.vt_frames for insert to authenticated with check(room_id=(select public.vt_my_room()));
drop policy if exists vt_frame_edit on public.vt_frames;
create policy vt_frame_edit on public.vt_frames for update to authenticated using(room_id=(select public.vt_my_room())) with check(room_id=(select public.vt_my_room()));
drop policy if exists vt_frame_delete on public.vt_frames;
create policy vt_frame_delete on public.vt_frames for delete to authenticated using(room_id=(select public.vt_my_room()));
do $$ declare t text; begin
 foreach t in array array['vt_notes','vt_plans','vt_photos'] loop
  execute format('drop policy if exists vt_add on public.%I',t);
  execute format('create policy vt_add on public.%I for insert to authenticated with check ((select public.vt_is_member()) and creator=(select auth.uid()))',t);
 end loop;
end $$;
drop policy if exists vt_note_delete on public.vt_notes;
create policy vt_note_delete on public.vt_notes for delete to authenticated using((select public.vt_is_member()) and creator=(select auth.uid()));
drop policy if exists vt_plan_edit on public.vt_plans;
create policy vt_plan_edit on public.vt_plans for update to authenticated using((select public.vt_is_member())) with check((select public.vt_is_member()));
drop policy if exists vt_plan_delete on public.vt_plans;
create policy vt_plan_delete on public.vt_plans for delete to authenticated using((select public.vt_is_member()));
drop policy if exists vt_photo_delete on public.vt_photos;
create policy vt_photo_delete on public.vt_photos for delete to authenticated using((select public.vt_is_member()) and creator=(select auth.uid()));
-- 对共享相册的八张上限进行串行检查，避免多人并发超出限制。
create or replace function public.vt_limit_photos() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(884031);
 if (select count(*) from public.vt_photos)>=8 then raise exception '最多保留 8 张共享照片'; end if;
 return new;
end $$;
revoke all on function public.vt_limit_photos() from public,anon,authenticated;
drop trigger if exists vt_photos_limit on public.vt_photos;
create trigger vt_photos_limit before insert on public.vt_photos for each row execute function public.vt_limit_photos();
-- 私有桶，图片仅通过已登录成员取得的短期签名链接读取。
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('very-three','very-three',false,2097152,array['image/jpeg'])
 on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=array['image/jpeg'];
drop policy if exists vt_storage_read on storage.objects;
create policy vt_storage_read on storage.objects for select to authenticated
 using(bucket_id='very-three' and (select public.vt_is_member()));
drop policy if exists vt_storage_add on storage.objects;
create policy vt_storage_add on storage.objects for insert to authenticated with check(
 bucket_id='very-three' and (select public.vt_is_member()) and (
  (name ~ '^frames/[0-2]/[0-2]/[a-f0-9-]{36}\.jpg$' and split_part(name,'/',2)=(select public.vt_my_room())::text)
  or (name ~ '^memories/[a-f0-9-]{36}/[a-f0-9-]{36}\.jpg$' and split_part(name,'/',2)=(select auth.uid())::text)
 ));
drop policy if exists vt_storage_delete on storage.objects;
create policy vt_storage_delete on storage.objects for delete to authenticated using(
 bucket_id='very-three' and (select public.vt_is_member()) and (
  (name ~ '^frames/[0-2]/[0-2]/[a-f0-9-]{36}\.jpg$' and split_part(name,'/',2)=(select public.vt_my_room())::text)
  or (name ~ '^memories/[a-f0-9-]{36}/[a-f0-9-]{36}\.jpg$' and split_part(name,'/',2)=(select auth.uid())::text)
 ));
commit;
