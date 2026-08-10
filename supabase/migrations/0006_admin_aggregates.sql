-- ============================================================================
-- 0006 — Hàm tổng hợp cho màn hình Admin (PHASE 8, PHASE 9, PHASE 10)
--
-- Nguồn: docs/01 §12.1 (12 chỉ số bắt buộc của Master Spec §16) · FR-024,
--        FR-028, FR-029, FR-033 · UC-12, UC-15, UC-16, UC-20 · AF-01, AF-02,
--        AF-05, AF-06.
--
-- ----------------------------------------------------------------------------
--  VÌ SAO LÀ HÀM SQL CHỨ KHÔNG PHẢI TRUY VẤN TỪ NODE
-- ----------------------------------------------------------------------------
--  AGENTS.md §5: "Aggregate cho Admin (AF-05, AF-06) làm bằng SQL/RPC, không
--  kéo hàng nghìn row về Node để cộng." Một tháng của 20 Sales là ~600 dòng,
--  một năm là ~7.000 — kéo về rồi `reduce()` là vừa chậm vừa tốn băng thông của
--  hạn mức Supabase Free (NFR-013), và vi phạm thẳng NFR-002.
--
-- ----------------------------------------------------------------------------
--  VÌ SAO `security invoker` CHỨ KHÔNG PHẢI `security definer`
-- ----------------------------------------------------------------------------
--  `security definer` sẽ CHẠY VƯỢT RLS — đúng thứ DEC-004 cấm. Với
--  `security invoker`, mọi câu `select` bên trong vẫn đi qua policy
--  `reports_select_own_or_admin` và `profiles_select_self_or_admin`, nên hàm
--  không thể trở thành một cửa hậu đọc dữ liệu người khác.
--
--  Ngoại lệ đã có sẵn là `is_admin()` (DEC-006) — nó BẮT BUỘC phải
--  `security definer` để policy trên `profiles` không tự đệ quy. Ở đây gọi nó
--  dạng `(select public.is_admin())` để Postgres nâng thành InitPlan và đánh
--  giá một lần cho cả câu lệnh, không phải mỗi dòng (ISSUE-005).
--
--  Thêm một lớp nữa: hàm tự trả **0 / rỗng** cho người gọi không phải Admin.
--  RLS đã đủ để chặn rò dữ liệu (Sales chỉ thấy dòng của chính mình), nhưng một
--  bảng đếm "1 Sales active" trả về cho Sales là câu trả lời vô nghĩa — thà
--  không trả gì.
--
--  KHÔNG cấp execute cho `anon`: mọi hàm ở đây chỉ dành cho phiên đã đăng nhập.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- admin_today_overview(p_date) — 12 chỉ số bắt buộc, UC-12 / FR-024 / AF-01
--
-- Bốn con số đếm và tám con số cộng, trong MỘT lượt quét. Cố ý KHÔNG trả về
-- phần trăm nào: BR-011 + DEC-007 cấm persist `%`, và `lib/kpi.ts` là nguồn duy
-- nhất của công thức. Hàm này chỉ trả SỐ THÔ.
--
-- `p_date` do tầng gọi truyền vào từ `getVietnamToday()` — hàm KHÔNG tự đọc
-- `vn_today()`, đúng QUY TẮC 3 của docs/07: chỉ một nơi quyết định "hôm nay".
-- ----------------------------------------------------------------------------
create or replace function public.admin_today_overview(p_date date)
returns table (
  active_sales_count        integer,
  morning_submitted_count   integer,
  completed_count           integer,
  no_report_count           integer,
  target_visit_points       bigint,
  actual_visit_points       bigint,
  target_sales_quantity     bigint,
  actual_sales_quantity     bigint,
  target_revenue            bigint,
  actual_revenue            bigint,
  target_customer_visits    bigint,
  actual_customer_visits    bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with guard as (
    -- InitPlan: đánh giá MỘT lần cho cả câu lệnh (ISSUE-005, DEC-006).
    select (select public.is_admin()) as ok
  ),
  active_sales as (
    select p.id
    from public.profiles p, guard g
    where g.ok
      and p.role = 'SALES'
      and p.is_active
  ),
  -- Chỉ tính báo cáo của Sales ĐANG hoạt động: một người đã nghỉ việc không
  -- được kéo tổng của cả đội xuống, và cũng không được đếm vào mẫu số.
  today as (
    select r.status,
           r.target_visit_points,    r.actual_visit_points,
           r.target_sales_quantity,  r.actual_sales_quantity,
           r.target_revenue,         r.actual_revenue,
           r.target_customer_visits, r.actual_customer_visits
    from public.daily_reports r
    join active_sales a on a.id = r.sales_id
    where r.report_date = p_date
  )
  select
    (select count(*) from active_sales)::integer,
    -- "Đã báo cáo sáng" = ĐÃ CÓ dòng hôm nay, gồm cả người đã hoàn tất: ai đã
    -- COMPLETED thì đương nhiên đã cam kết sáng (BR-008 — không nhảy bước).
    (select count(*) from today)::integer,
    (select count(*) from today where status = 'COMPLETED')::integer,
    -- "Chưa báo cáo" = active trừ đi số người đã có dòng. Tính bằng phép trừ
    -- thay vì một anti-join thứ hai: hai con số trên đã quét đúng tập đó rồi.
    ((select count(*) from active_sales) - (select count(*) from today))::integer,
    -- `coalesce` để tập rỗng cho 0 chứ không cho `null` — giao diện không bao
    -- giờ được nhận `null` ở ô số (BR-015 tinh thần: không NaN, không trống).
    coalesce((select sum(target_visit_points)    from today), 0)::bigint,
    coalesce((select sum(actual_visit_points)    from today), 0)::bigint,
    coalesce((select sum(target_sales_quantity)  from today), 0)::bigint,
    coalesce((select sum(actual_sales_quantity)  from today), 0)::bigint,
    coalesce((select sum(target_revenue)         from today), 0)::bigint,
    coalesce((select sum(actual_revenue)         from today), 0)::bigint,
    coalesce((select sum(target_customer_visits) from today), 0)::bigint,
    coalesce((select sum(actual_customer_visits) from today), 0)::bigint;
$$;

-- ----------------------------------------------------------------------------
-- admin_missing_report_alerts(p_date) — UC-20 / FR-033 / AF-02
--
-- Hai nhóm cảnh báo trong MỘT lượt gọi:
--   NO_REPORT     — Sales active chưa có dòng nào cho ngày đó (anti-join).
--   NOT_COMPLETED — đã cam kết sáng nhưng chưa hoàn tất cuối ngày.
--
-- ⚠ Cảnh báo này KHÔNG phân biệt người nghỉ phép — v1 không có khái niệm ngày
-- nghỉ (OQ-08 đã trả lời "không", DEC-030, ISSUE-006 CLOSED).
-- ----------------------------------------------------------------------------
create or replace function public.admin_missing_report_alerts(p_date date)
returns table (
  id            uuid,
  full_name     text,
  employee_code text,
  alert_kind    text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with guard as (
    select (select public.is_admin()) as ok
  ),
  active_sales as (
    select p.id, p.full_name, p.employee_code
    from public.profiles p, guard g
    where g.ok
      and p.role = 'SALES'
      and p.is_active
  ),
  today as (
    select r.sales_id, r.status
    from public.daily_reports r
    where r.report_date = p_date
  )
  select a.id,
         a.full_name,
         a.employee_code::text,
         case
           when t.sales_id is null then 'NO_REPORT'
           else 'NOT_COMPLETED'
         end as alert_kind
  from active_sales a
  left join today t on t.sales_id = a.id
  where t.sales_id is null
     or t.status <> 'COMPLETED'
  -- Nhóm "chưa báo cáo gì" đứng trước: đó là nhóm cần nhắc gấp hơn.
  order by (t.sales_id is not null), a.full_name;
$$;

-- ----------------------------------------------------------------------------
-- admin_monthly_summary(p_from, p_to) — UC-15 / FR-028 / AF-05 (PHASE 9)
--
-- Tổng target vs actual cho CẢ BỐN chỉ tiêu trong một khoảng ngày, cộng số báo
-- cáo và số Sales có mặt. Khoảng ngày do tầng gọi truyền vào từ
-- `getVietnamMonthRange()` — hàm không tự dựng ngày.
--
-- Chỉ tính báo cáo đã `COMPLETED`: một tháng đang dở không được cộng cam kết
-- sáng của hôm nay vào cột "thực đạt" rồi báo là chưa đạt.
-- ----------------------------------------------------------------------------
create or replace function public.admin_monthly_summary(p_from date, p_to date)
returns table (
  report_count            integer,
  sales_count             integer,
  target_visit_points     bigint,
  actual_visit_points     bigint,
  target_sales_quantity   bigint,
  actual_sales_quantity   bigint,
  target_revenue          bigint,
  actual_revenue          bigint,
  target_customer_visits  bigint,
  actual_customer_visits  bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with guard as (
    select (select public.is_admin()) as ok
  ),
  rows_in_range as (
    select r.sales_id,
           r.target_visit_points,    r.actual_visit_points,
           r.target_sales_quantity,  r.actual_sales_quantity,
           r.target_revenue,         r.actual_revenue,
           r.target_customer_visits, r.actual_customer_visits
    from public.daily_reports r, guard g
    where g.ok
      and r.report_date between p_from and p_to
      and r.status = 'COMPLETED'
  )
  select
    (select count(*)                  from rows_in_range)::integer,
    (select count(distinct sales_id)  from rows_in_range)::integer,
    coalesce((select sum(target_visit_points)    from rows_in_range), 0)::bigint,
    coalesce((select sum(actual_visit_points)    from rows_in_range), 0)::bigint,
    coalesce((select sum(target_sales_quantity)  from rows_in_range), 0)::bigint,
    coalesce((select sum(actual_sales_quantity)  from rows_in_range), 0)::bigint,
    coalesce((select sum(target_revenue)         from rows_in_range), 0)::bigint,
    coalesce((select sum(actual_revenue)         from rows_in_range), 0)::bigint,
    coalesce((select sum(target_customer_visits) from rows_in_range), 0)::bigint,
    coalesce((select sum(actual_customer_visits) from rows_in_range), 0)::bigint;
$$;

-- ----------------------------------------------------------------------------
-- admin_sales_performance(p_from, p_to) — UC-16 / FR-029 / AF-06 (PHASE 10)
--
-- Một dòng cho mỗi Sales: tổng bốn chỉ tiêu, số báo cáo đã hoàn tất, và **số
-- ngày đạt KPI** theo BR-024 (đạt CẢ BỐN chỉ tiêu ≥ 100%).
--
-- BR-015 được cài đúng ngay trong SQL: `target = 0` thì chỉ tiêu đó coi là đạt
-- (`actual = 0` → 100%; `actual > 0` → vượt kế hoạch). Không có phép chia nào
-- cho 0 ở đây, nên không có đường nào sinh `NaN` / `Infinity`.
--
-- Cố ý KHÔNG trả `%` trung bình: phần trăm là việc của `lib/kpi.ts` (BR-011).
-- Tầng trên tự tính từ cặp tổng target/actual.
-- ----------------------------------------------------------------------------
create or replace function public.admin_sales_performance(p_from date, p_to date)
returns table (
  sales_id                uuid,
  full_name               text,
  employee_code           text,
  is_active               boolean,
  report_count            integer,
  kpi_achieved_days       integer,
  target_visit_points     bigint,
  actual_visit_points     bigint,
  target_sales_quantity   bigint,
  actual_sales_quantity   bigint,
  target_revenue          bigint,
  actual_revenue          bigint,
  target_customer_visits  bigint,
  actual_customer_visits  bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with guard as (
    select (select public.is_admin()) as ok
  ),
  sales_people as (
    select p.id, p.full_name, p.employee_code, p.is_active
    from public.profiles p, guard g
    where g.ok
      and p.role = 'SALES'
  ),
  completed as (
    select r.*
    from public.daily_reports r
    where r.report_date between p_from and p_to
      and r.status = 'COMPLETED'
  )
  select
    s.id,
    s.full_name,
    s.employee_code::text,
    s.is_active,
    count(c.id)::integer,
    -- BR-024: cả 4 chỉ tiêu ≥ 100%. `target = 0` luôn coi là đạt (BR-015) nên
    -- điều kiện viết dạng "target = 0 OR actual >= target" — không chia.
    count(c.id) filter (
      where c.actual_visit_points    >= c.target_visit_points
        and c.actual_sales_quantity  >= c.target_sales_quantity
        and c.actual_revenue         >= c.target_revenue
        and c.actual_customer_visits >= c.target_customer_visits
    )::integer,
    coalesce(sum(c.target_visit_points),    0)::bigint,
    coalesce(sum(c.actual_visit_points),    0)::bigint,
    coalesce(sum(c.target_sales_quantity),  0)::bigint,
    coalesce(sum(c.actual_sales_quantity),  0)::bigint,
    coalesce(sum(c.target_revenue),         0)::bigint,
    coalesce(sum(c.actual_revenue),         0)::bigint,
    coalesce(sum(c.target_customer_visits), 0)::bigint,
    coalesce(sum(c.actual_customer_visits), 0)::bigint
  from sales_people s
  left join completed c on c.sales_id = s.id
  group by s.id, s.full_name, s.employee_code, s.is_active
  order by s.is_active desc, s.full_name;
$$;

-- ----------------------------------------------------------------------------
-- GRANT — chỉ `authenticated`. `anon` KHÔNG được gọi hàm nào ở đây.
-- `security invoker` nên RLS vẫn là hàng rào thật; guard `is_admin()` bên trong
-- là lớp thứ hai.
-- ----------------------------------------------------------------------------
revoke execute on function public.admin_today_overview(date)          from public;
revoke execute on function public.admin_missing_report_alerts(date)   from public;
revoke execute on function public.admin_monthly_summary(date, date)   from public;
revoke execute on function public.admin_sales_performance(date, date) from public;

grant execute on function public.admin_today_overview(date)          to authenticated;
grant execute on function public.admin_missing_report_alerts(date)   to authenticated;
grant execute on function public.admin_monthly_summary(date, date)   to authenticated;
grant execute on function public.admin_sales_performance(date, date) to authenticated;
