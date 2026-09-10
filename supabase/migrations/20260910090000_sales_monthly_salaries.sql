-- Lương theo từng nhân viên Sales và từng tháng.
-- Đây là dữ liệu nhạy cảm: chỉ Admin được đọc/ghi; không cấp quyền xoá.

create table public.sales_monthly_salaries (
  period_month date not null,
  sales_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,

  primary key (period_month, sales_id),
  constraint sales_monthly_salaries_month_first_day
    check (extract(day from period_month) = 1),
  constraint sales_monthly_salaries_amount_nonnegative
    check (amount is null or amount >= 0)
);

comment on table public.sales_monthly_salaries is
  'Lương theo tháng do Admin nhập cho từng nhân viên Sales.';
comment on column public.sales_monthly_salaries.amount is
  'Số tiền lương nguyên VND; NULL nghĩa là chưa nhập.';

alter table public.sales_monthly_salaries enable row level security;
alter table public.sales_monthly_salaries force row level security;

revoke all on table public.sales_monthly_salaries from anon;
revoke all on table public.sales_monthly_salaries from authenticated;
revoke all on table public.sales_monthly_salaries from service_role;
grant select, insert, update on table public.sales_monthly_salaries to authenticated;

create policy monthly_salaries_select_admin
  on public.sales_monthly_salaries
  for select
  to authenticated
  using ((select public.is_admin()));

create policy monthly_salaries_insert_admin
  on public.sales_monthly_salaries
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy monthly_salaries_update_admin
  on public.sales_monthly_salaries
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create trigger trg_sales_monthly_salaries_set_updated_at
  before update on public.sales_monthly_salaries
  for each row execute function public.set_updated_at();

create index sales_monthly_salaries_period_idx
  on public.sales_monthly_salaries (period_month desc);
