-- ============================================================================
-- 0008 — Đổi nghĩa "Doanh số" thành TIỀN + sàn 10 cho mục tiêu điểm viếng thăm
--        + ngừng dùng "Mục đích chuyến đi"  (PHASE 13)
--
-- Nguồn: OQ-19 (đã trả lời 2026-08-10) · DEC-048 · DEC-049 · DEC-050 ·
--        BR-006 (sửa) · BR-026 (mới) · PROJECT_CHECKLIST.md § Phase 13c.
--
-- ----------------------------------------------------------------------------
--  BA THAY ĐỔI, VÀ VÌ SAO KHÔNG CÁI NÀO ĐƯỢC PHÉP XOÁ DỮ LIỆU
-- ----------------------------------------------------------------------------
--  BR-013 cấm xoá dữ liệu báo cáo dưới mọi hình thức, và AGENTS.md §13 quy định
--  migration CHỈ TIẾN TỚI. Vì vậy không có `drop column` nào trong file này:
--  ba cột mang nghĩa cũ được GIỮ NGUYÊN và chuyển sang trạng thái "di sản, không
--  còn ghi mới". Chúng vẫn đọc được bằng SQL nếu sau này cần đối chiếu lịch sử.
--
--  1. DEC-050 — "Doanh số" từ SỐ LƯỢNG XE (integer) thành SỐ TIỀN (bigint VND).
--     Cố ý KHÔNG `alter column ... type bigint` trên cột cũ: làm vậy thì con số
--     `50` (nghĩa cũ: 50 xe) lập tức bị mọi màn hình đọc thành `50 ₫` — sai dữ
--     liệu, mà lại không thể phân biệt được với một báo cáo mới ghi đúng 50 ₫.
--     Thay vào đó thêm CẶP CỘT MỚI, và các dòng có trước migration mang `null`
--     ở cột mới — đúng phương án người dùng đã chọn cho OQ-19c.
--
--  2. DEC-049 — mục tiêu điểm viếng thăm có SÀN 10 (BR-026). Trần 1.000 giữ
--     nguyên: bỏ trần thì một lần gõ thừa số 0 sẽ vào thẳng database và làm lệch
--     mọi phép tổng hợp của Admin. Chỉ áp cho `target_*`; `actual_*` vẫn từ 0 vì
--     đi được ít điểm hơn cam kết là kết quả thật, không phải dữ liệu sai.
--
--  3. DEC-048 — `visit_purpose` ngừng được ghi và ngừng hiển thị. Cột ở lại
--     nguyên vẹn kèm dữ liệu đã nhập (BR-013).
--
-- ----------------------------------------------------------------------------
--  VÌ SAO DÙNG `not valid` CHO BA CONSTRAINT BÊN DƯỚI
-- ----------------------------------------------------------------------------
--  Các dòng có sẵn không thoả điều kiện mới (chúng mang `null` ở cột mới, và có
--  thể có `target_visit_points < 10`). `not valid` là cơ chế chuẩn của Postgres
--  cho đúng tình huống này: KHÔNG kiểm dòng cũ, nhưng ÉP ĐỦ với mọi `insert` và
--  mọi `update` từ nay về sau. Đây không phải một constraint bị tắt.
--
--  Cố ý KHÔNG chạy `validate constraint` sau đó — làm vậy sẽ đỏ ngay, vì dòng cũ
--  vốn dĩ không thể thoả. Đó là ý muốn, không phải thiếu sót.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Cặp cột mới cho "Doanh số" — tiền VND nguyên (BR-010), cùng trần với
--    doanh thu để hai ô tiền trên cùng một form không có hai giới hạn khác nhau.
-- ----------------------------------------------------------------------------
alter table public.daily_reports
  add column target_sales_amount bigint,
  add column actual_sales_amount bigint;

alter table public.daily_reports
  add constraint ck_target_sales_amount
    check (target_sales_amount is null
           or target_sales_amount between 0 and 100000000000),
  add constraint ck_actual_sales_amount
    check (actual_sales_amount is null
           or actual_sales_amount between 0 and 100000000000);

-- Cam kết sáng BẮT BUỘC có doanh số tiền — tương đương `not null` nhưng tha cho
-- các dòng có trước migration (xem phần giải thích `not valid` ở đầu file).
alter table public.daily_reports
  add constraint ck_target_sales_amount_required
    check (target_sales_amount is not null) not valid;

-- ----------------------------------------------------------------------------
-- 2. Cột số lượng xe trở thành DI SẢN: không còn được ghi, nên không còn được
--    phép là `not null`. Dữ liệu cũ ở lại nguyên vẹn.
-- ----------------------------------------------------------------------------
alter table public.daily_reports
  alter column target_sales_quantity drop not null;

comment on column public.daily_reports.target_sales_quantity is
  'DI SẢN (DEC-050, 2026-08-10). Nghĩa CŨ: số lượng xe cam kết bán trong ngày. Không còn được ghi từ Phase 13. Chỉ tiêu "Doanh số" nay đọc từ target_sales_amount (VND).';
comment on column public.daily_reports.actual_sales_quantity is
  'DI SẢN (DEC-050, 2026-08-10). Nghĩa CŨ: số lượng xe thực bán. Không còn được ghi từ Phase 13. Xem actual_sales_amount.';
comment on column public.daily_reports.visit_purpose is
  'DI SẢN (DEC-048, 2026-08-10). Không còn được ghi và không còn hiển thị ở bất kỳ màn hình nào. Giữ cột để không xoá dữ liệu đã nhập (BR-013).';
comment on column public.daily_reports.target_sales_amount is
  'BR-006 (sửa bởi DEC-050) + BR-010. Doanh số bán hàng cam kết trong ngày, VND dạng số nguyên. `null` chỉ ở các dòng có trước 2026-08-10.';
comment on column public.daily_reports.target_revenue is
  'BR-010. VND dạng số nguyên. Nghĩa từ Phase 13 (DEC-050): doanh thu CÔNG NỢ khách hàng THU HỒI ĐƯỢC trong ngày. Các dòng trước 2026-08-10 mang nghĩa cũ "giá trị đơn hàng chốt trong ngày".';

-- ----------------------------------------------------------------------------
-- 3. `COMPLETED` nay đòi `actual_sales_amount` thay cho `actual_sales_quantity`.
--    Bốn điều kiện còn lại giữ nguyên nguyên văn 0002.
-- ----------------------------------------------------------------------------
alter table public.daily_reports
  drop constraint ck_completed_requires_actuals;

alter table public.daily_reports
  add constraint ck_completed_requires_actuals
    check (
      status <> 'COMPLETED'
      or (
            actual_visit_points    is not null
        and actual_sales_amount    is not null
        and actual_revenue         is not null
        and actual_customer_visits is not null
        and evening_submitted_at   is not null
      )
    ) not valid;

-- ----------------------------------------------------------------------------
-- 4. BR-026 — sàn 10 cho MỤC TIÊU điểm viếng thăm. Trần 1.000 giữ nguyên.
-- ----------------------------------------------------------------------------
alter table public.daily_reports
  drop constraint ck_target_visit_points;

alter table public.daily_reports
  add constraint ck_target_visit_points
    check (target_visit_points between 10 and 1000) not valid;

-- ============================================================================
--  5. NĂM HÀM TỔNG HỢP CỦA ADMIN — dựng lại theo cột mới
--
--  Bắt buộc `drop` rồi `create` chứ không `create or replace`: Postgres từ chối
--  đổi TÊN cột trong `returns table (...)` của một hàm đang tồn tại
--  ("cannot change name of input parameter"). Đã kiểm chứng — đây là lý do kỹ
--  thuật, không phải lựa chọn phong cách.
--
--  Mọi thứ khác giữ nguyên chủ ý của 0006/0007 và KHÔNG được đổi:
--    • `security invoker` — `definer` sẽ chạy vượt RLS, đúng thứ DEC-004 cấm.
--    • guard `(select public.is_admin())` dạng InitPlan — ISSUE-005, DEC-006.
--    • chỉ `authenticated` được execute, `anon` KHÔNG.
--    • không trả `%` nào — BR-011, `lib/kpi.ts` là nguồn duy nhất của công thức.
--
--  ⚠ HỆ QUẢ ĐÃ LƯỜNG TRƯỚC của `kpi_achieved_days`: các báo cáo có trước
--  2026-08-10 mang `null` ở `actual_sales_amount`, nên phép so sánh cho `null`
--  và dòng đó KHÔNG được đếm là ngày đạt KPI. Đúng chủ ý: một ngày cũ được chấm
--  theo bộ chỉ tiêu cũ thì không thể tuyên bố là đạt theo bộ chỉ tiêu mới.
-- ============================================================================

drop function if exists public.admin_today_overview(date);
drop function if exists public.admin_monthly_summary(date, date);
drop function if exists public.admin_sales_performance(date, date);
drop function if exists public.admin_daily_trend(date, date);

-- ----------------------------------------------------------------------------
-- admin_today_overview(p_date) — 12 chỉ số bắt buộc, UC-12 / FR-024 / AF-01
-- ----------------------------------------------------------------------------
create function public.admin_today_overview(p_date date)
returns table (
  active_sales_count        integer,
  morning_submitted_count   integer,
  completed_count           integer,
  no_report_count           integer,
  target_visit_points       bigint,
  actual_visit_points       bigint,
  target_sales_amount       bigint,
  actual_sales_amount       bigint,
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
    select (select public.is_admin()) as ok
  ),
  active_sales as (
    select p.id
    from public.profiles p, guard g
    where g.ok
      and p.role = 'SALES'
      and p.is_active
  ),
  today as (
    select r.status,
           r.target_visit_points,    r.actual_visit_points,
           r.target_sales_amount,    r.actual_sales_amount,
           r.target_revenue,         r.actual_revenue,
           r.target_customer_visits, r.actual_customer_visits
    from public.daily_reports r
    join active_sales a on a.id = r.sales_id
    where r.report_date = p_date
  )
  select
    (select count(*) from active_sales)::integer,
    (select count(*) from today)::integer,
    (select count(*) from today where status = 'COMPLETED')::integer,
    ((select count(*) from active_sales) - (select count(*) from today))::integer,
    coalesce((select sum(target_visit_points)    from today), 0)::bigint,
    coalesce((select sum(actual_visit_points)    from today), 0)::bigint,
    coalesce((select sum(target_sales_amount)    from today), 0)::bigint,
    coalesce((select sum(actual_sales_amount)    from today), 0)::bigint,
    coalesce((select sum(target_revenue)         from today), 0)::bigint,
    coalesce((select sum(actual_revenue)         from today), 0)::bigint,
    coalesce((select sum(target_customer_visits) from today), 0)::bigint,
    coalesce((select sum(actual_customer_visits) from today), 0)::bigint;
$$;

-- ----------------------------------------------------------------------------
-- admin_monthly_summary(p_from, p_to) — UC-15 / FR-028 / AF-05
-- ----------------------------------------------------------------------------
create function public.admin_monthly_summary(p_from date, p_to date)
returns table (
  report_count            integer,
  sales_count             integer,
  target_visit_points     bigint,
  actual_visit_points     bigint,
  target_sales_amount     bigint,
  actual_sales_amount     bigint,
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
           r.target_sales_amount,    r.actual_sales_amount,
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
    coalesce((select sum(target_sales_amount)    from rows_in_range), 0)::bigint,
    coalesce((select sum(actual_sales_amount)    from rows_in_range), 0)::bigint,
    coalesce((select sum(target_revenue)         from rows_in_range), 0)::bigint,
    coalesce((select sum(actual_revenue)         from rows_in_range), 0)::bigint,
    coalesce((select sum(target_customer_visits) from rows_in_range), 0)::bigint,
    coalesce((select sum(actual_customer_visits) from rows_in_range), 0)::bigint;
$$;

-- ----------------------------------------------------------------------------
-- admin_sales_performance(p_from, p_to) — UC-16 / FR-029 / AF-06
-- ----------------------------------------------------------------------------
create function public.admin_sales_performance(p_from date, p_to date)
returns table (
  sales_id                uuid,
  full_name               text,
  employee_code           text,
  is_active               boolean,
  report_count            integer,
  kpi_achieved_days       integer,
  target_visit_points     bigint,
  actual_visit_points     bigint,
  target_sales_amount     bigint,
  actual_sales_amount     bigint,
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
    -- điều kiện viết dạng "actual >= target" — không có phép chia nào.
    count(c.id) filter (
      where c.actual_visit_points    >= c.target_visit_points
        and c.actual_sales_amount    >= c.target_sales_amount
        and c.actual_revenue         >= c.target_revenue
        and c.actual_customer_visits >= c.target_customer_visits
    )::integer,
    coalesce(sum(c.target_visit_points),    0)::bigint,
    coalesce(sum(c.actual_visit_points),    0)::bigint,
    coalesce(sum(c.target_sales_amount),    0)::bigint,
    coalesce(sum(c.actual_sales_amount),    0)::bigint,
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
-- admin_daily_trend(p_from, p_to) — FR-037 / AF-08
-- ----------------------------------------------------------------------------
create function public.admin_daily_trend(p_from date, p_to date)
returns table (
  report_date             date,
  report_count            integer,
  target_visit_points     bigint,
  actual_visit_points     bigint,
  target_sales_amount     bigint,
  actual_sales_amount     bigint,
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
  )
  select
    r.report_date,
    count(*)::integer,
    coalesce(sum(r.target_visit_points),    0)::bigint,
    coalesce(sum(r.actual_visit_points),    0)::bigint,
    coalesce(sum(r.target_sales_amount),    0)::bigint,
    coalesce(sum(r.actual_sales_amount),    0)::bigint,
    coalesce(sum(r.target_revenue),         0)::bigint,
    coalesce(sum(r.actual_revenue),         0)::bigint,
    coalesce(sum(r.target_customer_visits), 0)::bigint,
    coalesce(sum(r.actual_customer_visits), 0)::bigint
  from public.daily_reports r, guard g
  where g.ok
    and r.report_date between p_from and p_to
    and r.status = 'COMPLETED'
  group by r.report_date
  order by r.report_date;
$$;

-- ----------------------------------------------------------------------------
-- GRANT — `drop function` cuốn theo mọi GRANT cũ, nên phải cấp lại ĐỦ.
-- `admin_missing_report_alerts` không đụng tới cột nào bị đổi nên không dựng lại.
-- ----------------------------------------------------------------------------
revoke execute on function public.admin_today_overview(date)          from public;
revoke execute on function public.admin_monthly_summary(date, date)   from public;
revoke execute on function public.admin_sales_performance(date, date) from public;
revoke execute on function public.admin_daily_trend(date, date)       from public;

grant execute on function public.admin_today_overview(date)          to authenticated;
grant execute on function public.admin_monthly_summary(date, date)   to authenticated;
grant execute on function public.admin_sales_performance(date, date) to authenticated;
grant execute on function public.admin_daily_trend(date, date)       to authenticated;

analyze public.daily_reports;
