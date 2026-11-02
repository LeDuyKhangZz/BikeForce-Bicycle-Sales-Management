-- Promote the latest MISA Report 119 directory into the canonical customers table.
-- This is repeatable: source_system + source_id is the stable MISA identity.

create or replace function public.sync_operational_customers_from_report119(
  p_period_month date default null
)
returns table(period_month date, inserted_or_updated integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_period_month date;
  v_changed integer;
begin
  select coalesce(p_period_month, max(c.period_month))
    into v_period_month
  from public.misa_report119_customers c
  where p_period_month is null or c.period_month = p_period_month;

  if v_period_month is null then
    raise exception 'No MISA Report 119 snapshot is available';
  end if;

  with source_rows as (
    select distinct on (c.misa_customer_id)
      c.misa_customer_id,
      nullif(btrim(c.customer_code), '') as customer_code,
      coalesce(nullif(btrim(c.customer_name), ''), 'Khách hàng MISA ' || c.misa_customer_id::text) as customer_name,
      nullif(btrim(c.billing_province), '') as province,
      p.id as assigned_sales_id,
      c.synced_at
    from public.misa_report119_customers c
    join public.misa_report119_employees e
      on e.period_month = c.period_month
     and e.misa_employee_id = c.misa_employee_id
    left join public.profiles p
      on p.role = 'SALES'
     and p.is_active
     and p.amis_employee_name = e.employee_name
    where c.period_month = v_period_month
    order by c.misa_customer_id, c.synced_at desc, c.misa_employee_id
  )
  insert into public.customers (
    source_system,
    source_id,
    customer_code,
    customer_name,
    assigned_sales_id,
    province,
    source_updated_at,
    synced_at
  )
  select
    'MISA',
    source_rows.misa_customer_id::text,
    source_rows.customer_code,
    source_rows.customer_name,
    source_rows.assigned_sales_id,
    source_rows.province,
    source_rows.synced_at,
    now()
  from source_rows
  on conflict (source_system, source_id) do update
  set
    customer_code = excluded.customer_code,
    customer_name = excluded.customer_name,
    assigned_sales_id = excluded.assigned_sales_id,
    province = excluded.province,
    source_updated_at = excluded.source_updated_at,
    synced_at = now()
  where (
    customers.customer_code,
    customers.customer_name,
    customers.assigned_sales_id,
    customers.province,
    customers.source_updated_at
  ) is distinct from (
    excluded.customer_code,
    excluded.customer_name,
    excluded.assigned_sales_id,
    excluded.province,
    excluded.source_updated_at
  );

  get diagnostics v_changed = row_count;
  return query select v_period_month, v_changed;
end;
$$;

revoke all on function public.sync_operational_customers_from_report119(date)
  from public, anon, authenticated;
grant execute on function public.sync_operational_customers_from_report119(date)
  to service_role;

comment on function public.sync_operational_customers_from_report119(date) is
  'Upserts one Report 119 month (latest when null) into canonical customers and maps the active BikeForce sales owner.';

-- Backfill immediately from the latest snapshot already in production.
select * from public.sync_operational_customers_from_report119(null);
