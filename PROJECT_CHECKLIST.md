# BikeForce Project Checklist

> Status: ACTIVE | Phase: 0 | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

---

## QUY TẮC TICK — đọc trước khi đánh dấu bất cứ ô nào

**Chỉ được tick `[x]` khi hội đủ CẢ NĂM điều kiện:**

1. **Code xong** — tính năng hoạt động thật, không phải TODO, không phải stub, không phải mock.
2. **Build pass** — `next build` chạy hết, exit code 0.
3. **Typecheck pass** — `tsc --noEmit` không còn lỗi, không dùng `any` để lách (NFR-012).
4. **Lint pass** — `next lint` / `eslint` không còn error.
5. **Test liên quan pass** — unit / integration / RLS / E2E tương ứng với mục đó đã chạy và xanh.

Hệ quả bắt buộc:

- Làm xong 4/5 điều kiện thì **vẫn để `[ ]`**. Không có ô "gần xong".
- **Không bao giờ** tick trước rồi sửa sau. Không bao giờ tick vì "code trông có vẻ đúng".
- Mỗi lần tick phải kèm một entry tương ứng trong `WORKLOG.md` ghi rõ lệnh test đã chạy và kết quả.
- Nếu một mục bị regression (test hỏng, build vỡ), **bỏ tick về `[ ]`** ngay và ghi vào
  `docs/12-known-issues.md`.
- Phase chỉ được coi là đóng khi **toàn bộ** mục của phase đó `[x]` và qua quality gate
  Master Spec §42.

**Tình trạng hôm nay (2026-08-07, sau Phase 1):** repository **đã có** `package.json` và source code
nền tảng. Baseline đã chạy thật và xanh: `npm run build` exit 0, `npm run typecheck` exit 0,
`npm run lint` exit 0 (0 error, 0 warning). **Chưa có test runner nào chạy** — Vitest và Playwright
đã cài nhưng chưa có file test nào, nên mọi mục cần "test liên quan pass" vẫn để `[ ]`.

---

## Phase 0 — Discovery & Business Analysis

- [x] Đọc toàn bộ `BIKEFORCE_MASTER_SPEC.md` (69 mục)
- [x] Khảo sát repository và toolchain: repo rỗng (3 file markdown, không phải git repo); Node v22.20.0, npm 10.9.3, git 2.48.1, Python 3.13.2
- [x] Clone và **chạy thật** skill `ui-ux-pro-max`: 9 lệnh `search.py` + đọc đầy đủ `references/pro-rules.md` và `references/quick-reference.md`
- [x] Xác minh phiên bản latest stable trên npm tại 2026-08-07 cho toàn bộ dependency dự kiến (next, react, typescript, tailwindcss, supabase, zod, playwright, vitest, eslint, lucide-react)
- [x] Đo contrast bằng script cho toàn bộ color token (sáng + dark card 9:16), loại bỏ 4 màu fail, chốt bảng thay thế — DEC-014
- [x] Chốt 21 use case UC-01..UC-21 và 6 actor
- [x] Chốt 37 functional requirement FR-001..FR-037 kèm priority M/S/L và mapping về UC
- [x] Chốt 15 non-functional requirement NFR-001..NFR-015 kèm cách đo
- [x] Chốt 25 business rule BR-001..BR-025 kèm nơi enforce — **toàn bộ đã APPROVED** sau khi người dùng trả lời 17/17 OQ
- [x] Đề xuất database schema, RLS deny-by-default, index và trigger — `docs/02-database-design.md`
- [x] Đề xuất system architecture, page map 16 route, navigation, chiến lược xuất ảnh 9:16 (DEC-010), testing strategy, deployment
- [x] Đề xuất 15 tính năng Admin AF-01..AF-15 theo đúng format Master Spec §69 (Feature / Business Value / Complexity / MVP / Reason)
- [x] Ghi DEC-001..DEC-030 vào `docs/11-decisions.md` và ISSUE-001..ISSUE-007 vào `docs/12-known-issues.md`
- [x] Tạo đủ **17 tài liệu kiểm soát dự án** theo Master Spec §44 và gom 17 OPEN QUESTION OQ-01..OQ-17 vào một danh sách duy nhất
- [x] **Toàn bộ 17 OPEN QUESTION đã được người dùng trả lời** (2026-08-07) — OQ-01…OQ-17, không còn câu nào chờ. DEC-025/026/029/030 chuyển PROPOSED → APPROVED

---

## Phase 1 — Foundation

- [x] Khởi tạo project bằng `create-next-app` (App Router, TypeScript, Tailwind, ESLint, không dùng `src/`) — DEC-001
- [x] `git init` + `.gitignore` chuẩn Next.js chặn `.env*` (đã kiểm chứng thực nghiệm) + remote GitHub — DEC-027, DEC-028 (hoàn thành ở Phase 0)
- [x] Smoke test tương thích TypeScript 7.0.2 + ESLint 10.8.0 với Next 16.3; nếu vỡ thì lùi TypeScript 5.x LTS và ghi lại kết quả — DEC-002, ISSUE-004
      → **CẢ HAI ĐỀU VỠ THẬT.** Đã pin `typescript@6.0.3` + `eslint@9.39.5`. Chi tiết: `docs/11 § DEC-002 — KẾT LUẬN SMOKE TEST`, ISSUE-004 nay `CLOSED`
- [x] Bật TypeScript `strict`, cấm `any` bằng lint rule — NFR-012
      → `strict: true` + `noUncheckedIndexedAccess: true`; `@typescript-eslint/no-explicit-any` mức `error`
- [x] Cài runtime dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`
      → thêm `server-only` (bắt buộc cho `lib/supabase/admin.ts`)
- [x] Cài dev dependencies: `vitest`, `@playwright/test`, `@axe-core/playwright`, `supabase` (CLI)
      → đã cài + `npx playwright install chromium`. **Chưa có `vitest.config.ts` và chưa có file test nào** — thuộc Phase 11
- [x] Dựng cấu trúc thư mục `app/ components/ features/ lib/ services/ types/ supabase/ docs/` — DEC-023
- [x] Tạo 3 Supabase client tách vai trò: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts` (`import 'server-only'`) — DEC-005
- [x] Tạo `.env.example` chỉ có tên biến + placeholder (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`); `.env.local` nằm trong `.gitignore` — NFR-005
      → kiểm chứng lại bằng `git check-ignore`: `.env.local` bị chặn, `.env.example` được track
- [x] Khai báo design token đã đo vào Tailwind v4 `@theme` trong `globals.css` — DEC-014
      → kiểm chứng trên trình duyệt thật: `body` = `rgb(248,250,252)` (#F8FAFC), `h1` = `rgb(30,58,138)` (#1E3A8A)
- [x] Cấu hình font Inter Variable qua `next/font/google`, `display: swap`, subsets `['latin','vietnamese']`, `tabular-nums` cho số — DEC-013
      → kiểm chứng: `font-family` computed = `Inter, "Inter Fallback", …`; dấu tiếng Việt hiển thị đúng trên ảnh chụp 375px
- [x] Tạo khung `lib/kpi.ts`, `lib/currency.ts`, `lib/date.ts` với đúng signature Master Spec §9 (chưa cần logic đầy đủ)
      → thân hàm `throw` có chủ đích; logic + unit test là Phase 5. Phát hiện ISSUE-008 khi viết khung
- [x] Dựng primitive UI không biết nghiệp vụ trong `components/ui/`: Button, Input, Label, Card, Badge, Skeleton
      → kiểm chứng mobile 375px + desktop 1440px: **không cuộn ngang**, **không touch target < 44px**
- [x] Chạy được `next build`, `tsc --noEmit`, `eslint` lần đầu và ghi kết quả baseline vào `WORKLOG.md`
      → cả 3 exit 0; lint 0 error 0 warning. Nguyên văn ở `WORKLOG.md` Entry 003

## Phase 2 — Database & Auth

- [ ] Tạo Supabase project region Singapore; bật email/password provider; **tắt** signup công khai — FR-006, BR-012
- [ ] Migration `0001_init_enums_profiles.sql`: enum `user_role`, `report_status`, bảng `public.profiles` đầy đủ CHECK và UNIQUE — BR-025
- [ ] Migration `0002_daily_reports.sql`: bảng `public.daily_reports` + `uq_daily_reports_sales_date`, `ck_report_not_future`, `ck_completed_requires_actuals`, `ck_morning_has_no_evening_ts` — BR-001, BR-006, BR-007, BR-016, BR-017, BR-018
- [ ] Migration `0003_functions_triggers.sql`: `set_updated_at`, `handle_new_user`, `guard_profile_self_update`, `guard_report_transition`, `vn_today`, `is_admin`, `is_active_sales` — BR-005, BR-008, DEC-006
- [ ] Migration `0004_rls_policies.sql`: `enable row level security` + `force row level security` trên cả 2 bảng, deny-by-default, không cấp DELETE — NFR-004, BR-003, BR-013, BR-019, BR-020, BR-021
- [ ] Migration `0005_indexes.sql`: `idx_daily_reports_date_status`, `idx_daily_reports_sales_date_desc`, `idx_profiles_role_active` — NFR-002, NFR-015
- [ ] `supabase/seed.sql` chỉ dùng local (1 admin + 3 sales + ~20 report mẫu), không seed production
- [ ] Sinh `types/database.types.ts` bằng `supabase gen types typescript --linked` và commit
- [ ] Trang `/login` + Server Action đăng nhập bằng email + mật khẩu — FR-001, UC-01
- [ ] `middleware.ts` refresh session cookie và chặn route theo role — FR-002, FR-004
- [ ] Đăng xuất và xoá session cookie — FR-003, UC-02
- [ ] Tài khoản `is_active = false` không đăng nhập được và hiển thị thông báo rõ ràng — FR-005, BR-009
- [ ] `layout.tsx` server-side kiểm tra role cho `(sales)` và `(admin)` (defense in depth cùng middleware) — DEC-004
- [ ] RLS test suite chạy bằng JWT thật của `salesA` / `salesB` / `admin`, xác nhận cross-user đọc/ghi đều bị chặn

## Phase 3 — Morning Report

- [ ] `/sales/today` hiển thị tên, ngày VN, trạng thái báo cáo hôm nay và **đúng 1 CTA chính** theo trạng thái — FR-007, UC-03
- [ ] `/sales/today/morning` form đầu ngày: tuyến, mục tiêu viếng thăm, mục tiêu doanh số, mục tiêu doanh thu, SL khách hàng dự kiến — FR-008, UC-04
- [ ] Họ tên lấy từ `profiles`, hiển thị read-only, không cho nhập lại — FR-009
- [ ] `report_date` mặc định `getVietnamToday()` theo `Asia/Ho_Chi_Minh` — FR-010, BR-005
- [ ] Zod schema cho form sáng: integer ≥ 0, revenue `bigint` ≤ 100.000.000.000, từ chối NaN/Infinity/chuỗi rác — BR-006, BR-017
- [ ] Chặn tạo trùng báo cáo cùng ngày ở **cả ba tầng**: UI, Server Action, và `UNIQUE(sales_id, report_date)` — FR-011, BR-001
- [ ] Server Action tự kiểm tra auth → role → Zod trước khi ghi, log lỗi ở server và chỉ trả message an toàn về client — NFR-006, NFR-014
- [ ] Sửa được báo cáo sáng khi `status = 'MORNING_SUBMITTED'` — FR-012, BR-019, UC-05
- [ ] Chặn tạo báo cáo cho ngày tương lai và chặn nhập bù ngày cũ — BR-016, BR-021
- [ ] UX form: label hiển thị (không placeholder-only), `inputMode="numeric"`, `min-h-[48px] text-base`, validate on blur, error `role="alert"` ngay dưới field, autofocus field lỗi đầu tiên
- [ ] Draft localStorage khôi phục khi mất mạng hoặc đóng tab, kèm cảnh báo `beforeunload` khi form dirty — FR-035
- [ ] Sticky action bar full-width `h-12`, disable + spinner khi đang gửi, có `env(safe-area-inset-bottom)`
- [ ] Trạng thái loading (skeleton >300ms), empty state và error state có nút "Thử lại"
- [ ] Walkthrough xác nhận hoàn tất báo cáo sáng ≤ 60 giây và ≤ 6 lần chạm — NFR-008

## Phase 4 — Evening Report

- [ ] `/sales/today/evening` hiển thị lại **toàn bộ cam kết sáng** để đối chiếu trực tiếp — FR-013, UC-06
- [ ] Nhập thực đạt: đã viếng thăm, doanh số, doanh thu, SL khách hàng, ghi chú optional — FR-014
- [ ] Zod schema cho form tối, ghi chú tối đa 1000 ký tự — BR-006, BR-017, BR-018
- [ ] Lưu thành công → `status = 'COMPLETED'` và ghi `evening_submitted_at` — FR-015, BR-008
- [ ] Chặn nhập báo cáo cuối ngày khi chưa có báo cáo đầu ngày cùng ngày (server + CHECK) — BR-007
- [ ] Khoá báo cáo sau khi `COMPLETED` theo phương án mặc định của OQ-04; nếu người dùng chọn khác thì sửa RLS policy và trigger tương ứng — BR-019
- [ ] `guard_report_transition` chặn `COMPLETED → MORNING_SUBMITTED` và chặn đổi `sales_id` / `report_date`
- [ ] Draft localStorage cho form tối — FR-035
- [ ] Save thất bại không mất dữ liệu form, có nút retry — NFR-010
- [ ] E2E luồng đầy đủ Morning → Save → Reopen → Evening → Save chạy xanh trên project `mobile-375`

## Phase 5 — KPI Engine

- [ ] `lib/kpi.ts` → `calculateAchievement(target, actual): AchievementResult` theo công thức `actual / target × 100` — FR-016, BR-014
- [ ] `getAchievementStatus(pct): 'EXCEEDED' | 'NEAR' | 'MISSED' | 'PENDING'` với ranh giới ≥100 / 80–99.99 / <80 / chưa có actual — BR-023
- [ ] Cho phép achievement > 100%, **không clamp** — BR-004
- [ ] Xử lý `target = 0` theo BR-015: `actual = 0` → 100%; `actual > 0` → `percent: null` + hiển thị `—`. Không bao giờ ra `NaN` / `Infinity` / `∞` — OQ-11
- [ ] Achievement **không persist** vào DB, luôn tính runtime — BR-011, DEC-007
- [ ] `lib/currency.ts` → `formatCurrencyVND` bằng `Intl.NumberFormat('vi-VN')` và `parseCurrencyInput`; tiền lưu `bigint` VND nguyên — BR-010, DEC-008
- [ ] `lib/date.ts` → `getVietnamToday`, `formatVietnamDate`, `getVietnamMonthRange` bằng `Intl.DateTimeFormat`, không thêm dependency timezone — DEC-009, NFR-011
- [ ] Không component nào cài lại công thức KPI hoặc format tiền — logic chỉ tồn tại một nơi — NFR-012
- [ ] Bảng đối chiếu 4 chỉ tiêu: 4 card ở mobile, `<table>` thật từ 768px, cấm cuộn ngang — DEC-019
- [ ] Badge trạng thái luôn có **icon + text**, không dùng màu đơn thuần (Lucide `TrendingUp` / `Minus` / `TrendingDown` / `Clock`)
- [ ] Unit test đầy đủ các biên: `target=0 & actual=0`, `target=0 & actual>0`, `actual>target`, `actual<target`, `actual=target`, `actual=null`, 79.99 / 80 / 99.99 / 100, tiền 0 / 1000 / 125000000 / 99999999999, `getVietnamToday` tại 16:59Z và 17:01Z — coverage `lib/**` ≥ 90%

## Phase 6 — 9:16 Image Export

- [ ] Route Handler `GET /api/reports/[id]/share-image` sinh PNG **1080×1920** bằng `ImageResponse` (Satori), không screenshot cả trang — FR-018, DEC-010
- [ ] Route handler xác thực session, đọc report dưới RLS, và **kiểm tra `status = 'COMPLETED'`** trước khi render — BR-002
- [ ] Admin cũng gọi được đúng route này cho báo cáo của Sales — BR-022
- [ ] Nhúng file font `.ttf`/`.woff` có **đầy đủ dấu tiếng Việt** (subset latin + vietnamese), đọc bằng `fs` ở Node runtime
- [ ] `features/report-share/DailyReportShareCard.tsx` dùng chung view model với UI để số liệu không lệch, layout dark `#0B1220` với bảng token đã đo
- [ ] Header `Content-Disposition: attachment; filename="BikeForce_Report_<Ho-Ten>_<YYYY-MM-DD>.png"` và `Cache-Control: private, no-store` — FR-019
- [ ] Nút "Xuất ảnh" chỉ enable khi báo cáo đã persist với `status = 'COMPLETED'` — FR-017, UC-08
- [ ] Chia sẻ qua Web Share API khi `navigator.canShare({files})`, fallback `<a download>` — FR-020, DEC-011
- [ ] Thư viện sinh ảnh không nằm trong initial bundle client — NFR-003
- [ ] Test edge case: tên 40+ ký tự, tuyến 300 ký tự, ghi chú 1000 ký tự, doanh thu 12 chữ số, achievement 4 chữ số (`1250,0%`), `—` khi `target=0`, dấu tiếng Việt đầy đủ (ừ ẫ ợ ỹ đ)
- [ ] Kiểm chứng tay trên thiết bị thật trong **Zalo in-app webview**: mở app, tải ảnh, chia sẻ — ISSUE-003, NFR-009
- [ ] Nếu Satori không dựng nổi layout: chuyển fallback `html-to-image` (`next/dynamic({ssr:false})`, `document.fonts.ready`, bảng màu hex thuần) và **ghi thành DEC mới**, không sửa lén — ISSUE-002

## Phase 7 — Sales History

- [ ] `/sales/history` liệt kê báo cáo của chính mình — FR-021, UC-09
- [ ] Filter theo tháng dùng `getVietnamMonthRange(yyyyMM)`
- [ ] Phân trang **server-side**, không tải toàn bộ rồi lọc ở client — NFR-002
- [ ] Truy vấn dùng `idx_daily_reports_sales_date_desc`, xác nhận bằng `EXPLAIN ANALYZE`, không `select *` toàn bảng
- [ ] `/sales/reports/[id]` chi tiết báo cáo của chính mình kèm bảng đối chiếu và nút xuất ảnh — FR-022, UC-10
- [ ] RLS chặn Sales đọc báo cáo của Sales khác — BR-003
- [ ] Empty state có icon + hướng dẫn + CTA khi tháng chưa có báo cáo nào
- [ ] `/sales/account`: hồ sơ, đổi mật khẩu, đăng xuất — FR-023, UC-11
- [ ] Bottom nav Sales 3 mục (Hôm nay / Lịch sử / Tài khoản) có icon **và** label, active state rõ, sidebar từ 1024px — DEC-018
- [ ] Nút Back thật ở trang con, không phá back stack; giữ state filter khi quay lại
- [ ] E2E bảo mật: đăng nhập `salesA` rồi mở trực tiếp `/sales/reports/<id-của-salesB>` → 404/redirect

## Phase 8 — Admin Dashboard

- [ ] `/admin` hiển thị đủ **12 chỉ số bắt buộc** theo Master Spec §16 — FR-024, UC-12, AF-01
- [ ] Các chỉ số tính bằng aggregate SQL server-side, không kéo toàn bộ row về client — NFR-002
- [ ] Cảnh báo Sales **chưa báo cáo sáng** và Sales **đã sáng nhưng chưa hoàn tất cuối ngày** — FR-033, UC-20, AF-02
- [ ] Trình bày theo Executive Dashboard: 4–6 KPI card lớn, traffic-light status, một màn hình, mobile rút gọn
- [ ] `layout.tsx` của group `(admin)` chặn non-admin server-side — FR-004
- [ ] Bottom nav Admin 4 mục (Tổng quan / Báo cáo / Sales / Tài khoản), sidebar cố định từ 1024px, không hiển thị đồng thời — DEC-018
- [ ] Truy vấn dùng `idx_daily_reports_date_status`, xác nhận bằng `EXPLAIN ANALYZE`
- [ ] Skeleton cho phần tải >300ms và empty state khi chưa Sales nào báo cáo
- [ ] Kiểm tra `is_admin()` được gọi dạng `(select public.is_admin())` để Postgres nâng thành InitPlan — DEC-006, ISSUE-005

## Phase 9 — Admin Reports & Filters

- [ ] `/admin/reports` danh sách toàn bộ báo cáo — FR-025, UC-13, AF-03
- [ ] Filter ngày / khoảng ngày / tháng / Sales / status, và search theo tên Sales — FR-025
- [ ] Filter và phân trang thực hiện **server-side** toàn bộ — FR-026, NFR-002
- [ ] Search theo tên dùng `ilike` ở v1; chỉ thêm `pg_trgm` GIN khi vượt 200 Sales (ghi vào roadmap)
- [ ] Mobile hiển thị card, từ 768px hiển thị `<table>` có `aria-sort`; cấm cuộn ngang — DEC-019
- [ ] `/admin/reports/[id]` xem chi tiết báo cáo của Sales bất kỳ — FR-027, UC-14, AF-04
- [ ] `/admin/analytics` tổng target vs actual cho **cả 4 chỉ tiêu** theo tháng, kèm % — FR-028, UC-15, AF-05
- [ ] Export CSV đúng tập dữ liệu đang filter, không phải toàn bảng — FR-034, UC-21, AF-09
- [ ] Biểu đồ trend theo ngày trong tháng (SHOULD, chỉ làm nếu không phát sinh dependency nặng) — FR-037, AF-08
- [ ] Mọi bảng/biểu đồ có phương án `data-table` thay thế; gridline mảnh; không lạm dụng pie chart
- [ ] `EXPLAIN ANALYZE` cho mọi truy vấn list mới, xác nhận đều dùng index

## Phase 10 — Sales Management

- [ ] `/admin/sales` danh sách Sales kèm bảng hiệu suất: tổng doanh số, doanh thu, viếng thăm, achievement trung bình, số ngày đạt KPI — FR-029, UC-16, AF-06
- [ ] "Ngày đạt KPI" tính theo BR-024 (cả 4 chỉ tiêu ≥ 100%), tính bằng aggregate SQL — OQ-17
- [ ] `/admin/sales/new` tạo tài khoản Sales: email, mật khẩu tạm, họ tên, phone, mã NV — FR-030, UC-17
- [ ] Việc tạo/sửa tài khoản dùng `lib/supabase/admin.ts` (service role, `import 'server-only'`) và **chỉ** gọi `auth.admin.*`; không bao giờ dùng service role để đọc/ghi `daily_reports` — DEC-005
- [ ] `/admin/sales/[id]` xem hồ sơ + hiệu suất + lịch sử báo cáo, và sửa hồ sơ Sales — FR-031, UC-18
- [ ] Bật/tắt `is_active`; tài khoản inactive lập tức không đăng nhập và không thao tác được — FR-032, UC-19, BR-009
- [ ] Trigger `guard_profile_self_update` chặn non-admin tự đổi `role`, `is_active`, `email`, `id`
- [ ] Admin **không** có quyền UPDATE lên các cột số liệu của `daily_reports` — BR-020, OQ-05
- [ ] Email profile khớp `auth.users.email` và unique toàn hệ thống — BR-025
- [ ] Runbook tạo Admin đầu tiên (tạo user trên Supabase Dashboard rồi `update profiles set role='ADMIN'` một lần bằng SQL editor) đã viết trong `docs/09-deployment.md`, không code UI cho việc này
- [ ] Không có self-registration ở bất kỳ đâu trong app — FR-006, BR-012

## Phase 11 — Testing & Security

- [ ] Vitest unit cho `lib/kpi`, `lib/currency`, `lib/date` và toàn bộ Zod schema; coverage `lib/**` ≥ 90%
- [ ] Integration test DB: persist sáng → tối; vi phạm `UNIQUE(sales_id, report_date)` ném lỗi; `ck_completed_requires_actuals` chặn đúng
- [ ] Integration test trigger: chặn `COMPLETED → MORNING_SUBMITTED`; chặn Sales tự đổi `role`
- [ ] RLS test bằng **JWT thật** của `salesA` / `salesB` / `admin`: salesA select report của salesB → 0 rows; update → 0 rows affected; insert với `sales_id` của người khác → bị từ chối; delete → bị từ chối; admin select → có dữ liệu; user inactive → bị chặn — NFR-004
- [ ] Playwright cấu hình 3 project: `mobile-375`, `desktop-1440`, `zalo-like` (userAgent webview)
- [ ] E2E luồng Sales đầy đủ: Login → Today → Morning → Save → Reopen → Evening → Save → Comparison → Export
- [ ] E2E luồng Admin: Login → Dashboard → Reports → Filter tháng → Filter Sales → Detail
- [ ] E2E bảo mật: `GET /api/reports/<id-của-salesB>/share-image` bằng session salesA → 403/404
- [ ] `@axe-core/playwright` trên `/login`, `/sales/today`, `/sales/today/morning`, `/admin`: **0 violation** mức serious/critical — NFR-007
- [ ] Bước CI grep bundle client xác nhận `SUPABASE_SERVICE_ROLE_KEY` không rò rỉ — NFR-005
- [ ] Lighthouse mobile ≥ 90 và LCP < 2.5s trên 4G — NFR-001
- [ ] Unit test biên múi giờ: 23:30 VN và 00:30 VN ra đúng 2 ngày nghiệp vụ khác nhau — NFR-011
- [ ] Ma trận thử tay: Chrome mobile, Safari mobile (2 phiên bản gần nhất) và **Zalo in-app browser** — NFR-009
- [ ] Coverage tổng thể ≥ 60% (không đặt mục tiêu 100% để tránh test rác)

## Phase 12 — Deployment Preparation

- [ ] Tạo Supabase project production region Singapore; bật email/password; **tắt** "Enable email signups"; tắt email confirmation cho tài khoản do Admin tạo — BR-012
- [ ] Đẩy toàn bộ migration bằng `supabase db push`; **không** sửa schema bằng tay trên dashboard
- [ ] `types/database.types.ts` được regenerate và commit khớp với schema production
- [ ] Đặt biến môi trường trên Vercel cho cả Production / Preview / Development; `SUPABASE_SERVICE_ROLE_KEY` **chỉ** server-side, không có prefix `NEXT_PUBLIC_`
- [ ] Vercel: framework preset Next.js, region `sin1`, build `next build`, Node 22
- [ ] Bật "Protect Preview Deployments" vì đây là app nội bộ
- [ ] Chạy runbook tạo Admin đầu tiên trên production (một lần duy nhất)
- [ ] PWA manifest + icon + `display: standalone`, Add to Home Screen hoạt động; **không** service worker offline ở v1 — FR-036, DEC-024
- [ ] Xác nhận hệ thống nằm trong hạn mức Vercel Free + Supabase Free: không cron, không queue, không dùng Supabase Storage cho ảnh — NFR-013, DEC-021
- [ ] Ghi rõ chính sách rollback: migration chỉ tiến tới, muốn lùi phải viết migration mới
- [ ] Smoke test trên production: đăng nhập Sales, tạo báo cáo sáng, hoàn tất cuối ngày, xuất ảnh, đăng nhập Admin xem dashboard
- [ ] Cập nhật `WORKLOG.md`, `SESSION_CHECKPOINT.md`, `PROJECT_CHECKLIST.md` và toàn bộ `docs/` khớp với hệ thống đã deploy

---

## OPEN QUESTIONS

Các OQ có thể làm **thay đổi nội dung checklist** này (danh sách đầy đủ:
`docs/01-business-analysis.md § OPEN QUESTIONS`):

| ID | Câu hỏi rút gọn | Đề xuất mặc định | Mục checklist bị ảnh hưởng |
|---|---|---|---|
| OQ-01 | "Mục tiêu viếng thăm" = số điểm hay mục đích chuyến đi? | Cả hai: `target_visit_points` + `visit_purpose` | Phase 2, Phase 3, Phase 6 |
| OQ-02 | "Đã viếng thăm" = con số hay tuyến thực tế? | Cả hai: `actual_visit_points` + `actual_route` | Phase 2, Phase 4, Phase 5 |
| OQ-03 | Doanh số = số lượng xe, Doanh thu = tiền VND? | Đúng như hiểu hiện tại | Phase 2, Phase 3, Phase 4 |
| OQ-04 | Sửa được sau khi `COMPLETED` không? | Khoá ngay khi `COMPLETED` | Phase 2, Phase 4 |
| OQ-05 | Admin sửa báo cáo của Sales? | Không trong v1 | Phase 2, Phase 10 |
| OQ-08 | Có ngày nghỉ / không đi thị trường? | v1 không có | Phase 8 |
| OQ-09 | Sales tự cam kết hay Admin giao KPI? | Sales tự cam kết | Phase 2, Phase 3, Phase 10 |
| OQ-11 | `target = 0` thì % hiển thị ra sao? | `actual=0` → 100%; `actual>0` → `—` | Phase 5, Phase 6, Phase 9 |
| OQ-12 | Nhập trễ / nhập bù / cut-off? | Chỉ đúng ngày hôm nay theo giờ VN | Phase 2, Phase 3, Phase 8 |
| OQ-13 | Xoá báo cáo? | v1 không xoá | Phase 2 |
| OQ-17 | "Ngày đạt KPI" = cả 4 chỉ tiêu hay chỉ doanh thu? | Cả 4 chỉ tiêu ≥ 100% | Phase 10 |

✅ **Đã hết blocker** — 17/17 OPEN QUESTION được trả lời ngày 2026-08-07, Phase 2 đã viết được
(ISSUE-001).
