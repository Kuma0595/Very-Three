-- 先在 Authentication → Users 创建三位家人的账号。
-- 用对应账号的 User UID 替换下面的三个占位符；密码不用填到这里。
begin;
update public.vt_members set user_id='PIGGY_USER_UID'::uuid where id=0;
update public.vt_members set user_id='4010_USER_UID'::uuid where id=1;
update public.vt_members set user_id='JOEY_USER_UID'::uuid where id=2;
commit;
select id,name,user_id from public.vt_members order by id;
