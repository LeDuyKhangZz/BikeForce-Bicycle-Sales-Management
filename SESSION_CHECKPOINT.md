# BikeForce Session Checkpoint

> Status: ACTIVE | Phase: 0 | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

Đây là file **quan trọng nhất** để một session hoàn toàn mới tiếp tục công việc mà không phải làm
lại từ đầu. Đọc file này ngay sau `BIKEFORCE_MASTER_SPEC.md`.

---

## Current State

**Current Phase:** `PHASE 0 — Discovery & Business Analysis` — **HOÀN TẤT.** Deliverable đủ 17 tài liệu,
và **17/17 OPEN QUESTION đã được người dùng trả lời ngày 2026-08-07**. Không còn blocker nghiệp vụ.

**Current Task:** Sẵn sàng bắt đầu **PHASE 1 — Foundation**. Không còn việc gì đang dở dang ở Phase 0,
và không còn OPEN QUESTION nào chờ trả lời. Phase 2 (migrations + RLS) cũng đã hết blocker nghiệp vụ.

**Current Branch:** `main` — repository đã được `git init` ở Phase 0 và push lên GitHub
`https://github.com/LeDuyKhangZz/BikeForce-Bicycle-Sales-Management.git` (DEC-028, điều chỉnh mốc của DEC-027).
`.gitignore` đã có và **đã kiểm chứng** là chặn `.env*`.

---

## Completed

Toàn bộ khối lượng Phase 0 đã hoàn tất trong phiên ngày 2026-08-07:

- **Đọc toàn bộ `BIKEFORCE_MASTER_SPEC.md`** (69 mục).
- **Khảo sát repository:** rỗng về mã nguồn — chỉ có `BIKEFORCE_MASTER_SPEC.md`,
  `PROMPT_FIRST_SESSION.md`, `PROMPT_NEXT_SESSION.md`. Không có `package.json`, không có source
  code, không có migration, **không phải git repo**. Toolchain: Node v22.20.0, npm 10.9.3,
  git 2.48.1, Python 3.13.2. Platform: Windows 11 / PowerShell.
- **Clone và CHẠY THẬT skill `ui-ux-pro-max`** (`nextlevelbuilder/ui-ux-pro-max-skill`, clone
  `--depth 1`): đã thực thi `scripts/search.py` bằng Python 3.13.2 với **9 lệnh** (2 `--design-system`,
  1 `--domain product`, 1 `--domain style`, 1 `--domain color`, 1 `--domain typography`,
  2 `--domain ux`, 1 `--stack nextjs`), và đọc đầy đủ `references/pro-rules.md` +
  `references/quick-reference.md`.
- **Xác minh phiên bản npm latest stable tại 2026-08-07:** next 16.3.0, react 19.2.8,
  typescript 7.0.2, tailwindcss 4.3.3, @supabase/supabase-js 2.112.2, @supabase/ssr 0.12.4,
  zod 4.4.3, @playwright/test 1.62.1, vitest 4.1.10, eslint 10.8.0, lucide-react 1.29.0,
  html-to-image 1.11.13 (chỉ fallback).
- **Đo contrast toàn bộ bảng màu bằng script** (sáng + dark card 9:16), loại 4 màu fail
  (`#94A3B8` 2.56:1, `#DBEAFE` 1.22:1, `#16A34A` 3.30:1, `#D97706` làm chữ 3.19:1) và chốt bộ thay
  thế đạt AA/AAA — DEC-014.
- **Phân tích nghiệp vụ và chốt:** 6 actor, **21 use case** (UC-01..UC-21), **37 functional
  requirement** (FR-001..FR-037), **15 NFR** (NFR-001..NFR-015), **25 business rule**
  (BR-001..BR-025), **15 đề xuất tính năng Admin** (AF-01..AF-15) theo format Master Spec §69.
- **Đề xuất kỹ thuật (mức đề xuất, chưa triển khai):** database schema 2 bảng + 2 enum + constraint
  + 5 index + 7 function/trigger; RLS deny-by-default; system architecture Next.js 16 App Router +
  3 Supabase client; page map 16 route; navigation bottom nav / sidebar; chiến lược xuất ảnh 9:16
  server-side (DEC-010); testing strategy 5 tầng; deployment Supabase Singapore + Vercel `sin1`.
- **Tạo đủ 17 tài liệu kiểm soát dự án** theo Master Spec §44.
- **Ghi DEC-001..DEC-030** vào `docs/11-decisions.md` (**toàn bộ 30 đều APPROVED** sau khi người dùng trả lời OQ) và
  **ISSUE-001..ISSUE-007** vào `docs/12-known-issues.md` (tất cả `OPEN`).
- **Gom 17 OPEN QUESTION** OQ-01..OQ-17 vào một danh sách duy nhất, trình cho người dùng, và **nhận đủ 17/17 câu trả lời ngày 2026-08-07**. Đã đồng bộ câu trả lời vào toàn bộ 17 tài liệu.
- **Khởi tạo git + push lên GitHub** `LeDuyKhangZz/BikeForce-Bicycle-Sales-Management` (DEC-028).
- **Kiểm chứng bằng công cụ:** 30/30 khối Mermaid parse sạch bằng mermaid 11.16.1; toàn bộ contrast tính bằng công thức WCAG; `.gitignore` chặn `.env` đã thử thực nghiệm.

---

## Currently Working On

**Không có công việc code nào đang dở, và không còn chờ đầu vào nào từ người dùng.**

- ✅ Toàn bộ **17/17 OPEN QUESTION đã được trả lời ngày 2026-08-07**.
- ✅ `docs/11-decisions.md` đã cập nhật: **30/30 DEC đều `APPROVED`**, 0 `PROPOSED`.
- ✅ Đã đồng bộ câu trả lời sang `docs/01`, `docs/02`, `docs/03`, `docs/04`, `docs/05`, `docs/06`,
  `docs/09`, `docs/12`, `CLAUDE.md`, `AGENTS.md`, `PROJECT_CHECKLIST.md`.
- ✅ `ISSUE-001` (P1) đã `CLOSED` với mục Verification điền đủ.
- **Việc kế tiếp là bắt đầu Phase 1** — xem mục `Next Exact Steps`.

---

## Not Started

Toàn bộ Phase 1 → Phase 12 chưa bắt đầu — **chưa có một dòng mã nguồn nào**:

- **Phase 1 — Foundation:** chưa có `package.json`, chưa `create-next-app`, chưa
  cài dependency, chưa có cấu trúc thư mục, chưa có Supabase client, chưa có `.env.example`.
- **Phase 2 — Database & Auth:** chưa có Supabase project, chưa có migration nào, chưa có RLS
  policy, chưa có login/logout/middleware.
- **Phase 3 — Morning Report** và **Phase 4 — Evening Report:** chưa có form, chưa có Server Action,
  chưa có Zod schema.
- **Phase 5 — KPI Engine:** chưa có `lib/kpi.ts`, `lib/currency.ts`, `lib/date.ts`.
- **Phase 6 — 9:16 Image Export:** chưa có route handler, chưa có `DailyReportShareCard`, chưa nhúng
  font tiếng Việt.
- **Phase 7 — Sales History**, **Phase 8 — Admin Dashboard**, **Phase 9 — Admin Reports & Filters**,
  **Phase 10 — Sales Management:** chưa có route, chưa có query, chưa có UI.
- **Phase 11 — Testing & Security:** chưa cài Vitest/Playwright, chưa có test nào.
- **Phase 12 — Deployment Preparation:** chưa có Supabase project, chưa có Vercel project.

---

## Known Issues

Chưa có bug vì chưa có code. Các mục dưới đây là **rủi ro đã biết**, tất cả `Status: OPEN`, chi tiết
đầy đủ ở `docs/12-known-issues.md`:

| ID | Sev | Nội dung | Mitigation |
|---|---|---|---|
| ISSUE-001 | P1 | **CLOSED (2026-08-07)** — 17/17 OQ đã được trả lời, không còn chặn migration | Đã xong, xem `docs/12` mục Verification |
| ISSUE-002 | P2 | Satori (`next/og`) chỉ hỗ trợ tập con CSS và cần font nhúng có dấu tiếng Việt; rủi ro layout thẻ 9:16 phải làm lại | Dựng prototype thẻ ngay đầu Phase 6; fallback `html-to-image` đã ghi nhận |
| ISSUE-003 | P2 | **Zalo in-app webview** chưa được kiểm chứng thực tế (Web Share API, download attachment) | Test tay trên thiết bị thật ở Phase 6 |
| ISSUE-004 | P2 | TypeScript 7.0.2 và ESLint 10.8.0 là bản major mới; rủi ro không tương thích Next 16 plugin | Smoke test đầu Phase 1, lùi TypeScript 5.x LTS nếu cần — DEC-002 |
| ISSUE-005 | P3 | `is_admin()` gọi trong RLS làm thêm một truy vấn `profiles` mỗi câu lệnh | Viết `(select public.is_admin())` để nâng thành InitPlan; nếu vẫn chậm thì chuyển role vào custom JWT claim |
| ISSUE-006 | P3 | **CLOSED (2026-08-07)** — chủ nghiệp vụ xác nhận không xử lý gì quanh việc này ở v1 | Không cần hành động |
| ISSUE-007 | P3 | Chưa có audit log; nếu OQ-04/OQ-05 cho phép sửa sau khi hoàn tất thì phải bổ sung trước khi bật quyền đó | Gắn với AF-12 trong roadmap |

---

## Important Business Decisions

Danh sách đầy đủ DEC-001..DEC-030 ở `docs/11-decisions.md`. Những quyết định một session mới
**bắt buộc phải biết** trước khi động vào code:

**Kiến trúc & bảo mật**

- **DEC-001** — Next.js 16.3 App Router + TypeScript strict + Tailwind CSS v4 + Supabase
  (Postgres/Auth/RLS), deploy Vercel Free.
- **DEC-003** — Server Components để **đọc**, Server Actions để **ghi**; **không** xây REST API
  riêng cho CRUD báo cáo.
- **DEC-004** — **RLS là biên giới bảo mật thật**; middleware và layout guard chỉ là
  defense-in-depth và UX.
- **DEC-005** — Service role key **chỉ** dùng cho quản lý tài khoản (`auth.admin.*`), **không bao
  giờ** dùng để đọc/ghi `daily_reports`.
- **DEC-006** — `is_admin()` phải là `SECURITY DEFINER` và được gọi dạng `(select public.is_admin())`
  trong policy (tránh đệ quy vô hạn khi policy trên `profiles` tự truy vấn `profiles`, đồng thời
  tận dụng InitPlan).
- **DEC-023** — Cấu trúc thư mục `app/ components/ features/ lib/ services/ types/ supabase/ docs/`;
  business logic và data access **không** được viết trong component.
- **DEC-027 + DEC-028** — Git đã init ở Phase 0, nhánh `main`, remote GitHub đã cấu hình. Người dùng cấp **quyền push đứng**: push sau mỗi lần code xong, không hỏi lại.

**Nghiệp vụ & dữ liệu**

- **DEC-007** — Achievement **không persist**, luôn tính runtime trong `lib/kpi` (BR-011).
- **DEC-008** — Tiền lưu `bigint` VND nguyên; format chỉ ở tầng hiển thị bằng
  `Intl.NumberFormat('vi-VN')` (BR-010).
- **DEC-009** — Ngày nghiệp vụ tính bằng
  `Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})`, không thêm dependency timezone
  (BR-005).
- **DEC-020** — Chỉ **2 trạng thái** `MORNING_SUBMITTED` / `COMPLETED`; không thêm `DRAFT`/`LOCKED`
  khi chưa có nhu cầu thật (BR-008).
- **DEC-021** — Không dùng Supabase Storage cho ảnh báo cáo (stream trực tiếp, không lưu).

**Xuất ảnh 9:16**

- **DEC-010** — Ảnh sinh **server-side** bằng `ImageResponse`/Satori tại
  `GET /api/reports/[id]/share-image`, **không** capture DOM. Lý do: Zalo in-app webview hay vỡ với
  `foreignObject`+canvas; Tailwind v4 sinh `oklch()`; font tiếng Việt phải load xong mới chụp được;
  output luôn đúng 1080×1920; không tăng bundle client. Fallback `html-to-image` đã ghi nhận.
  *(APPROVED technical — người dùng có thể veto.)*
- **DEC-011** — Phân phối ảnh qua Web Share API (files) với fallback `<a download>`.

**UI/UX**

- **DEC-012** — Design system: **Swiss Modernism 2.0** + **Executive Dashboard** cho KPI +
  **Flat** cho tương tác; **override** kết quả "Exaggerated Minimalism" mà công cụ tự sinh, có nêu
  lý do (style dành cho fashion/luxury/editorial, không hợp công cụ nhập liệu một tay ngoài thị
  trường).
- **DEC-013** — Font **chỉ Inter** (latin + vietnamese) + `tabular-nums`, thay vì cặp
  Fira Code / Fira Sans mà công cụ xếp hạng 1.
- **DEC-014** — Bảng màu chốt theo **contrast đã đo**: `#B45309` cho chữ amber, `#15803D` /
  `#B91C1C` cho nền có chữ trắng, `#64748B` cho viền control tương tác.
- **DEC-016** — **Không dark mode** ở v1 (trừ thẻ share vốn dark cố định).
- **DEC-017** — Route `/login` thay vì `/auth/login` như ví dụ Master Spec §49.
- **DEC-018** — Bottom nav ≤5 mục ở mobile, sidebar từ 1024px; không hiển thị đồng thời.
- **DEC-019** — Bảng so sánh ở mobile render dạng 4 card, chỉ dùng `<table>` từ 768px
  (cấm cuộn ngang).

**Đang chờ người dùng**

- **DEC-025** — `APPROVED`. BR-015: `target=0 & actual=0` → `100,0%`; `target=0 & actual>0` → `percent = null` và hiển thị **số vượt tuyệt đối** có dấu cộng + đơn vị (`+3 xe`, `+2 điểm`, `+5 khách`, `+3.000.000 ₫`), nhãn "Vượt kế hoạch"; khi tổng hợp của Admin thì **loại khỏi mẫu số**. Không bao giờ `NaN`/`∞`.
- **DEC-026** — `APPROVED`. BR-019: khoá **vĩnh viễn** khi `COMPLETED` (kể cả cùng ngày). BR-020: Admin **không** sửa báo cáo. BR-021: chỉ tạo/sửa cho **đúng ngày hôm nay** giờ VN, không nhập bù. BR-013: **không xoá**, không cả soft delete.
- **DEC-029** — `APPROVED`. Viếng thăm giữ **cả hai**: cột số bắt buộc + cột text tuỳ chọn.
- **DEC-030** — `APPROVED`. Không ngày nghỉ, không team/vùng, chỉ 2 role, không SKU/đại lý/đơn hàng; KPI do **Sales tự cam kết**.
- **DEC-002** — Pin phiên bản chính xác **sau smoke test** ở Phase 1; TypeScript 7 phải được kiểm
  chứng, nếu vỡ thì lùi TypeScript 5.x LTS và ghi kết quả vào `docs/11-decisions.md`.

---

## Important Files

**Đã tồn tại từ trước (không sửa trong Phase 0):**

| File | Vai trò |
|---|---|
| `BIKEFORCE_MASTER_SPEC.md` | Source of truth cấp cao nhất — đọc trước mọi việc |
| `PROMPT_FIRST_SESSION.md` | Prompt khởi động phiên đầu tiên |
| `PROMPT_NEXT_SESSION.md` | Prompt khởi động các phiên tiếp theo |

**17 file tạo mới trong Phase 0:**

| File | Đọc khi nào |
|---|---|
| `CLAUDE.md` | Bắt buộc, mở đầu mọi session |
| `AGENTS.md` | Trước khi viết bất kỳ dòng code nào (layering, cấm business logic trong component) |
| `docs/01-business-analysis.md` | Nguồn duy nhất của UC / FR / NFR / BR / **danh sách OQ đầy đủ** |
| `docs/02-database-design.md` | Trước khi viết migration Phase 2 (ERD, cột, CHECK, index) |
| `docs/03-workflow.md` | Trước khi làm Phase 3 / Phase 4 (morning flow, evening flow, save/export rule) |
| `docs/04-system-architecture.md` | Trước Phase 1 (cấu trúc thư mục, 3 Supabase client, secret handling) |
| `docs/05-ui-ux-design.md` | Trước khi làm bất kỳ UI nào (design system, token màu đã đo, rule UX) |
| `docs/06-auth-permissions.md` | Trước Phase 2 (role, middleware, RLS policy chi tiết) |
| `docs/07-api-data-flow.md` | Trước khi viết Server Action hoặc route handler |
| `docs/08-testing-strategy.md` | Trước Phase 11 và mỗi khi thêm test |
| `docs/09-deployment.md` | Trước Phase 12; chứa runbook tạo Admin đầu tiên |
| `docs/10-future-roadmap.md` | Khi bị cám dỗ làm thêm tính năng — **không tự triển khai roadmap** |
| `docs/11-decisions.md` | DEC-001..DEC-030; cập nhật mỗi khi có quyết định mới |
| `docs/12-known-issues.md` | ISSUE-001..ISSUE-007; cập nhật khi phát sinh bug |
| `WORKLOG.md` | Append entry mỗi phiên làm việc |
| `SESSION_CHECKPOINT.md` | File này — cập nhật cuối mỗi milestone/session |
| `PROJECT_CHECKLIST.md` | Tick `[x]` theo quy tắc 5 điều kiện |

**File sẽ tạo ở Phase 1 (chưa tồn tại):** `package.json`, `.gitignore`, `.env.example`,
`middleware.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`,
`lib/kpi.ts`, `lib/currency.ts`, `lib/date.ts`, `types/database.types.ts`.

---

## Database State

**Chưa có Supabase project, chưa có migration nào được viết hay chạy.** Schema hiện chỉ tồn tại ở
**mức đề xuất** trong `docs/02-database-design.md`, chờ câu trả lời OQ trước khi chốt.

- Không có `supabase/` directory, không có `supabase/migrations/*.sql`, không có `supabase/seed.sql`.
- Không có `types/database.types.ts` (sẽ sinh bằng `supabase gen types typescript --linked` ở
  Phase 2).
- Đề xuất hiện tại: 2 enum (`user_role`, `report_status`), 2 bảng (`public.profiles`,
  `public.daily_reports`), `UNIQUE(sales_id, report_date)`, 4 CHECK constraint chính, 5 index,
  7 function/trigger, RLS deny-by-default trên cả 2 bảng, **không cấp DELETE policy**.
- Các cột đang phụ thuộc OQ: `target_visit_points` / `visit_purpose` (OQ-01),
  `actual_visit_points` / `actual_route` (OQ-02), khả năng thêm `deleted_at` (OQ-13).
- Kế hoạch migration: `0001_init_enums_profiles.sql`, `0002_daily_reports.sql`,
  `0003_functions_triggers.sql`, `0004_rls_policies.sql`, `0005_indexes.sql`, `seed.sql` (local
  only). Đẩy bằng `supabase db push`, **không** sửa schema bằng tay trên dashboard. Migration chỉ
  tiến tới; muốn lùi phải viết migration mới.

---

## Testing State

**Toàn bộ `N/A` vì chưa có code** — repository chưa có `package.json`, chưa có test runner, chưa có
một dòng mã nguồn nào. Không có mục nào ở đây từng được chạy, nên **không mục nào được ghi là
`PASS`**.

- **Build:** `N/A — chưa có code` (chưa có `package.json`, chưa từng chạy `next build`)
- **Typecheck:** `N/A — chưa có code` (chưa có `tsconfig.json`, chưa từng chạy `tsc --noEmit`)
- **Lint:** `N/A — chưa có code` (chưa có cấu hình ESLint, chưa từng chạy `eslint`)
- **Unit:** `N/A — chưa có code` (chưa cài Vitest, chưa có `lib/**` để test)
- **Integration:** `N/A — chưa có code` (chưa có Supabase local, chưa có schema để test constraint
  và RLS)
- **E2E:** `N/A — chưa có code` (chưa cài Playwright, chưa có route nào để chạy)

Baseline xanh đầu tiên sẽ được tạo ở cuối Phase 1 và ghi vào `WORKLOG.md` kèm output thật của lệnh.

---

## Last Working Feature

`Chưa có — repository chưa có source code.`

Không có tính năng nào từng chạy được, nên **không có mốc an toàn để quay về**. Điểm khởi đầu cho
mọi công việc code là một project Next.js hoàn toàn mới tạo bằng `create-next-app` ở Phase 1.

---

## Next Exact Steps

> ✅ **Hai bước đầu tiên của bản checkpoint trước đã XONG ngày 2026-08-07** — người dùng đã trả lời
> đủ 17/17 OPEN QUESTION, toàn bộ DEC/BR đã chuyển sang `APPROVED`, 17 tài liệu đã được đồng bộ,
> và `ISSUE-001` đã `CLOSED`. **Không làm lại.** Bắt đầu thẳng từ bước 1 dưới đây.

1. **Bắt đầu PHASE 1 — Foundation.** Không còn blocker nghiệp vụ nào.
2. **Khởi tạo Next.js.** Chạy tại project root
   `c:\Users\khang\OneDrive\Documents\BikeForce — Bicycle Sales Management System`:

   ```bash
   npx create-next-app@16 . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
   ```

   Trả lời `No` cho Turbopack nếu được hỏi (giữ mặc định ổn định cho build trên Vercel), và chấp
   nhận ghi vào thư mục hiện có mà **không xoá** 3 file markdown gốc, `docs/`, `WORKLOG.md`,
   `SESSION_CHECKPOINT.md`, `PROJECT_CHECKLIST.md`.
3. ~~**Khởi tạo git**~~ — ✅ **ĐÃ XONG ở Phase 0** (DEC-028). Repo đã ở nhánh `main`, remote
   `origin` = `https://github.com/LeDuyKhangZz/BikeForce-Bicycle-Sales-Management.git`, `.gitignore`
   đã có và **đã kiểm chứng** là chặn `.env*`. `create-next-app` sẽ ghi đè `.gitignore` — **phải
   kiểm tra lại sau khi chạy** và khôi phục các mục `.env*`, `supabase/.env`, `test-results/`,
   `playwright-report/` nếu bị mất. Người dùng đã cấp **quyền push đứng**: commit và push sau mỗi
   lần code xong, **không cần hỏi lại**.

4. **Cài đúng danh sách package dưới đây** (dùng phiên bản latest stable đã xác minh ngày
   2026-08-07; ghi lại phiên bản thực tế được cài vào `WORKLOG.md`):

   ```bash
   npm install @supabase/supabase-js @supabase/ssr zod lucide-react
   npm install -D vitest @vitejs/plugin-react @playwright/test @axe-core/playwright supabase
   npx playwright install --with-deps chromium
   ```

   Runtime: `@supabase/supabase-js` (2.112.2), `@supabase/ssr` (0.12.4), `zod` (4.4.3),
   `lucide-react` (1.29.0).
   Dev: `vitest` (4.1.10), `@playwright/test` (1.62.1), `@axe-core/playwright`, `supabase` (CLI),
   `eslint` (10.8.0 — do `create-next-app` cài), `typescript` (7.0.2 — do `create-next-app` cài).
   **Chưa cài** `html-to-image` (1.11.13) — chỉ cài nếu Phase 6 phải dùng fallback (DEC-010).
6. **Smoke test tương thích ngay lập tức** (ISSUE-004, DEC-002): chạy `npx tsc --noEmit`,
   `npm run lint`, `npm run build` trên project trống. Nếu TypeScript 7.0.2 hoặc ESLint 10.8.0 xung
   đột với Next 16.3, **lùi về TypeScript 5.x LTS / ESLint 9.x**, ghi kết quả thật vào
   `docs/11-decisions.md` như phần follow-up của DEC-002 và vào `WORKLOG.md`.
7. **Dựng cấu trúc thư mục theo DEC-023:** `app/`, `components/ui/`, `features/`, `lib/`,
   `services/`, `types/`, `supabase/`, `docs/` (đã có). Tạo route group rỗng
   `app/(auth)/`, `app/(sales)/`, `app/(admin)/`.
8. **Tạo 3 Supabase client** đúng vai trò: `lib/supabase/client.ts` (`createBrowserClient`, anon
   key), `lib/supabase/server.ts` (`createServerClient` + `cookies()`, anon key — đường dữ liệu
   chính, chịu RLS), `lib/supabase/admin.ts` (service role, `import 'server-only'`, **chỉ** cho
   `auth.admin.*`).
9. **Tạo `.env.example`** chỉ gồm tên biến và placeholder, không giá trị thật:
   `NEXT_PUBLIC_SUPABASE_URL=<your-project-url>`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>`,
   `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-server-only>`,
   `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Xác nhận `.env.local` nằm trong `.gitignore`.
10. **Cấu hình design system Phase 1:** khai báo token màu đã đo (DEC-014) vào `@theme` của Tailwind
    v4 trong `app/globals.css`; cấu hình Inter Variable qua `next/font/google` với
    `display: 'swap'` và `subsets: ['latin','vietnamese']` (DEC-013); đặt type scale
    12/14/16/18/20/24/32/40 và spacing 4/8px.
11. **Chạy lại `next build` + `tsc --noEmit` + `eslint`** để có baseline, ghi **output thật** vào
    `WORKLOG.md` (Entry 002), rồi tick các mục Phase 1 trong `PROJECT_CHECKLIST.md` theo đúng quy
    tắc 5 điều kiện, và cập nhật lại file `SESSION_CHECKPOINT.md` này.

---

## DO NOT REDO

Sáu việc dưới đây **đã hoàn tất và đã được ghi lại**. Làm lại là lãng phí thời gian và có nguy cơ
tạo ra kết quả mâu thuẫn với tài liệu hiện có:

- **Đã đọc toàn bộ `BIKEFORCE_MASTER_SPEC.md`** — nội dung đã được chắt lọc vào `docs/01`..`docs/12`.
  Chỉ tra cứu lại mục cụ thể khi cần, không cần đọc lại từ đầu để "nắm bối cảnh".
- **Đã clone và CHẠY THẬT skill `ui-ux-pro-max`** (9 lệnh `search.py` + đọc đầy đủ `pro-rules.md`
  và `quick-reference.md`) — **không cần clone lại, không cần chạy lại**. Kết quả và các quyết định
  rút ra đã nằm trong `docs/05-ui-ux-design.md` (DEC-012, DEC-013, DEC-015).
- **Đã đo contrast toàn bộ bảng màu bằng script** (bảng sáng + bảng dark của thẻ 9:16) — **không
  cần đo lại**. Bảng token cuối cùng và các màu bị loại vì fail đã ghi trong `docs/05-ui-ux-design.md`
  (DEC-014).
- **Đã kiểm tra phiên bản npm mới nhất ngày 2026-08-07** cho toàn bộ dependency dự kiến — dùng lại
  bảng phiên bản trong `docs/09-deployment.md`; chỉ kiểm tra lại nếu Phase 1 phát sinh xung đột thật
  (ISSUE-004).
- **Đã khảo sát repository** — ban đầu rỗng (3 file markdown); toolchain Node v22.20.0 /
  npm 10.9.3 / git 2.48.1 / Python 3.13.2. Không cần khảo sát lại.
- **Đã `git init` + push lên GitHub** (DEC-028) — nhánh `main`, remote `origin` đã cấu hình,
  `.gitignore` đã kiểm chứng chặn `.env*`. **Không cần init lại.** Người dùng đã cấp **quyền push
  đứng**: commit và push sau mỗi lần code xong, **không hỏi lại**.
- **Đã hỏi và nhận đủ 17/17 câu trả lời OPEN QUESTION** (2026-08-07). **Tuyệt đối không hỏi lại**
  những câu này. Câu trả lời chính thức nằm ở `docs/01-business-analysis.md § OPEN QUESTIONS`.
- **Đã parse kiểm chứng toàn bộ 30 khối Mermaid** bằng mermaid 11.16.1 — 0 lỗi. Chỉ chạy lại khi
  thêm hoặc sửa sơ đồ.
- **Bộ 17 tài liệu Phase 0 đã tạo xong** — **chỉ cập nhật, không viết lại từ đầu**. Khi có câu trả
  lời OQ thì sửa đúng phần liên quan và giữ nguyên toàn bộ ID BR-xxx / FR-xxx / NFR-xxx / UC-xx /
  OQ-xx / DEC-xxx / ISSUE-xxx / AF-xx. **Không bao giờ renumber.**

---

## OPEN QUESTIONS — ✅ ĐÃ ĐÓNG TOÀN BỘ

**Không còn câu hỏi nào chờ trả lời.** Người dùng đã trả lời đủ **17/17** ngày `2026-08-07`.
Danh sách đầy đủ kèm câu trả lời chính thức: `docs/01-business-analysis.md § OPEN QUESTIONS`.

Mười quyết định nghiệp vụ mà session sau **phải tuân thủ và không được tự ý đổi** (Master Spec §71):

| ID | Câu trả lời chính thức |
|---|---|
| OQ-01 / OQ-02 | Viếng thăm giữ **cả hai**: cột số bắt buộc (`target_visit_points` / `actual_visit_points`) + cột text tuỳ chọn (`visit_purpose` / `actual_route`) |
| OQ-03 | Doanh số = **số lượng xe** (integer). Doanh thu = **tiền VND** (bigint) |
| OQ-04 | **KHÔNG** được sửa sau khi `COMPLETED` — khoá vĩnh viễn, kể cả trong cùng ngày |
| OQ-05 | Admin **KHÔNG** được sửa báo cáo của Sales |
| OQ-06 | Admin tạo tài khoản; Sales **không** tự đăng ký |
| OQ-07 | Tuyến **nhập tự do** + gợi ý 5 tuyến gần nhất |
| OQ-08 | **KHÔNG** có khái niệm ngày nghỉ ở v1. Không xử lý gì thêm quanh việc này |
| OQ-09 | KPI do **Sales tự cam kết buổi sáng**; không có bảng `targets` |
| OQ-10 | **KHÔNG** SKU / model xe / đại lý / đơn hàng |
| OQ-11 | `target=0 & actual=0` → **`100,0%`**. `target=0 & actual>0` → `percent = null` + **số vượt tuyệt đối** có dấu cộng và đơn vị (`+3 xe`, `+2 điểm`, `+5 khách`, `+3.000.000 ₫`), nhãn "Vượt kế hoạch"; **loại khỏi mẫu số** khi tổng hợp của Admin. Không bao giờ `NaN`/`∞` |
| OQ-12 | Chỉ tạo/sửa cho **đúng ngày hôm nay** theo giờ VN; không giới hạn giờ trong ngày; **không** nhập bù |
| OQ-13 | **KHÔNG** xoá báo cáo — không hard delete, không soft delete, không cột `deleted_at` |
| OQ-14 | Doanh thu = **giá trị đơn hàng chốt trong ngày** (không phải tiền mặt đã thu) |
| OQ-15 | **Chưa** chia team / khu vực ở v1 |
| OQ-16 | **Chỉ 2 role**: `ADMIN`, `SALES` |
| OQ-17 | "Ngày đạt KPI" = đạt **cả 4** chỉ tiêu ≥ 100% |

**Một điểm theo dõi tiếp (không chặn tiến độ):**

1. **AF-12 (audit log) chưa cần** vì không ai được sửa sau khi hoàn tất. Nếu sau này mở quyền sửa,
   **phải làm audit log trước** và tạo `DEC` mới thay vì sửa DEC-026.
