-- Persist immutable admin report snapshots for later viewing and download.

create sequence if not exists public.report_number_seq start with 1;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_no text not null unique default ('RPT-' || lpad(nextval('public.report_number_seq')::text, 4, '0')),
  stage text not null check (stage in (
    'Raw Material', 'Work Order', 'Metallisation', 'Slitting',
    'Product Order', 'Winding', 'Spray'
  )),
  date_from date not null,
  date_to date not null,
  data_snapshot jsonb not null default '[]'::jsonb,
  row_count integer not null default 0 check (row_count >= 0),
  generated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint reports_valid_date_range check (date_from <= date_to),
  constraint reports_snapshot_is_array check (jsonb_typeof(data_snapshot) = 'array')
);

alter sequence public.report_number_seq owned by public.reports.report_no;

create index if not exists idx_reports_created_at on public.reports(created_at desc);
create index if not exists idx_reports_stage_dates on public.reports(stage, date_from, date_to);

alter table public.reports enable row level security;

drop policy if exists "reports_super_admin_all" on public.reports;
create policy "reports_super_admin_all"
on public.reports for all to authenticated
using (public.has_any_role(array['super_admin']))
with check (
  public.has_any_role(array['super_admin'])
  and generated_by = public.current_profile_id()
);

