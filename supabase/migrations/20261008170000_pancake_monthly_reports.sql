-- Tổng hợp báo cáo Pancake theo tháng cho Admin.

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
  if not (select public.is_admin()) then
    raise exception 'Forbidden';
  end if;

  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 31 then
    raise exception 'Invalid Pancake report range';
  end if;

  return query
  select
    count(*)::bigint,
    coalesce(sum(r.order_count), 0)::bigint,
    coalesce(sum(r.revenue), 0)::bigint,
    coalesce(sum(r.cancelled_count), 0)::bigint,
    coalesce(sum(r.returned_count), 0)::bigint,
    coalesce(sum(r.late_count), 0)::bigint,
    coalesce(sum(r.ads_order_count), 0)::bigint,
    coalesce(sum(r.ads_gmv), 0)::bigint,
    max(r.synced_at)
  from public.pancake_daily_reports r
  where r.report_date between p_from and p_to;
end;
$$;

create or replace function public.get_pancake_month_sources(
  p_from date,
  p_to date
) returns table (
  source_name text,
  order_count bigint,
  revenue bigint
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

  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 31 then
    raise exception 'Invalid Pancake report range';
  end if;

  return query
  select
    r.source_name,
    coalesce(sum(r.order_count), 0)::bigint,
    coalesce(sum(r.revenue), 0)::bigint
  from public.pancake_daily_source_reports r
  where r.report_date between p_from and p_to
  group by r.source_name
  order by r.source_name;
end;
$$;

revoke all on function public.get_pancake_month_summary(date, date) from public, anon, service_role;
revoke all on function public.get_pancake_month_sources(date, date) from public, anon, service_role;
grant execute on function public.get_pancake_month_summary(date, date) to authenticated;
grant execute on function public.get_pancake_month_sources(date, date) to authenticated;

comment on function public.get_pancake_month_summary(date, date)
  is 'Tổng hợp KPI Pancake theo khoảng tối đa 32 ngày; chỉ Admin đã xác thực.';
comment on function public.get_pancake_month_sources(date, date)
  is 'Tổng hợp đơn không hủy theo nguồn Pancake trong khoảng tối đa 32 ngày; chỉ Admin đã xác thực.';
