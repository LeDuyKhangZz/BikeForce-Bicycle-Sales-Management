create table public.misa_customer_monthly_plans (
  period_month date not null,
  misa_employee_id bigint not null,
  misa_customer_id bigint not null,
  sales_id uuid not null references public.profiles(id),
  monthly_frequency smallint not null,
  committed_sales bigint,
  updated_at timestamptz not null default now(),
  primary key (period_month, misa_employee_id, misa_customer_id),
  constraint misa_customer_plans_month_first_day check (extract(day from period_month) = 1),
  constraint misa_customer_plans_frequency_range check (monthly_frequency between 0 and 31),
  constraint misa_customer_plans_sales_nonnegative check (committed_sales is null or committed_sales >= 0)
);

alter table public.misa_customer_monthly_plans enable row level security;
alter table public.misa_customer_monthly_plans force row level security;
revoke all on public.misa_customer_monthly_plans from anon, authenticated, service_role;
grant select, insert, update on public.misa_customer_monthly_plans to authenticated;

create policy misa_customer_plans_select_own_or_admin on public.misa_customer_monthly_plans
  for select to authenticated using (sales_id = (select auth.uid()) or (select public.is_admin()));

create policy misa_customer_plans_insert_own on public.misa_customer_monthly_plans
  for insert to authenticated with check (
    sales_id = (select auth.uid()) and exists (
      select 1 from public.misa_report119_employees e join public.profiles p on p.amis_employee_name = e.employee_name
      where e.period_month = misa_customer_monthly_plans.period_month
        and e.misa_employee_id = misa_customer_monthly_plans.misa_employee_id
        and p.id = (select auth.uid()) and p.role = 'SALES' and p.is_active
    )
  );

create policy misa_customer_plans_update_own on public.misa_customer_monthly_plans
  for update to authenticated using (sales_id = (select auth.uid()))
  with check (
    sales_id = (select auth.uid()) and exists (
      select 1 from public.misa_report119_employees e join public.profiles p on p.amis_employee_name = e.employee_name
      where e.period_month = misa_customer_monthly_plans.period_month
        and e.misa_employee_id = misa_customer_monthly_plans.misa_employee_id
        and p.id = (select auth.uid()) and p.role = 'SALES' and p.is_active
    )
  );

create index misa_customer_plans_sales_month_idx
  on public.misa_customer_monthly_plans (sales_id, period_month);
