# BikeForce Session Checkpoint

> Status: ACTIVE | Phase: 2 ĐÃ ĐÓNG (14/14) → sẵn sàng Phase 3 | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

Đây là file **quan trọng nhất** để một session hoàn toàn mới tiếp tục công việc mà không phải làm
lại từ đầu. Đọc file này ngay sau `BIKEFORCE_MASTER_SPEC.md`.

---

## Current State

**Current Phase:** `PHASE 2 — Database & Auth` — ✅ **ĐÃ ĐÓNG, 14/14 mục `[x]`** (2026-08-07).

**Current Task:** **Bắt đầu PHASE 3 — Morning Report.** Không còn gì chặn, không chờ đầu vào nào.

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

---

## Currently Working On

**Không có công việc code nào đang dở.** Đang chờ **đúng một** đầu vào từ người dùng: Supabase
project trên cloud. Mọi việc khác của Phase 2 đã xong và đã kiểm chứng.

---

## Not Started

- **Phase 3 → Phase 12:** chưa bắt đầu. Chưa có form nhập liệu, chưa có Zod schema báo cáo, chưa có
  Server Action ghi báo cáo, chưa có route handler ảnh, chưa có màn hình Admin thật.
- **Test còn thiếu:** `playwright.config.ts` và toàn bộ `e2e/*.spec.ts` (Phase 11);
  `tests/integration/indexes.test.ts` với `EXPLAIN ANALYZE` (Phase 11); unit test cho
  `lib/kpi|currency|date` (Phase 5).

**Những thứ Phase 2 CỐ Ý chưa làm** (đúng kế hoạch, không phải thiếu sót):
thân hàm `lib/kpi|currency|date` (Phase 5) · bottom nav / sidebar DEC-018 (Phase 7, Phase 8) ·
UC-17/18/19 tạo và quản lý tài khoản Sales (Phase 10) · `lib/supabase/admin.ts` chưa được gọi ở
đâu cả (đúng — nó chỉ dùng từ Phase 10).

> `/sales/today` và `/admin` hiện là **trang tối thiểu của Phase 2**, chỉ để luồng đăng nhập có đích
> đến thật và test được. FR-007 (Phase 3) và FR-024 (Phase 8) mới là nội dung thật. Điều này đã ghi
> ngay trong comment đầu hai file đó.

---

## Known Issues

Chi tiết đầy đủ ở `docs/12-known-issues.md`. **Còn 7 OPEN, 3 đã CLOSED.**

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
| ISSUE-011 | **P1** | OPEN | **MỚI** — service role key lọt vào transcript hội thoại do IDE tự đồng bộ `.env.local`. **Phải rotate.** Chưa vào git |

---

## Important Business Decisions

Danh sách đầy đủ DEC-001..DEC-031 ở `docs/11-decisions.md`. Những điều một session mới **bắt buộc
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

**Test (Phase 2 — MỚI):** `vitest.config.mts` (3 project) · `lib/auth/routes.test.ts` ·
`tests/integration/*` (5 file) · `tests/rls/*` (4 file).

**Hai file env (không commit, đều bị `.gitignore` chặn):**

| File | Ai dùng | Trỏ vào đâu |
|---|---|---|
| `.env.local` | Ứng dụng — `npm run dev` / `build` / `start` | Supabase **cloud** (sau khi người dùng tạo project) |
| `.env.test.local` | Bộ test — `npm test` / `npm run test:db` | Supabase **local**, luôn luôn |

`loadEnv('test', …)` nạp `.env.test.local` **sau** `.env.local` nên nó đè lên ⇒ `npm test` không bao
giờ chạm production dù `.env.local` trỏ cloud (DEC-022). Đã kiểm chứng thật: đặt `.env.local` sang
một URL cloud giả, `npm run test:db` vẫn **66/66 PASS**. `tests/integration/setup.ts` còn một chặn
thứ hai — URL không phải localhost thì ném lỗi ngay.

**File sẽ tạo ở Phase 3 (chưa tồn tại):** `lib/validation/report.ts`, `features/report-morning/*`,
`app/(sales)/sales/today/morning/page.tsx`.

---

## Database State

**Supabase LOCAL: đã có schema đầy đủ và đã chạy thật.** Supabase CLOUD: **chưa tạo**.

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

---

## Testing State

| Loại | Trạng thái |
|---|---|
| **Build** | ✅ `npm run build` → **exit 0** (Next.js 16.3.0, Turbopack, 6/6 static pages) |
| **Typecheck** | ✅ `npm run typecheck` → **exit 0** |
| **Lint** | ✅ `npm run lint` → **exit 0**, 0 error 0 warning |
| **Unit** | ✅ `npm run test:unit` → **14 passed** (`lib/auth/routes.test.ts`) |
| **Integration (DB)** | ✅ **40 passed** — UNIQUE, 16 CHECK, FK RESTRICT, 4 trigger, 3 function, bảng GRANT |
| **RLS** | ✅ **26 passed** — JWT thật của `salesA`/`salesB`/`admin`/`inactive` + `anon`, gọi thẳng PostgREST |
| **Tổng `npm test`** | ✅ **80 passed / 80**, 8 test file |
| **UI mobile** | ✅ Chromium 375px + 1440px: **32/32 PASS** — không cuộn ngang, touch target ≥44px, input ≥48px + 16px, mọi input có `<label for>` |
| **Tài khoản inactive** | ✅ **6/6 PASS**, gồm cả bị vô hiệu hoá **giữa phiên** |
| **E2E (Playwright)** | ❌ `N/A — chưa có playwright.config.ts, chưa có e2e/*.spec.ts` |
| **A11y (axe-core)** | ❌ `N/A — chưa chạy` |
| **EXPLAIN ANALYZE / InitPlan** | ❌ `N/A — chưa đo. Phase 11, NFR-002` |
| **Lighthouse** | ❌ `N/A — chưa chạy` |

Bốn dòng cuối **không được diễn giải thành pass** dưới bất kỳ hình thức nào. Hai script kiểm chứng
trình duyệt là **công cụ dùng một lần, đã xoá, không commit** — chúng không phải bộ E2E hồi quy.

---

## Last Working Feature

**Luồng xác thực đầu-cuối chạy thật.** `next build` + `next start`, đăng nhập bằng tài khoản seed
(`sales.a@bikeforce.local` / `admin@bikeforce.local`, mật khẩu local `LocalDev#2026`) → vào đúng
dashboard theo role → đăng xuất → bị chặn lại. Sai vai bị đưa về dashboard của chính mình; tài khoản
bị vô hiệu hoá giữa phiên bị đá về `/login?reason=deactivated`.

Đây là **mốc an toàn thứ hai** để quay về nếu Phase 3 làm vỡ thứ gì.

---

## Next Exact Steps

> ✅ Phase 0, Phase 1 và 13/14 mục Phase 2 đã xong — **không làm lại**.

> ✅ **Nhóm A và B của bản checkpoint trước đã HOÀN TẤT** — Supabase cloud đã tạo, đã tắt signup, đã
> `link` + `db push` + `gen types --linked`, đã kiểm chứng bằng HTTP thật. Không làm lại.

**Việc bảo mật, làm trước (ISSUE-011, P1):**

1. **Rotate service role key.** Dashboard → `Project Settings` → `API Keys` → mục secret →
   **`Generate new secret key`** → dán giá trị mới vào `.env.local`.
   **Đóng `.env.local` trong IDE trước khi dán**, hoặc dán bằng terminal — nếu không, IDE lại tự đưa
   key vào ngữ cảnh hội thoại đúng như lần trước (`docs/06 §11.2` biện pháp thứ 8).

**PHASE 3 — Morning Report (việc chính, bắt đầu ngay):**

2. Viết `lib/validation/report.ts` — `morningReportSchema` theo `docs/08 §3` (từ chối số âm, `NaN`,
   `Infinity`, chuỗi rác, ngày tương lai; trần doanh thu 100 tỷ; `planned_route` 1–300 sau `btrim`).
   Schema **không được** khai báo `sales_id`, `status`, `report_date` — server tự đặt (AGENTS.md §8).
3. Viết `lib/validation/report.test.ts` — bảng case đã liệt kê sẵn ở `docs/08 §3`, gồm cả biên
   `100000000000` (hợp lệ) và `100000000001` (không hợp lệ).
4. Viết `services/reports.ts` → `getTodayReport(supabase, salesId, today)` dùng
   `uq_daily_reports_sales_date`, `select` tường minh cột, **không** `select('*')`.
5. Viết `features/report-morning/` (form + `saveMorningReport` action) và
   `app/(sales)/sales/today/morning/page.tsx`; đồng thời thay trang tối thiểu `/sales/today` bằng
   FR-007 thật (trạng thái báo cáo hôm nay + **đúng 1 CTA chính** theo `status`).

**Việc của Phase 12, chưa cần bây giờ:**

6. Runbook Admin đầu tiên trên cloud (`docs/09 §10`): tạo user trên Dashboard rồi
   `update public.profiles set role = 'ADMIN' where email = '<email>';` — **một lần duy nhất**.
   Chỉ cần trước khi có người dùng thật đăng nhập vào production.

> ⚠ **Chặn ở đầu Phase 5, không phải Phase 3:** ISSUE-008 (`percent = null` khi nào) và cách
> `AchievementResult` mang số vượt tuyệt đối (DEC-025). Phase 3 chưa cần `lib/kpi.ts`.

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

---

## OPEN QUESTIONS — ✅ ĐÃ ĐÓNG TOÀN BỘ

**Không còn câu hỏi nghiệp vụ nào chờ trả lời.** Người dùng đã trả lời đủ **17/17** ngày `2026-08-07`.
Danh sách đầy đủ kèm câu trả lời chính thức: `docs/01-business-analysis.md § OPEN QUESTIONS`.

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
