# BikeForce Session Checkpoint

> Status: ACTIVE | Phase: 1 (đã hoàn tất) | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

Đây là file **quan trọng nhất** để một session hoàn toàn mới tiếp tục công việc mà không phải làm
lại từ đầu. Đọc file này ngay sau `BIKEFORCE_MASTER_SPEC.md`.

---

## Current State

**Current Phase:** `PHASE 1 — Foundation` — **HOÀN TẤT** ngày 2026-08-07. Toàn bộ 14 mục của Phase 1
trong `PROJECT_CHECKLIST.md` đã `[x]`, và baseline build/typecheck/lint đã chạy thật, xanh.

**Current Task:** Sẵn sàng bắt đầu **PHASE 2 — Database & Auth**. Không còn việc gì dở dang ở Phase 1
và không còn OPEN QUESTION nghiệp vụ nào chờ trả lời.

> ⚠ **Phase 2 mở đầu bằng một bước KHÔNG tự động hoá được:** người dùng phải tự tạo Supabase project
> trên dashboard. Người dùng đã yêu cầu **hướng dẫn thật chi tiết từng thao tác bấm** ở khúc Supabase
> và Vercel — không được chỉ đưa lệnh CLI rồi tự chạy.

**Current Branch:** `main` — remote `origin` =
`https://github.com/LeDuyKhangZz/BikeForce-Bicycle-Sales-Management.git` (DEC-028).
`.gitignore` **đã kiểm chứng lại sau khi scaffold**: chặn `.env.local`, cho phép `.env.example`.

> ⚠ **`git push` KHÔNG chạy được từ phía agent** (phát hiện 2026-08-07). Credential helper là
> Git Credential Manager và môi trường không có TTY nên push luôn fail
> (`could not read Username for 'https://github.com'`), kể cả khi tắt sandbox.
> **Đây là giới hạn kỹ thuật, không phải thiếu quyền** — quyền push đứng vẫn còn hiệu lực.
> Cách làm: agent **commit bình thường**, rồi **báo người dùng tự chạy `git push origin main`**.
> Commit `7febb6b` (Phase 1) đang **chờ người dùng push**.

---

## Completed

### Phase 0 (2026-08-07) — xem chi tiết ở `WORKLOG.md` Entry 001 + 002

Bộ 17 tài liệu kiểm soát dự án; 21 UC · 37 FR · 15 NFR · 25 BR · 15 AF; DEC-001..DEC-030 (**30/30
APPROVED**); ISSUE-001..ISSUE-007; **17/17 OPEN QUESTION đã được người dùng trả lời**; git init +
push GitHub; đo contrast toàn bộ palette; chạy thật skill `ui-ux-pro-max`.

### Phase 1 (2026-08-07) — xem chi tiết ở `WORKLOG.md` Entry 003

- **Next.js 16.3.0 App Router + TypeScript + Tailwind v4 + ESLint**, không dùng `src/`, alias `@/*`.
  Scaffold vào thư mục tạm rồi copy chọn lọc vì `create-next-app` từ chối chạy trong thư mục đã có
  file markdown — cách này đồng thời **cứu `AGENTS.md` / `CLAUDE.md` / `.gitignore` khỏi bị ghi đè**
  (template của Next 16.3 mặc định sinh cả `AGENTS.md` và `CLAUDE.md`).
- **Smoke test ISSUE-004 / DEC-002 — rủi ro đã xảy ra thật ở CẢ HAI package.** Đã pin
  `typescript@6.0.3` + `eslint@9.39.5`. ISSUE-004 nay `CLOSED`.
- **424 package đã cài, phiên bản pin chính xác** (không dùng dải `^`). `playwright install chromium`
  đã tải xong.
- **Cấu trúc thư mục DEC-023 đầy đủ** — 31 thư mục kèm `.gitkeep`.
- **3 Supabase client** đúng vai trò + `lib/env.ts` validate biến môi trường (tránh `!`).
- **`.env.example`** đủ 4 biến, chỉ placeholder.
- **Design token DEC-014 vào `@theme`** + type scale + breakpoint + `.tabular` + `prefers-reduced-motion`.
- **Font Inter** (`latin` + `vietnamese`, `display: swap`), `<html lang="vi">`, không khoá zoom.
- **Khung `lib/kpi.ts` · `lib/currency.ts` · `lib/date.ts`** đúng signature Master Spec §9 (thân hàm
  `throw`, logic ở Phase 5).
- **6 primitive UI**: Button, Input, Label, Card, Badge, Skeleton.
- **Kiểm chứng bằng công cụ thật:** build/typecheck/lint đều exit 0; Chromium ở 375px và 1440px xác
  nhận không cuộn ngang, không touch target < 44px, token màu và font Inter áp đúng.

---

## Currently Working On

**Không có công việc code nào đang dở, và không chờ đầu vào nào từ người dùng ở thời điểm này.**
Việc kế tiếp là bắt đầu Phase 2 — xem `Next Exact Steps`.

---

## Not Started

- **Phase 2 — Database & Auth:** chưa có Supabase project, chưa có migration nào, chưa có RLS policy,
  chưa có `/login`, chưa có `middleware.ts`, chưa có layout guard.
- **Phase 3 → Phase 12:** chưa bắt đầu. Chưa có form, Server Action, Zod schema, route handler ảnh,
  route nghiệp vụ nào.
- **Test:** chưa có `vitest.config.ts`, chưa có một file `*.test.ts` hay `e2e/*.spec.ts` nào.

**Những thứ Phase 1 CỐ Ý chưa làm** (đúng kế hoạch, không phải thiếu sót):
`middleware.ts` · `lib/validation/*` · `services/*` · thân hàm `lib/kpi|currency|date` ·
`vitest.config.ts` · `playwright.config.ts` · `types/database.types.ts` thật.

---

## Known Issues

Chi tiết đầy đủ ở `docs/12-known-issues.md`. **Còn 5 OPEN, 3 đã CLOSED.**

| ID | Sev | Status | Nội dung |
|---|---|---|---|
| ISSUE-001 | P1 | **CLOSED** | 17/17 OQ đã được trả lời |
| ISSUE-002 | P2 | OPEN | Satori (`next/og`) chỉ hỗ trợ tập con CSS + cần font có dấu tiếng Việt → Phase 6 |
| ISSUE-003 | P2 | OPEN | Zalo in-app webview chưa kiểm chứng trên thiết bị thật → Phase 6 |
| ISSUE-004 | P2 | **CLOSED** | TS 7 + ESLint 10 **đã vỡ thật**; pin `typescript@6.0.3` + `eslint@9.39.5` |
| ISSUE-005 | P3 | OPEN | `is_admin()` thêm một truy vấn `profiles` mỗi câu lệnh → viết `(select public.is_admin())` |
| ISSUE-006 | P3 | **CLOSED** | Không xử lý gì quanh ngày nghỉ ở v1 |
| ISSUE-007 | P3 | OPEN | Chưa có audit log; chỉ cần nếu mở quyền sửa sau `COMPLETED` |
| ISSUE-008 | P3 | OPEN | **MỚI** — `docs/01` mâu thuẫn về khi nào `AchievementResult.percent = null` → **phải chốt đầu Phase 5** |

---

## Important Business Decisions

Danh sách đầy đủ DEC-001..DEC-030 ở `docs/11-decisions.md`. Những điều một session mới **bắt buộc
phải biết** trước khi động vào code:

**Kiến trúc & bảo mật**

- **DEC-003** — Server Components để **đọc**, Server Actions để **ghi**; **không** REST API riêng cho
  CRUD báo cáo. Route Handler duy nhất: `GET /api/reports/[id]/share-image`.
- **DEC-004** — **RLS là biên giới bảo mật thật**; middleware và layout guard chỉ là defense-in-depth.
- **DEC-005** — Service role key **chỉ** cho `auth.admin.*`, **không bao giờ** đọc/ghi `daily_reports`.
- **DEC-006** — `is_admin()` phải `SECURITY DEFINER` và gọi dạng `(select public.is_admin())`.
- **DEC-023** — Business logic và data access **không** được viết trong component.

**Toolchain (mới chốt ở Phase 1)**

- **DEC-002 — đã có KẾT LUẬN SMOKE TEST.** Pin `typescript@6.0.3` + `eslint@9.39.5`.
  **Đừng "nâng cấp cho mới"**: TS 7 bị `typescript-eslint@8.66.0` từ chối (peer `<6.1.0`), ESLint 10
  làm vỡ `eslint-plugin-react@7.37.5` (bản mới nhất tồn tại, chỉ hỗ trợ `^9.7`).
- Next 16 dùng **Turbopack mặc định**; `create-next-app@16.3` không còn hỏi và không còn cờ `--turbopack`.

**Nghiệp vụ & dữ liệu**

- **DEC-007** — Achievement **không persist**, tính runtime (BR-011).
- **DEC-008** — Tiền lưu `bigint` VND nguyên; format chỉ ở tầng hiển thị (BR-010).
- **DEC-009** — Ngày nghiệp vụ bằng `Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})` (BR-005).
- **DEC-020** — Chỉ 2 trạng thái `MORNING_SUBMITTED` / `COMPLETED` (BR-008).
- **DEC-025** — `target=0 & actual=0` → `100,0%`; `target=0 & actual>0` → `percent = null` + **số vượt
  tuyệt đối** có dấu cộng và đơn vị (`+3 xe`, `+3.000.000 ₫`). **Cách cài đặt chốt ở Phase 5.**
- **DEC-026** — **Không** sửa sau `COMPLETED`, Admin **không** sửa báo cáo, **không** xoá, **không**
  nhập bù ngày cũ.
- **DEC-029 / DEC-030** — Viếng thăm giữ cả cột số lẫn cột text; không ngày nghỉ, không team/vùng,
  chỉ 2 role; KPI do **Sales tự cam kết**.

**UI/UX**

- **DEC-012/013/014** — Swiss Modernism 2.0; chỉ font Inter; bảng màu theo contrast **đã đo**.
- **DEC-016** — Không dark mode ở v1 (trừ thẻ share vốn dark cố định).
- **DEC-017** — Route `/login`, không `/auth/login`.
- **DEC-018/019** — Bottom nav ≤5 mục ở mobile, sidebar từ 1024px; bảng so sánh render 4 card ở
  mobile, chỉ dùng `<table>` từ 768px.

---

## Important Files

**Tài liệu điều khiển (17 file từ Phase 0):** `CLAUDE.md`, `AGENTS.md`, `docs/01`…`docs/12`,
`WORKLOG.md`, `SESSION_CHECKPOINT.md`, `PROJECT_CHECKLIST.md`.

**Source code đã tồn tại (Phase 1):**

| File | Vai trò |
|---|---|
| `package.json` | Phiên bản **đã pin chính xác** — không sửa thành dải `^` |
| `tsconfig.json` | `strict: true` + `noUncheckedIndexedAccess: true` |
| `eslint.config.mjs` | `no-explicit-any` mức **error**; `no-unused-vars` error + `argsIgnorePattern: "^_"` |
| `app/layout.tsx` | Font Inter, `lang="vi"`, viewport không khoá zoom |
| `app/globals.css` | **Toàn bộ design token DEC-014** trong `@theme` + type scale + breakpoint |
| `app/page.tsx` | Trang tạm — Phase 2 thay bằng redirect theo role |
| `lib/env.ts` | Đọc env **có validate**, validate lúc gọi (không lúc import) |
| `lib/supabase/client.ts` | Browser, anon, chịu RLS |
| `lib/supabase/server.ts` | **Đường dữ liệu chính** — RSC + Server Action + Route Handler |
| `lib/supabase/admin.ts` | Service role, `import 'server-only'`, **CHỈ** `auth.admin.*` |
| `lib/kpi.ts` · `lib/currency.ts` · `lib/date.ts` | **Khung, thân hàm `throw`** — logic ở Phase 5 |
| `lib/utils.ts` | `cn()` — cố ý không dùng `clsx`/`tailwind-merge` |
| `components/ui/*.tsx` | 6 primitive không biết nghiệp vụ |
| `types/database.types.ts` | ⚠ **Placeholder rỗng** — Phase 2 generate đè |
| `.env.example` | 4 biến, chỉ placeholder |

**File sẽ tạo ở Phase 2 (chưa tồn tại):** `middleware.ts`, `supabase/migrations/0001_*.sql` →
`0005_*.sql`, `supabase/seed.sql`, `app/(auth)/login/page.tsx`, `lib/auth/*`, `services/*`.

---

## Database State

**Chưa có Supabase project, chưa có migration nào được viết hay chạy.** Schema hiện chỉ ở **mức đề
xuất** trong `docs/02-database-design.md` — nhưng nay **đã hết blocker nghiệp vụ**, viết được ngay.

- Không có `supabase/migrations/*.sql`, không có `supabase/seed.sql` (thư mục đã tạo, đang rỗng).
- `types/database.types.ts` **là placeholder rỗng do Phase 1 tạo** để 3 Supabase client typecheck
  được. Phase 2 phải ghi đè bằng `supabase gen types typescript --linked`.
- Thiết kế đã chốt: 2 enum (`user_role`, `report_status`), 2 bảng (`public.profiles`,
  `public.daily_reports`), `UNIQUE(sales_id, report_date)`, 4 CHECK chính, 5 index, 7 function/trigger,
  RLS deny-by-default trên cả 2 bảng, **không cấp DELETE policy**.
- Cột đã chốt theo OQ: `target_visit_points` + `visit_purpose`, `actual_visit_points` + `actual_route`.
  **Không** có cột `deleted_at` (OQ-13).

---

## Testing State

| Loại | Trạng thái |
|---|---|
| **Build** | ✅ `npm run build` → **exit 0** (Next.js 16.3.0, Turbopack, 3/3 static pages) |
| **Typecheck** | ✅ `npm run typecheck` → **exit 0** (`tsc --noEmit`, strict + noUncheckedIndexedAccess) |
| **Lint** | ✅ `npm run lint` → **exit 0**, **0 error 0 warning** |
| **UI mobile** | ✅ Chromium 375px + 1440px: không cuộn ngang, không touch target < 44px, token màu và font Inter áp đúng |
| **Unit** | ❌ `N/A — chưa có file test nào.` Vitest đã cài, `vitest.config.ts` **chưa có** |
| **Integration** | ❌ `N/A — chưa có Supabase local, chưa có schema` |
| **E2E** | ❌ `N/A — chưa có `playwright.config.ts`, chưa có spec nào` (chromium đã tải) |
| **RLS** | ❌ `N/A — chưa có policy nào để test` |

Bốn dòng cuối **không được diễn giải thành pass** dưới bất kỳ hình thức nào.

---

## Last Working Feature

**Baseline Phase 1** — ứng dụng Next.js chạy được thật: `npm run build` rồi `npm run start` phục vụ
`/` trả HTTP 200, render đúng font Inter và đúng bảng màu, không cuộn ngang ở 375px.

Đây là **mốc an toàn đầu tiên** để quay về nếu Phase 2 làm vỡ thứ gì.

---

## Next Exact Steps

> ✅ Phase 0 và Phase 1 đã xong — **không làm lại**. Bắt đầu thẳng từ bước 1.

1. **Hướng dẫn người dùng tạo Supabase project** (họ tự bấm, agent không làm thay được). Phải viết
   **chi tiết từng thao tác**, tối thiểu gồm: đăng nhập supabase.com → New project → đặt tên
   `bikeforce` → **Region: Southeast Asia (Singapore)** → đặt Database Password và lưu lại →
   Create. Sau đó **Project Settings → API** để lấy 3 giá trị, và **Authentication → Providers →
   Email** để **TẮT "Enable email signups"** (BR-012, FR-006 — không self-registration).
2. **Người dùng tạo `.env.local`** từ `.env.example` và điền 3 giá trị vừa lấy. Nhắc rõ:
   `SUPABASE_SERVICE_ROLE_KEY` là secret, **không** dán vào chat, **không** commit.
3. **Viết migration theo đúng thứ tự** (mỗi file tự chứa cả `enable row level security` +
   `force row level security` + policy tường minh, không tách sang file sau — AGENTS.md §7):
   `supabase/migrations/0001_init_enums_profiles.sql` → `0002_daily_reports.sql` →
   `0003_functions_triggers.sql` → `0004_rls_policies.sql` → `0005_indexes.sql`.
   Nội dung chi tiết cột / CHECK / index / policy đã có sẵn trong `docs/02-database-design.md` và
   `docs/06-auth-permissions.md` — **bám sát, không thiết kế lại**.
4. **Đẩy migration** bằng `npx supabase link --project-ref <ref>` rồi `npx supabase db push`.
   **Không** sửa schema bằng tay trên Dashboard.
5. **Generate types thật:** `npx supabase gen types typescript --linked > types/database.types.ts`
   — ghi đè placeholder hiện tại, rồi commit.
6. **Viết `middleware.ts`** (refresh session cookie + route/role guard) và `app/(auth)/login/page.tsx`
   + Server Action đăng nhập.
7. **Viết RLS test bằng JWT thật** của `salesA` / `salesB` / `admin` — đây là điều kiện bắt buộc để
   đóng Phase 2 (AGENTS.md §11). Cần `vitest.config.ts` trước.
8. **Chạy lại đủ 4 lệnh** (`build`, `typecheck`, `lint`, `test`), ghi **output thật** vào `WORKLOG.md`
   Entry 004, tick `PROJECT_CHECKLIST.md § Phase 2`, cập nhật file này, rồi commit + push.

---

## DO NOT REDO

Những việc dưới đây **đã hoàn tất và đã được ghi lại**. Làm lại là lãng phí và có nguy cơ tạo ra kết
quả mâu thuẫn với tài liệu hiện có.

**Từ Phase 0:**

- **Đã đọc toàn bộ `BIKEFORCE_MASTER_SPEC.md`** — nội dung đã chắt lọc vào `docs/01`..`docs/12`.
- **Đã clone và CHẠY THẬT skill `ui-ux-pro-max`** (9 lệnh `search.py` + đọc đầy đủ `pro-rules.md`,
  `quick-reference.md`) — **không clone lại, không chạy lại**. Kết quả ở `docs/05` (DEC-012/013/015).
- **Đã đo contrast toàn bộ bảng màu bằng script** — **không đo lại**. Bảng token cuối cùng và các màu
  bị loại vì fail đã ghi ở `docs/05` (DEC-014).
- **Đã `git init` + push GitHub** (DEC-028) — **không init lại**. Người dùng cấp **quyền push đứng**:
  commit và push sau mỗi lần code xong, **không hỏi lại**.
- **Đã hỏi và nhận đủ 17/17 câu trả lời OPEN QUESTION** — **tuyệt đối không hỏi lại**. Câu trả lời
  chính thức ở `docs/01-business-analysis.md § OPEN QUESTIONS`.
- **Đã parse kiểm chứng 30/30 khối Mermaid** bằng mermaid 11.16.1 — chỉ chạy lại khi sửa sơ đồ.
- **Bộ 17 tài liệu Phase 0 đã tạo xong** — **chỉ cập nhật, không viết lại từ đầu**. Giữ nguyên toàn bộ
  ID `BR-xxx` / `FR-xxx` / `NFR-xxx` / `UC-xx` / `OQ-xx` / `DEC-xxx` / `ISSUE-xxx` / `AF-xx`.
  **Không bao giờ renumber.**

**Từ Phase 1 (mới):**

- **Đã chạy smoke test tương thích toolchain** — **không thử lại TypeScript 7 hay ESLint 10**. Cả hai
  đã được chứng minh là vỡ, kèm nguyên văn lỗi và peer range, ở `docs/11 § DEC-002 — KẾT LUẬN SMOKE
  TEST` và ISSUE-004 § Verification. Chỉ xét lại khi **cả** `eslint-plugin-react` hỗ trợ ESLint 10
  **và** `typescript-eslint` hỗ trợ TS ≥ 7.1 — và khi đó phải tạo **DEC mới**.
- **Đã khởi tạo Next.js và pin phiên bản** — **không chạy lại `create-next-app`**, không đổi phiên bản
  đã pin trong `package.json` thành dải `^`.
- **Đã dựng cấu trúc thư mục DEC-023** (31 thư mục + `.gitkeep`) — không dựng lại, không đổi tên.
- **Đã tạo 3 Supabase client và `lib/env.ts`** — không tạo thêm client Supabase ad-hoc ở nơi khác
  (AGENTS.md §6: chỉ đúng 3 file này).
- **Đã khai báo design token DEC-014 vào `@theme`** và đã **kiểm chứng trên trình duyệt thật**
  (`body` = `rgb(248,250,252)`, `h1` = `rgb(30,58,138)`) — không đo lại, không khai báo lại.
- **Đã kiểm chứng `.gitignore` chặn `.env.local`** sau khi scaffold — không cần thử lại.

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
| OQ-11 | `target=0 & actual=0` → `100,0%`; `actual>0` → `percent = null` + số vượt tuyệt đối, loại khỏi mẫu số khi tổng hợp |
| OQ-12 | Chỉ đúng **ngày hôm nay** giờ VN; không nhập bù |
| OQ-13 | **KHÔNG** xoá báo cáo — kể cả soft delete |
| OQ-14 | Doanh thu = **giá trị đơn hàng chốt trong ngày** |
| OQ-15 | **Chưa** chia team / khu vực ở v1 |
| OQ-16 | **Chỉ 2 role**: `ADMIN`, `SALES` |
| OQ-17 | "Ngày đạt KPI" = đạt **cả 4** chỉ tiêu ≥ 100% |

**Hai điểm kỹ thuật còn treo (không chặn tiến độ, phải chốt đúng lúc):**

1. **ISSUE-008 — đầu Phase 5:** `docs/01` mâu thuẫn về khi nào `AchievementResult.percent = null`.
   Phải chốt **trước khi** viết thân `calculateAchievement()`.
2. **DEC-025 — đầu Phase 5:** cách `AchievementResult` mang **số vượt tuyệt đối + đơn vị**
   (thêm tham số đơn vị, hay trả số vượt thô để tầng hiển thị format). `docs/11` ghi rõ
   *"chốt cách cài đặt ở Phase 5"*.
3. **AF-12 (audit log) chưa cần** vì không ai được sửa sau khi hoàn tất. Nếu sau này mở quyền sửa,
   **phải làm audit log trước**, và phải tạo `DEC` mới thay vì sửa DEC-026.
