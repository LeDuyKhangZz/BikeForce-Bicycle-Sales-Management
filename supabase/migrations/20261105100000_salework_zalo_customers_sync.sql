-- Allow the SaleWork sync worker to upsert only SaleWork Zalo contacts.
-- Keep direct DML on public.customers revoked from service_role.

create or replace function public.sync_salework_zalo_customers(p_contacts jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_input_count integer;
  v_changed integer;
begin
  if p_contacts is null or jsonb_typeof(p_contacts) <> 'array' then
    raise exception 'p_contacts must be a JSON array';
  end if;

  v_input_count := jsonb_array_length(p_contacts);
  if v_input_count > 500 then
    raise exception 'p_contacts cannot contain more than 500 contacts per call';
  end if;
  if v_input_count = 0 then
    return 0;
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_contacts) as item(source_id text, customer_name text)
    where nullif(btrim(item.source_id), '') is null
       or item.source_id !~ '^(FRIEND|CONTACT|REQUEST):[^:]+:[^:]+$'
       or nullif(btrim(item.customer_name), '') is null
  ) then
    raise exception 'Each contact needs a SaleWork source ID and a non-empty customer name';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_contacts) as item(source_id text)
    group by item.source_id
    having count(*) > 1
  ) then
    raise exception 'p_contacts contains duplicate source IDs';
  end if;

  insert into public.customers (
    source_system,
    source_id,
    customer_name,
    phone,
    zalo_account,
    source_updated_at,
    synced_at
  )
  select
    'SALEWORK_ZALO',
    btrim(item.source_id),
    btrim(item.customer_name),
    nullif(btrim(item.phone), ''),
    nullif(btrim(item.zalo_account), ''),
    item.source_updated_at,
    now()
  from jsonb_to_recordset(p_contacts) as item(
    source_id text,
    customer_name text,
    phone text,
    zalo_account text,
    source_updated_at timestamptz
  )
  on conflict (source_system, source_id) do update
  set
    customer_name = excluded.customer_name,
    phone = excluded.phone,
    zalo_account = excluded.zalo_account,
    source_updated_at = excluded.source_updated_at,
    synced_at = now()
  where (
    customers.customer_name,
    customers.phone,
    customers.zalo_account,
    customers.source_updated_at
  ) is distinct from (
    excluded.customer_name,
    excluded.phone,
    excluded.zalo_account,
    excluded.source_updated_at
  );

  get diagnostics v_changed = row_count;
  return v_changed;
end;
$$;

revoke all on function public.sync_salework_zalo_customers(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.sync_salework_zalo_customers(jsonb)
  to service_role;

comment on function public.sync_salework_zalo_customers(jsonb) is
  'Restricted service RPC: upserts at most 500 SaleWork Zalo contacts per call; does not grant direct table DML.';
