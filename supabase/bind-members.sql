-- 三个登录账号与个人房间的绑定；只在 Supabase SQL Editor 执行。
begin;
update public.vt_members set user_id='deee1da3-dd34-4485-9190-286d5bbc8477'::uuid where id=0;
update public.vt_members set user_id='c097649d-070b-4b24-ad0d-24506ba8500e'::uuid where id=1;
update public.vt_members set user_id='d82e643f-2747-4173-a45b-13671c9f2769'::uuid where id=2;
commit;
select id,name,user_id from public.vt_members order by id;
