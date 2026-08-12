# BikeForce Project Checklist

> Status: ACTIVE | Phase: 16 — Báo cáo Admin cho dữ liệu lớn (DEC-066) | Last updated: 2026-08-12
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

**Tình trạng hôm nay (2026-08-10, sau Phase 11):** repository đã có **toàn bộ 18 route của v1 chạy thật** — luồng
báo cáo ngày hai nửa, KPI engine, ảnh chia sẻ 9:16, lịch sử báo cáo, và **toàn bộ khu vực Admin** (dashboard 12 chỉ
số, danh sách + 7 chiều lọc, phân tích tháng + biểu đồ trend, quản lý tài khoản Sales, xuất CSV). Schema chạy thật
trên Supabase local với **7 migration**; cloud mới có 5 — xem `docs/09 §12`. Bộ test **729 case** cộng **99 bài E2E**
trên 3 project. Kết quả thật của lần chạy cuối:

| Lệnh | Kết quả |
|---|---|
| `npm run build` | ✅ exit 0 (Next.js 16.3.0, Turbopack, **18 route** — thêm `ƒ /api/admin/reports/export`) |
| `npm run typecheck` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0 — 0 error, 0 warning |
| `npm test` | ✅ **729 passed / 729** — 29 test file, 3 project (`unit` **542** · `integration` **54** · `rls` **133**), 23,8 giây |
| `npx vitest run --project unit --coverage` | ✅ `lib/**` → stmt **99%** · branch **98,69%** · func **100%** · lines **99,4%** |
| `npx playwright test` | ✅ **99 passed / 99** trên 3 project (`mobile-375`, `desktop-1440`, `zalo-like`), 4,4 phút |
| — trong đó a11y `@axe-core/playwright` | ✅ **10 màn hình × 3 project = 30 lượt quét, 0 vi phạm serious/critical** (NFR-007) |
| — trong đó bảo mật | ✅ IDOR · 401/403 JSON cho `/api/*` · CSV Sales→403 Admin→200 · PNG 1080×1920 · **service role key không rò rỉ ra HTML** |
| `EXPLAIN ANALYZE` (`tests/integration/indexes.test.ts`) | ✅ **14 bài** — `is_admin()` được nâng thành **InitPlan** (ISSUE-005 → CLOSED); mọi truy vấn list đều đi qua index, không `Seq Scan` |
| Xem tận mắt biểu đồ trend ở 375px và 1440px | ✅ đã chụp và xem — nhãn trục đúng type scale sau khi đưa chữ ra khỏi SVG (DEC-044) |
| Kiểm chứng các phase trước (Chromium, script dùng-một-lần) | ✅ Phase 2 **32/32** · Phase 3 **57/58** *(mục lệch NFR-008 nay ĐẠT theo DEC-043)* · Phase 4 **62/62** + hồi quy **11/11** · Phase 5 **36/36** · Phase 6 **44/44** |


**Playwright E2E nay ĐÃ CHẠY THẬT** — `playwright.config.ts` cộng 5 file trong `e2e/` đều đã commit, chạy bằng
`npm run e2e`. Đây là bộ hồi quy thật, khác hẳn các script dùng-một-lần của Phase 2–6 (đã xoá, không commit).
**Hai hạng mục vẫn `N/A` và không được diễn giải thành pass:** Lighthouse (chưa chạy) và kiểm ảnh 9:16 trong
Zalo trên **thiết bị thật** (ISSUE-003 — cần điện thoại + link công khai, phải chờ sau khi deploy Vercel).

> ⚠ **Sửa số liệu ở Phase 5 (2026-08-07):** bảng này trước đây ghi `unit 189 · integration 47`.
> Tổng `269` là **đúng**, nhưng cách chia giữa hai project thì **sai** — đo lại bằng
> `npx vitest run --project <tên>` cho `unit 196 · integration 40 · rls 33`. Nguồn lệch:
> `lib/currency.test.ts` có **36** test chứ không phải 29 (file này chưa từng bị sửa từ Phase 3).
> Sau khi thêm 46 test của `lib/kpi.test.ts`, con số hiện tại là **242 · 40 · 33 = 315**.

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

> **Trạng thái 2026-08-07: PHASE 2 ĐÃ ĐÓNG — 14/14 mục `[x]`.**
> Schema đã chạy thật trên **cả hai** môi trường: Supabase local (Postgres 17.6.1.156) và Supabase
> cloud `rnmywhwanpxmipqducqu` region `ap-southeast-1` (Postgres 17.6.1.155). Bộ test khoá lại:
> `npm test` → **80/80 PASS**.

- [x] Tạo Supabase project region Singapore; bật email/password provider; **tắt** signup công khai — FR-006, BR-012
      → Project `rnmywhwanpxmipqducqu` ("BikeForce_Bicycle Sales Management"), region **`ap-southeast-1`**, `ACTIVE_HEALTHY`. **Kiểm chứng thật bằng HTTP:** `POST /auth/v1/signup` → `422 signup_disabled "Signups not allowed for this instance"`; `GET /auth/v1/health` → 200 (GoTrue v2.195.0). 5 migration đã `db push` thành công, **seed KHÔNG được đẩy** (`seeds: []`)
- [x] Migration `0001_init_enums_profiles.sql`: enum `user_role`, `report_status`, bảng `public.profiles` đầy đủ CHECK và UNIQUE — BR-025
      → `citext` cài vào schema `extensions`; RLS `enable` + `force` bật ngay trong file này; `service_role` cố ý không được cấp DML (DEC-031)
- [x] Migration `0002_daily_reports.sql`: bảng `public.daily_reports` + `uq_daily_reports_sales_date`, `ck_report_not_future`, `ck_completed_requires_actuals`, `ck_morning_has_no_evening_ts` — BR-001, BR-006, BR-007, BR-016, BR-017, BR-018
      → 20 cột, 16 constraint. `ck_report_not_future` dùng `now()` (STABLE) trong CHECK — **đã kiểm chứng Postgres chấp nhận**
- [x] Migration `0003_functions_triggers.sql`: `set_updated_at`, `handle_new_user`, `guard_profile_self_update`, `guard_report_transition`, `vn_today`, `is_admin`, `is_active_sales` — BR-005, BR-008, DEC-006
      → 7/7 function + 6 trigger. `is_admin`/`is_active_sales` đã kiểm chứng `stable` + `security definer` + `search_path` cố định
- [x] Migration `0004_rls_policies.sql`: `enable row level security` + `force row level security` trên cả 2 bảng, deny-by-default, không cấp DELETE — NFR-004, BR-003, BR-013, BR-019, BR-020, BR-021
      → 6 policy. `enable`/`force` nằm ở `0001`/`0002` (không có cửa sổ nào bảng chưa bật RLS); file này chỉ chứa policy vì policy phụ thuộc hàm của `0003`
- [x] Migration `0005_indexes.sql`: `idx_daily_reports_date_status`, `idx_daily_reports_sales_date_desc`, `idx_profiles_role_active` — NFR-002, NFR-015
      → **Chưa** chạy `EXPLAIN ANALYZE` — việc đó là Phase 11, không được coi là đã đo
- [x] `supabase/seed.sql` chỉ dùng local (1 admin + 3 sales + ~20 report mẫu), không seed production
      → 4 tài khoản + **22 báo cáo**, phủ EXCEEDED/NEAR/MISSED/PENDING, `target=0`, ghi chú 1000 ký tự, tên 42 ký tự có dấu
- [x] Sinh `types/database.types.ts` bằng `supabase gen types typescript --linked` và commit
      → ✅ Đã chạy `--linked` thật sau khi `supabase link`. So với bản `--local`, khác **đúng một khối metadata** `__InternalSupabase.PostgrestVersion: "14.15"` — **schema hai bên giống hệt nhau**, đúng như mong đợi vì cùng 5 migration
- [x] Trang `/login` + Server Action đăng nhập bằng email + mật khẩu — FR-001, UC-01
      → Kiểm chứng trên Chromium: chống user enumeration (sai mật khẩu và email không tồn tại cho **cùng một câu**), validate on blur bằng chính Zod schema của server, chống open redirect ở `?next=`
- [x] `middleware.ts` refresh session cookie và chặn route theo role — FR-002, FR-004
      → Kiểm chứng: chưa đăng nhập → `/login?next=`; Sales vào `/admin` → về `/sales/today`; Admin vào `/sales/today` → về `/admin`; đã có phiên mà vào `/login` hoặc `/` → về dashboard đúng vai. ⚠ ISSUE-009: Next 16.3 deprecate tên `middleware.ts`
- [x] Đăng xuất và xoá session cookie — FR-003, UC-02
      → Có bước xác nhận inline; sau khi đăng xuất, mở lại `/sales/today` bị chặn ⇒ cookie đã mất thật
- [x] Tài khoản `is_active = false` không đăng nhập được và hiển thị thông báo rõ ràng — FR-005, BR-009
      → **6/6 PASS**, gồm cả tình huống bị vô hiệu hoá **giữa phiên** → `/login?reason=deactivated` kèm đúng câu của `docs/06 §8.3`
- [x] `layout.tsx` server-side kiểm tra role cho `(sales)` và `(admin)` (defense in depth cùng middleware) — DEC-004
      → `requireRole()` ở `features/auth/queries.ts`; mỗi group có đủ `loading.tsx` / `error.tsx` / `not-found.tsx`
- [x] RLS test suite chạy bằng JWT thật của `salesA` / `salesB` / `admin`, xác nhận cross-user đọc/ghi đều bị chặn
      → **26 test RLS** bằng JWT thật + `anon`, gọi thẳng PostgREST không qua UI. Phủ đủ 4/7 kịch bản IDOR của `docs/06 §10` (kịch bản 3, 4, 5, 6); kịch bản 1, 2, 7 thuộc Phase 6/11 vì cần route ảnh và E2E

## Phase 3 — Morning Report

> **Trạng thái 2026-08-10: ✅ 14/14 mục `[x]` — PHASE 3 ĐÃ ĐÓNG.** Mục cuối (walkthrough NFR-008) mở được
> sau khi người dùng trả lời OQ-18 bằng phương án (a): NFR-008 nới thành **≤ 8 lần chạm** (**DEC-043**), nên
> con số đo được **7 chạm / 1,8 giây** đạt cả hai vế. ISSUE-013 → **CLOSED**. Không sửa một dòng code nào.
> Bốn cổng chất lượng đã chạy thật: `npm run build` · `npm run typecheck` · `npm run lint` đều exit 0;
> `npm test` → **213/213**. Kiểm chứng Chromium 375px + 1440px: **57/58**.

- [x] `/sales/today` hiển thị tên, ngày VN, trạng thái báo cáo hôm nay và **đúng 1 CTA chính** theo trạng thái — FR-007, UC-03
      → Quyết định CTA nằm ở `lib/reports/today-cta.ts` (**hàm thuần**, 17 unit test), không nằm trong JSX. Đủ 3 trạng thái của `docs/03 §3.2`. ⚠ CTA `Xem báo cáo hôm nay` render **disabled** vì `/sales/reports/[id]` là Phase 7 — có hằng số `CTA_ROUTES_NOT_READY` đánh dấu rõ chỗ phải xoá
- [x] `/sales/today/morning` form đầu ngày: tuyến, mục tiêu viếng thăm, mục tiêu doanh số, mục tiêu doanh thu, SL khách hàng dự kiến — FR-008, UC-04
      → 6 ô (5 bắt buộc + `visit_purpose` tuỳ chọn theo DEC-029). Ô doanh thu có 3 chip cộng nhanh `+1tr/+5tr/+10tr`
- [x] Họ tên lấy từ `profiles`, hiển thị read-only, không cho nhập lại — FR-009
      → Kiểm chứng thật: **không tồn tại** `input[name="full_name"]` trong DOM
- [x] `report_date` mặc định `getVietnamToday()` theo `Asia/Ho_Chi_Minh` — FR-010, BR-005
      → `lib/date.ts` triển khai thật ở phase này (DEC-032), 33 unit test gồm biên 16:59Z/17:00Z/17:01Z và 4 timezone tiến trình
- [x] Zod schema cho form sáng: integer ≥ 0, revenue `bigint` ≤ 100.000.000.000, từ chối NaN/Infinity/chuỗi rác — BR-006, BR-017
      → `lib/validation/report.ts`, **47 test**. Schema **strip** `sales_id`/`report_date`/`status` do client gửi — có test khoá lại
- [x] Chặn tạo trùng báo cáo cùng ngày ở **cả ba tầng**: UI, Server Action, và `UNIQUE(sales_id, report_date)` — FR-011, BR-001
      → Lớp 1: RSC của `/morning` luôn query trước rồi mở chế độ SỬA (kiểm chứng thật với `sales.a`). Lớp 2: action map `23505` → `CONFLICT`. Lớp 3: constraint, đã có integration test từ Phase 2
- [x] Server Action tự kiểm tra auth → role → Zod trước khi ghi, log lỗi ở server và chỉ trả message an toàn về client — NFR-006, NFR-014
      → Đủ 7 bước của `docs/07 §1.3`. `services/reports.ts` dịch mã lỗi Postgres sang từ vựng nghiệp vụ nên `PostgrestError` thô không bao giờ lên tới UI
- [x] Sửa được báo cáo sáng khi `status = 'MORNING_SUBMITTED'` — FR-012, BR-019, UC-05
      → Kiểm chứng thật: sửa doanh số 5 → 7 xe, hiện đúng banner "Đã cập nhật cam kết sáng"
- [x] Chặn tạo báo cáo cho ngày tương lai và chặn nhập bù ngày cũ — BR-016, BR-021
      → `reportDateSchema` (unit test cho quá khứ/tương lai/ngày không tồn tại) + RLS `reports_insert_own_today` + CHECK `ck_report_not_future`
- [x] UX form: label hiển thị (không placeholder-only), `inputMode="numeric"`, `min-h-[48px] text-base`, validate on blur, error `role="alert"` ngay dưới field, autofocus field lỗi đầu tiên
      → Kiểm chứng thật trên Chromium: **mọi** input có `<label for>`, cao ≥ 48px, font ≥ 16px; validate on blur dùng **chính** schema của server
- [x] Draft localStorage khôi phục khi mất mạng hoặc đóng tab, kèm cảnh báo `beforeunload` khi form dirty — FR-035
      → `useReportDraft` dùng `useSyncExternalStore` (không `setState` trong effect). Khoá gắn với **ngày nghiệp vụ** để draft hôm qua không lọt vào form hôm nay. Kiểm chứng thật: reload trang → khôi phục + có nút "Bỏ nội dung nhập dở"
- [x] Sticky action bar full-width `h-12`, disable + spinner khi đang gửi, có `env(safe-area-inset-bottom)`
      → `min-h-12` full-width, `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`, khoá cả trong lúc chờ điều hướng để chống double submit
- [x] Trạng thái loading (skeleton >300ms), empty state và error state có nút "Thử lại"
      → Dùng lại `loading.tsx`/`error.tsx` của route group `(sales)` (Phase 2); empty state có icon + hướng dẫn + đúng 1 CTA
- [x] Walkthrough xác nhận hoàn tất báo cáo sáng ≤ 60 giây và **≤ 8 lần chạm** — NFR-008
      → Đo thật ở 375px: **7 chạm / 1,8 giây ⇒ ĐẠT cả hai vế**. Ngưỡng được nới từ “≤ 6” sang “≤ 8” ngày 2026-08-10 theo **DEC-043** (người dùng chọn phương án (a) của OQ-18). **Không có thay đổi code nào** — form giữ nguyên 5 trường bắt buộc. ISSUE-013 → CLOSED
      → **ĐÃ ĐO THẬT: 1,8 giây (đạt) · 7 lần chạm (KHÔNG đạt).** Sàn lý thuyết là 7 vì FR-008 có 5 trường bắt buộc. **Không tick** cho tới khi người dùng chọn phương án ở **OQ-18 / ISSUE-013**

## Phase 4 — Evening Report

> **Trạng thái 2026-08-07: 9/10 mục `[x]`.** Mục còn lại là **E2E Playwright** — `playwright.config.ts` và
> `e2e/*.spec.ts` **chưa tồn tại** (thuộc Phase 11), nên không được ghi PASS dưới bất kỳ hình thức nào.
> Bốn cổng chất lượng đã chạy thật: `npm run typecheck` · `npm run build` · `npm run lint` đều exit 0;
> `npm test` → **269/269**. Kiểm chứng Chromium 375px + 1440px: **62/62** (luồng cuối ngày) và
> **11/11** (hồi quy luồng đầu ngày sau refactor).

- [x] `/sales/today/evening` hiển thị lại **toàn bộ cam kết sáng** để đối chiếu trực tiếp — FR-013, UC-06
      → Dùng lại `CommitmentSummary` (đủ 4 chỉ tiêu + tuyến + mục đích). Thêm một lớp đối chiếu thứ hai: **mỗi ô nhập mang theo con số đã cam kết trong helper text** (`Cam kết sáng: 8 xe.`) để không phải cuộn lên. Kiểm chứng thật E08–E10, E16
- [x] Nhập thực đạt: đã viếng thăm, doanh số, doanh thu, SL khách hàng, ghi chú optional — FR-014
      → 6 ô (4 bắt buộc + `actual_route` + `evening_note` tuỳ chọn theo DEC-029/OQ-02). Ô doanh thu dùng lại `CurrencyField` với 3 chip cộng nhanh. Kiểm chứng thật E11–E15, E27
- [x] Zod schema cho form tối, ghi chú tối đa 1000 ký tự — BR-006, BR-017, BR-018
      → `eveningReportSchema` trong `lib/validation/report.ts`, **49 unit test mới**. Có case `'ừ'.repeat(1000)` hợp lệ và 1001 ký tự bị từ chối (đo theo **ký tự**, không theo byte). Schema **strip** `sales_id`/`report_date`/`status`/`evening_submitted_at` **và cả `target_*`** — có test khoá lại
- [x] Lưu thành công → `status = 'COMPLETED'` và ghi `evening_submitted_at` — FR-015, BR-008
      → `completeEveningReport()` ghi 4 cột `actual_*` + `evening_note` + `evening_submitted_at` + `status` trong **MỘT** câu lệnh. Kiểm chứng thật: dữ liệu persist đúng, dấu tiếng Việt nguyên vẹn, cột `target_*` **không** bị đụng tới
- [x] Chặn nhập báo cáo cuối ngày khi chưa có báo cáo đầu ngày cùng ngày (server + CHECK) — BR-007
      → Lớp 1: RSC redirect sang `/sales/today/morning` (E01). Lớp 2: Server Action trả `NO_MORNING_REPORT`. Lớp 3: `ck_completed_requires_actuals` — có test RLS bỏ qua Zod để chứng minh DB tự đứng được
- [x] Khoá báo cáo sau khi `COMPLETED` theo phương án mặc định của OQ-04; nếu người dùng chọn khác thì sửa RLS policy và trigger tương ứng — BR-019
      → OQ-04 đã chốt **KHÔNG cho sửa**, nên **không** đụng vào policy/trigger. Kiểm chứng thật E02, E33, E34 + test RLS "hoàn tất lần thứ hai bị từ chối, dữ liệu không bị ghi đè"
- [x] `guard_report_transition` chặn `COMPLETED → MORNING_SUBMITTED` và chặn đổi `sales_id` / `report_date`
      → Đã có **6 integration test từ Phase 2** và vẫn xanh. Phase 4 xác nhận thêm bằng tay: `update ... set status='MORNING_SUBMITTED'` chạy bằng role `postgres` (có `rolbypassrls`) **vẫn bị trigger từ chối**
- [x] Draft localStorage cho form tối — FR-035
      → Dùng lại `useReportDraft` sau khi nâng lên `lib/hooks/` (DEC-035); khoá gắn với ngày nghiệp vụ. Kiểm chứng thật E23–E26, E31. ⚠ Việc **xoá draft sau khi lưu** phải chuyển sang `DiscardEveningDraft` trên `/sales/today` — xem ISSUE-014 / DEC-037
- [x] Save thất bại không mất dữ liệu form, có nút retry — NFR-010
      → Kiểm chứng thật E20–E22: submit thiếu ô → ở lại trang, dữ liệu đã gõ còn nguyên, có error summary + lỗi inline `role="alert"`, nút Lưu bấm lại được ngay
- [x] E2E luồng đầy đủ Morning → Save → Reopen → Evening → Save chạy xanh trên project `mobile-375`
      → ✅ **ĐÓNG 2026-08-10 ở Phase 11.** `e2e/sales-flow.spec.ts` phủ đúng chuỗi này và xanh trên **cả ba** project (`mobile-375`, `desktop-1440`, `zalo-like`), kèm BR-019 khoá vĩnh viễn và BR-002. Đây là bộ E2E có commit, không phải script dùng-một-lần
      → **KHÔNG tick.** Luồng này **đã chạy thật đầu-cuối trên Chromium** (62/62 + 11/11), nhưng bằng **script dùng-một-lần đã xoá, không commit** — đó **không phải** bộ E2E hồi quy. `playwright.config.ts` và project `mobile-375` thuộc **Phase 11** và chưa tồn tại

## Phase 5 — KPI Engine

> **Trạng thái 2026-08-07: PHASE 5 ĐÃ ĐÓNG — 11/11 mục `[x]`.**
> Hai chốt chặn đã được người dùng trả lời và ghi thành **DEC-038**: ISSUE-008 (`percent = null`
> đúng cho **cả hai** ca, phân biệt bằng `status`) và cách `AchievementResult` mang số vượt tuyệt
> đối (`calculateAchievement` nhận thêm `metric`, trả cả `display` lẫn `surplus`).
> Bộ test khoá lại: `npm test` → **315/315 PASS** (242 unit · 40 integration · 33 RLS).
> Kiểm chứng trình duyệt thật Chromium 375px + 1440px: **36/36 PASS**.

- [x] `lib/kpi.ts` → `calculateAchievement(target, actual, metric): AchievementResult` theo công thức `actual / target × 100` — FR-016, BR-014
      → Tham số thứ ba `metric` chốt ở **DEC-038**; nó chỉ dùng để dựng chuỗi số vượt tuyệt đối, không tham gia phép tính. `percent` giữ giá trị THÔ, làm tròn 1 chữ số thập phân **chỉ** ở `display`
- [x] `getAchievementStatus(pct): 'EXCEEDED' | 'NEAR' | 'MISSED' | 'PENDING'` với ranh giới ≥100 / 80–99.99 / <80 / chưa có actual — BR-023
      → Ngưỡng xét trên số **chưa làm tròn**. `NaN` / `Infinity` cũng trả `'PENDING'` thay vì rơi vào một ngưỡng nào
- [x] Cho phép achievement > 100%, **không clamp** — BR-004
      → Kiểm chứng bằng case `(1, 125)` → `12.500,0%` hiển thị đủ, không cắt
- [x] Xử lý `target = 0` theo BR-015: `actual = 0` → `100,0%`; `actual > 0` → `percent: null` + **số vượt tuyệt đối có dấu cộng và đơn vị** (`+3 xe`, `+3.000.000 ₫`) kèm nhãn "Vượt kế hoạch". Không bao giờ ra `NaN` / `Infinity` / `∞` — OQ-11, DEC-025, DEC-038
      → ⚠ Dòng này trước đây ghi "`actual > 0` → hiển thị `—`" — đó là **đề xuất mặc định trước khi OQ-11 được trả lời**, đã lỗi thời so với BR-015 `APPROVED`. Sửa ngày 2026-08-07. Có một bài test quét **288 tổ hợp** (8 target × 9 actual × 4 metric, gồm cả `NaN`/`±Infinity`/số âm) khẳng định bất biến này
- [x] Achievement **không persist** vào DB, luôn tính runtime — BR-011, DEC-007
      → Không có cột `%` nào trong schema; có test khẳng định `calculateAchievement` là hàm pure, không phụ thuộc đồng hồ
- [x] `lib/currency.ts` → `formatCurrencyVND` bằng `Intl.NumberFormat('vi-VN')` và `parseCurrencyInput`; tiền lưu `bigint` VND nguyên — BR-010, DEC-008
      → ✅ **ĐÃ XONG SỚM ở Phase 3** (DEC-032): cả hai hàm + `formatThousands`, **36 unit test** gồm khứ hồi format→parse *(con số này từng bị ghi nhầm là 29 ở nhiều nơi — đã đo lại và sửa ở Phase 5)*
- [x] `lib/date.ts` → `getVietnamToday`, `formatVietnamDate`, `getVietnamMonthRange` bằng `Intl.DateTimeFormat`, không thêm dependency timezone — DEC-009, NFR-011
      → ✅ `getVietnamToday` + `formatVietnamDate` + `isValidVietnamDate` **đã xong ở Phase 3** (DEC-032), **33 unit test**. ⏳ **`getVietnamMonthRange` vẫn cố ý là khung ném lỗi** — nó chỉ phục vụ filter tháng của FR-021/FR-028 nên thuộc Phase 7/Phase 9. Ô này tick vì phần thuộc Phase 5 đã đủ, **không phải** vì hàm tháng đã xong
- [x] Không component nào cài lại công thức KPI hoặc format tiền — logic chỉ tồn tại một nơi — NFR-012
      → Bảng ánh xạ chỉ tiêu → đơn vị (`xe` / `điểm` / `khách` / VND) nằm **duy nhất** trong `formatMetricValue()` của `lib/kpi.ts`; nhãn badge nằm duy nhất trong `achievementLabel()`. Component chỉ ánh xạ status → màu/icon (trình bày)
- [x] Bảng đối chiếu 4 chỉ tiêu: 4 card ở mobile, `<table>` thật từ 768px, cấm cuộn ngang — DEC-019
      → `features/report-comparison/achievement-table.tsx`, gắn ở `/sales/today`. Kiểm chứng thật: 375px hiện 4 card và `<table>` bị ẩn; 1440px hiện `<table>` có `<caption>` + 4 `<th scope="row">` và card bị ẩn; số liệu hai chế độ khớp nhau; **không cuộn ngang ở cả hai**
- [x] Badge trạng thái luôn có **icon + text**, không dùng màu đơn thuần (Lucide `TrendingUp` / `Minus` / `TrendingDown` / `Clock`)
      → `features/report-comparison/achievement-badge.tsx`. Ở trạng thái `PENDING` badge cố ý **chỉ** hiện chữ "Chờ số liệu" (cột "Thực đạt" đã mang dấu `—`)
- [x] Unit test đầy đủ các biên: `target=0 & actual=0`, `target=0 & actual>0`, `actual>target`, `actual<target`, `actual=target`, `actual=null`, 79.99 / 80 / 99.99 / 100, tiền 0 / 1000 / 125000000 / 99999999999, `getVietnamToday` tại 16:59Z và 17:01Z — coverage `lib/**` ≥ 90%
      → `lib/kpi.test.ts` **46 test PASS**, phủ đủ bảng biên của `docs/08 §3.1` + `§3.2`, cộng `formatMetricValue` / `achievementLabel` / `isKpiAchievedDay` (BR-024). Các case tiền và ngày đã có sẵn từ Phase 3 (`lib/currency.test.ts` 36, `lib/date.test.ts` 33). ✅ **Coverage ĐÃ ĐO THẬT** bằng `npm run test:coverage` (v8): `lib/**` → **stmt 98,57% · branch 99,01% · func 96,43% · lines 99,11%**, đều vượt ngưỡng 90%. `lib/kpi.ts` đạt **100% cả bốn cột**. ⚠ Con số này tính trên các module `lib/` mà bộ unit **thực sự import** (`auth/routes`, `currency`, `date`, `kpi`, `reports/today-cta`, `validation/report`); `lib/hooks/`, `lib/supabase/`, `lib/env.ts`, `lib/utils.ts` không nằm trong đó vì tầng unit không với tới được chúng

## Phase 6 — 9:16 Image Export

- [x] Route Handler `GET /api/reports/[id]/share-image` sinh PNG **1080×1920** bằng `ImageResponse` (Satori), không screenshot cả trang — FR-018, DEC-010
      → `app/api/reports/[id]/share-image/route.tsx` (**`.tsx`** vì chứa JSX), `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`. Kích thước đo trên chunk `IHDR` của chính response: **1080×1920 ở cả 6 lần đo**
- [x] Route handler xác thực session, đọc report dưới RLS, và **kiểm tra `status = 'COMPLETED'`** trước khi render — BR-002
      → dùng `lib/supabase/server.ts` (anon + cookie), **không** dùng `admin.ts`. Chính chủ gọi ảnh cho báo cáo `MORNING_SUBMITTED` → **403 `NOT_COMPLETED`**; salesA gọi id của salesB → **404 `REPORT_NOT_FOUND`**, không phân biệt với id không tồn tại (chống dò ID)
- [x] Admin cũng gọi được đúng route này cho báo cáo của Sales — BR-022
      → đo thật: Admin → **200**, ảnh đúng kích thước. `getReportForShare()` **cố ý không nhận `salesId`**; lọc thêm sẽ chặn nhầm Admin
- [x] Nhúng file font `.ttf`/`.woff` có **đầy đủ dấu tiếng Việt** (subset latin + vietnamese), đọc bằng `fs` ở Node runtime
      → 3 file Inter `.ttf` (400/600/700) trong `public/fonts/`, parse bảng `cmap` xác nhận **2849 glyph**, đủ `ừ ẫ ợ ỹ đ Đ Ệ Ỡ` và `₫`. Đọc một lần mỗi tiến trình, ghim bundle bằng `outputFileTracingIncludes`
- [x] `features/report-share/daily-report-share-card.tsx` dùng chung view model với UI để số liệu không lệch, layout dark `#0B1220` với bảng token đã đo
      → tên file `kebab-case` theo `AGENTS.md §3`. Dùng chung **`lib/reports/metric-rows.ts`** với `AchievementTable` nên hai nơi không thể lệch nhau; mọi con số đi qua `lib/kpi.ts`
- [x] Header `Content-Disposition: attachment; filename="BikeForce_Report_<Ho-Ten>_<YYYY-MM-DD>.png"` và `Cache-Control: private, no-store` — FR-019
      → đo thật trên response: `BikeForce_Report_Le-Duy-Khang_2026-08-08.png`
- [x] Nút "Xuất ảnh" chỉ enable khi báo cáo đã persist với `status = 'COMPLETED'` — FR-017, UC-08
      → mạnh hơn yêu cầu: chưa `COMPLETED` thì **không render** khối nút. `EXPORT_IMAGE_NOT_READY` đã xoá
- [x] Chia sẻ qua Web Share API khi `navigator.canShare({files})`, fallback `<a download>` — FR-020, DEC-011
      → ba đường ra: share sheet → `<a download>` → mở tab mới kèm hướng dẫn "nhấn giữ để lưu" (ISSUE-003 biện pháp 2). Huỷ share sheet (`AbortError`) **không** bị coi là lỗi. Kiểm chứng được đường 2 trên Chromium (desktop không hỗ trợ chia sẻ file)
- [x] Thư viện sinh ảnh không nằm trong initial bundle client — NFR-003
      → `ImageResponse` chỉ import trong Route Handler chạy Node runtime; client không thêm dependency nào
- [x] Test edge case: tên 40+ ký tự, tuyến 300 ký tự, ghi chú 1000 ký tự, doanh thu 12 chữ số, achievement 4 chữ số (`1.250,0%`), `target=0`, dấu tiếng Việt đầy đủ (ừ ẫ ợ ỹ đ)
      → **43 unit test** ở `lib/reports/share-card.test.ts` + một tấm ảnh chứa **tất cả** các case, đã xem bằng mắt. ⚠ Đính chính mô tả cũ: `target = 0 && actual > 0` hiện `+3 điểm` (**DEC-038**), không phải `—`
- [ ] Kiểm chứng tay trên thiết bị thật trong **Zalo in-app webview**: mở app, tải ảnh, chia sẻ — ISSUE-003, NFR-009
      → **CHƯA LÀM ĐƯỢC** từ môi trường này: cần một điện thoại thật và một link công khai. Chờ sau khi deploy Vercel. Không tick bằng bất kỳ bằng chứng thay thế nào — `zalo-like` chỉ là Chromium đội `userAgent` khác
- [x] Nếu Satori không dựng nổi layout: chuyển fallback `html-to-image` … và **ghi thành DEC mới**, không sửa lén — ISSUE-002
      → **KHÔNG cần fallback.** Satori dựng đủ bố cục `docs/05 §14` ngay từ prototype đầu tiên. DEC-010 giữ nguyên, ISSUE-002 → **CLOSED**

**Ngoài kế hoạch, phát sinh khi kiểm chứng — đã xử lý trong cùng phase:**

- [x] **ISSUE-015 (P1) — middleware redirect route `/api/*` về `/login`**, khiến `fetch()` nhận HTML kèm `status 200` và lưu thành file `.png` hỏng. Sửa bằng **DEC-039**: `isApiPath()` + trả **401/403 JSON**, cộng một lớp kiểm `content-type` ở client
- [x] `CommitmentSummary` còn tự ghép chuỗi `` `${n} điểm` `` từ Phase 3 — vi phạm NFR-012, đã chuyển sang `formatMetricValue()`
- [x] Gộp bản sao thứ hai của danh sách 4 chỉ tiêu về **`lib/reports/metric-rows.ts`**, dùng chung cho `AchievementTable` và thẻ ảnh (`docs/07 §5`: hai nơi không bao giờ ra hai con số khác nhau)

## Phase 7 — Sales History

- [x] `/sales/history` liệt kê báo cáo của chính mình — FR-021, UC-09
- [x] Filter theo tháng dùng `getVietnamMonthRange(yyyyMM)`
- [x] Phân trang **server-side**, không tải toàn bộ rồi lọc ở client — NFR-002
- [x] Truy vấn dùng `idx_daily_reports_sales_date_desc`, xác nhận bằng `EXPLAIN ANALYZE`, không `select *` toàn bảng
- [x] `/sales/reports/[id]` chi tiết báo cáo của chính mình kèm bảng đối chiếu và nút xuất ảnh — FR-022, UC-10
- [x] RLS chặn Sales đọc báo cáo của Sales khác — BR-003
- [x] Empty state có icon + hướng dẫn + CTA khi tháng chưa có báo cáo nào
- [x] `/sales/account`: hồ sơ, đổi mật khẩu, đăng xuất — FR-023, UC-11
- [x] Bottom nav Sales 3 mục (Hôm nay / Lịch sử / Tài khoản) có icon **và** label, active state rõ, sidebar từ 1024px — DEC-018
- [x] Nút Back thật ở trang con, không phá back stack; giữ state filter khi quay lại
- [x] E2E bảo mật: đăng nhập `salesA` rồi mở trực tiếp `/sales/reports/<id-của-salesB>` → 404/redirect

## Phase 8 — Admin Dashboard

- [x] `/admin` hiển thị đủ **12 chỉ số bắt buộc** theo Master Spec §16 — FR-024, UC-12, AF-01
- [x] Các chỉ số tính bằng aggregate SQL server-side, không kéo toàn bộ row về client — NFR-002
- [x] Cảnh báo Sales **chưa báo cáo sáng** và Sales **đã sáng nhưng chưa hoàn tất cuối ngày** — FR-033, UC-20, AF-02
- [x] Trình bày theo Executive Dashboard: 4–6 KPI card lớn, traffic-light status, một màn hình, mobile rút gọn
- [x] `layout.tsx` của group `(admin)` chặn non-admin server-side — FR-004
- [x] Bottom nav Admin 4 mục (Tổng quan / Báo cáo / Sales / Tài khoản), sidebar cố định từ 1024px, không hiển thị đồng thời — DEC-018
- [x] Truy vấn dùng `idx_daily_reports_date_status`, xác nhận bằng `EXPLAIN ANALYZE`
- [x] Skeleton cho phần tải >300ms và empty state khi chưa Sales nào báo cáo
- [x] Kiểm tra `is_admin()` được gọi dạng `(select public.is_admin())` để Postgres nâng thành InitPlan — DEC-006, ISSUE-005

## Phase 9 — Admin Reports & Filters

- [x] `/admin/reports` danh sách toàn bộ báo cáo — FR-025, UC-13, AF-03
- [x] Filter ngày / khoảng ngày / tháng / Sales / status, và search theo tên Sales — FR-025
- [x] Filter và phân trang thực hiện **server-side** toàn bộ — FR-026, NFR-002
- [x] Search theo tên dùng `ilike` ở v1; chỉ thêm `pg_trgm` GIN khi vượt 200 Sales (ghi vào roadmap)
- [x] Mobile hiển thị card, từ 768px hiển thị `<table>` có `aria-sort`; cấm cuộn ngang — DEC-019
- [x] `/admin/reports/[id]` xem chi tiết báo cáo của Sales bất kỳ — FR-027, UC-14, AF-04
- [x] `/admin/analytics` tổng target vs actual cho **cả 4 chỉ tiêu** theo tháng, kèm % — FR-028, UC-15, AF-05
- [x] Export CSV đúng tập dữ liệu đang filter, không phải toàn bảng — FR-034, UC-21, AF-09
- [x] Biểu đồ trend theo ngày trong tháng (SHOULD, chỉ làm nếu không phát sinh dependency nặng) — FR-037, AF-08
- [x] Mọi bảng/biểu đồ có phương án `data-table` thay thế; gridline mảnh; không lạm dụng pie chart
- [x] `EXPLAIN ANALYZE` cho mọi truy vấn list mới, xác nhận đều dùng index

## Phase 10 — Sales Management

- [x] `/admin/sales` danh sách Sales kèm bảng hiệu suất: tổng doanh số, doanh thu, viếng thăm, achievement trung bình, số ngày đạt KPI — FR-029, UC-16, AF-06
- [x] "Ngày đạt KPI" tính theo BR-024 (cả 4 chỉ tiêu ≥ 100%), tính bằng aggregate SQL — OQ-17
- [x] `/admin/sales/new` tạo tài khoản Sales: email, mật khẩu tạm, họ tên, phone, mã NV — FR-030, UC-17
- [x] Việc tạo/sửa tài khoản dùng `lib/supabase/admin.ts` (service role, `import 'server-only'`) và **chỉ** gọi `auth.admin.*`; không bao giờ dùng service role để đọc/ghi `daily_reports` — DEC-005
- [x] `/admin/sales/[id]` xem hồ sơ + hiệu suất + lịch sử báo cáo, và sửa hồ sơ Sales — FR-031, UC-18
- [x] Bật/tắt `is_active`; tài khoản inactive lập tức không đăng nhập và không thao tác được — FR-032, UC-19, BR-009
- [x] Trigger `guard_profile_self_update` chặn non-admin tự đổi `role`, `is_active`, `email`, `id`
- [x] Admin **không** có quyền UPDATE lên các cột số liệu của `daily_reports` — BR-020, OQ-05
- [x] Email profile khớp `auth.users.email` và unique toàn hệ thống — BR-025
- [x] Runbook tạo Admin đầu tiên (tạo user trên Supabase Dashboard rồi `update profiles set role='ADMIN'` một lần bằng SQL editor) đã viết trong `docs/09-deployment.md`, không code UI cho việc này
- [x] Không có self-registration ở bất kỳ đâu trong app — FR-006, BR-012

## Phase 11 — Testing & Security

- [x] Vitest unit cho `lib/kpi`, `lib/currency`, `lib/date` và toàn bộ Zod schema; coverage `lib/**` ≥ 90%
- [x] Integration test DB: persist sáng → tối; vi phạm `UNIQUE(sales_id, report_date)` ném lỗi; `ck_completed_requires_actuals` chặn đúng
- [x] Integration test trigger: chặn `COMPLETED → MORNING_SUBMITTED`; chặn Sales tự đổi `role`
- [x] RLS test bằng **JWT thật** của `salesA` / `salesB` / `admin`: salesA select report của salesB → 0 rows; update → 0 rows affected; insert với `sales_id` của người khác → bị từ chối; delete → bị từ chối; admin select → có dữ liệu; user inactive → bị chặn — NFR-004
- [x] Playwright cấu hình 3 project: `mobile-375`, `desktop-1440`, `zalo-like` (userAgent webview)
- [x] E2E luồng Sales đầy đủ: Login → Today → Morning → Save → Reopen → Evening → Save → Comparison → Export
- [x] E2E luồng Admin: Login → Dashboard → Reports → Filter tháng → Filter Sales → Detail
- [x] E2E bảo mật: `GET /api/reports/<id-của-salesB>/share-image` bằng session salesA → 403/404
- [x] `@axe-core/playwright` trên `/login`, `/sales/today`, `/sales/today/morning`, `/admin`: **0 violation** mức serious/critical — NFR-007
- [x] Bước CI grep bundle client xác nhận `SUPABASE_SERVICE_ROLE_KEY` không rò rỉ — NFR-005
- [ ] Lighthouse mobile ≥ 90 và LCP < 2.5s trên 4G — NFR-001
- [x] Unit test biên múi giờ: 23:30 VN và 00:30 VN ra đúng 2 ngày nghiệp vụ khác nhau — NFR-011
- [ ] Ma trận thử tay: Chrome mobile, Safari mobile (2 phiên bản gần nhất) và **Zalo in-app browser** — NFR-009
- [x] Coverage tổng thể ≥ 60% (không đặt mục tiêu 100% để tránh test rác)

## Phase 12 — Deployment Preparation

- [x] Tạo Supabase project production region Singapore; bật email/password; **tắt** "Enable email signups"; tắt email confirmation cho tài khoản do Admin tạo — BR-012
      → `rnmywhwanpxmipqducqu`, region **`ap-southeast-1`** (Singapore). **Đo lại 2026-08-10:** `POST /auth/v1/signup` → **`422`**. Email confirmation cho tài khoản Admin tạo được bỏ qua bằng `email_confirm: true` trong `auth.admin.createUser`
- [x] Đẩy toàn bộ migration bằng `supabase db push`; **không** sửa schema bằng tay trên dashboard
      → **2026-08-10:** `npx supabase db push --linked --yes` đẩy `0006` + `0007`. `migration list --linked` cho **7/7 khớp cả hai bên**. `"seeds":[]` — seed **không** bị đẩy, đúng thiết kế. Kiểm chứng bằng đường thật: 5 RPC trả `42501 permission denied for function` cho `anon` ⇒ hàm **tồn tại** và `anon` **không execute được**
- [x] `types/database.types.ts` được regenerate và commit khớp với schema production
      → **2026-08-10:** `gen types --linked` so với bản đã commit (generate từ local) khác **đúng một khối metadata** `__InternalSupabase.PostgrestVersion` ⇒ **schema hai bên khớp**. Giữ bản local đã commit, không thay bằng bản cloud
- [x] Đặt biến môi trường trên Vercel cho cả Production / Preview / Development; `SUPABASE_SERVICE_ROLE_KEY` **chỉ** server-side, không có prefix `NEXT_PUBLIC_`
      → **2026-08-10, đã đo:** HTML `/login` trên production **không chứa** service role key, cũng không chứa chuỗi `SUPABASE_SERVICE_ROLE_KEY` (NFR-005)
- [ ] Vercel: framework preset Next.js, region `sin1`, build `next build`, Node 22
      → deploy **THÀNH CÔNG**, nhưng **region SAI**: `x-vercel-id` cho `hkg1::iad1::…` ⇒ function đang ở **Mỹ**. Đo được **~230 ms phụ trội mỗi lượt gọi DB**. **ISSUE-019** — đổi Region → `sin1` rồi **Redeploy**
- [x] Bật "Protect Preview Deployments" vì đây là app nội bộ
      → **2026-08-10:** ban đầu bảo vệ **cả Production** — mọi đường dẫn kể cả `/manifest.webmanifest` trả **302 sang `vercel.com/sso-api`**, Sales không thể dùng. Đã sửa: Preview được bảo vệ, Production công khai (bảo mật của Production là `/login` + RLS)
- [x] Chạy runbook tạo Admin đầu tiên trên production (một lần duy nhất)
      → **2026-08-10, agent tự chạy được.** `datathongdat@gmail.com` role `ADMIN`. Người dùng đã đăng nhập thật lúc 07:32, **đổi mật khẩu** lúc 07:33, và **tạo tài khoản Sales qua UC-17** lúc 07:34 — cả ba đều là bằng chứng luồng chạy thật trên production
- [x] PWA manifest + icon + `display: standalone`, Add to Home Screen hoạt động; **không** service worker offline ở v1 — FR-036, DEC-024
      → **2026-08-10 (DEC-047):** `lib/pwa/manifest.ts` (13 unit test) + `app/manifest.ts` → `/manifest.webmanifest`; 4 PNG (`any` 192/512 + `maskable` 192/512) + `app/apple-icon.png` 180 + `app/icon.svg` + `app/favicon.ico`; `theme_color` = `background_color` = **trắng**; thêm `webmanifest` vào `PUBLIC_FILE` của middleware (nếu không, manifest bị trả về HTML `/login` kèm 200 và Add to Home Screen **im lặng biến mất**). 6 bài E2E khoá lại: manifest 200 khi chưa đăng nhập · **đọc `IHDR` xác minh kích thước thật** của cả 4 icon · thẻ `<link>` trên `/login`. ⏳ Còn nợ **thao tác "Thêm vào màn hình chính" trên máy thật** — thuộc Phase 13
- [x] Xác nhận hệ thống nằm trong hạn mức Vercel Free + Supabase Free: không cron, không queue, không dùng Supabase Storage cho ảnh — NFR-013, DEC-021
      → không cron, không queue, không Realtime, không Edge Function, không Storage. Ghi ở `docs/09 §13`
- [x] Ghi rõ chính sách rollback: migration chỉ tiến tới, muốn lùi phải viết migration mới
      → `docs/09 §13 § Chính sách rollback`: code lùi bằng **Promote to Production**; schema **không có** rollback; secret thì rotate rồi cập nhật cả Vercel lẫn `.env.local`
- [ ] Smoke test trên production: đăng nhập Sales, tạo báo cáo sáng, hoàn tất cuối ngày, xuất ảnh, đăng nhập Admin xem dashboard
      → **Phần Admin: XONG 16/16** (2026-08-10). Agent dựng một tài khoản ADMIN tạm, chạy Playwright ở **375px và 1440px**: đăng nhập → `/admin` · 5 màn hình Admin đều 200 · **không cuộn ngang ở cả hai bề rộng** · không `NaN`/`undefined` · không lỗi console · Admin mở `/sales/today` bị đưa về `/admin` (FR-004). Tài khoản tạm đã xoá, `auth.users` trở lại đúng 2 user thật
      → **CÒN LẠI: luồng Sales** — tạo báo cáo sáng + hoàn tất cuối ngày + xuất ảnh. **Cố ý chưa làm:** BR-013 cấm xoá báo cáo, nên một báo cáo thử sẽ nằm lại production **vĩnh viễn**. Việc này người dùng tự làm bằng tài khoản Sales thật
- [ ] Cập nhật `WORKLOG.md`, `SESSION_CHECKPOINT.md`, `PROJECT_CHECKLIST.md` và toàn bộ `docs/` khớp với hệ thống đã deploy

---

## Phase 13 — Nhận diện thương hiệu & soát UI/UX (MỞ 2026-08-10)

> **Vì sao có phase này:** ngày 2026-08-10 người dùng cung cấp **logo chính thức** (xe đạp cam,
> chữ hiệu xanh, nền trắng) và yêu cầu đưa tone màu trang web về đúng logo, rồi soát lại toàn bộ
> thiết kế bằng skill `ui-ux-pro-max` — **ưu tiên cực cao cho điện thoại và laptop**. Phần *đổi màu*
> đã làm xong ngay trong phiên; phần *soát toàn hệ thống* được cất lại đây để **deploy đi trước**.
>
> Skill `ui-ux-pro-max` đã được **tải thật** về `~/.claude/skills/ui-ux-pro-max`
> (github.com/nextlevelbuilder/ui-ux-pro-max-skill, v2.13.0). Hai file cần đọc khi làm phase này:
> `.claude/skills/ui-ux-pro-max/references/quick-reference.md` (98 guideline, §1–§3 là CRITICAL/HIGH)
> và `references/pro-rules.md` (Pre-Delivery Checklist chuẩn).
> ⚠ **`--design-system` của skill khớp NHẦM cho sản phẩm này** — nó trả về pattern
> "Newsletter / Content First" kèm bảng màu **đỏ** và font Atkinson Hyperlegible. Đừng dùng phần đó:
> màu đã do người dùng chốt (DEC-046), font đã chốt từ DEC-013. **Chỉ dùng phần checklist.**

### 13a. Đã XONG trong phiên 2026-08-10

- [x] Đo contrast thật cho hai màu logo → phát hiện cam `#E9A04F` chỉ **2,19:1** và xanh `#197DC3`
      thiếu **0,09** so với AA → chốt quy tắc "giữ sắc, chỉnh độ sáng" — **DEC-046**
- [x] Thay 12 token trong `app/globals.css`; toàn bộ cặp màu **đạt AA/AAA khi đo**
- [x] `components/ui/brand-mark.tsx` — logo SVG inline (`BrandMark` + `BrandLockup`), toạ độ sinh
      cùng nguồn với bộ icon nên **không thể lệch hình**
- [x] Gắn logo vào 3 chỗ: `/login` (lockup lớn) · header hai route group (ẩn từ 1024px) · sidebar
- [x] Bộ icon PWA vẽ lại theo hình xe của logo (cam trên trắng)
- [x] `docs/05 §4.1–§4.4` và `§15` viết lại theo bảng màu mới

### 13b. Soát UI/UX — ✅ ĐÃ LÀM 2026-08-10 (trừ mục cần thiết bị thật)

> **Cách làm:** dựng một bộ soát Playwright **dùng-một-lần** (`e2e/zz-ui-audit.spec.ts`, đã xoá,
> không commit — đúng thông lệ Phase 2–6) đo bằng MÁY trên **20 URL × 2 bề rộng**, gồm cả các URL
> mang `?month=` để rơi vào nhánh CÓ dữ liệu. Bốn nhóm luật CRITICAL/HIGH được đo trực tiếp trên DOM
> đã render, không phải đọc code đoán.

- [x] **Quét MỌI cặp nền × chữ thực tế chồng nhau trong DOM** — bài học ISSUE-018
      → **ĐẠT.** Đo `getComputedStyle` của từng phần tử CÓ text node riêng, nền lấy bằng cách **leo
      cây tổ tiên** tới màu đầu tiên không trong suốt — tức đúng cặp mắt người nhìn thấy, không phải
      cặp token trên giấy. **Tổng ~2.400 cặp**, **0 cặp dưới ngưỡng**; tỉ lệ thấp nhất toàn hệ thống
      là **4,68:1** (ngưỡng AA là 4,5). Bảng màu DEC-046 giữ nguyên, không phải sửa token nào
- [x] **Soát guideline của skill trên toàn bộ route** ở `mobile-375` và `desktop-1440` — bảng
      ĐẠT/KHÔNG ĐẠT ở `WORKLOG.md` Entry 016. **Bắt được 1 lỗi THẬT**: `horizontal-scroll`
- [x] Đọc `references/quick-reference.md` (10 nhóm) + `references/pro-rules.md` trước khi soát
- [x] **`horizontal-scroll` (CRITICAL) — TÌM RA LỖI THẬT, đã sửa.** Bảng số liệu trong `<details>`
      của biểu đồ trend **tràn ngang 116px ở 375px** sau khi DEC-050 đổi doanh số sang tiền. Sửa
      bằng **DEC-052** (thẻ ở mobile, `<table>` từ 768px — đúng pattern DEC-019).
      ⚠ **Bài học:** lượt soát ĐẦU TIÊN báo "0 phát hiện" vì `<details>` đang **đóng** — nội dung
      gập lại không tham gia layout. **Soát bố cục phải mở mọi `<details>` trước khi đo**
- [x] **`touch-target-size` (CRITICAL)** → **ĐẠT.** 9–60 phần tử tương tác mỗi trang, **0** phần tử
      dưới 44px chiều cao
- [x] **`readable-font-size`** → **ĐẠT.** Không `<input>` nào dưới 16px (iOS sẽ tự phóng to), không
      chữ nào dưới 12px
- [x] **Chứng minh phép đo có chạy, không "xanh oan".** Mỗi trang xuất kèm bộ đếm
      (`interactive=… contrastPairs=… minRatio=…`). "0 phát hiện" chỉ có nghĩa khi biết mẫu số —
      một selector gõ sai cũng cho 0 phát hiện
- [x] **Đo cả FORM NHẬP.** Lượt đầu bỏ sót: tài khoản dùng để soát đã `COMPLETED` nên BR-019 đá nó
      khỏi cả hai form, và hai route cho ra **cùng một con số đếm** — chính dấu hiệu đó làm lộ ra
      chuyện này. Đã soát lại bằng tài khoản chưa báo cáo: form sáng **20**, form tối **21** phần
      tử tương tác, **0 vi phạm**
- [x] Kiểm `prefers-reduced-motion` và **`dynamic-type`**
      → `prefers-reduced-motion` đã có sẵn quy tắc toàn cục trong `app/globals.css`; spinner mới
      thêm `motion-reduce:animate-none`. `dynamic-type`: phóng `font-size` gốc lên **150%** rồi đo
      lại — **bố cục không vỡ, không tràn ngang**
- [x] Quyết định về cam logo trong thẻ ảnh 9:16 → **GIỮ `#FBBF24`.** Trên nền `#0B1220` cả hai đều
      AAA nên không phải lỗi; đổi sang `#E9A04F` chỉ để "đồng bộ" sẽ buộc kiểm lại toàn bộ biên của
      thẻ ảnh mà không được gì đo được
- [x] Quyết định về biến thể nút `accent` → **KHÔNG thêm.** Luật `primary-action` chỉ cho **một** CTA
      chính mỗi màn hình; thêm một biến thể nút nổi bật thứ hai là mời gọi vi phạm chính luật đó.
      Cam vẫn giữ đúng vai trò logo + nền
- [x] **Xem tận mắt** ở 375px — ✅ **2026-08-10.** Chụp toàn bộ 10 màn hình rồi **mở ra nhìn**, và
      kết luận thẳng: giao diện lúc đó **phẳng, không có nhịp thị giác, màu cam thương hiệu gần như
      không xuất hiện**. Đó là điều mà 4 nhóm luật đo được (tương phản/cỡ chạm/tràn ngang/cỡ chữ)
      **không thể phát hiện** — chúng trả lời "có vi phạm không", không trả lời "có đẹp không"

### 13d. THIẾT KẾ LẠI GIAO DIỆN — DEC-053 (2026-08-10)

> **Vì sao có mục này:** sau khi 13b báo "0 vi phạm", người dùng phản hồi *"tôi chẳng thấy giao diện
> thay đổi gì hết, vẫn xấu i chang"*. Phản hồi đó **đúng**. 13b chỉ **đo tuân thủ** chứ chưa **thiết
> kế**; báo cáo kết quả đo như thể đã trả lời câu hỏi thẩm mỹ là một lỗi thật của phiên trước.
>
> Hướng đi tra từ skill, không tự nghĩ: product type *CRM & Client Management* →
> **Flat + Minimalism** (nền, đã có) + **Soft UI Evolution + Micro-interactions** (lớp còn thiếu).
> Style đó ghi rõ *WCAG AA+, bo 8–12px, chuyển động 200–300ms* ⇒ **cộng thêm** vào DEC-012/DEC-046,
> không thay thế. **Bảng màu logo giữ nguyên tuyệt đối.**

- [x] **Ba nhóm token MỚI** trong `app/globals.css`: chiều sâu (`--shadow-*`, mỗi bậc **hai lớp**,
      cộng `--shadow-brand` mang màu thương hiệu) · bo góc (`--radius-*`, 10/14/18/24px + pill) ·
      chuyển động (`--ease-out-soft`, `rise-in`, `shimmer`). **Không đụng một token màu nào**
- [x] **`Card`** tách lớp bằng **bóng mềm** thay vì viền mảnh — viền cũ chỉ **1,22:1** so với nền,
      ngoài nắng gần như không thấy, và đó là nguyên nhân gốc của cảm giác "một mảng trắng phẳng"
- [x] **`Button`**: chuyển sắc nhẹ + bóng thương hiệu, bóng **xẹp** khi nhấn · biến thể **`accent`**
      (cam logo, chữ TỐI 8,17:1) dùng **đúng một chỗ**: nút "Xuất ảnh báo cáo"
- [x] **`Input`/`Textarea`**: cao **52px** (từ 48px), nền **chìm**, **bật trắng + vòng sáng** khi
      focus. Ô nhập trắng-trên-trắng cũ trông như khối chữ chỉ đọc, không "mời gõ"
- [x] **`ProgressBar` (MỚI)** — thanh đọc-nhanh cho từng chỉ tiêu. **Thay đổi có ích nhất cho người
      dùng thật**: Sales không còn phải tự so `90.000.000 ₫` với `100.000.000 ₫` trong đầu
- [x] **`Skeleton`** đổi sang shimmer quét ngang — nhấp nháy độ mờ đọc ra như "hỏng"
- [x] **Header dính trên + kính mờ** · **bottom nav kính mờ + gạch chỉ báo** ở tab đang mở
- [x] **Ô chỉ số Admin**: con số **lên trước và to hẳn**, traffic-light thành **vạch màu bên trái**
      thay vì bọc con số trong mảng màu
- [x] **`/login`** — form vào thẻ nổi trên nền chuyển sắc thương hiệu
- [x] **`e2e/ui-quality.spec.ts` — hàng rào tự động, ĐƯỢC COMMIT.** Khác mọi bộ soát dùng-một-lần
      của Phase 2–6, vì `bg-card/85` trông y hệt `bg-card` cho tới khi đo. Chạy ở **mobile-375 và
      desktop-1440**, mang theo **bốn cái bẫy đã sập một lần** (mở `<details>` · đi vào nhánh có dữ
      liệu · dùng tài khoản vào được form · xuất **bộ đếm** để "0 vi phạm" có mẫu số)
- [x] **Kiểm chứng lại sau khi đổi**: quét lại toàn bộ ở hai bề rộng — **0 vi phạm** cả bốn nhóm luật
- [ ] Thao tác **"Thêm vào màn hình chính" trên máy thật** (Chrome Android + Safari iOS): icon đúng,
      mở ra **không có thanh địa chỉ**, splash trắng liền mạch — nợ từ Phase 12. **Cần thiết bị thật**

### 13e. `/login` CHIA ĐÔI · ĐĂNG XUẤT THÀNH POPOVER — DEC-054 (2026-08-10)

> **Vì sao có mục này:** sau 13d, người dùng gửi **hai ảnh chụp bản deploy** kèm yêu cầu *"trang đăng
> nhập và chỗ hiện nút đăng xuất quá xấu, thiết kế lại giao diện cho đẹp hơn, ưu tiên điện thoại và
> laptop"*. Cả hai màn hình đó đều **đã xanh** ở mọi phép đo của 13b/13d — lại một lần nữa xác nhận
> *"không vi phạm" ≠ "đẹp"*.

- [x] **`/login` chia đôi từ `lg`**: cột trái là mặt thương hiệu (nền `heading`, headline, **ba** gạch
      đầu dòng soi được về chức năng v1), cột phải là form. Dưới `lg` cột trái **biến mất hoàn toàn**
      — không thu nhỏ, không xếp chồng, để 375px không phải cuộn qua gì trước khi thấy ô Email
- [x] **Sửa lỗi chữ hiệu logo 1:1** — `BrandLockup` có `tone='inverse'`. Bản đầu để `text-heading`
      #0B4A76 trên nền #0B4A76 ⇒ **chữ biến mất hoàn toàn**; không phép đo nào bắt được vì WCAG miễn
      trừ logotype. **Chỉ lộ ra khi chụp ảnh ra nhìn**
- [x] **Thẻ form có vạch màu `h-1.5`** ở mép trên (`primary → secondary → accent`), bo `rounded-xl`,
      `shadow-lg`
- [x] **Nút hiện/ẩn mật khẩu** — `type="button"`, `aria-label` đổi theo trạng thái, `aria-pressed`,
      vùng chạm **52×52px**, mặc định luôn ẩn
- [x] **Banner lỗi/lý do có ICON**, không chỉ có màu (rule `color-only`)
- [x] **Đăng xuất ở header: dải ngang toàn màn hình ⇒ popover `w-72` neo vào nút**, có mũi nhọn.
      Kèm **Esc đóng · chạm ra ngoài đóng · focus vào Huỷ khi mở, trả về nút khi đóng**
- [x] **Hai nút của popover xếp DỌC** — bản `grid-cols-2` làm chữ "Đăng xuất" **gãy hai dòng**, và
      nới bề rộng không cứu được vì nhãn lúc gửi còn dài hơn ("Đang đăng xuất…")
- [x] **`SignOutSubmit` (MỚI)** — nút gửi dùng chung, chấm dứt việc bản header có `useFormStatus()`
      còn bản `/…/account` thì không
- [x] **Khối xác nhận ở `/…/account`** thành khối có viền + nền cảnh báo nhạt, thay hàng trần ba mảnh
      rời (câu hỏi · nút đỏ · chữ "Huỷ" trông như liên kết)
- [x] **Logo header vào ô bo góc `bg-accent/15`** ở cả hai route group
- [x] **`agentRules: false`** trong `next.config.ts` — Next 16 tự chèn khối `nextjs-agent-rules` vào
      cuối `AGENTS.md` mỗi lần `next dev` chạy, mà `AGENTS.md` là **tài liệu điều khiển**
- [x] **Kiểm chứng bằng MẮT**: chụp **7 màn hình × 2 bề rộng** (375 / 1440) trên bản `next build` +
      `next start`, nhìn từng ảnh. **Bắt được 2 lỗi thật** mà không phép đo nào thấy: chữ hiệu 1:1 và
      nút gãy hai dòng
- [x] **Quality gate**: typecheck ✅ · lint ✅ (0 error 0 warning) · build ✅ · `npm test` **745/745** ·
      `npm run e2e` **121 passed / 5 skipped / 0 failed** (gồm quét axe `/login` và hàng rào DEC-053
      ở cả `mobile-375` lẫn `desktop-1440`). ⚠ Lượt E2E **đầu** bị huỷ vì Docker chết giữa chừng
      (ISSUE-024 tái diễn); lượt chạy lại trên **đúng cây mã ấy** xanh đủ

### 13c. YÊU CẦU MỚI CỦA NGƯỜI DÙNG — ghi ngày 2026-08-10, kèm 4 ảnh chú thích tay

> ⚠ **ĐỌC MỤC NÀY TRƯỚC KHI SỬA BẤT KỲ DÒNG NÀO.** Sáu yêu cầu dưới đây **không cùng hạng**:
> hai cái là giao diện thuần, một cái là đổi nhãn, còn **ba cái đụng thẳng vào business rule đã
> `APPROVED` và vào schema database** — chúng cần **migration `0008`** và **DEC mới**, không được
> sửa lén (CLAUDE.md §6, §11).
>
> ⚠ **Bốn ảnh chú thích tay KHÔNG lưu được thành file** — agent không có công cụ ghi ảnh từ hội
> thoại ra đĩa. Vì vậy mỗi ảnh được **mô tả lại nguyên văn** dưới đây; đó là bản ghi chính thức.

#### Ảnh 1 — form báo cáo đầu ngày (`/sales/today/morning`)

Thấy trong ảnh, theo thứ tự từ trên xuống: dòng gợi ý *"Ví dụ: Quận 1 → Quận 3 → Bình Thạnh."* ·
ô **"Mục đích chuyến đi"** với helper *"Không bắt buộc. Tối đa 300 ký tự."* · ô **"Mục tiêu điểm
viếng thăm \*"** helper *"Số điểm dự kiến ghé trong ngày. Tối đa 1.000."* · ô **"Mục tiêu doanh số \*"**
helper *"Số xe dự kiến bán trong ngày. Tối đa 10.000."*

**Chú thích tay:** một gạch đỏ ngang **xuyên qua ô "Mục đích chuyến đi"** ⇒ **BỎ HẲN trường này**.

#### Ảnh 2 — cận cảnh ô "Mục tiêu điểm viếng thăm"

Helper hiện tại: *"Số điểm dự kiến ghé trong ngày. Tối đa 1.000."*
**Chú thích tay:** gạch bỏ cụm *"Tối đa 1.000."*, viết đè bằng mực đỏ: **"Tối thiểu 10"**.

#### Ảnh 3 — `/sales/today` sau khi đã cam kết sáng

Thứ tự khối **hiện tại**: card trạng thái ("Lê Duy Khang" · badge "Đã cam kết") → **"Cam kết và thực
đạt"** (bảng 4 chỉ tiêu: Viếng thăm 10 điểm · Doanh số 50 xe · Doanh thu 5.000.000 ₫ · Khách hàng
10 khách, cột "Thực đạt" đều là `—`, badge "Chờ số liệu") → **"Tuyến và ghi chú"** (Tuyến kế hoạch:
*Bến Tre* · Mục đích chuyến đi: *test*).

**Chú thích tay:** một mũi tên đỏ dài khoanh tròn khối **"Tuyến và ghi chú"** và kéo nó **LÊN TRÊN**,
đặt **trước** khối "Cam kết và thực đạt".

#### Ảnh 4 — `/admin/sales/[id]`, khối "Hiệu suất Tháng 08/2026"

Bốn dòng: Viếng thăm 9/10 điểm (90,0% Gần đạt) · Doanh số 10/50 xe (20,0% Chưa đạt) · Doanh thu
5.000.000 ₫ / 5.000.000 ₫ (100,0% Vượt mục tiêu) · **Khách hàng** 10 khách / 10 khách (100,0%).

**Chú thích tay:** viết thêm mực đỏ chữ **"đã gặp"** ngay sau chữ "Khách hàng" ⇒ nhãn phải thành
**"Khách hàng đã gặp"**.

---

#### Nhóm A — ✅ XONG 2026-08-10 (DEC-051)

- [x] **Thêm hiệu ứng loading cho thao tác của người dùng.**
      → **`components/ui/link-spinner.tsx` (MỚI)** dùng `useLinkStatus()` của Next, đặt **bên trong**
      `<Link>`. `loading.tsx` chỉ hiện **sau khi** Next bắt đầu render trang đích; quãng từ lúc chạm
      tới đó trên 4G là khoảng lặng khiến Sales bấm lại lần hai (`tap-feedback-speed` < 100 ms).
      Nút Đăng xuất dùng `useFormStatus()` → khoá + "Đang đăng xuất…" (`loading-buttons`).
      Hai form báo cáo **đã có sẵn** `isBusy` + `aria-busy` từ Phase 3/4 — kiểm lại, không sửa
- [x] **Nút Đăng xuất ở góc trên bên phải.**
      → Có ở **cả hai** route group. Vấn đề 375px nêu dưới đây được giải chứ không bỏ qua: dưới
      640px nút **chỉ có icon** + `aria-label` (44px thay vì ~120px), `shrink-0`; khối tên có
      `min-w-0` + `truncate`. Panel xác nhận rơi xuống **dưới** thanh header nên không vỡ hàng
      ngang. Ghi chú cũ trong hai layout đã được **xoá và thay bằng lý do mới** để tài liệu không
      mâu thuẫn code. Bản ở `/sales/account` + `/admin/account` **giữ nguyên**
      ⚠ Hiện tại **cố ý không có** — Phase 7 và Phase 8 đã chuyển Đăng xuất vào `/sales/account` và
      `/admin/account`, lý do ghi ngay trong `app/(sales)/layout.tsx`: *"giờ đã có tab Tài khoản thì
      để thêm một nút đăng xuất ở header là hai đường tới cùng một hành động, và nó chiếm mất chỗ
      của tên người dùng trên màn hình 375px"*. Người dùng nay yêu cầu ngược lại ⇒ **được**, nhưng
      phải **giải quyết đúng vấn đề bề rộng 375px** đã nêu (đừng đẩy tên người dùng bị cắt), và
      **xoá ghi chú cũ** trong hai layout để tài liệu không mâu thuẫn code.
- [x] **Ảnh 3 — đưa "Tuyến và ghi chú" lên TRƯỚC "Cam kết và thực đạt"** ở `/sales/today`.
      → Đã đổi, và **đồng bộ luôn `/sales/reports/[id]` và `/admin/reports/[id]`** để ba màn hình
      cùng trình bày một báo cáo không bắt người dùng học ba bố cục

#### Nhóm B — ✅ XONG 2026-08-10

- [x] **Ảnh 4 — "Khách hàng" → "Khách hàng đã gặp".**
      → Sửa **đúng một chỗ**: `lib/reports/metric-rows.ts`. Đổi đồng loạt bảng đối chiếu web, phân
      tích tháng, biểu đồ trend và cột CSV. Phát sinh thêm: `KpiMetricRow` có thêm **`shortLabel`**
      cho thẻ ảnh 9:16 (cột nhãn bề rộng cố định, Satori không tự thu nhỏ chữ được) — nhãn rút gọn
      vẫn nằm trong **cùng một nguồn duy nhất**, không phải component tự cắt chuỗi.
      ⚠ Cũng phát hiện `commitment-summary.tsx` **viết cứng** bốn nhãn thay vì đọc `KPI_METRIC_ROWS`
      — đã sửa; nếu không, màn hình đó sẽ âm thầm nói khác ba màn hình còn lại
      Sửa ở **`lib/reports/metric-rows.ts`** — nguồn DUY NHẤT của "4 chỉ tiêu là gì". Sửa một chỗ là
      đổi đồng loạt: bảng đối chiếu web, thẻ ảnh 9:16, phân tích tháng, biểu đồ trend, cột CSV.
      **Đừng sửa rải rác trong component.** Có unit test khoá nhãn — cập nhật test cùng lúc.
      Cân nhắc đơn vị hiển thị: hiện là `10 khách`; "khách hàng đã gặp" thì `10 khách` vẫn đọc được.

#### Nhóm C — ✅ XONG 2026-08-10 (DEC-048 · DEC-049 · DEC-050 · migration `0008`)

> Ba mục dưới đây **mâu thuẫn với quyết định đã `APPROVED`**. Người dùng đã yêu cầu trực tiếp nên
> chúng hợp lệ, **nhưng quy trình bắt buộc là**: viết `DEC-048`/`DEC-049`/`DEC-050` nêu rõ thay thế
> điều gì → cập nhật `docs/01` (FR/BR) và `docs/02` (schema) → viết migration `0008_*.sql` → sửa
> code → sửa test. **Migration chỉ tiến tới** (AGENTS.md §13); không sửa file `0001`–`0007`.

- [x] **Ảnh 1 — BỎ trường "Mục đích chuyến đi" (`visit_purpose`).** → **DEC-048.** Người dùng chọn **GIỮ CỘT, bỏ khỏi form và khỏi mọi chỗ hiển thị** (BR-013 cấm xoá dữ liệu). `0008` chỉ thêm `comment on column` đánh dấu DI SẢN, KHÔNG `drop column`.
      **Mâu thuẫn:** OQ-01/OQ-02 → **DEC-029 (APPROVED)** chốt *"giữ **cả hai**: cột số bắt buộc +
      cột text tuỳ chọn"*. Bỏ `visit_purpose` là lật đúng nửa sau của DEC-029.
      **Đụng tới:** cột `visit_purpose` trên `daily_reports` · `morningReportSchema` ·
      `morning-report-form.tsx` · `report-notes.tsx` · thẻ ảnh 9:16 · CSV xuất của Admin ·
      `/sales/reports/[id]` · `/admin/reports/[id]` · test của cả 4 tầng.
      **Quyết định phải chốt trước khi code:** xoá cột hẳn, hay giữ cột và chỉ bỏ khỏi giao diện?
      Dữ liệu cũ đã nhập (production đang có một báo cáo ghi `test`) sẽ mất nếu drop cột — mà
      **BR-013 cấm xoá dữ liệu báo cáo**. Nghiêng về **giữ cột, bỏ khỏi form và khỏi mọi chỗ hiển
      thị**, ghi rõ lý do trong DEC.
- [x] **Ảnh 2 — "Mục tiêu điểm viếng thăm": TỐI THIỂU 10.** → **BR-026 + DEC-049.** Chốt **giữ trần, thêm sàn** = `[10, 1000]`, và sàn **chỉ áp cho `target`** — `actual` vẫn từ 0 vì đi được ít hơn cam kết là kết quả thật.
      **Đụng tới:** CHECK constraint trên `daily_reports` · hằng số miền giá trị trong
      `lib/validation/report.ts` · helper text · unit test biên (bảng biên `docs/08 §3.1`).
      **Phải hỏi lại người dùng:** *"tối thiểu 10"* là **thay** giới hạn trên hay **thêm** giới hạn
      dưới? Nếu bỏ hẳn trần thì một lỗi gõ phím (`10000`) sẽ vào thẳng database và làm hỏng mọi phép
      tổng hợp của Admin. **Đề xuất: giữ trần, thêm sàn** — `>= 10 và <= 1.000`, helper ghi
      *"Tối thiểu 10 điểm."*
- [x] **Ảnh 1 — ĐỔI NGHĨA "Doanh số" và "Doanh thu", cả hai thành TIỀN.** → **OQ-19 đã được trả lời đủ 3/3 và triển khai bằng DEC-050.** 19a: **bỏ hẳn** đếm xe, giữ đúng 4 chỉ tiêu · 19b: **tiền THU HỒI được**, BR-014 giữ nguyên · 19c: **`null`** cho dòng trước `0008`, bằng cách thêm **cặp cột MỚI** `*_sales_amount` chứ không đổi kiểu cột cũ.
      Yêu cầu nguyên văn: *"Doanh số là doanh số bán hàng trong ngày (cho nhập số tiền), doanh thu là
      doanh thu công nợ khách hàng (cho nhập số tiền)"*.
      **Đây là thay đổi NẶNG NHẤT trong ba mục.** Mâu thuẫn:
      **OQ-03 + BR-006 (APPROVED)** — *"Doanh số = **số lượng xe** (integer)"*;
      **OQ-14 (APPROVED)** — *"Doanh thu = giá trị đơn hàng chốt trong ngày"* (nay đổi thành **thu
      hồi công nợ**, một khái niệm hoàn toàn khác).
      **Đụng tới:** kiểu cột `target_sales_quantity` / `actual_sales_quantity` **`integer` → `bigint`
      VND** (migration + chuyển đổi dữ liệu cũ) · `lib/kpi.ts` bảng đơn vị (`xe` → tiền) ·
      `formatMetricValue` · `formatCompactVND` trên thẻ ảnh · `CurrencyField` thay ô số thường ·
      chip cộng nhanh · CSV · 5 hàm SQL aggregate của `0006`/`0007` (cộng tiền chứ không cộng cái) ·
      **toàn bộ bài test có số liệu mẫu**.
      **Ba câu phải hỏi người dùng TRƯỚC khi động vào code — ghi thành `OQ-19`:**
      1. **Số lượng xe bán ra có còn được theo dõi nữa không?** Nếu còn thì thành chỉ tiêu **thứ 5**
         (phá "4 chỉ tiêu" của BR-024 và của `metric-rows.ts`); nếu bỏ hẳn thì đội Sales xe đạp
         không còn số liệu nào đếm xe.
      2. **"Doanh thu công nợ" là tiền THU HỒI được trong ngày, hay là công nợ CÒN LẠI?** Hai cái
         ngược nhau về ý nghĩa "đạt/không đạt": thu hồi càng nhiều càng tốt, công nợ còn lại càng ít
         càng tốt — và BR-014 (`actual/target × 100`) chỉ đúng với vế thứ nhất.
      3. **Dữ liệu cũ trên production xử lý sao?** Đang có một báo cáo với `sales_quantity = 50 xe`.
         Đọc nó thành `50 ₫` là sai; migration phải quyết định rõ (đặt `NULL`, hay giữ nguyên và ghi
         chú, hay chuyển đổi theo một quy tắc do người dùng chốt).
---

---

## Phase 14 — Gỡ sửa cam kết sáng · Thẻ ảnh 9:16 đổi nội dung, đổi màu, tách hai biến thể (MỞ 2026-08-11)

**Nguồn:** 4 lượt yêu cầu trực tiếp của người dùng trong phiên 2026-08-11 (kèm 3 ảnh chú thích tay).
**Quyết định:** DEC-055 · DEC-056 · DEC-057 · DEC-058 · DEC-059 · DEC-060 · **DEC-061 · DEC-062 · DEC-063 · DEC-064**. **BR-002 được NỚI** (DEC-058).

### 14a. Gỡ hẳn "Sửa cam kết sáng" — DEC-055

- [x] `lib/reports/today-cta.ts` — `secondaryCta: null` ở `MORNING_SUBMITTED`; xoá khoá `EDIT_MORNING`
- [x] `canOpenMorningForm()` rút về `report === null`; `/sales/today/morning` `redirect()` khi đã có báo cáo
- [x] Xoá Server Action `updateMorningReport` (`features/report-morning/actions.ts`)
- [x] Xoá hàm service `updateMorningReport()` (`services/reports.ts`)
- [x] Xoá chế độ `edit` của form sáng (`mode`, `reportId`, input ẩn `report_id`, nhãn "Lưu thay đổi")
- [x] Xoá thông báo `MORNING_UPDATED` khỏi `lib/reports/messages.ts`
- [x] Cập nhật `lib/reports/today-cta.test.ts` — thêm bất biến "mở form ⇔ chưa có báo cáo"
- [x] Cập nhật `e2e/sales-flow.spec.ts` — kiểm **không còn** link "Sửa cam kết sáng" và URL bị đá về
- [x] Giữ nguyên policy `reports_update_own_open` *(nó phục vụ luồng cuối ngày — đừng gỡ)*

### 14b. Nội dung thẻ ảnh — DEC-056

- [x] `shortLabel` của `REVENUE`: `'Công nợ'` → `'Doanh thu'` (đổi ở **đúng một nơi**: `metric-rows.ts`)
- [x] `lib/kpi.calculateCustomerWorkRate()` — hàm thuần + 9 unit test (gồm lưới 64 tổ hợp chống `NaN`/`∞`)
- [x] Khối "DOANH THU THỰC ĐẠT" → **"SỐ KHÁCH LÀM VIỆC"** + dòng phụ `'5 khách / 10 điểm'`
- [x] `'—'` khi `actual_visit_points = 0` hoặc chưa có số liệu — không bao giờ `∞`

### 14c. Bảng màu sáng cho thẻ ảnh — DEC-057

- [x] Dùng skill `ui-ux-pro-max` (phần checklist accessibility/color), **không** dùng `--design-system`
- [x] Đo contrast **21 cặp màu** bằng công thức WCAG 2.x trước khi viết code — cặp thấp nhất **5,04:1**
- [x] Viết lại `daily-report-share-card.tsx` với bảng màu DEC-046 (nền trắng, xanh `#0B4A76`, cam `#E9A04F`)
- [x] Sọc nền chẵn/lẻ `#F4F7FA` thay đường kẻ 1px (chịu được nén ảnh của Zalo)
- [x] Cập nhật ghi chú đầu `app/globals.css` — không còn "bảng hex dark cố định"

### 14d. Hai tấm ảnh mỗi ngày — DEC-058

- [x] `ShareCardVariant` + `shareCardVariantForStatus()` + `SHARE_IMAGE_LABEL` ở `lib/reports/share-card.ts`
- [x] Bản `MORNING`: bảng 2 cột, nhịp dòng lớn, không có khối tỉ lệ, có câu nhắc "kết quả gửi cuối ngày"
- [x] `shareImageFileName()` nhận `variant` **bắt buộc** — hai tấm cùng ngày không được trùng tên file
- [x] `TodayView.canExportImage` → `shareImageVariant`; hai trang gọi `ShareImageButton` cập nhật theo
- [x] Route ảnh bỏ nhánh `403 NOT_COMPLETED`; biến thể do `status` **đã persist** quyết định
- [x] Nhãn nút: "Lưu hình báo cáo đầu ngày" (sáng) · "Xuất ảnh báo cáo" (chiều)

### 14e. Nhãn ô nhập

- [x] "Mục tiêu số lượng khách hàng" → **"Mục tiêu số lượng khách hàng sẽ gặp"** (form + thông báo lỗi Zod)

### 14f. Quality gate

- [x] `npm run typecheck` — exit 0
- [x] `npm run lint` — 0 error, 0 warning
- [x] `npx next build` — 18 route
- [x] `npm test` đủ 3 project — **765/765** (unit 575 · integration 57 · rls 133)
- [x] `npm run e2e` — **121 passed / 5 skipped / 0 failed**, 4,9 phút
- [x] **Nhìn tận mắt**: render PNG thật cả hai biến thể, phát hiện bản sáng rỗng đáy, sửa, render lại
- [ ] Kiểm ảnh trong Zalo trên điện thoại thật — ISSUE-003, cần thiết bị thật

### 14g. Sửa hồi quy do DEC-055 gây ra — DEC-059 (E2E bắt được)

- [x] Lượt E2E đầu: **3/3 project đỏ** ở `expect(getByText('Đã lưu báo cáo đầu ngày'))`
- [x] Chẩn: RSC của `/sales/today/morning` render lại sau Server Action → `redirect()` **không kèm `?saved=`** → đè mất `router.replace()` của client
- [x] `saveMorningReport` chuyển sang **tự `redirect()`** (đúng khuôn DEC-037)
- [x] `MorningReportState` rút về **chỉ nhánh lỗi**; `isBusy` rút về `isPending`
- [x] **`DiscardMorningDraft`** — component mới, dọn draft trên `/sales/today`
- [x] Bỏ `revalidatePath(MORNING_REPORT_PATH)` — chính trang đang mở, không còn gì để làm mới
- [x] Chạy lại đủ 4 cổng: typecheck · lint · build · test 765 · e2e 121

### 14h. Sửa hai lỗi người dùng báo trên production — DEC-060 (ISSUE-027, ISSUE-028)

- [x] **ISSUE-027 (P1)** — nút xuất ảnh **im lặng trên điện thoại**: đường dự phòng nằm trong `catch` của `anchor.click()`, mà hàm đó không bao giờ ném lỗi
- [x] **ISSUE-027 (P1)** — **share sheet vô dụng trên máy tính**: `canShare` trả `true` trên Windows nhưng không có Zalo
- [x] Viết lại `share-image-button.tsx` theo 3 nguyên tắc: share chỉ cho `pointer: coarse` · không nhánh nào im lặng · luôn có lối không-cần-JS
- [x] Thiết bị cảm ứng: share hỏng → **điều hướng thật** (`Content-Disposition: attachment`), không dùng `<a download>`
- [x] Thêm link "Mở ảnh trực tiếp" — chạy được cả khi webview chặn hết automation (ISSUE-003)
- [x] **`e2e/share-image.spec.ts` (MỚI)** — 4 bài **bấm thật**, bắt sự kiện `download`
- [x] **ISSUE-028 (P3)** — a11y `/login` đỏ-rồi-xanh do đua với `animate-rise-in`; sửa bằng `contextOptions.reducedMotion = 'reduce'`
- [x] Chạy lại đủ: typecheck · lint · build · `npm test` **765/765** · `npm run e2e` **130 passed / 8 skipped / 0 failed**

### 14i. Ảnh phải tới được THƯ VIỆN, không chỉ tới thư mục Tải xuống — DEC-061 + DEC-062 (ISSUE-029)

**Nguồn:** người dùng báo trên production ngày 2026-08-11, **ngay sau khi DEC-060 đóng ISSUE-027**:
*"nút lưu hình ảnh báo cáo không lưu về thư viện ở android hay ứng dụng ảnh ở ios mà thấy nó tải về
xong nó tự động lưu ở đâu đó giờ tôi kiếm không ra"*. Cộng hai yêu cầu tiếp theo trong cùng phiên:
*"triển khai thêm nút gửi qua zalo ở giao diện điện thoại"* và *"áp dụng được cho cả android và ios"*.

- [x] **Xác định đúng gốc:** trang web **không có API nào** ghi vào Thư viện ảnh Android/iOS — giới
      hạn hệ điều hành, không phải thiếu sót sản phẩm. Chỉ còn 2 đường, đều cần thao tác tay
- [x] Route ảnh nhận **`?view=1`** → `Content-Disposition: inline` (mặc định vẫn `attachment`)
- [x] `shareImageViewPath()` + `SHARE_IMAGE_VIEW_PARAM` ở `lib/reports/share-card.ts`
- [x] Nhánh dự phòng của điện thoại: **hiện ảnh trong trang** (`<img …?view=1>`) + câu "nhấn giữ để
      lưu" — **không** còn `window.location.href`, không sinh file lạc
- [x] Link lối-thoát đổi sang `?view=1` và đổi nhãn thành "Mở ảnh ở tab mới" (tránh trùng nghĩa với
      nút mới)
- [x] **Nút "Gửi cam kết/kết quả qua Zalo"** (`accent`) — `navigator.share({ files })`, hỏng thì hướng dẫn 3 bước. Nhãn **chia theo biến thể** để giữ thông tin DEC-058 đã đặt vào nhãn cũ
- [x] **Nút "Lưu vào thư viện ảnh"** (`secondary`) — hiện ảnh ngay, **không chờ mạng**
- [x] Tách điện thoại/máy tính bằng **CSS `pointer-coarse:`**, không bằng JS → không nhấp nháy nhãn
      khi hydrate; hai class đặt lên **thẻ bọc** vì `cn()` không có `tailwind-merge`
- [x] **Nạp trước ảnh trên thiết bị cảm ứng** (`useEffect` + `ref`) — điều kiện sống còn của **iOS**:
      Safari đòi quyền hạn từ cú chạm còn hiệu lực khi gọi `navigator.share()`
- [x] Nhãn nút ở `lib/` (`SEND_TO_ZALO_LABEL`, `SAVE_TO_GALLERY_LABEL`), không rải trong component
- [x] `e2e/share-image.spec.ts`: **+4 bài** — bố cục nút theo thiết bị · nút thư viện hiện ảnh ·
      nhánh không-share-sheet phải HIỆN ảnh và **không rời trang** · route `inline` vs `attachment`
- [x] `e2e/sales-flow.spec.ts` cập nhật theo nhãn nút mới (`exportButtonFor()`)
- [x] **Nhìn tận mắt** ảnh chụp 375px: hai nút + trạng thái đã hiện ảnh xem trước
- [ ] Nhấn giữ → "Lưu ảnh" trên **điện thoại thật** (Android + iOS) — gộp với ISSUE-003, cần thiết bị

### 14j. Admin sửa được hồ sơ của chính mình — DEC-063

**Nguồn:** người dùng yêu cầu trực tiếp: *"tài khoản admin chỗ tài khoản, hồ sơ của bạn có thể thay
đổi được họ và tên, số điện thoại, mã nhân viên"*.

- [x] Phát hiện mâu thuẫn thật: `/admin/account` bảo Admin "hãy liên hệ Admin", mà UC-18 lọc
      `role = 'SALES'` nên **không màn hình nào** sửa được hồ sơ Admin
- [x] `lib/validation/profile-fields.ts` **(MỚI)** — ba trường hồ sơ dùng chung với form UC-18, tránh
      hai bản ràng buộc trôi khỏi nhau (và tránh vòng import `account.ts` ↔ `sales-account.ts`)
- [x] `updateOwnProfileSchema` ở `lib/validation/account.ts` — **chỉ** 3 trường, cố ý không có
      `email` / `role` / `is_active`
- [x] `services/profiles.updateOwnProfile()` — tách khỏi `updateSalesProfile()` vì đi qua **policy
      khác** (`profiles_update_self`) và không có bộ lọc `role = 'SALES'`
- [x] `features/account/actions.updateOwnProfileAction` — thứ tự AGENTS.md §8, chặn `role !== 'ADMIN'`
      **ở Server Action** (RLS không phân biệt vai), `revalidatePath('/admin', 'layout')` vì tên hiển
      thị nằm ở header của layout
- [x] `features/account/own-profile-form.tsx` **(MỚI)** — khuôn theo `EditSalesForm`; email + vai trò
      để dạng `<dl>` chứ **không** `<input disabled>` (rule `read-only-distinction`)
- [x] `/sales/account` **giữ nguyên `ProfileCard` chỉ đọc** — hồ sơ Sales do Admin quản lý
- [x] `OWN_PROFILE_MESSAGES` ở `lib/account/messages.ts` (KHÔNG đặt trong file `'use server'` —
      ISSUE-016)
- [x] **Không cần migration**: `profiles_update_self` + `guard_profile_self_update()` đã có từ Phase 2
- [x] `lib/validation/account.test.ts` **(MỚI)** — 13 unit test, gồm bài khoá **bề mặt tấn công**:
      schema bỏ qua `role` / `is_active` / `email` dù client gửi lên
- [x] `tests/rls/profiles.rls.test.ts` **+4 bài** — trong đó có bài ghi rõ **tầng DB vẫn cho Sales tự
      sửa họ tên**, để không ai bỏ dòng kiểm vai với lý do "RLS lo rồi"
- [x] `e2e/admin-flow.spec.ts` **+3 bài** — sửa & tải lại thấy đổi thật · không có ô nhập cho
      email/role · SĐT sai định dạng bị chặn
- [x] `e2e/a11y.spec.ts` **+1 bài** — quét axe `/admin/account`: trang này **đổi bản chất** (chỉ đọc →
      form + khối `<dl>` chỉ đọc trong cùng thẻ `<form>`), đúng kiểu bố cục dễ sinh nhãn mồ côi
- [x] **Nhìn tận mắt** `/admin/account` ở 375px

### 14k. Quality gate của 14i + 14j

- [x] `npm run typecheck` — exit 0
- [x] `npm run lint` — 0 error, 0 warning
- [x] `npx next build` — 18 route
- [x] `npm test` đủ 3 project — **784/784** (unit 590 · integration 57 · rls 137)
- [x] `npm run e2e` — **150 passed / 12 skipped / 0 failed**, 5,1 phút *(162 bài, có 8 bài MỚI của DEC-061/062/063)*

### 14l. Logo bị cắt mất đáy hai bánh xe — ISSUE-030

- [x] Đo được nguyên nhân thật, không đoán: `getBBox()` + nửa bề rộng nét ⇒ hình ở `y ∈ [13,07 · 87,93]`, `viewBox` cũ dừng ở `75`
- [x] Xác nhận `app/icon.svg` và bốn `public/icons/*.png` **KHÔNG** dính lỗi (khung 512×512 có đệm) — không phải sinh lại bộ icon
- [x] `viewBox="0 13.07 101 74.86"` trong `components/ui/brand-mark.tsx`, **giữ nguyên toàn bộ `d=`**
- [x] Luật E2E thứ năm `logo-clipped` + thuộc tính mốc `data-brand-mark` + bộ đếm `marks > 0`
- [x] `docs/12` (ISSUE-030) · `docs/05` (§15 bộ icon, §14.6 hàng rào) · `docs/08` (§13.3 danh sách luật)
- [x] `npm run typecheck` — exit 0
- [x] `npm run lint` — 0 error, 0 warning
- [x] `npm run build` — 21 route
- [x] `npx vitest run --project unit` — **590/590**, 1,96 giây
- [x] Luật `logo-clipped` chạy thật trên DOM `/login` ở `375px` và `1440px` — **3/3 logo trọn hình**
- [x] **Nhìn tận mắt** ảnh chụp `/login` ở `375px` và `1440px` — hai bánh xe tròn đủ
- [ ] `npm run e2e` đủ 3 project với luật mới — *cần Supabase local + tài khoản seed, chưa chạy trong phiên này*

### 14l. Bỏ thao tác ẩn: ảnh luôn hiện, mọi việc bằng NÚT — DEC-064 (+ ISSUE-003)

**Nguồn:** hai phản hồi liên tiếp của người dùng sau khi DEC-061/062 lên production:
*"tôi không thích cách phải giữ ảnh mới tải xuống hay chuyển ảnh đi được, vì nếu làm vậy những người
'mù công nghệ' sẽ không biết làm"* · *"cách hiển thị ảnh trước khi gửi cho người dùng coi trước tôi
rất thích nhưng tôi cần nút tải ảnh (bấm vào là tải được ảnh) và nút gửi ảnh zalo bấm vào là cho
mình chọn nơi chuyển"* · *"mở link ngay trong zalo sẽ không thể tải ảnh hay chuyển ảnh qua zalo"*.

- [x] **Ảnh xem trước LUÔN hiện** ngay khi mở trang, mọi thiết bị — không còn nấp sau một cú bấm
- [x] Nút "Lưu vào thư viện ảnh" → **"Tải ảnh về máy"**, bấm một cái là **tải thật** (`<a download>`
      + `blob:` chạy trên Chrome Android và Safari iOS 13+)
- [x] Nút tải ảnh nay có ở **cả hai** thiết bị, cùng một nhãn; máy tính bỏ nhãn theo biến thể
- [x] **Xoá sạch mọi câu dạy "nhấn giữ vào ảnh"** — kể cả trong dòng trạng thái của nhánh dự phòng
- [x] Nhãn nút quay về mô tả **hành động**; việc "đang cầm tấm nào" do ảnh xem trước gánh
- [x] **ISSUE-003** — webview của Zalo: nhận ra bằng **capability** (`typeof navigator.share !==
      'function'` trên máy cảm ứng), KHÔNG sniff `userAgent`
- [x] Đường vòng 1: **"Sao chép ảnh để dán vào Zalo"** (`ClipboardItem` `image/png`) — giữ người
      dùng ở trong Zalo; nút chỉ render khi trình duyệt thật sự hỗ trợ
- [x] Đường vòng 2: hướng dẫn bấm `⋮` / `•••` → **"Mở trong trình duyệt" / "Mở trong Safari"**
- [x] `<img onError>` — webview chặn cả hiển thị thì nói ra, không để người dùng nhìn ô vỡ
- [x] Sau khi bấm tải trong webview bị khoá: **mở sẵn khối đường vòng** vì `anchor.click()` không
      bao giờ ném lỗi nên KHÔNG thể biết lệnh tải có chạy không (bài học DEC-060)
- [x] `e2e/share-image.spec.ts` viết lại: ảnh hiện sẵn · **không còn chữ "nhấn giữ"** · nút tải bấm
      là tải thật trên điện thoại · khối đường vòng hiện khi thiếu Web Share
- [x] `e2e/sales-flow.spec.ts` cập nhật theo nhãn nút mới
- [x] **Nhìn tận mắt** ở 375px: trạng thái bình thường **và** trạng thái webview bị khoá; kiểm bằng
      DOM chứ không chỉ bằng ảnh (ảnh `fullPage` ghép sticky header gây hiểu nhầm)
- [ ] Thử hai đường vòng trên **Zalo thật** (Android + iOS) — ISSUE-003, cần thiết bị

### 14m. Quality gate của 14l

- [x] `npm run typecheck` — exit 0
- [x] `npm run lint` — 0 error, 0 warning
- [x] `npx next build` — 18 route
- [x] `npm test` — **784/784**
- [x] `npm run e2e` — **153 passed / 12 skipped / 0 failed**, 4,6 phút *(165 bài, có 3 bài MỚI của DEC-064)*

## Phase 15 — Hệ phản hồi loading thống nhất (ĐÓNG 2026-08-11, DEC-065)

- [x] Dùng `ui-ux-pro-max`: chạy query loading/accessibility/z-index + guideline Next.js
- [x] `Button loading/loadingText`: spinner · disabled · `aria-busy` · `role=status`
- [x] `RouteLoading` dùng chung cho `(sales)` và `(admin)`, skeleton không làm nhảy bố cục
- [x] Điều hướng chính, CTA, quay lại, đổi tháng, phân trang, bảng chi tiết có pending tức thì
- [x] Tất cả Server Action/form chính có loading đúng hành động
- [x] Khối xuất ảnh phân biệt `share/download/copy`, không để cả ba nút nói cùng một việc
- [x] Form lọc dùng `next/form` + `useFormStatus`, URL GET vẫn deep-link được
- [x] Unit render loading primitives — **592/592 unit test PASS**
- [x] Full Vitest unit + integration + RLS — **786/786 PASS**
- [x] `npm run typecheck` — exit 0
- [x] `npm run lint` — 0 error, 0 warning
- [x] `npm run build` — 20 route
- [x] E2E loading mới — **6/6 PASS** trên 3 project; full regression — **159 passed / 12 skipped / 0 failed**
- [x] Nhìn tận mắt 375px + 1440px, gồm pending link và route skeleton; không tràn ngang
- [x] Commit tính năng **`668835d`** + push `origin/main`

## Phase 16 — Báo cáo Admin cho dữ liệu lớn (DEC-066)

- [x] URL không có bộ lọc thời gian mặc định tháng hiện tại theo giờ Việt Nam
- [x] `period=all` là lựa chọn tất cả thời gian tường minh; ưu tiên ngày → khoảng → tháng → all → hiện tại
- [x] Tìm Sales và điều hướng tháng luôn hiện; bộ lọc nâng cao đóng mặc định; có chip bỏ riêng điều kiện
- [x] Mobile một cột; desktop dạng hàng/lưới; không dùng client fetch, infinite scroll hay virtualization
- [x] Phân trang hiện phạm vi, đầu/trước/cụm trang/sau/cuối và ô nhảy trang; link giữ nguyên filter
- [x] Service giữ 20 dòng/trang, `report_date DESC, id DESC`, lọc PostgreSQL và CSV tối đa 5.000 dòng
- [x] Helper/filter/pagination unit liên quan — **102/102 passed**
- [x] Integration + RLS liên quan — **38/38 passed**, fixture **100.002 báo cáo** + `EXPLAIN ANALYZE`
- [x] Full Vitest — **802/802 passed** (32 file)
- [x] `npm run typecheck` và `npm run lint` — exit 0
- [x] `npm run build` — exit 0, 20 route
- [x] Kiểm trực quan 375×812 và 1440×900 — không thấy tràn ngang, advanced đóng mặc định
- [x] E2E Admin — **36/36 passed** trên `mobile-375`, `desktop-1440`, `zalo-like`
- [x] DEC-066 + docs UI/data flow/testing + checklist/worklog/checkpoint đã cập nhật

## Bảo trì UI — ISSUE-031

- [x] Xác định `md:items-end` trên hai cột khác số hàng là nguyên nhân ô tìm kiếm bị tụt
- [x] Cân lại lưới desktop, control tìm kiếm và tháng cùng vị trí/cùng chiều cao
- [x] Giữ mobile một cột, touch target ≥ 44px và không cuộn ngang
- [x] Thêm E2E `desktop-1440` đo bounding box; bài tái hiện đỏ 2px rồi xanh **1/1**; mobile xanh **1/1**
- [x] Kiểm trực quan production build ở 1440×900 và 375×812; preview tạm đã xoá
- [x] `npm run typecheck`, full `npm run lint` và `npm run build` — exit 0
- [x] `docs/05`, `docs/08`, `docs/12`, checklist, worklog và checkpoint đã cập nhật

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
