-- 在 setup.sql 和 zakery.sql 后执行；保留原三个相框，新增 room 2 的六个共用相框。
begin;
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
commit;
