-- Upsert the unfiltered AMIS CRM “Tất cả khách hàng” directory into canonical customers.
-- The worker must verify the complete UI total and unique CRM IDs before calling this RPC.
create or replace function public.sync_operational_customers_from_amis_crm(
  p_customers jsonb,
  p_source_total integer
)
returns table(inserted_or_updated integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_changed integer;
begin
  if p_customers is null or jsonb_typeof(p_customers) <> 'array'
     or p_source_total is null or p_source_total < 0
     or jsonb_array_length(p_customers) <> p_source_total then
    raise exception 'AMIS CRM customer snapshot is incomplete';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_customers) as x(source_id text)
    group by x.source_id
    having count(*) > 1
  ) then
    raise exception 'AMIS CRM customer snapshot contains duplicate IDs';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_customers) as x(
      source_id text,
      customer_code text,
      customer_name text,
      phone text
    )
    where nullif(btrim(x.source_id), '') is null
       or nullif(btrim(x.customer_name), '') is null
       or (x.phone is not null and char_length(public.normalize_vn_phone(x.phone)) not between 9 and 15)
  ) then
    raise exception 'AMIS CRM customer snapshot contains invalid fields';
  end if;

  insert into public.customers (
    source_system,
    source_id,
    customer_code,
    customer_name,
    phone,
    synced_at
  )
  select
    'MISA',
    x.source_id,
    nullif(btrim(x.customer_code), ''),
    btrim(x.customer_name),
    nullif(btrim(x.phone), ''),
    now()
  from jsonb_to_recordset(p_customers) as x(
    source_id text,
    customer_code text,
    customer_name text,
    phone text
  )
  on conflict (source_system, source_id) do update
  set
    customer_code = excluded.customer_code,
    customer_name = excluded.customer_name,
    phone = excluded.phone,
    synced_at = now()
  where (
    customers.customer_code,
    customers.customer_name,
    customers.phone
  ) is distinct from (
    excluded.customer_code,
    excluded.customer_name,
    excluded.phone
  );

  get diagnostics v_changed = row_count;
  return query select v_changed;
end;
$$;

revoke all on function public.sync_operational_customers_from_amis_crm(jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.sync_operational_customers_from_amis_crm(jsonb, integer)
  to service_role;

comment on function public.sync_operational_customers_from_amis_crm(jsonb, integer) is
  'Atomically upserts a complete, unfiltered AMIS CRM Account/Grid customer snapshot after the worker verifies the UI total and unique IDs.';
