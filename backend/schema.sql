create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum (
    'super_admin',
    'head_of_operations',
    'production_head',
    'person_a',
    'person_b',
    'person_c',
    'person_d'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.workflow_stage as enum (
    'raw_material',
    'metallisation',
    'slitting',
    'winding',
    'spray',
    'soldening',
    'epoxy',
    'test_print_pack',
    'finished_goods',
    'production_head_review',
    'head_of_operations_review',
    'completed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.workflow_status as enum (
    'yet_to_start',
    'in_progress',
    'awaiting_production_head_review',
    'awaiting_head_of_operations_review',
    'completed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  full_name text not null,
  email text not null unique,
  role public.app_role not null,
  stage_scope text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  work_order_no text not null unique,
  micron numeric(10,2) not null,
  width numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  current_stage public.workflow_stage not null default 'raw_material',
  status public.workflow_status not null default 'yet_to_start',
  production_priority integer not null default 3,
  current_assignee_role public.app_role not null default 'person_a',
  current_assignee_email text,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.raw_materials (
  id uuid primary key default gen_random_uuid(),
  raw_material_no text not null unique,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  micron numeric(10,2) not null,
  width numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  supplier text,
  other text,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stage_records (
  id uuid primary key default gen_random_uuid(),
  stage_record_no text not null unique,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  stage public.workflow_stage not null,
  payload jsonb not null default '{}'::jsonb,
  observations text,
  created_by_email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.product_orders (
  id uuid primary key default gen_random_uuid(),
  product_order_no text not null unique,
  product_code text,
  model_no text,
  capacitance_value text,
  voltage_rating text,
  capacitor_type text,
  grade text,
  tolerance text,
  dielectric_material text,
  batch_size integer not null default 0,
  production_priority integer not null default 3,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_event_no text not null unique,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  event_type text not null,
  from_stage public.workflow_stage,
  to_stage public.workflow_stage,
  actor_email text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists work_orders_stage_idx on public.work_orders(current_stage);
create index if not exists work_orders_status_idx on public.work_orders(status);
create index if not exists raw_materials_work_order_idx on public.raw_materials(work_order_id);
create index if not exists stage_records_work_order_idx on public.stage_records(work_order_id);
create index if not exists product_orders_priority_idx on public.product_orders(production_priority);
create index if not exists workflow_events_work_order_idx on public.workflow_events(work_order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_work_orders_updated_at on public.work_orders;
create trigger set_work_orders_updated_at
before update on public.work_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_raw_materials_updated_at on public.raw_materials;
create trigger set_raw_materials_updated_at
before update on public.raw_materials
for each row execute function public.set_updated_at();

drop trigger if exists set_product_orders_updated_at on public.product_orders;
create trigger set_product_orders_updated_at
before update on public.product_orders
for each row execute function public.set_updated_at();
