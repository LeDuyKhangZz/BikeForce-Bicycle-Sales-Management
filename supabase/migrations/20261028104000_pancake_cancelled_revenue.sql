-- Lưu tổng giá trị đơn hủy (cancelled_revenue) theo từng ngày cho báo cáo Pancake.

alter table public.pancake_daily_reports
  add column if not exists cancelled_revenue bigint not null default 0,
  drop constraint if exists pancake_daily_reports_cancelled_revenue_nonnegative,
  add constraint pancake_daily_reports_cancelled_revenue_nonnegative
    check (cancelled_revenue >= 0);

update public.pancake_daily_reports
set cancelled_revenue = 4715625
where report_date = '2026-10-27'
  and shop_id = 1022081353
  and cancelled_count > 0
  and cancelled_revenue = 0;

drop function if exists public.upsert_pancake_daily_report(
  date, bigint, integer, bigint, integer, integer, integer, integer, bigint, jsonb
);

create or replace function public.upsert_pancake_daily_report(
  p_report_date date,
  p_shop_id bigint,
  p_order_count integer,
  p_revenue bigint,
  p_cancelled_count integer,
  p_returned_count integer,
  p_late_count integer,
  p_ads_order_count integer,
  p_ads_gmv bigint,
  p_sources jsonb,
  p_cancelled_revenue bigint default 0
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  source_count integer;
  source_order_count bigint;
  source_revenue bigint;
  resolved_market text;
  resolved_currency text;
begin
  select x.market_code, x.currency_code
  into resolved_market, resolved_currency
  from (values
    (1022081353::bigint, 'VN'::text, 'VND'::text),
    (1943148428::bigint, 'SG'::text, 'SGD'::text)
  ) as x(shop_id, market_code, currency_code)
  where x.shop_id = p_shop_id;

  if p_report_date is null
     or resolved_market is null
     or p_order_count is null
     or p_revenue is null
     or p_cancelled_count is null
     or p_cancelled_revenue is null
     or p_returned_count is null
     or p_late_count is null
     or p_ads_order_count is null
     or p_ads_gmv is null
     or p_sources is null
     or p_order_count < 0
     or p_revenue < 0
     or p_cancelled_count < 0
     or p_cancelled_revenue < 0
     or p_returned_count < 0
     or p_late_count < 0
     or p_ads_order_count < 0
     or p_ads_gmv < 0
     or p_cancelled_count > p_order_count
     or (p_cancelled_count = 0 and p_cancelled_revenue <> 0)
     or p_returned_count > p_order_count - p_cancelled_count
     or p_late_count > p_order_count - p_cancelled_count
     or p_ads_order_count > p_order_count - p_cancelled_count
     or p_ads_gmv > p_revenue
     or jsonb_typeof(p_sources) <> 'array' then
    raise exception 'Invalid Pancake daily report';
  end if;

  select coalesce(sum(x.order_count), 0), coalesce(sum(x.revenue), 0)
  into source_order_count, source_revenue
  from jsonb_to_recordset(p_sources) as x(
    source_name text,
    order_count integer,
    revenue bigint
  );

  if source_order_count <> p_order_count - p_cancelled_count
     or source_revenue <> p_revenue then
    raise exception 'Pancake source totals do not match daily report';
  end if;

  insert into public.pancake_daily_reports (
    report_date, shop_id, employee_name, market_code, currency_code,
    order_count, revenue, cancelled_count, cancelled_revenue, returned_count, late_count,
    ads_order_count, ads_gmv, synced_at
  ) values (
    p_report_date, p_shop_id, 'Nguyễn Ngọc Triết', resolved_market, resolved_currency,
    p_order_count, p_revenue, p_cancelled_count, p_cancelled_revenue, p_returned_count, p_late_count,
    p_ads_order_count, p_ads_gmv, now()
  )
  on conflict (report_date, shop_id) do update set
    employee_name = excluded.employee_name,
    market_code = excluded.market_code,
    currency_code = excluded.currency_code,
    order_count = excluded.order_count,
    revenue = excluded.revenue,
    cancelled_count = excluded.cancelled_count,
    cancelled_revenue = excluded.cancelled_revenue,
    returned_count = excluded.returned_count,
    late_count = excluded.late_count,
    ads_order_count = excluded.ads_order_count,
    ads_gmv = excluded.ads_gmv,
    synced_at = now();

  delete from public.pancake_daily_source_reports
  where report_date = p_report_date and shop_id = p_shop_id;

  insert into public.pancake_daily_source_reports (
    report_date, shop_id, source_name, order_count, revenue, synced_at
  )
  select p_report_date, p_shop_id, btrim(x.source_name), x.order_count, x.revenue, now()
  from jsonb_to_recordset(p_sources) as x(
    source_name text,
    order_count integer,
    revenue bigint
  );
  get diagnostics source_count = row_count;

  if source_count <> jsonb_array_length(p_sources) then
    raise exception 'Incomplete Pancake source report';
  end if;

  return source_count;
end;
$$;

revoke all on function public.upsert_pancake_daily_report(
  date, bigint, integer, bigint, integer, integer, integer, integer, bigint, jsonb, bigint
) from public, anon, authenticated;

grant execute on function public.upsert_pancake_daily_report(
  date, bigint, integer, bigint, integer, integer, integer, integer, bigint, jsonb, bigint
) to service_role;

comment on function public.upsert_pancake_daily_report(
  date, bigint, integer, bigint, integer, integer, integer, integer, bigint, jsonb, bigint
) is 'Upsert nguyên tử báo cáo Pancake một ngày (gồm doanh thu đơn hủy) và chi tiết nguồn; chỉ worker service_role được gọi.';

