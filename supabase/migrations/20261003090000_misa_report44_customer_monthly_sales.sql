-- Doanh số đơn hàng theo khách hàng/tháng từ AMIS CRM report 44/0.

create table public.misa_report44_customer_monthly_sales (
  period_month date not null,
  customer_code text not null,
  customer_name text not null default '',
  order_sales bigint not null,
  synced_at timestamptz not null default now(),
  primary key (period_month, customer_code),
  constraint misa_report44_month_first_day check (extract(day from period_month) = 1),
  constraint misa_report44_customer_code_not_blank check (btrim(customer_code) <> '')
);

alter table public.misa_report44_customer_monthly_sales enable row level security;
alter table public.misa_report44_customer_monthly_sales force row level security;

revoke all on public.misa_report44_customer_monthly_sales from anon, authenticated, service_role;
grant select on public.misa_report44_customer_monthly_sales to authenticated;

create policy misa_report44_customer_sales_select_admin
  on public.misa_report44_customer_monthly_sales for select to authenticated
  using ((select public.is_admin()));

create policy misa_report44_customer_sales_select_own
  on public.misa_report44_customer_monthly_sales for select to authenticated
  using (
    exists (
      select 1
      from public.misa_report119_customers customer
      join public.misa_report119_employees employee
        on employee.period_month = customer.period_month
       and employee.misa_employee_id = customer.misa_employee_id
      join public.profiles profile
        on profile.amis_employee_name = employee.employee_name
      where profile.id = (select auth.uid())
        and profile.role = 'SALES'
        and profile.is_active
        and upper(btrim(customer.customer_code)) = misa_report44_customer_monthly_sales.customer_code
    )
  );

create index misa_report44_customer_sales_month_name_idx
  on public.misa_report44_customer_monthly_sales (period_month, customer_name, customer_code);

create index misa_report119_customers_code_owner_idx
  on public.misa_report119_customers (customer_code, period_month, misa_employee_id);

create or replace function public.replace_misa_report44_customer_sales(
  p_from_month date,
  p_to_month date,
  p_rows jsonb
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_count integer;
begin
  if extract(day from p_from_month) <> 1
     or extract(day from p_to_month) <> 1
     or p_from_month > p_to_month
     or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Invalid MISA report 44 snapshot';
  end if;

  delete from public.misa_report44_customer_monthly_sales
  where period_month between p_from_month and p_to_month;

  insert into public.misa_report44_customer_monthly_sales (
    period_month, customer_code, customer_name, order_sales, synced_at
  )
  select x.period_month, upper(btrim(x.customer_code)), coalesce(btrim(x.customer_name), ''),
    x.order_sales, now()
  from jsonb_to_recordset(p_rows) as x(
    period_month date, customer_code text, customer_name text, order_sales bigint
  )
  where x.period_month between p_from_month and p_to_month
    and btrim(x.customer_code) <> '';
  get diagnostics inserted_count = row_count;

  if inserted_count <> jsonb_array_length(p_rows) then
    raise exception 'Incomplete MISA report 44 snapshot';
  end if;

  return inserted_count;
end;
$$;

revoke all on function public.replace_misa_report44_customer_sales(date, date, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_misa_report44_customer_sales(date, date, jsonb)
  to service_role;

comment on function public.replace_misa_report44_customer_sales(date, date, jsonb) is
  'Thay nguyên tử lịch sử doanh số khách hàng report 44 trong một khoảng tháng.';
