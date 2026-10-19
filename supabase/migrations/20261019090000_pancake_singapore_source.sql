-- Thêm nguồn TikTok Shop Singapore vào báo cáo Pancake, giữ tách biệt tiền VND/SGD.

alter table public.pancake_daily_reports
  add column market_code text not null default 'VN',
  add column currency_code text not null default 'VND';

alter table public.pancake_daily_reports
  drop constraint pancake_daily_reports_shop;

alter table public.pancake_daily_reports
  add constraint pancake_daily_reports_shop
  check (shop_id in (1022081353, 1943148428)),
  add constraint pancake_daily_reports_market_currency
  check (
    (shop_id = 1022081353 and market_code = 'VN' and currency_code = 'VND')
    or (shop_id = 1943148428 and market_code = 'SG' and currency_code = 'SGD')
  );

create index pancake_daily_reports_shop_date_idx
  on public.pancake_daily_reports (shop_id, report_date desc);

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
  p_sources jsonb
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
     or p_returned_count is null
     or p_late_count is null
     or p_ads_order_count is null
     or p_ads_gmv is null
     or p_sources is null
     or p_order_count < 0
     or p_revenue < 0
     or p_cancelled_count < 0
     or p_returned_count < 0
     or p_late_count < 0
     or p_ads_order_count < 0
     or p_ads_gmv < 0
     or p_cancelled_count > p_order_count
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
    order_count, revenue, cancelled_count, returned_count, late_count,
    ads_order_count, ads_gmv, synced_at
  ) values (
    p_report_date, p_shop_id, 'Nguyễn Ngọc Triết', resolved_market, resolved_currency,
    p_order_count, p_revenue, p_cancelled_count, p_returned_count, p_late_count,
    p_ads_order_count, p_ads_gmv, now()
  )
  on conflict (report_date, shop_id) do update set
    employee_name = excluded.employee_name,
    market_code = excluded.market_code,
    currency_code = excluded.currency_code,
    order_count = excluded.order_count,
    revenue = excluded.revenue,
    cancelled_count = excluded.cancelled_count,
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
create or replace function public.get_latest_pancake_report_image()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with ranked as (
    select r.*, row_number() over (partition by r.shop_id order by r.report_date desc) as row_rank
    from public.pancake_daily_reports r
    where r.shop_id in (1022081353, 1943148428)
  )
  select jsonb_build_object(
    'reports', coalesce(jsonb_agg(
      jsonb_build_object(
        'daily', to_jsonb(r) - 'row_rank',
        'sources', coalesce((
          select jsonb_agg(to_jsonb(s) order by s.source_name)
          from public.pancake_daily_source_reports s
          where s.report_date = r.report_date and s.shop_id = r.shop_id
        ), '[]'::jsonb)
      ) order by case r.market_code when 'VN' then 1 else 2 end
    ), '[]'::jsonb)
  )
  from ranked r
  where r.row_rank = 1;
$$;

comment on function public.get_latest_pancake_report_image()
  is 'Snapshot mới nhất của từng shop Pancake Việt Nam/Singapore cho route ảnh; chỉ service_role.';

create or replace function public.get_pancake_month_summary(
  p_from date,
  p_to date
) returns table (
  day_count bigint,
  order_count bigint,
  revenue bigint,
  cancelled_count bigint,
  returned_count bigint,
  late_count bigint,
  ads_order_count bigint,
  ads_gmv bigint,
  latest_synced_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
begin
  if not (select public.is_admin()) then raise exception 'Forbidden'; end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 31 then
    raise exception 'Invalid Pancake report range';
  end if;
  return query
  select count(*)::bigint, coalesce(sum(r.order_count), 0)::bigint,
    coalesce(sum(r.revenue), 0)::bigint, coalesce(sum(r.cancelled_count), 0)::bigint,
    coalesce(sum(r.returned_count), 0)::bigint, coalesce(sum(r.late_count), 0)::bigint,
    coalesce(sum(r.ads_order_count), 0)::bigint, coalesce(sum(r.ads_gmv), 0)::bigint,
    max(r.synced_at)
  from public.pancake_daily_reports r
  where r.report_date between p_from and p_to and r.shop_id = 1022081353;
end;
$$;

create or replace function public.get_pancake_month_sources(
  p_from date,
  p_to date
) returns table (source_name text, order_count bigint, revenue bigint)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
begin
  if not (select public.is_admin()) then raise exception 'Forbidden'; end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 31 then
    raise exception 'Invalid Pancake report range';
  end if;
  return query
  select r.source_name, coalesce(sum(r.order_count), 0)::bigint, coalesce(sum(r.revenue), 0)::bigint
  from public.pancake_daily_source_reports r
  where r.report_date between p_from and p_to and r.shop_id = 1022081353
  group by r.source_name order by r.source_name;
end;
$$;

