# BikeForce Worklog

> Status: ACTIVE | Phase: 2 (còn 1 mục chờ người dùng) | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

File này ghi lại **thực tế đã làm** trong từng phiên làm việc. Không ghi kế hoạch, không ghi
dự định, không ghi trạng thái test/build chưa từng chạy. Format bắt buộc theo Master Spec §57.

---

## Current Phase

**PHASE 2 — Database & Auth: 13/14 mục xong (2026-08-07).**

Schema đã chạy thật trên Supabase local (Postgres 17.6.1.156), tầng auth đầy đủ và đã kiểm chứng
trên trình duyệt. Kết quả thật: `build` / `typecheck` / `lint` đều exit 0 · `npm test` **80/80 PASS**
(14 unit + 40 integration + 26 RLS) · kiểm chứng luồng auth **32/32 PASS** · tài khoản inactive
**6/6 PASS**.

**Mục duy nhất còn lại: người dùng tự tạo Supabase project trên cloud** (region Singapore) —
hướng dẫn từng cú bấm ở `docs/09-deployment.md §3.0`. Sau đó: `supabase link` → `db push` →
`gen types --linked`.

*(Lịch sử: Phase 0 từng bị chặn bởi 9 OPEN QUESTION mức BLOCKING — ISSUE-001; đã gỡ ở Entry 002.)*

---

## Overall Progress

- [x] Phase 0 — Discovery & Business Analysis
- [x] Phase 1 — Foundation
- [ ] Phase 2 — Database & Auth
- [ ] Phase 3 — Morning Report
- [ ] Phase 4 — Evening Report
- [ ] Phase 5 — KPI Engine
- [ ] Phase 6 — 9:16 Image Export
- [ ] Phase 7 — Sales History
- [ ] Phase 8 — Admin Dashboard
- [ ] Phase 9 — Admin Reports & Filters
- [ ] Phase 10 — Sales Management
- [ ] Phase 11 — Testing & Security
- [ ] Phase 12 — Deployment Preparation

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
