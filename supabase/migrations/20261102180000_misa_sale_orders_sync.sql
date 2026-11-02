-- Secure batch ingestion for MISA public SaleOrders API.

create or replace function public.upsert_misa_sale_orders(p_orders jsonb)
returns table(order_count integer, line_count integer, product_count integer, debt_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order jsonb;
  v_line jsonb;
  v_order_id uuid;
  v_product_id uuid;
  v_customer_id uuid;
  v_sales_id uuid;
  v_order_count integer := 0;
  v_line_count integer := 0;
  v_product_count integer := 0;
  v_debt_count integer := 0;
  v_order_total numeric(18,2);
  v_outstanding numeric(18,2);
begin
  if jsonb_typeof(p_orders) <> 'array' then
    raise exception 'p_orders must be a JSON array';
  end if;

  for v_order in select value from jsonb_array_elements(p_orders)
  loop
    if nullif(btrim(v_order ->> 'source_id'), '') is null
       or nullif(btrim(v_order ->> 'order_code'), '') is null
       or nullif(v_order ->> 'order_date', '') is null then
      raise exception 'MISA order is missing source_id, order_code or order_date';
    end if;

    select c.id into v_customer_id
    from public.customers c
    where c.customer_code = nullif(btrim(v_order ->> 'customer_code'), '')
    limit 1;

    select p.id into v_sales_id
    from public.profiles p
    where p.role = 'SALES'
      and p.is_active
      and (
        p.employee_code = nullif(btrim(v_order ->> 'employee_code'), '')
        or p.amis_employee_name = nullif(btrim(v_order ->> 'employee_name'), '')
      )
    order by (p.employee_code = nullif(btrim(v_order ->> 'employee_code'), '')) desc
    limit 1;

    v_order_total := greatest(coalesce((v_order ->> 'total_amount')::numeric, 0), 0);
    v_outstanding := greatest(coalesce((v_order ->> 'outstanding_amount')::numeric, 0), 0);

    insert into public.orders (
      source_system, source_id, order_code, customer_id, assigned_sales_id,
      order_date, status, currency_code, subtotal, discount_amount, total_amount,
      source_updated_at, synced_at
    ) values (
      'MISA', v_order ->> 'source_id', v_order ->> 'order_code',
      v_customer_id, v_sales_id, (v_order ->> 'order_date')::date,
      coalesce(nullif(v_order ->> 'status', ''), 'UNKNOWN'),
      coalesce(nullif(v_order ->> 'currency_code', ''), 'VND'),
      greatest(coalesce((v_order ->> 'subtotal')::numeric, v_order_total), 0),
      greatest(coalesce((v_order ->> 'discount_amount')::numeric, 0), 0),
      v_order_total, nullif(v_order ->> 'source_updated_at', '')::timestamptz, now()
    )
    on conflict (source_system, source_id) do update set
      order_code = excluded.order_code,
      customer_id = coalesce(excluded.customer_id, orders.customer_id),
      assigned_sales_id = coalesce(excluded.assigned_sales_id, orders.assigned_sales_id),
      order_date = excluded.order_date,
      status = excluded.status,
      currency_code = excluded.currency_code,
      subtotal = excluded.subtotal,
      discount_amount = excluded.discount_amount,
      total_amount = excluded.total_amount,
      source_updated_at = excluded.source_updated_at,
      synced_at = now()
    returning id into v_order_id;
    v_order_count := v_order_count + 1;

    for v_line in select value from jsonb_array_elements(coalesce(v_order -> 'lines', '[]'::jsonb))
    loop
      if nullif(btrim(v_line ->> 'source_line_id'), '') is null
         or nullif(btrim(v_line ->> 'product_code'), '') is null then
        raise exception 'MISA order line is missing source_line_id or product_code';
      end if;

      insert into public.products (
        source_system, source_id, product_code, product_name, unit,
        source_updated_at, synced_at
      ) values (
        'MISA', v_line ->> 'product_code', v_line ->> 'product_code',
        coalesce(nullif(btrim(v_line ->> 'product_name'), ''), v_line ->> 'product_code'),
        coalesce(nullif(btrim(v_line ->> 'unit'), ''), 'Cái'),
        nullif(v_order ->> 'source_updated_at', '')::timestamptz, now()
      )
      on conflict (source_system, source_id) do update set
        product_code = excluded.product_code,
        product_name = excluded.product_name,
        unit = excluded.unit,
        source_updated_at = excluded.source_updated_at,
        synced_at = now()
      returning id into v_product_id;
      v_product_count := v_product_count + 1;

      insert into public.order_lines (
        order_id, source_line_id, product_id, quantity, unit_price,
        discount_amount, line_total
      ) values (
        v_order_id, v_line ->> 'source_line_id', v_product_id,
        greatest(coalesce((v_line ->> 'quantity')::numeric, 0), 0.001),
        greatest(coalesce((v_line ->> 'unit_price')::numeric, 0), 0),
        greatest(coalesce((v_line ->> 'discount_amount')::numeric, 0), 0),
        greatest(coalesce((v_line ->> 'line_total')::numeric, 0), 0)
      )
      on conflict (order_id, source_line_id) do update set
        product_id = excluded.product_id,
        quantity = excluded.quantity,
        unit_price = excluded.unit_price,
        discount_amount = excluded.discount_amount,
        line_total = excluded.line_total;
      v_line_count := v_line_count + 1;
    end loop;

    if v_customer_id is not null then
      insert into public.debts (
        source_system, source_id, customer_id, document_code, document_date,
        due_date, original_amount, outstanding_amount, status,
        source_updated_at, synced_at
      ) values (
        'MISA', 'SALE_ORDER:' || (v_order ->> 'source_id'), v_customer_id,
        v_order ->> 'order_code', (v_order ->> 'order_date')::date,
        nullif(v_order ->> 'due_date', '')::date, v_order_total,
        least(v_outstanding, v_order_total),
        case when v_outstanding > 0 then 'OPEN' else 'PAID' end,
        nullif(v_order ->> 'source_updated_at', '')::timestamptz, now()
      )
      on conflict (source_system, source_id) do update set
        customer_id = excluded.customer_id,
        document_code = excluded.document_code,
        document_date = excluded.document_date,
        due_date = excluded.due_date,
        original_amount = excluded.original_amount,
        outstanding_amount = excluded.outstanding_amount,
        status = excluded.status,
        source_updated_at = excluded.source_updated_at,
        synced_at = now();
      v_debt_count := v_debt_count + 1;
    end if;
  end loop;

  return query select v_order_count, v_line_count, v_product_count, v_debt_count;
end;
$$;

revoke all on function public.upsert_misa_sale_orders(jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_misa_sale_orders(jsonb) to service_role;

comment on function public.upsert_misa_sale_orders(jsonb) is
  'Atomically upserts normalized MISA sale orders, product lines and receivables. Table DML remains unavailable to service_role.';
