-- Công tác phí theo từng nhân viên Sales và từng tháng.
-- Chỉ Admin được đọc/ghi; client vẫn dùng anon key và chịu RLS.

create table public.sales_monthly_travel_expenses (
  period_month date not null,
  sales_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,

  primary key (period_month, sales_id),
  constraint sales_monthly_travel_expenses_month_first_day
    check (extract(day from period_month) = 1),
  constraint sales_monthly_travel_expenses_amount_nonnegative
    check (amount is null or amount >= 0)
);

comment on table public.sales_monthly_travel_expenses is
  'Công tác phí theo tháng do Admin nhập cho từng nhân viên Sales.';
comment on column public.sales_monthly_travel_expenses.amount is
  'Số tiền công tác phí nguyên VND; NULL nghĩa là chưa nhập.';

alter table public.sales_monthly_travel_expenses enable row level security;
alter table public.sales_monthly_travel_expenses force row level security;

revoke all on table public.sales_monthly_travel_expenses from anon;
revoke all on table public.sales_monthly_travel_expenses from authenticated;
grant select, insert, update on table public.sales_monthly_travel_expenses to authenticated;

create policy monthly_travel_expenses_select_admin
  on public.sales_monthly_travel_expenses
  for select
  to authenticated
  using ((select public.is_admin()));

create policy monthly_travel_expenses_insert_admin
  on public.sales_monthly_travel_expenses
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy monthly_travel_expenses_update_admin
  on public.sales_monthly_travel_expenses
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create trigger trg_sales_monthly_travel_expenses_set_updated_at
  before update on public.sales_monthly_travel_expenses
  for each row execute function public.set_updated_at();

create index sales_monthly_travel_expenses_period_idx
  on public.sales_monthly_travel_expenses (period_month desc);
