# CLAUDE.md — Hướng dẫn bắt buộc cho mọi Claude Code session (BikeForce)
> Status: ACTIVE | Phase: 18 — Thanh tiến độ + ngọn lửa vượt chỉ tiêu (DEC-069) | Last updated: 2026-08-15

> **Mốc mới nhất:** DEC-068 đã hoàn tất: thẻ ảnh 9:16 **bỏ khối "Số khách làm việc"** và thêm **cụm lũy
> kế tháng** (doanh số tháng · doanh thu tháng · **số ngày ĐẠT KPI**) vào **cả hai** biến thể. Mốc cộng:
> từ ngày 01 đến ngày báo cáo với bản chiều, đến **hết hôm trước** với bản sáng. Kèm **ISSUE-032** — thẻ
> chồng chữ khi nội dung vượt 1920px, lỗi có sẵn, nay khoá bằng `flexShrink: 0`. Vitest **841/841**, E2E
> ảnh 20 passed, đã render 4 PNG thật để nhìn. Quy tắc đứng vẫn là **xong việc tự commit + push, không
> chờ người dùng nhắc lại**.

> ## ⚠ NGHIỆP VỤ ĐÃ ĐỔI Ở PHASE 13 — ĐỌC TRƯỚC KHI TIN BẤT KỲ MỤC NÀO BÊN DƯỚI
>
> Ngày 2026-08-10, **OQ-19 được trả lời** và sinh ra **DEC-048/049/050** + **BR-026**. Bốn chỉ tiêu
> của một báo cáo ngày nay là:
>
> | Chỉ tiêu | Đơn vị | Cột |
> |---|---|---|
> | Viếng thăm | điểm — **mục tiêu ∈ [10, 1000]** (BR-026) | `*_visit_points` |
> | **Doanh số** | **VND** *(trước là "số lượng xe")* | **`*_sales_amount`** (MỚI ở `0008`) |
> | **Doanh thu công nợ** | **VND — tiền công nợ THU HỒI ĐƯỢC** *(trước là "giá trị đơn hàng")* | `*_revenue` |
> | **Khách hàng đã gặp** | khách *(trước nhãn là "Khách hàng")* | `*_customer_visits` |
>
> **Hệ quả bắt buộc nhớ:**
> - Khoá chỉ tiêu là **`SALES_AMOUNT`**, KHÔNG còn `SALES_QUANTITY`. Đơn vị `xe` **đã bị xoá khỏi
>   toàn dự án**.
> - **`visit_purpose` ("Mục đích chuyến đi") không còn được nhập và không còn hiển thị** (DEC-048).
> - Ba cột `*_sales_quantity` và `visit_purpose` vẫn ở trong database nhưng là **DI SẢN** — giữ vì
>   BR-013 cấm xoá dữ liệu, **không code nào được đọc chúng**.
> - Chi tiết đầy đủ: `docs/11 § DEC-050` · `SESSION_CHECKPOINT.md § DO NOT REDO`.
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
| Phase | **PHASE 16 — ĐÃ ĐÓNG** (2026-08-11, DEC-066). Báo cáo Admin mặc định tháng hiện tại, filter progressive disclosure và phân trang trực tiếp cho dữ liệu lớn. Các nợ thiết bị thật cũ của Phase 6/11 không đổi |
| Migration | ✅ Local **8/8** · Cloud **8/8** — `0008` đẩy ngày 2026-08-10, đã xác minh **7 phép kiểm** (GRANT, `anon` bị chặn, dữ liệu cũ còn nguyên, `convalidated`) — bảng đầy đủ ở `SESSION_CHECKPOINT.md § Database State` |
| Source code | **ĐẦY ĐỦ v1.** Next.js 16.3.0 App Router · **20 route chạy thật** · loading DEC-065 · Admin reports DEC-066 · luồng báo cáo ngày hai nửa · KPI engine · ảnh 9:16 · lịch sử · toàn bộ khu vực Admin · **802 Vitest** |
| Git | Nhánh `main`, remote `origin` → GitHub `LeDuyKhangZz/BikeForce-Bicycle-Sales-Management` (DEC-028). ⚠ **Câu "`git push` không chạy được từ agent" là SAI và đã bị xoá khỏi dòng này ngày 2026-08-11** — nó chạy được, đã push thật nhiều lần (gần nhất `8b698f6`). Nó chỉ đỏ khi Git Credential Manager hết cache. **Người dùng yêu cầu thẳng: XONG VIỆC LÀ COMMIT VÀ PUSH LUÔN, không hỏi, không bàn giao lệnh push.** Chỉ nhờ người dùng chạy tay khi lệnh push đã chạy và đã đỏ vì credential |
| Supabase **local** | ✅ Chạy thật — Docker + CLI 2.111.0, Postgres 17.6. ⚠ Sau `db reset` phải restart 3 container, nếu không đăng nhập nhận `502` (ISSUE-012). ⚠ **Docker chết giữa lượt E2E = thiếu RAM trong WSL2, không phải hồi quy** — trần `.wslconfig` là `3GB` đặt cho **2 dự án**; nếu máy đang mở stack Supabase của dự án khác thì **tắt bớt** trước khi chạy E2E. Dựng lại: `wsl --shutdown` → `Start-Process 'Docker Desktop.exe'` (KHÔNG dùng `Start-Service`, cần admin) — ISSUE-024 |
| Supabase **cloud** | ✅ **`rnmywhwanpxmipqducqu` đủ 7/7 migration** (`0006` + `0007` đẩy ngày 2026-08-10). Đã kiểm thật: 5 hàm `admin_*` tồn tại, `anon` không execute được, signup vẫn tắt (`422`), schema khớp local. ⚠ **Seed KHÔNG được đẩy ⇒ cloud chưa có user nào** — phải chạy runbook tạo Admin đầu tiên (`docs/09 §10`) |
| Build / Typecheck / Lint | ✅ **PASS thật** (2026-08-11): cả 3 exit 0, lint 0 error/0 warning, build ra **20 route** |
| Unit / Integration / RLS | ✅ **PASS thật**: `npm test` → **802/802**; riêng nhóm Admin mới **102/102**, DB/RLS liên quan **38/38** |
| E2E / a11y | ✅ **PASS thật**: Admin hiện hành **36/36** trên 3 project; full regression gần nhất **159 passed / 12 skipped / 0 failed**; axe serious/critical vẫn xanh |
| Lighthouse | ❌ **N/A — chưa chạy.** Không được ghi PASS |
| Chặn tiến độ | ✅ **Không còn chốt chặn nào.** **18/18 OQ** đã trả lời; **45 DEC** và 25 BR đều `APPROVED` |

**Hệ quả trực tiếp:** **Đang ở Phase 12 (Deployment Preparation).** Migration đã đẩy xong lên cloud (7/7). Việc kế tiếp: đặt `Minimum password length = 8` trên Dashboard (DEC-041) · rotate service role key (ISSUE-011) · **chạy runbook tạo Admin đầu tiên** vì cloud chưa có user nào (`docs/09 §10`) · rồi mới tới Vercel. **Không code thêm màn hình nào**: 18/18 route của v1 đã chạy thật và có test. Theo Master Spec §71 **không được tự ý thay đổi** bất kỳ business rule nào đã `APPROVED`.

> ⚠ **BÀI HỌC CỦA PHIÊN 2026-08-10, ĐỌC TRƯỚC KHI TIN BẤT KỲ TÀI LIỆU NÀO:** phiên trước đó đã viết khoảng **7.000 dòng code Phase 7–10 mà không cập nhật một dòng tài liệu nào**, nên checkpoint ghi "Phase 7 chưa bắt đầu" trong khi code đã có đủ và đang xanh. **Luôn đo trạng thái thật bằng công cụ** (`git status`, `npm test`, `npm run build`) trước khi tin checkpoint — đúng như §4 của chính file này yêu cầu. Lần này tài liệu đã đồng bộ đầy đủ.

> ⏳ **Ba việc chờ người dùng hoặc chờ thiết bị thật, KHÔNG chặn việc code:**
> 1. ~~Đẩy `0006` + `0007` lên cloud~~ — ✅ **XONG 2026-08-10.** Tại đây có một điều đáng nhớ: `supabase db push` **chạy được từ agent** nếu truyền mật khẩu qua biến môi trường `SUPABASE_DB_PASSWORD` cộng cờ `--yes` — khác `git push`, nó không cần TTY.
> 2. **Rotate service role key** (ISSUE-011, P1) — key đã lọt vào transcript hội thoại.
> 3. **Kiểm ảnh 9:16 trong Zalo trên điện thoại thật** (ISSUE-003) + **Lighthouse** — cần link công khai ⇒ chờ deploy Vercel.
>
> ✅ **OQ-18 đã được trả lời ngày 2026-08-10** — phương án (a), NFR-008 nới thành **≤ 8 lần chạm** (**DEC-043**). **Không còn câu hỏi nghiệp vụ nào đang chờ.**

Người dùng đã yêu cầu **hướng dẫn thật chi tiết từng bước bấm** ở khúc Supabase và Vercel — đừng chỉ đưa lệnh CLI rồi tự chạy.

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
- ❌ **Không** đọc ba cột DI SẢN `visit_purpose`, `target_sales_quantity`, `actual_sales_quantity` (DEC-048, DEC-050). Chúng còn trong DB **chỉ** vì BR-013 cấm xoá dữ liệu.
- ❌ **Không** dùng khoá `SALES_QUANTITY` hay đơn vị `xe` — cả hai đã bị xoá khỏi dự án (DEC-050).
- ❌ **Không** dùng `new Date()` trực tiếp để suy ra ngày nghiệp vụ — phải qua `getVietnamToday()` (BR-005).
- ❌ **Không** enable nút xuất ảnh dựa trên trạng thái form; chỉ dựa trên báo cáo **đã persist**, và biến thể ảnh do `status` quyết định ở server (BR-002 sau khi DEC-058 nới).
- ❌ **Không** tự ý thay đổi business rule đã `APPROVED` (toàn bộ BR-001…BR-025 đều đã APPROVED từ 2026-08-07). Muốn đổi: tạo `DEC` mới + hỏi người dùng.
- ❌ **Không** tự thêm feature ngoài MVP (CRM, kho, POS, SKU, GPS, đơn hàng) để dự án "to hơn".
- ❌ **Không** tự triển khai mục trong `docs/10-future-roadmap.md`.
- ❌ **Không** rewrite lại bộ tài liệu Phase 0 từ đầu — chỉ cập nhật (xem `DO NOT REDO` trong checkpoint).
- ❌ **Không** "làm gọn" `viewBox` của `BrandMark` về `0 0 101 75`. Giá trị đúng là
  **`0 13.07 101 74.86`**: kích thước `101 × 75` luôn đúng, cái từng thiếu là **độ lệch `y = 13,07`**,
  và thiếu nó thì đáy hai bánh xe bị chém mất ~17% chiều cao. Bộ icon PWA **không** dính lỗi này nên
  đừng sinh lại chúng "cho đồng bộ". Cũng **không** gỡ `data-brand-mark` — đó là mốc của luật E2E
  `logo-clipped` (ISSUE-030).
- ❌ **Không** dùng `<table>` cuộn ngang trên mobile, không dùng emoji làm icon, không thêm animation ngoài transform/opacity 150–300ms.
- ❌ **Không** đổi bảng màu DEC-046 để "cho tươi hơn" — người dùng đã chốt giữ đúng tone logo. Lớp thẩm mỹ nằm ở **DEC-053** (chiều sâu / bo góc / chuyển động), không ở màu.
- ❌ **Không** đặt kính mờ (`backdrop-blur`) lên khối có chữ đọc lâu — chỉ header và bottom nav (DEC-053).
- ❌ **Không** dùng cam logo làm nền nút ngoài "Xuất ảnh báo cáo"; chữ trắng trên cam là **2,19:1**, bị cấm tuyệt đối.
- ❌ **Không** xoá `e2e/ui-quality.spec.ts` như các bộ soát dùng-một-lần trước — nó là hàng rào chống trôi tương phản của DEC-053.
- ❌ **Không** kết luận "giao diện đạt" chỉ vì bốn nhóm luật đo được đều xanh. **"Không vi phạm" ≠ "đẹp"** — muốn biết đẹp hay không thì **chụp ảnh ra và nhìn** (bài học DEC-053, và DEC-054 đã phải học lại: hai lỗi thật của phiên đó — chữ hiệu 1:1 và nút gãy hai dòng — **không phép đo nào bắt được**).
- ❌ **Không** đưa opacity vào chữ trên cột thương hiệu của `/login` — `text-white/85` đo được **4,21:1**, trượt AA. Dùng `text-white` đặc, phân cấp bằng cỡ và độ đậm (DEC-054).
- ❌ **Không** đặt `BrandLockup` lên nền đậm bằng `className="text-white"` — class bên trong là `text-heading` và nó thắng. Phải dùng `tone="inverse"` (DEC-054).
- ❌ **Không** gỡ `agentRules: false` khỏi `next.config.ts` — gỡ ra là để `next dev` ghi đè vào `AGENTS.md`, một tài liệu điều khiển (ISSUE-025).
- ❌ **Không** kết luận một nút "đã chạy được" chỉ vì E2E thấy nó `toBeVisible()`. Nút gọi Web API của trình duyệt (`navigator.share`, `download`, clipboard, camera) **bắt buộc** có bài E2E **bấm thật** — ISSUE-027 đã lọt ra production đúng vì thiếu điều này.
- ❌ **Không** coi "đã tải file về máy" là "đã lưu vào Thư viện ảnh". **Trang web KHÔNG có API nào ghi
  vào Thư viện ảnh Android / app Ảnh iOS** — chỉ có hai đường, cả hai cần thao tác tay: bảng chia sẻ
  → "Lưu ảnh", hoặc **nhấn giữ vào ảnh đang hiển thị** (DEC-061, ISSUE-029).
- ❌ **Không** đưa nhánh dự phòng của điện thoại về `window.location.href` trỏ vào route ảnh — route
  trả `attachment` nên file rơi vào thư mục Tải xuống rồi thôi, đúng ISSUE-029. Phải **hiện ảnh ra**
  bằng `?view=1` (DEC-061).
- ❌ **Không** đặt `inline` làm mặc định cho route ảnh, và **không** bỏ tham số `?view=1` (DEC-061).
- ❌ **Không** tách giao diện điện thoại/máy tính của khối xuất ảnh bằng JavaScript — dùng
  `pointer-coarse:` của Tailwind. Hook `matchMedia` chỉ đúng **sau khi hydrate** nên điện thoại sẽ
  nhấp nháy nhãn máy tính một nhịp (DEC-062).
- ❌ **Không** bỏ bước **nạp trước ảnh** trên thiết bị cảm ứng — iOS Safari đòi quyền hạn từ cú chạm
  còn hiệu lực khi gọi `navigator.share()`, mất nó là nút "không làm gì cả" (DEC-062, ISSUE-027).
- ❌ **Không** hứa "gửi thẳng vào Zalo" trong bất kỳ chữ nào của giao diện. Không có deep link Zalo
  nào nhận file; `navigator.share` mở **bảng chia sẻ của hệ điều hành**, Zalo là một mục trong đó
  (DEC-062).
- ❌ **Không** thêm lại bất kỳ câu nào dạy người dùng **"nhấn giữ vào ảnh"**. Người dùng đã bác
  thẳng: người không rành máy không biết thao tác ẩn. Mọi việc làm bằng **NÚT** (DEC-064).
- ❌ **Không** gỡ **ảnh xem trước** xuống hay đặt nó sau một cú bấm — nó **luôn hiện**, người dùng
  yêu cầu trực tiếp (DEC-064).
- ❌ **Không** đặt nhãn "Lưu vào thư viện ảnh" cho nút nào — nhãn đó **hứa sai**, web không ghi vào
  Thư viện được. Nút tải tên là **"Tải ảnh về máy"** (DEC-064).
- ❌ **Không** phát hiện webview bằng `userAgent`. Điều kiện là `typeof navigator.share !==
  'function'` trên máy cảm ứng — Zalo đổi UA là mù, mà Facebook/TikTok cũng khoá y hệt (DEC-064).
- ❌ **Không** gộp nhãn nút Zalo thành một chuỗi chung. `SEND_TO_ZALO_LABEL` là `Record` theo biến
  thể ("Gửi cam kết…" / "Gửi kết quả…") — gộp lại là làm mất thông tin DEC-058 cố ý đặt vào nhãn.
- ❌ **Không** bỏ dòng kiểm `profile.role !== 'ADMIN'` trong `updateOwnProfileAction` với lý do "RLS
  lo rồi" — `profiles_update_self` cho **mọi vai** sửa dòng của chính mình (DEC-063).
- ❌ **Không** thêm form sửa hồ sơ vào `/sales/account`. Hồ sơ Sales do Admin quản lý (UC-18); chỉ
  `/admin/account` có form (DEC-063).
- ❌ **Không** đặt đường dự phòng trong `catch` của `anchor.click()` — hàm đó **không bao giờ ném lỗi**, kể cả khi trình duyệt bỏ qua thuộc tính `download` (DEC-060).
- ❌ **Không** thêm lại nhánh `ok: true` vào `saveMorningReport` — nó **tự `redirect()`** từ DEC-059, đúng khuôn DEC-037. Câu cũ của DEC-037 gọi luồng sáng là ngoại lệ đã hết hiệu lực.
- ❌ **Không** viết lại `updateMorningReport` (Server Action hoặc hàm service) — UC-05/FR-012 đã bị **DEC-055** gỡ khỏi v1. Cam kết sáng khoá ngay khi gửi.
- ❌ **Không** gỡ policy `reports_update_own_open` dù FR-012 đã đi — nó là đường UPDATE **duy nhất** còn lại, phục vụ `completeEveningReport()`.
- ❌ **Không** thêm lại nhánh `403 NOT_COMPLETED` vào route ảnh, và **không** đặt giá trị mặc định cho tham số `variant` của `shareImageFileName()` (DEC-058).
- ❌ **Không** dùng `<>…</>` trong thẻ ảnh 9:16 — Satori không dựng được Fragment; dùng mảng rồi `.map()`.
- ❌ **Không** đưa thẻ ảnh 9:16 về nền tối — **DEC-057** đã chuyển nó sang nền sáng tone logo, khớp DEC-046.
- ❌ **Không** thêm lại khối **"SỐ KHÁCH LÀM VIỆC"** vào thẻ ảnh. Người dùng yêu cầu bỏ trực tiếp ngày
  2026-08-14 (**DEC-068**); chỗ đó nay là **cụm lũy kế tháng**. `calculateCustomerWorkRate()` vẫn còn
  trong `lib/kpi.ts` cùng test của nó nhưng **không tầng trình bày nào gọi tới** — đừng xoá, cũng đừng
  nối lại vào thẻ.
- ❌ **Không** để bản **sáng** cộng lũy kế tới hết ngày báo cáo. Nó dừng ở **hết ngày HÔM TRƯỚC** vì hôm
  đó chưa có thực đạt (DEC-068). Việc lùi một ngày là cố ý **dù** cột `actual_*` hôm đó đang `null`:
  chính khoảng truy vấn là thứ dòng "Tính đến hết ngày…" in ra, để lệch là tấm ảnh **nói sai**.
- ❌ **Không** tính "số ngày đạt KPI" bằng `sum()`/hàm SQL. Đó là BR-024 áp lên bốn kết quả
  `calculateAchievement()`, và BR-011 cấm persist `%` ⇒ làm bằng SQL là chép công thức KPI sang Postgres,
  đúng thứ NFR-012 cấm. `uq_daily_reports_sales_date` chặn trần ở **31 dòng**, cộng ở tầng ứng dụng là đủ rẻ.
- ❌ **Không** gỡ `flexShrink: 0` (hằng `NO_SHRINK`) khỏi các khối của thẻ ảnh, và **không** nâng lại
  `MAX_SHARE_NOTE_CHARS` (174) hay `ROW_METRICS.MORNING.paddingY` (44). Thẻ cao **cố định** 1920px; khi
  nội dung vượt, Yoga nén mọi khối và **chữ chồng lên nhau** — không phép đo nào bắt được (**ISSUE-032**).
- ❌ **Không** sửa thẻ ảnh rồi kết luận "xong" mà chưa **render PNG ra và nhìn**, và phải nhìn cả **ca dữ
  liệu dài nhất** (tên 2 dòng · tuyến 2 dòng · ghi chú kịch trần), không chỉ ca đẹp. Đây là lần thứ ba dự
  án học đúng bài này: DEC-053, DEC-054, ISSUE-032.
- ❌ **Không** cho ngọn lửa của thanh tiến độ cháy ở đúng `100,0%`. Ngưỡng là **`percent > 100` nghiêm
  ngặt** — người dùng chốt ngày 2026-08-15: *"vượt chỉ tiêu là lớn 100% mới được, = 100% thì không được"*
  (DEC-069). Ca `target = 0 && actual > 0` vẫn cháy vì BR-015 gọi đó là vượt kế hoạch.
- ❌ **Không** bỏ khoảng trống dọc phía trên thanh (`FLAME_STRIP_HEIGHT`) ở những dòng không cháy — mọi
  dòng đều phải cao bằng nhau, nếu không thì dòng có lửa bị lệch so với các dòng khác (DEC-069, đã render
  ra và thấy tận mắt). Cùng lý do: đó cũng là khoảng giữ cho lửa **không chạm nhãn chữ**.
- ❌ **Không** vẽ lại dải lửa bằng SVG. Nó là **ảnh** `public/images/flame-strip.png` do người dùng cung
  cấp; hai bản vẽ tay trước đó đều bị bác ("xấu quá"). Satori **không có `filter: blur()`** nên không thể
  vẽ ra quầng sáng — **hiệu ứng quang học thì dùng ảnh, hình khối và số liệu thì vẽ** (DEC-069).
- ❌ **Không** gỡ `./public/images/**` khỏi `outputFileTracingIncludes` trong `next.config.ts`. Thiếu nó
  thì `next build` vẫn xanh còn hàm trên Vercel ném `ENOENT` — đúng cái bẫy mà `public/fonts/**` đã dạy.
- ❌ **Không** quay lại đặt `MAX_SHARE_NOTE_CHARS` thành một hằng số cứng. Ngân sách ghi chú **phụ thuộc
  dữ liệu** (tên 2 dòng ăn ~77px, tuyến 2 dòng ăn ~48px) nên phải qua `shareNoteBudget()`. Dự án đã cắt
  hằng số hai lần (232 → 174 → 130) mà ca xấu nhất **vẫn bị chém ngang** — cắt dần không bao giờ tới đích.
- ❌ **Không** dùng emoji 🔥 cho ngọn lửa, và **không** đổi thanh sang màu đỏ/cam khi vượt. Inter không có
  glyph emoji ⇒ Satori vẽ ô vuông rỗng; còn đổi màu thanh là đảo ngược tín hiệu ngay cạnh chữ `%` xanh.
- ❌ **Không** nâng lại `ROW_METRICS.EVENING.paddingY` lên 30. Nó là **20** từ DEC-069 để bù chiều cao
  thanh tiến độ; nâng lại là tràn khung 1920px (ISSUE-032).
- ❌ **Không** clamp con số `%` để khớp chiều dài thanh. BR-004 cấm clamp **số**; chỉ `progress.fill` mới
  bị clamp về `[0,1]`, và phần vượt được kể bằng **ngọn lửa** chứ không bằng chiều dài.
- ❌ **Không** kiểm chứng UI bằng `next dev` trên máy hiện tại — nó trả `403` cho một chunk lõi nên trang **không hydrate**, mọi nút client chết trong khi giao diện trông bình thường. Dùng `next build` + `next start` (ISSUE-026).

---

## 12. THAM CHIẾU NHANH

**Hệ thống ID dùng thống nhất toàn dự án — không đánh số lại, không tự tạo ID mới:**
`UC-01..UC-21` (use case) · `FR-001..FR-037` (functional) · `NFR-001..NFR-015` (non-functional) · `BR-001..BR-026` (business rule) · `OQ-01..OQ-19` (open question) · `DEC-001..DEC-069` (decision) · `ISSUE-001..ISSUE-032` (issue) · `AF-01..AF-15` (admin feature proposal).

> ⚠ **`BR-026` là ngoại lệ DUY NHẤT của luật "dãy `BR` là dãy đóng".** Nó được mở ngày 2026-08-10 vì
> **người dùng yêu cầu trực tiếp** (sàn 10 cho mục tiêu điểm viếng thăm, ảnh 2 của `§13c`). Đừng lấy
> nó làm tiền lệ để tự thêm `BR-027`.

`UC`, `FR`, `NFR`, `BR`, `AF` là **dãy đóng** — không thêm ID mới nếu không có xác nhận của người dùng. `OQ`, `DEC`, `ISSUE` là **dãy mở**: cấp ID mới = số lớn nhất từng dùng + 1, **không bao giờ renumber, không tái sử dụng ID đã CLOSED**.

**Business rule hay bị vi phạm nhất — thuộc lòng:**

| ID | Rule |
|---|---|
| BR-001 | Mỗi Sales tối đa **một** báo cáo cho một ngày nghiệp vụ — `UNIQUE(sales_id, report_date)` |
| **BR-026** | **Mục tiêu** điểm viếng thăm ∈ **[10, 1000]**. Sàn **không** áp cho `actual_visit_points` |
| BR-002 | Chỉ xuất ảnh từ báo cáo **đã persist**; `status` chọn **biến thể** ảnh — sáng: thẻ CAM KẾT, chiều: thẻ KẾT QUẢ (**nới bởi DEC-058**) |
| BR-003 | Sales không đọc được báo cáo của Sales khác |
| BR-004 | Achievement được phép **> 100%**, không clamp |
| BR-005 | `report_date` là ngày nghiệp vụ tại `Asia/Ho_Chi_Minh`, không phải UTC |
| BR-008 | Vòng đời: `(none) → MORNING_SUBMITTED → COMPLETED`. Không nhảy bước, không quay lui |
| BR-010 | Tiền lưu số nguyên VND, không lưu chuỗi đã format |
| BR-011 | Achievement **không persist**, luôn tính runtime |
| BR-014 | `achievement = actual / target × 100`, làm tròn 1 chữ số thập phân khi hiển thị |

**Hàm dùng chung — tên đã chốt, không đặt tên khác, không viết lại:**
`lib/kpi.ts` → `calculateAchievement(target, actual, metric)` — ⚠ **`target` nay nhận `number | null`** vì báo cáo trước migration `0008` mang `null` ở doanh số (DEC-050) — `getAchievementStatus()`, `formatMetricValue()`, `formatMetricValueCompact()`, `achievementLabel()`, `isKpiAchievedDay()` ·
`lib/currency.ts` → `formatCurrencyVND()`, `parseCurrencyInput()` ·
`lib/date.ts` → `getVietnamToday()`, `formatVietnamDate()`, `formatVietnamShortDate()` *(DEC-068)*, `isValidVietnamDate()`, `shiftVietnamDate()` *(DEC-068)* + **nhóm 6 hàm tháng** (`getVietnamMonthRange` — trả **`null`** khi sai định dạng, DEC-040 · `getVietnamMonthToDateRange` — nhận **hai** tham số, DEC-068 · `getVietnamCurrentMonth` · `formatVietnamMonth` · `shiftVietnamMonth` · `resolveVietnamMonth`) ·
`lib/reports/metric-rows.ts` → `KPI_METRIC_ROWS`, `kpiMetricRow()` — nguồn **duy nhất** của “4 chỉ tiêu là gì” ·
`lib/reports/month-summary.ts` → `summarizeMonthToDate()` — nguồn **duy nhất** của lũy kế tháng trên thẻ ảnh (DEC-068) ·
`lib/reports/trend-chart.ts` → `buildTrendChart()`, `parseTrendMetric()`.

**Ba Supabase client, ba mục đích, không dùng lẫn:**
`lib/supabase/client.ts` (browser, anon, chịu RLS) · `lib/supabase/server.ts` (RSC + Server Actions, anon, chịu RLS — **đường dữ liệu chính**) · `lib/supabase/admin.ts` (service role, `import 'server-only'`, **chỉ** `auth.admin.*` cho UC-17/18/19).

**Bước tiếp theo của dự án (bám sát `SESSION_CHECKPOINT.md`):**
1. ~~Người dùng trả lời `OQ-01..OQ-17`~~ — ✅ **XONG 2026-08-07, đủ 17/17.**
2. ~~Cập nhật `docs/11-decisions.md` từ `PROPOSED` → `APPROVED`~~ — ✅ **XONG.**
3. ~~**Phase 1 — Foundation**~~ · ~~**Phase 2 — schema + auth**~~ — ✅ **XONG 2026-08-07**, cả hai đã đóng đủ mục. Supabase cloud đã nối xong.
4. ~~**Phase 3 — Morning Report**~~ — ✅ **XONG 13/14 mục 2026-08-07.** Kiểm chứng trình duyệt 57/58.
5. ~~**Phase 4 — Evening Report**~~ — ✅ **XONG 9/10 mục 2026-08-07.** Kiểm chứng trình duyệt 62/62 + hồi quy luồng sáng 11/11. Mục còn lại là **E2E Playwright**, thuộc Phase 11.
6. ~~**Phase 5 — KPI Engine**~~ — ✅ **ĐÓNG ĐỦ 11/11 mục 2026-08-07.** ISSUE-008 + DEC-025 đã chốt (**DEC-038**); `lib/kpi.ts` có thân thật + 46 unit test; bảng đối chiếu `features/report-comparison/` gắn ở `/sales/today`; 315 test xanh; kiểm chứng trình duyệt **36/36**.
7. **Đang chờ người dùng (không chặn code):** đẩy migration `0006` + `0007` lên cloud (`docs/09 §12`) · rotate service role key (ISSUE-011) · kiểm Zalo trên thiết bị thật (ISSUE-003) · Lighthouse. ~~trả lời OQ-18~~ — ✅ **đã xong 2026-08-10 (DEC-043)**.
8. ~~**Phase 6 — Xuất ảnh 9:16**~~ — ✅ **XONG 11/12 mục 2026-08-08.** Route Handler sinh PNG 1080×1920 bằng Satori, font Inter nhúng đủ dấu tiếng Việt, nút Xuất ảnh chạy thật với Web Share API + 2 fallback; **ISSUE-002 CLOSED** (không cần fallback `html-to-image`); phát sinh và đã sửa **ISSUE-015** bằng **DEC-039**; 44/44 phép kiểm trình duyệt. Mục còn lại: **kiểm Zalo trên thiết bị thật** (ISSUE-003) — cần điện thoại + link công khai.
9. ~~**Phase 7 — Sales History**~~ · ~~**Phase 8 — Admin Dashboard**~~ · ~~**Phase 9 — Admin Reports & Filters**~~ · ~~**Phase 10 — Sales Management**~~ · ~~**Phase 11 — Testing & Security**~~ — ✅ **XONG 2026-08-10 trong một phiên.** 18/18 route chạy thật · 5 hàm SQL aggregate · bộ E2E 99/99 · 729 test. Chi tiết: `WORKLOG.md` Entry 010.
10. ~~**Phase 12 — Deployment Preparation**~~ — ✅ **production đã sống** (`bike-force-bicycle-sales-management.vercel.app`), smoke test Admin 16/16.
11. ~~**Phase 13 — Nhận diện thương hiệu & soát UI/UX**~~ — ✅ **XONG 2026-08-10** trừ hai mục cần **mắt người** và **thiết bị thật**. Chi tiết: `WORKLOG.md` Entry 016.
12. ~~commit + push~~ ✅ `356f9dd` · ~~đẩy `0008` lên cloud~~ ✅ **8/8, đã xác minh**.
13. **VIỆC KẾ TIẾP** (chi tiết ở `SESSION_CHECKPOINT.md § Next Exact Steps`):
    **(a)** xác nhận Vercel build xong `356f9dd` rồi mở lại `/admin` · **(b)** rotate service role key (ISSUE-011) · **(c)** Lighthouse + ISSUE-003 trên thiết bị thật.

**Những thứ đã kiểm chứng mà session sau KHÔNG được làm lại** (chi tiết ở `SESSION_CHECKPOINT.md § DO NOT REDO`):

*Phase 2:* `force row level security` **an toàn** vì `postgres` có `rolbypassrls` · `now()` **dùng được** trong CHECK constraint · `service_role` **cố ý không có DML** trên 2 bảng nghiệp vụ (DEC-031) — đừng cấp thêm.

*Phase 3:* `lib/date.ts` và `lib/currency.ts` **đã xong thật** (DEC-032) *(dòng này trước đây còn ghi "`lib/kpi.ts` vẫn cố ý ném lỗi" — **đã hết hiệu lực từ Phase 5**)* · client **không được** suy ra thông báo thành công từ `mode` của form (DEC-034, đã có lỗi thật) · `useReportDraft` **phải** dùng `useSyncExternalStore`, React Compiler chặn `setState` trong effect · ~~CTA "Xem báo cáo hôm nay" cố ý disabled~~ — **hết hiệu lực**: `CTA_ROUTES_NOT_READY` **đã bị xoá ở Phase 7**, không còn cờ "chưa sẵn sàng" nào trong dự án.

*Phase 6:* Satori **dựng được** bố cục 9:16 — ISSUE-002 CLOSED, đừng chuyển sang `html-to-image` · font `.ttf` trong `public/fonts/` là **asset bắt buộc**, Satori không đọc `woff2` và subset `vietnamese` **không có** chữ Latin cơ bản · `outputFileTracingIncludes` trong `next.config.ts` **không được xoá** · `getReportForShare()` **cố ý không nhận `salesId`** (thêm vào là chặn nhầm Admin — BR-022) · middleware trả **401/403 JSON** cho `/api/*` (DEC-039), đừng gộp lại thành redirect · `lib/reports/metric-rows.ts` là nguồn duy nhất của "4 chỉ tiêu là gì", Phase 8/9 **import chứ đừng khai lại** · `formatCompactVND` **chỉ** dành cho thẻ ảnh.

*Phase 5:* `lib/kpi.ts` **đã có thân thật, không còn ném lỗi** — đừng viết lại · `calculateAchievement()` nhận **ba** tham số (`target, actual, metric`), đừng gọi bằng hai · `percent = 99.99` cho `display = '100,0%'` nhưng `status = 'NEAR'` là **đúng theo BR-014 × BR-023**, có test khoá lại, đừng "sửa" · `features/report-morning/commitment-summary.tsx` **cố ý chỉ một cột** và chỉ còn dùng ở `/sales/today/evening` — đừng gộp nó với `AchievementTable` · ~~`getVietnamMonthRange()` vẫn cố ý là khung ném lỗi~~ — **hết hiệu lực từ Phase 7**: hàm đã có thân thật và trả `null` khi sai định dạng (DEC-040). **Không còn khung ném lỗi nào trong `lib/`.**

*Phase 4:* `useReportDraft` nay ở `lib/hooks/`, `CurrencyField` nay ở `components/ui/` (DEC-035) — **không phải file bị mất** · guard quyền của Server Action đã gom về `authorizeSalesWrite()` ở `features/auth/queries.ts` (DEC-036) — **đừng viết lại** · `saveEveningReport` **cố ý tự `redirect()` và không trả gì khi thành công** (DEC-037, ISSUE-014) — **đừng thêm lại nhánh `ok: true`**, nó không bao giờ tới được client · 7 test RLS của `completeEveningReport` **phải ở `tests/rls/`**, chuyển sang `tests/integration/` là làm chúng vô nghĩa (`postgres` có `rolbypassrls`).

---

## OPEN QUESTIONS — ✅ ĐÃ ĐÓNG ĐỦ **19/19** (OQ-01…17 ngày 2026-08-07 · OQ-18 và **OQ-19** ngày 2026-08-10)

> ✅ **OQ-19 (Phase 13) đã được trả lời đủ 3/3** — bỏ hẳn đếm xe · "doanh thu công nợ" = tiền **THU
> HỒI ĐƯỢC** · dòng có trước migration `0008` mang **`null`** ở doanh số. Ghi thành **DEC-050**.

Người dùng đã trả lời **đủ 19/19** câu — **tuyệt đối không hỏi lại**. Danh sách đầy đủ kèm câu trả lời nằm ở `docs/01-business-analysis.md §OPEN QUESTIONS` — **đọc mục đó trước khi viết migration hoặc `lib/kpi.ts`**.

> ✅ **OQ-18 ĐÃ ĐƯỢC TRẢ LỜI ngày 2026-08-10 — phương án (a):** NFR-008 nới từ "≤ 6 lần chạm" thành **"≤ 8 lần chạm"**, **giữ nguyên 5 trường bắt buộc** của FR-008 — ghi thành **DEC-043**. Con số đo được **7 chạm / 1,8 giây** nay **ĐẠT cả hai vế**; ISSUE-013 → **CLOSED**; Phase 3 đóng ở **14/14**. **Không sửa một dòng code nào.** **Không còn câu hỏi nghiệp vụ nào đang chờ.**

Mười quyết định nghiệp vụ mà mọi session sau phải nhớ:

| Chủ đề | Quyết định đã chốt | BR / DEC |
|---|---|---|
| Viếng thăm | ~~Giữ cả hai~~ → **PHASE 13: `visit_purpose` đã bị gỡ khỏi giao diện** (DEC-048). Còn `target_visit_points` (**sàn 10** — BR-026) + `actual_visit_points` + `actual_route` | DEC-029 **sửa bởi DEC-048/049** |
| Đơn vị | ~~Doanh số = số lượng xe~~ → **PHASE 13: Doanh số = TIỀN VND**; **Doanh thu = tiền công nợ THU HỒI ĐƯỢC trong ngày** | BR-006 **sửa bởi DEC-050**, BR-010 |
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
