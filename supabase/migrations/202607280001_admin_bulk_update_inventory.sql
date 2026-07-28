-- Allow a Super Admin to update micron and/or supplier for one or more raw materials atomically.

alter table public.inventory
  add column if not exists package_no text,
  add column if not exists core_inch numeric(8,2);

create or replace function public.admin_bulk_update_inventory(
  p_inventory_ids uuid[],
  p_micron numeric default null,
  p_supplier text default null
)
returns setof public.inventory
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  expected_count integer;
  updated_count integer;
  clean_supplier text := nullif(btrim(p_supplier), '');
begin
  actor_id := public.capco_assert_role(array['super_admin']);

  if coalesce(cardinality(p_inventory_ids), 0) = 0 then
    raise exception 'At least one inventory ID is required' using errcode = '22023';
  end if;

  if p_micron is null and clean_supplier is null then
    raise exception 'Micron, supplier, or both are required' using errcode = '22023';
  end if;

  if p_micron is not null and p_micron <= 0 then
    raise exception 'Micron must be greater than zero' using errcode = '22023';
  end if;

  if p_supplier is not null and clean_supplier is null then
    raise exception 'Supplier must not be empty' using errcode = '22023';
  end if;

  select count(distinct inventory_id)
  into expected_count
  from unnest(p_inventory_ids) as ids(inventory_id);

  return query
  update public.inventory
  set micron = coalesce(p_micron, micron),
      supplier = coalesce(clean_supplier, supplier),
      updated_by = actor_id,
      updated_at = now()
  where id = any(p_inventory_ids)
  returning *;

  get diagnostics updated_count = row_count;

  if updated_count <> expected_count then
    raise exception 'One or more inventory records were not found' using errcode = 'P0002';
  end if;

  insert into public.audit_events (
    actor_profile_id,
    event_type,
    entity_type,
    metadata
  )
  values (
    actor_id,
    'inventory.bulk_updated',
    'inventory',
    jsonb_build_object(
      'inventory_ids', to_jsonb(p_inventory_ids),
      'micron', p_micron,
      'supplier', clean_supplier,
      'updated_count', updated_count
    )
  );
end;
$$;

revoke all on function public.admin_bulk_update_inventory(uuid[], numeric, text) from public;
grant execute on function public.admin_bulk_update_inventory(uuid[], numeric, text) to authenticated;
