-- BikeForce — thu hồi HAI thay đổi được sửa thẳng trên cloud về lại migration
--
-- Ngày 2026-08-17, `supabase db diff --linked` phát hiện schema trên cloud đã
-- khác git ở hai chỗ. Sửa thẳng trên production thì mất ngay khi ai đó chạy
-- `db reset` hoặc dựng môi trường mới, nên phải ghi lại thành migration.
--
-- ---------------------------------------------------------------------------
--  (1) GIỮ LẠI: COALESCE cho `amis_revenue`
-- ---------------------------------------------------------------------------
--  `net_sales` đến từ report 119 (nguồn 1). Khi nguồn đó chưa đẩy được số thì
--  cả màn hình "Đối chiếu AMIS" trắng bốc — mọi dòng ghi "Không so được".
--  Lùi về `current_amount` của dashboard giúp màn hình còn dùng được.
--
--  ⚠ ĐÁNH ĐỔI PHẢI BIẾT: `current_amount` là DOANH SỐ, còn `reported_revenue`
--  là tiền CÔNG NỢ THU HỒI mà Sales tự nhập (DEC-050). Hai đại lượng khác
--  nhau, nên cột "Chênh lệch" khi rơi vào nhánh lùi này KHÔNG so cùng bản
--  chất — con số `+593%` không mang nghĩa nghiệp vụ. Thứ đáng so với công nợ
--  là `receive_amount` (nguồn 3). Giữ COALESCE là chấp nhận "có còn hơn
--  không" cho tới khi hai nguồn kia chạy.
--
-- ---------------------------------------------------------------------------
--  (2) TRẢ LẠI: `synced_at` về `default now()`
-- ---------------------------------------------------------------------------
--  Trên cloud cột này bị đổi thành `now() AT TIME ZONE 'Asia/Ho_Chi_Minh'`.
--  Động cơ dễ hiểu — để bảng trên Dashboard Supabase hiện giờ VN — nhưng cơ chế
--  thì sai: biểu thức đó trả `timestamp` KHÔNG mang múi giờ (giờ VN trần), gán
--  vào cột `timestamptz` thì Postgres hiểu là UTC ⇒ **lưu sớm hơn thực tế 7
--  tiếng**.
--
--  Hai tầng trình bày đều tự quy đổi sang giờ VN — `formatVietnamDateTime()`
--  của trang Admin và `vietnamDatePart()` của thẻ ảnh — nên lệch đó bị cộng
--  thêm một lần nữa thành **14 tiếng**, đủ để tấm ảnh gửi cấp trên in SAI NGÀY.
--
--  Cách đúng để xem giờ VN là quy đổi ở TẦNG HIỂN THỊ, không phải bóp méo giá
--  trị lúc lưu. Cột `timestamptz` phải luôn giữ đúng một điểm trên trục thời
--  gian; méo nó là méo mọi phép tính về sau.

alter table public.amis_employee_metrics
  alter column synced_at set default now();

create or replace view public.amis_reconciliation as
with monthly as (
  select
    r.sales_id,
    date_trunc('month', r.report_date::timestamptz)::date  as period_month,
    sum(coalesce(r.actual_revenue, 0))                     as reported_revenue,
    sum(coalesce(r.actual_customer_visits, 0))             as reported_customer_visits,
    sum(coalesce(r.actual_sales_quantity, 0))              as reported_sales_quantity,
    count(*)                                               as completed_days
  from public.daily_reports r
  where r.status = 'COMPLETED'
  group by r.sales_id, date_trunc('month', r.report_date::timestamptz)::date
),
reported as (
  select
    m.sales_id, p.full_name, p.employee_code, p.amis_employee_name,
    m.period_month, m.reported_revenue, m.reported_customer_visits,
    m.reported_sales_quantity, m.completed_days
  from monthly m
  join public.profiles p on p.id = m.sales_id
)
select
  r.sales_id,
  coalesce(r.full_name, a.employee_name)   as full_name,
  r.employee_code,
  coalesce(r.period_month, a.period_month)  as period_month,
  coalesce(r.completed_days, 0)             as completed_days,

  r.reported_revenue,
  coalesce(a.net_sales, a.current_amount)   as amis_revenue,
  case
    when r.reported_revenue is null or coalesce(a.net_sales, a.current_amount) is null then null
    else r.reported_revenue - coalesce(a.net_sales, a.current_amount)
  end                                       as revenue_diff,

  r.reported_customer_visits,
  a.qty_account_interactive                 as amis_customer_visits,
  case
    when r.reported_customer_visits is null or a.qty_account_interactive is null then null
    else r.reported_customer_visits - a.qty_account_interactive
  end                                       as customer_visits_diff,

  r.reported_sales_quantity,
  a.no_of_orders                            as amis_orders,
  case
    when r.reported_sales_quantity is null or a.no_of_orders is null then null
    else r.reported_sales_quantity - a.no_of_orders
  end                                       as orders_diff,

  a.receive_amount                          as amis_receivable,
  a.target_amount                           as amis_target,
  a.current_amount                          as amis_current,
  a.synced_at,

  (r.sales_id is null)                      as amis_only,
  (a.employee_name is null)                 as bikeforce_only
from reported r
full join public.amis_employee_metrics a
  on a.employee_name = r.amis_employee_name
 and a.period_month  = r.period_month;

-- `security_invoker` phải đặt LẠI sau `create or replace`: thiếu nó thì view
-- chạy bằng quyền chủ sở hữu và mọi Sales đọc được báo cáo của nhau — vỡ BR-003.
alter view public.amis_reconciliation set (security_invoker = on);
