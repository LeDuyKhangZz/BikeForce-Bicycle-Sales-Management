-- =============================================================================
-- BikeForce — seed dữ liệu mẫu
--
--   ⚠  CHỈ DÙNG CHO SUPABASE LOCAL (`supabase db reset`).
--   ⚠  TUYỆT ĐỐI KHÔNG CHẠY TRÊN PROJECT PRODUCTION (DEC-022).
--
-- Nguồn thiết kế: docs/02-database-design.md §7.6
--
-- MẬT KHẨU: 'LocalDev#2026' cho cả 4 tài khoản. Đây KHÔNG phải secret — nó chỉ
-- tồn tại trong container Postgres chạy trên máy lập trình viên, không bao giờ
-- được dùng ở bất kỳ môi trường nào khác. Bộ test RLS
-- (`lib/__tests__/rls.test.ts`) dùng lại đúng chuỗi này.
--
-- Dữ liệu được thiết kế để phủ các nhánh hiển thị:
--   • ngày vượt 100%          → badge EXCEEDED (BR-023)
--   • ngày 80–99%             → badge NEAR
--   • ngày < 80%              → badge MISSED
--   • hôm nay MORNING_SUBMITTED, chưa hoàn tất → alert AF-02 + badge PENDING
--   • target = 0 và actual > 0 → BR-015 / DEC-025 (số vượt tuyệt đối)
--   • ghi chú đúng 1000 ký tự, tuyến 300 ký tự, doanh thu 12 chữ số, tên 42 ký
--     tự có dấu → biên của thẻ ảnh 9:16 (Phase 6)
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Bốn tài khoản auth.users. Trigger on_auth_user_created sẽ tự sinh
--    public.profiles từ raw_user_meta_data (UC-17, FR-030).
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  u.id,
  'authenticated',
  'authenticated',
  u.email,
  extensions.crypt('LocalDev#2026', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'full_name',     u.full_name,
    'phone',         u.phone,
    'employee_code', u.employee_code
  ),
  now(), now(), '', '', '', ''
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'admin@bikeforce.local',   'Nguyễn Quản Trị',                            '0901000001', 'NV001'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'sales.a@bikeforce.local', 'Lê Duy Khang',                               '0901000002', 'NV002'),
  -- 42 ký tự có dấu — biên "tên 40+ ký tự" của thẻ ảnh 9:16
  ('33333333-3333-4333-8333-333333333333'::uuid, 'sales.b@bikeforce.local', 'Trần Thị Mỹ Duyên Nguyễn Hoàng Phương Thảo', '0901000003', 'NV003'),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'sales.c@bikeforce.local', 'Phạm Văn Đạt',                               '0901000004', 'NV004')
) as u(id, email, full_name, phone, employee_code);

-- GoTrue cần một identity provider 'email' thì signInWithPassword mới chạy.
insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(), now(), now()
from auth.users u
where u.email like '%@bikeforce.local';

-- Nâng quyền Admin đầu tiên — đúng runbook docs/09-deployment.md §Bootstrap.
-- Đây là con đường DUY NHẤT để có ADMIN: handle_new_user() luôn ép role = 'SALES'.
update public.profiles
   set role = 'ADMIN'
 where email = 'admin@bikeforce.local';

-- ---------------------------------------------------------------------------
-- 2. 18 báo cáo đã COMPLETED, 6 ngày gần nhất × 3 Sales.
--    Biến thiên theo (thứ tự Sales + số ngày) để phủ đủ 3 badge của BR-023.
-- ---------------------------------------------------------------------------
insert into public.daily_reports (
  sales_id, report_date, status,
  planned_route, visit_purpose,
  target_visit_points, target_sales_amount, target_revenue, target_customer_visits,
  morning_submitted_at,
  actual_route, actual_visit_points, actual_sales_amount, actual_revenue, actual_customer_visits,
  evening_note, evening_submitted_at
)
select
  s.id,
  public.vn_today() - g.d,
  'COMPLETED',
  case s.n when 1 then 'Quận 1 → Quận 3 → Quận 5'
           when 2 then 'Thủ Đức → Bình Dương'
           else        'Tây Ninh → Củ Chi' end,
  -- Cột DI SẢN (DEC-048): cố ý vẫn có dữ liệu ở nhóm báo cáo CŨ để kiểm chứng
  -- rằng giao diện KHÔNG còn hiển thị nó ở bất kỳ đâu. Bốn báo cáo đặc biệt bên
  -- dưới không ghi cột này nữa, đúng như ứng dụng từ Phase 13.
  'Chăm sóc đại lý và giới thiệu dòng xe mới',
  -- BR-026 (DEC-049): mục tiêu điểm viếng thăm có SÀN 10.
  10 + s.n + g.d,
  (50000000 + g.d * 5000000)::bigint,
  (80000000 + g.d * 10000000)::bigint,
  6 + g.d,
  (now() - (g.d || ' days')::interval),
  case s.n when 1 then 'Quận 1 → Quận 3 (bỏ Quận 5 do kẹt xe)'
           when 2 then 'Thủ Đức → Bình Dương → Dĩ An'
           else        'Tây Ninh → Củ Chi' end,
  10 + s.n + g.d,
  -- (s.n + g.d) % 3 = 0 → vượt · 1 → gần đạt (~85%) · 2 → chưa đạt (~60%)
  case (s.n + g.d) % 3
    when 0 then ((50000000 + g.d * 5000000) * 1.20)::bigint
    when 1 then ((50000000 + g.d * 5000000) * 0.85)::bigint
    else        ((50000000 + g.d * 5000000) * 0.60)::bigint
  end,
  case (s.n + g.d) % 3
    when 0 then ((80000000 + g.d * 10000000) * 1.20)::bigint
    when 1 then ((80000000 + g.d * 10000000) * 0.85)::bigint
    else        ((80000000 + g.d * 10000000) * 0.60)::bigint
  end,
  case (s.n + g.d) % 3
    when 0 then 6 + g.d + 1
    when 1 then floor((6 + g.d) * 0.85)::int
    else        floor((6 + g.d) * 0.60)::int
  end,
  case (s.n + g.d) % 3
    when 0 then 'Chốt thêm được một đơn ngoài kế hoạch.'
    when 1 then 'Một khách hẹn lại đầu tuần sau.'
    else        'Mưa lớn buổi chiều, phải huỷ 2 điểm cuối tuyến.'
  end,
  (now() - (g.d || ' days')::interval + interval '11 hours')
from (
  select id, row_number() over (order by email) as n
  from public.profiles
  where role = 'SALES'
) s
cross join generate_series(1, 6) as g(d);

-- ---------------------------------------------------------------------------
-- 3. Bốn báo cáo đặc biệt — phủ các nhánh mà dữ liệu đều đặn không chạm tới.
-- ---------------------------------------------------------------------------

-- (a) HÔM NAY — sales.a mới nộp cam kết sáng, CHƯA hoàn tất.
--     Dùng để test: badge PENDING (BR-023), CTA "Nhập thực đạt" trên
--     /sales/today (FR-007), và alert "đã sáng nhưng chưa hoàn tất" (AF-02).
insert into public.daily_reports (
  sales_id, report_date, status, planned_route,
  target_visit_points, target_sales_amount, target_revenue, target_customer_visits
)
select id, public.vn_today(), 'MORNING_SUBMITTED',
       'Quận 7 → Nhà Bè',
       12, 90000000::bigint, 150000000::bigint, 10
from public.profiles where email = 'sales.a@bikeforce.local';

-- (b) HÔM NAY — sales.b đã hoàn tất đầy đủ. Dùng để test 12 chỉ số dashboard.
insert into public.daily_reports (
  sales_id, report_date, status, planned_route,
  target_visit_points, target_sales_amount, target_revenue, target_customer_visits,
  actual_route, actual_visit_points, actual_sales_amount, actual_revenue,
  actual_customer_visits, evening_note, evening_submitted_at
)
select id, public.vn_today(), 'COMPLETED',
       'Gò Vấp → Tân Bình',
       11, 70000000::bigint, 120000000::bigint, 8,
       'Gò Vấp → Tân Bình → Phú Nhuận', 12, 82000000::bigint, 138000000::bigint, 9,
       'Đại lý Phú Nhuận đặt thêm 2 xe cho tuần sau.', now()
from public.profiles where email = 'sales.b@bikeforce.local';

-- (c) BR-015 / DEC-025 — target = 0 ở BA chỉ tiêu nhưng actual > 0.
--     Kỳ vọng hiển thị: percent = null + số vượt tuyệt đối
--     (+3.000.000 ₫ doanh số, +5.000.000 ₫ doanh thu công nợ, +4 khách),
--     nhãn "Vượt kế hoạch". KHÔNG BAO GIỜ NaN/∞.
--     ⚠ `target_visit_points` KHÔNG thể là 0 nữa — BR-026 đặt sàn 10 (DEC-049).
--     Dòng này vì vậy vừa phủ BR-015 (ba chỉ tiêu) vừa phủ MISSED (điểm viếng thăm).
insert into public.daily_reports (
  sales_id, report_date, status, planned_route,
  target_visit_points, target_sales_amount, target_revenue, target_customer_visits,
  actual_route, actual_visit_points, actual_sales_amount, actual_revenue,
  actual_customer_visits, evening_note, evening_submitted_at
)
select id, public.vn_today() - 7, 'COMPLETED',
       'Ngày hỗ trợ hội chợ — không đặt chỉ tiêu doanh số',
       10, 0::bigint, 0::bigint, 0,
       'Gian hàng hội chợ Tân Bình', 2, 3000000::bigint, 5000000::bigint, 4,
       'Không đặt chỉ tiêu nhưng vẫn chốt được đơn tại gian hàng.', now() - interval '7 days'
from public.profiles where email = 'sales.c@bikeforce.local';

-- (d) BIÊN CỦA THẺ ẢNH 9:16 — tuyến 300 ký tự, ghi chú đúng 1000 ký tự,
--     doanh thu 12 chữ số (100.000.000.000 ₫ = trần BR-017),
--     achievement 4 chữ số. Dùng ở Phase 6.
insert into public.daily_reports (
  sales_id, report_date, status, planned_route,
  target_visit_points, target_sales_amount, target_revenue, target_customer_visits,
  actual_route, actual_visit_points, actual_sales_amount, actual_revenue,
  actual_customer_visits, evening_note, evening_submitted_at
)
select id, public.vn_today() - 8, 'COMPLETED',
       rpad('Tuyến dài kiểm thử layout: Quận 1 → Quận 3 → Quận 5 → Quận 10 → Tân Bình → Gò Vấp → Bình Thạnh → Thủ Đức → Dĩ An → Biên Hoà → Long Thành → Nhơn Trạch → ', 300, 'x'),
       10, 8000000::bigint, 10000000::bigint, 1,
       rpad('Thực tế đã đi: Quận 1 → Quận 3 → Quận 5 → Quận 10 → Tân Bình → Gò Vấp → Bình Thạnh → Thủ Đức → Dĩ An → Biên Hoà → ', 300, 'y'),
       125, 99999999999::bigint, 100000000000::bigint, 12,
       rpad('Ghi chú kiểm thử biên 1000 ký tự với đầy đủ dấu tiếng Việt: ừ ẫ ợ ỹ đ ă â ê ô ơ ư. ', 1000, '.'),
       now() - interval '8 days'
from public.profiles where email = 'sales.a@bikeforce.local';

commit;

-- ---------------------------------------------------------------------------
-- Tóm tắt để đối chiếu nhanh sau khi `supabase db reset`
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.profiles)                                    as profiles,
  (select count(*) from public.profiles where role = 'ADMIN')               as admins,
  (select count(*) from public.daily_reports)                               as reports,
  (select count(*) from public.daily_reports where status = 'COMPLETED')    as completed,
  (select count(*) from public.daily_reports where report_date = public.vn_today()) as today;
