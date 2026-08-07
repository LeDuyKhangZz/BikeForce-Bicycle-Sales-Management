# CLAUDE.md — Hướng dẫn bắt buộc cho mọi Claude Code session (BikeForce)
> Status: ACTIVE | Phase: 0 | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

> **Đọc file này TRƯỚC, rồi đọc `SESSION_CHECKPOINT.md`.** Hai file đó đủ để bắt đầu làm việc.
> Chỉ đọc thêm khi task yêu cầu. Không scan lại toàn repo nếu checkpoint đã đủ context (Master Spec §64).

---

## 1. BIKEFORCE LÀ GÌ (5 dòng)

1. BikeForce là ứng dụng **nội bộ** cho đội Sales xe đạp: cam kết KPI đầu ngày, nhập thực đạt cuối ngày, hệ thống tự đối chiếu thành **một báo cáo ngày duy nhất**.
2. Sau khi báo cáo lưu thành công lên Supabase, Sales xuất **ảnh PNG 9:16 (1080×1920)** để gửi Zalo — không lưu ảnh lên storage.
3. Admin theo dõi toàn đội theo ngày/tháng, biết ai đã/chưa báo cáo, và quản lý tài khoản Sales.
4. Chỉ **2 role**: `ADMIN`, `SALES`. Không self-registration. Sales dùng điện thoại ngoài thị trường → **mobile-first tuyệt đối**.
5. Phạm vi v1 **chỉ là Daily Sales Performance Reporting** — không CRM, không kho, không POS, không đơn hàng, không danh mục sản phẩm.

---

## 2. TRẠNG THÁI HIỆN TẠI (đọc kỹ trước khi gõ bất kỳ dòng code nào)

| Hạng mục | Trạng thái |
|---|---|
| Phase | **PHASE 0 — Discovery & Business Analysis: deliverable đã hoàn tất** |
| Source code | **CHƯA CÓ.** Không `package.json`, không `node_modules`, không migration, không component |
| Git | **Đã là git repository** — nhánh `main`, remote `origin` trỏ tới GitHub `LeDuyKhangZz/BikeForce-Bicycle-Sales-Management` (DEC-028). Người dùng đã cấp **quyền push đứng**: push sau mỗi lần code xong, không cần hỏi lại |
| Supabase | **CHƯA có project.** Schema mới ở mức **đề xuất** trong `docs/02-database-design.md` |
| Build / Typecheck / Lint / Unit / Integration / E2E | **N/A — chưa có code.** Không được ghi PASS ở bất kỳ đâu |
| Chặn tiến độ | **ISSUE-001 (P1): 9 OPEN QUESTION mức BLOCKING chưa có câu trả lời** → không thể viết migration Phase 2 |

**Hệ quả trực tiếp:** không được bắt đầu Phase 2 (migrations/RLS) khi 9 câu BLOCKING chưa được người dùng trả lời. Phase 1 (Foundation) có thể chạy song song vì không phụ thuộc schema.

---

## 3. GIAO THỨC BẮT BUỘC — 12 ĐIỀU (Master Spec §60)

Mọi session phải làm **theo đúng thứ tự này**:

1. **Đọc `BIKEFORCE_MASTER_SPEC.md`** — source of truth cấp cao nhất về nghiệp vụ và phạm vi.
2. **Đọc `SESSION_CHECKPOINT.md`** — biết đang ở đâu, `Next Exact Steps`, và mục `DO NOT REDO`.
3. **Đọc `WORKLOG.md`** — biết session trước đã làm gì, quyết định gì, còn nợ gì.
4. **Đọc `PROJECT_CHECKLIST.md`** — biết hạng mục nào đã `[x]`, hạng mục nào còn `[ ]`.
5. **Đọc các file `docs/` liên quan tới task đang làm** — dùng bảng ở §7 để chọn đúng file, không đọc cả 12 file.
6. **KHÔNG tự đổi business rule đã APPROVED.** Mọi `BR-xxx` mang `Status: APPROVED` là bất khả xâm phạm nếu không có xác nhận mới của người dùng. Muốn đổi → hỏi người dùng → ghi `docs/11-decisions.md` → rồi mới sửa code.
7. **KHÔNG rewrite architecture khi không có lý do rõ ràng.** Kiến trúc đã chốt: Server Components đọc, Server Actions ghi, không REST API riêng cho CRUD báo cáo (DEC-003). Muốn đổi phải viết một `DEC-xxx` mới nêu lý do, phương án thay thế và impact.
8. **KHÔNG bỏ, tắt, hoặc làm yếu RLS.** RLS là **biên giới bảo mật thật sự** (DEC-004); middleware và layout chỉ là defense-in-depth. Không bao giờ `disable row level security` để cho một query chạy được.
9. **Mobile-first, luôn luôn.** Thiết kế từ 375px lên. Không làm desktop dashboard rồi thu nhỏ. Touch target ≥ 44px, input ≥ 48px, không cuộn ngang.
10. **KHÔNG expose secret.** `SUPABASE_SERVICE_ROLE_KEY` chỉ ở server env, tuyệt đối không có prefix `NEXT_PUBLIC_`. Không commit `.env*`. Không viết secret thật vào docs — chỉ placeholder.
11. **Test sau mỗi thay đổi quan trọng.** Build → typecheck → lint → test liên quan. Không để lỗi tích tụ đến cuối phase (Master Spec §42).
12. **Update docs + `PROJECT_CHECKLIST.md` + `WORKLOG.md` + `SESSION_CHECKPOINT.md`.** Task chưa cập nhật 4 nhóm này thì **chưa DONE**.

---

## 4. SESSION START PROTOCOL (Master Spec §64)

Đọc theo đúng thứ tự, dừng lại khi đã đủ context:

```
1. CLAUDE.md                  ← file này
2. BIKEFORCE_MASTER_SPEC.md
3. SESSION_CHECKPOINT.md      ← quan trọng nhất để nối tiếp công việc
4. WORKLOG.md
5. PROJECT_CHECKLIST.md
6. docs/ liên quan task        ← theo bảng §7
7. Source code liên quan       ← hiện chưa có
```

- Không scan lại toàn repo nếu checkpoint đã đủ context.
- **Nhưng nếu phát hiện checkpoint/docs không khớp source code → phải dừng, kiểm tra, đồng bộ**, và ghi lại lý do vào `WORKLOG.md`. Không âm thầm chọn một bên.

---

## 5. TECH STACK

Stack đã chốt (DEC-001): **Next.js App Router + TypeScript strict + Tailwind CSS v4 + Supabase (Postgres / Auth / RLS), deploy Vercel Free.**

Phiên bản dưới đây là **latest stable đã verify trên npm ngày 2026-08-07**. Đây **chưa phải bản pin cuối cùng** — Phase 1 chạy compatibility smoke test rồi mới pin chính xác, và ghi kết quả vào `docs/11-decisions.md` như phần follow-up của DEC-002.

| Package | Version (verified latest stable 2026-08-07) |
|---|---|
| `next` | 16.3.0 |
| `react` | 19.2.8 |
| `typescript` | 7.0.2 |
| `tailwindcss` | 4.3.3 |
| `@supabase/supabase-js` | 2.112.2 |
| `@supabase/ssr` | 0.12.4 |
| `zod` | 4.4.3 |
| `@playwright/test` | 1.62.1 |
| `vitest` | 4.1.10 |
| `eslint` | 10.8.0 |
| `lucide-react` | 1.29.0 |
| `html-to-image` | 1.11.13 *(fallback only — xem DEC-010)* |

**Cảnh báo tương thích (ISSUE-004, P2):** TypeScript 7 và ESLint 10 là bước nhảy major. Phase 1 **phải** verify `tsc` và `next lint` chạy được với Next 16; nếu vỡ thì lùi về TypeScript 5.x LTS và ghi lại quyết định. Không im lặng downgrade.

**Toolchain máy hiện tại:** Node v22.20.0 · npm 10.9.3 · git 2.48.1 · Python 3.13.2 · Windows 11 / PowerShell.

**Những thứ KHÔNG dùng:** microservices, queue, event bus, Kubernetes, GSAP (DEC-015), Supabase Storage cho ảnh báo cáo (DEC-021), thư viện timezone ngoài (DEC-009), service worker / offline sync (DEC-024).

---

## 6. CẤU TRÚC THƯ MỤC (DEC-023)

```text
BikeForce/
├── app/                          # route, layout, page — KHÔNG chứa business logic
│   ├── (auth)/login/             # /login  (DEC-017: không dùng /auth/login)
│   ├── (sales)/sales/            # /sales/today, /today/morning, /today/evening,
│   │                             # /sales/history, /sales/reports/[id], /sales/account
│   ├── (admin)/admin/            # /admin, /admin/reports, /admin/reports/[id],
│   │                             # /admin/analytics, /admin/sales, /admin/sales/new,
│   │                             # /admin/sales/[id], /admin/account
│   └── api/reports/[id]/share-image/   # Route Handler trả PNG 1080×1920
├── components/ui/                # primitive không biết nghiệp vụ: Button, Input, Card, Badge…
├── features/                     # component + action + query của MỘT nghiệp vụ
│   ├── morning-report/
│   ├── evening-report/
│   ├── report-share/             # DailyReportShareCard.tsx
│   ├── sales-history/
│   └── admin-*/
├── lib/                          # kpi, currency, date, validation (Zod), supabase clients, auth helpers
│   ├── kpi.ts  currency.ts  date.ts
│   ├── validation/
│   └── supabase/  client.ts  server.ts  admin.ts
├── services/                     # data access thuần: nhận supabase client, trả typed data
├── types/                        # database.types.ts (generate từ Supabase CLI) + domain types
├── supabase/
│   ├── migrations/               # 0001_init_enums_profiles.sql … 0005_indexes.sql
│   └── seed.sql                  # LOCAL ONLY, không seed production
├── docs/                         # 12 tài liệu điều khiển
├── middleware.ts                 # refresh session cookie + route/role guard
├── CLAUDE.md  AGENTS.md
├── WORKLOG.md  SESSION_CHECKPOINT.md  PROJECT_CHECKLIST.md
└── BIKEFORCE_MASTER_SPEC.md
```

**Hai luật cứng về layering (chi tiết trong `AGENTS.md`):**
- Business logic (KPI, validation) **không bao giờ** viết trong component.
- Data access **không bao giờ** viết trong component.

---

## 7. BẢN ĐỒ TÀI LIỆU ĐIỀU KHIỂN — ĐỌC KHI NÀO, CẬP NHẬT KHI NÀO

### 7a. File nào chứa gì

| File | Nội dung | Đọc khi |
|---|---|---|
| `BIKEFORCE_MASTER_SPEC.md` | Yêu cầu gốc của người dùng, phạm vi, phase, quality gate | Luôn luôn, ở bước 1 |
| `CLAUDE.md` | File này — giao thức làm việc, stack, cấu trúc, DoD | Luôn luôn, đầu tiên |
| `AGENTS.md` | Engineering rules: layering, TypeScript, naming, RLS, security, UI, testing, Git | Trước khi viết bất kỳ dòng code nào |
| `SESSION_CHECKPOINT.md` | Đang ở đâu, `Next Exact Steps`, `DO NOT REDO` | Luôn luôn, ở bước 2 |
| `WORKLOG.md` | Nhật ký từng phiên làm việc | Luôn luôn, ở bước 3 |
| `PROJECT_CHECKLIST.md` | Checklist tổng thể theo phase | Luôn luôn, ở bước 4 |
| `docs/01-business-analysis.md` | Mục tiêu, scope, actors, UC-xx, FR-xxx, NFR-xxx, BR-xxx, **danh sách OQ-xx đầy đủ** | Task chạm nghiệp vụ |
| `docs/02-database-design.md` | ERD, bảng, cột, kiểu, index, enum, trigger, RLS policy, persisted vs derived | Task chạm DB/migration |
| `docs/03-workflow.md` | Workflow end-to-end + failure flow | Task chạm luồng người dùng |
| `docs/04-system-architecture.md` | Sơ đồ kiến trúc, client/server boundary, 3 Supabase client, secret handling | Task chạm kiến trúc |
| `docs/05-ui-ux-design.md` | Design system, typography, spacing, color token đã đo contrast, form, responsive, page inventory | Task chạm UI |
| `docs/06-auth-permissions.md` | Permission matrix, auth flow, route protection, RLS, inactive account | Task chạm quyền |
| `docs/07-api-data-flow.md` | Server Actions / Route Handlers: input, validation, permission, query, output, errors | Task chạm data flow |
| `docs/08-testing-strategy.md` | Unit / integration / RLS / E2E / a11y, checklist test | Trước khi viết test |
| `docs/09-deployment.md` | Supabase setup, migrations, env vars, Vercel | Task chạm deploy |
| `docs/10-future-roadmap.md` | Tính năng ngoài MVP. **Không tự triển khai roadmap** | Khi có ý tưởng mới |
| `docs/11-decisions.md` | `DEC-xxx` — decision log | Trước khi đổi bất kỳ quyết định nào |
| `docs/12-known-issues.md` | `ISSUE-xxx` — rủi ro và bug. **Không xoá issue sau khi fix**, chỉ đổi Status | Khi gặp/khắc phục lỗi |

### 7b. DOCUMENTATION UPDATE MATRIX (Master Spec §62 — tái hiện nguyên văn)

| Nếu thay đổi… | Bắt buộc cập nhật |
|---|---|
| Business rule | `docs/01-business-analysis.md` **và** `docs/11-decisions.md` |
| Database | `docs/02-database-design.md` |
| Workflow | `docs/03-workflow.md` |
| Architecture | `docs/04-system-architecture.md` |
| UI structure | `docs/05-ui-ux-design.md` |
| Permission | `docs/06-auth-permissions.md` |
| API / data flow | `docs/07-api-data-flow.md` |
| Testing | `docs/08-testing-strategy.md` |
| Deployment | `docs/09-deployment.md` |
| Bug mới | `docs/12-known-issues.md` |
| **Hoàn thành task** | `WORKLOG.md` **và** `PROJECT_CHECKLIST.md` **và** `SESSION_CHECKPOINT.md` |

---

## 8. DEFINITION OF DONE (Master Spec §63 — đủ 11 mục, không được rút gọn)

Một task **không** DONE chỉ vì đã viết code. DONE khi:

1. Code hoàn tất.
2. Typecheck pass.
3. Build pass.
4. Lint pass.
5. Relevant tests pass.
6. UI mobile đã kiểm tra — nếu task liên quan UI.
7. Security/RLS test đã chạy — nếu task liên quan dữ liệu.
8. Docs liên quan đã cập nhật (theo ma trận §7b).
9. `PROJECT_CHECKLIST.md` đã cập nhật.
10. `WORKLOG.md` đã cập nhật.
11. `SESSION_CHECKPOINT.md` đã cập nhật.

> Chỉ tick `[x]` trong `PROJECT_CHECKLIST.md` khi **code xong VÀ build pass VÀ typecheck pass VÀ lint pass VÀ test liên quan pass**.
> Ở thời điểm hiện tại chưa có code, nên **không mục nào ngoài Phase 0 được tick**, và mọi trạng thái test đều ghi `N/A`.

---

## 9. SOURCE OF TRUTH PRIORITY (Master Spec §66)

Khi hai nguồn mâu thuẫn, ưu tiên theo thứ tự:

```
1. Business decision người dùng vừa xác nhận
2. docs/11-decisions.md
3. docs/01-business-analysis.md
4. docs/02-database-design.md
5. docs/03-workflow.md
6. docs/04-system-architecture.md
7. Source code hiện tại
```

Nếu docs và code mâu thuẫn: **không âm thầm chọn một bên** → xác định nguyên nhân → sửa cho đồng bộ → ghi `DEC-xxx` và/hoặc `WORKLOG.md`.

---

## 10. SESSION END PROTOCOL (Master Spec §65)

Trước khi kết thúc milestone/session, chạy đủ 8 bước:

1. Run build.
2. Run typecheck.
3. Run lint.
4. Run relevant tests.
5. Update docs nếu có thay đổi.
6. Update `PROJECT_CHECKLIST.md`.
7. Update `WORKLOG.md`.
8. Update `SESSION_CHECKPOINT.md`.

`Next Exact Steps` trong checkpoint phải **cụ thể tới mức session sau gõ được ngay** — ví dụ tên lệnh, tên file, tên hàm; không viết "tiếp tục làm Admin".

> **Lưu ý cho giai đoạn hiện tại:** bước 1–4 chưa chạy được vì chưa có code. Ghi đúng `N/A — chưa có code`. **Tuyệt đối không ghi PASS.**

---

## 11. ĐIỀU TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM

- ❌ **Không** tự đổi `BR-xxx` đang `APPROVED`, hoặc tự trả lời một `OQ-xx` thay người dùng.
- ❌ **Không** tắt / bỏ / nới lỏng RLS, kể cả tạm thời để debug.
- ❌ **Không** dùng service-role client để đọc/ghi `daily_reports` — chỉ cho `auth.admin.*` (DEC-005).
- ❌ **Không** đặt secret sau prefix `NEXT_PUBLIC_`. Không commit `.env.local`. Không viết secret thật vào docs.
- ❌ **Không** ghi build/typecheck/lint/test là PASS khi chưa thực sự chạy và thấy kết quả.
- ❌ **Không** persist `%` achievement vào DB — luôn tính runtime trong `lib/kpi` (BR-011, DEC-007).
- ❌ **Không** duplicate công thức KPI / format tiền / tính ngày ra ngoài `lib/`.
- ❌ **Không** lưu tiền dưới dạng chuỗi đã format — `bigint` VND (BR-010, DEC-008).
- ❌ **Không** dùng `new Date()` trực tiếp để suy ra ngày nghiệp vụ — phải qua `getVietnamToday()` (BR-005).
- ❌ **Không** enable nút "Xuất ảnh" dựa trên trạng thái form; chỉ dựa trên báo cáo đã persist với `status = 'COMPLETED'` (BR-002).
- ❌ **Không** viết migration Phase 2 khi 9 câu OQ BLOCKING chưa được trả lời (ISSUE-001).
- ❌ **Không** tự thêm feature ngoài MVP (CRM, kho, POS, SKU, GPS, đơn hàng) để dự án "to hơn".
- ❌ **Không** tự triển khai mục trong `docs/10-future-roadmap.md`.
- ❌ **Không** rewrite lại bộ tài liệu Phase 0 từ đầu — chỉ cập nhật (xem `DO NOT REDO` trong checkpoint).
- ❌ **Không** dùng `<table>` cuộn ngang trên mobile, không dùng emoji làm icon, không thêm animation ngoài transform/opacity 150–300ms.

---

## 12. THAM CHIẾU NHANH

**Hệ thống ID dùng thống nhất toàn dự án — không đánh số lại, không tự tạo ID mới:**
`UC-01..UC-21` (use case) · `FR-001..FR-037` (functional) · `NFR-001..NFR-015` (non-functional) · `BR-001..BR-025` (business rule) · `OQ-01..OQ-17` (open question) · `DEC-001..DEC-030` (decision) · `ISSUE-001..ISSUE-007` (issue) · `AF-01..AF-15` (admin feature proposal).

**Business rule hay bị vi phạm nhất — thuộc lòng:**

| ID | Rule |
|---|---|
| BR-001 | Mỗi Sales tối đa **một** báo cáo cho một ngày nghiệp vụ — `UNIQUE(sales_id, report_date)` |
| BR-002 | Chỉ xuất ảnh **sau khi** báo cáo persist thành công và `status = 'COMPLETED'` |
| BR-003 | Sales không đọc được báo cáo của Sales khác |
| BR-004 | Achievement được phép **> 100%**, không clamp |
| BR-005 | `report_date` là ngày nghiệp vụ tại `Asia/Ho_Chi_Minh`, không phải UTC |
| BR-008 | Vòng đời: `(none) → MORNING_SUBMITTED → COMPLETED`. Không nhảy bước, không quay lui |
| BR-010 | Tiền lưu số nguyên VND, không lưu chuỗi đã format |
| BR-011 | Achievement **không persist**, luôn tính runtime |
| BR-014 | `achievement = actual / target × 100`, làm tròn 1 chữ số thập phân khi hiển thị |

**Hàm dùng chung — tên đã chốt, không đặt tên khác, không viết lại:**
`lib/kpi.ts` → `calculateAchievement()`, `getAchievementStatus()` ·
`lib/currency.ts` → `formatCurrencyVND()`, `parseCurrencyInput()` ·
`lib/date.ts` → `getVietnamToday()`, `formatVietnamDate()`, `getVietnamMonthRange()`.

**Ba Supabase client, ba mục đích, không dùng lẫn:**
`lib/supabase/client.ts` (browser, anon, chịu RLS) · `lib/supabase/server.ts` (RSC + Server Actions, anon, chịu RLS — **đường dữ liệu chính**) · `lib/supabase/admin.ts` (service role, `import 'server-only'`, **chỉ** `auth.admin.*` cho UC-17/18/19).

**Bước tiếp theo của dự án (bám sát `SESSION_CHECKPOINT.md`):**
1. Người dùng trả lời `OQ-01..OQ-17`, ưu tiên 9 câu BLOCKING.
2. Cập nhật `docs/11-decisions.md` từ `PROPOSED` → `APPROVED`, đồng bộ `docs/01`, `docs/02`, `docs/03`, `docs/06`.
3. Phase 1: `npx create-next-app@16` (TS strict, Tailwind v4, App Router, ESLint, không dùng `src/`), dựng cấu trúc DEC-023, cài `@supabase/supabase-js` + `@supabase/ssr` + `zod` + `lucide-react`, tạo `.env.example`, chạy build/typecheck/lint để có baseline.

---

## OPEN QUESTIONS

Danh sách đầy đủ nằm ở `docs/01-business-analysis.md §OPEN QUESTIONS`. Dưới đây là **9 câu mức BLOCKING** đang chặn Phase 2 (ISSUE-001):

| ID | Câu hỏi rút gọn | Đề xuất mặc định |
|---|---|---|
| OQ-01 | "Mục tiêu viếng thăm" là số điểm/đại lý hay mục đích chuyến đi? | Cả hai: `target_visit_points` (bắt buộc) + `visit_purpose` (optional) |
| OQ-02 | "Đã viếng thăm" là con số hay tuyến thực tế đã đi? | Cả hai: `actual_visit_points` (bắt buộc) + `actual_route` (optional) |
| OQ-04 | Hoàn tất báo cáo cuối ngày rồi có được sửa không? | (a) Khoá ngay khi `COMPLETED` |
| OQ-05 | Admin có được sửa báo cáo của Sales không? | Không trong v1 |
| OQ-08 | Có khái niệm ngày nghỉ / không đi thị trường không? | v1 không có |
| OQ-09 | KPI do Sales tự cam kết hay Admin giao trước? | Sales tự cam kết |
| OQ-11 | Khi `target = 0` thì % hiển thị thế nào? | `actual=0` → 100%; `actual>0` → `—` + "Vượt kế hoạch". Không `NaN`/`∞` |
| OQ-12 | Nhập trễ/nhập bù/giờ cắt? | Chỉ tạo/sửa cho đúng ngày hôm nay theo giờ VN, không nhập bù |
| OQ-13 | Xoá báo cáo: có/không, soft hay hard? | v1 không xoá |

Thêm: **OQ-03** ở mức `BLOCKING (xác nhận)` — chỉ cần người dùng xác nhận "Doanh số = số lượng xe, Doanh thu = tiền VND". Các câu `OQ-06, OQ-07, OQ-10, OQ-14, OQ-15, OQ-16, OQ-17` là NON-BLOCKING: cứ làm theo đề xuất mặc định, đổi sau vẫn rẻ.

Các business rule đang chờ chính là `BR-013` (OQ-13), `BR-015` (OQ-11), `BR-019` (OQ-04), `BR-020` (OQ-05), `BR-021` (OQ-12), `BR-024` (OQ-17) — tất cả đang `PROPOSED`, tương ứng DEC-025 và DEC-026. **Không được implement chúng như thể đã APPROVED.**
