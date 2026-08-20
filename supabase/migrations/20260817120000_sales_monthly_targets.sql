-- BikeForce — CHỈ TIÊU THÁNG DO ADMIN GIAO (DEC-071)
--
-- Vì sao cần bảng này:
--   Cụm "Tình trạng thực hiện" của thẻ ảnh lấy chỉ tiêu doanh thu bằng cách CỘNG
--   `daily_reports.target_revenue` của các ngày trong tháng. Con số đó là tổng
--   cam kết NGÀY của Sales, không phải chỉ tiêu THÁNG mà công ty giao — nên ảnh
--   in "200tr" trong khi bảng KPI của công ty ghi 640tr cho cùng một người.
--
--   Chỉ tiêu doanh số thì AMIS đã có (`amis_employee_metrics.target_amount`),
--   nhưng chỉ tiêu doanh thu công nợ thì AMIS KHÔNG biết. Đây là chỗ chứa nó.
--
-- Ai ghi: Admin. Bảng là chỗ đọc/ghi của module "Chỉ tiêu tháng" ở khu vực Admin
-- sẽ dựng sau — chính vì vậy policy ghi được viết sẵn ngay từ migration này.

create table public.sales_monthly_targets (
  -- Luôn là ngày 01 của tháng, khớp quy ước `period_month` của
  -- `amis_employee_metrics` để hai nguồn ghép được bằng cùng một khoá.
  period_month date not null,
  sales_id     uuid not null references public.profiles(id) on delete cascade,

  -- Cùng đơn vị với `daily_reports`: SỐ NGUYÊN VND (BR-010). Không lưu chuỗi đã
  -- format, không lưu `%`.
  target_sales_amount bigint,
  target_revenue      bigint,

  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),

  primary key (period_month, sales_id),

  constraint sales_monthly_targets_month_first_day
    check (extract(day from period_month) = 1),
  constraint sales_monthly_targets_sales_amount_nonneg
    check (target_sales_amount is null or target_sales_amount >= 0),
  constraint sales_monthly_targets_revenue_nonneg
    check (target_revenue is null or target_revenue >= 0)
);

comment on table public.sales_monthly_targets is
  'Chỉ tiêu THÁNG do Admin giao cho từng Sales. Khác với target_* của daily_reports (Sales tự cam kết theo ngày).';
comment on column public.sales_monthly_targets.target_sales_amount is
  'Chỉ tiêu doanh số tháng (VND). NULL ⇒ thẻ ảnh dùng lại target_amount của AMIS.';
comment on column public.sales_monthly_targets.target_revenue is
  'Chỉ tiêu doanh thu công nợ tháng (VND). NULL ⇒ thẻ ảnh cộng target_revenue của các báo cáo ngày như trước.';

-- Cùng khuôn với `profiles`/`daily_reports`: deny-by-default ở tầng GRANT,
-- rồi RLS mới quyết định từng dòng.
alter table public.sales_monthly_targets enable row level security;

revoke all on table public.sales_monthly_targets from anon;
revoke all on table public.sales_monthly_targets from authenticated;
grant  select, insert, update, delete on table public.sales_monthly_targets to authenticated;

-- Sales đọc được chỉ tiêu CỦA MÌNH (thẻ ảnh cần), Admin đọc tất cả (BR-003/BR-022).
create policy monthly_targets_select_own_or_admin
  on public.sales_monthly_targets
  for select
  to authenticated
  using (
    sales_id = (select auth.uid())
    or (select public.is_admin())
  );

-- Ghi thì CHỈ Admin. Sales không tự đặt chỉ tiêu tháng cho mình được (DEC-030 nói
-- Sales tự cam kết theo NGÀY; chỉ tiêu THÁNG là của công ty giao).
create policy monthly_targets_insert_admin
  on public.sales_monthly_targets
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy monthly_targets_update_admin
  on public.sales_monthly_targets
  for update
  to authenticated
  using      ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy monthly_targets_delete_admin
  on public.sales_monthly_targets
  for delete
  to authenticated
  using ((select public.is_admin()));

-- `updated_at` tự cập nhật, dùng lại trigger có sẵn của 0003.
create trigger trg_sales_monthly_targets_set_updated_at
  before update on public.sales_monthly_targets
  for each row execute function public.set_updated_at();

create index sales_monthly_targets_period_idx
  on public.sales_monthly_targets (period_month desc);
