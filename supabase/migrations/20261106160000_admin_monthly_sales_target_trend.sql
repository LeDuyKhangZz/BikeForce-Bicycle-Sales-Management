-- Biểu đồ "Mục tiêu doanh số theo tháng" tại /admin/targets.
-- Tổng hợp trong PostgreSQL để không kéo báo cáo ngày về Node chỉ để cộng.
create function public.admin_monthly_sales_target_trend(p_year integer)
returns table (
  period_month date,
  target_sales_amount bigint,
  actual_sales_amount bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with guard as (
    select (select public.is_admin()) as ok
  ),
  months as (
    select generate_series(
      make_date(p_year, 1, 1),
      make_date(p_year, 12, 1),
      interval '1 month'
    )::date as period_month
  ),
  targets as (
    select t.period_month, coalesce(sum(t.target_sales_amount), 0)::bigint as amount
    from public.sales_monthly_targets t, guard g
    where g.ok
      and t.period_month >= make_date(p_year, 1, 1)
      and t.period_month < make_date(p_year + 1, 1, 1)
    group by t.period_month
  ),
  actuals as (
    select date_trunc('month', r.report_date)::date as period_month,
           coalesce(sum(r.actual_sales_amount), 0)::bigint as amount
    from public.daily_reports r, guard g
    where g.ok
      and r.status = 'COMPLETED'
      and r.report_date >= make_date(p_year, 1, 1)
      and r.report_date < make_date(p_year + 1, 1, 1)
    group by date_trunc('month', r.report_date)::date
  )
  select
    m.period_month,
    coalesce(t.amount, 0)::bigint,
    coalesce(a.amount, 0)::bigint
  from months m
  left join targets t on t.period_month = m.period_month
  left join actuals a on a.period_month = m.period_month
  order by m.period_month;
$$;

revoke execute on function public.admin_monthly_sales_target_trend(integer) from public;
grant execute on function public.admin_monthly_sales_target_trend(integer) to authenticated;
