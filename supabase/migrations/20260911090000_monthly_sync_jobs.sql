-- Yêu cầu đồng bộ dữ liệu tháng từ màn hình Admin.
-- Worker chạy trên máy Windows giữ phiên SaleWork/AMIS; Vercel chỉ tạo và đọc job.

create table public.monthly_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  period_month date not null,
  status text not null default 'PENDING',
  requested_by uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  synced_rows integer,
  error_message text,
  constraint monthly_sync_jobs_month_first_day
    check (extract(day from period_month) = 1),
  constraint monthly_sync_jobs_status_valid
    check (status in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  constraint monthly_sync_jobs_synced_rows_nonnegative
    check (synced_rows is null or synced_rows >= 0)
);

comment on table public.monthly_sync_jobs is
  'Hàng đợi yêu cầu đồng bộ AMIS + SaleWork theo tháng; worker chạy ngoài Vercel.';

alter table public.monthly_sync_jobs enable row level security;
alter table public.monthly_sync_jobs force row level security;

revoke all on table public.monthly_sync_jobs from anon, authenticated, service_role;
grant select, insert on table public.monthly_sync_jobs to authenticated;
grant select, update on table public.monthly_sync_jobs to service_role;

create policy monthly_sync_jobs_select_admin
  on public.monthly_sync_jobs
  for select to authenticated
  using ((select public.is_admin()));

create policy monthly_sync_jobs_insert_admin
  on public.monthly_sync_jobs
  for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and (select public.is_admin())
  );

-- Không cho xếp trùng cùng một tháng khi job cũ còn chờ hoặc đang chạy.
create unique index monthly_sync_jobs_one_active_month_idx
  on public.monthly_sync_jobs (period_month)
  where status in ('PENDING', 'RUNNING');

create index monthly_sync_jobs_requested_at_idx
  on public.monthly_sync_jobs (requested_at desc);
