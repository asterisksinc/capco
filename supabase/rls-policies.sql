-- Capco Manufacturing ERP RLS policies
-- Run after schema.sql and seed.sql.

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.qr_references enable row level security;
alter table public.inventory enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_materials enable row level security;
alter table public.metallisation enable row level security;
alter table public.slitting enable row level security;
alter table public.stock enable row level security;
alter table public.product_orders enable row level security;
alter table public.product_order_materials enable row level security;
alter table public.winding enable row level security;
alter table public.spray enable row level security;
alter table public.finished_goods enable row level security;
alter table public.material_requests enable row level security;
alter table public.material_returns enable row level security;
alter table public.vendor_purchases enable row level security;
alter table public.vendor_purchase_items enable row level security;
alter table public.pipeline_tracking enable row level security;
alter table public.import_export_jobs enable row level security;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.current_role_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.code
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_manager_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select reports_to from public.profiles where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.has_any_role(role_codes text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_code() = any(role_codes), false)
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['super_admin', 'production_head'])
$$;

drop policy if exists "roles_read_authenticated" on public.roles;
create policy "roles_read_authenticated" on public.roles for select to authenticated using (true);

drop policy if exists "profiles_read_scoped" on public.profiles;
create policy "profiles_read_scoped" on public.profiles for select to authenticated
using (
  -- Only the super admin may read every profile. Production Head remains an
  -- admin role for workflow data, but profile reads must stay hierarchy-scoped;
  -- otherwise an unfiltered current-profile lookup can return Super Admin.
  public.has_any_role(array['super_admin'])
  or id = public.current_profile_id()
  or reports_to = public.current_profile_id()
  or id = public.current_manager_profile_id()
);

drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write" on public.profiles for all to authenticated
using (public.has_any_role(array['super_admin']))
with check (public.has_any_role(array['super_admin']));

drop policy if exists "admin_all_qr" on public.qr_references;
create policy "admin_all_qr" on public.qr_references for all to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head']))
with check (public.has_any_role(array['super_admin','production_head','store_head']));

drop policy if exists "read_qr_authenticated" on public.qr_references;
create policy "read_qr_authenticated" on public.qr_references for select to authenticated using (true);

drop policy if exists "inventory_read_roles" on public.inventory;
create policy "inventory_read_roles" on public.inventory for select to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head','person_a','operator_1_metallisation','operator_2_slitting','person_b','accountant']));

drop policy if exists "inventory_write_roles" on public.inventory;
create policy "inventory_write_roles" on public.inventory for all to authenticated
using (public.has_any_role(array['super_admin','store_head']))
with check (public.has_any_role(array['super_admin','store_head']));

drop policy if exists "work_orders_read_roles" on public.work_orders;
create policy "work_orders_read_roles" on public.work_orders for select to authenticated
using (
  public.has_any_role(array['super_admin','production_head','store_head','person_a','operator_1_metallisation','operator_2_slitting'])
  or assigned_to = public.current_profile_id()
);

drop policy if exists "work_orders_write_roles" on public.work_orders;
create policy "work_orders_write_roles" on public.work_orders for all to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head']))
with check (public.has_any_role(array['super_admin','production_head','store_head']));

drop policy if exists "work_order_materials_read_roles" on public.work_order_materials;
create policy "work_order_materials_read_roles" on public.work_order_materials for select to authenticated
using (
  public.has_any_role(array['super_admin','production_head','store_head','person_a','operator_1_metallisation','operator_2_slitting'])
  or assigned_to = public.current_profile_id()
  or handover_to = public.current_profile_id()
);

drop policy if exists "work_order_materials_write_roles" on public.work_order_materials;
create policy "work_order_materials_write_roles" on public.work_order_materials for all to authenticated
using (public.has_any_role(array['super_admin','store_head','person_a']))
with check (public.has_any_role(array['super_admin','store_head','person_a']));

drop policy if exists "metallisation_read_roles" on public.metallisation;
create policy "metallisation_read_roles" on public.metallisation for select to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head','person_a','operator_1_metallisation','operator_2_slitting']));

drop policy if exists "metallisation_write_roles" on public.metallisation;
create policy "metallisation_write_roles" on public.metallisation for all to authenticated
using (public.has_any_role(array['super_admin','person_a','operator_1_metallisation']))
with check (public.has_any_role(array['super_admin','person_a','operator_1_metallisation']));

drop policy if exists "slitting_read_roles" on public.slitting;
create policy "slitting_read_roles" on public.slitting for select to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head','person_a','operator_2_slitting','person_b']));

drop policy if exists "slitting_write_roles" on public.slitting;
create policy "slitting_write_roles" on public.slitting for all to authenticated
using (public.has_any_role(array['super_admin','person_a','operator_2_slitting']))
with check (public.has_any_role(array['super_admin','person_a','operator_2_slitting']));

drop policy if exists "stock_read_roles" on public.stock;
create policy "stock_read_roles" on public.stock for select to authenticated
using (public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting','person_b','operator_3_winding','sales','accountant']));

drop policy if exists "stock_write_roles" on public.stock;
create policy "stock_write_roles" on public.stock for all to authenticated
using (public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting']))
with check (public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting']));

drop policy if exists "product_orders_read_roles" on public.product_orders;
create policy "product_orders_read_roles" on public.product_orders for select to authenticated
using (
  public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting','person_b','operator_3_winding','operator_4_spray','sales','accountant'])
  or assigned_to = public.current_profile_id()
);

drop policy if exists "product_orders_write_roles" on public.product_orders;
create policy "product_orders_write_roles" on public.product_orders for all to authenticated
using (public.has_any_role(array['super_admin','production_head']))
with check (public.has_any_role(array['super_admin','production_head']));

drop policy if exists "product_materials_read_roles" on public.product_order_materials;
create policy "product_materials_read_roles" on public.product_order_materials for select to authenticated
using (public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting','person_b','operator_3_winding','operator_4_spray']));

drop policy if exists "product_materials_write_roles" on public.product_order_materials;
create policy "product_materials_write_roles" on public.product_order_materials for all to authenticated
using (public.has_any_role(array['super_admin','production_head','operator_2_slitting','person_b']))
with check (public.has_any_role(array['super_admin','production_head','operator_2_slitting','person_b']));

drop policy if exists "winding_read_roles" on public.winding;
create policy "winding_read_roles" on public.winding for select to authenticated
using (public.has_any_role(array['super_admin','production_head','person_b','operator_3_winding','operator_4_spray','sales']));

drop policy if exists "winding_write_roles" on public.winding;
create policy "winding_write_roles" on public.winding for all to authenticated
using (public.has_any_role(array['super_admin','person_b','operator_3_winding']))
with check (public.has_any_role(array['super_admin','person_b','operator_3_winding']));

drop policy if exists "spray_read_roles" on public.spray;
create policy "spray_read_roles" on public.spray for select to authenticated
using (public.has_any_role(array['super_admin','production_head','person_b','operator_4_spray','sales']));

drop policy if exists "spray_write_roles" on public.spray;
create policy "spray_write_roles" on public.spray for all to authenticated
using (public.has_any_role(array['super_admin','person_b','operator_4_spray']))
with check (public.has_any_role(array['super_admin','person_b','operator_4_spray']));

drop policy if exists "finished_goods_read_roles" on public.finished_goods;
create policy "finished_goods_read_roles" on public.finished_goods for select to authenticated
using (public.has_any_role(array['super_admin','production_head','sales','accountant','person_b']));

drop policy if exists "finished_goods_write_roles" on public.finished_goods;
create policy "finished_goods_write_roles" on public.finished_goods for all to authenticated
using (public.has_any_role(array['super_admin','production_head','operator_4_spray']))
with check (public.has_any_role(array['super_admin','production_head','operator_4_spray']));

drop policy if exists "material_requests_read_roles" on public.material_requests;
create policy "material_requests_read_roles" on public.material_requests for select to authenticated
using (
  public.has_any_role(array['super_admin','production_head','store_head','person_a','person_b','operator_2_slitting'])
  or requested_by = public.current_profile_id()
);

drop policy if exists "material_requests_write_roles" on public.material_requests;
create policy "material_requests_write_roles" on public.material_requests for all to authenticated
using (public.has_any_role(array['super_admin','store_head','person_a','person_b','operator_2_slitting']))
with check (public.has_any_role(array['super_admin','store_head','person_a','person_b','operator_2_slitting']));

drop policy if exists "material_returns_read_roles" on public.material_returns;
create policy "material_returns_read_roles" on public.material_returns for select to authenticated
using (
  public.has_any_role(array['super_admin','production_head','store_head','person_a','person_b'])
  or returned_by = public.current_profile_id()
);

drop policy if exists "material_returns_write_roles" on public.material_returns;
create policy "material_returns_write_roles" on public.material_returns for all to authenticated
using (public.has_any_role(array['super_admin','store_head','person_a','person_b']))
with check (public.has_any_role(array['super_admin','store_head','person_a','person_b']));

drop policy if exists "vendor_purchases_read_roles" on public.vendor_purchases;
create policy "vendor_purchases_read_roles" on public.vendor_purchases for select to authenticated
using (public.has_any_role(array['super_admin','accountant']));

drop policy if exists "vendor_purchases_write_roles" on public.vendor_purchases;
create policy "vendor_purchases_write_roles" on public.vendor_purchases for all to authenticated
using (public.has_any_role(array['super_admin','accountant']))
with check (public.has_any_role(array['super_admin','accountant']));

drop policy if exists "vendor_purchase_items_read_roles" on public.vendor_purchase_items;
create policy "vendor_purchase_items_read_roles" on public.vendor_purchase_items for select to authenticated
using (public.has_any_role(array['super_admin','accountant']));

drop policy if exists "vendor_purchase_items_write_roles" on public.vendor_purchase_items;
create policy "vendor_purchase_items_write_roles" on public.vendor_purchase_items for all to authenticated
using (public.has_any_role(array['super_admin','accountant']))
with check (public.has_any_role(array['super_admin','accountant']));

drop policy if exists "pipeline_read_roles" on public.pipeline_tracking;
create policy "pipeline_read_roles" on public.pipeline_tracking for select to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head','person_a','person_b','operator_1_metallisation','operator_2_slitting','operator_3_winding','operator_4_spray']));

drop policy if exists "pipeline_write_roles" on public.pipeline_tracking;
create policy "pipeline_write_roles" on public.pipeline_tracking for all to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head','person_a','person_b','operator_1_metallisation','operator_2_slitting','operator_3_winding','operator_4_spray']))
with check (public.has_any_role(array['super_admin','production_head','store_head','person_a','person_b','operator_1_metallisation','operator_2_slitting','operator_3_winding','operator_4_spray']));

drop policy if exists "import_export_jobs_owner_or_admin" on public.import_export_jobs;
create policy "import_export_jobs_owner_or_admin" on public.import_export_jobs for all to authenticated
using (public.is_admin_role() or created_by = public.current_profile_id())
with check (public.is_admin_role() or created_by = public.current_profile_id());

-- Slitting split-role RLS extensions.
alter table public.serial_counters enable row level security;
alter table public.audit_events enable row level security;
alter table public.slitting_coil_confirmations enable row level security;
alter table public.slitting_batches enable row level security;
alter table public.slitting_batch_items enable row level security;
alter table public.generated_documents enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "serial_counters_admin_read" on public.serial_counters;
create policy "serial_counters_admin_read" on public.serial_counters for select to authenticated
using (public.is_admin_role());

drop policy if exists "audit_admin_read" on public.audit_events;
create policy "audit_admin_read" on public.audit_events for select to authenticated
using (public.is_admin_role());

drop policy if exists "slitting_confirmations_read_roles" on public.slitting_coil_confirmations;
create policy "slitting_confirmations_read_roles" on public.slitting_coil_confirmations for select to authenticated
using (
  public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting','slitting_qc','slitting_operator'])
  or operator_id = public.current_profile_id()
);

drop policy if exists "slitting_confirmations_insert_operator" on public.slitting_coil_confirmations;
create policy "slitting_confirmations_insert_operator" on public.slitting_coil_confirmations for insert to authenticated
with check (public.has_any_role(array['super_admin','slitting_operator']));

drop policy if exists "slitting_batches_read_roles" on public.slitting_batches;
create policy "slitting_batches_read_roles" on public.slitting_batches for select to authenticated
using (public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting','slitting_qc','slitting_operator','person_b']));

drop policy if exists "slitting_batches_insert_qc" on public.slitting_batches;
create policy "slitting_batches_insert_qc" on public.slitting_batches for insert to authenticated
with check (public.has_any_role(array['super_admin','operator_2_slitting','slitting_qc']));

drop policy if exists "slitting_batch_items_read_roles" on public.slitting_batch_items;
create policy "slitting_batch_items_read_roles" on public.slitting_batch_items for select to authenticated
using (public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting','slitting_qc','slitting_operator','person_b']));

drop policy if exists "generated_documents_read_roles" on public.generated_documents;
create policy "generated_documents_read_roles" on public.generated_documents for select to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head','person_a','operator_1_metallisation','operator_2_slitting','slitting_qc','slitting_operator','person_b','operator_3_winding','operator_4_spray','sales','accountant']));

drop policy if exists "notifications_owner_read" on public.notifications;
create policy "notifications_owner_read" on public.notifications for select to authenticated
using (recipient_profile_id = public.current_profile_id() or public.is_admin_role());

drop policy if exists "notifications_owner_update" on public.notifications;
create policy "notifications_owner_update" on public.notifications for update to authenticated
using (recipient_profile_id = public.current_profile_id() or public.is_admin_role())
with check (recipient_profile_id = public.current_profile_id() or public.is_admin_role());

drop policy if exists "push_subscriptions_owner_all" on public.push_subscriptions;
create policy "push_subscriptions_owner_all" on public.push_subscriptions for all to authenticated
using (profile_id = public.current_profile_id() or public.is_admin_role())
with check (profile_id = public.current_profile_id() or public.is_admin_role());

drop policy if exists "inventory_read_roles" on public.inventory;
create policy "inventory_read_roles" on public.inventory for select to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head','person_a','operator_1_metallisation','operator_2_slitting','slitting_qc','slitting_operator','person_b','accountant']));

drop policy if exists "work_orders_read_roles" on public.work_orders;
create policy "work_orders_read_roles" on public.work_orders for select to authenticated
using (
  public.has_any_role(array['super_admin','production_head','store_head','person_a','operator_1_metallisation','operator_2_slitting','slitting_qc','slitting_operator'])
  or assigned_to = public.current_profile_id()
);

drop policy if exists "metallisation_read_roles" on public.metallisation;
create policy "metallisation_read_roles" on public.metallisation for select to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head','person_a','operator_1_metallisation','operator_2_slitting','slitting_qc','slitting_operator']));

drop policy if exists "slitting_read_roles" on public.slitting;
create policy "slitting_read_roles" on public.slitting for select to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head','person_a','operator_2_slitting','slitting_qc','slitting_operator','person_b']));

drop policy if exists "slitting_write_roles" on public.slitting;
create policy "slitting_write_roles" on public.slitting for all to authenticated
using (public.has_any_role(array['super_admin','person_a','operator_2_slitting','slitting_qc']))
with check (public.has_any_role(array['super_admin','person_a','operator_2_slitting','slitting_qc']));

drop policy if exists "stock_read_roles" on public.stock;
create policy "stock_read_roles" on public.stock for select to authenticated
using (public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting','slitting_qc','slitting_operator','person_b','operator_3_winding','sales','accountant']));

drop policy if exists "stock_write_roles" on public.stock;
create policy "stock_write_roles" on public.stock for all to authenticated
using (public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting','slitting_qc']))
with check (public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting','slitting_qc']));

drop policy if exists "product_orders_read_roles" on public.product_orders;
create policy "product_orders_read_roles" on public.product_orders for select to authenticated
using (
  public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting','slitting_qc','slitting_operator','person_b','operator_3_winding','operator_4_spray','sales','accountant'])
  or assigned_to = public.current_profile_id()
);

drop policy if exists "product_materials_read_roles" on public.product_order_materials;
create policy "product_materials_read_roles" on public.product_order_materials for select to authenticated
using (public.has_any_role(array['super_admin','production_head','person_a','operator_2_slitting','slitting_qc','slitting_operator','person_b','operator_3_winding','operator_4_spray']));

drop policy if exists "product_materials_write_roles" on public.product_order_materials;
create policy "product_materials_write_roles" on public.product_order_materials for all to authenticated
using (public.has_any_role(array['super_admin','production_head','operator_2_slitting','slitting_qc','person_b']))
with check (public.has_any_role(array['super_admin','production_head','operator_2_slitting','slitting_qc','person_b']));

drop policy if exists "material_requests_read_roles" on public.material_requests;
create policy "material_requests_read_roles" on public.material_requests for select to authenticated
using (
  public.has_any_role(array['super_admin','production_head','store_head','person_a','person_b','operator_2_slitting','slitting_qc'])
  or requested_by = public.current_profile_id()
);

drop policy if exists "material_requests_write_roles" on public.material_requests;
create policy "material_requests_write_roles" on public.material_requests for all to authenticated
using (public.has_any_role(array['super_admin','store_head','person_a','person_b','operator_2_slitting','slitting_qc']))
with check (public.has_any_role(array['super_admin','store_head','person_a','person_b','operator_2_slitting','slitting_qc']));

drop policy if exists "material_returns_read_roles" on public.material_returns;
create policy "material_returns_read_roles" on public.material_returns for select to authenticated
using (
  public.has_any_role(array['super_admin','production_head','store_head','person_a','person_b','operator_2_slitting','slitting_qc'])
  or returned_by = public.current_profile_id()
);

drop policy if exists "material_returns_write_roles" on public.material_returns;
create policy "material_returns_write_roles" on public.material_returns for all to authenticated
using (public.has_any_role(array['super_admin','store_head','person_a','person_b','operator_2_slitting','slitting_qc']))
with check (public.has_any_role(array['super_admin','store_head','person_a','person_b','operator_2_slitting','slitting_qc']));

drop policy if exists "pipeline_read_roles" on public.pipeline_tracking;
create policy "pipeline_read_roles" on public.pipeline_tracking for select to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head','person_a','person_b','operator_1_metallisation','operator_2_slitting','slitting_qc','slitting_operator','operator_3_winding','operator_4_spray']));

drop policy if exists "pipeline_write_roles" on public.pipeline_tracking;
create policy "pipeline_write_roles" on public.pipeline_tracking for all to authenticated
using (public.has_any_role(array['super_admin','production_head','store_head','person_a','person_b','operator_1_metallisation','operator_2_slitting','slitting_qc','slitting_operator','operator_3_winding','operator_4_spray']))
with check (public.has_any_role(array['super_admin','production_head','store_head','person_a','person_b','operator_1_metallisation','operator_2_slitting','slitting_qc','slitting_operator','operator_3_winding','operator_4_spray']));

