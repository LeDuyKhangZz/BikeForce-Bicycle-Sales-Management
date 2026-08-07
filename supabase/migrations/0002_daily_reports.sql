-- =============================================================================
-- BikeForce 0002 — public.daily_reports
-- Phase 2 — Database & Auth.
-- Nguồn thiết kế: docs/02-database-design.md §6, §7.2
-- Business rule: BR-001, BR-006, BR-007, BR-008, BR-010, BR-013, BR-016,
--                BR-017, BR-018
--
-- Xem GHI CHÚ VỀ THỨ TỰ FILE ở `0001_init_enums_profiles.sql`: RLS được bật
-- trong chính file này, policy tường minh nằm ở `0004_rls_policies.sql`.
-- =============================================================================

create table public.daily_reports (
  id          uuid        primary key default gen_random_uuid(),
  sales_id    uuid        not null
                          references public.profiles (id) on delete restrict,
  report_date date        not null,
  status      public.report_status not null default 'MORNING_SUBMITTED',

  -- ---- Cam kết đầu ngày (UC-04, FR-008) --------------------------------------
  planned_route          text        not null,
  visit_purpose          text,                    -- DEC-029 (OQ-01)
  target_visit_points    integer     not null,    -- DEC-029 (OQ-01)
  target_sales_quantity  integer     not null,
  target_revenue         bigint      not null,    -- VND nguyên, BR-010
  target_customer_visits integer     not null,
  morning_submitted_at   timestamptz not null default now(),

  -- ---- Thực đạt cuối ngày (UC-06, FR-014) ------------------------------------
  actual_route           text,                    -- DEC-029 (OQ-02)
  actual_visit_points    integer,                 -- DEC-029 (OQ-02)
  actual_sales_quantity  integer,
  actual_revenue         bigint,                  -- VND nguyên
  actual_customer_visits integer,
  evening_note           text,
  evening_submitted_at   timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ---- BR-001: một Sales, một ngày, một báo cáo ------------------------------
  constraint uq_daily_reports_sales_date unique (sales_id, report_date),

  -- ---- BR-006 / BR-017: biên số học ------------------------------------------
  constraint ck_target_visit_points
    check (target_visit_points between 0 and 1000),
  constraint ck_target_sales_quantity
    check (target_sales_quantity between 0 and 10000),
  constraint ck_target_revenue
    check (target_revenue between 0 and 100000000000),
  constraint ck_target_customer_visits
    check (target_customer_visits between 0 and 1000),
  constraint ck_actual_visit_points
    check (actual_visit_points is null or actual_visit_points between 0 and 1000),
  constraint ck_actual_sales_quantity
    check (actual_sales_quantity is null or actual_sales_quantity between 0 and 10000),
  constraint ck_actual_revenue
    check (actual_revenue is null or actual_revenue between 0 and 100000000000),
  constraint ck_actual_customer_visits
    check (actual_customer_visits is null or actual_customer_visits between 0 and 1000),

  -- ---- BR-018 + giới hạn layout thẻ ảnh 9:16 ---------------------------------
  constraint ck_planned_route_len
    check (char_length(btrim(planned_route)) between 1 and 300),
  constraint ck_visit_purpose_len
    check (visit_purpose is null or char_length(visit_purpose) <= 300),
  constraint ck_actual_route_len
    check (actual_route is null or char_length(actual_route) <= 300),
  constraint ck_evening_note_len
    check (evening_note is null or char_length(evening_note) <= 1000),

  -- ---- BR-016: không báo cáo cho ngày tương lai ------------------------------
  -- now() là STABLE chứ không IMMUTABLE. Đã KIỂM CHỨNG THẬT trên Supabase local
  -- (Postgres 17.6): Postgres CHẤP NHẬN biểu thức này trong CHECK.
  -- An toàn ở đây vì điều kiện chỉ cấm tương lai: một dòng có report_date trong
  -- quá khứ sẽ mãi mãi tiếp tục thoả sau khi dump/restore.
  -- Cố ý KHÔNG gọi public.vn_today() vì hàm đó chỉ tồn tại từ 0003.
  -- CHECK mạnh hơn RLS ở điểm này: nó áp cho CẢ service_role (role có BYPASSRLS).
  constraint ck_report_not_future
    check (report_date <= (now() at time zone 'Asia/Ho_Chi_Minh')::date),

  -- ---- BR-007 / BR-008: COMPLETED phải có đủ số liệu -------------------------
  constraint ck_completed_requires_actuals
    check (
      status <> 'COMPLETED'
      or (
            actual_visit_points    is not null
        and actual_sales_quantity  is not null
        and actual_revenue         is not null
        and actual_customer_visits is not null
        and evening_submitted_at   is not null
      )
    ),

  -- ---- BR-008: MORNING_SUBMITTED không được có dấu thời gian cuối ngày -------
  constraint ck_morning_has_no_evening_ts
    check (status <> 'MORNING_SUBMITTED' or evening_submitted_at is null)
);

comment on table  public.daily_reports is
  'Một dòng cho mỗi (Sales x ngày nghiệp vụ VN). Cam kết sáng và thực đạt tối nằm chung một dòng — xem docs/02-database-design.md §13.1.';
comment on column public.daily_reports.report_date is
  'BR-005. Ngày nghiệp vụ tại Asia/Ho_Chi_Minh, KHÔNG phải ngày UTC.';
comment on column public.daily_reports.target_revenue is
  'BR-010. VND dạng số nguyên. Không bao giờ lưu chuỗi đã format.';

revoke all on table public.daily_reports from anon;
revoke all on table public.daily_reports from authenticated;
grant  select, insert, update on table public.daily_reports to authenticated;
-- Cố ý KHÔNG cấp DELETE (BR-013). Thiếu GRANT là lớp chặn thứ hai bên cạnh
-- việc không có DELETE policy.
--
-- Cố ý KHÔNG cấp bất kỳ quyền DML nào cho `service_role` (DEC-031) — xem giải
-- thích đầy đủ ở cuối `0001_init_enums_profiles.sql`. Đây là cách DEC-005
-- ("service role KHÔNG BAO GIỜ đọc/ghi daily_reports") được database ép.

alter table public.daily_reports enable row level security;
alter table public.daily_reports force  row level security;
