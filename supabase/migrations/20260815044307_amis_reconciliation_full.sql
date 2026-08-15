-- Hiện cả hai phía: sales có báo cáo nhưng chưa map, và người có trên AMIS
-- nhưng chưa có tài khoản BikeForce.
drop view if exists public.amis_reconciliation;

create view public.amis_reconciliation
with (security_invoker = on) as
with monthly as (
  select
    r.sales_id,
    date_trunc('month', r.report_date)::date as period_month,
    sum(coalesce(r.actual_revenue, 0))         as reported_revenue,
    sum(coalesce(r.actual_customer_visits, 0)) as reported_customer_visits,
    sum(coalesce(r.actual_sales_quantity, 0))  as reported_sales_quantity,
    count(*)                                   as completed_days
  from public.daily_reports r
  where r.status = 'COMPLETED'
  group by 1, 2
),
reported as (
  select
    m.sales_id,
    p.full_name,
    p.employee_code,
    p.amis_employee_name,
    m.period_month,
    m.reported_revenue,
    m.reported_customer_visits,
    m.reported_sales_quantity,
    m.completed_days
  from monthly m
  join public.profiles p on p.id = m.sales_id
)
select
  r.sales_id,
  coalesce(r.full_name, a.employee_name)   as full_name,
  r.employee_code,
  coalesce(r.period_month, a.period_month) as period_month,
  coalesce(r.completed_days, 0)            as completed_days,

  r.reported_revenue,
  a.net_sales                              as amis_revenue,
  case
    when r.reported_revenue is null or a.net_sales is null then null
    else r.reported_revenue - a.net_sales
  end                                      as revenue_diff,

  r.reported_customer_visits,
  a.qty_account_interactive                as amis_customer_visits,
  case
    when r.reported_customer_visits is null or a.qty_account_interactive is null then null
    else r.reported_customer_visits - a.qty_account_interactive
  end                                      as customer_visits_diff,

  r.reported_sales_quantity,
  a.no_of_orders                           as amis_orders,
  case
    when r.reported_sales_quantity is null or a.no_of_orders is null then null
    else r.reported_sales_quantity - a.no_of_orders
  end                                      as orders_diff,

  a.receive_amount as amis_receivable,
  a.target_amount  as amis_target,
  a.current_amount as amis_current,
  a.synced_at,

  -- Cho UI biết dòng này thiếu phía nào.
  (r.sales_id is null)      as amis_only,
  (a.employee_name is null) as bikeforce_only

from reported r
full outer join public.amis_employee_metrics a
  on a.employee_name = r.amis_employee_name
 and a.period_month  = r.period_month;

comment on view public.amis_reconciliation is
  'Đối chiếu hai chiều: sales BikeForce vs nhân viên AMIS. amis_only = có trên AMIS nhưng chưa có tài khoản/chưa map.';

grant select on public.amis_reconciliation to authenticated;