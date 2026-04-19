insert into public.profiles (full_name, email, role, stage_scope)
values
  ('Super Admin', 'super.admin@capco.local', 'super_admin', array['raw_material','metallisation','slitting','winding','spray','soldening','epoxy','test_print_pack','finished_goods','production_head_review','head_of_operations_review','completed']),
  ('Head of Operations', 'head.operations@capco.local', 'head_of_operations', array['head_of_operations_review','completed']),
  ('Production Head', 'production.head@capco.local', 'production_head', array['raw_material','production_head_review','completed']),
  ('Person A', 'person.a@capco.local', 'person_a', array['raw_material','metallisation','slitting']),
  ('Person B', 'person.b@capco.local', 'person_b', array['winding','spray']),
  ('Person C', 'person.c@capco.local', 'person_c', array['soldening','epoxy']),
  ('Person D', 'person.d@capco.local', 'person_d', array['test_print_pack','finished_goods'])
on conflict (email) do update
set full_name = excluded.full_name,
    role = excluded.role,
    stage_scope = excluded.stage_scope,
    active = true;

insert into public.work_orders (
  work_order_no,
  micron,
  width,
  quantity,
  current_stage,
  status,
  production_priority,
  current_assignee_role,
  current_assignee_email,
  created_by_email
)
values
  ('WO-0001', 4.50, 1.00, 1, 'metallisation', 'in_progress', 1, 'person_a', 'person.a@capco.local', 'production.head@capco.local'),
  ('WO-0002', 3.80, 0.80, 2, 'raw_material', 'yet_to_start', 2, 'person_a', 'person.a@capco.local', 'production.head@capco.local'),
  ('WO-0003', 5.00, 1.20, 1, 'slitting', 'in_progress', 2, 'person_a', 'person.a@capco.local', 'production.head@capco.local')
on conflict (work_order_no) do nothing;

insert into public.raw_materials (
  raw_material_no,
  work_order_id,
  micron,
  width,
  quantity,
  supplier,
  other,
  created_by_email
)
select
  'RM-456',
  wo.id,
  wo.micron,
  wo.width,
  wo.quantity,
  'Asterisks.Inc',
  'Initial sample material',
  'person.a@capco.local'
from public.work_orders wo
where wo.work_order_no = 'WO-0001'
on conflict (raw_material_no) do nothing;

insert into public.stage_records (
  stage_record_no,
  work_order_id,
  stage,
  payload,
  observations,
  created_by_email
)
select
  'STG-001',
  wo.id,
  'metallisation',
  '{"input1":"60kgs","input2":"4.5","input3":"M-01","input4":"2.4","input5":"1.5 Ohms","input6":"11/01/2025 08:30","input7":"SLITTING","input8":"Completed"}'::jsonb,
  'Seeded metallisation record',
  'person.a@capco.local'
from public.work_orders wo
where wo.work_order_no = 'WO-0001'
on conflict (stage_record_no) do nothing;

insert into public.product_orders (
  product_order_no,
  product_code,
  model_no,
  capacitance_value,
  voltage_rating,
  capacitor_type,
  grade,
  tolerance,
  dielectric_material,
  batch_size,
  production_priority,
  created_by_email
)
values
  ('PO-0001', 'CPC-1001', 'MODE-01', '10uF', '25V', 'Electrolytic', 'A', '5%', 'Aluminum', 1000, 1, 'production.head@capco.local')
on conflict (product_order_no) do nothing;

insert into public.workflow_events (
  workflow_event_no,
  work_order_id,
  event_type,
  from_stage,
  to_stage,
  actor_email,
  details
)
select
  'EV-0001',
  wo.id,
  'raw_material_added',
  'raw_material',
  'metallisation',
  'person.a@capco.local',
  '{"note":"Seeded from database fixture"}'::jsonb
from public.work_orders wo
where wo.work_order_no = 'WO-0001'
on conflict (workflow_event_no) do nothing;
