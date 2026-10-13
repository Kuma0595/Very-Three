-- setup.sql 已执行后运行；可重复执行，不会覆盖已有布置。
begin;
create table if not exists public.vt_decor (
 room_id smallint primary key references public.vt_members(id),
 config jsonb not null default '{"colors":{},"items":[]}',
 version integer not null default 0,
 updated_at timestamptz not null default now()
);
insert into public.vt_decor(room_id) select id from public.vt_members on conflict do nothing;
alter table public.vt_decor enable row level security;
revoke all on public.vt_decor from public,anon,authenticated;
grant select on public.vt_decor to authenticated;
drop policy if exists vt_decor_read on public.vt_decor;
create policy vt_decor_read on public.vt_decor for select to authenticated using((select public.vt_is_member()));
create or replace function public.vt_save_decor(p_config jsonb,p_version integer)
returns public.vt_decor language plpgsql security definer set search_path='' as $$
declare r public.vt_decor; item jsonb; c text; n integer; ids text[] := array[]::text[];
begin
 if not public.vt_is_member() then raise exception '仅家人可布置房间'; end if;
 if p_config is null or jsonb_typeof(p_config)<>'object' or jsonb_typeof(p_config->'items') is distinct from 'array' or jsonb_typeof(p_config->'colors') is distinct from 'object' then raise exception '无效的布置'; end if;
 if octet_length(p_config::text)>12000 or jsonb_array_length(p_config->'items')>12 then raise exception '最多摆放十二件装饰'; end if;
 for c in select jsonb_object_keys(p_config->'colors') loop
  if c not in ('wall','floor','rug') or not ((p_config->'colors'->>c) = any(array['#dfc2bd','#c6d7c5','#c8bfdc','#e6d2aa','#a6becd','#9e806a'])) then raise exception '无效的配色'; end if;
 end loop;
 for item in select value from jsonb_array_elements(p_config->'items') loop
  if jsonb_typeof(item)<>'object' or item->>'type' is null or item->>'type' not in ('plant','lamp','stool','table','cushion','rug') or item->>'id' is null or item->>'id' !~ '^[a-f0-9-]{36}$' or item->>'id'=any(ids) then raise exception '无效的装饰'; end if;
  ids:=array_append(ids,item->>'id');
  if jsonb_typeof(item->'x') is distinct from 'number' or jsonb_typeof(item->'z') is distinct from 'number' or jsonb_typeof(item->'rotation') is distinct from 'number' then raise exception '无效的位置'; end if;
  if (item->>'x')::numeric not between -6.05 and 4.15 or (item->>'z')::numeric not between -3.65 and 8.95 or (item->>'rotation')::numeric not in (0,1,2,3) or item->>'color' is null or not (item->>'color'=any(array['#dfc2bd','#c6d7c5','#c8bfdc','#e6d2aa','#a6becd','#9e806a'])) then raise exception '无效的装饰参数'; end if;
 end loop;
 select * into r from public.vt_decor where room_id=public.vt_my_room() for update;
 if not found then raise exception '房间尚未初始化'; end if;
 if p_version is distinct from r.version then raise exception '其他设备已更新房间，请重新加载'; end if;
 update public.vt_decor set config=p_config,version=version+1,updated_at=now() where room_id=r.room_id returning * into r;
 return r;
end $$;
revoke all on function public.vt_save_decor(jsonb,integer) from public,anon;
grant execute on function public.vt_save_decor(jsonb,integer) to authenticated;
commit;
