-- =============================================================================
-- BikeForce 0004 — Row Level Security policies
-- Phase 2 — Database & Auth.
-- Nguồn thiết kế: docs/02-database-design.md §7.4, §8 · docs/06-auth-permissions.md §6
-- RLS là biên giới bảo mật thật sự (DEC-004, NFR-004).
--
-- `enable row level security` + `force row level security` đã được bật trong
-- chính migration tạo bảng (0001, 0002) — xem GHI CHÚ VỀ THỨ TỰ FILE ở 0001.
-- File này CHỈ thêm policy, vì policy phụ thuộc các hàm của 0003.
--
-- Mọi policy đều `to authenticated`: role `anon` không có bất kỳ đường nào chạm
-- vào hai bảng này.
-- Mọi lời gọi hàm đều bọc `(select ...)` để Postgres nâng thành InitPlan —
-- đánh giá MỘT lần cho cả câu lệnh thay vì một lần mỗi dòng (DEC-006, ISSUE-005).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create policy profiles_select_self_or_admin
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
  );

create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using      (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_update_admin
  on public.profiles
  for update
  to authenticated
  using      ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Cố ý KHÔNG có policy INSERT: profile chỉ sinh ra từ trigger handle_new_user()
-- hoặc từ service role. Cố ý KHÔNG có policy DELETE (BR-013).

-- ----------------------------------------------------------------------------
-- daily_reports
-- ----------------------------------------------------------------------------
create policy reports_select_own_or_admin
  on public.daily_reports
  for select
  to authenticated
  using (
    sales_id = (select auth.uid())
    or (select public.is_admin())
  );

create policy reports_insert_own_today
  on public.daily_reports
  for insert
  to authenticated
  with check (
    sales_id    = (select auth.uid())
    and (select public.is_active_sales())
    and report_date = (select public.vn_today())
    and status  = 'MORNING_SUBMITTED'
  );

-- CƠ CHẾ TỰ KHOÁ (BR-019, OQ-04 phương án (a)):
-- USING đánh giá trên dòng CŨ, WITH CHECK trên dòng MỚI. Vì vậy policy này cho
-- phép ĐÚNG MỘT lần chuyển MORNING_SUBMITTED -> COMPLETED. Sau khi đã COMPLETED,
-- mọi UPDATE tiếp theo có OLD.status = 'COMPLETED' nên USING không khớp và câu
-- lệnh trả về 0 rows affected — báo cáo tự khoá vĩnh viễn.
create policy reports_update_own_open
  on public.daily_reports
  for update
  to authenticated
  using (
    sales_id = (select auth.uid())
    and (select public.is_active_sales())
    and status = 'MORNING_SUBMITTED'
  )
  with check (sales_id = (select auth.uid()));

-- Cố ý KHÔNG có policy DELETE (BR-013), và cũng KHÔNG có UPDATE cho Admin
-- (BR-020, APPROVED theo OQ-05: Admin KHÔNG sửa số liệu báo cáo).
