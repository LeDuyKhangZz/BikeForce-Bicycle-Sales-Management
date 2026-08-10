-- ============================================================================
-- 0007 — Chuỗi số liệu theo NGÀY cho biểu đồ trend của Admin (PHASE 9)
--
-- Nguồn: FR-037, AF-08 · `docs/01 §12.2` · PROJECT_CHECKLIST.md § Phase 9
--        ("Biểu đồ trend theo ngày trong tháng — SHOULD, chỉ làm nếu không
--        phát sinh dependency nặng").
--
-- ----------------------------------------------------------------------------
--  VÌ SAO CẦN MỘT HÀM RIÊNG, KHÔNG DÙNG LẠI `admin_monthly_summary`
-- ----------------------------------------------------------------------------
--  Hàm 0006 cộng CẢ THÁNG thành đúng một dòng — đó là con số tổng của FR-028.
--  Biểu đồ trend hỏi một câu khác: "ngày nào trong tháng đội đạt, ngày nào
--  hụt". Tự tính điều đó ở Node thì phải kéo về toàn bộ báo cáo của tháng
--  (~600 dòng cho 20 Sales) rồi `reduce()` — đúng thứ NFR-002 và AGENTS.md §5
--  cấm. Gom theo ngày trong SQL trả về **tối đa 31 dòng**, mỗi dòng 10 số.
--
-- ----------------------------------------------------------------------------
--  VÌ SAO CHỈ TRẢ NGÀY CÓ SỐ LIỆU, KHÔNG `generate_series` CẢ THÁNG
-- ----------------------------------------------------------------------------
--  v1 KHÔNG có khái niệm ngày nghỉ (OQ-08 → "không", DEC-030, ISSUE-006
--  CLOSED). Nếu trả đủ 31 ngày thì Chủ nhật và ngày lễ hiện thành cột 0 sát
--  đáy — một biểu đồ nói dối rằng cả đội đã thất bại hôm đó, trong khi sự thật
--  là hôm đó không ai đi làm. Bỏ hẳn ngày không có báo cáo nào là cách trung
--  thực duy nhất mà không cần thêm khái niệm nghiệp vụ mới.
--
--  Hệ quả đã lường trước: trục X là **thứ tự các ngày CÓ số liệu**, không phải
--  một trục thời gian đều nhau. Nhãn trục ghi rõ ngày nên không gây hiểu nhầm,
--  và `docs/05 §15` mô tả đúng cách đọc.
--
-- ----------------------------------------------------------------------------
--  BẢO MẬT — giống hệt 0006, không có ngoại lệ nào mới
-- ----------------------------------------------------------------------------
--  `security invoker` để RLS vẫn là hàng rào thật (DEC-004); guard
--  `(select public.is_admin())` dạng InitPlan là lớp thứ hai (DEC-006,
--  ISSUE-005); chỉ `authenticated` được execute, `anon` không.
--
--  Chỉ cộng báo cáo `COMPLETED` — cùng lý do với `admin_monthly_summary`: cam
--  kết sáng của hôm nay chưa phải kết quả, cộng vào cột "thực đạt" là bịa số.
-- ============================================================================

create or replace function public.admin_daily_trend(p_from date, p_to date)
returns table (
  report_date             date,
  report_count            integer,
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
    -- InitPlan: đánh giá MỘT lần cho cả câu lệnh (ISSUE-005, DEC-006).
    select (select public.is_admin()) as ok
  )
  select
    r.report_date,
    count(*)::integer,
    -- `sum()` trên nhóm không rỗng không bao giờ cho `null`, nhưng `coalesce`
    -- vẫn giữ ở đây để kiểu trả về là một lời hứa chắc chắn với tầng TypeScript:
    -- ô số của giao diện không bao giờ nhận `null` (tinh thần BR-015).
    coalesce(sum(r.target_visit_points),    0)::bigint,
    coalesce(sum(r.actual_visit_points),    0)::bigint,
    coalesce(sum(r.target_sales_quantity),  0)::bigint,
    coalesce(sum(r.actual_sales_quantity),  0)::bigint,
    coalesce(sum(r.target_revenue),         0)::bigint,
    coalesce(sum(r.actual_revenue),         0)::bigint,
    coalesce(sum(r.target_customer_visits), 0)::bigint,
    coalesce(sum(r.actual_customer_visits), 0)::bigint
  from public.daily_reports r, guard g
  where g.ok
    and r.report_date between p_from and p_to
    and r.status = 'COMPLETED'
  group by r.report_date
  -- Trục thời gian đọc từ trái sang phải, cũ → mới.
  order by r.report_date;
$$;

-- ----------------------------------------------------------------------------
-- GRANT — chỉ `authenticated`, đúng như bốn hàm của 0006.
-- ----------------------------------------------------------------------------
revoke execute on function public.admin_daily_trend(date, date) from public;
grant  execute on function public.admin_daily_trend(date, date) to authenticated;
