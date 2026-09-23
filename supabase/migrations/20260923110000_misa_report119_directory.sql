-- Snapshot đầy đủ Report 119 và khách hàng theo nhân viên, thay thế nguyên tử theo tháng.

create table public.misa_report119_employees (
  period_month date not null,
  misa_employee_id bigint not null,
  employee_name text not null,
  customer_count integer not null,
  synced_at timestamptz not null default now(),
  primary key (period_month, misa_employee_id),
  constraint misa_report119_employees_month_first_day check (extract(day from period_month) = 1),
  constraint misa_report119_employees_name_not_blank check (btrim(employee_name) <> ''),
  constraint misa_report119_employees_count_nonnegative check (customer_count >= 0)
);

create table public.misa_report119_customers (
  period_month date not null,
  misa_employee_id bigint not null,
  misa_customer_id bigint not null,
  customer_code text not null default '',
  customer_name text not null default '',
  billing_province text not null default '',
  debt bigint,
  order_sales bigint,
  recent_purchase_date date,
  days_without_purchase integer,
  last_visit_date date,
  owner_name text not null default '',
  synced_at timestamptz not null default now(),
  primary key (period_month, misa_employee_id, misa_customer_id),
  foreign key (period_month, misa_employee_id)
    references public.misa_report119_employees(period_month, misa_employee_id)
    on delete cascade,
  constraint misa_report119_customers_month_first_day check (extract(day from period_month) = 1),
  constraint misa_report119_customers_days_nonnegative check (days_without_purchase is null or days_without_purchase >= 0)
);

alter table public.misa_report119_employees enable row level security;
alter table public.misa_report119_employees force row level security;
alter table public.misa_report119_customers enable row level security;
alter table public.misa_report119_customers force row level security;

revoke all on public.misa_report119_employees from anon, authenticated, service_role;
revoke all on public.misa_report119_customers from anon, authenticated, service_role;
grant select on public.misa_report119_employees to authenticated;
grant select on public.misa_report119_customers to authenticated;

create policy misa_report119_employees_select_admin
  on public.misa_report119_employees for select to authenticated
  using ((select public.is_admin()));

create policy misa_report119_customers_select_admin
  on public.misa_report119_customers for select to authenticated
  using ((select public.is_admin()));

create index misa_report119_customers_employee_idx
  on public.misa_report119_customers (period_month, misa_employee_id, customer_name, misa_customer_id);

create index misa_report119_customers_code_idx
  on public.misa_report119_customers (period_month, customer_code);

create or replace function public.replace_misa_report119_snapshot(
  p_period_month date,
  p_employees jsonb,
  p_customers jsonb
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  employee_count integer;
  customer_count integer;
begin
  if extract(day from p_period_month) <> 1
     or jsonb_typeof(p_employees) <> 'array'
     or jsonb_typeof(p_customers) <> 'array' then
    raise exception 'Invalid MISA Report 119 snapshot';
  end if;

  delete from public.misa_report119_employees where period_month = p_period_month;

  insert into public.misa_report119_employees (
    period_month, misa_employee_id, employee_name, customer_count, synced_at
  )
  select p_period_month, x.id, btrim(x.name), x.customer_count, now()
  from jsonb_to_recordset(p_employees) as x(id bigint, name text, customer_count integer);
  get diagnostics employee_count = row_count;

  insert into public.misa_report119_customers (
    period_month, misa_employee_id, misa_customer_id, customer_code, customer_name,
    billing_province, debt, order_sales, recent_purchase_date,
    days_without_purchase, last_visit_date, owner_name, synced_at
  )
  select p_period_month, x.employee_id, x.id, coalesce(x.code, ''), coalesce(x.name, ''),
    coalesce(x.billing_province, ''), x.debt, x.order_sales, x.recent_purchase_date,
    x.days_without_purchase, x.last_visit_date, coalesce(x.owner, ''), now()
  from jsonb_to_recordset(p_customers) as x(
    employee_id bigint, id bigint, code text, name text, billing_province text,
    debt bigint, order_sales bigint, recent_purchase_date date,
    days_without_purchase integer, last_visit_date date, owner text
  );
  get diagnostics customer_count = row_count;

  if employee_count <> jsonb_array_length(p_employees)
     or customer_count <> jsonb_array_length(p_customers) then
    raise exception 'Incomplete MISA Report 119 snapshot';
  end if;

  return customer_count;
end;
$$;

revoke all on function public.replace_misa_report119_snapshot(date, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_misa_report119_snapshot(date, jsonb, jsonb)
  to service_role;

comment on function public.replace_misa_report119_snapshot(date, jsonb, jsonb) is
  'Thay nguyên tử snapshot nhân viên và toàn bộ khách hàng Report 119 của một tháng.';
