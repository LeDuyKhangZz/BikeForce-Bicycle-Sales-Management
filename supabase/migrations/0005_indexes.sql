-- =============================================================================
-- BikeForce 0005 — index hiệu năng
-- Phase 2 — Database & Auth.
-- Nguồn thiết kế: docs/02-database-design.md §7.5, §10
-- NFR-002, NFR-015
--
-- Index toàn vẹn (uq_profiles_email, uq_profiles_employee_code,
-- uq_daily_reports_sales_date) đã nằm ở 0001/0002 cùng bảng — đó là ràng buộc,
-- không phải tối ưu hoá.
-- =============================================================================

-- Phục vụ: 12 chỉ số Admin dashboard (FR-024), alert AF-02, filter khoảng ngày
-- (FR-025), analytics tháng (FR-028). Cột dẫn đầu là report_date vì MỌI màn hình
-- Admin đều lọc theo ngày trước tiên; `desc` khớp `order by report_date desc`.
create index idx_daily_reports_date_status
  on public.daily_reports (report_date desc, status);

-- Phục vụ: lịch sử của một Sales có phân trang (FR-021), hiệu suất một Sales
-- (UC-16). GHI NHẬN TRUNG THỰC: index này CÓ THỂ dư thừa vì
-- uq_daily_reports_sales_date cũng là B-tree trên (sales_id, report_date) và
-- Postgres đọc ngược được. Phase 11 phải chạy EXPLAIN ANALYZE để xác minh;
-- nếu dư thừa thì drop bằng một migration mới. CHƯA ĐO — không được khẳng định.
create index idx_daily_reports_sales_date_desc
  on public.daily_reports (sales_id, report_date desc);

-- Phục vụ: đếm Sales active (chỉ số 1 dashboard), dropdown filter (UC-13),
-- bảng hiệu suất (UC-16), vế trái của anti-join alert AF-02.
-- GHI NHẬN: vì mệnh đề WHERE đã cố định role, cột dẫn đầu `role` gần như không
-- đóng góp — `(is_active) where role = 'SALES'` là đủ. Giữ đúng định nghĩa của
-- brief §9 và đưa quan sát này vào phần cần đo ở Phase 11.
create index idx_profiles_role_active
  on public.profiles (role, is_active)
  where role = 'SALES';

-- idx_profiles_full_name_trgm: HOÃN, không tạo ở v1.
-- Cần `create extension pg_trgm` + GIN index. Với <= 200 Sales thì `ilike` trên
-- vài trăm dòng nhanh hơn chi phí bảo trì index. Đã ghi ở docs/10-future-roadmap.md.
-- create extension if not exists pg_trgm;
-- create index idx_profiles_full_name_trgm
--   on public.profiles using gin (full_name gin_trgm_ops);

analyze public.profiles;
analyze public.daily_reports;
