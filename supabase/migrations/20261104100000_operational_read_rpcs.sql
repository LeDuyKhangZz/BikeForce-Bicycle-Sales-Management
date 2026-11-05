-- RPC chỉ-đọc cho màn Admin "Đơn hàng" và "Tồn kho" (dữ liệu đồng bộ từ MISA).
-- Tổng hợp chạy bằng SQL thay vì kéo hàng nghìn dòng về Node (AGENTS.md §5).
-- SECURITY INVOKER: vẫn chịu RLS của người gọi, cộng chốt chặn is_admin().

create or replace function public.get_admin_order_summary(p_from date, p_to date)
returns table (
  order_count bigint,
  total_amount numeric,
  outstanding_amount numeric,
  customer_count bigint,
  latest_synced_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Forbidden';
  end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 366 then
    raise exception 'Invalid order summary range';
  end if;

  return query
  select
    count(*)::bigint,
    coalesce(sum(o.total_amount), 0)::numeric,
    coalesce(sum(d.outstanding_amount), 0)::numeric,
    count(distinct o.customer_id)::bigint,
    max(o.synced_at)
  from public.orders o
  left join public.debts d
    on d.source_system = o.source_system
   and d.source_id = 'SALE_ORDER:' || o.source_id
  where o.order_date between p_from and p_to;
end;
$$;

create or replace function public.get_admin_inventory_warehouses()
returns table (
  warehouse_code text,
  product_count bigint,
  in_stock_count bigint,
  quantity_on_hand numeric,
  latest_synced_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Forbidden';
  end if;

  return query
  select
    i.warehouse_code,
    count(*)::bigint,
    count(*) filter (where i.quantity_on_hand > 0)::bigint,
    coalesce(sum(i.quantity_on_hand), 0)::numeric,
    max(i.synced_at)
  from public.inventory i
  group by i.warehouse_code
  order by i.warehouse_code;
end;
$$;

revoke all on function public.get_admin_order_summary(date, date) from public, anon;
grant execute on function public.get_admin_order_summary(date, date) to authenticated;

revoke all on function public.get_admin_inventory_warehouses() from public, anon;
grant execute on function public.get_admin_inventory_warehouses() to authenticated;

comment on function public.get_admin_order_summary(date, date) is
  'Tổng hợp đơn bán MISA trong khoảng ngày cho Admin: số đơn, doanh số, còn phải thu, số khách.';
comment on function public.get_admin_inventory_warehouses() is
  'Tổng hợp tồn kho MISA theo từng kho cho Admin.';

