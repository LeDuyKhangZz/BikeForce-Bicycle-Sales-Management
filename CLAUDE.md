# CLAUDE.md — Hướng dẫn bắt buộc cho mọi Claude Code session (BikeForce)
> Status: ACTIVE | Phase: 6 | Last updated: 2026-08-08
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
| Phase | **PHASE 6 — Xuất ảnh 9:16: 11/12 mục** (2026-08-08). Phase 0, 1, 2, 5 đã đóng; Phase 3 còn 1 mục chờ OQ-18; Phase 4 còn 1 mục chờ E2E Phase 11; **Phase 6 còn 1 mục cần thiết bị thật** (ISSUE-003) |
| Source code | **ĐÃ CÓ.** Next.js 16.3.0 App Router · 5 migration chạy thật trên **cả local lẫn cloud** · tầng auth đầy đủ · **luồng báo cáo ngày chạy thật đầu-cuối cả hai nửa** (`/sales/today`, `/sales/today/morning`, `/sales/today/evening`) · **KPI engine thật + bảng đối chiếu 4 chỉ tiêu** · **ảnh chia sẻ 9:16 sinh thật bằng Satori** · bộ test 369 case |
| Git | **Đã là git repository** — nhánh `main`, remote `origin` trỏ tới GitHub `LeDuyKhangZz/BikeForce-Bicycle-Sales-Management` (DEC-028). Quyền push đứng vẫn còn, **nhưng `git push` không chạy được từ agent** (không có TTY) → commit xong phải nhờ người dùng tự push |
| Supabase **local** | ✅ **Đã chạy thật** — Docker + CLI 2.111.0, Postgres 17.6.1.156. ⚠ Sau `db reset` phải restart 3 container, nếu không đăng nhập nhận `502` (ISSUE-012) |
| Supabase **cloud** | ✅ **Đã nối xong** — `rnmywhwanpxmipqducqu`, region `ap-southeast-1`, 5 migration đã `db push`, seed **không** được đẩy, signup đã tắt |
| Build / Typecheck / Lint | ✅ **PASS thật** (2026-08-08): cả 3 exit 0, lint 0 error 0 warning, build ra **8 route** |
| Unit / Integration / RLS | ✅ **PASS thật**: `npm test` → **369/369** (290 unit + 40 integration + 39 RLS), 15,3 giây. Coverage `lib/**`: stmt 98,46% · branch 99,28% · lines 98,75% |
| E2E / a11y / Lighthouse | **N/A — chưa có `playwright.config.ts`, chưa có `e2e/*.spec.ts`.** Không được ghi PASS |
| Chặn tiến độ | ✅ **Không còn chốt chặn nào.** 17/17 OQ ban đầu đã trả lời; **39 DEC** và 25 BR đều `APPROVED` |

**Hệ quả trực tiếp:** **Phase 7 (Sales History) là việc kế tiếp.** Bắt đầu bằng `getVietnamMonthRange()` — hàm **duy nhất** trong `lib/` còn cố ý là khung ném lỗi. Khi dựng xong `/sales/reports/[id]`, nhớ xoá `VIEW_REPORT` khỏi `CTA_ROUTES_NOT_READY`. Màn hình chi tiết **dùng lại** `AchievementTable` + `ReportNotes` + `ShareImageButton` đã có sẵn — không viết lại. Theo Master Spec §71 **không được tự ý thay đổi** bất kỳ business rule nào đã `APPROVED`, và **không được tự trả lời** một câu hỏi nghiệp vụ còn treo.

> ⏳ **Hai việc chờ người dùng, KHÔNG chặn việc code:**
> 1. **Rotate service role key** (ISSUE-011, P1) — key đã lọt vào transcript hội thoại.
> 2. **Trả lời OQ-18** (ISSUE-013) — NFR-008 đặt "≤ 6 lần chạm" nhưng FR-008 có 5 trường bắt buộc nên sàn lý thuyết là 7; đo thật được **7 chạm / 1,8 giây**. Ba phương án ở `docs/01 § OQ-18`. **Đừng tự chọn hộ**, và **đừng bỏ bớt trường bắt buộc** để ép con số xuống.
>
> Người dùng đã yêu cầu **hướng dẫn thật chi tiết từng bước bấm** ở khúc Supabase và Vercel — đừng chỉ đưa lệnh CLI rồi tự chạy.

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

Phiên bản dưới đây **đã được PIN CHÍNH XÁC** sau smoke test thật ở Phase 1 (2026-08-07). Đây là bảng có thẩm quyền — `package.json` khớp đúng bảng này, không dùng dải `^`.

| Package | Version đã PIN | Ghi chú |
|---|---|---|
| `next` | 16.3.0 | Turbopack là bundler mặc định |
| `react` / `react-dom` | 19.2.8 | |
| `typescript` | **6.0.3** | ⚠ **KHÔNG phải 7.0.2** — xem cảnh báo dưới |
| `tailwindcss` / `@tailwindcss/postcss` | 4.3.3 | |
| `@supabase/supabase-js` | 2.112.2 | |
| `@supabase/ssr` | 0.12.4 | |
| `zod` | 4.4.3 | |
| `lucide-react` | 1.29.0 | |
| `server-only` | 0.0.1 | bắt buộc cho `lib/supabase/admin.ts` |
| `eslint` | **9.39.5** | ⚠ **KHÔNG phải 10.8.0** — xem cảnh báo dưới |
| `eslint-config-next` | 16.3.0 | |
| `vitest` / `@vitest/coverage-v8` | 4.1.10 | ✅ đã có `vitest.config.mts` (3 project) và **80 test đang xanh** |
| `pg` / `@types/pg` | 8.22.0 / 8.20.4 | **devDependency, chỉ dùng cho test** — kết nối Postgres local dựng fixture (DEC-031). Ứng dụng KHÔNG import |
| `@playwright/test` | 1.62.1 | chromium đã tải |
| `@axe-core/playwright` | 4.12.1 | |
| `supabase` (CLI) | 2.111.0 | |
| `html-to-image` | *(chưa cài)* | chỉ cài nếu Phase 6 phải dùng fallback — DEC-010 |

**⚠ ISSUE-004 ĐÃ XẢY RA THẬT và đã CLOSED — đừng "nâng cấp lại" cho mới:**

- **TypeScript 7.0.2 làm vỡ `eslint`.** `typescript-eslint@8.66.0` khai báo peer `typescript: ">=4.8.4 <6.1.0"` → nó **từ chối thẳng** TS 7 (`typescript-eslint does not support TS 7.0`). Build và `tsc` thì vẫn chạy, nên lỗi chỉ lộ khi lint.
- **ESLint 10.8.0 cũng làm vỡ `eslint`, độc lập với TypeScript.** `eslint-plugin-react@7.37.5` — **bản mới nhất đang tồn tại** — chỉ hỗ trợ tới `eslint@^9.7` và ném `contextOrFilename.getFilename is not a function`. Không override nào cứu được.
- Đã pin **`typescript@6.0.3`** (bản stable nằm trong peer range `<6.1.0`) thay vì lùi hẳn về 5.x LTS. Lý do đầy đủ: `docs/11-decisions.md § DEC-002 — KẾT LUẬN SMOKE TEST`.
- Chỉ nâng lên TS 7 / ESLint 10 khi **cả hai** package thượng nguồn ra bản hỗ trợ, và phải tạo **DEC mới**.

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
├── components/ui/                # primitive không biết nghiệp vụ: Button, Input, Card, Badge,
│                                 # Textarea, FormField, Label, Skeleton, CurrencyField
├── features/                     # component + action + query của MỘT nghiệp vụ
│   ├── auth/                     # ⚠ TÊN THẬT TRONG REPO là `report-morning/`,
│   ├── report-morning/           #    KHÔNG phải `morning-report/`. Đừng tạo thư mục trùng nghĩa
│   ├── report-evening/           #    ✅ đã có (Phase 4)
│   ├── report-comparison/        #    ✅ đã có (Phase 5) — achievement-table / achievement-badge / report-notes
│   ├── report-share/             # DailyReportShareCard.tsx — Phase 6
│   ├── sales-history/
│   └── admin-*/
├── lib/                          # kpi, currency, date, validation (Zod), supabase clients, auth helpers
│   ├── kpi.ts  currency.ts  date.ts  utils.ts  env.ts
│   ├── auth/      routes.ts  messages.ts
│   ├── hooks/     use-report-draft.ts        # hook React THUẦN dùng chung — DEC-035
│   ├── reports/   today-cta.ts  messages.ts  draft-keys.ts
│   ├── validation/  auth.ts  report.ts
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
> Phase 0, 1, 2 đã tick đủ. Phase 3 tick 13/14 — mục cuối để nguyên `[ ]` vì đo thật không đạt (ISSUE-013), **không** tick vì "gần đạt".
> E2E / a11y / Lighthouse vẫn ghi `N/A` cho tới Phase 11.

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

> **Lưu ý cho giai đoạn hiện tại:** bước 1–4 **chạy được và phải chạy thật** — `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`. Chỉ E2E / a11y / Lighthouse mới ghi `N/A`. **Tuyệt đối không ghi PASS khi chưa thấy kết quả.**
>
> Nếu task đụng UI thì **phải kiểm chứng trên trình duyệt thật** ở 375px (DoD mục 6) — Phase 2 và Phase 3 đều làm bằng script Playwright dùng-một-lần rồi xoá, **không commit**. Cách này đã bắt được một lỗi mà unit test không thể thấy (DEC-034).

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
- ❌ **Không** tự ý thay đổi business rule đã `APPROVED` (toàn bộ BR-001…BR-025 đều đã APPROVED từ 2026-08-07). Muốn đổi: tạo `DEC` mới + hỏi người dùng.
- ❌ **Không** tự thêm feature ngoài MVP (CRM, kho, POS, SKU, GPS, đơn hàng) để dự án "to hơn".
- ❌ **Không** tự triển khai mục trong `docs/10-future-roadmap.md`.
- ❌ **Không** rewrite lại bộ tài liệu Phase 0 từ đầu — chỉ cập nhật (xem `DO NOT REDO` trong checkpoint).
- ❌ **Không** dùng `<table>` cuộn ngang trên mobile, không dùng emoji làm icon, không thêm animation ngoài transform/opacity 150–300ms.

---

## 12. THAM CHIẾU NHANH

**Hệ thống ID dùng thống nhất toàn dự án — không đánh số lại, không tự tạo ID mới:**
`UC-01..UC-21` (use case) · `FR-001..FR-037` (functional) · `NFR-001..NFR-015` (non-functional) · `BR-001..BR-025` (business rule) · `OQ-01..OQ-18` (open question) · `DEC-001..DEC-039` (decision) · `ISSUE-001..ISSUE-015` (issue) · `AF-01..AF-15` (admin feature proposal).

`UC`, `FR`, `NFR`, `BR`, `AF` là **dãy đóng** — không thêm ID mới nếu không có xác nhận của người dùng. `OQ`, `DEC`, `ISSUE` là **dãy mở**: cấp ID mới = số lớn nhất từng dùng + 1, **không bao giờ renumber, không tái sử dụng ID đã CLOSED**.

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
`lib/kpi.ts` → `calculateAchievement(target, actual, metric)`, `getAchievementStatus()`, `formatMetricValue()`, `achievementLabel()`, `isKpiAchievedDay()` ·
`lib/currency.ts` → `formatCurrencyVND()`, `parseCurrencyInput()` ·
`lib/date.ts` → `getVietnamToday()`, `formatVietnamDate()`, `getVietnamMonthRange()`.

**Ba Supabase client, ba mục đích, không dùng lẫn:**
`lib/supabase/client.ts` (browser, anon, chịu RLS) · `lib/supabase/server.ts` (RSC + Server Actions, anon, chịu RLS — **đường dữ liệu chính**) · `lib/supabase/admin.ts` (service role, `import 'server-only'`, **chỉ** `auth.admin.*` cho UC-17/18/19).

**Bước tiếp theo của dự án (bám sát `SESSION_CHECKPOINT.md`):**
1. ~~Người dùng trả lời `OQ-01..OQ-17`~~ — ✅ **XONG 2026-08-07, đủ 17/17.**
2. ~~Cập nhật `docs/11-decisions.md` từ `PROPOSED` → `APPROVED`~~ — ✅ **XONG.**
3. ~~**Phase 1 — Foundation**~~ · ~~**Phase 2 — schema + auth**~~ — ✅ **XONG 2026-08-07**, cả hai đã đóng đủ mục. Supabase cloud đã nối xong.
4. ~~**Phase 3 — Morning Report**~~ — ✅ **XONG 13/14 mục 2026-08-07.** Kiểm chứng trình duyệt 57/58.
5. ~~**Phase 4 — Evening Report**~~ — ✅ **XONG 9/10 mục 2026-08-07.** Kiểm chứng trình duyệt 62/62 + hồi quy luồng sáng 11/11. Mục còn lại là **E2E Playwright**, thuộc Phase 11.
6. ~~**Phase 5 — KPI Engine**~~ — ✅ **ĐÓNG ĐỦ 11/11 mục 2026-08-07.** ISSUE-008 + DEC-025 đã chốt (**DEC-038**); `lib/kpi.ts` có thân thật + 46 unit test; bảng đối chiếu `features/report-comparison/` gắn ở `/sales/today`; 315 test xanh; kiểm chứng trình duyệt **36/36**.
7. **Đang chờ người dùng (không chặn code):** rotate service role key (ISSUE-011) · trả lời **OQ-18** (ISSUE-013).
8. ~~**Phase 6 — Xuất ảnh 9:16**~~ — ✅ **XONG 11/12 mục 2026-08-08.** Route Handler sinh PNG 1080×1920 bằng Satori, font Inter nhúng đủ dấu tiếng Việt, nút Xuất ảnh chạy thật với Web Share API + 2 fallback; **ISSUE-002 CLOSED** (không cần fallback `html-to-image`); phát sinh và đã sửa **ISSUE-015** bằng **DEC-039**; 44/44 phép kiểm trình duyệt. Mục còn lại: **kiểm Zalo trên thiết bị thật** (ISSUE-003) — cần điện thoại + link công khai.
9. **Phase 7 — Sales History (việc kế tiếp).** `getVietnamMonthRange()` → `listReportsByMonth()` phân trang server-side → `/sales/history` → `/sales/reports/[id]` → xoá `VIEW_REPORT` khỏi `CTA_ROUTES_NOT_READY` → bottom nav 3 mục (DEC-018). Chi tiết từng bước ở `SESSION_CHECKPOINT.md § Next Exact Steps`.

**Những thứ đã kiểm chứng mà session sau KHÔNG được làm lại** (chi tiết ở `SESSION_CHECKPOINT.md § DO NOT REDO`):

*Phase 2:* `force row level security` **an toàn** vì `postgres` có `rolbypassrls` · `now()` **dùng được** trong CHECK constraint · `service_role` **cố ý không có DML** trên 2 bảng nghiệp vụ (DEC-031) — đừng cấp thêm.

*Phase 3:* `lib/date.ts` và `lib/currency.ts` **đã xong thật** (DEC-032) *(dòng này trước đây còn ghi "`lib/kpi.ts` vẫn cố ý ném lỗi" — **đã hết hiệu lực từ Phase 5**)* · client **không được** suy ra thông báo thành công từ `mode` của form (DEC-034, đã có lỗi thật) · `useReportDraft` **phải** dùng `useSyncExternalStore`, React Compiler chặn `setState` trong effect · CTA "Xem báo cáo hôm nay" **cố ý disabled** (`CTA_ROUTES_NOT_READY`, Phase 7) — *còn nút "Xuất ảnh" thì **đã bật thật ở Phase 6**, `EXPORT_IMAGE_NOT_READY` không còn tồn tại*.

*Phase 6:* Satori **dựng được** bố cục 9:16 — ISSUE-002 CLOSED, đừng chuyển sang `html-to-image` · font `.ttf` trong `public/fonts/` là **asset bắt buộc**, Satori không đọc `woff2` và subset `vietnamese` **không có** chữ Latin cơ bản · `outputFileTracingIncludes` trong `next.config.ts` **không được xoá** · `getReportForShare()` **cố ý không nhận `salesId`** (thêm vào là chặn nhầm Admin — BR-022) · middleware trả **401/403 JSON** cho `/api/*` (DEC-039), đừng gộp lại thành redirect · `lib/reports/metric-rows.ts` là nguồn duy nhất của "4 chỉ tiêu là gì", Phase 8/9 **import chứ đừng khai lại** · `formatCompactVND` **chỉ** dành cho thẻ ảnh.

*Phase 5:* `lib/kpi.ts` **đã có thân thật, không còn ném lỗi** — đừng viết lại · `calculateAchievement()` nhận **ba** tham số (`target, actual, metric`), đừng gọi bằng hai · `percent = 99.99` cho `display = '100,0%'` nhưng `status = 'NEAR'` là **đúng theo BR-014 × BR-023**, có test khoá lại, đừng "sửa" · `features/report-morning/commitment-summary.tsx` **cố ý chỉ một cột** và chỉ còn dùng ở `/sales/today/evening` — đừng gộp nó với `AchievementTable` · `getVietnamMonthRange()` **vẫn cố ý là khung ném lỗi** (Phase 7/9), việc Phase 5 đóng không có nghĩa hàm đó đã xong.

*Phase 4:* `useReportDraft` nay ở `lib/hooks/`, `CurrencyField` nay ở `components/ui/` (DEC-035) — **không phải file bị mất** · guard quyền của Server Action đã gom về `authorizeSalesWrite()` ở `features/auth/queries.ts` (DEC-036) — **đừng viết lại** · `saveEveningReport` **cố ý tự `redirect()` và không trả gì khi thành công** (DEC-037, ISSUE-014) — **đừng thêm lại nhánh `ok: true`**, nó không bao giờ tới được client · 7 test RLS của `completeEveningReport` **phải ở `tests/rls/`**, chuyển sang `tests/integration/` là làm chúng vô nghĩa (`postgres` có `rolbypassrls`).

---

## OPEN QUESTIONS — 17/17 câu ban đầu ĐÃ ĐÓNG (2026-08-07) · **OQ-18 đang chờ**

Người dùng đã trả lời **đủ 17/17** câu của bộ ban đầu — **tuyệt đối không hỏi lại**. Danh sách đầy đủ kèm câu trả lời nằm ở `docs/01-business-analysis.md §OPEN QUESTIONS` — **đọc mục đó trước khi viết migration hoặc `lib/kpi.ts`**.

> ⏳ **OQ-18 (MỚI, phát sinh ở Phase 3):** NFR-008 đặt "hoàn tất báo cáo sáng ≤ 6 lần chạm", nhưng FR-008 quy định 5 trường bắt buộc nên sàn lý thuyết là `1 + 5 + 1 = 7`. Đo thật: **7 chạm / 1,8 giây**. Ba phương án ở `docs/01 § OQ-18` và `docs/12 § ISSUE-013`. **Không chặn Phase 4.** Đây là câu hỏi mới, không phải hỏi lại câu cũ.

Mười quyết định nghiệp vụ mà mọi session sau phải nhớ:

| Chủ đề | Quyết định đã chốt | BR / DEC |
|---|---|---|
| Viếng thăm | Giữ **cả hai**: cột số bắt buộc + cột text tuỳ chọn (`target_visit_points`+`visit_purpose`, `actual_visit_points`+`actual_route`) | DEC-029 |
| Đơn vị | Doanh số = **số lượng xe** (integer). Doanh thu = **tiền VND** (bigint), nghĩa là **giá trị đơn hàng chốt trong ngày** | BR-006, BR-010 |
| Sửa sau khi hoàn tất | **KHÔNG.** Khoá vĩnh viễn khi `status = 'COMPLETED'`, kể cả trong cùng ngày | BR-019, DEC-026 |
| Admin sửa báo cáo | **KHÔNG.** Không tồn tại UPDATE policy nào cho Admin trên `daily_reports` | BR-020, DEC-026 |
| Xoá báo cáo | **KHÔNG.** Không DELETE policy, không `GRANT DELETE`, **không** cột `deleted_at` | BR-013, DEC-026 |
| Nhập bù ngày cũ | **KHÔNG.** Chỉ đúng ngày hôm nay theo giờ VN; không giới hạn giờ trong ngày | BR-021, DEC-026 |
| `target = 0` | `actual = 0` → **`100,0%`**. `actual > 0` → `percent = null` + **số vượt tuyệt đối** có dấu cộng và đơn vị (`+3 xe`, `+2 điểm`, `+5 khách`, `+3.000.000 ₫`), nhãn "Vượt kế hoạch". Khi tổng hợp của Admin thì **loại khỏi mẫu số**. Không bao giờ `NaN`/`∞` | BR-015, DEC-025 |
| Ai đặt KPI | **Sales tự cam kết buổi sáng.** Không có bảng `targets`, Admin không giao chỉ tiêu | DEC-030 |
| Ngày nghỉ / team / role | **Không có** khái niệm nghỉ phép, **không** chia team/vùng, **chỉ 2 role** `ADMIN`/`SALES` | DEC-030 |
| Ngày đạt KPI | Đạt **cả 4** chỉ tiêu ≥ 100% | BR-024 |

**Một điểm phải nhớ khi triển khai:**

1. **AF-12 (audit log) chưa cần** vì không ai được sửa sau khi hoàn tất. Nếu sau này mở quyền sửa, **phải làm audit log trước**, và phải tạo `DEC` mới thay vì sửa DEC-026.
