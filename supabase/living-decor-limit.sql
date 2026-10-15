-- 客厅提高到三十件，卧室仍为十二件；保留已有布置及尺寸、碰撞校验。
begin;
create or replace function public.vt_validate_decor(p_config jsonb,p_common boolean)
returns void language plpgsql set search_path='' as $$
declare item jsonb;c text;ids text[]:=array[]::text[];
begin
 if p_config is null or jsonb_typeof(p_config)<>'object' or jsonb_typeof(p_config->'items') is distinct from 'array' or jsonb_typeof(p_config->'colors') is distinct from 'object' then raise exception '无效的布置'; end if;
 if octet_length(p_config::text)>12000 or jsonb_array_length(p_config->'items')>(case when p_common then 30 else 12 end) then raise exception '当前空间最多摆放 % 件装饰',case when p_common then 30 else 12 end; end if;
 for c in select jsonb_object_keys(p_config->'colors') loop
  if c not in ('wall','floor','rug') or not ((p_config->'colors'->>c) = any(array['#dfc2bd','#c6d7c5','#c8bfdc','#e6d2aa','#a6becd','#9e806a'])) then raise exception '无效的配色'; end if;
 end loop;
 for item in select value from jsonb_array_elements(p_config->'items') loop
  if jsonb_typeof(item)<>'object' or item->>'type' is null or item->>'type' not in ('plant','lamp','stool','table','cushion','rug','arcade','turntable','guitarstand','speaker','neon','recordrack','terrarium','aquarium','catTower','teaCart','flowerstand','telescope','sofa','armchair','coffeeTable','bookcase','bench','screen','jukebox','gumball','rocket','chess','petBed','musicMobile','wallArt','clock','wallShelf','pegboard') or item->>'id' is null or item->>'id' !~ '^[a-f0-9-]{36}$' or item->>'id'=any(ids) then raise exception '无效的装饰'; end if;
  if item->>'type' in ('wallArt','clock','wallShelf','pegboard') and (not p_common or (item->>'z')::numeric<>2.08 or (item->>'rotation')::numeric<>0) then raise exception '墙饰仅可放在客厅墙面'; end if;
  if item ? 'scale' and (jsonb_typeof(item->'scale') is distinct from 'number' or (item->>'scale')::numeric not between .5 and 1.8) then raise exception '尺寸倍数需在 0.5 到 1.8 之间'; end if;
  if item ? 'collision' and jsonb_typeof(item->'collision') is distinct from 'boolean' then raise exception '无效的碰撞设置'; end if;
  ids:=array_append(ids,item->>'id');
  if jsonb_typeof(item->'x') is distinct from 'number' or jsonb_typeof(item->'z') is distinct from 'number' or jsonb_typeof(item->'rotation') is distinct from 'number' then raise exception '无效的位置'; end if;
  if (item->>'x')::numeric not between (case when p_common then -16.25 else -6.05 end) and (case when p_common then 14.35 else 4.15 end) or (item->>'z')::numeric not between (case when p_common then 2.05 else -3.65 end) and (case when p_common then 12.15 else 8.95 end) or (item->>'rotation')::numeric not in (0,1,2,3) or item->>'color' is null or not (item->>'color'=any(array['#dfc2bd','#c6d7c5','#c8bfdc','#e6d2aa','#a6becd','#9e806a'])) then raise exception '无效的装饰参数'; end if;
 end loop;
end $$;
revoke all on function public.vt_validate_decor(jsonb,boolean) from public,anon,authenticated;

commit;
