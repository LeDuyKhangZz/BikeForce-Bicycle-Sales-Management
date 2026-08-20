-- View đối chiếu: số sales tự nhập (cộng cả tháng) vs số AMIS ghi nhận.
-- security_invoker = view chạy dưới quyền người gọi -> RLS của
-- daily_reports và amis_employee_metrics vẫn được áp dụng đầy đủ.

create view public.amis_reconciliation
with (security_invoker = on) as
with monthly as (
  select
    r.sales_id,
    date_trunc('month', r.report_date)::date as period_month,
    sum(coalesce(r.actual_revenue, 0))         as reported_revenue,
    sum(coalesce(r.actual_customer_visits, 0)) as reported_customer_visits,
    sum(coalesce(r.actual_sales_quantity, 0))  as reported_sales_quantity,
    count(*) filter (where r.status = 'COMPLETED') as completed_days
  from public.daily_reports r
  where r.status = 'COMPLETED'
  group by 1, 2
)
select
  p.id            as sales_id,
  p.full_name,
  p.employee_code,
  m.period_month,
  m.completed_days,

  m.reported_revenue,
  a.net_sales                                  as amis_revenue,
  m.reported_revenue - coalesce(a.net_sales, 0) as revenue_diff,

  m.reported_customer_visits,
  a.qty_account_interactive                                        as amis_customer_visits,
  m.reported_customer_visits - coalesce(a.qty_account_interactive, 0) as customer_visits_diff,

  m.reported_sales_quantity,
  a.no_of_orders                                        as amis_orders,
  m.reported_sales_quantity - coalesce(a.no_of_orders, 0) as orders_diff,

  a.receive_amount as amis_receivable,
  a.target_amount  as amis_target,
  a.synced_at

from monthly m
join public.profiles p on p.id = m.sales_id
left join public.amis_employee_metrics a
  on a.employee_name = p.amis_employee_name
 and a.period_month  = m.period_month;

comment on view public.amis_reconciliation is
  'Đối chiếu số sales tự nhập với số AMIS. Chỉ ghép được khi profiles.amis_employee_name đã điền.';

grant select on public.amis_reconciliation to authenticated;
