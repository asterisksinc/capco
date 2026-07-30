-- Atomically create multiple raw-material batches from the admin paste grid.

select public.capco_init_serial_counter(
  'raw_material',
  'RM',
  coalesce((
    select max(public.capco_extract_serial_number(raw_material_code, 'RM'))
    from public.inventory
  ), 0)
);

create or replace function public.admin_bulk_create_inventory(p_batches jsonb)
returns setof public.inventory
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  batch_count integer;
  inserted_count integer;
begin
  actor_id := public.capco_assert_role(array['super_admin']);

  if jsonb_typeof(p_batches) is distinct from 'array' then
    raise exception 'batches must be a JSON array' using errcode = '22023';
  end if;

  batch_count := jsonb_array_length(p_batches);
  if batch_count < 1 or batch_count > 500 then
    raise exception 'Provide between 1 and 500 material batches' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_batches) with ordinality as rows(batch, row_number)
    where nullif(btrim(batch->>'roll_no'), '') is null
       or nullif(btrim(batch->>'supplier'), '') is null
       or coalesce(nullif(batch->>'micron', '')::numeric, 0) <= 0
       or coalesce(nullif(batch->>'width_m', '')::numeric, 0) <= 0
       or coalesce(nullif(batch->>'net_weight_kg', '')::numeric, 0) <= 0
       or coalesce(nullif(batch->>'gross_weight_kg', '')::numeric, 0) <= 0
       or nullif(batch->>'gross_weight_kg', '')::numeric < nullif(batch->>'net_weight_kg', '')::numeric
       or coalesce(nullif(batch->>'core_inch', '')::numeric, 0) < 0
       or coalesce(nullif(batch->>'temperature_c', '')::numeric, 25) < 0
  ) then
    raise exception 'One or more material batches contain invalid values' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_batches) as rows(batch)
    group by btrim(batch->>'roll_no')
    having count(*) > 1
  ) then
    raise exception 'Duplicate roll_no values are not allowed in a batch' using errcode = '23505';
  end if;

  return query
  insert into public.inventory (
    raw_material_code,
    roll_no,
    micron,
    width_m,
    net_weight_kg,
    gross_weight_kg,
    current_weight_kg,
    supplier,
    package_no,
    core_inch,
    temperature_c,
    status,
    stage,
    created_by,
    updated_by
  )
  select
    public.capco_next_serial('raw_material'),
    btrim(batch->>'roll_no'),
    (batch->>'micron')::numeric,
    (batch->>'width_m')::numeric,
    (batch->>'net_weight_kg')::numeric,
    (batch->>'gross_weight_kg')::numeric,
    (batch->>'net_weight_kg')::numeric,
    btrim(batch->>'supplier'),
    nullif(btrim(batch->>'package_no'), ''),
    nullif(batch->>'core_inch', '')::numeric,
    coalesce(nullif(batch->>'temperature_c', '')::numeric, 25),
    'In Inventory'::public.workflow_status,
    'Inventory'::public.workflow_stage,
    actor_id,
    actor_id
  from jsonb_array_elements(p_batches) with ordinality as rows(batch, row_number)
  order by row_number
  returning *;

  get diagnostics inserted_count = row_count;
  if inserted_count <> batch_count then
    raise exception 'Not all material batches were created' using errcode = 'P0001';
  end if;

  insert into public.audit_events (
    actor_profile_id,
    event_type,
    entity_type,
    metadata
  )
  values (
    actor_id,
    'inventory.bulk_created',
    'inventory',
    jsonb_build_object(
      'created_count', inserted_count,
      'roll_numbers', (
        select jsonb_agg(batch->>'roll_no' order by row_number)
        from jsonb_array_elements(p_batches) with ordinality as rows(batch, row_number)
      )
    )
  );
end;
$$;

revoke all on function public.admin_bulk_create_inventory(jsonb) from public;
grant execute on function public.admin_bulk_create_inventory(jsonb) to authenticated;
