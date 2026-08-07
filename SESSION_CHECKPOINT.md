# BikeForce Session Checkpoint

> Status: ACTIVE | Phase: 3 (13/14) → sẵn sàng Phase 4 | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

Đây là file **quan trọng nhất** để một session hoàn toàn mới tiếp tục công việc mà không phải làm
lại từ đầu. Đọc file này ngay sau `BIKEFORCE_MASTER_SPEC.md`.

---

## Current State

**Current Phase:** `PHASE 3 — Morning Report` — **13/14 mục `[x]`** (2026-08-07).
Phase 0, Phase 1, Phase 2 đều đã đóng.

**Current Task:** **Bắt đầu PHASE 4 — Evening Report.** Không có gì chặn việc code.

> ⏳ **Một câu hỏi đang chờ người dùng, KHÔNG chặn Phase 4: OQ-18 / ISSUE-013.**
> NFR-008 đặt mục tiêu "hoàn tất báo cáo sáng ≤ 60 giây và ≤ 6 lần chạm". Đo thật ở 375px:
> **1,8 giây (đạt) · 7 lần chạm (không đạt)**. Nguyên nhân là **mâu thuẫn giữa NFR-008 và FR-008**:
> FR-008 quy định 5 trường bắt buộc nên sàn lý thuyết là `1 (mở form) + 5 (chạm ô) + 1 (lưu) = 7`.
> Ba phương án nằm ở `docs/01 § OQ-18` và `docs/12 § ISSUE-013`. **Đừng tự chọn hộ người dùng**, và
> **đừng "tối ưu" code để ép xuống 6** — không có cách nào làm được mà không bỏ bớt một trường bắt buộc.

**Phase 3 đã làm được gì (tóm tắt cho session mới):**

| Hạng mục | Trạng thái |
|---|---|
| `/sales/today` | ✅ FR-007 thật — badge trạng thái, cam kết 4 chỉ tiêu, **đúng 1 CTA chính** theo `status` |
| `/sales/today/morning` | ✅ UC-04 (tạo) + UC-05 (sửa) — cùng một form, hai Server Action |
| `/sales/today/evening` | ⚠ **Trang tối thiểu** — mới có guard vai + BR-007 + hiển thị lại cam kết sáng (FR-013). Form thực đạt là **Phase 4** |
| `lib/date.ts` · `lib/currency.ts` | ✅ Triển khai thật (DEC-032). **`getVietnamMonthRange` vẫn là khung** — Phase 7 |
| `lib/kpi.ts` | ❌ **Vẫn là khung ném lỗi** — bị ISSUE-008 chặn, Phase 5. Phase 3 cố ý không hiển thị `%` nào |
| Test | ✅ **213/213** (140 unit · 47 integration · 26 RLS) |

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

---

## Currently Working On

**Không có công việc code nào đang dở.** Phase 3 đã dừng ở một trạng thái sạch: mọi thứ đã viết đều
đã chạy thật và đã có test.

---

## Not Started

- **Phase 4 → Phase 12:** chưa bắt đầu. Chưa có form nhập thực đạt cuối ngày, chưa có `lib/kpi.ts`
  thật, chưa có route handler ảnh, chưa có màn hình Admin thật, chưa có lịch sử báo cáo.
- **Test còn thiếu:** `playwright.config.ts` và toàn bộ `e2e/*.spec.ts` (Phase 11);
  `tests/integration/indexes.test.ts` với `EXPLAIN ANALYZE` (Phase 11); unit test cho `lib/kpi`
  (Phase 5, còn chờ ISSUE-008).

**Những thứ Phase 3 CỐ Ý chưa làm** (đúng kế hoạch, không phải thiếu sót):

| Thứ chưa làm | Thuộc phase | Vì sao không làm ở Phase 3 |
|---|---|---|
| Thân `lib/kpi.ts` (`calculateAchievement`, `getAchievementStatus`) | Phase 5 | Bị **ISSUE-008** chặn thật. Phase 3 cố ý **không hiển thị `%` nào** — chỉ có cột "Cam kết" |
| `getVietnamMonthRange()` | Phase 7 / 9 | Chỉ phục vụ filter tháng FR-021/FR-028; hành vi với chuỗi sai định dạng chưa chốt |
| Form nhập thực đạt cuối ngày | Phase 4 | `/sales/today/evening` mới là **trang tối thiểu** |
| Nút "Xuất ảnh" hoạt động thật | Phase 6 | Nút đã render nhưng luôn `disabled`; cờ `EXPORT_IMAGE_NOT_READY` đánh dấu chỗ phải xoá |
| `/sales/reports/[id]` | Phase 7 | CTA "Xem báo cáo hôm nay" render **disabled**; tập `CTA_ROUTES_NOT_READY` đánh dấu chỗ phải xoá |
| Bottom nav / sidebar DEC-018 | Phase 7, 8 | — |
| UC-17/18/19 quản lý tài khoản | Phase 10 | `lib/supabase/admin.ts` vẫn chưa được gọi ở đâu cả — đúng thiết kế |

> `/admin` hiện vẫn là **trang tối thiểu của Phase 2**, chỉ để luồng đăng nhập có đích đến thật và
> test được — FR-024 (Phase 8) mới là nội dung thật. `/sales/today` **đã được thay bằng FR-007 thật ở
> Phase 3**. Điều này đã ghi ngay trong comment đầu mỗi file.

---

## Known Issues

Chi tiết đầy đủ ở `docs/12-known-issues.md`. **Còn 10 OPEN, 3 đã CLOSED.**

| ID | Sev | Status | Nội dung |
|---|---|---|---|
| ISSUE-001 | P1 | **CLOSED** | 17/17 OQ đã được trả lời |
| ISSUE-002 | P2 | OPEN | Satori (`next/og`) chỉ hỗ trợ tập con CSS + cần font có dấu tiếng Việt → Phase 6 |
| ISSUE-003 | P2 | OPEN | Zalo in-app webview chưa kiểm chứng trên thiết bị thật → Phase 6 |
| ISSUE-004 | P2 | **CLOSED** | TS 7 + ESLint 10 đã vỡ thật; pin `typescript@6.0.3` + `eslint@9.39.5` |
| ISSUE-005 | P3 | OPEN | `is_admin()` thêm một truy vấn `profiles` mỗi câu lệnh. Đã viết dạng `(select public.is_admin())`; **chưa đo `EXPLAIN`** → Phase 11 |
| ISSUE-006 | P3 | **CLOSED** | Không xử lý gì quanh ngày nghỉ ở v1 |
| ISSUE-007 | P3 | OPEN | Chưa có audit log; chỉ cần nếu mở quyền sửa sau `COMPLETED` |
| ISSUE-008 | P3 | OPEN | `docs/01` mâu thuẫn về khi nào `AchievementResult.percent = null` → **phải chốt đầu Phase 5** |
| ISSUE-009 | P3 | OPEN | **MỚI** — Next 16.3 deprecate tên `middleware.ts`, khuyến nghị `proxy.ts`. Cố ý hoãn, có điều kiện kích hoạt |
| ISSUE-010 | P3 | OPEN | **MỚI** — máy đang chạy **3 stack Supabase local**; chọn nhầm container đã xảy ra thật |
| ISSUE-011 | **P1** | OPEN | service role key lọt vào transcript hội thoại do IDE tự đồng bộ `.env.local`. **Phải rotate.** Chưa vào git |
| ISSUE-012 | P3 | OPEN | **MỚI** — sau `supabase db reset`, GoTrue + Kong không tự phục hồi → đăng nhập nhận `502` dù `docker ps` báo `healthy`. Có lệnh khắc phục đã kiểm chứng |
| ISSUE-013 | P3 | OPEN | **MỚI** — NFR-008 (≤ 6 chạm) mâu thuẫn với FR-008 (5 trường bắt buộc). Đo thật **7 chạm / 1,8 giây**. **Cần người dùng quyết định — OQ-18** |

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

**Ba quyết định MỚI của Phase 3 — đọc trước khi sửa `lib/` hay `features/report-*`**

- **DEC-032** — `lib/date.ts` và `lib/currency.ts` **đã triển khai ở Phase 3**, không phải Phase 5.
  Nhưng **`lib/kpi.ts` vẫn là khung** và vẫn bị ISSUE-008 chặn. Đừng nhầm hai chuyện đó với nhau.
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
| `features/report-morning/use-report-draft.ts` | `useReportDraft` — `useSyncExternalStore`, **không** `setState` trong effect |
| `features/report-morning/currency-field.tsx` | Ô tiền + 3 chip cộng nhanh `+1tr/+5tr/+10tr` |
| `features/report-morning/commitment-summary.tsx` | 4 chỉ tiêu cam kết — dùng lại ở `/sales/today` **và** `/sales/today/evening` |
| `components/ui/{textarea,form-field}.tsx` | Primitive mới |
| `components/ui/button.tsx` | Thêm `buttonClassName()` cho CTA dạng `<Link>` |

**Test (Phase 2 + Phase 3):** `vitest.config.mts` (3 project) · `lib/auth/routes.test.ts` ·
`lib/date.test.ts` · `lib/currency.test.ts` · `lib/validation/report.test.ts` ·
`lib/reports/today-cta.test.ts` · `tests/integration/*` (5 file) · `tests/rls/*` (4 file).

**Hai file env (không commit, đều bị `.gitignore` chặn):**

| File | Ai dùng | Trỏ vào đâu |
|---|---|---|
| `.env.local` | Ứng dụng — `npm run dev` / `build` / `start` | Supabase **cloud** (sau khi người dùng tạo project) |
| `.env.test.local` | Bộ test — `npm test` / `npm run test:db` | Supabase **local**, luôn luôn |

`loadEnv('test', …)` nạp `.env.test.local` **sau** `.env.local` nên nó đè lên ⇒ `npm test` không bao
giờ chạm production dù `.env.local` trỏ cloud (DEC-022). Đã kiểm chứng thật: đặt `.env.local` sang
một URL cloud giả, `npm run test:db` vẫn **66/66 PASS**. `tests/integration/setup.ts` còn một chặn
thứ hai — URL không phải localhost thì ném lỗi ngay.

**File sẽ tạo ở Phase 4 (chưa tồn tại):** `features/report-evening/*`, và `eveningReportSchema`
thêm vào `lib/validation/report.ts` (file đã có, chỉ thêm export).

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
> **Fixture của seed rất tiện cho kiểm chứng tay:** `sales.c` chưa có báo cáo hôm nay ·
> `sales.a` đang `MORNING_SUBMITTED` · `sales.b` đã `COMPLETED` — đúng ba trạng thái của FR-007.

---

## Testing State

| Loại | Trạng thái |
|---|---|
| **Build** | ✅ `npm run build` → **exit 0** (Next.js 16.3.0, Turbopack, 7 route) |
| **Typecheck** | ✅ `npm run typecheck` → **exit 0** |
| **Lint** | ✅ `npm run lint` → **exit 0**, 0 error 0 warning |
| **Unit** | ✅ `npm run test:unit` → **140 passed** — `auth/routes` 14 · `date` 33 · `currency` 29 · `validation/report` 47 · `reports/today-cta` 17 |
| **Integration (DB)** | ✅ **47 passed** — UNIQUE, 16 CHECK, FK RESTRICT, 4 trigger, 3 function, bảng GRANT |
| **RLS** | ✅ **26 passed** — JWT thật của `salesA`/`salesB`/`admin`/`inactive` + `anon`, gọi thẳng PostgREST |
| **Tổng `npm test`** | ✅ **213 passed / 213**, 12 test file |
| **UI mobile (Phase 2 — auth)** | ✅ Chromium 375px + 1440px: **32/32 PASS** |
| **UI mobile (Phase 3 — báo cáo sáng)** | ⚠ Chromium 375px + 1440px: **57/58 PASS**. Mục lệch duy nhất là **NFR-008 (7 lần chạm)** — ISSUE-013, không phải lỗi code |
| **Tài khoản inactive** | ✅ **6/6 PASS**, gồm cả bị vô hiệu hoá **giữa phiên** |
| **E2E (Playwright)** | ❌ `N/A — chưa có playwright.config.ts, chưa có e2e/*.spec.ts` |
| **A11y (axe-core)** | ❌ `N/A — chưa chạy` |
| **EXPLAIN ANALYZE / InitPlan** | ❌ `N/A — chưa đo. Phase 11, NFR-002` |
| **Lighthouse** | ❌ `N/A — chưa chạy` |

Bốn dòng cuối **không được diễn giải thành pass** dưới bất kỳ hình thức nào. Ba script kiểm chứng
trình duyệt là **công cụ dùng một lần, đã xoá, không commit** — chúng không phải bộ E2E hồi quy.

---

## Last Working Feature

**Luồng cam kết đầu ngày chạy thật đầu-cuối (Phase 3).** `next build` + `next start` trỏ vào Supabase
local, đăng nhập bằng `sales.c@bikeforce.local` → `/sales/today` hiện "Chưa báo cáo" + empty state →
bấm CTA → điền form → **Lưu** → quay về `/sales/today` với banner "Đã lưu báo cáo đầu ngày", trạng
thái đổi thành "Đã cam kết", CTA đổi thành "Hoàn thành báo cáo cuối ngày" → bấm "Sửa cam kết sáng"
→ form prefill đúng → sửa → banner "Đã cập nhật cam kết sáng". Tài khoản đã `COMPLETED` (`sales.b`)
vào thẳng `/sales/today/morning` thì bị đá về `/sales/today` (BR-019).

Đây là **mốc an toàn thứ ba** để quay về nếu Phase 4 làm vỡ thứ gì.

**Mốc an toàn thứ hai — luồng xác thực đầu-cuối (Phase 2).** `next build` + `next start`, đăng nhập bằng tài khoản seed
(`sales.a@bikeforce.local` / `admin@bikeforce.local`, mật khẩu local `LocalDev#2026`) → vào đúng
dashboard theo role → đăng xuất → bị chặn lại. Sai vai bị đưa về dashboard của chính mình; tài khoản
bị vô hiệu hoá giữa phiên bị đá về `/login?reason=deactivated`.

Đây là **mốc an toàn thứ hai**.

---

## Next Exact Steps

> ✅ Phase 0, Phase 1, Phase 2 và 13/14 mục Phase 3 đã xong — **không làm lại**.

**Hai việc cần người dùng, KHÔNG chặn việc code:**

1. **Rotate service role key (ISSUE-011, P1).** Dashboard → `Project Settings` → `API Keys` → mục
   secret → **`Generate new secret key`** → dán giá trị mới vào `.env.local`.
   **Đóng `.env.local` trong IDE trước khi dán**, hoặc dán bằng terminal — nếu không, IDE lại tự đưa
   key vào ngữ cảnh hội thoại đúng như lần trước (`docs/06 §11.2` biện pháp thứ 8).
2. **Trả lời OQ-18 (ISSUE-013).** NFR-008 ≤ 6 lần chạm không thể đạt cùng lúc với FR-008 (5 trường
   bắt buộc); đo thật được **7 chạm / 1,8 giây**. Ba phương án nằm ở `docs/01 § OQ-18`. Sau khi có
   quyết định: cập nhật `docs/01`, tạo DEC mới nếu nới NFR-008, đo lại, rồi mới tick mục cuối của
   Phase 3 trong `PROJECT_CHECKLIST.md`.

**PHASE 4 — Evening Report (việc chính, bắt đầu ngay, không chờ hai mục trên):**

3. Thêm **`eveningReportSchema`** vào `lib/validation/report.ts` (file đã có — **thêm export, không
   viết file mới**): 4 ô `actual_*` bắt buộc theo `ck_completed_requires_actuals`, `actual_route`
   tuỳ chọn ≤ 300, `evening_note` tuỳ chọn ≤ 1000 (BR-018). Dùng lại `integerField()` và các hằng số
   `MAX_*` đã có. Bảng case ở `docs/08 §3.6` (các dòng `evening_note` và "schema cuối ngày bắt buộc
   đủ 4 chỉ số actual").
4. Thêm test vào `lib/validation/report.test.ts` — gồm `evening_note` 1000 ký tự **tiếng Việt có
   dấu** (`'ừ'.repeat(1000)`) phải hợp lệ và 1001 ký tự phải bị từ chối.
5. Thêm **`completeEveningReport(supabase, reportId, salesId, values)`** vào `services/reports.ts`:
   `update` 4 cột `actual_*` + `evening_note` + `evening_submitted_at = now()` + `status = 'COMPLETED'`,
   rồi `.eq('id')` `.eq('sales_id')` `.select('id')` `.maybeSingle()`. 0 dòng ⇒ `REJECTED` (đã
   `COMPLETED` hoặc không phải của mình). Dùng lại `ReportWriteResult` đã có.
6. Viết `features/report-evening/{actions.ts,evening-report-form.tsx}` — copy đúng khung 7 bước của
   `features/report-morning/actions.ts`, và **dùng lại** `useReportDraft` bằng cách nâng nó lên chỗ
   dùng chung được (`features/X` **không** được import `features/Y` — AGENTS.md §1.2; cân nhắc chuyển
   `use-report-draft.ts` sang `components/` hoặc `lib/` dạng hook thuần).
7. Thay trang tối thiểu `app/(sales)/sales/today/evening/page.tsx` bằng FR-013 + FR-014 thật.
   Guard BR-007 và `CommitmentSummary` **đã có sẵn** trong file đó, giữ nguyên.
8. Sau khi lưu thành công: `status = 'COMPLETED'` ⇒ `getTodayView()` tự đổi CTA và bật
   `canExportImage` — **không phải sửa gì trong `lib/reports/today-cta.ts`**, nó đã có test cho
   nhánh này rồi.

**Việc của Phase 12, chưa cần bây giờ:**

9. Runbook Admin đầu tiên trên cloud (`docs/09 §10`): tạo user trên Dashboard rồi
   `update public.profiles set role = 'ADMIN' where email = '<email>';` — **một lần duy nhất**.
   Chỉ cần trước khi có người dùng thật đăng nhập vào production.

> ⚠ **Chặn ở đầu Phase 5, không phải Phase 4:** ISSUE-008 (`percent = null` khi nào) và cách
> `AchievementResult` mang số vượt tuyệt đối (DEC-025). Phase 4 **chưa cần** `lib/kpi.ts` — màn hình
> cuối ngày chỉ NHẬP số, còn bảng đối chiếu có `%` là Phase 5.

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
- **`lib/kpi.ts` vẫn ném lỗi có chủ đích.** Đừng "làm nốt cho đủ bộ": nó bị ISSUE-008 chặn thật, và
  Phase 3 cố ý không hiển thị `%` nào. Chốt ISSUE-008 trước, viết code sau.
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
- **`/sales/today/evening` là trang tối thiểu có chủ đích** — guard vai + BR-007 + `CommitmentSummary`
  đã đúng và Phase 4 dùng lại được. Chỉ cần **thêm** form, không cần viết lại file.

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

1. **ISSUE-008 — đầu Phase 5:** `docs/01` mâu thuẫn về khi nào `AchievementResult.percent = null`.
   Phải chốt **trước khi** viết thân `calculateAchievement()`.
2. **DEC-025 — đầu Phase 5:** cách `AchievementResult` mang **số vượt tuyệt đối + đơn vị**.
3. **Buộc đổi mật khẩu lần đầu — trước Phase 10:** `docs/06 §3.3` ghi chú 6 nêu hai phương án
   (cờ trong `user_metadata` vs thêm cột vào `profiles`), **chưa chốt**. Phải quyết và ghi thành DEC
   mới **trước** khi làm UC-17. Schema hiện **không có** cột nào cho việc này.
4. **AF-12 (audit log) chưa cần** vì không ai được sửa sau khi hoàn tất. Nếu sau này mở quyền sửa,
   **phải làm audit log trước**, và phải tạo `DEC` mới thay vì sửa DEC-026.
