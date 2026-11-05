-- Keep AMIS CRM customer phone numbers in the monthly directory snapshot and
-- promote them into the canonical customer directory used for source matching.

alter table public.misa_report119_customers
  add column if not exists phone text;

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
    billing_province, phone, debt, order_sales, recent_purchase_date,
    days_without_purchase, last_visit_date, owner_name, synced_at
  )
  select p_period_month, x.employee_id, x.id, coalesce(x.code, ''), coalesce(x.name, ''),
    coalesce(x.billing_province, ''), nullif(btrim(x.phone), ''), x.debt, x.order_sales,
    x.recent_purchase_date, x.days_without_purchase, x.last_visit_date,
    coalesce(x.owner, ''), now()
  from jsonb_to_recordset(p_customers) as x(
    employee_id bigint, id bigint, code text, name text, billing_province text,
    phone text, debt bigint, order_sales bigint, recent_purchase_date date,
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
      case
        when nullif(btrim(c.phone), '') is not null
          and char_length(public.normalize_vn_phone(c.phone)) between 9 and 15
          then btrim(c.phone)
        else null
      end as phone,
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
    source_system, source_id, customer_code, customer_name, phone,
    assigned_sales_id, province, source_updated_at, synced_at
  )
  select
    'MISA', source_rows.misa_customer_id::text, source_rows.customer_code,
    source_rows.customer_name, source_rows.phone, source_rows.assigned_sales_id,
    source_rows.province, source_rows.synced_at, now()
  from source_rows
  on conflict (source_system, source_id) do update
  set
    customer_code = excluded.customer_code,
    customer_name = excluded.customer_name,
    phone = coalesce(excluded.phone, customers.phone),
    assigned_sales_id = excluded.assigned_sales_id,
    province = excluded.province,
    source_updated_at = excluded.source_updated_at,
    synced_at = now()
  where (
    customers.customer_code, customers.customer_name, customers.phone,
    customers.assigned_sales_id, customers.province, customers.source_updated_at
  ) is distinct from (
    excluded.customer_code, excluded.customer_name,
    coalesce(excluded.phone, customers.phone),
    excluded.assigned_sales_id, excluded.province, excluded.source_updated_at
  );

  get diagnostics v_changed = row_count;
  return query select v_period_month, v_changed;
end;
$$;

revoke all on function public.replace_misa_report119_snapshot(date, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_misa_report119_snapshot(date, jsonb, jsonb)
  to service_role;

revoke all on function public.sync_operational_customers_from_report119(date)
  from public, anon, authenticated;
grant execute on function public.sync_operational_customers_from_report119(date)
  to service_role;

comment on column public.misa_report119_customers.phone is
  'Số điện thoại khách hàng lấy từ trường Tel trong AMIS CRM Account/Grid.';

create or replace function public.sync_misa_crm_customer_directory(p_customers jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  input_count integer;
  changed_count integer;
begin
  if p_customers is null or jsonb_typeof(p_customers) <> 'array' then
    raise exception 'p_customers must be a JSON array';
  end if;
  input_count := jsonb_array_length(p_customers);
  if input_count > 500 then
    raise exception 'p_customers cannot contain more than 500 customers per call';
  end if;
  if input_count = 0 then return 0; end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_customers) as item(source_id text, customer_name text)
    where nullif(btrim(item.source_id), '') is null
       or item.source_id !~ '^[0-9]+$'
       or nullif(btrim(item.customer_name), '') is null
  ) then
    raise exception 'Each MISA customer needs a numeric source ID and name';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_customers) as item(source_id text)
    group by item.source_id having count(*) > 1
  ) then
    raise exception 'p_customers contains duplicate source IDs';
  end if;

  insert into public.customers (
    source_system, source_id, customer_code, customer_name, phone, province,
    source_updated_at, synced_at
  )
  select
    'MISA', btrim(item.source_id), nullif(btrim(item.customer_code), ''),
    btrim(item.customer_name),
    case
      when nullif(btrim(item.phone), '') is not null
       and char_length(public.normalize_vn_phone(item.phone)) between 9 and 15
        then btrim(item.phone)
      else null
    end,
    nullif(btrim(item.province), ''), now(), now()
  from jsonb_to_recordset(p_customers) as item(
    source_id text, customer_code text, customer_name text,
    phone text, province text
  )
  on conflict (source_system, source_id) do update
  set
    customer_code = coalesce(excluded.customer_code, customers.customer_code),
    customer_name = excluded.customer_name,
    phone = coalesce(excluded.phone, customers.phone),
    province = coalesce(excluded.province, customers.province),
    source_updated_at = now(),
    synced_at = now()
  where (
    customers.customer_code, customers.customer_name, customers.phone,
    customers.province
  ) is distinct from (
    coalesce(excluded.customer_code, customers.customer_code),
    excluded.customer_name,
    coalesce(excluded.phone, customers.phone),
    coalesce(excluded.province, customers.province)
  );

  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

revoke all on function public.sync_misa_crm_customer_directory(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.sync_misa_crm_customer_directory(jsonb)
  to service_role;

comment on function public.sync_misa_crm_customer_directory(jsonb) is
  'Upserts MISA CRM customer records and phone numbers in batches of at most 500; only callable by the sync service role.';
