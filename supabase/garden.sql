-- 已执行 setup.sql 后，单独执行此文件；可重复运行。
begin;
create table if not exists public.vt_garden(
 room_id smallint not null references public.vt_members(id),
 slot smallint not null check(slot between 0 and 2),
 species text check(species in ('sunflower','hydrangea','mint')),
 planted_at timestamptz,
 growth_bonus integer not null default 0 check(growth_bonus between 0 and 43200),
 watered_at timestamptz,
 watered_by uuid references auth.users(id),
 primary key(room_id,slot),
 check((species is null and planted_at is null) or (species is not null and planted_at is not null))
);
insert into public.vt_garden(room_id,slot) select r.id,s from public.vt_rooms r cross join generate_series(0,2) s on conflict do nothing;
alter table public.vt_garden enable row level security;
revoke all on public.vt_garden from public,anon,authenticated;
grant select on public.vt_garden to authenticated;
drop policy if exists vt_garden_read on public.vt_garden;
create policy vt_garden_read on public.vt_garden for select to authenticated using((select public.vt_is_member()));
-- 用数据库时间和行锁保护播种与浇水，客户端不能伪造生长时间。
create or replace function public.vt_garden_action(p_room_id integer,p_slot integer,p_action text,p_species text default null)
returns public.vt_garden language plpgsql security definer set search_path='' as $$
declare plant public.vt_garden; stamp timestamptz:=now();
begin
 if not public.vt_is_member() then raise exception '仅家人可以照顾花园'; end if;
 select * into plant from public.vt_garden where room_id=p_room_id and slot=p_slot for update;
 if not found then raise exception '花圃不存在'; end if;
 if p_action='plant' then
  if p_room_id<>public.vt_my_room() then raise exception '只能在自己的花圃播种'; end if;
  if plant.species is not null then raise exception '这里已经有植物了'; end if;
  if p_species is null or p_species not in ('sunflower','hydrangea','mint') then raise exception '请选择有效的植物'; end if;
  update public.vt_garden set species=p_species,planted_at=stamp,growth_bonus=0,watered_at=null,watered_by=null where room_id=p_room_id and slot=p_slot returning * into plant;
 elsif p_action='water' then
  if plant.species is null then raise exception '先播种再浇水'; end if;
  if plant.watered_at is not null and stamp-plant.watered_at<interval '4 hours' then raise exception '土壤还湿润，四小时后再浇水'; end if;
  update public.vt_garden set growth_bonus=least(growth_bonus+3600,43200),watered_at=stamp,watered_by=auth.uid() where room_id=p_room_id and slot=p_slot returning * into plant;
 else raise exception '不支持的花园操作'; end if;
 return plant;
end $$;
revoke all on function public.vt_garden_action(integer,integer,text,text) from public,anon;
grant execute on function public.vt_garden_action(integer,integer,text,text) to authenticated;
commit;
