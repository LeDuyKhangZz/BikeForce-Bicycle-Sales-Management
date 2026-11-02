-- Secure batch ingestion for the MISA Stocks/product_ledger endpoint.

create or replace function public.upsert_misa_inventory(
  p_stock_code text,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_count integer := 0;
begin
  if nullif(btrim(p_stock_code), '') is null then
    raise exception 'p_stock_code is required';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if nullif(btrim(v_item ->> 'product_code'), '') is null then
      raise exception 'Inventory item is missing product_code';
    end if;

    insert into public.products (
      source_system, source_id, product_code, product_name, unit,
      source_updated_at, synced_at
    ) values (
      'MISA', v_item ->> 'product_code', v_item ->> 'product_code',
      v_item ->> 'product_code', 'Cái', now(), now()
    )
    on conflict (source_system, source_id) do update set
      product_code = excluded.product_code,
      source_updated_at = now(),
      synced_at = now()
    returning id into v_product_id;

    insert into public.inventory (
      source_system, warehouse_code, product_id,
      quantity_on_hand, quantity_reserved, source_updated_at, synced_at
    ) values (
      'MISA', btrim(p_stock_code), v_product_id,
      greatest(coalesce((v_item ->> 'quantity_on_hand')::numeric, 0), 0),
      0, now(), now()
    )
    on conflict (source_system, warehouse_code, product_id) do update set
      quantity_on_hand = excluded.quantity_on_hand,
      quantity_reserved = excluded.quantity_reserved,
      source_updated_at = excluded.source_updated_at,
      synced_at = now();
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.upsert_misa_inventory(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_misa_inventory(text, jsonb) to service_role;

comment on function public.upsert_misa_inventory(text, jsonb) is
  'Upserts one MISA warehouse product-ledger snapshot. main_stock_quantity is stored as quantity_on_hand.';
