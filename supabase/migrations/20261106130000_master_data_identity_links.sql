-- Admin-approved identity links preserve every source row and its history.

create table public.customer_identity_links (
  source_customer_id uuid primary key references public.customers(id) on delete restrict,
  canonical_customer_id uuid not null references public.customers(id) on delete restrict,
  linked_by uuid not null references public.profiles(id) on delete restrict,
  linked_at timestamptz not null default now(),
  constraint customer_identity_links_distinct check (source_customer_id <> canonical_customer_id)
);

create index customer_identity_links_canonical_idx
  on public.customer_identity_links (canonical_customer_id);

create table public.product_alias_mappings (
  source_product_id uuid primary key references public.products(id) on delete restrict,
  canonical_product_id uuid not null references public.products(id) on delete restrict,
  mapped_by uuid not null references public.profiles(id) on delete restrict,
  mapped_at timestamptz not null default now(),
  constraint product_alias_mappings_distinct check (source_product_id <> canonical_product_id)
);

create index product_alias_mappings_canonical_idx
  on public.product_alias_mappings (canonical_product_id);

alter table public.customer_identity_links enable row level security;
alter table public.customer_identity_links force row level security;
alter table public.product_alias_mappings enable row level security;
alter table public.product_alias_mappings force row level security;
revoke all on public.customer_identity_links, public.product_alias_mappings from anon, authenticated, service_role;

create policy customer_identity_links_admin_select on public.customer_identity_links
  for select to authenticated using ((select public.is_admin()));
create policy product_alias_mappings_admin_select on public.product_alias_mappings
  for select to authenticated using ((select public.is_admin()));
grant select on public.customer_identity_links, public.product_alias_mappings to authenticated;

create or replace function public.list_customer_identity_candidates(p_limit integer default 50, p_offset integer default 0)
returns table (
  source_customer_id uuid,
  source_id text,
  source_name text,
  source_code text,
  normalized_phone text,
  canonical_customer_id uuid,
  canonical_name text,
  canonical_code text,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce((select public.is_admin()), false) is not true then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then raise exception 'Invalid page range'; end if;

  return query
  with pairs as (
    select s.id as source_customer_id, s.source_id, s.customer_name as source_name,
      s.customer_code as source_code, s.normalized_phone, m.id as canonical_customer_id,
      m.customer_name as canonical_name, m.customer_code as canonical_code
    from public.customers s
    join public.customers m on m.normalized_phone = s.normalized_phone
      and m.source_system = 'MISA'
    left join public.customer_identity_links l on l.source_customer_id = s.id
    where s.source_system = 'SALEWORK_ZALO'
      and s.normalized_phone is not null
      and nullif(btrim(m.customer_code), '') is not null
      and l.source_customer_id is null
  ), counted as (
    select pairs.*, count(*) over () as total_count from pairs
  )
  select counted.source_customer_id, counted.source_id, counted.source_name,
    counted.source_code, counted.normalized_phone, counted.canonical_customer_id,
    counted.canonical_name, counted.canonical_code, counted.total_count
  from counted
  order by counted.source_name, counted.source_customer_id, counted.canonical_code nulls last
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.approve_customer_identity_link(p_source_customer_id uuid, p_canonical_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source public.customers%rowtype;
  v_canonical public.customers%rowtype;
  v_old jsonb;
  v_new jsonb;
begin
  if coalesce((select public.is_admin()), false) is not true then raise exception 'Admin access required' using errcode = '42501'; end if;
  select * into v_source from public.customers where id = p_source_customer_id for update;
  select * into v_canonical from public.customers where id = p_canonical_customer_id for share;
  if v_source.id is null or v_source.source_system <> 'SALEWORK_ZALO'
    or v_canonical.id is null or v_canonical.source_system <> 'MISA'
    or nullif(btrim(v_canonical.customer_code), '') is null
    or v_source.normalized_phone is null
    or v_source.normalized_phone <> v_canonical.normalized_phone then
    raise exception 'Only exact normalized-phone matches from SaleWork to MISA can be linked';
  end if;

  select to_jsonb(l) into v_old from public.customer_identity_links l
    where l.source_customer_id = p_source_customer_id;
  insert into public.customer_identity_links(source_customer_id, canonical_customer_id, linked_by)
  values (p_source_customer_id, p_canonical_customer_id, auth.uid())
  on conflict (source_customer_id) do update set
    canonical_customer_id = excluded.canonical_customer_id,
    linked_by = excluded.linked_by,
    linked_at = now();
  select to_jsonb(l) into v_new from public.customer_identity_links l
    where l.source_customer_id = p_source_customer_id;
  insert into public.audit_log(actor_id, table_name, record_id, action, old_data, new_data)
  values (auth.uid(), 'customer_identity_links', p_source_customer_id::text,
    case when v_old is null then 'INSERT' else 'UPDATE' end, v_old, v_new);
end;
$$;

create or replace function public.list_unmapped_product_aliases(p_limit integer default 50, p_offset integer default 0)
returns table (
  source_product_id uuid,
  source_system text,
  source_id text,
  product_code text,
  product_name text,
  color text,
  size text,
  misa_variants jsonb,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce((select public.is_admin()), false) is not true then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then raise exception 'Invalid page range'; end if;

  return query
  with counted as (
    select p.id, p.source_system, p.source_id, p.product_code, p.product_name,
      p.color, p.size, count(*) over () as total_count
    from public.products p
    left join public.product_alias_mappings m on m.source_product_id = p.id
    where p.source_system <> 'MISA' and m.source_product_id is null
  )
  select counted.id, counted.source_system, counted.source_id, counted.product_code,
    counted.product_name, counted.color, counted.size,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', variants.id, 'product_code', variants.product_code,
        'product_name', variants.product_name, 'color', variants.color, 'size', variants.size
      ) order by variants.product_code)
      from (
        select m.id, m.product_code, m.product_name, m.color, m.size
        from public.products m
        where m.source_system = 'MISA'
          and lower(btrim(m.color)) = lower(btrim(counted.color))
          and lower(btrim(m.size)) = lower(btrim(counted.size))
        order by m.product_code
        limit 100
      ) variants
    ), '[]'::jsonb), counted.total_count
  from counted order by counted.product_name, counted.source_system, counted.source_id
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.approve_product_alias_mapping(p_source_product_id uuid, p_canonical_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source public.products%rowtype;
  v_canonical public.products%rowtype;
  v_old jsonb;
  v_new jsonb;
begin
  if coalesce((select public.is_admin()), false) is not true then raise exception 'Admin access required' using errcode = '42501'; end if;
  select * into v_source from public.products where id = p_source_product_id for update;
  select * into v_canonical from public.products where id = p_canonical_product_id for share;
  if v_source.id is null or v_source.source_system = 'MISA'
    or v_canonical.id is null or v_canonical.source_system <> 'MISA'
    or lower(btrim(v_source.color)) <> lower(btrim(v_canonical.color))
    or lower(btrim(v_source.size)) <> lower(btrim(v_canonical.size)) then
    raise exception 'A product alias must map to a MISA variant with the same color and size';
  end if;

  select to_jsonb(m) into v_old from public.product_alias_mappings m
    where m.source_product_id = p_source_product_id;
  insert into public.product_alias_mappings(source_product_id, canonical_product_id, mapped_by)
  values (p_source_product_id, p_canonical_product_id, auth.uid())
  on conflict (source_product_id) do update set
    canonical_product_id = excluded.canonical_product_id,
    mapped_by = excluded.mapped_by,
    mapped_at = now();
  select to_jsonb(m) into v_new from public.product_alias_mappings m
    where m.source_product_id = p_source_product_id;
  insert into public.audit_log(actor_id, table_name, record_id, action, old_data, new_data)
  values (auth.uid(), 'product_alias_mappings', p_source_product_id::text,
    case when v_old is null then 'INSERT' else 'UPDATE' end, v_old, v_new);
end;
$$;

revoke all on function public.list_customer_identity_candidates(integer, integer) from public, anon;
revoke all on function public.approve_customer_identity_link(uuid, uuid) from public, anon;
revoke all on function public.list_unmapped_product_aliases(integer, integer) from public, anon;
revoke all on function public.approve_product_alias_mapping(uuid, uuid) from public, anon;
grant execute on function public.list_customer_identity_candidates(integer, integer) to authenticated;
grant execute on function public.approve_customer_identity_link(uuid, uuid) to authenticated;
grant execute on function public.list_unmapped_product_aliases(integer, integer) to authenticated;
grant execute on function public.approve_product_alias_mapping(uuid, uuid) to authenticated;

comment on table public.customer_identity_links is
  'Admin-approved link from a SaleWork/Zalo source customer to an exact-phone MISA customer; source rows and history remain intact.';
comment on table public.product_alias_mappings is
  'Admin-approved alias mapping from a non-MISA product source to a MISA product variant with matching color and size.';
