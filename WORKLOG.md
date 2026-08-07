# BikeForce Worklog

> Status: ACTIVE | Phase: 0 | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

File này ghi lại **thực tế đã làm** trong từng phiên làm việc. Không ghi kế hoạch, không ghi
dự định, không ghi trạng thái test/build chưa từng chạy. Format bắt buộc theo Master Spec §57.

---

## Current Phase

**PHASE 0 — Discovery & Business Analysis**

Trạng thái: bộ deliverable tài liệu đã hoàn tất; **chưa được đóng phase** vì còn 9 OPEN QUESTION
mức BLOCKING chưa có câu trả lời của người dùng (ISSUE-001). Không được bắt đầu viết migration
Phase 2 trước khi các câu này được chốt.

---

## Overall Progress

- [x] Phase 0 — Discovery & Business Analysis
- [ ] Phase 1 — Foundation
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

**Decisions:** ghi **DEC-001..DEC-030** vào `docs/11-decisions.md` (26 APPROVED + 4 PROPOSED).
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

## OPEN QUESTIONS

Các OQ ảnh hưởng trực tiếp tới nội dung và tiến độ ghi trong file này (danh sách đầy đủ:
`docs/01-business-analysis.md § OPEN QUESTIONS`):

| ID | Câu hỏi rút gọn | Đề xuất mặc định |
|---|---|---|
| OQ-01 | "Mục tiêu viếng thăm" = số điểm hay mục đích chuyến đi? | Cả hai: `target_visit_points` + `visit_purpose` |
| OQ-02 | "Đã viếng thăm" = con số hay tuyến thực tế? | Cả hai: `actual_visit_points` + `actual_route` |
| OQ-03 | Doanh số = số lượng xe, Doanh thu = tiền VND? | Đúng như hiểu hiện tại |
| OQ-04 | Sửa được sau khi `COMPLETED` không? | Khoá ngay khi `COMPLETED` |
| OQ-05 | Admin sửa báo cáo của Sales? | Không trong v1 |
| OQ-08 | Có ngày nghỉ / không đi thị trường? | v1 không có |
| OQ-09 | Sales tự cam kết hay Admin giao KPI? | Sales tự cam kết |
| OQ-11 | `target = 0` thì % hiển thị ra sao? | `actual=0` → 100%; `actual>0` → `—` |
| OQ-12 | Nhập trễ / nhập bù / cut-off? | Chỉ đúng ngày hôm nay theo giờ VN |
| OQ-13 | Xoá báo cáo? | v1 không xoá |

Chừng nào 9 câu BLOCKING chưa được trả lời, mục `## Overall Progress` **không được** tick thêm
phase nào và **không được** viết migration của Phase 2.
