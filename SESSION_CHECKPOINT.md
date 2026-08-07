# BikeForce Session Checkpoint

> Status: ACTIVE | Phase: 5 (ĐÃ ĐÓNG 11/11) → sẵn sàng Phase 6 | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

Đây là file **quan trọng nhất** để một session hoàn toàn mới tiếp tục công việc mà không phải làm
lại từ đầu. Đọc file này ngay sau `BIKEFORCE_MASTER_SPEC.md`.

---

## Current State

**Current Phase:** `PHASE 5 — KPI Engine` — **ĐÃ ĐÓNG, 11/11 mục `[x]`** (2026-08-07).
Phase 0, Phase 1, Phase 2 đã đóng. Phase 3 còn 1 mục treo chờ người dùng (OQ-18); Phase 4 còn 1 mục
chờ bộ E2E của Phase 11.

**Current Task:** **Bắt đầu PHASE 6 — Xuất ảnh 9:16 (FR-018, DEC-010).**

> ✅ **Hai chốt chặn của Phase 5 đã ĐÓNG.** Người dùng trả lời ngày 2026-08-07, ghi thành
> **DEC-038**: (1) `AchievementResult.percent = null` đúng cho **cả hai** ca, phân biệt bằng
> `status`; (2) `calculateAchievement()` nhận thêm tham số `metric` và trả về **cả** `display` đã
> format **lẫn** `surplus` thô. `lib/kpi.ts` nay **có thân thật** và là nguồn duy nhất của công
> thức KPI — Phase 6 phải **gọi lại** nó, không tự tính `%` và không tự ghép đơn vị (NFR-012).

> ⏳ **Hai việc chờ người dùng, KHÔNG chặn Phase 6:**
> 1. **Rotate service role key** (ISSUE-011, P1) — key đã lọt vào transcript hội thoại.
> 2. **OQ-18 / ISSUE-013** — NFR-008 đặt "≤ 6 lần chạm" nhưng FR-008 có 5 trường bắt buộc nên sàn
>    lý thuyết là 7; đo thật **7 chạm / 1,8 giây**. Ba phương án ở `docs/01 § OQ-18`.
>    **Đừng tự chọn hộ**, và **đừng bỏ bớt trường bắt buộc** để ép con số xuống.

**Phase 3 + Phase 4 + Phase 5 đã làm được gì (tóm tắt cho session mới):**

| Hạng mục | Trạng thái |
|---|---|
| `/sales/today` | ✅ FR-007 thật — badge trạng thái, cam kết 4 chỉ tiêu, **đúng 1 CTA chính** theo `status` |
| `/sales/today/morning` | ✅ UC-04 (tạo) + UC-05 (sửa) — cùng một form, hai Server Action |
| `/sales/today/evening` | ✅ **FR-013 + FR-014 thật (Phase 4)** — đối chiếu cam kết sáng + 6 ô thực đạt + `status → COMPLETED` |
| `lib/date.ts` · `lib/currency.ts` | ✅ Triển khai thật (DEC-032). **`getVietnamMonthRange` vẫn là khung** — Phase 7 |
| `lib/kpi.ts` | ✅ **Thân thật (Phase 5)** — 5 hàm thuần, 46 unit test, **coverage 100%** cả bốn cột |
| Bảng đối chiếu 4 chỉ tiêu | ✅ **`features/report-comparison/` (Phase 5)** — 4 card ở < 768px, `<table>` thật từ 768px (DEC-019), gắn ở `/sales/today` |
| Test | ✅ **315/315** (**242** unit · **40** integration · 33 RLS) |

> ⚠ **Sửa số liệu:** checkpoint này trước đây ghi `189 unit · 47 integration`. Tổng `269` **đúng**
> nhưng cách chia **sai** — con số thật trước Phase 5 là `196 · 40 · 33`. Nguồn lệch:
> `lib/currency.test.ts` có **36** test chứ không phải 29, và file đó chưa từng bị sửa từ Phase 3.
> Đo lại bằng `npx vitest run --project <ten>`. Chi tiết ở `WORKLOG.md` Entry 008 mục Errors 3.

**Supabase cloud đã nối xong:**

| Hạng mục | Giá trị |
|---|---|
| project-ref | `rnmywhwanpxmipqducqu` |
| Tên | `BikeForce_Bicycle Sales Management` |
| Region | **`ap-southeast-1`** (Singapore) ✅ |
| Trạng thái | `ACTIVE_HEALTHY`, Postgres `17.6.1.155`, GoTrue `v2.195.0` |
| Migration | ✅ Cả 5 file đã `db push` thành công. **Seed KHÔNG được đẩy** (`seeds: []`) |
| Tự đăng ký | ✅ **Đã tắt** — `POST /auth/v1/signup` → `422 signup_disabled` (BR-012, FR-006) |
| Deny-by-default | ✅ `anon` đọc `profiles`/`daily_reports` → `401` + `42501 permission denied` |
| `types/database.types.ts` | ✅ Generate bằng `--linked`. Khác bản `--local` đúng một khối metadata ⇒ **schema hai bên khớp** |

> ⚠ **ISSUE-011 (P1) — service role key đã lọt vào transcript hội thoại**, cần **rotate**. Key chưa
> từng vào git (`git log -S "sb_secret" --all` → 0 kết quả). Nhờ DEC-031, key đó không đọc/ghi được
> `profiles` và `daily_reports`; bán kính giới hạn ở `auth.admin.*`.

**Current Branch:** `main` — remote `origin` =
`https://github.com/LeDuyKhangZz/BikeForce-Bicycle-Sales-Management.git` (DEC-028).
`origin/main` đã đồng bộ tới `61271ac`.

> ⚠ **`git push` KHÔNG chạy được từ phía agent** (phát hiện 2026-08-07). Credential helper là
> Git Credential Manager và môi trường không có TTY nên push luôn fail
> (`could not read Username for 'https://github.com'`), kể cả khi tắt sandbox.
> **Đây là giới hạn kỹ thuật, không phải thiếu quyền** — quyền push đứng vẫn còn hiệu lực.
> Cách làm: agent **commit bình thường**, rồi **báo người dùng tự chạy `git push origin main`**.

---

## Completed

### Phase 0 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 001 + 002

Bộ 17 tài liệu kiểm soát dự án; 21 UC · 37 FR · 15 NFR · 25 BR · 15 AF; DEC-001..DEC-030; ISSUE-001..ISSUE-007;
**17/17 OPEN QUESTION đã được người dùng trả lời**; git init + push GitHub; đo contrast toàn bộ palette.

### Phase 1 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 003

Next.js 16.3.0 + TypeScript 6.0.3 + Tailwind v4 + ESLint 9.39.5 (pin sau smoke test ISSUE-004);
cấu trúc DEC-023; 3 Supabase client + `lib/env.ts`; design token DEC-014; font Inter; khung
`lib/kpi|currency|date`; 6 primitive UI; baseline build/typecheck/lint xanh.

### Phase 2 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 004

- **Supabase local chạy thật** bằng Docker + Supabase CLI 2.111.0. Cả 5 migration apply thành công.
- **5 migration** `0001_init_enums_profiles.sql` → `0005_indexes.sql`: 2 enum, 2 bảng, 20 cột trên
  `daily_reports`, 16 constraint, 7 function, 6 trigger, 6 RLS policy, 3 index hiệu năng.
- **`supabase/seed.sql`** (LOCAL ONLY): 4 tài khoản + 22 báo cáo phủ đủ các nhánh hiển thị.
- **`types/database.types.ts` generate thật** (259 dòng), không còn placeholder.
- **Tầng auth đầy đủ**: `lib/auth/{routes,messages}.ts`, `lib/validation/auth.ts`,
  `services/profiles.ts`, `features/auth/{queries,actions,login-form,sign-out-button}`,
  `middleware.ts`, `/login`, guard cho `(sales)` và `(admin)`, `app/page.tsx` phân luồng theo role.
- **Bộ test đầu tiên của dự án**: `vitest.config.mts` với 3 project và 8 file test.
- **Kiểm chứng bằng công cụ thật**: build/typecheck/lint exit 0 · `npm test` **80/80** ·
  Chromium **32/32** ở 375px và 1440px · tài khoản inactive **6/6**.

### Phase 3 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 006

- **`lib/date.ts` + `lib/currency.ts` triển khai thật** (DEC-032 — kéo lên sớm từ Phase 5 vì
  `report_date` của FR-010 không có đường nào khác). 33 + 29 unit test.
- **`lib/validation/report.ts`** — `morningReportSchema` + `reportDateSchema`, **47 test**. Schema
  **strip** `sales_id`/`report_date`/`status` do client gửi; một schema gánh cả chuỗi `FormData` lẫn số.
- **`lib/reports/today-cta.ts`** — bảng ba trạng thái FR-007 dưới dạng **hàm thuần**, **17 test**.
- **`lib/reports/messages.ts`** — chuỗi thông báo của luồng báo cáo, dùng chung cho Phase 4.
- **`services/reports.ts`** — `getTodayReport` / `insertMorningReport` / `updateMorningReport`.
- **`features/report-morning/`** — 2 Server Action, form client, `useReportDraft`, `CurrencyField`
  (3 chip cộng nhanh), `CommitmentSummary`.
- **3 route Sales** + **3 primitive UI mới** (`Textarea`, `FormField`, `buttonClassName`).
- **Kiểm chứng bằng công cụ thật**: build/typecheck/lint exit 0 · `npm test` **213/213** ·
  Chromium **57/58** ở 375px và 1440px (mục lệch duy nhất: NFR-008 — ISSUE-013).

### Phase 4 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 007

- **`eveningReportSchema`** thêm vào `lib/validation/report.ts` — **49 test mới** (file này giờ 96
  test). 4 chỉ số `actual_*` **bắt buộc** khớp `ck_completed_requires_actuals`; `actual_route` và
  `evening_note` tuỳ chọn. Strip cả `target_*` — form tối **không** được sửa cam kết sáng.
- **`completeEveningReport()`** trong `services/reports.ts` — ghi 4 cột `actual_*` + `evening_note`
  + `evening_submitted_at` + `status` trong **MỘT** câu lệnh (CHECK đánh giá trên dòng sau lệnh).
- **`features/report-evening/`** — `saveEveningReport`, `evening-report-form.tsx`,
  `discard-evening-draft.tsx`.
- **`/sales/today/evening`** thành FR-013 + FR-014 thật. Guard: chưa có cam kết sáng →
  `/sales/today/morning` (BR-007); đã `COMPLETED` → `/sales/today` (BR-019).
- **Ba thứ nâng lên tầng dùng chung** (DEC-035, DEC-036): `useReportDraft` → `lib/hooks/` ·
  `CurrencyField` → `components/ui/` · `authorizeSalesWrite()` → `features/auth/queries.ts`.
- **`tests/rls/report-service.rls.test.ts`** — 7 test chạy service dưới **JWT thật**.
- **Kiểm chứng bằng công cụ thật**: typecheck/lint/build exit 0 · `npm test` **269/269** ·
  Chromium **62/62** (cuối ngày) và **11/11** (hồi quy luồng sáng) ở 375px và 1440px.

### Phase 5 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 008

- **Chốt hai chốt chặn TRƯỚC khi viết code** — ISSUE-008 và phần cài đặt còn để ngỏ của DEC-025,
  ghi thành **DEC-038**. ISSUE-008 nay `CLOSED`.
- **`lib/kpi.ts` có thân thật**, thay khung ném lỗi từ Phase 1. Năm hàm thuần:
  `calculateAchievement(target, actual, metric)` · `getAchievementStatus(pct)` ·
  `formatMetricValue(value, metric)` · `achievementLabel(result)` · `isKpiAchievedDay(results)`.
- **`lib/kpi.test.ts` — 46 test**, gồm một bài quét lưới **288 tổ hợp** khoá bất biến BR-015
  (không bao giờ `NaN` / `Infinity` / `∞`).
- **`features/report-comparison/` — feature MỚI**: `achievement-table.tsx` (hai chế độ hiển thị
  DEC-019) · `achievement-badge.tsx` (status → tone + icon Lucide) · `report-notes.tsx` (phần chữ).
- **`/sales/today`** thay danh sách cam kết một cột bằng bảng đối chiếu thật.
- **Kiểm chứng bằng công cụ thật**: typecheck/lint/build exit 0 · `npm test` **315/315** ·
  `npm run test:coverage` → `lib/**` stmt **98,57%** / branch **99,01%** / lines **99,11%** ·
  Chromium **36/36** ở 375px và 1440px.

---

## Currently Working On

**Không có công việc code nào đang dở.** Phase 5 đã dừng ở một trạng thái sạch: mọi thứ đã viết đều
đã chạy thật và đã có test.

---

## Not Started

- **Phase 6 → Phase 12:** chưa bắt đầu. Chưa có route handler ảnh 9:16, chưa có màn hình Admin
  thật, chưa có lịch sử báo cáo, chưa có màn hình chi tiết `/sales/reports/[id]`.
- **Test còn thiếu:** `playwright.config.ts` và toàn bộ `e2e/*.spec.ts` (Phase 11);
  `tests/integration/indexes.test.ts` với `EXPLAIN ANALYZE` (Phase 11).

**Những thứ Phase 3 + Phase 4 CỐ Ý chưa làm** (đúng kế hoạch, không phải thiếu sót):

| Thứ chưa làm | Thuộc phase | Vì sao chưa làm |
|---|---|---|
| `getVietnamMonthRange()` | Phase 7 / 9 | Chỉ phục vụ filter tháng FR-021/FR-028; hành vi với chuỗi sai định dạng chưa chốt |
| Nút "Xuất ảnh" hoạt động thật | Phase 6 | Nút đã render nhưng luôn `disabled`; cờ `EXPORT_IMAGE_NOT_READY` đánh dấu chỗ phải xoá |
| `/sales/reports/[id]` | Phase 7 | CTA "Xem báo cáo hôm nay" render **disabled**; tập `CTA_ROUTES_NOT_READY` đánh dấu chỗ phải xoá |
| Bottom nav / sidebar DEC-018 | Phase 7, 8 | — |
| UC-17/18/19 quản lý tài khoản | Phase 10 | `lib/supabase/admin.ts` vẫn chưa được gọi ở đâu cả — đúng thiết kế |

> `/admin` hiện vẫn là **trang tối thiểu của Phase 2**, chỉ để luồng đăng nhập có đích đến thật và
> test được — FR-024 (Phase 8) mới là nội dung thật. `/sales/today` **đã được thay bằng FR-007 thật ở
> Phase 3**. Điều này đã ghi ngay trong comment đầu mỗi file.

---

## Known Issues

Chi tiết đầy đủ ở `docs/12-known-issues.md`. **Còn 9 OPEN, 5 đã CLOSED.**

| ID | Sev | Status | Nội dung |
|---|---|---|---|
| ISSUE-001 | P1 | **CLOSED** | 17/17 OQ đã được trả lời |
| ISSUE-002 | P2 | OPEN | Satori (`next/og`) chỉ hỗ trợ tập con CSS + cần font có dấu tiếng Việt → Phase 6 |
| ISSUE-003 | P2 | OPEN | Zalo in-app webview chưa kiểm chứng trên thiết bị thật → Phase 6 |
| ISSUE-004 | P2 | **CLOSED** | TS 7 + ESLint 10 đã vỡ thật; pin `typescript@6.0.3` + `eslint@9.39.5` |
| ISSUE-005 | P3 | OPEN | `is_admin()` thêm một truy vấn `profiles` mỗi câu lệnh. Đã viết dạng `(select public.is_admin())`; **chưa đo `EXPLAIN`** → Phase 11 |
| ISSUE-006 | P3 | **CLOSED** | Không xử lý gì quanh ngày nghỉ ở v1 |
| ISSUE-007 | P3 | OPEN | Chưa có audit log; chỉ cần nếu mở quyền sửa sau `COMPLETED` |
| ISSUE-008 | P3 | **CLOSED** | `docs/01` mâu thuẫn về khi nào `AchievementResult.percent = null` — **đã chốt 2026-08-07 bằng DEC-038**, kiểm chứng bằng 46 unit test + 36 phép kiểm trình duyệt |
| ISSUE-009 | P3 | OPEN | **MỚI** — Next 16.3 deprecate tên `middleware.ts`, khuyến nghị `proxy.ts`. Cố ý hoãn, có điều kiện kích hoạt |
| ISSUE-010 | P3 | OPEN | **MỚI** — máy đang chạy **3 stack Supabase local**; chọn nhầm container đã xảy ra thật |
| ISSUE-011 | **P1** | OPEN | service role key lọt vào transcript hội thoại do IDE tự đồng bộ `.env.local`. **Phải rotate.** Chưa vào git |
| ISSUE-012 | P3 | OPEN | **MỚI** — sau `supabase db reset`, GoTrue + Kong không tự phục hồi → đăng nhập nhận `502` dù `docker ps` báo `healthy`. Có lệnh khắc phục đã kiểm chứng |
| ISSUE-013 | P3 | OPEN | NFR-008 (≤ 6 chạm) mâu thuẫn với FR-008 (5 trường bắt buộc). Đo thật **7 chạm / 1,8 giây**. **Cần người dùng quyết định — OQ-18** |
| ISSUE-014 | P2 | **CLOSED** | **MỚI** — lưu cuối ngày thành công nhưng mất banner + draft không bị xoá, do re-render RSC của route hiện tại sau Server Action. Sửa bằng **DEC-037** |

---

## Important Business Decisions

Danh sách đầy đủ DEC-001..DEC-034 ở `docs/11-decisions.md`. Những điều một session mới **bắt buộc
phải biết**:

**Kiến trúc & bảo mật**

- **DEC-003** — Server Components để **đọc**, Server Actions để **ghi**; **không** REST API riêng cho
  CRUD báo cáo. Route Handler duy nhất: `GET /api/reports/[id]/share-image`.
- **DEC-004** — **RLS là biên giới bảo mật thật**; middleware và layout guard chỉ là defense-in-depth.
- **DEC-005** — Service role key **chỉ** cho `auth.admin.*`.
- **DEC-006 + KẾT LUẬN PHASE 2** — `is_admin()` phải `SECURITY DEFINER` + `search_path` cố định, gọi
  dạng `(select public.is_admin())`. **Đã kiểm chứng:** `postgres` có `rolbypassrls` nên
  `force row level security` **không** gây đệ quy và **không** chặn `handle_new_user()`. Giữ nguyên
  `enable` + `force`.
- **DEC-031 (MỚI)** — **`service_role` không có DML** trên `profiles` và `daily_reports`.
  `rolbypassrls` **không** vượt qua `GRANT`, nên DEC-005 nay được **database ép**. Hệ quả: tầng test
  dùng kết nối Postgres trực tiếp qua `SUPABASE_DB_URL` (devDependency `pg`).
- **DEC-023** — Business logic và data access **không** được viết trong component.

**Toolchain**

- **DEC-002** — pin `typescript@6.0.3` + `eslint@9.39.5`. **Đừng "nâng cấp cho mới".**
- Next 16 dùng **Turbopack mặc định**.

**Nghiệp vụ & dữ liệu**

- **DEC-007** achievement không persist · **DEC-008** tiền `bigint` VND · **DEC-009** ngày nghiệp vụ
  bằng `Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})` · **DEC-020** chỉ 2 trạng thái ·
  **DEC-025** `target=0` → xem BR-015 · **DEC-026** không sửa sau `COMPLETED`, Admin không sửa,
  không xoá, không nhập bù · **DEC-029/030** viếng thăm giữ cả số lẫn text; không ngày nghỉ, không
  team, chỉ 2 role, KPI do Sales tự cam kết.

**UI/UX**

- **DEC-012/013/014** Swiss Modernism 2.0, chỉ font Inter, bảng màu theo contrast đã đo ·
  **DEC-016** không dark mode v1 · **DEC-017** route `/login` · **DEC-018/019** bottom nav ≤5 mục,
  bảng so sánh 4 card ở mobile.

**Quyết định MỚI của Phase 5 — đọc trước khi động vào `lib/kpi.ts` hoặc bất kỳ chỗ nào hiển thị `%`**

- **DEC-038** — hai phần:
  1. **`percent = null` đúng cho CẢ HAI ca** (`target = 0 && actual > 0` → `EXCEEDED`; chưa có
     `actual` → `PENDING`), phân biệt bằng **`status`**. Đóng ISSUE-008. Bản chất BR-015 **không đổi**.
  2. **`calculateAchievement(target, actual, metric)`** — ba tham số. Trả
     `{ percent, status, display, surplus }`. `display` đã format sẵn để render thẳng
     (`'83,3%'` / `'+3 xe'` / `'—'`); `surplus` là số vượt **thô** cho thẻ ảnh 9:16 và tổng hợp
     Admin. Bảng đơn vị (`xe` / `điểm` / `khách` / VND) chỉ tồn tại trong `formatMetricValue()`.
- **Một hệ quả cố ý, đã khoá bằng test:** `percent = 99.99` cho `display = '100,0%'` nhưng
  `status = 'NEAR'`. BR-014 làm tròn ở hiển thị, BR-023 xét ngưỡng trên số **chưa** làm tròn — cả
  hai đều `APPROVED`. **Đừng "sửa"** bằng cách xét ngưỡng trên số đã làm tròn.

**Ba quyết định của Phase 4 — đọc trước khi sửa `features/`, `lib/hooks/` hay `components/ui/`**

- **DEC-035** — `useReportDraft` nay ở **`lib/hooks/`**, `CurrencyField` nay ở **`components/ui/`**,
  và khoá localStorage của draft ở **`lib/reports/draft-keys.ts`**. Đừng tìm chúng trong
  `features/report-morning/` nữa, và **đừng copy** một bản thứ hai vào feature mới.
- **DEC-036** — **`features/auth/` là ngoại lệ DUY NHẤT** của luật "`features/X` không import
  `features/Y`" (AGENTS.md §1.2). Mọi Server Action ghi báo cáo dùng chung
  `authorizeSalesWrite()` ở `features/auth/queries.ts` — **không viết lại guard quyền trong feature
  mới**. Không mở rộng ngoại lệ này cho feature khác mà không có DEC mới.
- **DEC-037** — `saveEveningReport` **tự `redirect()`**, không trả `ok: true` cho client điều hướng
  như luồng sáng. Lý do là ISSUE-014, đã đo thật. **Quy tắc rút ra cho Phase 6 và Phase 10:** nếu
  route hiện tại có thể tự `redirect()` sau khi dữ liệu đổi, **hãy để Server Action tự
  `redirect()`** — đừng trông chờ `useEffect` của client được chạy nốt.

**Ba quyết định của Phase 3 — đọc trước khi sửa `lib/` hay `features/report-*`**

- **DEC-032** — `lib/date.ts` và `lib/currency.ts` **đã triển khai ở Phase 3**, không phải Phase 5.
  *(Câu tiếp theo của mục này trước đây ghi "`lib/kpi.ts` vẫn là khung và vẫn bị ISSUE-008 chặn" —
  **đã hết hiệu lực từ Phase 5**, xem DEC-038.)*
- **DEC-033** — Hàm **hiển thị** trả `'—'` (hoặc `''` cho `formatThousands`) khi đầu vào không hợp
  lệ, **không ném lỗi**. Có `isValidVietnamDate()` vì `new Date('2026-02-30')` không ném lỗi mà
  cuộn sang `2026-03-02`.
- **DEC-034** — Zod schema của báo cáo dùng **`snake_case` trùng tên cột**, khác ví dụ `camelCase`
  ở `docs/07 §3.5`. Và **`ActionResult` thành công mang `data.notice`** — server quyết định câu xác
  nhận, client không suy ra từ `mode` (đã có lỗi thật vì chuyện này).

---

## Important Files

**Tài liệu điều khiển (17 file):** `CLAUDE.md`, `AGENTS.md`, `docs/01`…`docs/12`, `WORKLOG.md`,
`SESSION_CHECKPOINT.md`, `PROJECT_CHECKLIST.md`.

**Database (Phase 2 — MỚI):**

| File | Vai trò |
|---|---|
| `supabase/migrations/0001_init_enums_profiles.sql` | `citext` (schema `extensions`), 2 enum, `profiles`, GRANT, `enable`+`force` RLS |
| `supabase/migrations/0002_daily_reports.sql` | `daily_reports` 20 cột + 16 constraint, GRANT, `enable`+`force` RLS |
| `supabase/migrations/0003_functions_triggers.sql` | 7 function + 6 trigger |
| `supabase/migrations/0004_rls_policies.sql` | **Chỉ policy** (6 cái) — phụ thuộc hàm của `0003` |
| `supabase/migrations/0005_indexes.sql` | 3 index hiệu năng + `analyze` |
| `supabase/seed.sql` | **LOCAL ONLY** — 4 tài khoản, 22 báo cáo. Mật khẩu local: `LocalDev#2026` |
| `supabase/config.toml` | Sinh bởi `supabase init` |
| `types/database.types.ts` | **Generate thật.** Không sửa tay |

**Tầng auth (Phase 2 — MỚI):**

| File | Vai trò |
|---|---|
| `lib/auth/routes.ts` | **Hàm thuần**: `dashboardPathFor`, `requiredRoleForPath`, `sanitizeNextPath`, `isPublicPath` |
| `lib/auth/messages.ts` | Chuỗi thông báo auth — **một nguồn duy nhất** |
| `lib/validation/auth.ts` | `signInSchema` — dùng chung client và server |
| `services/profiles.ts` | `getSessionProfile()` — nhận supabase client làm tham số |
| `features/auth/queries.ts` | `requireProfile` / `requireRole` / `requireAdmin`. **Ở `features/` chứ không phải `lib/`** vì chạm `services/` |
| `features/auth/actions.ts` | `signInAction`, `signOutAction` |
| `middleware.ts` | Lớp 1 — refresh cookie + guard route/role. Tự tạo Supabase client vì `next/headers` không có ở đây |
| `app/(auth)/login/page.tsx` | `/login` (DEC-017) |
| `app/(sales)/layout.tsx` · `app/(admin)/layout.tsx` | Lớp 2 — guard theo route group |

**Tầng báo cáo đầu ngày (Phase 3 — MỚI):**

| File | Vai trò |
|---|---|
| `lib/date.ts` | `getVietnamToday`, `formatVietnamDate`, `isValidVietnamDate` — **đã có logic thật**. `getVietnamMonthRange` vẫn ném lỗi (Phase 7) |
| `lib/currency.ts` | `formatCurrencyVND`, `parseCurrencyInput`, `formatThousands` — **đã có logic thật** |
| `lib/validation/report.ts` | `morningReportSchema` (6 ô, strip mọi khoá server-owned) + `reportDateSchema` + 6 hằng số miền giá trị khớp CHECK constraint |
| `lib/reports/today-cta.ts` | **Hàm thuần** `getTodayView` / `canOpenMorningForm` + hằng số đường dẫn. Đây là nơi DUY NHẤT quyết định CTA của FR-007 |
| `lib/reports/messages.ts` | `REPORT_MESSAGES`, `SAVED_PARAM`, `messageForSavedParam` — dùng chung với Phase 4 |
| `services/reports.ts` | `getTodayReport`, `insertMorningReport`, `updateMorningReport`. Dịch mã lỗi Postgres sang `DUPLICATE`/`REJECTED`/`UNKNOWN` |
| `features/report-morning/actions.ts` | `saveMorningReport` (UC-04) + `updateMorningReport` (UC-05), đủ 7 bước `docs/07 §1.3` |
| `features/report-morning/morning-report-form.tsx` | Form client — validate on blur bằng **chính** schema của server |
| `features/report-morning/commitment-summary.tsx` | 4 chỉ tiêu cam kết — dùng lại ở `/sales/today` **và** `/sales/today/evening` |
| `components/ui/{textarea,form-field}.tsx` | Primitive mới |
| `components/ui/button.tsx` | Thêm `buttonClassName()` cho CTA dạng `<Link>` |

**Tầng báo cáo cuối ngày (Phase 4 — MỚI):**

| File | Vai trò |
|---|---|
| `lib/validation/report.ts` | Thêm `eveningReportSchema` + `MAX_EVENING_NOTE_LENGTH` + helper `optionalTextField()` |
| `lib/reports/draft-keys.ts` | **MỚI** — `morningDraftKey()` / `eveningDraftKey()`. Ba nơi cần đúng chuỗi này (DEC-035) |
| `lib/hooks/use-report-draft.ts` | **CHUYỂN TỪ** `features/report-morning/`. Hook thuần, `useSyncExternalStore` (DEC-035) |
| `components/ui/currency-field.tsx` | **CHUYỂN TỪ** `features/report-morning/`. Nhận thêm prop `helperText` (DEC-035) |
| `features/auth/queries.ts` | Thêm `authorizeSalesWrite()` — guard 3 bước dùng chung cho MỌI action ghi báo cáo (DEC-036) |
| `services/reports.ts` | Thêm `EveningReportWrite` + `completeEveningReport()` |
| `features/report-evening/actions.ts` | `saveEveningReport` (UC-06). **Tự `redirect()`**, chỉ trả về khi lỗi (DEC-037) |
| `features/report-evening/evening-report-form.tsx` | Form client — mỗi ô mang theo con số cam kết sáng trong helper text |
| `features/report-evening/discard-evening-draft.tsx` | Client component **không render gì** — dọn draft trên `/sales/today` khi `COMPLETED` (DEC-037) |
| `lib/reports/messages.ts` | Thêm `NO_MORNING_REPORT`, `ALREADY_COMPLETED`, `EVENING_COMPLETED` + `SAVED_PARAM.EVENING_COMPLETED` |

**Tầng KPI và bảng đối chiếu (Phase 5 — MỚI):**

| File | Vai trò |
|---|---|
| `lib/kpi.ts` | **Nguồn DUY NHẤT** của công thức KPI **và** của bảng đơn vị. 5 hàm thuần, không I/O |
| `lib/kpi.test.ts` | 46 test — bảng biên `docs/08 §3.1` + `§3.2`, cộng lưới 288 tổ hợp chống `NaN`/`∞` |
| `features/report-comparison/achievement-table.tsx` | Bảng đối chiếu DEC-019 — 4 card ở < 768px, `<table>` thật từ 768px |
| `features/report-comparison/achievement-badge.tsx` | Ánh xạ `status` → tone + icon Lucide. **Ngưỡng và nhãn vẫn ở `lib/kpi.ts`** |
| `features/report-comparison/report-notes.tsx` | Tuyến kế hoạch / mục đích / tuyến thực tế / ghi chú cuối ngày |

**Test (Phase 2 + 3 + 4 + 5):** `vitest.config.mts` (3 project) · `lib/auth/routes.test.ts` ·
`lib/date.test.ts` (33) · `lib/currency.test.ts` (**36**) · `lib/validation/report.test.ts` (96) ·
`lib/reports/today-cta.test.ts` (17) · **`lib/kpi.test.ts` (46 — MỚI)** · `tests/integration/*`
(4 file, 40 test) · `tests/rls/*` (4 file, 33 test).

**Hai file env (không commit, đều bị `.gitignore` chặn):**

| File | Ai dùng | Trỏ vào đâu |
|---|---|---|
| `.env.local` | Ứng dụng — `npm run dev` / `build` / `start` | Supabase **cloud** (sau khi người dùng tạo project) |
| `.env.test.local` | Bộ test — `npm test` / `npm run test:db` | Supabase **local**, luôn luôn |

`loadEnv('test', …)` nạp `.env.test.local` **sau** `.env.local` nên nó đè lên ⇒ `npm test` không bao
giờ chạm production dù `.env.local` trỏ cloud (DEC-022). Đã kiểm chứng thật: đặt `.env.local` sang
một URL cloud giả, `npm run test:db` vẫn **66/66 PASS**. `tests/integration/setup.ts` còn một chặn
thứ hai — URL không phải localhost thì ném lỗi ngay.

**File sẽ tạo ở Phase 6 (chưa tồn tại):** `app/api/reports/[id]/share-image/route.ts` và
`features/report-share/DailyReportShareCard.tsx`. Cả hai **phải dùng lại `lib/kpi.ts`** — không
tự tính `%`, không tự ghép đơn vị.

---

## Database State

**Schema đã chạy thật trên CẢ HAI môi trường** — Supabase local (Postgres 17.6.1.156) và cloud
`rnmywhwanpxmipqducqu` region `ap-southeast-1` (Postgres 17.6.1.155). **Không có migration mới ở
Phase 3** — schema của Phase 2 đã đủ cho toàn bộ luồng báo cáo đầu ngày.

- 2 enum (`user_role`, `report_status`), 2 bảng (`public.profiles`, `public.daily_reports`).
- `UNIQUE(sales_id, report_date)`, 16 CHECK, 3 index hiệu năng, 7 function, 6 trigger.
- RLS **`enable` + `force`** trên cả 2 bảng, **6 policy**, deny-by-default. Không có DELETE policy,
  không có INSERT policy trên `profiles`.
- GRANT thực tế (đã đo bằng `information_schema.role_table_grants`):

  | role | `profiles` | `daily_reports` |
  |---|---|---|
  | `anon` | *(không có DML)* | *(không có DML)* |
  | `authenticated` | `SELECT, UPDATE` | `SELECT, INSERT, UPDATE` |
  | `service_role` | *(không có DML)* — DEC-031 | *(không có DML)* — DEC-031 |

- Cổng local của **BikeForce**: API `54321`, Postgres **`54322`**, Studio `54323`.
  ⚠ Máy đang chạy thêm 2 stack Supabase khác (`cq-tntt-manager` 54421/54422, `Polymind_Chinese`
  55321/55322) — xem ISSUE-010. Luôn lấy cổng bằng `npx supabase status` **trong thư mục dự án**.

> ⚠ **Sau mỗi `npx supabase db reset` phải restart 3 container, nếu không mọi lần đăng nhập nhận
> `502`** (ISSUE-012 — đã mất một vòng chẩn đoán sai vì `docker ps` vẫn báo `healthy`):
>
> ```bash
> docker restart supabase_auth_<project> supabase_rest_<project>
> sleep 8 && docker restart supabase_kong_<project>
> ```
>
> Trên máy này `db reset` còn **treo ở bước "Restarting containers"** dù seed đã chạy xong. Kiểm bằng
> `docker exec supabase_db_<project> psql -U postgres -d postgres -t -c "select count(*) from public.daily_reports;"`
> → thấy `22` là xong, có thể ngắt lệnh.
>
> **Fixture cho kiểm chứng tay — ĐỌC TRẠNG THÁI THẬT TRƯỚC KHI DÙNG.** Mô tả cũ ("`sales.c` chưa
> có báo cáo · `sales.a` `MORNING_SUBMITTED` · `sales.b` `COMPLETED`") **đã lỗi thời**: chính các
> phiên kiểm chứng tay của Phase 4 và Phase 5 đã ghi vào database local. Trạng thái đo được ngày
> 2026-08-07 là `sales.c` `MORNING_SUBMITTED` · `sales.a` và `sales.b` đều `COMPLETED`.
> Luôn kiểm bằng một câu `select` trước khi dựa vào fixture:
>
> ```bash
> docker exec supabase_db_<project> psql -U postgres -d postgres -c \
>   "select p.email, r.status from daily_reports r join profiles p on p.id = r.sales_id \
>    where r.report_date = (select (now() at time zone 'Asia/Ho_Chi_Minh')::date);"
> ```
>
> Muốn về đúng ba trạng thái gốc thì `npx supabase db reset` (nhớ ISSUE-012 ở trên).
> **Không có báo cáo `target = 0` cho ngày hôm nay** trong seed — muốn nhìn tận mắt nhánh BR-015
> thì `update` tạm trên database local rồi **khôi phục lại**, đúng như Phase 5 đã làm.

---

## Testing State

| Loại | Trạng thái |
|---|---|
| **Build** | ✅ `npm run build` → **exit 0** (Next.js 16.3.0, Turbopack, 7 route) |
| **Typecheck** | ✅ `npm run typecheck` → **exit 0** |
| **Lint** | ✅ `npm run lint` → **exit 0**, 0 error 0 warning |
| **Unit** | ✅ **242 passed** — `auth/routes` 14 · `date` 33 · `currency` **36** · `validation/report` 96 · `reports/today-cta` 17 · **`kpi` 46** |
| **Integration (DB)** | ✅ **40 passed** — UNIQUE, 16 CHECK, FK RESTRICT, 4 trigger, 3 function, bảng GRANT |
| **RLS** | ✅ **33 passed** — JWT thật của `salesA`/`salesB`/`admin`/`inactive` + `anon`, gọi thẳng PostgREST. Gồm 7 test chạy `completeEveningReport()` dưới JWT thật |
| **Tổng `npm test`** | ✅ **315 passed / 315**, 14 test file |
| **Coverage (`npm run test:coverage`)** | ✅ `lib/**` — stmt **98,57%** · branch **99,01%** · func **96,43%** · lines **99,11%**. `lib/kpi.ts` **100%** cả bốn cột. ⚠ Chỉ tính các module `lib/` mà tầng unit **thực sự import**; `lib/hooks/`, `lib/supabase/`, `lib/env.ts`, `lib/utils.ts` không nằm trong đó |
| **UI mobile (Phase 2 — auth)** | ✅ Chromium 375px + 1440px: **32/32 PASS** |
| **UI mobile (Phase 3 — báo cáo sáng)** | ⚠ Chromium 375px + 1440px: **57/58 PASS**. Mục lệch duy nhất là **NFR-008 (7 lần chạm)** — ISSUE-013, không phải lỗi code |
| **UI mobile (Phase 4 — báo cáo cuối ngày)** | ✅ Chromium 375px + 1440px: **62/62 PASS** (lần đo trước khi sửa ISSUE-014: 59/62) |
| **UI (Phase 5 — bảng đối chiếu KPI)** | ✅ Chromium 375px + 1440px: **36/36 PASS** (lần đo đầu 27/36 là do script đọc DOM quá sớm, không phải lỗi code — xem `WORKLOG.md` Entry 008 Errors 1) |
| **Hồi quy luồng sáng sau refactor Phase 4** | ✅ **11/11 PASS** — UC-04, UC-05, DEC-034 vẫn đúng |
| **Tài khoản inactive** | ✅ **6/6 PASS**, gồm cả bị vô hiệu hoá **giữa phiên** |
| **E2E (Playwright)** | ❌ `N/A — chưa có playwright.config.ts, chưa có e2e/*.spec.ts` |
| **A11y (axe-core)** | ❌ `N/A — chưa chạy` |
| **EXPLAIN ANALYZE / InitPlan** | ❌ `N/A — chưa đo. Phase 11, NFR-002` |
| **Lighthouse** | ❌ `N/A — chưa chạy` |

Bốn dòng `N/A` ở cuối **không được diễn giải thành pass** dưới bất kỳ hình thức nào. Ba script kiểm chứng
trình duyệt là **công cụ dùng một lần, đã xoá, không commit** — chúng không phải bộ E2E hồi quy.

---

## Last Working Feature

**Bảng đối chiếu KPI chạy thật trên cả hai bề rộng (Phase 5).** `next build` + `next start` trỏ vào
Supabase local. Đăng nhập bằng `sales.c@bikeforce.local` (đang `MORNING_SUBMITTED`) → `/sales/today`
hiện 4 card "Viếng thăm / Doanh số / Doanh thu / Khách hàng", mỗi card có cột **Cam kết** với đúng
đơn vị (`5 điểm`, `9 xe`, `90.000.000 ₫`, `11 khách`), cột **Thực đạt** là `—`, badge xám
"Chờ số liệu" kèm icon đồng hồ. Đăng nhập bằng `sales.a` (đã `COMPLETED`, số liệu lẫn lộn) → bốn
badge khác nhau: `100,0% Vượt mục tiêu` (▲ xanh) · `75,0% Chưa đạt` (▼ đỏ) · `80,0% Gần đạt`
(— vàng) · `90,0% Gần đạt`. Giãn cửa sổ lên 1440px → 4 card **biến mất**, `<table>` thật hiện ra
với `<caption>` cho screen reader, 4 cột "Chỉ tiêu / Cam kết sáng / Thực đạt / Hoàn thành", số căn
phải `tabular-nums`, **số liệu khớp y hệt bản mobile**. Đặt `target = 0` cho một chỉ tiêu → ô
"Hoàn thành" hiện `+7 xe` kèm nhãn "Vượt kế hoạch", `target = 0 && actual = 0` hiện `100,0%` —
**không chỗ nào có `NaN`, `Infinity` hay `∞`**. Không cuộn ngang ở cả hai bề rộng.

Đây là **mốc an toàn thứ năm** để quay về nếu Phase 6 làm vỡ thứ gì.

**Mốc an toàn thứ tư — luồng báo cáo ngày chạy thật ĐẦY ĐỦ cả hai nửa (Phase 4).** `next build` + `next start` trỏ vào
Supabase local, đăng nhập bằng `sales.a@bikeforce.local` (đang `MORNING_SUBMITTED`) → `/sales/today`
hiện "Đã cam kết" + CTA "Hoàn thành báo cáo cuối ngày" → bấm CTA → `/sales/today/evening` hiện lại
đủ 4 cam kết sáng để đối chiếu, mỗi ô nhập nhắc lại con số đã cam kết → điền 4 chỉ số thực đạt +
tuyến thật + ghi chú có dấu tiếng Việt → **Hoàn tất báo cáo hôm nay** → quay về
`/sales/today?saved=evening` với banner "Đã hoàn tất báo cáo hôm nay", trạng thái đổi thành "Đã hoàn
thành", draft localStorage bị xoá → vào lại `/evening` **và** `/morning` đều bị đá về `/sales/today`
(BR-019 khoá vĩnh viễn). Tài khoản chưa có cam kết sáng (`sales.c`) vào `/evening` thì được đưa
thẳng tới `/sales/today/morning` (BR-007).

**Mốc an toàn thứ ba — luồng cam kết đầu ngày chạy thật đầu-cuối (Phase 3).** `next build` + `next start` trỏ vào Supabase
local, đăng nhập bằng `sales.c@bikeforce.local` → `/sales/today` hiện "Chưa báo cáo" + empty state →
bấm CTA → điền form → **Lưu** → quay về `/sales/today` với banner "Đã lưu báo cáo đầu ngày", trạng
thái đổi thành "Đã cam kết", CTA đổi thành "Hoàn thành báo cáo cuối ngày" → bấm "Sửa cam kết sáng"
→ form prefill đúng → sửa → banner "Đã cập nhật cam kết sáng". Tài khoản đã `COMPLETED` (`sales.b`)
vào thẳng `/sales/today/morning` thì bị đá về `/sales/today` (BR-019).

Luồng này **đã được chạy lại nguyên vẹn ở Phase 4** sau khi refactor `authorizeSalesWrite`,
`CurrencyField` và khoá draft: **11/11 PASS**.

**Mốc an toàn thứ hai — luồng xác thực đầu-cuối (Phase 2).** `next build` + `next start`, đăng nhập bằng tài khoản seed
(`sales.a@bikeforce.local` / `admin@bikeforce.local`, mật khẩu local `LocalDev#2026`) → vào đúng
dashboard theo role → đăng xuất → bị chặn lại. Sai vai bị đưa về dashboard của chính mình; tài khoản
bị vô hiệu hoá giữa phiên bị đá về `/login?reason=deactivated`.

Đây là **mốc an toàn thứ hai**.

---

## Next Exact Steps

> ✅ Phase 0, Phase 1, Phase 2, Phase 5 đã đóng đủ; Phase 3 xong 13/14 và Phase 4 xong 9/10 —
> **không làm lại**. Hai mục treo của Phase 3 và Phase 4 **không chặn Phase 6**.

**PHASE 6 — Xuất ảnh 9:16. Không còn chốt chặn nghiệp vụ nào, làm được ngay:**

1. **Tạo `app/api/reports/[id]/share-image/route.ts`** — Route Handler DUY NHẤT của dự án (DEC-003).
   `export const runtime = 'nodejs'` vì phải đọc file font bằng `fs`. Dùng `ImageResponse` của
   `next/og` (Satori) sinh PNG **1080×1920**, **không** screenshot cả trang (FR-018, DEC-010).
2. **Gác quyền và trạng thái TRƯỚC khi render** — xác thực session, đọc report **dưới RLS** bằng
   `lib/supabase/server.ts`, và kiểm `status === 'COMPLETED'` (BR-002). Admin cũng gọi được đúng
   route này cho báo cáo của Sales (BR-022). Không dùng `lib/supabase/admin.ts`.
3. **Nhúng font có đủ dấu tiếng Việt** (subset `latin` + `vietnamese`), đọc `.ttf`/`.woff` bằng `fs`.
   Đây là rủi ro thật đã ghi ở **ISSUE-002** — Satori chỉ hỗ trợ một tập con CSS. Kiểm bằng chuỗi
   `Ừ ẫ ợ ỹ đ` (`sales.a` trong seed có sẵn ghi chú chứa đúng các ký tự này).
4. **`features/report-share/DailyReportShareCard.tsx`** — layout dark `#0B1220` theo `docs/05 §14`.
   **Bắt buộc gọi lại** `calculateAchievement()` / `formatMetricValue()` / `achievementLabel()` của
   `lib/kpi.ts`. Nếu cần con số thô thay vì chuỗi thì dùng trường `surplus`, **đừng parse ngược**
   `display`.
5. **Header trả về:** `Content-Disposition: attachment; filename="BikeForce_Report_<Ho-Ten>_<YYYY-MM-DD>.png"`
   và `Cache-Control: private, no-store` (FR-019).
6. **Bật nút "Xuất ảnh"** — xoá hằng số `EXPORT_IMAGE_NOT_READY` trong
   `app/(sales)/sales/today/page.tsx`. Điều kiện `view.canExportImage` (BR-002) **đã có sẵn** trong
   biểu thức, giữ nguyên. Thêm Web Share API khi `navigator.canShare({ files })`, fallback
   `<a download>` (FR-020, DEC-011).
7. **Test edge case theo `PROJECT_CHECKLIST.md § Phase 6`:** tên 40+ ký tự, tuyến 300 ký tự, ghi chú
   1000 ký tự, doanh thu 12 chữ số, achievement 4 chữ số (`1.250,0%`), và **cả hai** nhánh
   `target = 0`.
8. **Nếu Satori không dựng nổi layout:** chuyển fallback `html-to-image` và **ghi thành DEC mới**,
   không sửa lén (ISSUE-002).

**Hai việc chờ người dùng, KHÔNG chặn Phase 6:**

9. **Rotate service role key (ISSUE-011, P1).** Dashboard → `Project Settings` → `API Keys` → mục
   secret → **`Generate new secret key`** → dán giá trị mới vào `.env.local`.
   **Đóng `.env.local` trong IDE trước khi dán**, hoặc dán bằng terminal — nếu không, IDE lại tự đưa
   key vào ngữ cảnh hội thoại đúng như lần trước (`docs/06 §11.2` biện pháp thứ 8).
10. **Trả lời OQ-18 (ISSUE-013).** Sau khi có quyết định: cập nhật `docs/01`, tạo DEC mới nếu nới
    NFR-008, đo lại, rồi mới tick mục cuối của Phase 3 trong `PROJECT_CHECKLIST.md`.

**Việc của Phase 11 và Phase 12, chưa cần bây giờ:**

11. `playwright.config.ts` + `e2e/*.spec.ts` (Phase 11) — **mục cuối của Phase 4 chỉ tick được sau
    bước này**, vì nó đòi một bộ E2E hồi quy có commit, không phải script dùng-một-lần.
12. Runbook Admin đầu tiên trên cloud (`docs/09 §10`): tạo user trên Dashboard rồi
    `update public.profiles set role = 'ADMIN' where email = '<email>';` — **một lần duy nhất**.

---

## DO NOT REDO

**Từ Phase 0:**

- Đã đọc toàn bộ `BIKEFORCE_MASTER_SPEC.md`; đã chạy thật skill `ui-ux-pro-max`; đã đo contrast toàn
  bộ bảng màu; đã `git init` + push GitHub; **đã hỏi và nhận đủ 17/17 câu trả lời OPEN QUESTION —
  tuyệt đối không hỏi lại**; đã parse kiểm chứng 30/30 khối Mermaid.
- Bộ 17 tài liệu Phase 0 **chỉ cập nhật, không viết lại từ đầu**. Giữ nguyên toàn bộ ID. **Không bao
  giờ renumber.**

**Từ Phase 1:**

- Đã chạy smoke test toolchain — **không thử lại TypeScript 7 hay ESLint 10**.
- Đã `create-next-app` và pin phiên bản — không chạy lại, không đổi thành dải `^`.
- Đã dựng cấu trúc thư mục DEC-023, 3 Supabase client, design token, font Inter — không dựng lại.

**Từ Phase 2 (mới):**

- **Đã viết và CHẠY THẬT cả 5 migration** — không viết lại. Muốn đổi schema thì viết **migration mới**
  (`0006_*.sql`), migration chỉ tiến tới (AGENTS.md §13).
- **Đã kiểm chứng CẢNH BÁO 2 của `docs/02 §11`** (`force RLS` + `handle_new_user`): rủi ro **không
  xảy ra** vì `postgres` có `rolbypassrls`. **Không kiểm lại**, không áp dụng lối thoát (A) hay (B).
  Kết quả đầy đủ ở `docs/11 § DEC-006 — KẾT LUẬN PHASE 2`.
- **Đã kiểm chứng `now()` dùng được trong CHECK constraint** — Postgres chấp nhận. Đừng gỡ
  `ck_report_not_future` vì nghĩ rằng nó không hợp lệ (chính tôi đã mắc lỗi này ở Entry 004).
- **Đã kiểm chứng `extensions.citext` so sánh được dưới role `authenticated`** — không cần phương án
  dự phòng `lower(email)`.
- **Đã đo bảng GRANT thật** và chốt DEC-031. **Đừng "sửa cho tiện"** bằng cách cấp DML cho
  `service_role` — đó là một lớp phòng thủ thật, và có test khoá lại (sẽ đỏ nếu ai đó cấp thêm).
- **Đã dựng bộ test 80 case và chạy xanh** — không viết lại từ đầu, chỉ thêm.
- **Đã quyết định giữ tên `middleware.ts`** dù Next 16.3 deprecate (ISSUE-009). Đừng tự ý đổi sang
  `proxy.ts` mà không sweep 5 tài liệu và tạo DEC mới.
- **Đã đổi `vitest.config.ts` → `vitest.config.mts`** có lý do (cảnh báo `configLoader: 'native'`).
  Đừng đổi ngược lại.

**Từ Phase 3 (mới):**

- **Đã triển khai `lib/date.ts` và `lib/currency.ts`** với đủ test — **không viết lại**. Nếu thấy
  chúng "lẽ ra thuộc Phase 5", đọc DEC-032 trước khi động tay.
- ~~**`lib/kpi.ts` vẫn ném lỗi có chủ đích.**~~ — **hết hiệu lực.** ISSUE-008 đã đóng ở Phase 5
  (DEC-038) và `lib/kpi.ts` nay có thân thật. Xem mục "Từ Phase 5" ở trên.
- **Đã kiểm chứng trên trình duyệt thật rằng client KHÔNG được suy ra thông báo từ `mode` của form**
  (DEC-034). `revalidatePath` làm trang form render lại ở chế độ SỬA ngay sau khi TẠO thành công.
  Đừng "đơn giản hoá" bằng cách bỏ `data.notice` — lỗi sẽ quay lại y nguyên.
- **`useReportDraft` cố ý dùng `useSyncExternalStore`,** không phải `useEffect` + `setState`.
  React Compiler chặn cách viết kia (`react-hooks/set-state-in-effect`). Đừng đổi ngược lại.
- **Đã đo NFR-008 thật: 7 chạm / 1,8 giây.** Đừng đo lại rồi kết luận khác; và **đừng bỏ bớt trường
  bắt buộc** để ép xuống 6 — đó là thay đổi nghiệp vụ, phải chờ OQ-18.
- **Nút "Xuất ảnh" và CTA "Xem báo cáo hôm nay" cố ý `disabled`.** Hai cờ đánh dấu chỗ phải xoá đã
  có sẵn trong `app/(sales)/sales/today/page.tsx`: `CTA_ROUTES_NOT_READY` (Phase 7) và
  `EXPORT_IMAGE_NOT_READY` (Phase 6). Không phải bug.
**Từ Phase 5 (mới):**

- **`lib/kpi.ts` ĐÃ CÓ THÂN THẬT** — không còn ném lỗi, không viết lại. Nếu thấy nó "lẽ ra vẫn là
  khung", đọc DEC-038 trước khi động tay.
- **`calculateAchievement()` nhận BA tham số** (`target, actual, metric`). Gọi bằng hai tham số sẽ
  không biên dịch. `metric` chỉ dùng để dựng chuỗi số vượt, **không** tham gia phép tính.
- **`percent = 99.99` cho `display = '100,0%'` nhưng `status = 'NEAR'` là ĐÚNG.** BR-014 làm tròn ở
  hiển thị, BR-023 xét ngưỡng trên số chưa làm tròn — cả hai đang `APPROVED`, đã có test khoá lại.
  **Đừng "sửa"**; muốn đổi phải sửa BR-023 bằng DEC mới.
- **Bảng đơn vị chỉ nằm trong `formatMetricValue()`.** Đừng viết `` `${n} xe` `` ở component nào —
  kể cả thẻ ảnh 9:16 của Phase 6.
- **`CommitmentSummary` cố ý CHỈ CÓ MỘT CỘT** và chỉ còn phục vụ `/sales/today/evening`. Nó **không
  phải** bảng đối chiếu, và **không** được gộp với `AchievementTable`.
- **`getVietnamMonthRange()` VẪN cố ý là khung ném lỗi.** Phase 5 đóng **không** có nghĩa hàm đó đã
  xong — nó phục vụ FR-021/FR-028 nên thuộc Phase 7/9.
- **Đã đo coverage thật lần đầu** — `lib/**` vượt xa ngưỡng 90%. Không cần đo lại ở Phase 6 trừ khi
  thêm module mới vào `lib/`.
- **Script kiểm chứng trình duyệt phải chờ PHẦN TỬ THẬT, không chờ mạng.**
  `waitForLoadState('networkidle')` bắn **trước khi React render xong** — đã gây một vòng chẩn đoán
  sai (27/36 FAIL trong khi code hoàn toàn đúng). Dùng `waitForSelector` cho một phần tử cụ thể.
- **Đừng kiểm chuỗi cấm bằng `page.textContent('body')`** — nó gộp cả RSC flight payload của Next,
  mà payload đó **luôn** chứa `$undefined`. Dùng `page.innerText('body')`.

**Từ Phase 4 (mới):**

- **Đã đo thật và đã sửa ISSUE-014.** `revalidatePath` **không** phải nguyên nhân — Next re-render
  route hiện tại sau **mọi** Server Action, dù có revalidate hay không. **Đừng thử lại cách "trả
  `ok: true` rồi client `router.replace`"** cho một route có thể tự `redirect()` sau khi dữ liệu
  đổi; nó đã hỏng thật và cách sửa là DEC-037.
- **`saveEveningReport` cố ý không trả gì khi thành công.** Kiểu trả về chỉ còn nhánh lỗi. Đừng
  "sửa cho đủ bộ" bằng cách thêm lại nhánh `ok: true` — nó không bao giờ tới được client.
- **`DiscardEveningDraft` cố ý không render gì** và cố ý nằm ở `/sales/today` chứ không ở form.
  Đừng gộp ngược vào `EveningReportForm`.
- **`useReportDraft` và `CurrencyField` ĐÃ CHUYỂN CHỖ** (DEC-035). Nếu grep không thấy chúng trong
  `features/report-morning/` thì đó là đúng, không phải file bị mất.
- **Guard quyền của Server Action đã gom về `authorizeSalesWrite()`** (DEC-036). **Đừng viết lại**
  khối `getUser() → getSessionProfile() → is_active → role` trong feature mới.
- **`/sales/today/evening` KHÔNG còn là trang tối thiểu** — nó là FR-013 + FR-014 thật. Ghi chú
  "trang tối thiểu của Phase 3" trong file đó đã bị xoá.
- **Đã có 7 test RLS cho `completeEveningReport`** ở `tests/rls/report-service.rls.test.ts`.
  **Đừng chuyển chúng sang `tests/integration/`** — role `postgres` ở đó có `rolbypassrls` nên
  chúng sẽ "xanh" kể cả khi policy sai hoàn toàn. Có một bài trong đó cố ý ghi lại sự thật rằng
  **RLS KHÔNG chặn việc hoàn tất báo cáo ngày cũ** — thứ chặn là Server Action.
- **Khi cần kiểm chứng trình duyệt với Supabase local, dùng `.env.production.local` tạm** (ưu tiên
  cao hơn `.env.local` trong thứ tự nạp của Next ở chế độ production) rồi xoá. **Không sửa
  `.env.local` của người dùng** — đó là cách ISSUE-011 đã xảy ra.
- **`next start` không phải lúc nào cũng chết theo lệnh dừng.** Trước khi chạy lại, kiểm
  `Get-NetTCPConnection -LocalPort <port> -State Listen` rồi `Stop-Process -Force` theo PID thật.
  Một server cũ giữ port và phục vụ build đã bị ghi đè đã gây một vòng chẩn đoán sai.

---

## OPEN QUESTIONS — 17/17 câu ban đầu đã đóng · **OQ-18 đang chờ**

**Không còn câu hỏi nghiệp vụ nào của bộ 17 câu ban đầu.** Người dùng đã trả lời đủ **17/17** ngày
`2026-08-07`. Danh sách đầy đủ kèm câu trả lời chính thức: `docs/01-business-analysis.md § OPEN QUESTIONS`.

> ⏳ **OQ-18 (MỚI, phát sinh ở Phase 3 — không phải hỏi lại câu cũ):** NFR-008 đặt "≤ 6 lần chạm"
> nhưng FR-008 có 5 trường bắt buộc nên sàn lý thuyết là 7. Đo thật: **7 chạm / 1,8 giây**.
> Ba phương án ở `docs/01 § OQ-18` và `docs/12 § ISSUE-013`. **Không chặn Phase 4.**

| ID | Câu trả lời chính thức |
|---|---|
| OQ-01 / OQ-02 | Viếng thăm giữ **cả hai**: cột số bắt buộc + cột text tuỳ chọn |
| OQ-03 | Doanh số = **số lượng xe** (integer). Doanh thu = **tiền VND** (bigint) |
| OQ-04 | **KHÔNG** sửa sau khi `COMPLETED` — khoá vĩnh viễn |
| OQ-05 | Admin **KHÔNG** sửa báo cáo của Sales |
| OQ-06 | Admin tạo tài khoản; Sales **không** tự đăng ký |
| OQ-07 | Tuyến nhập tự do + gợi ý 5 tuyến gần nhất |
| OQ-08 | **KHÔNG** có khái niệm ngày nghỉ ở v1 |
| OQ-09 | KPI do **Sales tự cam kết buổi sáng**; không có bảng `targets` |
| OQ-10 | **KHÔNG** SKU / model xe / đại lý / đơn hàng |
| OQ-11 | `target=0 & actual=0` → `100,0%`; `actual>0` → `percent = null` + số vượt tuyệt đối |
| OQ-12 | Chỉ đúng **ngày hôm nay** giờ VN; không nhập bù |
| OQ-13 | **KHÔNG** xoá báo cáo — kể cả soft delete |
| OQ-14 | Doanh thu = **giá trị đơn hàng chốt trong ngày** |
| OQ-15 | **Chưa** chia team / khu vực ở v1 |
| OQ-16 | **Chỉ 2 role**: `ADMIN`, `SALES` |
| OQ-17 | "Ngày đạt KPI" = đạt **cả 4** chỉ tiêu ≥ 100% |

**Ba điểm kỹ thuật còn treo (không chặn tiến độ, phải chốt đúng lúc):**

1. ~~**ISSUE-008 — đầu Phase 5**~~ — ✅ **ĐÃ ĐÓNG 2026-08-07** bằng **DEC-038**: `percent = null`
   đúng cho **cả hai** ca, phân biệt bằng `status`.
2. ~~**DEC-025 — đầu Phase 5**~~ — ✅ **ĐÃ ĐÓNG 2026-08-07** bằng **DEC-038**:
   `calculateAchievement(target, actual, metric)` trả cả `display` đã format lẫn `surplus` thô.
3. **Buộc đổi mật khẩu lần đầu — trước Phase 10:** `docs/06 §3.3` ghi chú 6 nêu hai phương án
   (cờ trong `user_metadata` vs thêm cột vào `profiles`), **chưa chốt**. Phải quyết và ghi thành DEC
   mới **trước** khi làm UC-17. Schema hiện **không có** cột nào cho việc này.
4. **AF-12 (audit log) chưa cần** vì không ai được sửa sau khi hoàn tất. Nếu sau này mở quyền sửa,
   **phải làm audit log trước**, và phải tạo `DEC` mới thay vì sửa DEC-026.
