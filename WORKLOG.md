# BikeForce Worklog

> Status: ACTIVE | Phase: 12 — Deployment Preparation (đã đẩy migration lên cloud) | Last updated: 2026-08-10
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

File này ghi lại **thực tế đã làm** trong từng phiên làm việc. Không ghi kế hoạch, không ghi
dự định, không ghi trạng thái test/build chưa từng chạy. Format bắt buộc theo Master Spec §57.

---

## Current Phase

**PHASE 7 → PHASE 11 ĐÃ XONG TRONG MỘT PHIÊN (2026-08-10).**

**Toàn bộ 18 route của v1 nay chạy thật.** Sales có lịch sử báo cáo, màn hình chi tiết và trang tài
khoản; Admin có dashboard 12 chỉ số, danh sách toàn đội với 7 chiều lọc, phân tích tháng kèm **biểu
đồ trend theo ngày**, quản lý tài khoản Sales, và xuất CSV. Aggregate làm bằng **5 hàm SQL** trong
migration 0006 + 0007, `security invoker` để RLS vẫn là hàng rào thật.

**Phase 11 dựng được bộ E2E thật đầu tiên của dự án** — `playwright.config.ts` với 3 project và 33
bài, chạy **99/99**, trong đó 30 lượt quét axe không có vi phạm serious/critical. Nó **lập tức trả
giá trị**: bắt được **ISSUE-016 (P1)** — một file `'use server'` export object hằng số làm
`/admin/sales/new` sập ở runtime, trong khi typecheck, lint, build và 724 test đều xanh.

**Ba câu hỏi đã được người dùng trả lời đầu phiên:** xác nhận DEC-041 (chính sách mật khẩu, không ép
đổi lần đầu) · OQ-18 → phương án **(a)**, NFR-008 nới thành ≤ 8 lần chạm (**DEC-043**) · FR-037 →
**có làm**, vẽ bằng inline SVG (**DEC-044**).

Kết quả thật: `typecheck` / `lint` / `build` exit 0 (**18 route**) · `npm test` **729/729** ·
coverage `lib/**` **99% / 98,69% / 100% / 99,4%** · `npx playwright test` **99/99** ·
14 bài `EXPLAIN ANALYZE` đóng **ISSUE-005**.

**Nợ còn lại, tất cả đều cần thiết bị thật hoặc thao tác của người dùng:** kiểm Zalo trên điện thoại
(ISSUE-003) · Lighthouse · rotate service role key (ISSUE-011) · **đẩy migration 0006 + 0007 lên
cloud** (`docs/09 §12`) · toàn bộ Phase 12.

## Overall Progress

- [x] Phase 0 — Discovery & Business Analysis
- [x] Phase 1 — Foundation
- [x] Phase 2 — Database & Auth
- [x] Phase 3 — Morning Report *(14/14 — đóng 2026-08-10 sau khi OQ-18 được trả lời, DEC-043)*
- [x] Phase 4 — Evening Report *(10/10 — đóng 2026-08-10 khi bộ E2E có commit ra đời)*
- [x] Phase 5 — KPI Engine
- [ ] Phase 6 — 9:16 Image Export *(11/12 — chỉ còn kiểm Zalo trên **thiết bị thật**, ISSUE-003)*
- [x] Phase 7 — Sales History
- [x] Phase 8 — Admin Dashboard
- [x] Phase 9 — Admin Reports & Filters *(gồm cả FR-037 mức SHOULD — DEC-044)*
- [x] Phase 10 — Sales Management
- [ ] Phase 11 — Testing & Security *(12/14 — E2E + a11y + EXPLAIN đã chạy thật; còn Lighthouse và ma trận thử tay, cả hai cần thiết bị thật)*
- [ ] Phase 12 — Deployment Preparation *(đang làm — migration đã đẩy lên cloud 7/7 ngày 2026-08-10; ⚠ **cloud nay thiếu `0008`**)*
- [ ] Phase 13 — Nhận diện thương hiệu & soát UI/UX *(13a ✅ · 13b ✅ trừ 2 mục cần **mắt người** và **thiết bị thật** · 13c ✅ đủ 3 nhóm A/B/C)*

> Ghi chú về dấu `[x]` của Phase 0: đánh dấu này chỉ có nghĩa "**deliverable tài liệu của Phase 0
> đã tạo đủ**". Điều kiện đóng phase hoàn toàn (bao gồm "OPEN QUESTION mức BLOCKING đã được trả
> lời") vẫn còn mở — xem `PROJECT_CHECKLIST.md § Phase 0`.

---

## Nhật ký

### Entry 001

**Date:** 2026-08-07

**Phase:** PHASE 0 — Discovery & Business Analysis

**Completed:**

1. **Đọc toàn bộ `BIKEFORCE_MASTER_SPEC.md`** (toàn bộ 69 mục), không đọc lướt, không suy diễn
   ngoài nội dung có trong spec.
2. **Khảo sát repository.** Kết quả xác minh: repo **rỗng về mã nguồn** — chỉ có 3 file markdown
   (`BIKEFORCE_MASTER_SPEC.md`, `PROMPT_FIRST_SESSION.md`, `PROMPT_NEXT_SESSION.md`), **không có**
   `package.json`, không có source code, không có migration, và **không phải một git repository**.
   Toolchain có sẵn trên máy: **Node v22.20.0**, **npm 10.9.3**, **git 2.48.1**, **Python 3.13.2**.
   Nền tảng: Windows 11 / PowerShell.
3. **Clone và CHẠY THẬT skill `ui-ux-pro-max`** (`https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git`,
   clone `--depth 1` vào scratchpad của phiên). Đã **thực thi** công cụ Python
   `.claude/skills/ui-ux-pro-max/scripts/search.py` bằng Python 3.13.2 với **9 lệnh search**:
   2 lệnh `--design-system` (density 7 và 8), 1 lệnh `--domain product`, 1 lệnh `--domain style`,
   1 lệnh `--domain color`, 1 lệnh `--domain typography`, 2 lệnh `--domain ux` (form/validation và
   navigation/accessibility), 1 lệnh `--stack nextjs`. Ngoài ra **đọc đầy đủ**
   `references/pro-rules.md` và `references/quick-reference.md` (cả 10 nhóm rule).
   Không phải đọc tài liệu suông — công cụ đã chạy và kết quả được dùng trực tiếp trong
   `docs/05-ui-ux-design.md`.
4. **Kiểm tra phiên bản npm mới nhất tại ngày 2026-08-07** cho toàn bộ dependency dự kiến:
   `next 16.3.0`, `react 19.2.8`, `typescript 7.0.2`, `tailwindcss 4.3.3`,
   `@supabase/supabase-js 2.112.2`, `@supabase/ssr 0.12.4`, `zod 4.4.3`, `@playwright/test 1.62.1`,
   `vitest 4.1.10`, `eslint 10.8.0`, `lucide-react 1.29.0`, `html-to-image 1.11.13` (chỉ fallback).
   Ghi nhận là "latest stable đã xác minh ngày 2026-08-07"; **pin chính xác để Phase 1 quyết định**
   sau smoke test tương thích (DEC-002).
5. **Đo contrast toàn bộ bảng màu bằng script**, không ước lượng bằng mắt. Kết quả loại bỏ 4 màu
   fail: `#94A3B8` làm viền (2.56:1), `#DBEAFE` làm viền (1.22:1), `#16A34A` làm nền chữ trắng
   (3.30:1), `#D97706` dùng làm **màu chữ** (3.19:1). Thay bằng `#64748B` cho viền control (4.76:1),
   `#15803D` / `#B91C1C` cho nền có chữ trắng (5.02:1 / 6.47:1), `#B45309` cho chữ amber (5.02:1).
   Bảng token dark của thẻ share 9:16 trên nền `#0B1220` cũng được đo đầy đủ (6.77:1 → 18.72:1).
6. **Phân tích nghiệp vụ và chốt:** **25 business rule** (BR-001..BR-025), **37 functional
   requirement** (FR-001..FR-037), **15 non-functional requirement** (NFR-001..NFR-015),
   **21 use case** (UC-01..UC-21), 6 actor, và 15 đề xuất tính năng Admin (AF-01..AF-15) theo đúng
   format Master Spec §69.
7. **Đề xuất thiết kế kỹ thuật** (mức đề xuất, chưa triển khai dòng code nào):
   - **Schema**: 2 enum + 2 bảng `public.profiles`, `public.daily_reports` với đầy đủ kiểu, nullable,
     default, CHECK constraint, `UNIQUE(sales_id, report_date)`, 5 index và 7 function/trigger.
   - **RLS**: deny-by-default trên cả 2 bảng, `is_admin()` `SECURITY DEFINER` gọi dạng
     `(select public.is_admin())` để tránh đệ quy và tận dụng InitPlan (DEC-006).
   - **Architecture**: Next.js 16 App Router trên Vercel; Server Components đọc, Server Actions ghi,
     1 Route Handler duy nhất cho ảnh; 3 Supabase client tách biệt vai trò (DEC-003, DEC-005).
   - **Page map**: 16 route canonical + 3 route group `(auth)` / `(sales)` / `(admin)`.
   - **Navigation**: bottom nav 3 mục cho Sales, 4 mục cho Admin, sidebar từ 1024px (DEC-018).
   - **Chiến lược xuất ảnh 9:16**: server-side `ImageResponse`/Satori tại
     `GET /api/reports/[id]/share-image`, trả PNG 1080×1920; fallback `html-to-image` đã ghi nhận
     (DEC-010).
   - **Testing**: Vitest unit + integration, RLS test bằng JWT thật của 3 user, Playwright 3 project
     (`mobile-375`, `desktop-1440`, `zalo-like`), a11y bằng `@axe-core/playwright`.
   - **Deployment**: Supabase region Singapore + Supabase CLI migrations, Vercel `sin1` Node 22,
     Protect Preview Deployments, rollback chỉ tiến tới.
8. **Tạo bộ 17 tài liệu kiểm soát dự án** theo Master Spec §44 (danh sách đầy đủ ở mục
   *Files Changed*).
9. **Gom 17 OPEN QUESTION** (OQ-01..OQ-17) thành một danh sách duy nhất trong
   `docs/01-business-analysis.md`, **trong đó 9 câu ở mức BLOCKING**. Mỗi câu ghi đủ: câu hỏi,
   lý do chặn, đề xuất mặc định, và ảnh hưởng nếu người dùng chọn khác.

**Files Changed:** 17 file được **tạo mới** (không sửa file nào có sẵn; 3 file markdown gốc giữ
nguyên):

| # | File | Vai trò |
|---|---|---|
| 1 | `CLAUDE.md` | Giao thức bắt buộc cho mọi Claude Code session (Spec §60) |
| 2 | `AGENTS.md` | Quy tắc kiến trúc/layering cho agent (Spec §61) |
| 3 | `docs/01-business-analysis.md` | Mục tiêu, scope, actors, UC-01..UC-21, FR-001..FR-037, NFR-001..NFR-015, BR-001..BR-025, OQ-01..OQ-17 |
| 4 | `docs/02-database-design.md` | ERD Mermaid, schema đề xuất, constraint, index, derived vs persisted |
| 5 | `docs/03-workflow.md` | Morning flow, evening flow, save/export rule, admin flow (Mermaid) |
| 6 | `docs/04-system-architecture.md` | Kiến trúc, 3 Supabase client, layering, secret handling (Mermaid) |
| 7 | `docs/05-ui-ux-design.md` | Design system, override "Exaggerated Minimalism", font, bảng màu đã đo, rule UX |
| 8 | `docs/06-auth-permissions.md` | Role, middleware, layout guard, RLS policy, permission flow (Mermaid) |
| 9 | `docs/07-api-data-flow.md` | Server Action / Route Handler contract, luồng dữ liệu |
| 10 | `docs/08-testing-strategy.md` | Unit / integration / RLS / E2E / a11y, coverage target |
| 11 | `docs/09-deployment.md` | Supabase + Vercel, migration, env, runbook admin đầu tiên |
| 12 | `docs/10-future-roadmap.md` | AF-08..AF-15 và các mục LATER, tất cả `NOT STARTED` |
| 13 | `docs/11-decisions.md` | DEC-001..DEC-030 theo format Spec §55 |
| 14 | `docs/12-known-issues.md` | ISSUE-001..ISSUE-007 theo format Spec §56, tất cả `OPEN` |
| 15 | `WORKLOG.md` | File này |
| 16 | `SESSION_CHECKPOINT.md` | Trạng thái bàn giao cho session sau (Spec §58) |
| 17 | `PROJECT_CHECKLIST.md` | Checklist 13 phase (Spec §59) |

**Tests:** `N/A — chưa có source code, chưa chạy test nào.`
Không có build, không có typecheck, không có lint, không có unit/integration/E2E trong phiên này —
vì repository chưa có `package.json` và chưa có dòng code nào. Không được diễn giải mục này thành
"pass".

**Errors:** `None.`

**Decisions:** ghi **DEC-001..DEC-030** vào `docs/11-decisions.md` (khi đó 26 APPROVED + 4 PROPOSED; cả 4 đã chuyển APPROVED trong Entry 002).
Các quyết định đáng chú ý nhất:

- **DEC-010** — Ảnh báo cáo 9:16 sinh **server-side** bằng `ImageResponse` / Satori tại
  `GET /api/reports/[id]/share-image`, **không** capture DOM. Lý do: Sales mở app trong **Zalo
  in-app webview**, nơi `foreignObject` + canvas serialization hay vỡ; Tailwind v4 sinh màu
  `oklch()` mà thư viện capture xử lý không ổn định; font tiếng Việt phải load xong mới chụp được;
  kích thước output luôn đúng 1080×1920 không phụ thuộc DPR; không thêm JS vào bundle client
  (NFR-003). Fallback `html-to-image` đã ghi nhận sẵn cho Phase 6 (ISSUE-002).
- **DEC-012** — **Override** kết quả tự động của công cụ design-system. Bộ generator trả về style
  **"Exaggerated Minimalism"** hai lần (dành cho fashion / architecture / portfolio / luxury /
  editorial, `font-size: clamp(3rem,10vw,12rem)`, `font-weight: 900`). Đây là **mismatch** với một
  công cụ nhập liệu một tay ngoài thị trường. Theo chính hướng dẫn của skill ("Can't decide on
  style/color → re-run with different keywords" + rule `style-match`), đã chuyển sang dùng kết quả
  `--domain style`: **Swiss Modernism 2.0** (grid 8px, single accent, WCAG AAA, Tailwind 10/10) +
  **Executive Dashboard** cho KPI + **Flat Design** cho cảm giác tương tác. Từ chối **Bento Box
  Grid** (bất đối xứng làm khó quét bảng so sánh 4 chỉ tiêu cố định) và **Glassmorphism** (chính
  skill cảnh báo `Performance ⚠` và `Accessibility ⚠ 4.5:1`; không đọc được ngoài nắng).
- **DEC-013** — **Font: chỉ Inter** (`next/font/google`, `display: swap`, subsets
  `['latin','vietnamese']`) thay vì cặp **Fira Code + Fira Sans** mà công cụ xếp hạng 1. Lý do:
  một variable font thay vì hai họ ≈ giảm một nửa payload font cho Sales dùng 4G ngoài thị trường;
  Inter phủ đủ dấu tiếng Việt; và `font-variant-numeric: tabular-nums` đã đạt được đúng mục tiêu
  canh cột số mà cặp Mono được chọn để giải quyết (rule `number-tabular`).
- **DEC-014** — **Bảng màu chốt theo contrast đo được**, không theo trực giác: `#B45309` cho chữ
  amber trên nền trắng (5.02:1), `#15803D` / `#B91C1C` làm nền cho chữ trắng (5.02:1 / 6.47:1),
  `#64748B` cho **viền của control tương tác** (4.76:1, vượt ngưỡng 3:1 của WCAG 1.4.11) trong khi
  `#E2E8F0` chỉ được dùng làm đường phân cách trang trí (1.23:1).
- Ngoài ra: **DEC-002** (pin version sau smoke test, TypeScript 7 phải được kiểm chứng),
  **DEC-004** (RLS là biên giới bảo mật thật, middleware chỉ là defense-in-depth),
  **DEC-007** (achievement không persist), **DEC-016** (không dark mode v1 trừ thẻ share),
  **DEC-017** (route `/login` thay vì `/auth/login`), **DEC-028** (git init ngay ở Phase 0 + quyền push đứng lên GitHub).
- **DEC-025** và **DEC-026** đang ở trạng thái **PROPOSED** vì phụ thuộc câu trả lời của
  OQ-11 và OQ-04 / OQ-05 / OQ-12 / OQ-13.

**Remaining:** **9 câu OPEN QUESTION mức BLOCKING chưa có câu trả lời** — đây là thứ duy nhất đang
chặn Phase 2 (ISSUE-001, P1):

| OQ | Tóm tắt | Đề xuất mặc định đang chờ xác nhận |
|---|---|---|
| OQ-01 | "Mục tiêu viếng thăm" là số điểm/đại lý hay mục đích chuyến đi? | Cả hai: `target_visit_points` (int, bắt buộc) + `visit_purpose` (text, optional) |
| OQ-02 | "Đã viếng thăm" là con số hay tuyến thực tế đã đi? | Cả hai: `actual_visit_points` (int, bắt buộc) + `actual_route` (text, optional) |
| OQ-04 | Sau khi `COMPLETED` còn được sửa không? | (a) Khoá ngay khi `COMPLETED` |
| OQ-05 | Admin có được sửa báo cáo của Sales không? | Không trong v1 |
| OQ-08 | Có khái niệm ngày nghỉ / không đi thị trường không? | v1 không có |
| OQ-09 | KPI do Sales tự cam kết hay Admin giao trước? | Sales tự cam kết (Master Spec §7) |
| OQ-11 | Khi `target = 0` thì % hiển thị thế nào? | `actual=0` → 100%; `actual>0` → `—` + "Vượt kế hoạch" |
| OQ-12 | Nhập trễ / nhập bù / giờ cut-off? | Chỉ đúng ngày hôm nay theo giờ VN, không nhập bù |
| OQ-13 | Xoá báo cáo? Soft hay hard delete? | v1 không xoá |

Ngoài ra **OQ-03** ở mức *BLOCKING (xác nhận)* — chỉ cần người dùng xác nhận "Doanh số = số lượng xe
(cái), Doanh thu = tiền VND" là đúng. 7 câu còn lại (OQ-06, OQ-07, OQ-10, OQ-14, OQ-15, OQ-16,
OQ-17) là NON-BLOCKING: làm theo đề xuất mặc định, đổi sau vẫn rẻ.

**Next:**

1. Chờ người dùng trả lời OQ-01..OQ-17, ưu tiên 9 câu BLOCKING.
2. Sau khi có câu trả lời: cập nhật `docs/11-decisions.md` (DEC-025, DEC-026 từ `PROPOSED` →
   `APPROVED` hoặc thay đổi), rồi đồng bộ ngược lại `docs/01-business-analysis.md`,
   `docs/02-database-design.md`, `docs/03-workflow.md`, `docs/06-auth-permissions.md` — chỉ **cập
   nhật**, không viết lại từ đầu.
3. Vào **Phase 1 — Foundation**: `create-next-app`, dựng cấu trúc thư mục theo DEC-023,
   cài dependency, tạo `.env.example` toàn placeholder, và chạy build/typecheck/lint lần đầu để có
   baseline. Lệnh chính xác và danh sách package đã ghi trong `SESSION_CHECKPOINT.md § Next Exact
   Steps`.

---

### Entry 002

**Date:** 2026-08-07
**Phase:** PHASE 0 — Discovery & Business Analysis (đóng phase)

**Completed:**
- **Nhận đủ 17/17 câu trả lời OPEN QUESTION từ người dùng.** Đây là thứ duy nhất còn chặn Phase 0.
  Câu trả lời cho từng câu được ghi vào `docs/01-business-analysis.md § OPEN QUESTIONS` dưới dạng
  cột **CÂU TRẢ LỜI CHÍNH THỨC**, giữ nguyên câu hỏi gốc không xoá.
- **Chuyển 4 quyết định từ `PROPOSED` sang `APPROVED`:** DEC-025, DEC-026, DEC-029, DEC-030.
  Bảng tra nhanh trong `docs/11-decisions.md` nay là **30/30 APPROVED, 0 PROPOSED**.
- **Chuyển 6 business rule từ `PROPOSED` sang `APPROVED`:** BR-013, BR-015, BR-019, BR-020, BR-021,
  BR-024.
- **DEC-025 được viết lại theo lựa chọn thực tế của người dùng** — khác đề xuất mặc định ban đầu:
  khi `target = 0` và `actual > 0` thì hiển thị **số vượt tuyệt đối** (`+3 xe`, `+3.000.000 ₫`)
  thay vì `—`. Kéo theo `AchievementResult` phải mang thêm số vượt và đơn vị.
- **Đóng ISSUE-001 (P1)** trong `docs/12-known-issues.md` với mục Verification điền đủ 6 mục.
  Theo Master Spec §56, nội dung gốc của issue được **giữ nguyên**, không xoá.
- **Khởi tạo git repository và push lên GitHub** — nhánh `main`, remote
  `LeDuyKhangZz/BikeForce-Bicycle-Sales-Management`. Ghi thành **DEC-028** kèm quyền push đứng do
  người dùng cấp. `.gitignore` được tạo **trước** commit đầu tiên và đã **kiểm chứng thực nghiệm**
  bằng cách thử `git add` một file `.env.local` giả — không lọt vào staging.
- **Chạy verify độc lập trên toàn bộ tài liệu** (3 critic agent của workflow bị chặn bởi session
  limit nên tự làm bằng công cụ):
  - Parse **30/30 khối Mermaid** bằng chính engine `mermaid@11.16.1` + `jsdom` → phát hiện và sửa
    1 lỗi cú pháp thật (`PK_FK` không phải key type hợp lệ trong `erDiagram`, đã đổi thành `PK, FK`).
  - Đối chiếu không gian ID giữa 17 tài liệu → BR 25 · FR 37 · NFR 15 · UC 21 · OQ 17, **không có
    ID mồ côi**.
  - Đối chiếu tên cột schema và route giữa các tài liệu → khớp hoàn toàn.
  - Rà mọi tuyên bố về build/test → **không có chỗ nào ghi PASS sai**.

**Files Changed:** `docs/01-business-analysis.md`, `docs/02-database-design.md`,
`docs/03-workflow.md`, `docs/04-system-architecture.md`, `docs/05-ui-ux-design.md`,
`docs/06-auth-permissions.md`, `docs/09-deployment.md`, `docs/11-decisions.md`,
`docs/12-known-issues.md`, `CLAUDE.md`, `AGENTS.md`, `PROJECT_CHECKLIST.md`,
`SESSION_CHECKPOINT.md`, `WORKLOG.md`, `.gitignore` (mới).

**Tests:** `N/A — vẫn chưa có source code.` Không chạy build/typecheck/lint/unit/integration/E2E.
Kiểm chứng duy nhất đã chạy là parse Mermaid và đối chiếu ID/schema/route trên tài liệu.

**Errors:** Không có lỗi chặn. Đã sửa **5 sai sót thật** phát hiện trong quá trình verify:
1. `formatVietnamDate('2026-08-07')` ghi ví dụ là *Thứ Năm* — thực tế **2026-08-07 là Thứ Sáu**
   (kiểm bằng `Intl.DateTimeFormat`). Sửa ở `docs/01`, `docs/02`, `docs/04`.
2. ERD trong `docs/02` dùng `PK_FK` — không hợp lệ, mermaid parse lỗi. Đổi thành `PK, FK`.
3. Nhiều tài liệu ghi dải quyết định là `DEC-001..DEC-027` trong khi thực có **30**.
4. Bảng đếm trong `docs/11-decisions.md` ghi 24 APPROVED — đúng phải là 26 (rồi thành 30).
5. Sau khi `git init`, nhiều tài liệu vẫn còn câu "chưa phải git repository" — đã đồng bộ 13 chỗ.

**Decisions:** DEC-025 (viết lại theo lựa chọn của người dùng), DEC-026, DEC-029, DEC-030 chuyển
sang `APPROVED`. **DEC-028** mới: remote GitHub + quyền push đứng + git init ngay ở Phase 0
(điều chỉnh mốc thời gian của DEC-027).

**Remaining:** Không còn gì thuộc Phase 0. **Không còn OPEN QUESTION nào chờ trả lời.**
Một điểm theo dõi tiếp nhưng **không chặn tiến độ**: `AF-12` audit log (chưa cần vì không ai được
sửa báo cáo). `ISSUE-006` đã `CLOSED` — chủ nghiệp vụ xác nhận không xử lý gì quanh ngày nghỉ ở v1.

**Next:** Vào **PHASE 1 — Foundation**: `create-next-app@16`, dựng cấu trúc thư mục theo DEC-023,
cài `@supabase/supabase-js` + `@supabase/ssr` + `zod` + `lucide-react`, tạo `.env.example`, chạy
build/typecheck/lint để có baseline xanh, rồi commit + push. **Lưu ý:** `create-next-app` sẽ ghi đè
`.gitignore` — phải kiểm tra lại và khôi phục các mục `.env*` sau khi chạy.

---

### Entry 003

**Date:** 2026-08-07
**Phase:** PHASE 1 — Foundation (đóng phase)

**Completed:**

1. **Khởi tạo Next.js 16.3.0** bằng `create-next-app@16.3.0` với `--typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --skip-install --disable-git --empty`.
   **Cách làm khác với checkpoint, có lý do:** project root chứa 8 file markdown mà `create-next-app` coi là "conflicting files" nên **từ chối chạy tại chỗ**. Đã scaffold vào thư mục tạm trong scratchpad rồi **copy có chọn lọc** 8 file (`eslint.config.mjs`, `next.config.ts`, `package.json`, `postcss.config.mjs`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`) vào root.
   **Điều này còn tránh được một tai nạn:** `create-next-app@16.3` mặc định **sinh cả `AGENTS.md` và `CLAUDE.md`** (cờ `--agents-md` bật sẵn) — nếu chạy tại chỗ thì hai tài liệu điều khiển của dự án đã bị ghi đè. `.gitignore` của Phase 0 cũng được giữ nguyên vì không copy bản của template.
2. **Chạy smoke test tương thích ISSUE-004 / DEC-002 — rủi ro đã XẢY RA THẬT ở cả hai package.** Chi tiết ở mục *Errors*. Kết quả: pin `typescript@6.0.3` + `eslint@9.39.5`.
3. **Cài dependency và pin chính xác** (không dùng dải `^`): runtime `@supabase/supabase-js@2.112.2`, `@supabase/ssr@0.12.4`, `zod@4.4.3`, `lucide-react@1.29.0`, `server-only@0.0.1`; dev `vitest@4.1.10`, `@vitest/coverage-v8@4.1.10`, `@playwright/test@1.62.1`, `@axe-core/playwright@4.12.1`, `supabase@2.111.0`, `@vitejs/plugin-react@6.0.5`. Tổng 424 package. `npx playwright install chromium` đã tải xong (114.5 MiB).
   **`server-only` là bổ sung ngoài danh sách checkpoint** — bắt buộc phải có thì `import 'server-only'` trong `lib/supabase/admin.ts` mới hoạt động (NFR-005).
4. **Dựng đủ cấu trúc thư mục DEC-023** — 31 thư mục kèm `.gitkeep` (git không track thư mục rỗng): 3 route group `(auth)` / `(sales)` / `(admin)` với đủ route con, `app/api/reports/[id]/share-image/`, 10 thư mục `features/`, `components/ui/`, `lib/{validation,supabase,auth}/`, `services/`, `types/`, `supabase/migrations/`, `e2e/`, `public/fonts/`.
5. **Tạo 3 Supabase client đúng vai trò** (DEC-005): `client.ts` (browser, anon), `server.ts` (RSC + Server Action + Route Handler, anon + `cookies()`), `admin.ts` (service role, mở đầu bằng `import 'server-only'`, comment nêu rõ **chỉ** `auth.admin.*`).
   Thêm `lib/env.ts` đọc biến môi trường **có validate** để **không phải dùng `!`** (AGENTS.md §2 cấm non-null assertion không kèm giải thích). Cố ý validate **lúc gọi** chứ không lúc import — validate ở module scope sẽ làm `next build` vỡ trên máy chưa có `.env.local`, mà hiện chưa có Supabase project nào.
6. **Tạo `.env.example`** đủ 4 biến, chỉ placeholder, kèm chỉ dẫn lấy giá trị ở đâu trên Supabase Dashboard và cảnh báo service role key.
7. **Khai báo design token đã đo (DEC-014) vào `@theme` của Tailwind v4**, kèm type scale 12→40, breakpoint 375/768/1024/1440, utility `.tabular`, `prefers-reduced-motion`, `touch-action: manipulation`, và `font-size: 16px` cưỡng bức cho mọi control.
8. **Cấu hình font Inter** (DEC-013): `next/font/google`, `subsets: ['latin','vietnamese']`, `display: 'swap'`, biến `--font-inter`. `<html lang="vi">`, viewport **không** khoá zoom.
9. **Tạo khung `lib/kpi.ts`, `lib/currency.ts`, `lib/date.ts`** đúng signature Master Spec §9. Thân hàm cố ý `throw` — thà nổ to còn hơn âm thầm trả số sai; logic và unit test là Phase 5.
10. **Dựng 6 primitive UI** trong `components/ui/`: Button, Input, Label, Card, Badge, Skeleton — không biết nghiệp vụ, chỉ nhận props nguyên thuỷ. `Badge` dùng từ vựng trình bày (`tone`) chứ **không** nhận `AchievementStatus`, để primitive không dính nghiệp vụ.

**Files Changed:** 27 file **tạo mới** + 5 file **sửa**.

*Tạo mới — cấu hình (6):* `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`
*Tạo mới — app (3):* `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
*Tạo mới — lib (7):* `lib/env.ts`, `lib/utils.ts`, `lib/kpi.ts`, `lib/currency.ts`, `lib/date.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts` *(8 file)*
*Tạo mới — components (6):* `components/ui/{button,input,label,card,badge,skeleton}.tsx`
*Tạo mới — khác (2):* `.env.example`, `types/database.types.ts` *(placeholder, Phase 2 generate đè)*
*Tạo mới — 31 `.gitkeep`* giữ chỗ thư mục rỗng theo DEC-023
*Sửa:* `CLAUDE.md`, `AGENTS.md`, `PROJECT_CHECKLIST.md`, `docs/11-decisions.md`, `docs/12-known-issues.md`, `SESSION_CHECKPOINT.md`, `WORKLOG.md`

**Tests:**

**Build / Typecheck / Lint — ĐÃ CHẠY THẬT, cả 3 exit 0.** Nguyên văn:

```
> bikeforce@0.1.0 typecheck
> tsc --noEmit
typecheck exit=0

> bikeforce@0.1.0 lint
> eslint
lint exit=0                     (0 error, 0 warning)

> bikeforce@0.1.0 build
> next build
▲ Next.js 16.3.0 (Turbopack)
✓ Compiled successfully in 1813ms
  Running TypeScript ...
  Finished TypeScript in 4.8s ...
✓ Generating static pages using 4 workers (3/3) in 1958ms
Route (app)
┌ ○ /
└ ○ /_not-found
build exit=0
```

**Kiểm tra UI mobile — ĐÃ CHẠY THẬT** bằng Chromium (Playwright) trên server production `next start`, hai viewport:

```
[mobile-375] HTTP 200
  cuon ngang        : scrollW=375 clientW=375 -> OK
  html lang         : vi
  body font-family  : Inter, "Inter Fallback", ui-sans-serif, system-ui, sans-serif
  body background   : rgb(248, 250, 252)     ← #F8FAFC, khớp --color-background
  h1 color          : rgb(30, 58, 138)       ← #1E3A8A, khớp --color-heading
  touch target <44px: none
[desktop-1440] HTTP 200
  cuon ngang        : scrollW=1440 clientW=1440 -> OK
  (các chỉ số còn lại giống hệt)
KET QUA: PASS
```

Ảnh chụp 375px xác nhận dấu tiếng Việt hiển thị đủ (`ệ`, `ấ`, `ạ`, `ậ`, `ằ`). Script kiểm tra là công cụ dùng một lần, **đã xoá**, không commit.

**Kiểm tra `.gitignore` — ĐÃ CHẠY THẬT.** Tạo `.env.local` giả rồi `git check-ignore -v`:
`.env.local` → bị chặn bởi `.gitignore:10:.env.*` ✅ · `.env.example` → khớp `!.env.example`, **được track** ✅. File giả đã xoá.

**Unit / Integration / E2E:** `N/A — chưa có file test nào.` Vitest và Playwright đã cài nhưng **chưa có `vitest.config.ts`**, chưa có `*.test.ts`, chưa có `e2e/*.spec.ts`. Không được diễn giải thành pass.

**Errors:** Gặp **4 vấn đề thật**, tất cả đã xử lý:

1. **`create-next-app` từ chối chạy trong thư mục có sẵn file markdown.** Xử lý: scaffold ra thư mục tạm rồi copy chọn lọc (xem *Completed* mục 1). Lợi ích phụ: cứu được `AGENTS.md` / `CLAUDE.md` / `.gitignore` khỏi bị ghi đè.
2. **TypeScript 7.0.2 làm `eslint` vỡ hoàn toàn (exit 2):**
   ```
   typescript-eslint does not support TS 7.0.
   See also https://github.com/typescript-eslint/typescript-eslint/issues/10940
   ```
   Nguyên nhân gốc: `typescript-eslint@8.66.0` peer `typescript: ">=4.8.4 <6.1.0"`. Đáng chú ý là `next build` và `tsc --noEmit` **vẫn pass** với TS 7 — lỗi chỉ lộ ở bước lint, đúng kiểu bug mà DEC-002 muốn bắt sớm.
3. **ESLint 10.8.0 làm `eslint` vỡ, độc lập với TypeScript (exit 2):**
   ```
   TypeError: Error while loading rule 'react/display-name':
   contextOrFilename.getFilename is not a function
   ```
   Nguyên nhân gốc: `eslint-plugin-react@7.37.5` peer chỉ tới `eslint@^9.7`, và **7.37.5 là bản mới nhất tồn tại trên npm** → không có đường vá bằng `overrides`. Xử lý: lùi `eslint@9.39.5`.
4. **7 warning `no-unused-vars`** từ tham số của các hàm khung trong `lib/`. Xử lý **không phải** bằng cách tắt rule (AGENTS.md §14 cấm), mà **nâng rule lên `error`** kèm `argsIgnorePattern: "^_"` — công nhận quy ước `_` cho tham số cố ý chưa dùng, đồng thời khiến biến thừa thật sự bị fail chứ không chỉ cảnh báo.

**Decisions:**

- **DEC-002 — đã bổ sung mục "KẾT LUẬN SMOKE TEST"** vào `docs/11-decisions.md`: pin `typescript@6.0.3` + `eslint@9.39.5`, kèm nguyên văn lỗi và peer range chứng minh.
  **Sai lệch có chủ ý so với DEC-002 gốc:** phương án dự phòng ghi "lùi về TypeScript 5.x LTS", nhưng đã chọn **6.0.3**. Lý do: 6.0.3 là bản **stable** nằm **trong** peer range `<6.1.0` của `typescript-eslint` — tức nó thoả mãn đúng ràng buộc đang chặn, còn lùi tận 5.x thì mất hai major mà không đổi được gì. Ghi lại rõ vì Master Spec cấm im lặng downgrade.
- **Không tạo DEC mới** — mọi lựa chọn khác đều nằm trong khuôn khổ DEC đã APPROVED.
- **Ghi nhận `create-next-app@16.3` không còn hỏi Turbopack** và không còn cờ `--turbopack`; Next 16 dùng Turbopack mặc định (`▲ Next.js 16.3.0 (Turbopack)`). Chỉ dẫn "trả lời No cho Turbopack" trong checkpoint cũ **đã lỗi thời**.

**Remaining:** Không còn gì thuộc Phase 1.

- **ISSUE-004 → `CLOSED`** với mục Verification điền đủ 6 điểm (nội dung gốc giữ nguyên theo STANDING RULE §3).
- **ISSUE-008 mới (P3, OPEN):** `docs/01-business-analysis.md` mâu thuẫn nội bộ — một chỗ nói `percent: null` "**chỉ**" xảy ra khi `target=0 && actual>0`, nhưng bảng ở §"Hệ quả cho việc cài đặt `lib/kpi.ts`" lại cho `null` cả khi chưa có `actual`. Phát hiện khi viết khung `lib/kpi.ts`. **Không chặn tiến độ**, nhưng phải chốt ở **đầu Phase 5** trước khi viết thân `calculateAchievement()` — cùng lúc chốt nốt cách `AchievementResult` mang số vượt tuyệt đối + đơn vị (DEC-025 ghi "chốt cách cài đặt ở Phase 5").
- **Nợ kỹ thuật đã biết, đúng kế hoạch:** chưa có `vitest.config.ts`, chưa có `middleware.ts`, `types/database.types.ts` mới là placeholder rỗng.

**Next:** Vào **PHASE 2 — Database & Auth**. Việc đầu tiên **cần người dùng thao tác tay**: tạo Supabase project region Singapore trên dashboard, tắt signup công khai, rồi copy 3 giá trị vào `.env.local`. Người dùng đã yêu cầu **hướng dẫn chi tiết từng bước bấm** ở khúc này. Sau đó mới viết `supabase/migrations/0001_init_enums_profiles.sql`.

---

### Entry 004

**Date:** 2026-08-07
**Phase:** PHASE 2 — Database & Auth

**Completed:**

1. **Dựng Supabase local bằng Docker và chạy schema THẬT** (DEC-022). `npx supabase init` + `supabase start` (Postgres **17.6.1.156**, Supabase CLI 2.111.0). Cả 5 migration apply thành công qua `supabase db reset`.
2. **Viết đủ 5 migration** `0001_init_enums_profiles.sql` → `0005_indexes.sql`, bám sát `docs/02 §7` và `docs/06 §6`. **Ba khác biệt có chủ đích so với bản đề xuất Phase 0**, tất cả đã ghi vào tài liệu:
   - `citext` cài vào schema `extensions` ⇒ kiểu cột là `extensions.citext`. Đã kiểm chứng operator `=` resolve được dưới role `authenticated`, nên **không** phải dùng phương án dự phòng `lower(email)`.
   - `enable` + `force row level security` đặt **trong chính migration tạo bảng** (`0001`, `0002`) thay vì gom ở `0004`. Nhờ vậy không có thời điểm nào bảng tồn tại mà chưa bật RLS; `0004` chỉ còn policy vì policy phụ thuộc hàm của `0003`. Đây là cách dung hoà giữa `AGENTS.md §7` ("cùng file với create table") và bố cục 5 file mà `PROJECT_CHECKLIST` quy định.
   - `service_role` **không** được cấp DML — xem mục *Decisions* (DEC-031).
3. **Viết `supabase/seed.sql`** (LOCAL ONLY): 4 tài khoản qua `auth.users` + `auth.identities`, 22 báo cáo phủ đủ EXCEEDED / NEAR / MISSED / PENDING, một ngày `target = 0` (BR-015), một báo cáo biên thẻ ảnh 9:16 (tuyến 300 ký tự, ghi chú **đúng 1000 ký tự** có dấu, doanh thu 12 chữ số), và một tên **42 ký tự có dấu**.
4. **Generate `types/database.types.ts` thật** (259 dòng) từ schema, ghi đè placeholder rỗng của Phase 1.
5. **Dựng tầng auth đầy đủ** đúng layering của `AGENTS.md §1.2`:
   - `lib/auth/routes.ts` + `lib/auth/messages.ts` — **hàm thuần**, không I/O, unit test được không cần database.
   - `lib/validation/auth.ts` — `signInSchema`, dùng chung cho form client và Server Action.
   - `services/profiles.ts` — data access thuần, nhận supabase client làm tham số, `select` tường minh cột.
   - `features/auth/queries.ts` — `requireProfile` / `requireRole` / `requireAdmin`. **Đặt ở `features/` chứ không phải `lib/auth/`** vì chúng chạm database qua `services/`, mà `AGENTS.md §1.2` cấm `lib/` import `services/`.
   - `features/auth/actions.ts` — `signInAction`, `signOutAction`.
6. **`middleware.ts`** — refresh cookie + guard route/role, viết đúng 3 quy tắc chống lỗi kinh điển của `docs/06 §5.2`.
7. **`/login` + guard 2 route group + `app/page.tsx` phân luồng theo role**, kèm đủ `loading` / `error` / `not-found` cho cả `(sales)` và `(admin)`. Hai trang `/sales/today` và `/admin` là **trang tối thiểu của Phase 2**, đã ghi rõ trong chính file rằng FR-007 và FR-024 thuộc Phase 3 và Phase 8.
8. **Dựng bộ test đầu tiên của dự án** — `vitest.config.mts` với 3 project (`unit`, `integration`, `rls`) và 8 file test.

**Files Changed:** 30 file **tạo mới**, 8 file **sửa**, 7 file **xoá**.

*Tạo mới — database (6):* `supabase/migrations/0001…0005.sql`, `supabase/seed.sql`
*Tạo mới — cấu hình (3):* `supabase/config.toml`, `supabase/.gitignore`, `vitest.config.mts`
*Tạo mới — lib/services/types (5):* `lib/auth/routes.ts`, `lib/auth/messages.ts`, `lib/validation/auth.ts`, `services/profiles.ts`, `types/action-result.ts`
*Tạo mới — features (4):* `features/auth/{queries,actions,login-form,sign-out-button}`
*Tạo mới — app (10):* `middleware.ts`, `app/(auth)/login/page.tsx`, `app/(sales)/{layout,loading,error,not-found}.tsx`, `app/(sales)/sales/today/page.tsx`, `app/(admin)/{layout,loading,error,not-found}.tsx`, `app/(admin)/admin/page.tsx`
*Tạo mới — test (9):* `lib/auth/routes.test.ts`, `tests/integration/{setup,daily-reports.constraints,daily-reports.triggers,profiles.triggers,db-functions}`, `tests/rls/{setup,daily-reports.rls,profiles.rls,anon.rls}`
*Sửa:* `app/page.tsx`, `package.json`, `package-lock.json`, `eslint.config.mjs`, `.env.example`, `types/database.types.ts`, và 4 tài liệu (`docs/02`, `docs/06`, `docs/08`, `docs/09`, `docs/11`, `docs/12`)
*Xoá:* 7 file `.gitkeep` ở các thư mục nay đã có file thật

**Tests:**

**Build / Typecheck / Lint / Test — ĐÃ CHẠY THẬT, cả 4 exit 0.** Nguyên văn:

```
typecheck exit=0                       (tsc --noEmit)
lint exit=0                            (eslint — 0 error, 0 warning)

> vitest run
 Test Files  8 passed (8)
      Tests  80 passed (80)
   Duration  19.09s
test exit=0

> next build
▲ Next.js 16.3.0 (Turbopack)
✓ Compiled successfully in 6.3s
✓ Generating static pages using 7 workers (6/6) in 2.9s
Route (app)
┌ ƒ /          ├ ○ /_not-found   ├ ƒ /admin   ├ ƒ /login   └ ƒ /sales/today
ƒ Proxy (Middleware)
build exit=0
```

Phân bố 80 test: **14 unit** (`lib/auth/routes.test.ts`) · **40 integration** · **26 RLS**.

**Kiểm chứng luồng auth trên trình duyệt thật — ĐÃ CHẠY, 32/32 PASS.** Chromium trên server production (`next build` + `next start`), viewport 375×812 và 1440×900. Những khẳng định đáng kể nhất:

```
PASS  FR-004: chưa đăng nhập vào /sales/today → /login?next=%2Fsales%2Ftoday
PASS  [login-375] không cuộn ngang — scrollW=375 clientW=375
PASS  [login-375] không touch target < 44px
PASS  [login-375] input hiển thị ≥ 48px và font ≥ 16px — [{"h":48,"fs":"16px"},{"h":48,"fs":"16px"}]
PASS  chống user enumeration: sai mật khẩu và email không tồn tại cho CÙNG một câu
PASS  validate on blur: "Email không đúng định dạng." hiện ngay dưới field
PASS  FR-004: Sales vào /admin → về /sales/today (không lộ 403)
PASS  FR-004: Admin vào /sales/today → về /admin
PASS  chống open redirect: ?next=https://evil.example/steal bị bỏ qua
PASS  FR-003: sau đăng xuất, /sales/today lại bị chặn
```

**Kiểm chứng tài khoản bị vô hiệu hoá — ĐÃ CHẠY, 6/6 PASS**, gồm cả tình huống bị tắt **giữa phiên**: request kế tiếp bị đưa về `/login?reason=deactivated` kèm **đúng câu** quy định ở `docs/06 §8.3`.

**Kiểm chứng schema bằng SQL trực tiếp — ĐÃ CHẠY:** `relrowsecurity = true` và `relforcerowsecurity = true` cho **mọi** bảng trong `public`; 6 policy đúng như thiết kế; `vn_today()` khớp `Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh'})`.

**Chưa chạy — không được diễn giải thành pass:** `EXPLAIN ANALYZE` để xác minh InitPlan và index (Phase 11, NFR-002); Playwright E2E (`playwright.config.ts` và `e2e/*.spec.ts` vẫn chưa tồn tại); a11y `@axe-core/playwright`; Lighthouse. Hai script kiểm chứng trình duyệt ở trên là **công cụ dùng một lần, đã xoá**, không phải bộ hồi quy.

**Errors:** Gặp **5 vấn đề thật**, tất cả đã xử lý:

1. **Tôi đã đoán sai về CHECK constraint.** Tôi cho rằng Postgres từ chối hàm không IMMUTABLE trong CHECK và đã gỡ `ck_report_not_future` khỏi `0002`, thay bằng một ghi chú viện dẫn "ISSUE-009/DEC-031" **chưa hề tồn tại**. Chạy thử thật thì `CREATE TABLE` với `check (d <= (now() at time zone 'Asia/Ho_Chi_Minh')::date)` **thành công**. `docs/02` đúng, tôi sai. Đã khôi phục CHECK và xoá ghi chú bịa. Bài học: kiểm chứng trước khi viết kết luận vào file.
2. **Truy vấn trúng nhầm database của dự án khác.** Lệnh `docker ps --filter name=supabase_db | Select -First 1` trả về container của `cq-tntt-manager` (máy đang chạy **3 stack Supabase local**), khiến bảng grant đọc được là của một hệ thống quản lý trường học. Suýt dẫn tới kết luận sai. Ghi thành **ISSUE-010**; bộ test nay kết nối bằng `SUPABASE_DB_URL` tường minh + có chặn an toàn chỉ-cho-phép-localhost.
3. **`service_role` nhận `42501 permission denied` trên cả hai bảng** khi dựng fixture. Nguyên nhân gốc hoá ra là một phát hiện có giá trị chứ không phải lỗi — xem *Decisions*, DEC-031.
4. **ESLint lint cả `supabase/.temp/**`** — bundle edge-runtime đã minify do `supabase start` sinh ra, cho 158 error rác. Xử lý bằng `globalIgnores`, **không** hạ rule nào.
5. **Vite cảnh báo `ESM syntax in a file loaded as CommonJS` cho `vitest.config.ts`**, kèm thông báo `configLoader: 'native'` sẽ thành mặc định ở major sau. Đổi tên thành **`vitest.config.mts`** — dứt điểm, và không phải đặt `"type": "module"` cho cả dự án (việc đó sẽ đụng `next.config.ts` và `postcss.config.mjs`).

**Decisions:**

- **DEC-031 (MỚI, APPROVED)** — `service_role` **không được cấp DML** trên `profiles` và `daily_reports`; tầng test dùng kết nối Postgres trực tiếp qua `SUPABASE_DB_URL` (thêm devDependency `pg@8.22.0` + `@types/pg@8.20.4`).
  Lý do là một **đính chính cho chính tài liệu dự án**: `docs/02 §11 CẢNH BÁO 4` từng viết *"không có cơ chế database nào cứu được nếu kỷ luật này bị phá"*. Sai. **`rolbypassrls` không vượt qua `GRANT`** — hai cơ chế độc lập. Vì migration chỉ `grant` cho `authenticated`, `service_role` không chạm được hai bảng nghiệp vụ, nên **DEC-005 nay được database ép** thay vì chỉ dựa vào code review. Không ảnh hưởng UC-17/18/19 vì `auth.admin.*` đi qua GoTrue và schema `auth`. Đã khoá bằng test.
- **DEC-006 — bổ sung "KẾT LUẬN PHASE 2"**: rủi ro của `docs/02 §11 CẢNH BÁO 2` **không xảy ra**. `postgres` (owner của bảng và của cả 7 function) có `rolbypassrls = true`, nên `force row level security` không làm `handle_new_user()` bị chặn và không làm đệ quy `42P17` quay lại. **Giữ nguyên `enable` + `force`**; hai lối thoát (A) và (B) không dùng tới nhưng vẫn giữ trong tài liệu làm dự phòng.
- **ISSUE-009 (MỚI, P3, OPEN)** — Next.js 16.3 deprecate quy ước `middleware.ts`, khuyến nghị `proxy.ts`. **Cố ý hoãn**: 5 tài liệu điều khiển đang gọi tên `middleware.ts`, đổi giữa phase mà không sweep hết là tạo mâu thuẫn docs ↔ code. Điều kiện kích hoạt và trình tự migrate đã ghi trong issue.
- **ISSUE-010 (MỚI, P3, OPEN)** — nhiều stack Supabase local cùng chạy trên máy phát triển.

**Remaining:** Thuộc Phase 2, **một mục duy nhất**: tạo Supabase project **trên cloud** — bước người dùng phải tự bấm, đang thực hiện. Kèm theo đó là 3 việc phái sinh: `supabase link --project-ref <ref>` → `supabase db push` → chạy lại `supabase gen types typescript --linked`.

Nợ kỹ thuật đã biết, đúng kế hoạch: chưa có `playwright.config.ts`, chưa có `e2e/*.spec.ts`, chưa chạy `EXPLAIN ANALYZE` (Phase 11); thân hàm `lib/kpi|currency|date` vẫn `throw` (Phase 5); cơ chế buộc đổi mật khẩu lần đầu vẫn **chưa chốt** (`docs/06 §3.3` ghi chú 6 — phải quyết trước Phase 10 và ghi thành DEC mới).

**Next:** Sau khi người dùng tạo xong Supabase project cloud: `supabase link` → `db push` → `gen types --linked` → chạy lại đủ 4 lệnh chất lượng → rồi vào **PHASE 3 — Morning Report**, bắt đầu bằng `lib/validation/report.ts` và `features/report-morning/`. Lệnh chính xác ở `SESSION_CHECKPOINT.md § Next Exact Steps`.

---

### Entry 005

**Date:** 2026-08-07
**Phase:** PHASE 2 — Database & Auth (đóng phase)

**Completed:**

1. **Người dùng tạo xong Supabase project trên cloud.** Xác minh bằng `supabase projects list`:
   `ref = rnmywhwanpxmipqducqu`, tên `BikeForce_Bicycle Sales Management`, **region `ap-southeast-1`**
   (đúng Singapore như DEC yêu cầu), `status: ACTIVE_HEALTHY`, Postgres `17.6.1.155`.
2. **Sửa một lỗi cấu hình thật trong `.env.local`.** Người dùng dán `NEXT_PUBLIC_SUPABASE_URL` là
   `https://<ref>.supabase.co/rest/v1/` — đó là **endpoint REST**, không phải Project URL.
   `@supabase/supabase-js` tự nối thêm `/rest/v1` và `/auth/v1` vào URL gốc, nên giá trị đó sẽ tạo ra
   `/rest/v1/rest/v1/...` và `/rest/v1/auth/v1/...` ⇒ **mọi truy vấn và mọi lần đăng nhập đều 404**.
   Đã sửa thành `https://rnmywhwanpxmipqducqu.supabase.co`.
3. **Kiểm chứng cấu hình Auth trên cloud bằng HTTP thật**, không tin màn hình dashboard:
   - `GET /auth/v1/health` → `200`, GoTrue `v2.195.0` ⇒ project sống.
   - `POST /auth/v1/signup` → **`422 {"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}`**
     ⇒ **BR-012 / FR-006 đã được thực thi ở tầng hạ tầng**, không chỉ ở UI.
4. **`supabase link` + `supabase db push`** — cả 5 migration apply thành công lên cloud.
   `db push` báo `seeds: []` ⇒ **`seed.sql` KHÔNG bị đẩy lên production**, đúng DEC-022.
5. **Generate lại `types/database.types.ts` bằng `--linked`.** So với bản sinh từ local, khác **đúng
   một khối** `__InternalSupabase: { PostgrestVersion: "14.15" }` — nghĩa là **schema local và cloud
   giống hệt nhau**. Lấy bản cloud làm chuẩn.
6. **Kiểm chứng deny-by-default trên cloud** bằng anon key thật:
   `GET /rest/v1/profiles` và `GET /rest/v1/daily_reports` → **`401` + `42501 permission denied for table`**
   ⇒ `anon` không có cửa nào vào hai bảng nghiệp vụ, đúng NFR-004.
7. **Xác nhận người dùng đã push GitHub:** `origin/main` và `main` cùng ở `61271ac`.

**Files Changed:** `types/database.types.ts` (regenerate từ cloud), `.env.local` (không commit — sửa
URL), `PROJECT_CHECKLIST.md`, `SESSION_CHECKPOINT.md`, `WORKLOG.md`, `docs/09-deployment.md`,
`docs/12-known-issues.md`.

**Tests:** **ĐÃ CHẠY LẠI ĐỦ 4 LỆNH sau khi đổi file types.**
`typecheck` exit 0 · `lint` exit 0 (0 error, 0 warning) · `npm test` → **80 passed / 80** ·
`build` exit 0.

Cộng thêm 5 kiểm chứng HTTP trực tiếp trên cloud đã liệt kê ở *Completed* mục 3 và 6.
**Chưa chạy:** E2E Playwright, a11y, `EXPLAIN ANALYZE`, Lighthouse — vẫn `N/A`, thuộc Phase 11.

**Errors:** **1 lỗi cấu hình thật** (URL có đuôi `/rest/v1/` — mục 2 ở trên), đã sửa.
**1 sự cố bảo mật:** service role key (`sb_secret_...`) **đã lọt vào transcript hội thoại** do IDE tự
đồng bộ nội dung `.env.local` sau khi người dùng điền. Đã báo người dùng **rotate key**. Ghi thành
**ISSUE-011**. Điểm đáng ghi nhận: nhờ **DEC-031**, key này **không** đọc/ghi được `profiles` và
`daily_reports` (không có GRANT), nên bán kính thiệt hại giới hạn ở `auth.admin.*` — đây là lần đầu
DEC-031 chứng minh giá trị thực tế.

**Decisions:** Không tạo DEC mới. Mọi thao tác nằm trong khuôn khổ DEC-022, DEC-031, BR-012.

**Remaining:** **Không còn gì thuộc Phase 2.** Phase 2 đóng với 14/14 mục.
Còn hai việc *ngoài* Phase 2, đã ghi rõ: rotate service role key (ISSUE-011), và chạy runbook Admin
đầu tiên trên cloud (`docs/09 §10`) — việc này thuộc Phase 12, chỉ cần trước khi có người dùng thật.

**Next:** Vào **PHASE 3 — Morning Report**: `lib/validation/report.ts` + `lib/validation/report.test.ts`
→ `services/reports.ts` → `features/report-morning/` → `app/(sales)/sales/today/morning/page.tsx`.

---

### Entry 006

**Date:** 2026-08-07
**Phase:** PHASE 3 — Morning Report (13/14 mục · mục còn lại chờ người dùng trả lời OQ-18)

**Completed:**

1. **`lib/date.ts` và `lib/currency.ts` triển khai thật** — kéo lên sớm từ Phase 5, ghi thành
   **DEC-032**. Lý do là ràng buộc vật lý, không phải sở thích: không có `getVietnamToday()` thì
   Server Action không có `report_date` để ghi và RLS `reports_insert_own_today` từ chối mọi INSERT.
   - `getVietnamToday`, `formatVietnamDate`, `isValidVietnamDate` — **33 unit test**, gồm biên
     `16:59Z / 17:00Z / 17:01Z` và chạy lại toàn bộ bảng ở 4 timezone tiến trình (`UTC`,
     `America/New_York`, `Asia/Ho_Chi_Minh`, `Pacific/Kiritimati` = UTC+14).
   - `formatCurrencyVND`, `parseCurrencyInput`, `formatThousands` — **29 unit test**, gồm test khứ
     hồi `parse(format(v)) === v` để không ai sửa một bên mà quên bên kia.
   - **`lib/kpi.ts` CỐ Ý không kéo theo** — nó bị ISSUE-008 chặn thật, và Phase 3 không hiển thị `%`
     nào nên không cần tới.
2. **`lib/validation/report.ts`** — `morningReportSchema` + `reportDateSchema`, **47 unit test** theo
   đúng bảng của `docs/08 §3.6`. Ba điểm đáng ghi:
   - Schema **strip** `sales_id` / `report_date` / `status` / `actual_*` do client gửi kèm — có test
     khoá lại (AGENTS.md §8, docs/07 QUY TẮC 2 và 3).
   - Một schema gánh **cả chuỗi lẫn số**: form gửi `FormData` nên mọi giá trị lên server là chuỗi,
     còn test truyền số. `z.preprocess` dùng lại `parseCurrencyInput` thay vì viết parser thứ hai.
   - Khoá dùng `snake_case` trùng tên cột (**DEC-034**), khác ví dụ `camelCase` ở `docs/07 §3.5`.
3. **`lib/reports/today-cta.ts`** — quyết định "trạng thái nào thì hiện CTA nào" tách thành **hàm
   thuần**, **17 unit test** phủ đủ 3 trạng thái của `docs/03 §3.2` và bất biến
   `canExportImage === (state === 'COMPLETED')` (BR-002). Không còn một câu `if` nghiệp vụ nào trong JSX.
4. **`services/reports.ts`** — `getTodayReport` (18 cột tường minh, **không** `select('*')`),
   `insertMorningReport`, `updateMorningReport`. Dịch mã lỗi Postgres sang từ vựng nghiệp vụ
   (`DUPLICATE` / `REJECTED` / `UNKNOWN`) nên `PostgrestError` thô không bao giờ lên tới UI.
5. **`features/report-morning/`** — Server Action `saveMorningReport` + `updateMorningReport` (đủ 7
   bước của `docs/07 §1.3`), form client, `useReportDraft`, `CurrencyField` với 3 chip cộng nhanh,
   `CommitmentSummary`.
6. **Ba route Sales**: `/sales/today` viết lại theo FR-007 thật, `/sales/today/morning` mới, và
   `/sales/today/evening` **ở mức tối thiểu** (guard vai + BR-007 + hiển thị lại cam kết sáng theo
   FR-013) để CTA chính của trạng thái `MORNING_SUBMITTED` có đích đến thật — cùng cách Phase 2 đã
   làm với `/sales/today`.
7. **Ba primitive UI mới**: `components/ui/textarea.tsx`, `components/ui/form-field.tsx`, và
   `buttonClassName()` xuất từ `button.tsx` để CTA điều hướng render bằng `<Link>` thật mà vẫn trông
   và chạm y hệt nút.

**Files Changed:**
Mới: `lib/date.test.ts`, `lib/currency.test.ts`, `lib/validation/report.ts`,
`lib/validation/report.test.ts`, `lib/reports/today-cta.ts`, `lib/reports/today-cta.test.ts`,
`lib/reports/messages.ts`, `services/reports.ts`, `features/report-morning/{actions,morning-report-form,currency-field,commitment-summary,use-report-draft}`,
`components/ui/{textarea,form-field}.tsx`, `app/(sales)/sales/today/{morning,evening}/page.tsx`.
Sửa: `lib/date.ts`, `lib/currency.ts`, `components/ui/button.tsx`,
`app/(sales)/sales/today/page.tsx`, `docs/01`, `docs/05`, `docs/07`, `docs/08`, `docs/11`, `docs/12`,
`PROJECT_CHECKLIST.md`, `WORKLOG.md`, `SESSION_CHECKPOINT.md`, `CLAUDE.md`.

**Tests:** **ĐÃ CHẠY THẬT, đủ 4 lệnh.**
`npm run typecheck` exit 0 · `npm run build` exit 0 (7 route) · `npm run lint` exit 0 (0 error,
0 warning) · `npm test` → **213 passed / 213** (unit 140 · integration 47 · RLS 26; trước phase này
là 80).

**Kiểm chứng trình duyệt thật** (Chromium 375px + 1440px, script dùng-một-lần, **đã xoá, không
commit**): **57 PASS / 1 FAIL**. Phủ: ba trạng thái dashboard bằng ba tài khoản seed khác nhau
(`sales.c` chưa báo cáo, `sales.a` `MORNING_SUBMITTED`, `sales.b` `COMPLETED`); tạo báo cáo; sửa
báo cáo; validate biên `100000000001` và số âm; draft localStorage khôi phục sau reload; vào thẳng
`/morning` khi đã `COMPLETED` bị đá về `/sales/today` (BR-019); và ở mọi màn hình: không cuộn ngang,
touch target ≥ 44px, input ≥ 48px + 16px, mọi input có `<label for>`.
**Chưa chạy:** E2E Playwright, a11y, `EXPLAIN ANALYZE`, Lighthouse — vẫn `N/A`, thuộc Phase 11.

**Errors:** **Ba lỗi thật, tất cả đã sửa hoặc đã ghi nhận.**

1. **Banner xác nhận hiện sai câu sau khi TẠO báo cáo.** Sau khi `insert` thành công,
   `revalidatePath('/sales/today/morning')` làm RSC của chính trang form render lại; lúc đó đã có
   báo cáo nên `mode` chuyển `'create'` → `'edit'`, và client suy ra thông báo từ `mode` hiện tại
   nên hiện *"Đã cập nhật cam kết sáng"* cho một lần tạo mới. **Sửa tận gốc:** Server Action trả về
   `data.notice`; client không suy ra nữa (**DEC-034**). Bắt được nhờ chạy thật trên trình duyệt —
   unit test không thể thấy lỗi này.
2. **Sau `supabase db reset`, GoTrue + Kong không tự phục hồi** → mọi lần đăng nhập nhận `502`, và
   `docker ps` vẫn báo `healthy` nên rất dễ chẩn đoán sai. Ghi thành **ISSUE-012** kèm lệnh khắc
   phục đã kiểm chứng.
3. **React Compiler chặn hai cách viết quen tay** trong `useReportDraft`: đọc `ref.current` lúc
   render (`react-hooks/refs`) và `setState` đồng bộ trong effect (`react-hooks/set-state-in-effect`).
   Viết lại bằng `useSyncExternalStore` — đúng API mà React dành cho một external store như
   `localStorage`, và bỏ luôn một vòng render thừa sau mỗi lần hydrate.

**Decisions:** **DEC-032** (kéo `lib/date` + `lib/currency` lên Phase 3) · **DEC-033** (hàm hiển thị
trả `'—'` thay vì ném lỗi khi đầu vào không hợp lệ; thêm `isValidVietnamDate`) · **DEC-034**
(schema dùng `snake_case` trùng tên cột; `notice` do server quyết định).

**Remaining:** Đúng **một** mục của Phase 3 chưa tick: walkthrough NFR-008. **Đã đo thật: 1,8 giây
(đạt) nhưng 7 lần chạm (không đạt ≤ 6).** Không phải lỗi cài đặt — FR-008 quy định 5 trường bắt
buộc nên sàn lý thuyết là `1 + 5 + 1 = 7`. Hai requirement mâu thuẫn nhau ⇒ **cần người dùng quyết
định**, đã ghi thành **ISSUE-013** và **OQ-18** với ba phương án.

**Next:** **PHASE 4 — Evening Report**, bắt đầu bằng `eveningReportSchema` trong
`lib/validation/report.ts` + test, rồi `completeEveningReport` trong `services/reports.ts`, rồi
`features/report-evening/`, rồi thay trang tối thiểu `/sales/today/evening` bằng FR-013/FR-014 thật.

---

### Entry 007

**Date:** 2026-08-07
**Phase:** PHASE 4 — Evening Report (9/10 mục · mục còn lại là E2E Playwright, thuộc Phase 11)

**Completed:**

1. **`eveningReportSchema` thêm vào `lib/validation/report.ts`** — **49 unit test mới** (file này
   giờ có 96 test, trước là 47). Bốn chỉ số `actual_*` **bắt buộc**, khớp đúng
   `ck_completed_requires_actuals`; `actual_route` ≤ 300 và `evening_note` ≤ 1000 ký tự (BR-018)
   là tuỳ chọn. Ba điểm đáng ghi:
   - Có case `'ừ'.repeat(1000)` **hợp lệ** và 1001 ký tự **bị từ chối** — chứng minh đo theo **ký
     tự** chứ không theo byte, khớp cách `char_length` của Postgres đếm.
   - Schema strip `sales_id` / `report_date` / `status` / `evening_submitted_at` **và cả `target_*`**
     — có test khoá lại. Nếu payload cuối ngày ghi đè được `target_*` thì Sales có thể hạ chỉ tiêu
     xuống đúng bằng thực đạt ngay lúc chốt sổ (BR-019).
   - Rút `optionalTextField()` dùng chung cho `visit_purpose`, `actual_route`, `evening_note` thay
     vì gõ lại ba lần cùng một chuỗi `.trim().max().nullish().transform()`.
2. **`completeEveningReport()` trong `services/reports.ts`** — ghi 4 cột `actual_*` + `evening_note`
   + `evening_submitted_at` + `status` trong **MỘT** câu lệnh. Đây không phải chuyện phong cách:
   `ck_completed_requires_actuals` đánh giá trên dòng sau khi câu lệnh chạy xong, nên tách làm hai
   bước sẽ vỡ ngay ở bước một — và một câu lệnh nghĩa là không có trạng thái trung gian nào tồn tại
   dù chỉ một mili giây.
3. **`features/report-evening/`** — `saveEveningReport` (đủ 7 bước `docs/07 §1.3`),
   `evening-report-form.tsx`, và `discard-evening-draft.tsx`. Form khác form sáng ba điểm: chỉ có
   **một chế độ** (BR-019 khoá vĩnh viễn nên không tồn tại lần lưu thứ hai); **mỗi ô mang theo con
   số đã cam kết sáng** trong helper text để đối chiếu mà không phải cuộn lên (FR-013); và **nói
   trước rằng thao tác không hoàn tác được** ngay cạnh nút Lưu — thay vì một hộp thoại xác nhận tốn
   thêm một lần chạm cho mọi người dùng.
4. **`/sales/today/evening` thay bằng FR-013 + FR-014 thật.** Hai nhánh guard: chưa có cam kết sáng
   → `/sales/today/morning` (BR-007, đúng `docs/03 §5.2` bước 9 — không phải về `/sales/today` như
   trang tối thiểu của Phase 3); đã `COMPLETED` → `/sales/today` (BR-019).
5. **Ba thứ nâng lên tầng dùng chung (DEC-035, DEC-036)** vì `features/X` không được import
   `features/Y`: `useReportDraft` → `lib/hooks/`, `CurrencyField` → `components/ui/`, và guard quyền
   `authorizeSalesWrite()` → `features/auth/queries.ts`. Cái thứ ba cần **DEC-036** vì nó mở một
   ngoại lệ cho luật layering: guard phải chạm `services/` nên không thể ở `lib/`, và nhân bản 40
   dòng kiểm quyền ra hai chỗ là cách chắc chắn nhất để một ngày nào đó chỉ một trong hai chỗ được
   vá — mà chỗ không được vá là một lỗ hổng phân quyền.
6. **`tests/rls/report-service.rls.test.ts` — 7 test mới**, chạy `completeEveningReport()` dưới
   **JWT thật** qua PostgREST. Cố ý **không** đặt ở tầng integration: role `postgres` ở đó có
   `rolbypassrls` nên bài test sẽ "xanh" kể cả khi policy sai hoàn toàn. Phủ BR-003 (salesB gửi kèm
   `sales_id` của nạn nhân vẫn bị chặn), BR-009, BR-019 (lần hoàn tất thứ hai bị từ chối **và** dữ
   liệu không bị ghi đè), BR-020, và một case bỏ qua Zod để chứng minh CHECK tự đứng được.

**Files Changed:**
Mới: `features/report-evening/{actions.ts,evening-report-form.tsx,discard-evening-draft.tsx}`,
`lib/reports/draft-keys.ts`, `tests/rls/report-service.rls.test.ts`.
Di chuyển: `features/report-morning/use-report-draft.ts` → `lib/hooks/use-report-draft.ts` ·
`features/report-morning/currency-field.tsx` → `components/ui/currency-field.tsx`.
Sửa: `lib/validation/report.ts`, `lib/validation/report.test.ts`, `lib/reports/messages.ts`,
`services/reports.ts`, `features/auth/queries.ts`, `features/report-morning/{actions.ts,morning-report-form.tsx}`,
`app/(sales)/sales/today/page.tsx`, `app/(sales)/sales/today/evening/page.tsx`,
`AGENTS.md`, `docs/03`, `docs/07`, `docs/08`, `docs/11`, `docs/12`, `PROJECT_CHECKLIST.md`,
`WORKLOG.md`, `SESSION_CHECKPOINT.md`, `CLAUDE.md`.

**Tests:** **ĐÃ CHẠY THẬT, đủ 4 lệnh.**
`npm run typecheck` exit 0 · `npm run lint` exit 0 (0 error, 0 warning) · `npm run build` exit 0
(7 route) · `npm test` → **269 passed / 269** (unit 189 · integration 47 · RLS 33; trước phase này
là 213).

**Kiểm chứng trình duyệt thật** (Chromium 375px + 1440px, hai script dùng-một-lần, **đã xoá, không
commit**): **62/62 PASS** cho luồng cuối ngày và **11/11 PASS** cho hồi quy luồng đầu ngày. Phủ:
ba nhánh guard bằng ba tài khoản seed (`sales.c` chưa báo cáo → `/morning`; `sales.b` đã
`COMPLETED` → `/sales/today`; `admin` → `/admin`); đủ 6 ô của FR-014 có `<label for>`, cao ≥ 48px,
font ≥ 16px, 4 ô số có `inputMode="numeric"`; validate on blur; submit lỗi **không mất dữ liệu**
(NFR-010); draft localStorage khôi phục sau reload rồi bị xoá sau khi lưu; chip `+10tr`; lưu thành
công → banner + trạng thái "Đã hoàn thành"; vào lại `/evening` và `/morning` đều bị khoá (BR-019);
nút Xuất ảnh vẫn `disabled` (Phase 6); không cuộn ngang; **0 console error**.
Dữ liệu đã persist được kiểm lại thẳng trong Postgres: đủ 4 `actual_*`, có `evening_submitted_at`,
`evening_note` giữ nguyên dấu tiếng Việt (`Ừ ẫ ợ ỹ đ`), và **cột `target_*` không bị đụng tới**.

⚠ Để app trỏ vào Supabase **local** cho lần kiểm chứng này, đã dùng một file
`.env.production.local` tạm (ưu tiên cao hơn `.env.local` trong thứ tự nạp của Next ở chế độ
production) rồi **xoá sau khi xong** — **không đụng một dòng nào vào `.env.local` của người dùng**,
tránh lặp lại ISSUE-011. File đó bị `.gitignore` chặn, đã kiểm bằng `git check-ignore`.

**Chưa chạy:** E2E Playwright, a11y, `EXPLAIN ANALYZE`, Lighthouse — vẫn `N/A`, thuộc Phase 11.

**Errors:** **Hai lỗi thật, cả hai đã sửa.**

1. **ISSUE-014 (P2) — lưu cuối ngày thành công nhưng mất banner xác nhận và draft không bị xoá.**
   Kịch bản kiểm chứng bắt được: 59/62, đỏ đúng 3 mục. **Nguyên nhân:** sau mỗi Server Action, Next
   render lại RSC của **route hiện tại**; lần render lại đó của `/sales/today/evening` thấy `status`
   vừa thành `'COMPLETED'` nên chạy `redirect()` — điều hướng **phía server**, không mang `?saved=`.
   Nó làm form unmount **trước khi** `useEffect` bắt `state.ok` kịp commit.
   **Đã thử bỏ `revalidatePath('/sales/today/evening')` — KHÔNG cứu được**, vì Next re-render route
   hiện tại dù có revalidate hay không. **Sửa tận gốc (DEC-037):** để chính Server Action
   `redirect('/sales/today?saved=evening')`, và chuyển việc dọn draft sang `DiscardEveningDraft`
   trên `/sales/today` — nơi chắc chắn chạy được, và đúng nghĩa hơn ("báo cáo đã hoàn tất ⇒ không
   còn bản nháp cuối ngày nào còn ý nghĩa", đúng cả khi hoàn tất từ tab khác).
   Đây là **cùng họ với DEC-034** — lần thứ hai giả định "client được chạy nốt sau khi action thành
   công" bị re-render của route hiện tại phá vỡ. Lần này đã ghi thành bài học cho Phase 6 và
   Phase 10 ở cuối ISSUE-014.
2. **Server `next start` cũ không chết theo lệnh dừng, giữ port 3100 và phục vụ một build đã bị ghi
   đè** → lần chạy kiểm chứng kế tiếp cho 47/62 với hàng loạt `500`. Mất một vòng chẩn đoán sai
   trước khi nhận ra kết quả đó **không hợp lệ**, không phải regression. Cách làm đúng đã áp dụng:
   `Get-NetTCPConnection -LocalPort 3100` để tìm PID thật rồi `Stop-Process -Force`, xác nhận port
   trống, mới chạy lại.

**Decisions:** **DEC-035** (nâng `useReportDraft` → `lib/hooks/`, `CurrencyField` →
`components/ui/`, khoá draft → `lib/reports/draft-keys.ts`) · **DEC-036** (`features/auth/` là ngoại
lệ duy nhất của luật "features/X không import features/Y"; `authorizeSalesWrite()` dùng chung) ·
**DEC-037** (Server Action cuối ngày tự `redirect()`; dọn draft ở `/sales/today`).

**Remaining:** Đúng **một** mục của Phase 4 chưa tick: **E2E Playwright trên project `mobile-375`**.
Luồng đó **đã chạy thật đầu-cuối trên Chromium**, nhưng bằng script dùng-một-lần đã xoá — **không
phải** bộ E2E hồi quy. `playwright.config.ts` và ba project của nó thuộc **Phase 11**.
Hai việc chờ người dùng vẫn treo nguyên, **không chặn code**: rotate service role key (ISSUE-011) và
trả lời OQ-18 (ISSUE-013).

**Next:** **PHASE 5 — KPI Engine.** ⚠ **Phải chốt ISSUE-008 TRƯỚC khi viết thân
`calculateAchievement()`** — `docs/01` đang mâu thuẫn nội bộ về khi nào `AchievementResult.percent
= null`, và DEC-025 còn để ngỏ cách mang **số vượt tuyệt đối + đơn vị**. Viết code trước rồi chốt
sau là cách chắc chắn nhất để phải viết lại cả `lib/kpi.ts` lẫn bộ test của nó.

---

### Entry 008

**Date:** 2026-08-07
**Phase:** PHASE 5 — KPI Engine (**ĐÓNG ĐỦ 11/11 mục**)

**Completed:**

1. **Chốt hai chốt chặn của Phase 5 với người dùng TRƯỚC khi viết dòng code đầu tiên** — đúng thứ
   tự mà `SESSION_CHECKPOINT.md` yêu cầu. Câu trả lời ghi thành **DEC-038**:
   - **ISSUE-008** — `AchievementResult.percent = null` mang đúng một nghĩa "*không tồn tại một con
     số phần trăm có ý nghĩa*", đúng cho **cả hai** ca (`target = 0 && actual > 0` thành `EXCEEDED`;
     chưa có `actual` thành `PENDING`). Hai ca phân biệt nhau bằng **`status`**, không bằng
     `percent`. Hệ quả: bỏ chữ "**chỉ**" trong `docs/01`. **Bản chất BR-015 không đổi**
     (Master Spec §71).
   - **DEC-025 (phần cài đặt)** — `calculateAchievement()` nhận thêm tham số thứ ba
     `metric: KpiMetric` và trả về **cả** chuỗi đã format (`display`) **lẫn** số vượt thô
     (`surplus`). Bảng ánh xạ chỉ tiêu sang đơn vị chỉ tồn tại trong `lib/kpi.ts`.

2. **`lib/kpi.ts` — thân thật, thay cho khung ném lỗi từ Phase 1.** Xuất 5 hàm thuần:
   `calculateAchievement(target, actual, metric)`, `getAchievementStatus(pct)` (tên đã chốt từ
   Master Spec §9, **giữ nguyên**), cộng ba hàm mới của DEC-038: `formatMetricValue(value, metric)`
   (nơi DUY NHẤT biết `xe` / `điểm` / `khách` / VND), `achievementLabel(result)` (phân biệt
   "Vượt mục tiêu" với "Vượt kế hoạch" — BR-015 và BR-023), `isKpiAchievedDay(results)` (BR-024).
   Không clamp (BR-004); `percent` giữ giá trị **thô**, làm tròn 1 chữ số thập phân **chỉ** ở
   `display` (BR-014); đầu vào không dùng được trả `PENDING` + `'—'` thay vì ném lỗi (cùng triết lý
   DEC-033).

3. **`lib/kpi.test.ts` — 46 test, tất cả PASS.** Phủ đủ bảng biên `docs/08 §3.1` và `§3.2`, cộng
   `formatMetricValue` / `achievementLabel` / `isKpiAchievedDay`. Có một bài **quét lưới 288 tổ hợp**
   (8 target x 9 actual x 4 metric, gồm `NaN`, `±Infinity`, số âm) khẳng định bất biến BR-015:
   `percent` luôn `null` hoặc hữu hạn, và `display` không bao giờ chứa `'NaN'` / `'Infinity'` /
   `'∞'` / `'undefined'`.

4. **`features/report-comparison/` — thư mục feature MỚI**, dựng bảng đối chiếu DEC-019:
   - `achievement-table.tsx` — 4 chỉ tiêu, **hai chế độ**: 4 card xếp dọc ở dưới 768px, `<table>`
     THẬT có `<caption>` và `<th scope="row">` từ 768px. Component không tính và không format gì.
   - `achievement-badge.tsx` — ánh xạ `status` sang tone + icon Lucide (`TrendingUp` / `Minus` /
     `TrendingDown` / `Clock`). **Ngưỡng và nhãn** vẫn thuộc `lib/kpi.ts`; component chỉ giữ phần
     trình bày, đúng chú thích đầu `components/ui/badge.tsx`.
   - `report-notes.tsx` — phần CHỮ (tuyến kế hoạch / mục đích / tuyến thực tế / ghi chú cuối ngày),
     tách khỏi bảng để không phá cấu trúc `<table>`.

5. **`/sales/today` thay danh sách cam kết một cột bằng bảng đối chiếu.** Ở trạng thái
   `MORNING_SUBMITTED`, cột "Thực đạt" là `'—'` kèm badge "Chờ số liệu" — đúng `docs/05 §7.3` dòng
   1. Card giữ chỗ "Bảng đối chiếu … nằm ở màn hình chi tiết báo cáo" đã bị xoá vì bảng nay có thật
   ngay tại đây. `CommitmentSummary` **giữ nguyên** và chỉ còn phục vụ `/sales/today/evening`.

6. **Đo coverage thật lần đầu của dự án** bằng `npm run test:coverage` (provider v8).

**Files Changed:**

| File | Loại |
|---|---|
| `lib/kpi.ts` | sửa — thay khung ném lỗi bằng thân thật |
| `lib/kpi.test.ts` | **tạo mới** — 46 test |
| `features/report-comparison/achievement-table.tsx` | **tạo mới** |
| `features/report-comparison/achievement-badge.tsx` | **tạo mới** |
| `features/report-comparison/report-notes.tsx` | **tạo mới** |
| `app/(sales)/sales/today/page.tsx` | sửa — dùng `AchievementTable` + `ReportNotes` |
| `features/report-morning/commitment-summary.tsx` | sửa — chỉ chú thích, làm rõ nó **không** phải bảng đối chiếu |
| `docs/01-business-analysis.md` | sửa — §8.1 chữ ký hàm, đoạn mô tả `AchievementResult`, §"Hệ quả cho việc cài đặt" |
| `docs/05-ui-ux-design.md` | sửa — §7 trạng thái triển khai, §7.3 nguồn sinh chuỗi và icon |
| `docs/08-testing-strategy.md` | sửa — §3.1 chữ ký 3 tham số, 3 ô Expected lỗi thời, §3.1.1 đã chốt |
| `docs/11-decisions.md` | sửa — **thêm DEC-038**, sửa bảng tra nhanh `31` thành `38` |
| `docs/12-known-issues.md` | sửa — **ISSUE-008 chuyển CLOSED** kèm kết quả kiểm chứng thật |
| `CLAUDE.md` · `PROJECT_CHECKLIST.md` · `SESSION_CHECKPOINT.md` · `WORKLOG.md` | sửa — đồng bộ trạng thái |

**Tests:**

| Lệnh | Kết quả thật |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0 — 0 error, 0 warning |
| `npm run build` | ✅ exit 0 — Next.js 16.3.0, Turbopack, 7 route |
| `npm test` | ✅ **315 passed / 315**, 14 test file |
| `npx vitest run --project unit` | ✅ **242 passed** |
| `npx vitest run --project integration` | ✅ **40 passed** |
| `npx vitest run --project rls` | ✅ **33 passed** |
| `npx vitest run --project unit lib/kpi.test.ts` | ✅ **46 passed** |
| `npm run test:coverage` | ✅ `lib/**` — stmt **98,57%** · branch **99,01%** · func **96,43%** · lines **99,11%**; `lib/kpi.ts` **100%** cả bốn cột |
| Kiểm chứng Chromium 375px + 1440px (script dùng-một-lần, đã xoá) | ✅ **36/36 PASS** |
| E2E Playwright / a11y / Lighthouse | ❌ `N/A — chưa có playwright.config.ts` |

Chi tiết 36 phép kiểm trình duyệt: 4 card ở 375px với `<table>` bị ẩn · `<table>` thật ở 1440px với
card bị ẩn, có `<caption>` và 4 `<th scope="row">` · số liệu hai chế độ **khớp nhau** · thứ tự 4 chỉ
tiêu đúng `docs/05 §7.1` · ba tình huống `docs/05 §7.3` (chờ số liệu ra `'—'` kèm "Chờ số liệu";
`target=0 & actual=0` ra `'100,0%'` kèm "Vượt mục tiêu"; `target=0 & actual>0` ra `'+7 xe'` kèm
"Vượt kế hoạch") · **không cuộn ngang** ở cả hai bề rộng · không trang nào chứa `NaN` / `Infinity` /
`∞` / `undefined` trong text đã render.

**Errors:**

1. **Script kiểm chứng đọc DOM quá sớm — suýt kết luận sai về code.** Lần chạy đầu cho `27/36`, các
   phép kiểm của hai tài khoản `COMPLETED` đều FAIL trong khi cùng dữ liệu đó lại PASS ở 1440px.
   Nguyên nhân: `waitForLoadState('networkidle')` bắn **trước khi React render xong**, nên
   `document.querySelector` trả `null` và mọi assertion sau đó sai một cách âm thầm. Sửa bằng
   `waitForSelector('h1')` cộng `waitForSelector('table', { state: 'attached' })`. **Bài học cho
   session sau: một script kiểm chứng đọc DOM phải chờ PHẦN TỬ THẬT, không chờ mạng.**
2. **Phép kiểm `'undefined'` ban đầu là phép kiểm sai.** `page.textContent('body')` gộp cả nội dung
   thẻ `<script>` chứa RSC flight payload của Next — payload đó **luôn** chứa chuỗi `$undefined`.
   Đổi sang `page.innerText('body')` (chỉ text đã render) thì phép kiểm mới có nghĩa.
3. **Phát hiện lệch số liệu test trong tài liệu (đã sửa).** `SESSION_CHECKPOINT.md` và
   `PROJECT_CHECKLIST.md` ghi `unit 189 · integration 47 · rls 33`. Tổng `269` **đúng**, nhưng cách
   chia **sai**: đo lại từng project cho `unit 196 · integration 40 · rls 33`. Nguồn lệch là
   `lib/currency.test.ts` có **36** test chứ không phải 29 — và `git diff HEAD` xác nhận file này
   **chưa từng bị sửa** kể từ Phase 3, tức con số 29 vốn đã sai chứ không phải mới lệch. Đã sửa ở cả
   hai file cộng `docs/08 §2.4`. Theo CLAUDE.md §4, ghi lại đây thay vì âm thầm chọn một bên.
4. **Bảng tra nhanh của `docs/11` đứng yên ở `31`** trong khi DEC-032 đến DEC-037 đã tồn tại bên
   dưới. Đã sửa thành `38` và ghi chú nhắc cập nhật bảng khi thêm DEC mới.
5. **Fixture `target = 0` phải dựng tay.** Seed không có báo cáo `target = 0` cho **ngày hôm nay**,
   mà BR-015 chỉ hiển thị được ở báo cáo hôm nay. Đã `update` tạm trên database **local** cho
   `sales.b` (`target_visit_points = 0`, `actual_visit_points = 0`, `target_sales_quantity = 0`),
   kiểm chứng xong thì **khôi phục nguyên trạng** (`3` / `4` / `6`) và xác nhận lại bằng `select`.
6. **Trạng thái seed đã khác `SESSION_CHECKPOINT.md`.** Checkpoint ghi `sales.c` chưa có báo cáo /
   `sales.a` `MORNING_SUBMITTED` / `sales.b` `COMPLETED`; thực tế hôm nay là `sales.c`
   `MORNING_SUBMITTED` / `sales.a` và `sales.b` đều `COMPLETED` — do chính các phiên kiểm chứng tay
   trước đó ghi vào. Không phải bug; đã cập nhật lại mô tả fixture trong checkpoint.

**Decisions:** **DEC-038** (chốt ISSUE-008: `percent = null` đúng cho cả hai ca, phân biệt bằng
`status`; và chốt cách cài đặt DEC-025: `calculateAchievement` nhận `metric`, trả cả `display` lẫn
`surplus`; kèm ghi chú về hệ quả cố ý `99.99` ra `'100,0%'` nhưng status `NEAR`).

**Remaining:** Không còn mục nào của Phase 5. Ba việc treo từ trước **không thuộc Phase 5**: E2E
Playwright (mục cuối Phase 4, thuộc Phase 11) · rotate service role key (ISSUE-011) · trả lời OQ-18
(ISSUE-013). Riêng `getVietnamMonthRange()` **vẫn cố ý là khung ném lỗi** — nó phục vụ FR-021 và
FR-028 nên thuộc Phase 7/9; việc Phase 5 đóng không có nghĩa hàm đó đã xong.

**Next:** **PHASE 6 — Xuất ảnh 9:16.** Bắt đầu bằng Route Handler
`app/api/reports/[id]/share-image/route.ts` dùng `ImageResponse` (Satori) sinh PNG **1080x1920**
(FR-018, DEC-010), gác `status = 'COMPLETED'` trước khi render (BR-002), nhúng font `.ttf` có đủ dấu
tiếng Việt đọc bằng `fs` ở Node runtime (ISSUE-002). Thẻ
`features/report-share/DailyReportShareCard.tsx` **phải gọi lại** `calculateAchievement()` /
`formatMetricValue()` / `achievementLabel()` của `lib/kpi.ts` — không tự tính `%`, không tự ghép đơn
vị (NFR-012). Xong route mới xoá cờ `EXPORT_IMAGE_NOT_READY` trong
`app/(sales)/sales/today/page.tsx`.

---

### Entry 009

**Date:** 2026-08-08
**Phase:** PHASE 6 — Xuất ảnh 9:16 (**11/12 mục xong**; mục còn lại cần thiết bị thật)

**Completed:**

1. **Làm đúng việc mà `docs/12 § ISSUE-002 Fix bước 1` yêu cầu làm TRƯỚC TIÊN: dựng prototype
   Satori với dữ liệu giả.** Kết quả ngay lần đầu: PNG **1080×1920**, dấu tiếng Việt và `₫` render
   đúng. Nhờ vậy biết chắc **không phải dùng fallback `html-to-image`** trước khi viết một dòng nào
   của luồng thật — DEC-010 giữ nguyên hiệu lực, **ISSUE-002 → CLOSED**.

2. **Nhúng font.** Ba file `Inter-Regular/SemiBold/Bold.ttf` vào `public/fonts/`, mỗi file ~320 KB.
   Xác minh bằng cách **parse bảng `cmap`** của từng file chứ không nhìn bằng mắt: **2849 glyph**,
   đủ `ừ ẫ ợ ỹ đ Đ Ệ Ỡ`, `₫` (`U+20AB`) và `…`. Hai cái bẫy đã trả giá thật:
   - **Satori không đọc `woff2`** — phải lấy đúng bản `.ttf` (Google Fonts trả `.ttf` cho
     User-Agent lạ, trả `woff2` cho trình duyệt hiện đại).
   - **Subset `vietnamese` của Google Fonts KHÔNG chứa chữ Latin cơ bản** — nó chỉ có ký tự riêng
     của tiếng Việt cộng `₫`. Nhúng mỗi subset đó thì chữ thường mất glyph.

3. **`lib/reports/share-card.ts` — view model THUẦN của thẻ ảnh.** Dựng toàn bộ chuỗi hiển thị từ
   một dòng `daily_reports`, cắt tuyến ở 104 ký tự và ghi chú ở 232 ký tự **ở tầng dữ liệu** (Satori
   không có `-webkit-line-clamp` — ISSUE-002), cắt ở ranh giới **từ** chứ không giữa từ. Kèm
   `shareImageFileName()` (FR-019, bỏ dấu, xử lý cả `đ`/`Đ` mà `normalize('NFD')` không tách được)
   và `shareImagePath()`. **43 unit test** — đây là nơi toàn bộ edge case bắt buộc của Phase 6 được
   khoá lại mà không cần Satori, không cần trình duyệt, không cần database.

4. **`lib/reports/metric-rows.ts` — gộp bản sao thứ hai của danh sách 4 chỉ tiêu.**
   `AchievementTable` (Phase 5) và thẻ ảnh nay đọc **cùng một** định nghĩa "có chỉ tiêu nào, thứ tự
   nào, nhãn gì, cột nào". `docs/07 §5` yêu cầu thẳng: "màn hình đối chiếu và thẻ ảnh 9:16 không bao
   giờ ra hai con số khác nhau" — hai bảng hằng số song song là cách chắc chắn nhất để một ngày nào
   đó chỉ một bên được sửa.

5. **`formatCompactVND()` (`lib/currency.ts`) + `formatMetricValueCompact()` (`lib/kpi.ts`).**
   `docs/05 §14` quy định bảng trong ảnh dùng dạng rút gọn (`150tr`), số đầy đủ đặt ở khối "DOANH
   THU THỰC ĐẠT" — doanh thu 12 chữ số ở dạng đầy đủ làm vỡ khung 1080px. Đặt ở `lib/` vì định dạng
   tiền chỉ có một nhà (AGENTS.md §9). Có case biên đã khoá bằng test: làm tròn `999.999.999` phải
   **lên bậc** thành `1tỷ`, không được ra `1.000tr`.

6. **`services/reports.getReportForShare()`** — 14 cột + embedded `sales:profiles!inner(...)`.
   **Cố ý không nhận `salesId`**: lọc thêm `.eq('sales_id')` sẽ chặn nhầm Admin (BR-022), quyền để
   RLS quyết định hoàn toàn.

7. **`features/report-share/daily-report-share-card.tsx`** — bố cục `docs/05 §14`, flexbox toàn bộ,
   hex thuần từ bảng đã đo `docs/05 §4.5`, không `className`. Mỗi ô "Hoàn thành" có **con số + nhãn
   chữ** của `achievementLabel()` — quy tắc `color-not-only` áp dụng cho ảnh còn mạnh hơn cho web,
   vì ảnh qua Zalo bị nén màu.

8. **`app/api/reports/[id]/share-image/route.tsx`** — Route Handler duy nhất của dự án (DEC-003).
   `runtime = 'nodejs'`, uuid được validate **trước khi** chạm database, đọc dưới RLS bằng
   `lib/supabase/server.ts` (**không** dùng `admin.ts` — DEC-005), gác `status === 'COMPLETED'`
   (BR-002), 404 giống hệt nhau cho "không tồn tại" và "không có quyền" (chống dò ID). Font đọc
   **một lần mỗi tiến trình**, và được ghim vào bundle bằng `outputFileTracingIncludes` trong
   `next.config.ts` — thiếu dòng đó thì `next build` vẫn xanh còn hàm trên Vercel ném `ENOENT`.

9. **`features/report-share/share-image-button.tsx`** — ba đường ra theo DEC-011 và ISSUE-003:
   Web Share API (`canShare({ files })`, **feature detection chứ không sniff userAgent**) →
   `<a download>` → mở tab mới kèm câu "nhấn giữ vào ảnh để lưu". Huỷ share sheet (`AbortError`)
   **không** bị coi là lỗi.

10. **Bật nút Xuất ảnh ở `/sales/today`** — xoá cờ `EXPORT_IMAGE_NOT_READY`. Làm mạnh hơn yêu cầu:
    chưa `COMPLETED` thì **không render** khối nút, thay vì render dạng disabled.

11. **Sửa một vi phạm NFR-012 còn sót từ Phase 3:** `CommitmentSummary` tự ghép
    `` `${n} điểm` ``, khiến số từ 1.000 trở lên mất dấu phân nhóm nghìn. Chuyển sang
    `formatMetricValue()`.

**Files Changed:**

| File | Loại |
|---|---|
| `public/fonts/Inter-{Regular,SemiBold,Bold}.ttf` | **tạo mới** — asset bắt buộc commit (`docs/09 §7.1`) |
| `app/api/reports/[id]/share-image/route.tsx` | **tạo mới** — Route Handler duy nhất |
| `features/report-share/daily-report-share-card.tsx` | **tạo mới** |
| `features/report-share/share-image-button.tsx` | **tạo mới** — client component |
| `lib/reports/share-card.ts` · `share-card.test.ts` | **tạo mới** — view model + 43 test |
| `lib/reports/metric-rows.ts` | **tạo mới** — nguồn duy nhất của 4 chỉ tiêu |
| `tests/rls/share-image.rls.test.ts` | **tạo mới** — 6 test IDOR dưới JWT thật |
| `lib/currency.ts` · `lib/currency.test.ts` | sửa — thêm `formatCompactVND` + 15 test |
| `lib/kpi.ts` · `lib/kpi.test.ts` | sửa — thêm `formatMetricValueCompact` + 3 test |
| `lib/auth/routes.ts` · `routes.test.ts` | sửa — thêm `isApiPath` + 2 test (ISSUE-015) |
| `middleware.ts` | sửa — 401/403 JSON cho route API (DEC-039) |
| `services/reports.ts` | sửa — `getReportForShare` + `ShareReport` |
| `features/report-comparison/achievement-table.tsx` | sửa — dùng `KPI_METRIC_ROWS` chung |
| `features/report-morning/commitment-summary.tsx` | sửa — bỏ ghép chuỗi đơn vị |
| `app/(sales)/sales/today/page.tsx` | sửa — bật nút Xuất ảnh, xoá `EXPORT_IMAGE_NOT_READY` |
| `lib/reports/messages.ts` | sửa — thêm `NOT_COMPLETED`, `IMAGE_FAILED` |
| `next.config.ts` | sửa — `outputFileTracingIncludes` cho font |
| `docs/05` · `docs/06` · `docs/07` · `docs/08` · `docs/09` | sửa — §14, §5.2, §4.1+§5, Phase 6, §7.1 |
| `docs/11-decisions.md` | sửa — **thêm DEC-039** |
| `docs/12-known-issues.md` | sửa — **ISSUE-002 → CLOSED**, **thêm ISSUE-015 (CLOSED)** |
| `PROJECT_CHECKLIST.md` · `WORKLOG.md` · `SESSION_CHECKPOINT.md` · `CLAUDE.md` | sửa — đồng bộ |

**Tests:**

| Lệnh | Kết quả thật |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0 — 0 error, 0 warning |
| `npm run build` | ✅ exit 0 — 8 route, có `ƒ /api/reports/[id]/share-image` |
| `npm test` | ✅ **369 passed / 369**, 16 test file, 15,3 giây *(lượt cuối lúc 01:03, sau khi Docker hồi phục)* |
| `npx vitest run --project unit --coverage` | ✅ **290 passed**; `lib/**` stmt **98,46%** · branch **99,28%** · func **97,43%** · lines **98,75%**; `lib/reports/share-card.ts` **100%** cả bốn cột |
| `npm run test:db` | ✅ **79 passed** (40 integration + 39 rls) |
| Kiểm chứng Chromium 375px + 1440px (script dùng-một-lần, đã xoá) | ✅ **44/44 PASS** |
| Xem tận mắt 2 ảnh PNG xuất ra | ✅ đạt — xem mục dưới |
| E2E Playwright / a11y / Lighthouse | ❌ `N/A — chưa có playwright.config.ts` |
| Zalo in-app webview trên thiết bị thật | ❌ `N/A — chưa làm được, cần điện thoại thật` (ISSUE-003) |

> **Ghi chú về đường đi tới con số 369:** một lượt `npm test` giữa chừng cho **368** (đó là trước
> khi thêm 2 unit test cuối để phủ nốt 2 nhánh của `share-card.ts`), rồi Docker Desktop hỏng nên
> lượt tiếp theo không chạy được — xem **Errors 3**. Sau khi Docker tự hồi phục, lượt cuối cho
> **369/369 trong 15,3 giây**. Ghi lại đoạn này vì nó giải thích vì sao trong cùng một phiên có ba
> con số khác nhau (368 · FAIL · 369), và không con số nào trong đó là regression.

**44 phép kiểm trình duyệt gồm:** nút Xuất ảnh hiện và bấm được ở cả hai bề rộng, touch target
≥ 44px, không cuộn ngang · bấm nút ra file đúng tên FR-019 đã bỏ dấu · `content-type: image/png`,
`Content-Disposition: attachment`, `Cache-Control: private, no-store` · `IHDR` cho đúng
**1080×1920** ở cả 6 lần đo · BR-002: chính chủ gọi ảnh cho báo cáo `MORNING_SUBMITTED` → **403
`NOT_COMPLETED`** · BR-003: salesA gọi `id` của salesB → **404 `REPORT_NOT_FOUND`** · `id` không
phải uuid → 404 · BR-022: Admin → 200 · chưa đăng nhập → **401 `UNAUTHENTICATED`**, không HTML ·
ảnh edge case (tuyến 300, ghi chú 1000) vẫn đúng kích thước.

**Hai tấm ảnh đã xem bằng mắt:**
1. *Báo cáo thường* — `Ừ ẫ ợ ỹ đ Đ Ệ Ỡ` hiện đủ dấu, `Thứ Bảy, 08/08/2026`, `125.000.000 ₫` với ký
   hiệu `₫` đúng glyph, bốn dòng `125,0% / 80,0% / 83,3% / 100,0%` kèm nhãn chữ và màu đúng ngưỡng
   BR-023.
2. *Ảnh gom TẤT CẢ edge case* — tên 42 ký tự **xuống dòng chứ không bị cắt**; tuyến 300 ký tự cắt ở
   2 dòng có `…`; ghi chú 1000 ký tự cắt đúng 4 dòng; `100tỷ` trong bảng và `99.999.999.999 ₫` ở
   khối dưới; `1.250,0%`; `+3 điểm` kèm "Vượt kế hoạch" cho `target = 0`. **Không chỗ nào có `NaN`,
   `Infinity` hay `∞`.**

**Errors:**

1. **ISSUE-015 (P1) — suýt phát cho khách một tấm ảnh hỏng.** Phép kiểm "chưa đăng nhập → 401" báo
   FAIL với `200`. Thoạt nhìn giống một lỗ hổng nghiêm trọng (ảnh phát cho người lạ), nhưng đo lại
   bằng `curl` trần cho thấy sự thật khác: middleware trả **`307` về `/login`**, và Playwright —
   giống hệt `fetch()` của trình duyệt — **tự đi theo redirect** rồi thấy trang đăng nhập `200`.
   Nghĩa là khi phiên hết hạn, nút "Xuất ảnh" sẽ lưu HTML trang đăng nhập thành một file `.png`
   hỏng **mà không báo lỗi gì**. Sửa bằng **DEC-039**: `isApiPath()` + 401/403 JSON, cộng một lớp
   kiểm `content-type` ở client. **Hai bài học:** (a) khi một phép kiểm bảo mật báo đỏ, đo lại bằng
   công cụ **không** tự đi theo redirect trước khi kết luận; (b) middleware viết ở Phase 2 giả định
   "mọi đường dẫn đều là trang" — giả định đó hết đúng ngay khi dự án có route API đầu tiên.

2. **Một phép kiểm BR-002 ban đầu viết sai, không phải code sai.** Bài "báo cáo chưa hoàn tất → 403"
   ban đầu dùng phiên của `sales.a` để gọi báo cáo của `sales.c`, nên nhận `404` — **đúng**, vì
   BR-003 chặn trước BR-002. Muốn đo BR-002 thì phải đăng nhập **chính chủ**. Sửa phép kiểm, không
   sửa code.

3. **Docker Desktop hỏng ở mức engine giữa lúc chạy quality gate.** Một lượt `npm test` chạy
   **434 giây** rồi báo 7 file FAIL / 60 skipped, trong khi lượt trước đó và lượt ngay sau đó đều
   **368/368 trong ~19 giây**. Đến lượt `test:coverage` thì lỗi thành ổn định: mọi request tới
   Supabase local timeout 30s, và `docker ps` trả **`500 Internal Server Error` cho chính API của
   Docker** (`http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/containers/json`). Đây là lỗi
   môi trường của máy, **không phải** lỗi code và **không phải** ISSUE-012 (lần này Kong/GoTrue
   không phải thủ phạm — chính engine Docker chết). Đã **không** tự khởi động lại Docker Desktop vì
   máy đang chạy thêm hai stack Supabase khác của người dùng (ISSUE-010). **Docker tự hồi phục sau
   khoảng 10 phút**, và lượt `npm test` ngay sau đó cho **369/369 trong 15,3 giây** — xác nhận toàn
   bộ sự việc là môi trường, không phải code. **Bài học:** khi bộ test DB đột nhiên chạy hàng phút
   rồi FAIL hàng loạt, kiểm `docker ps` **trước** khi đọc lại code — nếu chính lệnh đó cũng lỗi thì
   không có gì trong repository cần sửa cả.

4. **Ước lượng số ký tự cắt chuỗi là ước lượng, và cần được kiểm bằng ảnh thật.** 104 ký tự cho
   tuyến và 232 cho ghi chú suy ra từ bề rộng trung bình ~0,52em của Inter. Ảnh thật xác nhận đúng
   2 dòng và đúng 4 dòng — nhưng nếu đổi cỡ chữ hay lề thì **phải render lại một tấm ảnh để nhìn**,
   không có test tự động nào bắt được việc chữ tràn khung.

**Decisions:** **DEC-039** (middleware trả 401/403 JSON cho route `/api/*` thay vì redirect —
nguyên nhân là ISSUE-015, đã đo thật).

**Remaining:** Đúng **một** mục của Phase 6: **kiểm tay trong Zalo in-app webview trên thiết bị
thật** (ISSUE-003, NFR-009). Cần một điện thoại thật và một link công khai, nên phải chờ sau khi
deploy Vercel — automation `zalo-like` **không** thay thế được. Ba việc treo từ trước vẫn nguyên:
E2E Playwright (Phase 11) · rotate service role key (ISSUE-011) · trả lời OQ-18 (ISSUE-013).

**Next:** **PHASE 7 — Sales History.** Bắt đầu bằng `getVietnamMonthRange(yyyyMM)` ở `lib/date.ts`
(hiện **vẫn cố ý là khung ném lỗi**) kèm unit test cho tháng 2 năm nhuận và chuỗi sai định dạng,
rồi `services/reports.listReportsByMonth()` phân trang server-side bám
`idx_daily_reports_sales_date_desc`, rồi `/sales/history` và `/sales/reports/[id]`. Khi dựng xong
`/sales/reports/[id]`, **xoá `VIEW_REPORT` khỏi tập `CTA_ROUTES_NOT_READY`** trong
`app/(sales)/sales/today/page.tsx` — cờ đó nay là thứ **duy nhất** còn lại trong file đó. Màn hình
chi tiết dùng lại `AchievementTable` + `ReportNotes` + `ShareImageButton` **đã có sẵn**, không viết
lại.

---

### Entry 010

**Date:** 2026-08-10

**Phase:** PHASE 7 — Sales History · PHASE 8 — Admin Dashboard · PHASE 9 — Admin Reports & Filters · PHASE 10 — Sales Management · PHASE 11 — Testing & Security *(gộp năm phase trong một phiên, theo yêu cầu của người dùng)*

**Completed:**

**0) Phát hiện lệch giữa tài liệu và source code — xử lý trước khi gõ dòng code nào.**
`SESSION_CHECKPOINT.md` ghi "Phase 7 chưa bắt đầu", nhưng working tree có **58 file chưa commit, khoảng 7.000 dòng**, phủ gần hết Phase 7, 8, 9, 10. Không tài liệu nào được cập nhật, và code tham chiếu **DEC-040, DEC-041, DEC-042** trong khi `docs/11` mới có tới DEC-039. Theo CLAUDE.md §4, đã **dừng và đo trạng thái thật bằng công cụ** thay vì tin một bên: `typecheck` exit 0 · `lint` exit 0 · `npm test` **685/685** · `build` exit 0 ra **18 route**. Kết luận: code là thật và có test; thứ thiếu là **tài liệu**. Đã hỏi người dùng ba câu trước khi đi tiếp (xem `Decisions`).

**1) FR-037 — biểu đồ trend theo ngày (mục SHOULD duy nhất còn trống của Phase 9).**
- `supabase/migrations/0007_admin_daily_trend.sql` — RPC `admin_daily_trend(p_from, p_to)`, `security invoker`, guard InitPlan, chỉ `authenticated` được execute.
- `lib/reports/trend-chart.ts` — toàn bộ hình học dưới dạng **hàm thuần**, **17 unit test** gồm một bài quét lưới 64 tổ hợp bệnh lý khoá bất biến "không bao giờ `NaN`/`Infinity`/chiều cao âm".
- `features/admin-analytics/daily-trend-chart.tsx` — SVG viết tay, **không thêm dependency nào**, render trong Server Component.
- `services/admin.getAdminDailyTrend()` + **8 test RLS** mới.
- Bộ chuyển chỉ tiêu bằng **4 `<Link>` thật** đổi `?metric=`, không phải state client.

**2) `tests/integration/indexes.test.ts` — tầng test MỚI: kế hoạch truy vấn.** 14 bài `EXPLAIN (ANALYZE)`. Trả lời dứt điểm ba câu hỏi bỏ ngỏ từ `0005_indexes.sql` và **đóng ISSUE-005** — xem `Errors` mục 3.

**3) PHASE 11 — bộ E2E thật đầu tiên của dự án.** `playwright.config.ts` với 3 project (`mobile-375`, `desktop-1440`, `zalo-like`), `globalSetup`/`globalTeardown` tự dựng và dọn fixture, và 5 file trong `e2e/`: `sales-flow`, `admin-flow`, `security`, `a11y`, cộng hạ tầng (`env`, `accounts`, `fixtures`, `helpers`). **33 bài × 3 project = 99 bài, tất cả xanh.** Trong đó **30 lượt quét `@axe-core/playwright`** trên 10 màn hình: **0 vi phạm serious/critical** (NFR-007).

**4) Sửa ISSUE-016 (P1) — bug thật do chính bộ E2E vừa dựng phát hiện.** Xem `Errors` mục 1.

**5) Đóng nợ Phase 3 và Phase 4.** OQ-18 được trả lời (DEC-043) nên mục walkthrough NFR-008 tick được → **Phase 3 đóng 14/14**. Bộ E2E có commit làm mục cuối của Phase 4 tick được → **Phase 4 đóng 10/10**.

**6) Đồng bộ lại toàn bộ tài liệu** — 6 quyết định mới, 2 issue mới, 2 issue đóng, và 9 file `docs/` được cập nhật theo ma trận Master Spec §62.

**Files Changed:**

*Tạo mới (17):* `supabase/migrations/0007_admin_daily_trend.sql` · `lib/reports/trend-chart.ts` + `.test.ts` · `lib/reports/metric-rows.test.ts` · `lib/account/messages.ts` · `lib/admin/messages.ts` · `features/admin-analytics/daily-trend-chart.tsx` · `tests/integration/indexes.test.ts` · `playwright.config.ts` · `e2e/env.ts` · `e2e/accounts.ts` · `e2e/fixtures.ts` · `e2e/helpers.ts` · `e2e/global-setup.ts` · `e2e/global-teardown.ts` · `e2e/sales-flow.spec.ts` · `e2e/admin-flow.spec.ts` · `e2e/security.spec.ts` · `e2e/a11y.spec.ts`

*Sửa (9):* `lib/reports/metric-rows.ts` (thêm bảng tra toàn phần `kpiMetricRow()`) · `services/admin.ts` · `app/(admin)/admin/analytics/page.tsx` · `features/account/actions.ts` · `features/admin-sales-management/actions.ts` · `tests/integration/setup.ts` (thêm `inRollbackTransaction()`) · `tests/rls/admin-aggregates.rls.test.ts` · `types/database.types.ts` (regenerate) · `package.json`

*Tài liệu (13):* `docs/01` … `docs/12` (9 file có nội dung mới) · `PROJECT_CHECKLIST.md` · `WORKLOG.md` · `SESSION_CHECKPOINT.md` · `CLAUDE.md` · `AGENTS.md`

*Kèm theo, đã có sẵn từ phiên trước nhưng commit ở lần này (58 file):* toàn bộ Phase 7–10.

**Tests:**

| Lệnh | Kết quả THẬT |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0 — 0 error, 0 warning |
| `npm run build` | ✅ exit 0 — **18 route** |
| `npm test` | ✅ **729 passed / 729**, 29 test file, 23,8 giây |
| `npx vitest run --project unit` | ✅ **542** |
| `npx vitest run --project integration` | ✅ **54** |
| `npx vitest run --project rls` | ✅ **133** |
| `npx vitest run --project unit --coverage` | ✅ `lib/**` — stmt **99%** · branch **98,69%** · func **100%** · lines **99,4%** |
| `npx playwright test` (3 project) | ✅ **99 passed / 99**, 4,4 phút |
| Xem tận mắt biểu đồ trend ở 375px và 1440px | ✅ đã chụp và mở xem — phát hiện một lỗi thị giác thật, xem `Errors` mục 4 |

Vẫn `N/A`, **không được đọc thành pass**: Lighthouse (chưa chạy) · kiểm ảnh 9:16 trong Zalo trên **thiết bị thật** (ISSUE-003).

**Errors:**

1. **ISSUE-016 (P1) — bộ E2E bắt được một bug mà bốn cửa kiểm khác bỏ lọt, ngay lượt chạy đầu tiên.**
   `features/admin-sales-management/actions.ts` và `features/account/actions.ts` khai `'use server'` **và** export một object hằng số. Next ném ngay khi nạp module: *A "use server" file can only export async functions, found object.* Hậu quả: `/admin/sales/new` và `/admin/account` hiện "Đã có lỗi xảy ra" — **toàn bộ UC-17 không dùng được**.
   Đáng ghi nhớ là **cách nó sống sót**: `typecheck` exit 0 (đây là quy định của framework, không phải của hệ thống kiểu), `lint` 0 error (không có rule), `build` exit 0 ra đủ 18 route (lỗi ở runtime, không phải lúc biên dịch), và **724 unit/integration/RLS test đều xanh** (không bài nào nạp một Server Action qua đúng đường của Next). Bốn cửa đó **không phát hiện được nhóm lỗi này về nguyên tắc**.
   Sửa bằng **DEC-045**: hằng số chuyển sang `lib/account/messages.ts` và `lib/admin/messages.ts` — đúng khuôn `lib/auth/messages.ts` đã có từ Phase 2. **Phòng ngừa đã ghi thành luật:** bộ E2E phải chạm ít nhất một Server Action của mỗi feature.

2. **Bốn bài E2E đỏ cùng lúc ở đúng project `desktop-1440`, trong khi giao diện hoàn toàn đúng.**
   Nguyên nhân là hệ quả trực tiếp của DEC-019: mọi bảng render **hai nhánh cùng lúc trong DOM** (card `md:hidden` + `<table>` `hidden md:table`), nên mỗi con số xuất hiện hai lần, và ở 1440px thì bản đứng **trước** trong DOM chính là bản bị ẩn. `getByText(...).first()` vì thế luôn bắt trúng phần tử ẩn. Sửa bằng helper `visibleText()` dùng `filter({ visible: true })`, và ghi lại nguyên nhân ngay trong `e2e/helpers.ts` để lần sau không mất một vòng chẩn đoán nữa.

3. **ISSUE-005 hoá ra là lo lắng thừa — nhưng chỉ biết được sau khi đo.**
   Nghi vấn từ Phase 2: `is_admin()` có bị gọi **mỗi dòng** thay vì một lần cho cả câu lệnh không. Đo thật dưới vai `authenticated` với 2.700 dòng: `(select public.is_admin())` **được nâng thành InitPlan**, `actual rows=1 loops=1`. Đúng như DEC-006 dự đoán. **ISSUE-005 → CLOSED.**
   Hai câu hỏi bỏ ngỏ khác trong `0005_indexes.sql` cũng có câu trả lời: `idx_daily_reports_sales_date_desc` **KHÔNG dư thừa** (nó thắng index unique cho truy vấn FR-021, và không có node `Sort`) — **đừng drop**; còn `idx_profiles_role_active` thì phủ được truy vấn, nhưng ở quy mô vài chục dòng planner chọn `Seq Scan` là **hợp lý**, nên bài test cố ý không khẳng định "planner luôn chọn index".
   Hai bẫy đã tránh khi viết bộ này: (a) trên bảng 22 dòng của seed thì **mọi** truy vấn đều `Seq Scan`, nên phải tự sinh dữ liệu trước khi hỏi kế hoạch; (b) role `postgres` có `rolbypassrls` nên policy **không tham gia kế hoạch** — đo bằng vai đó sẽ "xanh" một cách vô nghĩa.

4. **Biểu đồ trend bản đầu vỡ type scale ở 1440px — và chỉ ảnh chụp mới cho thấy.**
   Bản đầu đặt nhãn ngày vào `<text>` trong SVG với viewBox cố định cộng `width: 100%`. Ở 375px trông vừa đẹp; ở 1440px SVG phóng to **2,7 lần**, chữ `font-size: 11` render thành khoảng 30px và biểu đồ cao 540px. **Không unit test nào bắt được** — hình học hoàn toàn đúng, chỉ có tỉ lệ hiển thị sai. Sửa bằng cách đưa mọi chữ ra HTML và cho SVG `preserveAspectRatio="none"` cộng chiều cao cố định bằng CSS; kéo theo `PLOT_LEFT = 0` để nhãn HTML khớp cột, và thêm một unit test khoá đúng ràng buộc đó. Đây là lần thứ hai dự án gặp bài học "phải render ra rồi nhìn tận mắt" (lần đầu là cắt chuỗi trên thẻ ảnh 9:16, Phase 6).

5. **Ba lỗi nhỏ của chính bộ E2E, sửa test chứ không sửa code:** tham số tìm kiếm là `q` chứ không phải `search`; câu báo lỗi email trùng cố ý xuất hiện **hai** chỗ nên `getByText` vi phạm strict mode; và bài "404" chạy khi chưa đăng nhập nên middleware redirect về `/login` và Playwright đi theo redirect thấy `200` — **đúng cái bẫy ISSUE-015 đã ghi lại từ Phase 6**. Cộng một lỗi vòng đời: `globalSetup` đóng pool `pg` khiến `globalTeardown` không dọn được fixture, và Playwright chỉ báo "1 error was not a part of any test" — bộ test vẫn "xanh" trong khi tài khoản E2E nằm lại trong database.

6. **ISSUE-017 (P3, OPEN có chủ đích) — `notFound()` trả 200 thay vì 404.** Trang nằm dưới route group có `loading.tsx` nên Next stream phần vỏ ra trước; tới lúc `notFound()` ném thì header đã gửi. Đã cân nhắc và **cố ý không sửa**: thứ BR-003 đòi hỏi là hai ca "không tồn tại" và "không có quyền" phải **không phân biệt được** — tính chất đó vẫn đúng và đã có E2E khoá; không có dữ liệu nào rò rỉ; và nơi mã trạng thái thực sự quan trọng (route API, nơi `fetch` phân nhánh) vẫn trả mã thật. Cách sửa duy nhất là bỏ `loading.tsx`, tức đánh đổi một mã trạng thái lấy trạng thái tải của **mọi** trang trong group.

**Decisions:**

- **DEC-040** — `getVietnamMonthRange()` trả `null` khi chuỗi tháng sai định dạng, không ném lỗi.
- **DEC-041** — chính sách mật khẩu: tối thiểu 8 ký tự, không bắt quy tắc thành phần, **v1 không ép đổi mật khẩu lần đầu**. *(người dùng xác nhận)*
- **DEC-042** — `GET /api/admin/reports/export` là Route Handler thứ hai và cuối cùng của v1.
- **DEC-043** — **trả lời OQ-18**: NFR-008 nới thành **≤ 8 lần chạm**, giữ nguyên 5 trường bắt buộc. *(người dùng chọn phương án (a))*
- **DEC-044** — FR-037 vẽ bằng SVG viết tay, không thêm thư viện biểu đồ. *(người dùng chọn)*
- **DEC-045** — hằng số dùng chung không được nằm trong file `'use server'`.

Ba câu đã hỏi người dùng đầu phiên và đều được trả lời: xác nhận DEC-041 · chọn phương án cho OQ-18 · có làm FR-037 hay không.

**Remaining:**

- **ISSUE-003** — kiểm ảnh 9:16 trong **Zalo trên thiết bị thật**. Cần điện thoại + link công khai ⇒ phải chờ deploy Vercel. Mục cuối cùng còn nợ của Phase 6.
- **Lighthouse** và **ma trận thử tay Chrome/Safari mobile** (Phase 11) — cần thiết bị thật, cùng lý do.
- **ISSUE-011 (P1)** — rotate service role key. Việc của người dùng, không chặn code.
- **Migration 0006 và 0007 chưa đẩy lên cloud.** Khu vực Admin sẽ hỏng trên bản deploy cho tới khi làm xong — hướng dẫn từng bước bấm ở `docs/09 §12`.
- **Toàn bộ Phase 12** (Deployment) chưa bắt đầu.

**Next:** **PHASE 12 — Deployment Preparation.** Bước đầu tiên và bắt buộc: **đẩy migration 0006 + 0007 lên Supabase cloud** theo `docs/09 §12` (có cả hai cách: `npx supabase db push --linked`, hoặc dán SQL trên Dashboard kèm hai câu kiểm để xác nhận đủ 5 hàm và `anon` không execute được). Rồi đặt **Minimum password length = 8** trên Dashboard cho khớp DEC-041, rotate service role key (ISSUE-011), sau đó mới tới Vercel. Sau khi có link công khai thì kiểm ngay ISSUE-003 trên điện thoại thật — đó là thứ duy nhất còn chặn Phase 6 đóng hoàn toàn.

---

### Entry 011

**Date:** 2026-08-10

**Phase:** PHASE 12 — Deployment Preparation *(bắt đầu)*

**Completed:**

**Đẩy migration `0006` + `0007` lên Supabase cloud `rnmywhwanpxmipqducqu`.** Người dùng yêu cầu agent
làm giúp và chỉ chỗ lấy mật khẩu (`SUPABASE_DB_PASSWORD` trong `.env.local`).

Thứ tự đã làm — **kiểm trước, dry-run, rồi mới đẩy**:

1. `cat supabase/.temp/project-ref` → xác nhận đang link đúng `rnmywhwanpxmipqducqu`.
2. `npx supabase migration list --linked` → `0001`…`0005` có cả hai bên, `0006`/`0007` chỉ có `local`.
3. `npx supabase db push --linked --dry-run` → đúng **hai** file, `"seeds":[]`, `"roles":[]`.
4. `npx supabase db push --linked --yes` → `Applying migration 0006…` → `Applying migration 0007…` → `Finished`.
5. `npx supabase migration list --linked` → **7/7 khớp cả hai bên**.

**Kiểm chứng sau khi đẩy — đo bằng ĐƯỜNG DỮ LIỆU THẬT của ứng dụng, không chỉ tin output của CLI:**

| Phép kiểm | Kết quả |
|---|---|
| Gọi cả 5 RPC `admin_*` qua REST bằng khoá **`anon`** | **`42501 permission denied for function <tên>`** cho cả 5 |
| `supabase gen types typescript --linked` so với bản đã commit | khác **đúng một khối metadata** `__InternalSupabase.PostgrestVersion` |
| `POST /auth/v1/signup` bằng `anon` | **`422`** — tự đăng ký vẫn tắt (BR-012, FR-006) |
| `GET /rest/v1/profiles` và `/daily_reports` bằng `anon` | **`401` + `42501 permission denied for table`** |

Phép kiểm thứ nhất là phép kiểm **có giá trị nhất**, và lý do đáng ghi lại: `42501` chứng minh **hai
điều cùng lúc** — hàm **tồn tại** trên cloud (nếu thiếu thì PostgREST trả `PGRST202 Could not find the
function`), **và** `anon` không execute được. Một câu `select proname from pg_proc` chỉ chứng minh
được điều thứ nhất, và lại cần quyền kết nối trực tiếp vào database.

**Files Changed:** `docs/02-database-design.md` (bảng trạng thái cloud + bảng kiểm chứng) ·
`docs/09-deployment.md` (§12 đánh dấu đã làm, giữ lại làm runbook) · `SESSION_CHECKPOINT.md` ·
`PROJECT_CHECKLIST.md` (tick 3 mục Phase 12) · `CLAUDE.md` · `WORKLOG.md`. **Không có thay đổi code
nào.**

**Tests:** `npm run typecheck` ✅ exit 0 · `npm run lint` ✅ exit 0 · `npm test` ✅ **729/729** ·
`npm run build` ✅ exit 0, 18 route. Không có gì thay đổi so với Entry 010 — phiên này chỉ đụng
database cloud và tài liệu.

**Errors:**

1. **Một giả định cũ của dự án hoá ra SAI, theo hướng có lợi.** `SESSION_CHECKPOINT.md` và `docs/09`
   đều ghi rằng agent **không** đẩy migration được vì `supabase db push` hỏi mật khẩu mà môi trường
   không có TTY — suy ra từ việc `git push` thật sự không chạy được. Thực tế: `db push` **đọc được
   mật khẩu từ biến môi trường `SUPABASE_DB_PASSWORD`**, và cờ `--yes` bỏ qua câu hỏi xác nhận. Nên
   nó chạy được hoàn toàn từ agent. **Bài học:** hai công cụ khác nhau có hai cơ chế nhập bí mật khác
   nhau — đừng suy giới hạn của công cụ này sang công cụ kia mà không thử.
2. **Mật khẩu không bao giờ được in ra.** Đọc bằng `Select-String` rồi gán thẳng vào `$env:`, và mọi
   lệnh kiểm tra chỉ in **độ dài** chứ không in giá trị. Cùng kỷ luật đã sinh ra ISSUE-011.

**Decisions:** None — không có quyết định mới. Mọi thứ đi theo `docs/09 §12` đã viết ở Entry 010.

**Remaining:**

- **Cloud CHƯA CÓ USER NÀO** — seed cố ý không được đẩy. **Phải chạy runbook tạo Admin đầu tiên**
  (`docs/09 §10`) trước khi test bản deploy, nếu không sẽ không đăng nhập được.
- Đặt **Minimum password length = 8** trên Dashboard cho khớp DEC-041.
- **Rotate service role key** (ISSUE-011, P1).
- Vercel · PWA manifest · smoke test production · ISSUE-003 (Zalo thiết bị thật) · Lighthouse.

**Next:** **Đặt `Minimum password length = 8`** trên Supabase Dashboard → Authentication → Password
(DEC-041), **rotate service role key** (ISSUE-011), rồi **chạy runbook tạo Admin đầu tiên** theo
`docs/09 §10`. Sau đó mới cấu hình Vercel theo `docs/09 §12.5` và chạy smoke test `§12.6`.

---

### Entry 012

**Date:** 2026-08-10

**Phase:** `PHASE 12 — Deployment Preparation` (mục PWA) + mở `PHASE 13 — Nhận diện thương hiệu & soát UI/UX`

**Completed:**

Phiên này làm ba việc, theo đúng thứ tự người dùng yêu cầu giữa chừng.

**(1) FR-036 — PWA manifest + icon (mục code cuối cùng của Phase 12).**

| File | Vai trò |
|---|---|
| `lib/pwa/manifest.ts` | Nguồn DUY NHẤT của nội dung manifest. Ở `lib/` chứ không ở `app/` vì project `unit` của Vitest **chỉ quét `lib/**`** — đặt ở đây thì các ràng buộc của FR-036 được khoá bằng test thay vì nằm trong một file cấu hình không ai kiểm |
| `lib/pwa/manifest.test.ts` | **13 test**: `display === 'standalone'` · đủ 192/512 cho cả `any` lẫn `maskable` · hai purpose là **hai file khác nhau** · mọi `src` tuyệt đối · `short_name ≤ 12` ký tự · không khai trường nào ngụ ý offline (DEC-024) · không khoá `orientation` |
| `app/manifest.ts` | Adapter 3 dòng → `/manifest.webmanifest` |
| `public/icons/icon-{192,512}.png` · `icon-maskable-{192,512}.png` | 4 icon, `purpose` tách đôi |
| `app/apple-icon.png` (180) · `app/icon.svg` · `app/favicon.ico` (32) | 3 icon theo quy ước file của Next |
| `e2e/pwa.spec.ts` | **4 bài × 3 project = 12** |
| `middleware.ts` | thêm `webmanifest` vào `PUBLIC_FILE` |

**(2) DEC-046 — dựng lại bảng màu từ LOGO CHÍNH THỨC.** Người dùng gửi logo giữa phiên (xe đạp
**cam** trên nền **trắng**, chữ hiệu **xanh dương**) và yêu cầu tone màu trang web khớp logo:
trắng chủ đạo, cam và xanh là màu phụ. Đã thay **12 token** trong `app/globals.css`, thêm
`components/ui/brand-mark.tsx` (`BrandMark` + `BrandLockup`), gắn logo vào `/login` · header hai
route group (ẩn từ 1024px) · sidebar.

**(3) Tải và dùng thật skill `ui-ux-pro-max`.** Người dùng yêu cầu tải skill về để soát thiết kế.
`git clone` từ `github.com/nextlevelbuilder/ui-ux-pro-max-skill` vào `~/.claude/skills/ui-ux-pro-max`
(v2.13.0) — **chạy được**. Phần *soát toàn hệ thống* được cất sang **Phase 13** theo yêu cầu
"tập trung deploy trước".

**(4) Runbook deploy từng cú bấm** — `docs/09 §13`, 8 bước, kèm bảng trạng thái cloud **đo thật**.

**Files Changed:**

*Mới:* `lib/pwa/manifest.ts` · `lib/pwa/manifest.test.ts` · `app/manifest.ts` ·
`components/ui/brand-mark.tsx` · `e2e/pwa.spec.ts` · `app/icon.svg` · `app/apple-icon.png` ·
`app/favicon.ico` · `public/icons/` (4 PNG).

*Sửa:* `app/globals.css` (12 token) · `app/layout.tsx` · `app/(auth)/login/page.tsx` ·
`app/(sales)/layout.tsx` · `app/(admin)/layout.tsx` · `features/navigation/main-nav.tsx` ·
`components/ui/badge.tsx` (chú thích) · `middleware.ts`.

*Tài liệu:* `docs/05 §4.1–§4.4, §15` · `docs/09 §13` (MỚI) · `docs/11` (DEC-046, DEC-047) ·
`docs/12` (ISSUE-018) · `PROJECT_CHECKLIST.md` (tick PWA + mở Phase 13) · `SESSION_CHECKPOINT.md`.

**Tests:** `npm run typecheck` ✅ exit 0 · `npm run lint` ✅ exit 0, 0 warning ·
`npm test` ✅ **742/742** (unit **555** — thêm 13 bài PWA · integration 54 · rls 133) ·
`npm run build` ✅ exit 0, **18 route nghiệp vụ + 3 route metadata** ·
`npm run e2e` ✅ **111/111** trên 3 project (33 + 4 bài PWA, mỗi project), gồm **30 lượt quét axe**.

**Errors:**

1. **Bảng màu mới làm ĐỎ 9 lượt quét axe ở `desktop-1440` — và chỉ ở đó.** Nguyên nhân đo được:
   `#1273b8` trên `#e0f0fb` = **4,32:1**, thiếu **0,18** so với AA. Đó là mục nav đang sáng ở
   **sidebar**, nơi `features/navigation/main-nav.tsx` ghép `text-primary` lên `bg-status-info-bg` —
   **hai token thuộc hai cặp khác nhau**. Bottom tab của mobile không dính vì nó không có nền.

   **Bài học đáng ghi lại nhất của phiên:** phép ghép chéo đó đã tồn tại từ Phase 7 và **luôn sai về
   nguyên tắc**; nó chỉ "may mà đạt" vì chàm `#1E40AF` cũ đủ tối (8,72:1). Đổi màu không tạo ra lỗi
   mới — nó **làm lộ** một lỗi có sẵn. Sửa bằng cách dùng đúng cặp `bg-status-info-bg` +
   `text-status-info-fg` (**7,99:1**).

   Hai hệ quả về quy trình: **(a)** đo contrast của token so với `card`/`background` là **chưa đủ** —
   phải đo cả những cặp *thực tế bị chồng lên nhau trong DOM*; **(b)** không có 30 lượt quét axe của
   Phase 11 thì lỗi này ra thẳng production, vì nó chỉ hiện ở ≥1024px và người viết code thì hay nhìn
   ở một bề rộng.

2. **`--design-system` của skill `ui-ux-pro-max` khớp NHẦM cho sản phẩm này.** Với truy vấn
   "internal daily sales reporting field team mobile-first white orange blue" nó trả về pattern
   **"Newsletter / Content First"**, bảng màu **đỏ** (`#DC2626`) và font **Atkinson Hyperlegible** —
   cả ba đều mâu thuẫn với DEC-012/013 và với logo. **Phần dùng được là 98 UX guideline +
   Pre-Delivery Checklist**, không phải phần sinh design system. Đã ghi vào Phase 13 để session sau
   không mất công lần nữa.

3. **Suýt bỏ sót một cái bẫy im lặng của manifest.** Trình duyệt tải `/manifest.webmanifest` bằng
   request **không kèm cookie**, nên nếu để nó đi qua nhánh xác thực thì middleware luôn thấy "chưa
   đăng nhập" và trả HTML của `/login` kèm **`status = 200`** — không lỗi nào hiện ra, chỉ là nút
   "Thêm vào màn hình chính" lặng lẽ không bao giờ xuất hiện. Cùng họ với ISSUE-015. Đã thêm
   `webmanifest` vào `PUBLIC_FILE` và khoá bằng bài E2E gọi với `maxRedirects: 0`.

4. **Heredoc `bash` vỡ khi ghi tài liệu dài có backtick và dấu nháy.** Đã chuyển sang ghi ra file
   trung gian rồi `cat >>`. Ghi lại để không thử lại cách cũ.

**Decisions:**

- **DEC-046** — bảng màu lấy từ logo chính thức, thay **bảng giá trị** của DEC-014 (giữ nguyên
  *phương pháp* của DEC-014). Nguyên tắc: **giữ đúng sắc của logo, chỉ chỉnh độ sáng vừa đủ để đạt
  ngưỡng**. Cam logo `#E9A04F` chỉ **2,19:1** trên trắng ⇒ **cấm** làm chữ và đồ hoạ mang nghĩa, chỉ
  làm nền (chữ tối trên nó, **8,17:1**) và làm chính hình logo (WCAG miễn trừ logotype). Xanh logo
  `#197DC3` thiếu **0,09** so với AA ⇒ `--color-primary` là bản tối hơn 4% (`#1273B8`, **5,04:1**).
- **DEC-047** — `app/manifest.ts` và 3 file icon là **metadata route**, **không** phải Route Handler
  thứ ba; DEC-042 vẫn nguyên vẹn. Kèm 4 điểm chốt: `theme_color` = `background_color` = **trắng** ·
  `maskable` là file riêng · `apple-icon.png` bắt buộc vì **iOS bỏ qua manifest** · manifest phải
  đọc được khi chưa đăng nhập.

**Remaining:**

- **Toàn bộ Phase 13** — soát 98 guideline trên 18 route ở 375px và 1440px. Bảng màu mới **mới chỉ
  được chứng minh bằng số đo và axe, CHƯA từng được nhìn bằng mắt**.
- Phase 12 còn: 4 bước Dashboard/Vercel của người dùng (`docs/09 §13` Bước 0–6), smoke test
  production, Lighthouse, ISSUE-003.

**Next:** Người dùng chạy `git push origin main`, rồi làm `docs/09 §13` **Bước 1 → Bước 7** theo đúng
thứ tự. Việc đầu tiên không được bỏ qua là **Bước 4 — tạo Admin đầu tiên**: đã đo và xác nhận cloud
đang có **đúng 0 user**, không làm bước này thì deploy xong không ai đăng nhập được.
---

### Entry 013

**Date:** 2026-08-10

**Phase:** `PHASE 12 — Deployment Preparation` (thực thi)

**Completed:**

Thực thi runbook `docs/09 §13`, phần nào chạy được bằng CLI thì agent làm hết.

1. **BƯỚC 0 — `git push origin main` CHẠY ĐƯỢC.** GitHub nay ở `53123e1`.
2. **BƯỚC 4 — tạo Admin đầu tiên trên cloud, XONG.** `datathongdat@gmail.com` · "Lê Duy Khang" ·
   `role='ADMIN'` · `is_active=true` · email đã confirm. Mật khẩu tạm 144-bit sinh ngẫu nhiên, ghi
   **thẳng ra `.env.admin-bootstrap`** (bị `.gitignore` chặn), **không in ra terminal**.
3. **Kiểm chứng cloud bằng đường thật** — xem `Tests`.

**Files Changed:** `SESSION_CHECKPOINT.md` · `docs/09-deployment.md` (§13 Bước 0 và Bước 4 đánh dấu
XONG + ghi lại đường kết nối database cloud) · `WORKLOG.md`. **Không có thay đổi code.**
Sinh ra ngoài repo: `.env.admin-bootstrap` (không commit).

**Tests:**

| Phép kiểm | Kết quả |
|---|---|
| `git ls-remote origin refs/heads/main` | `53123e1…` — **đúng commit vừa đẩy** |
| `GET /auth/v1/admin/users` trước khi chạy | **0 user** |
| `POST /auth/v1/admin/users` | **201**, `email_confirmed_at` có |
| `update public.profiles set role='ADMIN'` | **1 dòng** |
| `select ... where role='ADMIN'` | **1 dòng**, `is_active=true` |
| `POST /auth/v1/token?grant_type=password` | **200**, nhận `access_token` |
| `GET /rest/v1/profiles` bằng **chính JWT đó** (qua RLS thật) | trả đúng 1 dòng `ADMIN` |
| `GET /auth/v1/settings` | `disable_signup = true` ✅ (BR-012) |

Phép kiểm áp chót là phép kiểm **có giá trị nhất**: nó chứng minh **cả chuỗi** — user tồn tại, mật
khẩu đúng, email đã confirm, trigger đã tạo profile, quyền đã nâng, **và RLS cho chính chủ đọc được
hồ sơ của mình** — bằng đúng đường mà ứng dụng sẽ đi, chứ không phải bằng `service_role` vượt rào.

**Errors:**

1. **Niềm tin "agent không `git push` được" là SAI.** Ghi trong `CLAUDE.md` và `SESSION_CHECKPOINT.md`
   suốt từ Phase 0. Thử thật thì chạy — credential đã được Git Credential Manager cache. Đây là lần
   **thứ hai** cùng một kiểu sai (lần đầu: `supabase db push`, Entry 011). **Bài học lặp lại lần hai
   thì phải thành quy tắc: đừng suy giới hạn của công cụ này sang công cụ kia — thử đã.**
2. **`Everything up-to-date` không chứng minh gì.** Dòng đó cũng xuất hiện khi ref `origin/main` ở
   local bị cũ. Phải hỏi thẳng remote bằng `git ls-remote`.
3. **`db.<ref>.supabase.co` không phân giải được (`ENOTFOUND`).** Free tier không còn IPv4 trực tiếp.
   Đường đi được là pooler `aws-0-ap-southeast-1.pooler.supabase.com:5432`, user `postgres.<ref>`.
   `aws-1-...` trả `XX000`. Script đã thử lần lượt 3 ứng viên nên tự tìm ra đường đúng.
4. **CỐ Ý KHÔNG chạy `supabase config push`** dù nó đặt được `minimum_password_length` bằng CLI.
   `supabase/config.toml` là cấu hình cho **local dev**: nó có `enable_signup = true` và
   `site_url = "http://127.0.0.1:3000"`. Đẩy nguyên khối lên cloud sẽ **BẬT LẠI self-registration
   trên production** — phá thẳng BR-012/FR-006 — và trỏ Site URL về localhost. CLI **không có
   `--dry-run`**. Đổi 1 cài đặt mà đánh cược cả khối cấu hình auth của production là không đáng;
   để người dùng bấm 3 cái trên Dashboard.
5. **`python` in ra stdout cp1252 nên ném `UnicodeEncodeError` với ký tự `✓`.** Ghi lại: script vá
   tài liệu phải in ASCII, nội dung ghi file thì vẫn UTF-8 bình thường.

**Decisions:** None — không có quyết định kiến trúc mới. Việc không dùng `config push` là đánh giá
rủi ro tại chỗ, đã ghi ở `Errors` mục 4.

**Remaining:**

- **Vercel** — chỉ người dùng làm được (không có `VERCEL_TOKEN`): import repo · 3 biến môi trường ·
  region `sin1` · Deployment Protection cho Preview.
- **Minimum password length = 8** trên Dashboard (DEC-041) — xem `Errors` mục 4.
- **Rotate service role key** (ISSUE-011) — phải do người dùng làm, vì giá trị mới không được đi qua
  transcript và họ phải tự dán vào Vercel.
- Sau khi có link: Site URL · smoke test · Lighthouse · ISSUE-003 (Zalo).
- **Đổi mật khẩu Admin rồi xoá `.env.admin-bootstrap`.**

**Next:** Người dùng làm `docs/09 §13` **Bước 1, 2, 3, 5, 6** (Bước 0 và 4 đã xong). Trọng tâm là
Bước 5 — Vercel.
---

### Entry 014

**Date:** 2026-08-10

**Phase:** `PHASE 12 — Deployment Preparation` — **ĐÃ LÊN PRODUCTION**

**Completed:**

**Production sống:** `https://bike-force-bicycle-sales-management.vercel.app`

Người dùng làm phần Dashboard/Vercel; agent đo lại toàn bộ bằng công cụ.

**Smoke test Admin — 16/16 PASS trên production**, chạy bằng Playwright ở **375px và 1440px**, dùng
một tài khoản ADMIN **tạm do agent dựng rồi tự xoá** (không đụng tài khoản thật): đăng nhập →
`/admin` · cả 5 màn hình Admin trả 200 · **cuộn ngang 0px ở cả hai bề rộng** · không `NaN`/`Infinity`/
`undefined` · không lỗi console · Admin mở `/sales/today` bị đưa về `/admin` (FR-004). Dọn xong,
`auth.users` trở lại đúng 2 user thật, `profiles` 2 dòng, `daily_reports` 0 dòng.

**Bằng chứng luồng thật của chính người dùng** (đọc từ `auth.users`): đăng nhập lúc **07:32:15**,
**đổi mật khẩu** lúc 07:33:16, **tạo tài khoản Sales qua UC-17** lúc 07:34:19, tài khoản đó đăng
nhập được lúc 07:34:59.

**Kiểm chứng khác trên production:** 8/8 tài nguyên PWA trả 200 · **kích thước icon đọc từ khối
`IHDR`** đúng 192/512/180 · manifest `display: standalone`, 4 icon, `theme_color` trắng · hai route
`/api/*` trả **401 JSON** không redirect (DEC-039 đứng vững ngoài production) · HTML `/login`
**không chứa** service role key (NFR-005) · logo SVG cam và dấu tiếng Việt hiện đúng.

**Files Changed:** `docs/12-known-issues.md` (ISSUE-019, ISSUE-020) · `PROJECT_CHECKLIST.md`
(tick 6 mục Phase 12) · `SESSION_CHECKPOINT.md` · `WORKLOG.md`. **Không có thay đổi code.**

**Tests:** xem `Completed`. Toàn bộ đo trên **production thật**, không phải local.

**Errors:**

1. **ISSUE-019 (P2) — function chạy sai vùng.** `x-vercel-id` = `hkg1::iad1::…`; định dạng là
   `<edge>::<function>::<id>` nên **function đang ở Washington DC** còn database ở Singapore.
   Đo được: request tĩnh và request API-không-chạm-DB đều ~**0,23 s**; `/login` (SSR + **đúng một**
   lần `getUser()`) là ~**0,46 s**. Hai dòng đó khác nhau **đúng một điều** — có gọi Supabase hay
   không — nên **~230 ms là chi phí của một lượt đi-về Mỹ↔Singapore**. `/admin` gọi 5 RPC nên chi
   phí nhân lên. Cách sửa: Settings → Functions → Region = `sin1` → **Redeploy**.
2. **Deployment Protection ban đầu bảo vệ CẢ Production.** Mọi đường dẫn — kể cả
   `/manifest.webmanifest` và `/icon.svg` — trả **302 sang `vercel.com/sso-api`**. Sales không có
   tài khoản Vercel thì không dùng được app, và "Thêm vào màn hình chính" cũng hỏng vì manifest bị
   chặn. Người dùng đã sửa. **Điều đáng ghi lại:** lỗi này *không* thể phát hiện bằng cách mở
   trình duyệt của chính chủ sở hữu Vercel — họ đã đăng nhập SSO nên thấy trang bình thường. Chỉ
   `curl` trần mới lộ ra.
3. **Smoke test đầu tiên đỏ vì tưởng là lỗi, hoá ra là đúng thiết kế.** Đăng nhập bằng mật khẩu tạm
   trong `.env.admin-bootstrap` nhận "Email hoặc mật khẩu không đúng". Trước khi kết luận là lỗi
   production, đã đo hai đầu: gọi thẳng GoTrue từ máy local **cũng** hỏng ⇒ không phải lỗi Vercel;
   rồi đọc `auth.users.updated_at` thì thấy người dùng **đã đổi mật khẩu lúc 07:33** đúng như hướng
   dẫn. **Bài học: khi một phép kiểm đỏ, đo tiếp một tầng nữa trước khi gọi tên nguyên nhân** —
   cùng bài học đã ghi ở Phase 6 mục "đo lại bằng công cụ không tự đi theo redirect".
4. **ISSUE-020 (P3) — `Minimum password length` trên cloud vẫn là 6.** Đo hai lần bằng hai đường
   độc lập. Người dùng **chấp nhận rủi ro** ngày 2026-08-10. Đã ghi rõ điều kiện phải làm ngay:
   nếu sau này mở bất kỳ đường đặt mật khẩu nào **không đi qua Zod** (forgot-password, magic link)
   thì cài đặt này trở thành lớp bảo vệ duy nhất.
5. **Hai user thử nghiệm đã được tạo và xoá trên production** trong lúc đo ISSUE-020, cộng một tài
   khoản ADMIN tạm cho smoke test. **Không tạo báo cáo nào** — BR-013 cấm xoá báo cáo nên một dòng
   dữ liệu thử sẽ nằm lại vĩnh viễn. Đã xác minh sau khi dọn: `daily_reports` vẫn **0 dòng**.

**Decisions:** None — không có quyết định kiến trúc mới.

**Remaining:**

- **ISSUE-019** — đổi Function Region sang `sin1` rồi **Redeploy**. Đây là việc còn lại **đáng giá
  nhất**, ảnh hưởng trực tiếp NFR-001.
- **Luồng Sales trên production** — tạo báo cáo sáng, hoàn tất cuối ngày, xuất ảnh. **Cố ý để người
  dùng tự làm bằng tài khoản Sales thật**, vì báo cáo thử không xoá được (BR-013).
- **ISSUE-003** — kiểm ảnh 9:16 trong Zalo trên điện thoại thật. Nay đã có link công khai.
- **Lighthouse mobile** (NFR-001) — **nên đo SAU khi sửa ISSUE-019**, đo trước thì con số phản ánh
  độ trễ xuyên Thái Bình Dương chứ không phản ánh chất lượng ứng dụng.
- **Xoá `.env.admin-bootstrap`** — mật khẩu trong đó đã hết hiệu lực từ 07:33.
- Toàn bộ **Phase 13**.

**Next:** Vercel → Settings → Functions → Region = `sin1` → Redeploy → xác minh
`x-vercel-id` phần giữa thành `sin1` và TTFB của `/login` tụt về ~0,24 s.
---

### Entry 015

**Date:** 2026-08-10

**Phase:** `PHASE 12` — sửa hiệu năng production + `PHASE 13` — nhận yêu cầu mới

**Completed:**

1. **ISSUE-019 — sửa vùng chạy bằng CODE, không cần bấm Dashboard.**
   `export const preferredRegion = 'sin1'` ở `app/layout.tsx` + **cả hai** route handler (route
   segment config **không lan** xuống Route Handler). Xác minh bằng
   `.next/server/functions-config-manifest.json`: **18/18 route** mang `["sin1"]` — đọc manifest chứ
   không tin giả định về việc cấu hình có lan hay không.
2. **Sửa một bài E2E có race + vá một lỗ XANH OAN.** Thêm `waitForContent()` vào `e2e/helpers.ts`
   (chờ `aria-busy="true"` biến mất) và gọi nó **bên trong** `expectNoBrokenNumbers()`.
3. **Ghi toàn bộ yêu cầu mới của người dùng vào `PROJECT_CHECKLIST.md § 13c`** kèm **mô tả nguyên văn
   4 ảnh chú thích tay** (không lưu được ảnh thành file — agent không có công cụ ghi ảnh từ hội thoại
   ra đĩa, nên mô tả chữ là bản ghi chính thức).
4. **Mở `OQ-19`** trong `docs/01` cho phần đổi nghĩa Doanh số/Doanh thu.

**Files Changed:** `app/layout.tsx` · `app/api/reports/[id]/share-image/route.tsx` ·
`app/api/admin/reports/export/route.ts` · `features/auth/queries.ts` (thêm rồi **gỡ** `cache()`, giữ
lại 30 dòng ghi chú) · `e2e/helpers.ts` · `e2e/security.spec.ts` · `docs/01` (OQ-19) ·
`docs/12` (ISSUE-019 → FIXING, ISSUE-021 MỚI) · `PROJECT_CHECKLIST.md` (§13c) · `WORKLOG.md`.

**Tests:** typecheck ✅ · lint ✅ · build ✅ · `npm test` ✅ **742/742** ·
`npm run e2e` ✅ **111/111 trong 4,1 phút** *(sau khi gỡ `cache()`)*.

**Errors:**

1. **`cache()` trên đường xác thực làm ĐĂNG NHẬP TREO — đã gỡ (ISSUE-021).**
   Bọc `getCurrentProfile` bằng `cache()` của React để gộp 4 lượt gọi mạng còn 2. E2E rớt
   **111 → 109 → 105**, luôn đỏ ở `signIn` hết giờ 20 giây. Ảnh chụp lúc đỏ cho thấy form kẹt ở
   **"Đang đăng nhập…"** với ô nhập **disabled** ⇒ Server Action **không trả về** — đây chính là chi
   tiết loại bỏ giả thuyết "rate limit GoTrue", vì rate limit trả lỗi ngay chứ không treo.
   Cơ chế: `signInAction` kết thúc bằng `redirect()` nên Next render trang đích **trong cùng request
   POST**; trang đích gọi `requireRole()` → hàm vừa bọc; `cache()` ghi nhớ **promise**, promise dính
   vào render pass bị huỷ thì không bao giờ settle. **Gỡ ra ⇒ 111/111 và nhanh hơn 1,1 phút so với
   TRƯỚC khi bọc** — bằng chứng phụ cho việc trước đó có bài đang chờ promise treo.

2. **Sai lầm về QUY TRÌNH, nghiêm trọng hơn lỗi kỹ thuật.** Lượt E2E đầu tiên sau khi bọc `cache()`
   báo `84 passed`. Tôi diễn giải thành *"27 bài kia là did-not-run, không phải regression"*, rồi
   chạy riêng một nhóm thấy xanh và **coi như đã loại trừ**. Kết luận đó **sai**, và chỉ lộ ra sau
   hai lượt chạy đầy đủ nữa. **Với lỗi không tất định, một lượt xanh không chứng minh được gì —
   phải so TỈ LỆ qua nhiều lượt.**

3. **`--repeat-each` KHÔNG dùng được cho `sales-flow.spec.ts`.** BR-001 chỉ cho một báo cáo mỗi ngày
   và BR-019 khoá vĩnh viễn, nên lượt lặp thứ 2–3 tất yếu đỏ **dù code hoàn toàn đúng**. Đã ghi ở
   `DO NOT REDO` từ Phase 11 nhưng vẫn suýt đọc nhầm kết quả. Lặp được với các spec **chỉ đọc**.

4. **Comment khối `/* */` chứa `**/` làm vỡ file.** Viết `app/api/**/route.ts` trong JSDoc thì cụm
   `*/` đóng comment sớm ⇒ 3 lỗi cú pháp TypeScript. Diễn đạt lại, đừng viết glob có `**/` trong
   comment khối.

**Decisions:** None — không có DEC mới. Việc gỡ `cache()` là đánh giá rủi ro tại chỗ, ghi đầy đủ ở
`ISSUE-021` và trong chính `features/auth/queries.ts`.

**Đính chính ngay trong phiên — `preferredRegion` KHÔNG ăn thua (đo sau khi deploy):**

Commit `9935dff` deploy **success** lên Production lúc 08:45. Đo lại: `x-vercel-id` vẫn
`hkg1::iad1::…` qua **6/6 lượt**, TTFB `/login` vẫn **~0,46 s — không đổi một chút nào**. Nghĩa là
khai `preferredRegion` trong code **không** đổi được vùng chạy, dù manifest build ghi đúng
`["sin1"]` cho 18/18 route và deploy hoàn toàn thành công.

Suy luận (**chưa xác minh trực tiếp**): Vercel chỉ áp dụng `preferredRegion` cho **Edge Runtime**;
mọi route của dự án chạy **Node runtime** nên vùng do **cài đặt Project** quyết định và cài đặt đó
thắng khai báo trong code. ⇒ **ISSUE-019 quay lại `OPEN`**, và cách sửa **chỉ có một**: Vercel →
Settings → Functions → Region = `sin1` → **Redeploy**. Ba dòng `preferredRegion` được giữ lại nhưng
chú thích tại chỗ đã ghi rõ là **không đủ**.

**Bài học thứ ba của phiên, cùng họ với hai bài trên:** *"build ghi đúng cấu hình"* và *"deploy
thành công"* **không chứng minh** cấu hình đó có hiệu lực. Chỉ phép đo trên chính production mới
chứng minh được — và may là đã đo trước khi đi báo là đã sửa xong.

**Remaining:**

- **ISSUE-019 vẫn OPEN** — người dùng phải đổi Region trên Vercel Dashboard rồi Redeploy.
- **OQ-19 đang chờ người dùng trả lời** — chặn migration `0008` và mọi thay đổi `lib/kpi.ts`.
- Toàn bộ Phase 13 (nay **16 mục**), ISSUE-003, Lighthouse, luồng Sales trên production.
- Xoá `.env.admin-bootstrap`.

**Next:** push → chờ Vercel deploy → chạy lại phép đo TTFB và so với mốc trước khi sửa
(tĩnh ~0,23 s · `/login` ~0,46 s). Kỳ vọng `/login` tụt về xấp xỉ 0,24 s.
---

### Entry 016

**Date:** 2026-08-10

**Phase:** `PHASE 13 — Nhận diện thương hiệu & soát UI/UX` (13b + toàn bộ 13c)

**Completed:**

1. **Gom câu hỏi chặn và hỏi MỘT LƯỢT đầu phiên** — OQ-19 (3 câu) + cách xử lý `visit_purpose`.
   Người dùng chọn nguyên vẹn cả bốn đề xuất mặc định. Nhờ vậy phần còn lại của phiên không phải
   dừng lại lần nào nữa.
2. **`0008_sales_amount_and_visit_floor.sql`** — migration thứ **8**, chạy thật trên local:
   - thêm cặp cột `target_sales_amount` / `actual_sales_amount` (`bigint` VND);
   - `alter column target_sales_quantity drop not null` → cột cũ thành **di sản**, dữ liệu ở lại;
   - 5 `comment on column` ghi rõ cột nào mang nghĩa cũ, từ mốc nào (BR-013);
   - `ck_target_visit_points` thành `between 10 and 1000` — **BR-026**;
   - dựng lại **4 hàm aggregate** theo cột mới.
3. **Ba DEC nghiệp vụ + hai DEC kỹ thuật:** DEC-048 (bỏ `visit_purpose` khỏi UI, giữ cột) ·
   DEC-049 (BR-026 sàn 10) · DEC-050 (doanh số → tiền, doanh thu → công nợ thu hồi) ·
   DEC-051 (Đăng xuất về header + phản hồi khi chạm) · DEC-052 (bảng trend đổi sang thẻ ở mobile).
4. **`KpiMetric.SALES_QUANTITY` → `SALES_AMOUNT`** trên **33 file**. Đơn vị `xe` **biến mất khỏi
   toàn dự án**. `lib/kpi.ts` có `isMoneyMetric()` viết dạng **type predicate** để nhánh `else` thu
   hẹp được kiểu — không cần một phép ép kiểu nào.
5. **Nhóm A + B của `§13c`** — xem `PROJECT_CHECKLIST.md`, đã tick đủ.
6. **Soát UI/UX bằng bộ đo Playwright dùng-một-lần** trên **20 URL × 2 bề rộng**, bốn nhóm luật
   CRITICAL/HIGH. **Tìm ra 1 lỗi thật** (tràn ngang 116px) và **0 vi phạm** ba nhóm còn lại.

**Files Changed:** `supabase/migrations/0008_*.sql` (**tạo mới**) · `supabase/seed.sql` ·
`types/database.types.ts` (generate lại) · `lib/{kpi,validation/report}.ts` ·
`lib/reports/{metric-rows,share-card}.ts` · `components/ui/link-spinner.tsx` (**tạo mới**) ·
`features/auth/header-sign-out.tsx` (**tạo mới**) · `features/report-morning/{actions,morning-report-form,commitment-summary}` ·
`features/report-evening/evening-report-form.tsx` · `features/report-comparison/report-notes.tsx` ·
`features/admin-analytics/daily-trend-chart.tsx` · `app/(sales)/layout.tsx` · `app/(admin)/layout.tsx` ·
`app/(sales)/sales/today/{page,morning/page}.tsx` · `app/(sales)/sales/reports/[id]/page.tsx` ·
`app/(admin)/admin/reports/[id]/page.tsx` · `tests/` (7 file) · `e2e/` (4 file) ·
`docs/01`, `docs/02`, `docs/11` (DEC-048…052), `docs/12` (ISSUE-022, ISSUE-023) ·
`PROJECT_CHECKLIST.md` · `WORKLOG.md` · `SESSION_CHECKPOINT.md` · `CLAUDE.md`.
**Đã xoá:** `e2e/zz-ui-audit.spec.ts` — công cụ dùng một lần, **không commit** (thông lệ Phase 2–6).

**Tests:** typecheck ✅ · lint ✅ 0 error 0 warning · build ✅ **18 route nghiệp vụ + 3 metadata** ·
`npm test` ✅ **745/745** (unit 555 · integration 57 · rls 133) · `npm run e2e` ✅ **111/111**.
Bộ soát giao diện: **~2.400 cặp màu** đo trên DOM đã render, **0 vi phạm**, tỉ lệ thấp nhất
**4,68:1**; **0** phần tử tương tác dưới 44px; `dynamic-type` ở **150%** không vỡ bố cục.

**Errors:**

1. **`0006`/`0007` phải `drop function` rồi `create`, KHÔNG `create or replace`.** Postgres từ chối
   đổi **tên cột** trong `returns table (...)` của một hàm đang tồn tại. `drop function` cuốn theo
   mọi `GRANT`, nên phải cấp lại đủ — thiếu bước đó thì `authenticated` mất quyền execute và toàn bộ
   khu vực Admin chết lặng lẽ.
2. **`gen types --local` đỏ vì mật khẩu của CLOUD lọt vào môi trường** → **ISSUE-022**. Và lần sửa
   đầu tiên còn gộp `stderr` vào `stdout`, ghi thẳng dòng `Connecting to db 5432` vào đầu
   `types/database.types.ts` — TypeScript báo hàng chục lỗi cú pháp ở dòng 1, trông hoàn toàn không
   liên quan tới nguyên nhân thật.
3. **Phép thay thế hàng loạt nuốt mất tên CŨ trong chính chú thích vừa viết.** Câu
   *"`SALES_AMOUNT` thay cho `SALES_QUANTITY`"* bị đổi thành *"`SALES_AMOUNT` thay cho
   `SALES_AMOUNT`"*. **Bài học: chú thích giải thích một lần đổi tên phải được viết SAU khi đổi tên
   xong**, hoặc diễn đạt không chứa chuỗi bị thay.
4. **Chuỗi tiền dùng NO-BREAK SPACE `U+00A0`.** Sửa assertion bằng space thường cho ra
   `expected '5 ₫' to be '5 ₫'` — hai chuỗi nhìn y hệt. `docs/08 §3.3` đã cảnh báo, vẫn dính.
5. **Lượt soát giao diện ĐẦU TIÊN báo "0 phát hiện" một cách SAI.** Hai nguyên nhân độc lập, cả hai
   đều là dạng **xanh oan**:
   - `<details>` đang **đóng** ⇒ bảng gây tràn không tham gia layout;
   - tài khoản dùng để soát đã `COMPLETED` ⇒ BR-019 **đá nó khỏi cả hai form nhập**, nên hai màn
     hình quan trọng nhất với Sales chưa hề được đo.
   Dấu hiệu làm lộ ra điều thứ hai: `/sales/today` và `/sales/today/morning` cho ra **cùng một con
   số đếm**. Từ đó thêm bộ đếm (`interactive=… contrastPairs=… minRatio=…`) vào mọi trang —
   **"0 phát hiện" chỉ có nghĩa khi biết mẫu số**.
6. **E2E đỏ 1 bài ở HAI lượt khác nhau, và là HAI bài khác nhau** — cả hai lượt đều khi máy đang
   chạy song song nhiều lượt Playwright (lượt đầu mất **2,8 giờ** thay vì 4 phút). Không kết luận
   vội, làm đủ ba bước:
   - chạy lại riêng từng bài → xanh (nhưng **chưa chứng minh được gì**);
   - `--repeat-each` trên spec **chỉ đọc** → **81/81** và **6/6**;
   - **một lượt `npm run e2e` đầy đủ, không tranh tài nguyên → 111/111 trong 4,0 phút.**

   Bài thứ hai đỏ với ảnh chụp *"Đang đăng nhập…" + ô nhập disabled* — đúng dấu vân tay của
   **ISSUE-021** (Server Action chưa trả về), tức chi phí xác thực đã biết thỉnh thoảng chạm trần
   chờ 20 giây. Ghi thành **ISSUE-023**, đồng thời **loại trừ** giả thuyết "nút Đăng xuất mới gây
   treo": lượt sạch **sau khi** thêm nút vẫn 111/111. Đúng bài học Entry 015 — *một lượt xanh không
   chứng minh được gì, phải so TỈ LỆ*.
7. **Sửa `services/reports.ts` SAU khi một lượt E2E đã bắt đầu** ⇒ lượt đó đang kiểm cây mã cũ.
   Phải chạy lại toàn bộ gate trên đúng cây mã sắp commit. **Đừng sửa code khi quality gate đang
   chạy** — kết quả trả về sẽ nói về một thứ khác với thứ mình đang định giao.

**Decisions:** DEC-048 · DEC-049 · DEC-050 · DEC-051 · DEC-052. **BR-026** là business rule **MỚI**
— dãy `BR` vốn ĐÓNG, mở thêm ID này là do người dùng yêu cầu trực tiếp (ảnh 2 của `§13c`).

**Remaining:**

- **Xác nhận Vercel đã build xong `356f9dd`** rồi mở lại `/admin` — bản deploy cũ đọc `admin_*` theo
  tên cột cũ nên sẽ hiện số sai cho tới khi bản mới lên. **Redeploy là đủ, không phải sửa gì.**
- **Xem tận mắt** ở 375px/1440px (đã đo đủ bằng máy, chưa nhìn bằng mắt người).
- "Thêm vào màn hình chính" trên máy thật · ISSUE-003 (Zalo) · Lighthouse · ISSUE-011 (rotate key).
- Xoá `.env.admin-bootstrap`.

**Next:** mở Vercel → xác nhận deployment `356f9dd` **Ready** → mở `/admin` kiểm 12 chỉ số không có
`NaN`, và báo cáo `2026-08-10` hiện `—` ở ô Doanh số (**đúng** OQ-19c, không phải lỗi).
---

### Entry 017

**Date:** 2026-08-10

**Phase:** `PHASE 12` — đẩy migration `0008` lên Supabase cloud

**Completed:**

1. **`npx supabase db push --linked --yes`** — cloud từ **7/8** lên **8/8**. Mật khẩu đọc từ
   `.env.local` và truyền qua biến môi trường nên **không cần TTY**. `"seeds":[]` xác nhận seed
   **không** bị đẩy, đúng thiết kế (DEC-022).
2. **Xác minh đủ 7 phép kiểm trên cloud** — bảng đầy đủ ở `SESSION_CHECKPOINT.md § Database State`.
   Ba phép quan trọng nhất:
   - **`has_function_privilege` cho cả 5 hàm `admin_*`**: `authenticated` = `t`, `anon` = `f` ⇒
     bước cấp lại GRANT sau `drop function` đã làm đúng. **Đây là rủi ro lớn nhất của `0008`** —
     quên nó thì RLS vẫn đúng nhưng toàn bộ khu vực Admin chết lặng lẽ.
   - **Gọi RPC bằng `anon` qua REST** → `42501 permission denied for function`.
   - **Dữ liệu production còn nguyên**: `target_sales_quantity = 50` và `visit_purpose` vẫn ở đó,
     `target_sales_amount` = `null` ⇒ đúng OQ-19c, **không mất một dòng nào** (BR-013).
3. **`gen types --linked` so với bản đã commit** — khác **đúng một khối metadata** ⇒ schema hai bên
   khớp. Không cần commit lại types.

**Files Changed:** `SESSION_CHECKPOINT.md` · `CLAUDE.md` · `WORKLOG.md`. **Không file mã nguồn nào.**

**Tests:** N/A — thao tác hạ tầng, không đổi mã nguồn. Bộ test của Entry 016 vẫn là bản có hiệu lực
(745/745 + 111/111). Thay vào đó là **7 phép kiểm chạy thật trên cloud**, liệt kê ở mục 2.

**Errors:**

1. **Không kết nối được cloud bằng host `db.<ref>.supabase.co`** — phải đi qua **pooler**
   (`aws-0-ap-southeast-1.pooler.supabase.com:5432`, user `postgres.<ref>`). Và mật khẩu phải được
   **URL-encode** trước khi ghép vào chuỗi kết nối, nếu không ký tự đặc biệt sẽ cắt chuỗi.
2. **Không xác minh được từ bên ngoài là Vercel đã deploy commit nào.** Header `x-vercel-id` chỉ cho
   biết vùng chạy (`sin1` — ISSUE-019 đã sửa), không cho biết phiên bản. Đây là lý do việc "xác nhận
   deployment" phải nằm ở phía người dùng chứ không thể tự khẳng định.

**Decisions:** None.

**Remaining:** xem `Remaining` của Entry 016 — mục "đẩy `0008`" nay đã xong.

**Next:** người dùng xác nhận Vercel build xong `356f9dd`, mở `/admin` kiểm 12 chỉ số.
---

### Entry 018

**Date:** 2026-08-10

**Phase:** `PHASE 13` — thiết kế lại giao diện (DEC-053)

**Completed:**

1. **Chụp toàn bộ 10 màn hình ở 375px rồi MỞ RA NHÌN** — bước mà Entry 016 đã bỏ qua. Kết luận
   thẳng: phẳng, không nhịp thị giác, cam thương hiệu gần như không xuất hiện.
2. **Tra hướng thiết kế từ skill thay vì tự nghĩ:** product type *CRM & Client Management* →
   **Flat + Minimalism** (nền, đã có) + **Soft UI Evolution + Micro-interactions** (lớp còn thiếu).
   Style đó ghi rõ *WCAG AA+, bo 8–12px, 200–300ms* ⇒ cộng thêm vào DEC-012/046, không thay thế.
3. **Ba nhóm token mới** — chiều sâu (bóng hai lớp + bóng thương hiệu), bo góc, chuyển động.
   **Không đụng một token màu nào.**
4. **Viết lại 6 primitive + thêm `ProgressBar`**, chỉnh header/bottom nav/login/ô chỉ số Admin.
5. **`e2e/ui-quality.spec.ts` — hàng rào tự động ĐƯỢC COMMIT**, chạy ở mobile-375 và desktop-1440.

**Files Changed:** `app/globals.css` · `components/ui/{card,button,input,textarea,badge,skeleton}.tsx` ·
`components/ui/progress-bar.tsx` (**tạo mới**) · `features/report-comparison/{achievement-table,achievement-badge}.tsx` ·
`features/admin-dashboard/overview-tiles.tsx` · `features/navigation/main-nav.tsx` ·
`features/report-share/share-image-button.tsx` · `app/(sales)/layout.tsx` · `app/(admin)/layout.tsx` ·
`app/(sales)/sales/today/page.tsx` · `app/(auth)/login/page.tsx` ·
`e2e/ui-quality.spec.ts` (**tạo mới**) · `docs/05 §14` · `docs/11` (DEC-053) ·
`PROJECT_CHECKLIST.md §13d` · `SESSION_CHECKPOINT.md` · `WORKLOG.md`.

**Tests:** typecheck ✅ · lint ✅ · build ✅ · `npm test` ✅ **745/745** ·
`e2e/ui-quality.spec.ts` ✅ **0 vi phạm** cả bốn nhóm luật sau khi đổi, ở cả `mobile-375` lẫn
`desktop-1440` · **`npm run e2e` đầy đủ ✅ 121 passed / 5 skipped / 0 failed, 4,4 phút** — chạy trên
môi trường đã dựng lại sau ISSUE-024, trên **đúng cây mã đã commit** (`b91ab6c`).

*(5 skipped = `ui-quality` ở `zalo-like`, cố ý bỏ vì trùng viewport với `mobile-375` — xem Errors 5.)*

**Errors:**

1. **LỖI QUY TRÌNH, nghiêm trọng hơn mọi lỗi kỹ thuật của phiên.** Entry 016 đo bốn nhóm luật, thấy
   "0 vi phạm", rồi **báo cáo như thể đã trả lời câu hỏi thẩm mỹ**. Người dùng phản hồi *"tôi chẳng
   thấy giao diện thay đổi gì hết, vẫn xấu i chang"* — và họ **đúng**.

   **"Không vi phạm" và "đẹp" là hai câu hỏi khác nhau.** Tương phản, cỡ chạm, tràn ngang, cỡ chữ —
   bốn thứ đó đo được bằng máy và đều đạt, trong khi giao diện vẫn thiếu **chiều sâu, nhịp thị giác
   và sự hiện diện của thương hiệu** — ba thứ không có luật nào bắt được.

   **Quy tắc rút ra, đã ghi vào `DO NOT REDO`:** muốn biết giao diện có đẹp không thì **phải chụp ảnh
   ra và nhìn**. Bộ đo là điều kiện CẦN, không bao giờ là điều kiện ĐỦ.
2. **`AA_NORMAL` khai rồi không dùng** — lint bắt được. Ngưỡng thật nằm ngay trong hàm đo (`isLarge ?
   3 : 4.5`); một hằng số thứ hai ở ngoài chỉ là chỗ để lệch nhau.
3. **Bài `ui-quality` mới XANH khi chạy riêng, ĐỎ ở cả 3 project khi chạy `npm run e2e` đầy đủ.**
   Nguyên nhân: nó dùng chung `flowSalesEmail` với `sales-flow.spec.ts`. Spec kia chạy trước, đưa tài
   khoản lên `COMPLETED`, rồi **BR-019 khoá vĩnh viễn** ⇒ `/sales/today/morning` bị đá về
   `/sales/today` và ô `planned_route` không bao giờ xuất hiện.

   Đây **đúng cái bẫy mà `DO NOT REDO` đã cảnh báo từ Phase 11** ("mỗi project một Sales riêng"),
   chỉ khác một bậc: bài học thật rộng hơn câu chữ cũ — **mỗi SPEC CÓ GHI báo cáo phải có Sales
   riêng, không chỉ mỗi project**. Đã thêm `uiSalesEmail(project)` và ghi lý do vào `accounts.ts`.

   Và nó tái khẳng định điều Entry 015 đã rút ra theo chiều ngược lại: **chạy riêng một bài rồi thấy
   xanh KHÔNG chứng minh được gì** — lần đó là để bác bỏ "đã xanh là hết lỗi", lần này là để bác bỏ
   "chạy riêng xanh nghĩa là bài test đúng".
4. **Bài Admin của `ui-quality` HẾT GIỜ ở 180 giây, chỉ ở `desktop-1440`.** Đọc ảnh chụp lúc đỏ thì
   thấy `/admin/account` render hoàn toàn bình thường ⇒ **không phải vi phạm giao diện, mà là phép đo
   tự nó quá nặng**: mỗi route quét toàn bộ cây DOM và gọi `getComputedStyle` cho từng phần tử, mà ở
   1440px thì DEC-019 render **cả hai** nhánh (thẻ + `<table>`) nên số phần tử gần gấp đôi bản mobile.
   Đã tách bài 8-route thành **hai bài 4–5 route** và nới lên 240 giây. Chia đôi còn giúp khoanh vùng
   nhanh hơn khi đỏ: biết ngay là nhóm "danh sách" hay nhóm "phân tích tháng".

   **Quy tắc rút ra:** đọc **ảnh chụp lúc đỏ** trước khi sửa code. Ở đây nó phân biệt được ngay
   "giao diện sai" với "test hết giờ" — hai nguyên nhân dẫn tới hai cách sửa hoàn toàn khác nhau.
5. **Bộ soát mới TUY XANH nhưng làm ĐỎ OAN hai bài KHÁC** (`sales-flow FR-023` và `security BR-003`,
   đều `desktop-1440`, đều mang dấu vân tay "Đang đăng nhập…" của ISSUE-021). Nguyên nhân là **tải
   máy**, không phải logic: bộ E2E vừa tăng từ 111 lên 123 bài, và 12 bài thêm vào đều nặng (quét cả
   cây DOM, `getComputedStyle` từng phần tử).

   Sửa **đúng hai nguyên nhân đo được**, không nới bừa:
   - **Bỏ `ui-quality` ở `zalo-like`.** Project đó có **đúng cùng viewport 375×812** với
     `mobile-375`, chỉ khác `userAgent`; mà bốn luật bài này đo đều là hàm của **bề rộng và CSS**,
     không hàm của UA. Chạy ở đó là đo lại y hệt — **không thêm một bit thông tin nào** mà tốn gấp
     rưỡi thời gian. Giá trị riêng của `zalo-like` (hành vi suy theo UA) vẫn được `security.spec.ts`
     và `sales-flow.spec.ts` phủ đủ.
   - **Nâng ngưỡng `signIn` từ 20 lên 45 giây.** 20 giây được chọn khi bộ E2E còn 99 bài. Chi phí
     thật của đường đăng nhập đã đo và ghi ở **ISSUE-021** (bốn lượt đi-về tuần tự). Nâng ngưỡng là
     làm phép đo khớp với chi phí đã biết; nó **không** che được lỗi thật, vì một Server Action treo
     hẳn thì vẫn không bao giờ trả về. Đã ghi ngay trong `helpers.ts`: **lần sau đừng nâng tiếp —
     hãy sửa ISSUE-021.**

6. **Lượt E2E xác nhận cuối đỏ 34 BÀI — và nguyên nhân là DOCKER DESKTOP CHẾT, không phải code
   (ISSUE-024).** Mọi lệnh gọi Docker Engine API trả **500**, trong khi cổng `54321`/`54322` **vẫn
   mở** nên nhìn qua tưởng Supabase còn sống.

   Bốn dấu hiệu đều dẫn tới kết luận sai nếu đọc vội, và cả bốn đều có lời giải thích khác:
   34 bài đỏ *(nhưng cùng cây mã đó vừa cho `ui-quality` 10/10 và `npm test` 745/745)* · toàn bộ nằm
   ở `zalo-like` *(project chạy **cuối cùng** — stack chết giữa chừng)* · toàn bộ là `signIn` hết giờ
   *(hệ quả, không có GoTrue thì đăng nhập không bao giờ xong)*.

   **Quy tắc rút ra, đã ghi vào `DO NOT REDO`: hàng chục bài E2E đỏ cùng lúc thì chạy
   `docker version` TRƯỚC KHI ĐỌC DIFF.** Năm giây đó phân biệt "môi trường hỏng" với "hồi quy" —
   hai thứ dẫn tới hai việc hoàn toàn khác nhau. Đã DỪNG lượt chạy thay vì để nó đo tiếp trên môi
   trường hỏng, vì mỗi bài đỏ nay tốn 45 giây và kết quả không có giá trị nào.

7. **`git push` từ agent đỏ ở cuối phiên** — `could not read Username for 'https://github.com'`.
   Credential cache của Git Credential Manager đã hết hạn, và máy không có `gh` CLI để đi đường
   khác. **Hai lần push trước trong cùng phiên chạy được là nhờ cache còn hiệu lực** — nghĩa là
   niềm tin "agent push được" đúng *có điều kiện*, không phải luôn đúng. Người dùng tự chạy
   `git push origin main` và thành công.

**Decisions:** **DEC-053** — Soft UI Evolution: thêm chiều sâu/bo góc/chuyển động, **giữ nguyên
DEC-046**.

**Remaining:** xem `Remaining` của Entry 016; thêm: nhìn lại ở **1440px** bằng mắt người (đã đo máy).

**Next:** chạy `npm run e2e` đầy đủ rồi commit.
---

## Quy ước ghi worklog

Mọi session sau **append** một entry mới xuống cuối mục `## Nhật ký`, đánh số tăng dần
(`### Entry 002`, `### Entry 003`, …). **Không sửa và không xoá entry cũ** — worklog là bản ghi
lịch sử, sai thì thêm entry đính chính chứ không viết đè.

1. **Đúng 9 trường, đúng thứ tự, không thiếu trường nào:**
   `Date` → `Phase` → `Completed` → `Files Changed` → `Tests` → `Errors` → `Decisions` →
   `Remaining` → `Next`. Trường không có nội dung thì ghi `None` hoặc `N/A — <lý do>`, không bỏ trống.
2. **`Date`** dạng `YYYY-MM-DD`. **`Phase`** ghi đúng tên phase trong Master Spec §41
   (ví dụ `PHASE 3 — Morning Report`).
3. **`Completed`** chỉ ghi việc **đã làm xong và kiểm chứng được**. Việc đang dở ghi ở `Remaining`.
   Không ghi kế hoạch vào `Completed`.
4. **`Files Changed`** liệt kê đường dẫn tương đối so với project root, kèm nhãn
   *tạo mới / sửa / xoá*. Nếu quá 20 file thì gom theo thư mục nhưng phải nêu rõ số lượng.
5. **`Tests`** ghi **kết quả thật của lệnh đã chạy** (ví dụ `vitest run — 42 passed, 0 failed`).
   Nếu chưa chạy thì ghi `N/A — <lý do>`. **Tuyệt đối không ghi PASS cho thứ chưa chạy** — đây là
   quy tắc cứng của Master Spec §42 và của bộ tài liệu này.
6. **`Errors`** ghi lỗi gặp phải **và** cách xử lý; đã xử lý xong vẫn phải ghi lại. Không có thì ghi
   `None`.
7. **`Decisions`** chỉ ghi **ID** `DEC-xxx` kèm một dòng tóm tắt; nội dung đầy đủ luôn nằm ở
   `docs/11-decisions.md`. Không tạo ID mới ở đây mà không tạo tương ứng trong decision log.
8. **`Remaining`** là việc còn nợ của chính phase hiện tại. **`Next`** là bước kế tiếp cụ thể,
   đủ để một session hoàn toàn mới hành động ngay.
9. Sau khi append entry, **cập nhật đồng bộ 3 file còn lại**: `SESSION_CHECKPOINT.md`,
   `PROJECT_CHECKLIST.md`, và mục `## Current Phase` / `## Overall Progress` ở đầu file này.
10. Chỉ tick `[x]` một phase trong `## Overall Progress` khi phase đó qua đủ quality gate Master
    Spec §42: code xong **và** build pass **và** typecheck pass **và** lint pass **và** test liên
    quan pass.
11. Ngôn ngữ: **tiếng Việt** cho nội dung, **tiếng Anh** cho tên file, tên bảng, tên cột, tên hàm,
    lệnh CLI và mã nguồn.
12. Không ghi secret thật vào worklog — chỉ tên biến môi trường và placeholder.

---

## OPEN QUESTIONS — ✅ ĐÃ ĐÓNG TOÀN BỘ (2026-08-07)

**Không còn câu nào chờ trả lời.** Người dùng đã trả lời đủ **17/17** — xem Entry 002 ở trên.
Câu trả lời chính thức đầy đủ: `docs/01-business-analysis.md § OPEN QUESTIONS`.

| ID | Câu trả lời chính thức |
|---|---|
| OQ-01 / OQ-02 | **Cả hai** — cột số bắt buộc + cột text tuỳ chọn |
| OQ-03 | Doanh số = số lượng xe (integer); Doanh thu = tiền VND (bigint) |
| OQ-04 | **Không** sửa sau khi `COMPLETED` — khoá vĩnh viễn |
| OQ-05 | Admin **không** sửa báo cáo của Sales |
| OQ-06 | Admin tạo tài khoản; Sales không tự đăng ký |
| OQ-07 | Tuyến nhập tự do |
| OQ-08 | **Không** có ngày nghỉ ở v1; không xử lý gì thêm |
| OQ-09 | **Sales tự cam kết** buổi sáng |
| OQ-10 | **Không** SKU / đại lý / đơn hàng |
| OQ-11 | `actual=0` → `100,0%`; `actual>0` → **số vượt tuyệt đối** (`+3 xe`, `+3.000.000 ₫`), `percent = null`, loại khỏi mẫu số khi tổng hợp |
| OQ-12 | Chỉ đúng ngày hôm nay giờ VN; không nhập bù |
| OQ-13 | **Không** xoá, kể cả soft delete |
| OQ-14 | Doanh thu = giá trị đơn hàng chốt trong ngày |
| OQ-15 | Chưa chia team/vùng |
| OQ-16 | Chỉ 2 role |
| OQ-17 | Ngày đạt KPI = cả 4 chỉ tiêu ≥ 100% |

Quy tắc còn hiệu lực: `## Overall Progress` chỉ được tick thêm một phase khi phase đó qua đủ
quality gate của Master Spec §42 — **không phải** khi "đã viết xong code".
