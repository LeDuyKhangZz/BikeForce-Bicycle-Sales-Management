-- Abraham Bike operational data foundation.
-- Adds the shared source of truth without replacing existing reporting snapshots.

create type public.dealer_tier as enum ('STANDARD', 'PARTNER', 'STRATEGIC', 'SPECIALIST');
create type public.operational_task_status as enum ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

create or replace function public.normalize_vn_phone(p_phone text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '') is null then null
    when regexp_replace(p_phone, '[^0-9]', '', 'g') ~ '^84[0-9]{9}$'
      then '0' || substring(regexp_replace(p_phone, '[^0-9]', '', 'g') from 3)
    else regexp_replace(p_phone, '[^0-9]', '', 'g')
  end;
$$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'MISA',
  source_id text not null,
  customer_code text,
  customer_name text not null,
  phone text,
  normalized_phone text generated always as (public.normalize_vn_phone(phone)) stored,
  zalo_account text,
  salework_account text,
  assigned_sales_id uuid references public.profiles(id) on delete set null,
  dealer_tier public.dealer_tier not null default 'STANDARD',
  region text,
  province text,
  is_active boolean not null default true,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_source_unique unique (source_system, source_id),
  constraint customers_name_not_blank check (btrim(customer_name) <> ''),
  constraint customers_source_not_blank check (btrim(source_system) <> '' and btrim(source_id) <> ''),
  constraint customers_phone_length check (normalized_phone is null or char_length(normalized_phone) between 9 and 15)
);

create unique index customers_code_unique_idx
  on public.customers (customer_code) where customer_code is not null and customer_code <> '';
create index customers_phone_idx on public.customers (normalized_phone) where normalized_phone is not null;
create index customers_sales_active_idx on public.customers (assigned_sales_id, is_active, customer_name);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'MISA',
  source_id text not null,
  product_code text not null,
  product_name text not null,
  color text not null default '',
  size text not null default '',
  unit text not null default 'Cái',
  image_url text,
  is_active boolean not null default true,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_source_unique unique (source_system, source_id),
  constraint products_variant_unique unique (product_code, color, size),
  constraint products_required_not_blank check (btrim(product_code) <> '' and btrim(product_name) <> '')
);

create index products_active_name_idx on public.products (is_active, product_name, product_code);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'MISA',
  source_id text not null,
  order_code text not null,
  customer_id uuid references public.customers(id) on delete restrict,
  assigned_sales_id uuid references public.profiles(id) on delete set null,
  order_date date not null,
  status text not null,
  currency_code text not null default 'VND',
  subtotal numeric(18,2) not null default 0,
  discount_amount numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_source_unique unique (source_system, source_id),
  constraint orders_code_not_blank check (btrim(order_code) <> ''),
  constraint orders_amounts_nonnegative check (subtotal >= 0 and discount_amount >= 0 and total_amount >= 0)
);

create index orders_customer_date_idx on public.orders (customer_id, order_date desc);
create index orders_sales_date_idx on public.orders (assigned_sales_id, order_date desc);
create index orders_date_status_idx on public.orders (order_date desc, status);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  source_line_id text not null,
  product_id uuid references public.products(id) on delete restrict,
  quantity numeric(14,3) not null,
  unit_price numeric(18,2) not null default 0,
  discount_amount numeric(18,2) not null default 0,
  line_total numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_lines_source_unique unique (order_id, source_line_id),
  constraint order_lines_values_valid check (quantity > 0 and unit_price >= 0 and discount_amount >= 0 and line_total >= 0)
);

create index order_lines_product_idx on public.order_lines (product_id, order_id);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'MISA',
  source_id text not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  document_code text,
  document_date date,
  due_date date,
  original_amount numeric(18,2) not null default 0,
  outstanding_amount numeric(18,2) not null default 0,
  status text not null default 'OPEN',
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint debts_source_unique unique (source_system, source_id),
  constraint debts_amounts_nonnegative check (original_amount >= 0 and outstanding_amount >= 0),
  constraint debts_outstanding_lte_original check (outstanding_amount <= original_amount)
);

create index debts_customer_due_idx on public.debts (customer_id, due_date, status);
create index debts_open_due_idx on public.debts (due_date, outstanding_amount desc) where outstanding_amount > 0;

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'MISA',
  warehouse_code text not null,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_on_hand numeric(14,3) not null default 0,
  quantity_reserved numeric(14,3) not null default 0,
  quantity_available numeric(14,3) generated always as (quantity_on_hand - quantity_reserved) stored,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_variant_unique unique (source_system, warehouse_code, product_id),
  constraint inventory_warehouse_not_blank check (btrim(warehouse_code) <> ''),
  constraint inventory_quantities_valid check (quantity_on_hand >= 0 and quantity_reserved >= 0 and quantity_reserved <= quantity_on_hand)
);

create index inventory_product_available_idx on public.inventory (product_id, quantity_available);

create table public.care_logs (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'SALEWORK',
  source_id text not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  sales_id uuid references public.profiles(id) on delete set null,
  channel text not null,
  direction text,
  occurred_at timestamptz not null,
  summary text,
  outcome text,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint care_logs_source_unique unique (source_system, source_id),
  constraint care_logs_channel_not_blank check (btrim(channel) <> '')
);

create index care_logs_customer_time_idx on public.care_logs (customer_id, occurred_at desc);
create index care_logs_sales_time_idx on public.care_logs (sales_id, occurred_at desc);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'MISA_AMIS_CRM',
  source_id text not null,
  customer_id uuid references public.customers(id) on delete restrict,
  sales_id uuid not null references public.profiles(id) on delete restrict,
  checked_in_at timestamptz not null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  image_url text,
  note text,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkins_source_unique unique (source_system, source_id),
  constraint checkins_latitude_valid check (latitude is null or latitude between -90 and 90),
  constraint checkins_longitude_valid check (longitude is null or longitude between -180 and 180)
);

create index checkins_sales_time_idx on public.checkins (sales_id, checked_in_at desc);
create index checkins_customer_time_idx on public.checkins (customer_id, checked_in_at desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  task_type text not null,
  title text not null,
  description text,
  priority smallint not null default 3,
  status public.operational_task_status not null default 'OPEN',
  due_at timestamptz,
  completed_at timestamptz,
  source_system text not null default 'BIKEFORCE',
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_blank check (btrim(title) <> '' and btrim(task_type) <> ''),
  constraint tasks_priority_valid check (priority between 1 and 5),
  constraint tasks_completion_valid check ((status = 'DONE' and completed_at is not null) or (status <> 'DONE' and completed_at is null)),
  constraint tasks_source_unique unique nulls not distinct (source_system, source_id)
);

create index tasks_assignee_status_due_idx on public.tasks (assigned_to, status, due_at);
create index tasks_customer_idx on public.tasks (customer_id, created_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  table_name text not null,
  record_id text not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now(),
  constraint audit_log_action_valid check (action in ('INSERT', 'UPDATE', 'DELETE'))
);

create index audit_log_record_idx on public.audit_log (table_name, record_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

create or replace function public.write_operational_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_record jsonb;
begin
  v_record := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_log (actor_id, table_name, record_id, action, old_data, new_data)
  values (
    (select auth.uid()),
    tg_table_name,
    coalesce(v_record ->> 'id', ''),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'customers', 'products', 'orders', 'order_lines', 'debts',
    'inventory', 'care_logs', 'checkins', 'tasks'
  ] loop
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', v_table, v_table);
    execute format('create trigger trg_%I_audit after insert or update or delete on public.%I for each row execute function public.write_operational_audit_log()', v_table, v_table);
  end loop;
end;
$$;

create view public.customer_duplicate_candidates
with (security_invoker = true)
as
select
  normalized_phone,
  count(*) as customer_count,
  array_agg(id order by created_at) as customer_ids,
  array_agg(customer_code order by created_at) as customer_codes,
  array_agg(customer_name order by created_at) as customer_names
from public.customers
where normalized_phone is not null
group by normalized_phone
having count(*) > 1;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'customers', 'products', 'orders', 'order_lines', 'debts',
    'inventory', 'care_logs', 'checkins', 'tasks', 'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on public.%I from anon, authenticated, service_role', v_table);
  end loop;
end;
$$;

grant select, insert, update on public.customers, public.products, public.orders,
  public.order_lines, public.debts, public.inventory, public.care_logs,
  public.checkins, public.tasks to authenticated;
grant select on public.audit_log to authenticated;
grant select on public.customer_duplicate_candidates to authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'customers', 'products', 'orders', 'order_lines', 'debts',
    'inventory', 'care_logs', 'checkins', 'tasks'
  ] loop
    execute format('create policy %I on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', v_table || '_admin_all', v_table);
  end loop;
end;
$$;

create policy audit_log_admin_select on public.audit_log
  for select to authenticated using ((select public.is_admin()));

create policy customers_sales_select on public.customers
  for select to authenticated
  using ((select public.is_active_sales()) and assigned_sales_id = (select auth.uid()));

create policy products_authenticated_select on public.products
  for select to authenticated using (is_active);

create policy inventory_authenticated_select on public.inventory
  for select to authenticated using ((select public.is_active_sales()));

create policy orders_sales_select on public.orders
  for select to authenticated
  using ((select public.is_active_sales()) and assigned_sales_id = (select auth.uid()));

create policy order_lines_sales_select on public.order_lines
  for select to authenticated
  using (
    (select public.is_active_sales())
    and exists (
      select 1 from public.orders o
      where o.id = order_lines.order_id and o.assigned_sales_id = (select auth.uid())
    )
  );

create policy debts_sales_select on public.debts
  for select to authenticated
  using (
    (select public.is_active_sales())
    and exists (
      select 1 from public.customers c
      where c.id = debts.customer_id and c.assigned_sales_id = (select auth.uid())
    )
  );

create policy care_logs_sales_select on public.care_logs
  for select to authenticated
  using (
    (select public.is_active_sales())
    and (
      sales_id = (select auth.uid())
      or exists (
        select 1 from public.customers c
        where c.id = care_logs.customer_id and c.assigned_sales_id = (select auth.uid())
      )
    )
  );

create policy checkins_sales_select on public.checkins
  for select to authenticated
  using ((select public.is_active_sales()) and sales_id = (select auth.uid()));

create policy tasks_sales_select on public.tasks
  for select to authenticated
  using ((select public.is_active_sales()) and assigned_to = (select auth.uid()));

revoke execute on function public.normalize_vn_phone(text) from public, anon;
grant execute on function public.normalize_vn_phone(text) to authenticated;
revoke execute on function public.write_operational_audit_log() from public, anon, authenticated, service_role;

comment on table public.customers is 'Canonical customer directory; MISA source_id is the preferred master key.';
comment on view public.customer_duplicate_candidates is 'Customers sharing a normalized phone number, visible through caller RLS.';
comment on table public.audit_log is 'Append-only operational change history written by database triggers.';
