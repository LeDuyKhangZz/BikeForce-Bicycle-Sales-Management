# 11 — Decision Log

> Status: ACTIVE | Phase: 0 | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này
> Đây là **sổ quyết định** của dự án. Theo Master Spec §66, file này đứng ngay sau Master Spec trong thứ tự ưu tiên sự thật.

---

## Quy tắc sử dụng file này

1. Mọi quyết định ảnh hưởng tới kiến trúc, database, permission, workflow hoặc business rule phải có một entry `DEC-xxx` ở đây.
2. Format bắt buộc (Master Spec §55): `Date` / `Decision` / `Reason` / `Alternatives` / `Impact` / `Status`.
3. `Status` chỉ nhận một trong: `APPROVED` (đã chốt, được phép code theo), `PROPOSED` (đề xuất kỹ thuật, chờ người dùng xác nhận hoặc chờ OPEN QUESTION), `SUPERSEDED` (bị thay bởi DEC khác — ghi rõ thay bởi DEC nào), `REJECTED`.
4. **Không được tự ý sửa một quyết định đang `APPROVED`.** Nếu cần đổi: tạo `DEC` mới, đặt DEC cũ thành `SUPERSEDED`, và nếu là business decision thì phải hỏi người dùng trước.
5. Không xoá entry. Lịch sử quyết định là tài sản của dự án.
6. Khi một `OQ-xx` trong `docs/01-business-analysis.md` được trả lời, DEC tương ứng chuyển từ `PROPOSED` → `APPROVED` và phải cập nhật đồng thời các tài liệu bị ảnh hưởng theo ma trận Master Spec §62.

### Phân loại quyết định

| Loại | Ai được quyết | Ghi chú |
|---|---|---|
| **Technical** | Claude Code tự quyết bằng best practice | Vẫn phải ghi vào đây để có vết |
| **Business** | Chỉ người dùng | Không được tự đoán rồi code (Master Spec §7, §71) |
| **Technical có ảnh hưởng nghiệp vụ** | Claude đề xuất, người dùng có quyền veto | Ghi `APPROVED (technical, có thể veto)` |

### Bảng tra nhanh trạng thái

| Status | Số lượng | DEC |
|---|---:|---|
| APPROVED | **38** | DEC-001…DEC-038 — **toàn bộ**. DEC-001…DEC-030 chốt ngày 2026-08-07 sau khi người dùng trả lời đủ 17 OPEN QUESTION; DEC-031 thêm ở Phase 2; DEC-032…DEC-034 ở Phase 3; DEC-035…DEC-037 ở Phase 4; **DEC-038 ở Phase 5** |
| PROPOSED | 0 | — |
| SUPERSEDED | 0 | — |
| REJECTED | 0 | — |
| **Tổng** | **38** | DEC-001…DEC-038 |

> Bảng này từng dừng ở `31` trong khi DEC-032…DEC-037 đã tồn tại bên dưới — lệch phát hiện và sửa ở Phase 5 (2026-08-07). Khi thêm DEC mới, **cập nhật cả bảng này**.

---

## DEC-001

**Date:** 2026-08-07
**Decision:** Tech stack: Next.js 16 App Router + React 19 + TypeScript (strict) + Tailwind CSS v4 + Supabase (PostgreSQL, Auth, Row Level Security), deploy trên Vercel Free.
**Reason:** Đúng yêu cầu bắt buộc của Master Spec §2. Stack một-người-maintain-được, không cần hạ tầng riêng, chi phí 0đ ở quy mô một đội Sales. Supabase gộp cả database + auth + authorization (RLS) nên không phải tự xây tầng phân quyền.
**Alternatives:** (a) Remix/Nuxt + Supabase — không có lợi thế rõ, lệch Master Spec. (b) Next.js + Prisma + Postgres tự host — mất RLS làm biên giới bảo mật, phải tự quản server, tốn tiền. (c) Firebase — model dữ liệu không phù hợp với aggregate/report SQL, và không có SQL cho analytics tháng.
**Impact:** Toàn bộ kiến trúc, deployment, testing.
**Status:** APPROVED (Master Spec đã ấn định)

---

## DEC-002

**Date:** 2026-08-07
**Decision:** Chốt phiên bản chính xác của dependency ở **đầu Phase 1** sau một smoke test, không pin ngay ở Phase 0. Phiên bản stable mới nhất đã kiểm tra trên npm ngày 2026-08-07: `next@16.3.0`, `react@19.2.8`, `typescript@7.0.2`, `tailwindcss@4.3.3`, `@supabase/supabase-js@2.112.2`, `@supabase/ssr@0.12.4`, `zod@4.4.3`, `@playwright/test@1.62.1`, `vitest@4.1.10`, `eslint@10.8.0`, `lucide-react@1.29.0`.
**Reason:** TypeScript 7 và ESLint 10 đều là bản **major** mới. Pin mù rồi phát hiện vỡ giữa Phase 3 thì tốn hơn nhiều so với 15 phút smoke test. Master Spec §2 nói "phiên bản stable phù hợp **tại thời điểm triển khai**", không nói phải là mới nhất bằng mọi giá.
**Alternatives:** (a) Pin ngay hôm nay — rủi ro không tương thích chưa được kiểm chứng. (b) Dùng bản LTS cũ cho chắc — bỏ lỡ cải tiến, và Next 16 vốn đã yêu cầu React 19.
**Impact:** `package.json`, CI, thời lượng Phase 1.
**Status:** APPROVED
**Follow-up bắt buộc:** Phase 1 phải chạy `tsc --noEmit`, `next build`, `next lint` với TypeScript 7. Nếu vỡ → lùi về TypeScript 5.x LTS và ghi kết quả vào chính entry này.

### DEC-002 — KẾT LUẬN SMOKE TEST (2026-08-07, Phase 1)

**Smoke test đã CHẠY THẬT.** Kết quả: **TypeScript 7.0.2 và ESLint 10.8.0 đều KHÔNG dùng được** với Next 16.3.0. Đây là lần đầu ISSUE-004 được kiểm chứng bằng lệnh thật thay vì giả thuyết.

**Phát hiện 0 — `create-next-app@16.3.0` không hề cài TS 7 / ESLint 10.** Template chính thức của Next 16.3 pin `"typescript": "^5"` và `"eslint": "^9"`. Giả định trong `SESSION_CHECKPOINT.md` ("typescript 7.0.2 — do create-next-app cài") là **sai**.

**Phát hiện 1 — TypeScript 7.0.2 làm vỡ lint.** `npx tsc --version` → 7.0.2. `next build` **pass**, `tsc --noEmit` **pass**, nhưng `eslint` **fail exit 2**:

```
typescript-eslint does not support TS 7.0.
Please see .../announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0
See also https://github.com/typescript-eslint/typescript-eslint/issues/10940
```

Nguyên nhân gốc: `typescript-eslint@8.66.0` (do `eslint-config-next@16.3.0` kéo vào) khai báo peer `typescript: ">=4.8.4 <6.1.0"`. TS 7 nằm ngoài range và bị chặn cứng ngay lúc load module, không phải lỗi cấu hình.

**Phát hiện 2 — ESLint 10.8.0 làm vỡ lint, độc lập với TypeScript.** Sau khi hạ TypeScript xuống 6.0.3, `eslint` vẫn **fail exit 2**:

```
TypeError: Error while loading rule 'react/display-name':
contextOrFilename.getFilename is not a function
  at .../eslint-plugin-react/lib/util/version.js:31
```

Nguyên nhân gốc: `eslint-plugin-react@7.37.5` khai báo peer `eslint: "^3 || ... || ^9.7"` và **7.37.5 là bản MỚI NHẤT đang tồn tại trên npm** — chưa có bản nào hỗ trợ ESLint 10. Vì vậy **không** override/resolution nào cứu được; đây là chặn cứng ở thượng nguồn.

**Phiên bản được PIN (đã kiểm chứng cả 3 lệnh xanh):**

| Package | Pin | Ghi chú |
|---|---|---|
| `typescript` | **6.0.3** | Không phải 5.x LTS như phương án dự phòng ban đầu — xem lý do bên dưới |
| `eslint` | **9.39.5** | Bản 9.x mới nhất; đúng dải mà `eslint-config-next@16.3.0` hỗ trợ |
| `next` | 16.3.0 | |
| `react` / `react-dom` | 19.2.8 | |
| `tailwindcss` / `@tailwindcss/postcss` | 4.3.3 | |

**Vì sao TypeScript 6.0.3 chứ không phải 5.x LTS như DEC-002 dự phòng:** `6.0.3` là bản **stable** (không phải beta) và nằm **trong** peer range `<6.1.0` của `typescript-eslint@8.66.0`, nên nó thoả mãn ràng buộc thật sự đang chặn ta. Chính thông báo lỗi của typescript-eslint cũng chỉ sang "TypeScript 6.0 API". Lùi tận 5.x sẽ bỏ đi hai major mà không thu được lợi ích tương thích nào. Đây là **sai lệch có chủ ý** so với câu chữ "TypeScript 5.x LTS" trong DEC-002 gốc, và được ghi lại ở đây đúng theo yêu cầu "không im lặng downgrade".

**Bằng chứng baseline (chạy trên project đã có code Phase 1, không phải project rỗng):**

```
npm run typecheck  → exit 0
npm run lint       → exit 0   (0 error, 0 warning)
npm run build      → exit 0   (Next.js 16.3.0, Turbopack, 3/3 static pages)
```

**Ghi chú thêm — Turbopack:** `create-next-app@16.3.0` **không còn hỏi** về Turbopack và không còn cờ `--turbopack`; Next 16 dùng Turbopack làm bundler mặc định (`▲ Next.js 16.3.0 (Turbopack)`). Chỉ dẫn "trả lời No cho Turbopack" trong checkpoint cũ đã lỗi thời, không áp dụng được.

**Điều KHÔNG bị đánh đổi:** `strict: true` vẫn bật (kèm `noUncheckedIndexedAccess`), và `@typescript-eslint/no-explicit-any` được đặt mức **`error`**. Không rule nào bị tắt để lint chạy được — đúng yêu cầu số 5 của ISSUE-004 § Fix.

**Khi nào xét lại:** khi `eslint-plugin-react` phát hành bản hỗ trợ ESLint 10, **và** `typescript-eslint` hỗ trợ TS ≥ 7.1 (theo dõi typescript-eslint#10940). Lúc đó nâng cấp bằng một DEC mới, không sửa đè entry này.

---

## DEC-003

**Date:** 2026-08-07
**Decision:** Đọc dữ liệu bằng **Server Components**, ghi dữ liệu bằng **Server Actions**. **Không** xây tầng REST API riêng cho CRUD báo cáo. Ngoại lệ duy nhất là một Route Handler `GET /api/reports/[id]/share-image` vì nó phải trả về binary PNG.
**Reason:** Ít tầng hơn = ít chỗ quên kiểm tra quyền hơn. Server Action chạy trên server, dùng đúng session cookie của user nên RLS tự áp dụng. Một REST API riêng chỉ tạo thêm một bề mặt tấn công phải bảo vệ lại từ đầu. Đây cũng là guideline mà ui-ux-pro-max trả về cho stack `nextjs` ("Use Server Actions for mutations", "Fetch data in Server Components").
**Alternatives:** (a) Route Handlers cho mọi mutation — nhiều boilerplate, phải tự parse/validate/authorize lặp lại. (b) Gọi thẳng `supabase-js` từ client component — mất khả năng giữ logic nghiệp vụ ở server, và phải tin client hoàn toàn.
**Impact:** `docs/07-api-data-flow.md`, cấu trúc `features/*/actions.ts`, chiến lược test.
**Status:** APPROVED

---

## DEC-004

**Date:** 2026-08-07
**Decision:** **Row Level Security là biên giới bảo mật thật sự.** Middleware, layout guard và kiểm tra trong Server Action chỉ là *defense in depth* và trải nghiệm người dùng.
**Reason:** Master Spec §5 nói thẳng: "Không coi việc ẩn nút/menu phía frontend là security". Nếu chỉ chặn ở tầng ứng dụng thì bất kỳ lỗi logic nào, hoặc bất kỳ ai cầm anon key gọi thẳng PostgREST, đều đọc được dữ liệu người khác. RLS chặn tại tầng database nên không có đường vòng.
**Alternatives:** (a) Chỉ kiểm tra ở tầng app, tắt RLS cho nhanh — bị Master Spec §71 cấm và là lỗ hổng thật. (b) Chỉ RLS, bỏ hết guard ở app — người dùng sẽ thấy trang trắng/lỗi thay vì thông báo tử tế, UX kém.
**Impact:** Mọi migration, mọi bảng mới, `docs/06-auth-permissions.md`, bộ test RLS.
**Status:** APPROVED

---

## DEC-005

**Date:** 2026-08-07
**Decision:** `SUPABASE_SERVICE_ROLE_KEY` **chỉ** được dùng cho các thao tác quản trị tài khoản (`auth.admin.createUser`, `auth.admin.updateUserById`). **Tuyệt đối không** dùng service role client để đọc/ghi `daily_reports` hay `profiles`.
**Reason:** Service role bỏ qua toàn bộ RLS. Mỗi lần dùng nó là một lần tự tay tháo biên giới bảo mật. Việc tạo user bắt buộc phải có nó (Supabase Auth Admin API), còn mọi việc khác thì server client dưới session của user đã đủ.
**Alternatives:** Dùng service role cho các truy vấn admin cho "tiện" — sẽ khiến RLS không còn được kiểm chứng ở đường dữ liệu admin, và một lỗi thiếu điều kiện `where` là lộ toàn bộ dữ liệu.
**Impact:** `lib/supabase/admin.ts` (có `import 'server-only'`), code review checklist, NFR-005.
**Status:** APPROVED

---

## DEC-006

**Date:** 2026-08-07
**Decision:** Hàm `public.is_admin()` được khai báo `STABLE SECURITY DEFINER SET search_path = public, pg_temp`, và trong policy luôn được gọi dưới dạng `(select public.is_admin())`.
**Reason:** Hai lý do kỹ thuật cụ thể:
1. **Chống đệ quy vô hạn** — policy trên `profiles` cần biết user có phải admin không, mà thông tin đó nằm trong chính `profiles`. Nếu hàm không `SECURITY DEFINER`, việc đọc `profiles` lại kích hoạt policy đó, gây đệ quy và Postgres báo lỗi.
2. **Hiệu năng** — bọc trong `(select ...)` khiến Postgres nâng biểu thức thành InitPlan, đánh giá **một lần cho cả câu lệnh** thay vì một lần cho **mỗi dòng**.
`SET search_path` là bắt buộc với hàm `SECURITY DEFINER` để chống tấn công chiếm quyền qua schema giả.
**Alternatives:** (a) Nhét `role` vào custom JWT claim qua Auth Hook — nhanh hơn nữa nhưng thêm cấu hình, và claim bị "cũ" cho tới khi token refresh (nguy hiểm khi vừa deactivate một tài khoản). (b) Không có hàm, viết subquery trực tiếp trong từng policy — lặp code, vẫn đệ quy.
**Impact:** `supabase/migrations/0003_functions_triggers.sql`, `0004_rls_policies.sql`, ISSUE-005.
**Status:** APPROVED

### DEC-006 — KẾT LUẬN PHASE 2 (đã chạy thật, 2026-08-07)

`docs/02 §11 CẢNH BÁO 2` đặt ra một rủi ro chưa được kiểm chứng: `force row level security` áp policy cho **cả chủ sở hữu bảng**, nên có thể (1) làm đệ quy `42P17` quay lại dù đã `SECURITY DEFINER`, và (2) làm `handle_new_user()` **không INSERT được** vào `profiles` (bảng cố ý không có INSERT policy) ⇒ `auth.admin.createUser` hỏng ⇒ UC-17 vỡ. Tài liệu yêu cầu chạy thật hai kịch bản trước khi quyết chọn lối thoát (A) hay (B).

**Đã chạy thật trên Supabase local (Postgres 17.6.1.156). Rủi ro KHÔNG xảy ra. Không cần lối thoát nào.**

```text
select rolname, rolsuper, rolbypassrls from pg_roles where rolname in (...);

    rolname        | rolsuper | rolbypassrls
-------------------+----------+--------------
 anon              | f        | f
 authenticated     | f        | f
 postgres          | f        | t      ← owner của bảng và của hàm
 service_role      | f        | t
 supabase_admin    | t        | t
 supabase_auth_admin | f      | f
```

Vì `postgres` — chủ sở hữu của `public.profiles` và của cả 7 function/trigger — **có `rolbypassrls`**, `FORCE ROW LEVEL SECURITY` không áp lên nó. Do đó:

- `is_admin()` chạy `SECURITY DEFINER` dưới quyền `postgres` ⇒ truy vấn `profiles` bên trong không bị áp lại policy ⇒ **không đệ quy**. Khoá bằng test `db-functions.test.ts › DEC-006 — SECURITY DEFINER nên KHÔNG gây đệ quy 42P17`.
- `handle_new_user()` **INSERT được** vào `profiles` dù bảng không có INSERT policy nào. Khoá bằng test `daily-reports.constraints.test.ts › handle_new_user() › sinh được profiles dưới FORCE RLS`, và mọi `createTestUser()` trong bộ test đều đi qua `auth.admin.createUser` thật.

**Kết luận:** giữ nguyên `enable` + `force row level security` trên cả hai bảng, đúng thiết kế gốc. Lối thoát (A) *(bỏ `force` trên `profiles`)* và (B) *(đưa `role` vào custom JWT claim)* **không được dùng** và vẫn nằm nguyên trong `docs/02 §11` như phương án dự phòng nếu Supabase đổi quyền của role `postgres` trong tương lai.

Cách khai báo hàm cũng được khoá bằng test: `provolatile = 's'`, `prosecdef = true`, và `proconfig` chứa `search_path=` cho cả `is_admin()` lẫn `is_active_sales()`.

---

## DEC-007

**Date:** 2026-08-07
**Decision:** Phần trăm hoàn thành (achievement) **không bao giờ được lưu vào database**. Luôn tính tại runtime từ `target_*` và `actual_*` bằng `lib/kpi.ts`.
**Reason:** Master Spec §23 yêu cầu. Giá trị dẫn xuất mà đem lưu thì sẽ có ngày lệch với dữ liệu gốc (sửa actual mà quên tính lại). Ngoài ra công thức còn đang chờ chốt trường hợp `target = 0` (OQ-11) — lưu sẵn nghĩa là phải backfill toàn bộ khi đổi quy tắc.
**Alternatives:** (a) Lưu cột `achievement_pct` — rủi ro lệch dữ liệu, phải backfill. (b) Dùng generated column trong Postgres — không xử lý được nhánh `target=0 → hiển thị "—"` vì đó là quy tắc hiển thị, không phải số.
**Impact:** `docs/02-database-design.md` (mục Persisted vs Derived), `lib/kpi.ts`, BR-011.
**Status:** APPROVED

---

## DEC-008

**Date:** 2026-08-07
**Decision:** Tiền lưu dưới dạng **`bigint` số nguyên VND**. Không dùng `numeric`, không dùng `float`, không lưu chuỗi đã format. Định dạng chỉ diễn ra ở tầng hiển thị bằng `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })`.
**Reason:** Master Spec §26 yêu cầu không lưu chuỗi đã format. VND không có đơn vị nhỏ hơn đồng nên số nguyên là biểu diễn tự nhiên, không có sai số dấu phẩy động. `bigint` chứa thoải mái doanh thu 12 chữ số (trần BR-017 là 100 tỷ). `Intl` có sẵn trong runtime, không thêm dependency.
**Alternatives:** (a) `numeric(15,0)` — đúng nhưng chậm hơn và không cần phần thập phân. (b) `float8` — sai số, tuyệt đối không dùng cho tiền. (c) Lưu `"125.000.000 ₫"` — không cộng/so sánh/aggregate được.
**Impact:** Schema, `lib/currency.ts`, mọi form nhập tiền, export CSV.
**Status:** APPROVED

---

## DEC-009

**Date:** 2026-08-07
**Decision:** Ngày nghiệp vụ tính bằng `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())` (trả thẳng chuỗi `YYYY-MM-DD`) ở tầng ứng dụng, và bằng `(now() at time zone 'Asia/Ho_Chi_Minh')::date` ở tầng database. **Không thêm thư viện timezone.**
**Reason:** Master Spec §27 bắt buộc ngày nghiệp vụ là ngày tại Việt Nam. `Intl` có sẵn trong Node 22 và mọi trình duyệt hiện đại với đầy đủ dữ liệu IANA; locale `en-CA` cho ra đúng định dạng ISO. Thêm `date-fns-tz` hoặc `luxon` chỉ để làm một việc này là ~20KB thừa cho một app dùng trên mạng di động (NFR-001, NFR-003).
**Alternatives:** (a) `date-fns-tz` / `luxon` / `dayjs+utc+timezone` — chính xác tương đương, nặng hơn. (b) Cộng thủ công `+7h` vào UTC — sai về nguyên tắc và dễ hỏng, dù VN hiện không có DST.
**Impact:** `lib/date.ts`, `public.vn_today()`, NFR-011, bộ unit test biên 23:00–01:00.
**Status:** APPROVED

---

## DEC-010

**Date:** 2026-08-07
**Decision:** Ảnh báo cáo 9:16 (1080×1920 PNG) được sinh **ở phía server** bằng `ImageResponse` của `next/og` (Satori), phục vụ qua Route Handler `GET /api/reports/[id]/share-image`. **Không** chụp màn hình DOM.
**Reason:** Đây là quyết định kỹ thuật quan trọng nhất của tính năng và cần nêu rõ vì sao đi khác gợi ý trong Master Spec §13:
1. **Zalo in-app webview.** Sales sẽ mở app từ link trong Zalo. Kỹ thuật `foreignObject` + canvas mà `html-to-image`/`html2canvas` dùng là chỗ vỡ kinh điển trên webview nhúng và Safari iOS. Server-side render không phụ thuộc trình duyệt.
2. **Tailwind v4 sinh màu `oklch()`.** Các thư viện capture DOM xử lý color space này không ổn định.
3. **Font tiếng Việt.** Chụp DOM đòi web font phải load xong trước khi chụp, nếu không chữ bị fallback và **mất dấu**. Server nhúng file font là tất định.
4. **Kích thước tất định.** Luôn đúng 1080×1920 bất kể devicePixelRatio của máy.
5. **Bundle client.** Không thêm ~50KB JS vào app mà Sales tải qua mạng di động (NFR-003).
**Alternatives:** (a) `html-to-image` client-side — đúng gợi ý Master Spec, nhưng 5 rủi ro trên đều hiện hữu. (b) `html2canvas` — cũ hơn, xử lý CSS hiện đại kém hơn `html-to-image`. (c) Puppeteer/Playwright server-side — vượt giới hạn Vercel Free về kích thước function và thời gian chạy.
**Impact:** `app/api/reports/[id]/share-image/route.ts`, `features/report-share/DailyReportShareCard.tsx`, Phase 6, ISSUE-002.
**Ràng buộc đã ghi nhận:** Satori chỉ hỗ trợ tập con CSS (flexbox, **không có grid**; phần tử có nhiều con phải khai báo `display:flex`), và phải commit một file font có bộ dấu tiếng Việt (Inter hoặc Be Vietnam Pro, subset `latin` + `vietnamese`) để đọc bằng `fs` ở Node runtime.
**Fallback đã ghi nhận:** Nếu đầu Phase 6 chứng minh Satori không dựng nổi layout cần thiết → chuyển sang `html-to-image` với `next/dynamic({ ssr: false })`, chờ `document.fonts.ready` trước khi chụp, và một bảng màu hex thuần (không `oklch`) riêng cho thẻ share. Khi đó phải tạo `DEC` mới, **không sửa lén entry này**.
**Status:** APPROVED (technical, người dùng có quyền veto)

---

## DEC-011

**Date:** 2026-08-07
**Decision:** Phân phối ảnh bằng **Web Share API** (`navigator.share({ files: [...] })`) khi trình duyệt hỗ trợ, fallback sang `<a download>` khi không.
**Reason:** Mục tiêu thật của tính năng là "gửi lên Zalo". Web Share API mở thẳng share sheet của hệ điều hành, trong đó có Zalo — một chạm là xong. Nếu chỉ cho tải file, Sales phải: tải → mở Zalo → chọn ảnh → tìm trong thư viện. Fallback `<a download>` với `Content-Disposition: attachment` đảm bảo vẫn dùng được trên desktop và trên webview không hỗ trợ.
**Alternatives:** (a) Chỉ download — UX kém hơn hẳn trên đúng thiết bị mục tiêu. (b) Deep link `zalo://` — không có API công khai ổn định để đính kèm file.
**Impact:** `features/report-share/`, FR-020, checklist kiểm thử thiết bị thật, ISSUE-003.
**Status:** APPROVED

---

## DEC-012

**Date:** 2026-08-07
**Decision:** Design system: **Swiss Modernism 2.0** làm nền + **Executive Dashboard** cho phần KPI + **Flat Design** cho cảm giác tương tác. **Bác bỏ** kết quả tự động "Exaggerated Minimalism" mà công cụ `ui-ux-pro-max --design-system` trả về.
**Reason:** Công cụ đã được **chạy thật** hai lần với hai bộ từ khoá khác nhau và cả hai lần đều trả về style "Exaggerated Minimalism", mà chính dữ liệu của công cụ ghi `Best For: Fashion, architecture, portfolios, agency landing pages, luxury brands, editorial` và effects `font-size: clamp(3rem, 10vw, 12rem); font-weight: 900; massive whitespace`. Đó là ngôn ngữ thị giác cho trang giới thiệu thương hiệu, không phải cho công cụ nhập liệu một tay ngoài thị trường. Chính skill có quy tắc `style-match` ("Match style to product type") và hướng dẫn "Can't decide on style/color → re-run with different keywords", nên đã tra lại bằng `--domain style` và lấy kết quả xếp hạng 1: Swiss Modernism 2.0 (`Accessibility: WCAG AAA`, `Performance: Excellent`, `Tailwind 10/10`, `Complexity: Low`).
**Alternatives:** (a) Dùng nguyên "Exaggerated Minimalism" — sai loại sản phẩm. (b) **Bento Box Grid** (xếp hạng 2) — card kích thước lệch nhau làm khó quét mắt một bảng 4 chỉ tiêu cố định. (c) **Glassmorphism** (xếp hạng 6) — chính công cụ gắn cờ `Performance ⚠ Good` và `Accessibility ⚠ Ensure 4.5:1`, lại không đọc được ngoài nắng, tức là hỏng đúng bối cảnh sử dụng thật.
**Impact:** `docs/05-ui-ux-design.md`, toàn bộ component UI.
**Status:** APPROVED

---

## DEC-013

**Date:** 2026-08-07
**Decision:** Chỉ dùng **một** font: **Inter** (variable, subset `latin` + `vietnamese`, nạp qua `next/font/google` với `display: swap`). Căn cột số bằng `font-variant-numeric: tabular-nums` thay vì thêm một font mono.
**Reason:** Đi khác kết quả xếp hạng 1 của công cụ (cặp "Dashboard Data" = Fira Code + Fira Sans), vì ba lý do:
1. Một họ font thay vì hai ≈ giảm một nửa payload font — Sales dùng mạng di động ngoài thị trường (quy tắc `font-loading`/`font-preload` mục §3 Performance của skill).
2. Inter có bộ dấu tiếng Việt đầy đủ và đã được kiểm chứng rộng rãi.
3. Mục đích của cặp Mono+Sans là căn thẳng cột số — `tabular-nums` đạt đúng mục đích đó mà không tốn thêm font (quy tắc `number-tabular` mục §6 của skill).
Kết quả xếp hạng 4 của chính công cụ ("Minimal Swiss" = Inter, `Best For: Dashboards, admin panels, enterprise apps`) mô tả đúng sản phẩm này hơn.
**Alternatives:** (a) Fira Code + Fira Sans như công cụ đề xuất — nặng gấp đôi, lợi ích trùng với `tabular-nums`. (b) Be Vietnam Pro — thiết kế riêng cho tiếng Việt, nhưng ít bộ trọng lượng biến thiên hơn và không có lợi thế rõ cho giao diện số liệu. Vẫn giữ làm lựa chọn thay thế nếu Inter gặp vấn đề hiển thị dấu ở font nhúng của thẻ share.
**Impact:** `app/layout.tsx`, `tailwind.config`, file font nhúng cho DEC-010.
**Status:** APPROVED

---

## DEC-014

**Date:** 2026-08-07
**Decision:** Bảng màu lấy từ palette "Analytics Dashboard" của skill nhưng **sửa lại những giá trị đo contrast không đạt**. Cụ thể: chữ amber trên nền trắng dùng `#B45309` (không dùng `#D97706`); nền success có chữ trắng dùng `#15803D` (không dùng `#16A34A`); nền destructive có chữ trắng dùng `#B91C1C`; viền của **control tương tác** dùng `#64748B` (không dùng `#DBEAFE` hay `#94A3B8`).
**Reason:** Toàn bộ tỉ lệ contrast đã được **tính bằng công thức WCAG relative luminance**, không ước lượng bằng mắt. Kết quả đo:

| Cặp màu | Tỉ lệ | Kết luận |
|---|---:|---|
| `#D97706` trên `#FFFFFF` | 3.19:1 | **Trượt** AA cho chữ thường → chỉ dùng làm nền/đồ hoạ |
| `#B45309` trên `#FFFFFF` | 5.02:1 | Đạt AA → dùng làm **chữ** amber |
| Trắng trên `#16A34A` | 3.30:1 | **Trượt** AA cho chữ thường |
| Trắng trên `#15803D` | 5.02:1 | Đạt AA |
| Trắng trên `#B91C1C` | 6.47:1 | Đạt AA |
| `#DBEAFE` trên `#FFFFFF` | 1.22:1 | **Trượt** WCAG 1.4.11 (cần ≥3:1) cho viền control |
| `#94A3B8` trên `#FFFFFF` | 2.56:1 | **Trượt** |
| `#64748B` trên `#FFFFFF` | 4.76:1 | Đạt |
| `#0F172A` trên `#F8FAFC` | 17.06:1 | AAA |
| Trắng trên `#1E40AF` | 8.72:1 | AAA |

Palette do công cụ sinh ra là điểm khởi đầu tốt nhưng không phải bản kiểm định — NFR-007 yêu cầu WCAG 2.2 AA thật.
**Alternatives:** Dùng nguyên palette gốc — sẽ trượt kiểm định a11y ở Phase 11 và phải sửa lại toàn bộ token khi UI đã dựng xong, đắt hơn nhiều.
**Impact:** `app/globals.css` (CSS custom properties), `docs/05-ui-ux-design.md`, kiểm thử axe.
**Status:** APPROVED

---

## DEC-015

**Date:** 2026-08-07
**Decision:** **Không dùng GSAP** hay bất kỳ thư viện animation nào. Chuyển động chỉ bằng CSS `transition` trên `transform` và `opacity`, thời lượng 150–200ms, và luôn tôn trọng `prefers-reduced-motion`.
**Reason:** Công cụ ui-ux-pro-max có gợi ý một snippet GSAP ScrollTrigger kèm design system. Nhưng dial motion đặt ở mức 2/10 và Master Spec §4 nói rõ "Không animation dư thừa". Toàn bộ nhu cầu chuyển động của app này (nút nhấn, toast, mở/đóng) nằm gọn trong CSS. Thêm GSAP là thêm ~70KB JS cho một app dùng trên mạng di động, đổi lấy đúng con số 0 giá trị nghiệp vụ.
**Alternatives:** (a) GSAP như gợi ý — không tương xứng. (b) Framer Motion — nhẹ hơn GSAP nhưng vẫn thừa cho nhu cầu này.
**Impact:** `package.json`, `docs/05-ui-ux-design.md`, NFR-003.
**Status:** APPROVED

---

## DEC-016

**Date:** 2026-08-07
**Decision:** **Không làm dark mode ở v1.** App chỉ có light theme. Ngoại lệ duy nhất: thẻ ảnh chia sẻ 9:16 vốn là nền tối cố định (`#0B1220`) vì lý do thiết kế, không phải theme.
**Reason:** Dark mode nhân đôi số cặp màu phải kiểm định contrast, nhân đôi khối lượng QA thị giác, và không giải quyết vấn đề nào của người dùng ngay lúc này. Sales dùng ngoài trời ban ngày — light theme độ tương phản cao là đúng bối cảnh. Nói rõ ở đây để đây là **quyết định**, không phải nợ kỹ thuật bị bỏ quên.
**Alternatives:** Làm dark mode ngay — tăng phạm vi MVP mà không có yêu cầu.
**Impact:** `docs/05-ui-ux-design.md`, `docs/10-future-roadmap.md`.
**Status:** APPROVED

---

## DEC-017

**Date:** 2026-08-07
**Decision:** Đường dẫn đăng nhập là `/login`, dùng route group `app/(auth)/login/`. Master Spec §49 nêu ví dụ `/auth/login`.
**Reason:** Master Spec ghi rõ đó là "Ví dụ routes". Route group `(auth)` không xuất hiện trong URL nên vẫn tổ chức được code theo nhóm mà URL ngắn gọn. Hệ thống chỉ có đúng một trang auth (không có register/forgot public) nên tiền tố `/auth/` không mang thêm thông tin.
**Alternatives:** Dùng `/auth/login` đúng chữ trong ví dụ — dài hơn mà không lợi ích.
**Impact:** `app/(auth)/login/page.tsx`, middleware matcher, mọi redirect, test E2E.
**Status:** APPROVED

---

## DEC-018

**Date:** 2026-08-07
**Decision:** Điều hướng: bottom tab bar trên mobile (Sales 3 mục, Admin 4 mục — mỗi mục có **cả icon và nhãn chữ**), chuyển sang sidebar trái cố định từ breakpoint 1024px. **Không bao giờ** hiển thị đồng thời hai kiểu.
**Reason:** Áp dụng trực tiếp các quy tắc của skill: `bottom-nav-limit` (tối đa 5 mục, có nhãn), `nav-label-icon` (icon-only làm giảm khả năng khám phá), `adaptive-navigation` (màn ≥1024px nên dùng sidebar), `avoid-mixed-patterns` (không trộn Tab + Sidebar + Bottom Nav cùng một cấp). Admin chủ yếu làm việc trên desktop, Sales chủ yếu trên điện thoại — một hệ điều hướng phục vụ đúng cả hai.
**Alternatives:** (a) Hamburger menu trên mobile — giấu điều hướng, thêm một chạm cho tác vụ hằng ngày. (b) Chỉ top nav — khó với tới bằng ngón cái trên điện thoại lớn.
**Impact:** `components/layout/`, `docs/05-ui-ux-design.md`.
**Ràng buộc kèm theo:** bottom bar phải có `padding-bottom: env(safe-area-inset-bottom)` và nội dung trang phải có `padding-bottom` bù chiều cao bar (quy tắc `safe-area-awareness`, `fixed-element-offset`).
**Status:** APPROVED

---

## DEC-019

**Date:** 2026-08-07
**Decision:** Bảng đối chiếu Cam kết / Thực đạt / % hiển thị dạng **4 thẻ xếp dọc** trên mobile, và chỉ chuyển sang `<table>` thật từ breakpoint 768px.
**Reason:** Bảng 4 cột (Chỉ tiêu | Cam kết | Thực đạt | Hoàn thành) chứa số tiền VND dài không vừa màn 375px. Quy tắc `horizontal-scroll` của skill cấm cuộn ngang trên mobile, và Master Spec §4 cấm "thiết kế như desktop dashboard rồi thu nhỏ". Đây chính là màn hình mà Sales nhìn nhiều nhất nên không được thoả hiệp.
**Alternatives:** (a) `<table>` cuộn ngang — vi phạm quy tắc, khó đọc. (b) Thu nhỏ chữ cho vừa — vi phạm `readable-font-size` (tối thiểu 16px trên mobile).
**Impact:** `features/report/ComparisonTable.tsx`, `docs/05-ui-ux-design.md`.
**Status:** APPROVED

---

## DEC-020

**Date:** 2026-08-07
**Decision:** Enum `report_status` chỉ có **hai** giá trị: `MORNING_SUBMITTED` và `COMPLETED`. Không thêm `DRAFT`, không thêm `LOCKED`.
**Reason:** Master Spec §10 cho phép thêm nhưng nhấn mạnh "chỉ khi thật sự cần" và "Không làm workflow phức tạp vô ích". `DRAFT` không cần vì bản nháp được giữ ở localStorage phía client (FR-035), server chỉ nhận bản đã gửi. `LOCKED` không cần vì ở phương án mặc định, chính điều kiện `status = 'MORNING_SUBMITTED'` trong RLS policy đã tự khoá báo cáo ngay khi nó chuyển sang `COMPLETED` — trạng thái khoá là *dẫn xuất*, không cần lưu.
**Alternatives:** Thêm cả 4 trạng thái ngay từ đầu — thêm nhánh xử lý, thêm test, thêm chỗ sai, chưa có nhu cầu thật.
**Impact:** Schema, `guard_report_transition()`, UI dashboard.
**Lưu ý:** Nếu OQ-04 trả lời là "Admin được quyền khoá/mở khoá", sẽ cần `LOCKED` hoặc một cột `locked_at` — khi đó tạo DEC mới và đặt entry này thành `SUPERSEDED`.
**Status:** APPROVED

---

## DEC-021

**Date:** 2026-08-07
**Decision:** **Không dùng Supabase Storage** để lưu ảnh báo cáo. Ảnh được sinh và stream trực tiếp về client, không lưu lại ở đâu.
**Reason:** Master Spec §13 nói "Không bắt buộc lưu ảnh lên Supabase". Ảnh là hàm thuần của dữ liệu báo cáo — có thể tạo lại bất cứ lúc nào. Lưu ảnh sẽ tốn quota Storage của gói Free, tạo thêm một nguồn sự thật có thể lệch với dữ liệu (sửa báo cáo mà ảnh cũ vẫn còn), và phát sinh nhu cầu bảo mật cho bucket.
**Alternatives:** Lưu ảnh và trả link — chỉ có ý nghĩa nếu cần chia sẻ link công khai, mà đây là app nội bộ.
**Impact:** Kiến trúc, NFR-013.
**Status:** APPROVED

---

## DEC-022

**Date:** 2026-08-07
**Decision:** Test database và test RLS chạy trên **Supabase local** (khởi động bằng Supabase CLI), **không bao giờ** chạy trên project staging/production.
**Reason:** Test RLS phải tạo user thật, đăng nhập thật, và cố tình thực hiện các thao tác trái phép. Chạy những việc đó trên dữ liệu thật là không chấp nhận được. Supabase local dựng đúng cùng bộ migration nên kết quả có giá trị tương đương.
**Alternatives:** Test trên một project Supabase riêng trên cloud — tốn thêm project, chậm hơn, vẫn có rủi ro cấu hình sai trỏ nhầm.
**Impact:** `docs/08-testing-strategy.md`, cấu hình CI.
**Status:** APPROVED

---

## DEC-023

**Date:** 2026-08-07
**Decision:** Cấu trúc thư mục:
```
app/          route, layout, page — không chứa business logic
components/   ui/ (primitive không biết nghiệp vụ) + layout/
features/     <tên nghiệp vụ>/ — component + actions + queries của một nghiệp vụ
lib/          kpi, currency, date, validation (Zod), supabase clients, auth helpers
services/     truy cập dữ liệu thuần — nhận supabase client làm tham số, trả typed data
types/        database.types.ts (generate) + domain types
supabase/     migrations/ + seed.sql + config.toml
docs/         tài liệu kiểm soát dự án
```
Hai quy tắc cứng: **business logic không nằm trong component**, **data access không nằm trong component**.
**Reason:** Bám sát gợi ý Master Spec §36 và yêu cầu tách UI / data access / validation / business logic / permission / formatting / image export. `services/` nhận client làm tham số (thay vì tự tạo) để cùng một hàm chạy được dưới cả server client lẫn test client, và để không có chỗ nào lỡ tay dùng service-role client.
**Alternatives:** (a) Cấu trúc phẳng theo loại (`components/`, `hooks/`, `utils/`) — file liên quan nằm rải rác khi tính năng lớn dần. (b) Feature-sliced nghiêm ngặt — thừa tầng cho quy mô MVP này.
**Impact:** Toàn bộ codebase, `AGENTS.md`.
**Status:** APPROVED

---

## DEC-024

**Date:** 2026-08-07
**Decision:** PWA chỉ ở mức **manifest + icon + `display: standalone`** để Sales "Add to Home Screen". **Không** service worker, **không** offline sync ở v1.
**Reason:** Master Spec §29 nói "Không bắt buộc offline sync trong MVP". Offline sync cho dữ liệu có ràng buộc `UNIQUE(sales_id, report_date)` kéo theo bài toán giải quyết xung đột — đắt và dễ sai. Add to Home Screen đã mang lại phần lớn giá trị (mở nhanh như app, không có thanh địa chỉ) với chi phí gần bằng không.
**Alternatives:** PWA đầy đủ có offline queue — phức tạp gấp bội, rủi ro mất/nhân bản dữ liệu.
**Impact:** `app/manifest.ts`, `docs/10-future-roadmap.md`.
**Ghi chú:** Rủi ro mất dữ liệu khi mạng chập chờn đã được xử lý ở mức nhẹ hơn bằng draft localStorage (FR-035) — server vẫn là nguồn sự thật duy nhất (Master Spec §30).
**Status:** APPROVED

---

## DEC-025

**Date:** 2026-08-07
**Decision:** Khi `target = 0`:
- `actual = 0` → hiển thị **`100,0%`**, status `EXCEEDED` (đã làm đúng cam kết).
- `actual > 0` → **hiển thị số vượt tuyệt đối có dấu cộng và đơn vị**, ví dụ `+3 xe`, `+2 điểm`, `+5 khách`, `+3.000.000 ₫`; nhãn "Vượt kế hoạch"; `percent = null`.
- **Tuyệt đối không** hiển thị `NaN` hay `∞` ở bất kỳ đâu.
- Trong mọi phép **tổng hợp của Admin** (achievement trung bình, ngày đạt KPI), dòng có `target = 0 && actual > 0` bị **loại khỏi mẫu số**, không được quy thành 0% hay 100%.

**Reason:** Master Spec §9 bắt buộc "Trường hợp target = 0 phải có business rule rõ ràng trước khi chốt" và cấm `NaN`/`Infinity`. `x/0` không xác định về mặt toán học nên bắt buộc phải là một quy ước nghiệp vụ. Người dùng đã chọn phương án này (2026-08-07) vì nó **vừa trung thực vừa còn thông tin**: không bịa ra một con số phần trăm vô nghĩa, đồng thời vẫn cho người đọc biết đã vượt **bao nhiêu**. Phương án hiển thị `—` tuy trung thực nhưng làm mất thông tin; phương án quy về `100%` che mất việc cam kết quá thấp.
**Alternatives:** (a) Hiển thị `—` + nhãn "Vượt kế hoạch" — trung thực nhưng cụt thông tin. (b) Quy cả hai trường hợp về `100%` — đơn giản nhất nhưng che việc cam kết 0 mà vẫn được tính "đạt" mỗi ngày. (c) Cấm `target = 0` ở validation (bắt tối thiểu 1) — không bao giờ gặp chia-cho-0, nhưng ngày đi bảo hành/chăm sóc khách thật sự không có mục tiêu bán xe thì Sales buộc phải khai số giả, làm nhiễu số liệu.
**Impact:** `lib/kpi.ts` (`AchievementResult` phải mang thêm trường hiển thị số vượt và đơn vị), bảng đối chiếu ở `docs/05 §7.3`, thẻ ảnh 9:16, aggregate của Admin, bộ unit test cho `calculateAchievement`.
**Ràng buộc kèm theo:** đơn vị hiển thị khác nhau theo chỉ tiêu — `xe` (doanh số), `điểm` (viếng thăm), `khách` (khách hàng), và **định dạng tiền VND đầy đủ** cho doanh thu (dùng `formatCurrencyVND`, không rút gọn). Vì vậy `calculateAchievement()` phải nhận thêm tham số đơn vị, hoặc trả về số vượt thô để tầng hiển thị tự format — chốt cách cài đặt ở Phase 5.
**Status:** **APPROVED** (người dùng xác nhận 2026-08-07 — OQ-11 đã trả lời)

---

## DEC-026

**Date:** 2026-08-07
**Decision:** Bộ quy tắc sửa/xoá, **đã được người dùng xác nhận toàn bộ**:
- **BR-019 / OQ-04** — Sales chỉ sửa được báo cáo của chính mình khi `status = 'MORNING_SUBMITTED'`. Khi đã `COMPLETED` thì **khoá vĩnh viễn**, kể cả trong cùng ngày.
- **BR-020 / OQ-05** — Admin **không** sửa số liệu báo cáo của Sales. Không có policy `UPDATE` nào cho Admin trên `daily_reports`.
- **BR-021 / OQ-12** — Báo cáo chỉ được tạo/sửa cho **đúng ngày hôm nay** theo giờ Việt Nam. Không nhập bù ngày cũ, không giới hạn giờ trong ngày.
- **BR-013 / OQ-13** — **Không xoá báo cáo.** Không cấp `DELETE` policy, không `GRANT DELETE` cho `authenticated`. Không có cột `deleted_at` (không soft delete).
**Reason:** Cả bốn nằm trong nhóm Master Spec §31 và §32 yêu cầu **phải hỏi**; người dùng đã trả lời ngày 2026-08-07 và chọn đúng phương án chặt nhất. Khoá sau khi `COMPLETED` bảo vệ đúng điểm nhạy cảm — Sales đã xuất ảnh gửi Zalo rồi thì số liệu trên hệ thống không được khác ảnh đã gửi. Không cho Admin sửa nghĩa là **chưa cần audit log** (AF-12) trong v1, giữ hệ thống gọn.
**Alternatives:** (a) Cho sửa trong ngày — tiện cho Sales nhưng số liệu Admin đang xem có thể đổi dưới chân. (b) Cho Admin sửa — bắt buộc phải có audit log trước, nếu không không ai chứng minh được số liệu gốc.
**Impact:** RLS policy `reports_update_own_open` (điều kiện `status = 'MORNING_SUBMITTED'` giữ nguyên và **chính nó** là cơ chế khoá), `guard_report_transition()`, không tồn tại action `adminUpdateReport` / `deleteReport`, UI ẩn nút Sửa khi `COMPLETED`.
**Hệ quả vận hành cần lưu ý:** vì **không ai** sửa được sau khi hoàn tất, Sales nhập sai số thì cách xử lý duy nhất là ghi nhận ngoài hệ thống. Nếu thực tế vận hành thấy việc này gây khó, hãy mở lại OQ-04/OQ-05 bằng một `DEC` mới — **và phải làm audit log (AF-12) trước khi bật quyền sửa**.
**Status:** **APPROVED** (người dùng xác nhận 2026-08-07 — OQ-04, OQ-05, OQ-12, OQ-13 đã trả lời)

---

## DEC-027

**Date:** 2026-08-07
**Decision:** Khởi tạo git repository kèm `.gitignore` chuẩn Next.js chặn `.env*` (trừ `.env.example`), `node_modules/`, `.next/`, `test-results/`, `playwright-report/`. *(Mốc thời gian đã được **DEC-028** điều chỉnh: git được init ngay ở Phase 0 thay vì Phase 1, vì remote GitHub đã có sẵn. Yêu cầu `.gitignore` phải tồn tại trước commit đầu tiên vẫn giữ nguyên và **đã được kiểm chứng thực nghiệm** bằng cách thử `git add` một file `.env.local` giả — nó không được stage.)*
**Reason:** Không có version control thì không có đường lùi. Cần đặt `.gitignore` **trước** commit đầu tiên để không bao giờ có nguy cơ một file `.env.local` lọt vào lịch sử git — đã lọt rồi thì gỡ ra rất phiền và secret coi như đã lộ.
**Alternatives:** Init ngay ở Phase 0 — cũng được, nhưng Phase 0 chỉ có tài liệu; xem DEC-028 đã điều chỉnh việc này.
**Impact:** Phase 1, `docs/09-deployment.md`.
**Status:** APPROVED

---

## DEC-028

**Date:** 2026-08-07
**Decision:** Remote GitHub của dự án là `https://github.com/LeDuyKhangZz/BikeForce-Bicycle-Sales-Management.git`. Người dùng đã cấp **quyền đứng (standing authorization)**: push lên remote này sau mỗi lần hoàn tất code, **không cần hỏi lại**. Vì có remote rồi nên git được khởi tạo **ngay ở Phase 0** để đẩy bộ tài liệu lên (điều chỉnh mốc thời gian của DEC-027, nhưng giữ nguyên yêu cầu `.gitignore` phải có trước commit đầu tiên).
**Reason:** Người dùng yêu cầu trực tiếp ngày 2026-08-07 và nói rõ là lưu lại để lần sau khỏi phải hỏi. Đẩy bộ tài liệu Phase 0 lên ngay giúp công sức phân tích không nằm duy nhất trên một máy.
**Alternatives:** Chờ tới Phase 1 mới init — trì hoãn vô ích khi remote đã có sẵn.
**Impact:** Quy trình làm việc mỗi phase, `AGENTS.md` (mục Git rules), `CLAUDE.md`.
**Ràng buộc bắt buộc:** (a) `.gitignore` phải chặn `.env*` **trước** commit đầu tiên; (b) quyền push **không** bao gồm quyền đẩy secret lên — service role key và `.env.local` tuyệt đối không được commit; (c) không dùng `--force` lên nhánh chính nếu người dùng không yêu cầu riêng.
**Status:** APPROVED

---

## DEC-029

**Date:** 2026-08-07
**Decision:** "Mục tiêu viếng thăm" và "Đã viếng thăm" được mô hình hoá thành **cả hai**: một cột số đếm được bắt buộc (`target_visit_points` / `actual_visit_points`) **và** một cột văn bản tuỳ chọn (`visit_purpose` / `actual_route`).
**Reason:** Bảng đối chiếu mà Master Spec §9 quy định có dòng "Viếng thăm" kèm cột "Hoàn thành %". Muốn tính được phần trăm thì bắt buộc phải có một con số — nếu "Mục tiêu viếng thăm" chỉ là văn bản mô tả mục đích chuyến đi thì dòng đó không thể có %, và bảng đối chiếu trong Master Spec sẽ không thực hiện được đúng như mô tả. Giữ thêm cột văn bản để không mất thông tin định tính mà Sales muốn ghi (mục đích chuyến đi, tuyến thực tế đã đi khác kế hoạch).
Lưu ý phân biệt: **điểm viếng thăm** là địa điểm/đại lý, còn **khách hàng** (`target_customer_visits` / `actual_customer_visits`) là người gặp — đây là hai chỉ tiêu riêng, đúng như Master Spec §7 và §8 liệt kê tách rời.
**Alternatives:** (a) Chỉ văn bản — mất dòng "Viếng thăm" trong bảng đối chiếu. (b) Chỉ số — mất thông tin định tính, và Sales sẽ nhét mục đích chuyến đi vào ô "Tuyến ghé thăm".
**Impact:** Schema `daily_reports`, form đầu ngày và cuối ngày, bảng đối chiếu, thẻ ảnh 9:16, `lib/kpi.ts`.
**Status:** **APPROVED** (người dùng xác nhận 2026-08-07 — OQ-01 và OQ-02 đều trả lời "cả hai")

---

## DEC-030

**Date:** 2026-08-07
**Decision:** v1 **không** có khái niệm ngày nghỉ/nghỉ phép (OQ-08), **không** có khu vực/team (OQ-15), **không** có role thứ ba (OQ-16), **không** có SKU/model xe/đại lý/đơn hàng (OQ-10), và KPI do **Sales tự cam kết buổi sáng** chứ không phải Admin giao trước (OQ-09).
**Reason:** Master Spec §39 liệt kê tất cả những thứ này vào nhóm LATER và §71 yêu cầu "Ưu tiên MVP thực sự sử dụng được". Riêng OQ-09 là quan trọng nhất: nếu Admin giao chỉ tiêu trước thì toàn bộ workflow đảo chiều — cần một bảng `targets` riêng, cần quyền ghi mới cho Admin, và "báo cáo đầu ngày" không còn là hành vi cam kết nữa. Master Spec §7 mô tả rõ Sales là người nhập mục tiêu, nên mặc định giữ nguyên như vậy.
**Alternatives:** Đưa team/region vào ngay — thêm cột `team` nullable sau này rất rẻ, chưa cần bây giờ. Đưa quản lý ngày nghỉ vào ngay — người dùng đã xác nhận không cần ở v1.
**Impact:** Schema, danh sách cảnh báo Admin, `docs/01-business-analysis.md`, `docs/10-future-roadmap.md` (AF-11, AF-14, AF-15).
**Status:** **APPROVED** (người dùng xác nhận 2026-08-07 — OQ-08, OQ-09, OQ-10, OQ-15, OQ-16 đã trả lời)

---

## DEC-031

**Date:** 2026-08-07 (Phase 2)
**Loại:** Technical
**Decision:** `service_role` **không được cấp bất kỳ quyền DML nào** (`select` / `insert` / `update` / `delete`) trên `public.profiles` và `public.daily_reports`. Hệ quả kéo theo: tầng test Integration và RLS **không dùng service-role client để dựng fixture** như `docs/08 §2.2` dự kiến ban đầu, mà dùng **kết nối Postgres trực tiếp** bằng role `postgres` qua biến `SUPABASE_DB_URL` — một kênh chỉ tồn tại trên máy local (DEC-022). Thêm devDependency `pg@8.22.0` + `@types/pg@8.20.4` cho việc này.

**Reason:** Phát hiện khi chạy thật ở Phase 2, và nó sửa một hiểu nhầm nằm trong chính tài liệu của dự án:

> **`rolbypassrls` KHÔNG vượt qua `GRANT`.** Hai cơ chế này độc lập. `service_role` có `rolbypassrls = true` nên nó bỏ qua *policy*, nhưng nếu không được `GRANT` thì nó vẫn nhận `42501 permission denied for table`.

`docs/02 §11 CẢNH BÁO 4` viết *"service_role vẫn đi vòng qua RLS… không có cơ chế database nào cứu được nếu kỷ luật này bị phá — chỉ có code review và bước grep bundle trong CI"*. Câu đó **đúng một nửa**: RLS thì không cứu được, nhưng **GRANT thì cứu được**. Vì migration `0001`/`0002` chỉ cấp DML cho `authenticated`, `service_role` mặc nhiên không chạm được hai bảng nghiệp vụ. Điều đó biến **DEC-005** từ một kỷ luật code thành một hàng rào do chính database ép — đúng tinh thần "mọi quyền phải quy được về một policy hoặc một guard có thể chỉ tên" (`docs/06 §1`).

Giữ trạng thái này thay vì "sửa cho tiện test" là lựa chọn có chủ đích: đánh đổi một chút phiền phức ở tầng test để lấy một lớp phòng thủ thật ở production.

**Đã kiểm chứng thật** trên Supabase local (Postgres 17.6.1.156), bằng `information_schema.role_table_grants`:

| grantee | `profiles` | `daily_reports` |
|---|---|---|
| `anon` | *(không có DML)* | *(không có DML)* |
| `authenticated` | `SELECT, UPDATE` | `SELECT, INSERT, UPDATE` |
| `service_role` | *(không có DML)* | *(không có DML)* |

Ba khẳng định này được **khoá lại bằng test tự động** trong `tests/integration/db-functions.test.ts` để không ai vô tình cấp thêm quyền mà không bị đỏ.

**Không ảnh hưởng tới UC-17 / UC-18 / UC-19:**
- `auth.admin.createUser` / `updateUserById` đi qua **GoTrue** và schema `auth`, không qua PostgREST của schema `public`.
- Admin sửa hồ sơ Sales và bật/tắt `is_active` bằng client `authenticated` dưới policy `profiles_update_admin` — đúng thiết kế của `docs/06 §4` dòng 16–17.

**Alternatives:**
(a) **Cấp DML cho `service_role`** để giữ nguyên `docs/08 §2.2`. Bị loại: đánh mất một lớp phòng thủ thật chỉ để tiện dựng fixture, và làm DEC-005 quay lại phụ thuộc kỷ luật con người.
(b) **Chạy fixture bằng `docker exec … psql`.** Bị loại: gắn bộ test vào Docker CLI và cách đặt tên container, vốn không ổn định khi máy chạy nhiều stack Supabase local cùng lúc (đã gặp thật ở Phase 2 — xem WORKLOG Entry 004).
(c) **Bỏ hẳn fixture, chỉ test qua UI.** Bị loại thẳng: `docs/06 §10` nguyên tắc 2 nói rõ test qua UI không chứng minh được RLS.

**Impact:** `supabase/migrations/0001`, `0002` (comment giải thích); `docs/02 §11 CẢNH BÁO 4`; `docs/08 §2.2` và `§2.4`; `tests/integration/setup.ts`; `.env.example` và `.env.local` (thêm `SUPABASE_DB_URL`); `package.json` (thêm `pg`, `@types/pg`).
**Status:** **APPROVED** (technical, có thể veto)

---

## DEC-032

**Date:** 2026-08-07 (Phase 3)
**Loại:** Technical
**Decision:** Triển khai **sớm** `getVietnamToday()`, `formatVietnamDate()` (`lib/date.ts`) và `formatCurrencyVND()`, `parseCurrencyInput()`, `formatThousands()` (`lib/currency.ts`) **ngay trong Phase 3**, thay vì chờ Phase 5 như kế hoạch ban đầu. Kèm luôn bộ unit test đầy đủ của `docs/08 §3.3, §3.4, §3.5`. **`getVietnamMonthRange()` KHÔNG được kéo lên** — vẫn là khung ném lỗi, thuộc Phase 7 (FR-021) / Phase 9 (FR-028).

**Reason:** Phase 3 không chạy được nếu thiếu chúng, và đây là ràng buộc vật lý chứ không phải sở thích:

- **FR-010 / BR-005** yêu cầu `report_date = getVietnamToday()`. Không có hàm này thì Server Action không có ngày nghiệp vụ để ghi, và RLS `reports_insert_own_today` (`report_date = vn_today()`) sẽ từ chối mọi INSERT.
- **FR-007** yêu cầu `/sales/today` hiển thị ngày VN → cần `formatVietnamDate()`.
- **FR-008 + `docs/05 §6.2`** yêu cầu CurrencyInput phân nhóm nghìn khi blur và gửi lên **số nguyên** → cần `parseCurrencyInput()` + `formatThousands()`; và `/sales/today` hiển thị mục tiêu doanh thu → cần `formatCurrencyVND()`.

**Quan trọng — điều này KHÔNG kéo `lib/kpi.ts` lên theo.** `calculateAchievement()` và `getAchievementStatus()` vẫn là khung ném lỗi, vì chúng bị chặn thật bởi **ISSUE-008** (`percent = null` trong những trường hợp nào) và **DEC-025** (cách mang số vượt tuyệt đối). Phase 3 chỉ hiển thị **cột cam kết**, không hiển thị `%` nào, nên không chạm tới `lib/kpi.ts`. Ranh giới này là cố ý và phải giữ: hiển thị một phần trăm tính sai còn tệ hơn không hiển thị gì.

**Alternatives:**
(a) **Viết một hàm ngày/tiền cục bộ trong `features/report-morning/`** cho tạm đủ dùng, để Phase 5 viết bản thật. Bị loại thẳng: vi phạm AGENTS.md §9 (công thức chỉ tồn tại một nơi) và tạo ra đúng loại nhân bản mà NFR-012 cấm.
(b) **Hoãn Phase 3, làm Phase 5 trước.** Bị loại: Phase 5 đang bị ISSUE-008 chặn thật, nên đổi thứ tự chỉ dời chỗ chờ chứ không giải quyết gì.
(c) **Dùng `new Date().toISOString().slice(0,10)`** cho nhanh. Bị loại tuyệt đối: đó chính là bug múi giờ mà BR-005 và DEC-009 sinh ra để chặn.

**Impact:** `lib/date.ts`, `lib/currency.ts`, `lib/date.test.ts` (33 case), `lib/currency.test.ts` (29 case); `PROJECT_CHECKLIST.md` Phase 5 (hai gạch đầu dòng về `lib/currency` và `lib/date` nay đã có code + test, nhưng **chưa được tick** vì mục Phase 5 còn bao cả `lib/kpi.ts`).
**Status:** **APPROVED** (technical, có thể veto)

---

## DEC-033

**Date:** 2026-08-07 (Phase 3)
**Loại:** Technical
**Decision:** Hàm **hiển thị** trong `lib/` nhận đầu vào không hợp lệ thì **trả chuỗi thay thế, không ném lỗi**:

| Hàm | Đầu vào không hợp lệ | Trả về |
|---|---|---|
| `formatVietnamDate(date)` | không đúng `YYYY-MM-DD`, hoặc ngày không tồn tại trên lịch (`2026-02-30`) | `'—'` |
| `formatCurrencyVND(value)` | `NaN`, `Infinity`, `-Infinity` | `'—'` |
| `formatThousands(value)` | `NaN`, `Infinity`, `-Infinity` | `''` (chuỗi rỗng — nó ghi thẳng vào ô nhập) |
| `parseCurrencyInput(raw)` | mọi thứ không phải số nguyên VND hợp lệ | `null` *(đã có từ trước, ghi lại cho đủ bảng)* |

Đi kèm: `lib/date.ts` xuất thêm `isValidVietnamDate(value)` — hàm thuần kiểm một chuỗi có phải ngày CÓ THẬT trên lịch không, dùng chung bởi `formatVietnamDate` và `reportDateSchema`.

**Reason:** `docs/08 §3.5.2` để ngỏ điểm này (*"Không throw; trả chuỗi rỗng hoặc `—`. Hành vi chính xác chốt ở Phase 5"*), và Phase 3 phải chốt vì `/sales/today` gọi `formatVietnamDate` ở mọi request. Chọn `'—'` vì ba lý do:

1. **Trùng với `display` của `AchievementResult`** khi không có số liệu (`docs/08 §3.1`) — một ký tự duy nhất cho "không có giá trị" trên toàn giao diện.
2. **Ném lỗi từ một hàm format là sai tầng.** Một dòng dữ liệu lạ trong DB không được phép làm sập cả trang; việc chặn dữ liệu sai là của Zod và CHECK constraint.
3. **Master Spec §9 và §25 cấm `NaN` / `Infinity` lọt ra UI.** Nếu formatter im lặng đi qua, `Intl` sẽ in ra `"NaN ₫"` — đúng thứ bị cấm.

`isValidVietnamDate` tồn tại vì `new Date('2026-02-30')` **không ném lỗi** — JavaScript cuộn sang `2026-03-02`. Muốn từ chối ngày không tồn tại (case của `docs/08 §3.6`) thì buộc phải so ngược từng thành phần sau khi parse.

**Alternatives:**
(a) **Ném lỗi và để `error.tsx` bắt.** Bị loại: một ngày rác làm hỏng cả màn hình "Hôm nay", trong khi phần còn lại vẫn đọc được.
(b) **Trả chuỗi rỗng ở mọi hàm.** Bị loại cho `formatVietnamDate`: một ô trống trên giao diện trông như lỗi render, còn `'—'` nói rõ "không có giá trị".

**Impact:** `lib/date.ts`, `lib/currency.ts`, `lib/date.test.ts`, `lib/currency.test.ts`, `docs/08 §3.5.2` (điểm để ngỏ nay đã chốt).
**Status:** **APPROVED** (technical, có thể veto)

---

## DEC-034

**Date:** 2026-08-07 (Phase 3)
**Loại:** Technical
**Decision:** Zod schema của báo cáo dùng **khoá `snake_case` trùng đúng tên cột** của `public.daily_reports` (`planned_route`, `target_revenue`, …), **không** dùng `camelCase` như ví dụ minh hoạ ở `docs/07 §3.5`. Tên field trên form, khoá của `fieldErrors`, và khoá của payload gửi xuống `services/` đều là cùng một chuỗi đó.

Kèm theo: Server Action trả về `data.notice` — **server** quyết định câu xác nhận nào hiện ở `/sales/today`, client không tự suy ra.

**Reason:**

- `docs/08 §3.6` — tài liệu test, cụ thể hơn ví dụ minh hoạ của `docs/07` — đã ghi issue path là `['target_sales_quantity']`.
- Trùng tên cột nghĩa là output của `safeParse` gắn thẳng vào `TablesInsert<'daily_reports'>` **không cần tầng ánh xạ**. Tầng ánh xạ đó là nơi rất dễ gõ nhầm một cột mà TypeScript không bắt được, vì cả hai bên đều là `string`.
- `fieldErrors` từ server khớp thẳng `name` của input ⇒ gắn lỗi đúng ô và autofocus ô lỗi đầu tiên không cần bảng tra.

Về `data.notice`: đã xảy ra **lỗi thật** khi kiểm chứng trên Chromium. Sau khi tạo báo cáo thành công, `revalidatePath('/sales/today/morning')` khiến RSC của chính trang form render lại; lúc đó đã có báo cáo nên `mode` chuyển từ `'create'` sang `'edit'`. Client suy ra thông báo từ `mode` hiện tại nên hiện nhầm *"Đã cập nhật cam kết sáng"* cho một lần TẠO MỚI. Chỉ server mới biết chắc nó vừa `insert` hay vừa `update`.

**Alternatives:**
(a) **Dùng `camelCase` đúng chữ của `docs/07 §3.5`.** Bị loại: thêm một tầng ánh xạ không ai kiểm được, và mâu thuẫn với bảng test đã viết ở `docs/08 §3.6`.
(b) **Client nhớ `mode` bằng `useRef` tại thời điểm submit.** Bị loại: vẫn là suy đoán ở phía client, chỉ khó sai hơn một chút. Server biết sự thật thì để server nói.

**Impact:** `lib/validation/report.ts`, `features/report-morning/*`, `services/reports.ts`, `lib/reports/messages.ts`, `docs/07 §3.5`, `docs/07 §3.6`.
**Status:** **APPROVED** (technical, có thể veto)

---

## DEC-035

**Date:** 2026-08-07 (Phase 4)
**Loại:** Technical
**Decision:** Ba thứ ra đời ở `features/report-morning/` tại Phase 3 được **nâng lên tầng dùng chung** khi Phase 4 cần đúng chúng:

| Thứ | Từ | Sang | Vì sao ở đó |
|---|---|---|---|
| `useReportDraft` | `features/report-morning/use-report-draft.ts` | **`lib/hooks/use-report-draft.ts`** | Hook thuần, không biết một chữ nào về báo cáo — chỉ nhận một khoá chuỗi và `Record<string, string>` |
| `CurrencyField` | `features/report-morning/currency-field.tsx` | **`components/ui/currency-field.tsx`** | Primitive nhận props nguyên thuỷ, không biết mình đang nhập "mục tiêu" hay "thực đạt" |
| Khoá localStorage của draft | chuỗi gõ tay trong mỗi form | **`lib/reports/draft-keys.ts`** | Ba nơi cần đúng chuỗi này; nơi thứ ba (`DiscardEveningDraft`) không có form để mà gõ theo |

`lib/hooks/` là **thư mục mới** so với bảng cấu trúc của DEC-023. Nó chỉ chứa hook React **thuần**: không `services/`, không `lib/supabase/*`, không nghiệp vụ.

**Reason:** AGENTS.md §1.2 cấm `features/X` import `features/Y`, và bảng đó nói rõ cách xử lý: *"dùng chung thì nâng lên `lib/` hoặc `components/ui/`"*. Phương án còn lại là nhân bản — mà `useReportDraft` có `useSyncExternalStore` + xử lý quota localStorage + khoá theo ngày nghiệp vụ (BR-021); hai bản sao của thứ đó sẽ lệch nhau ở lần sửa đầu tiên.

**Alternatives:**
(a) **Copy sang `features/report-evening/`.** Bị loại: nhân bản ~200 dòng logic tinh vi, vi phạm CLAUDE.md §11.
(b) **Để `features/report-evening/` import `features/report-morning/`.** Bị loại: form cuối ngày không phụ thuộc nghiệp vụ vào form đầu ngày; phụ thuộc đó chỉ là tai nạn lịch sử của thứ tự phase.
(c) **Đặt `useReportDraft` vào `components/ui/`.** Bị loại: nó không phải component.

**Impact:** `lib/hooks/use-report-draft.ts`, `components/ui/currency-field.tsx`, `lib/reports/draft-keys.ts`, `features/report-morning/morning-report-form.tsx`, `features/report-evening/*`, `CLAUDE.md §6`, `AGENTS.md §1`.
**Status:** **APPROVED** (technical, có thể veto)

---

## DEC-036

**Date:** 2026-08-07 (Phase 4)
**Loại:** Architecture
**Decision:** `features/auth/` là **ngoại lệ duy nhất** của luật "`features/X` không import `features/Y`" (AGENTS.md §1.2). Mọi feature khác được phép import `features/auth/queries.ts`.

Đi kèm: guard ba bước của Server Action ghi báo cáo (auth → profile → `is_active` + `role = 'SALES'`) chuyển từ `features/report-morning/actions.ts` sang **`features/auth/queries.ts` dưới tên `authorizeSalesWrite()`**, trả về `SalesWriteAuthorization` (kèm luôn `supabase` client để tầng gọi không tạo client lần hai).

**Reason:** Guard này phải chạm `services/profiles`, mà AGENTS.md §1.2 cấm `lib/` import `services/` — nên nó **không thể** ở `lib/`, đúng như `docs/06 §5.3` đã ghi khi đặt `requireProfile`/`requireRole` vào `features/auth/`. Phase 3 để một bản trong `features/report-morning/actions.ts`; Phase 4 cần **đúng** nó. Nhân bản 40 dòng kiểm quyền ra hai chỗ là cách chắc chắn nhất để một ngày nào đó chỉ một trong hai chỗ được vá — và chỗ không được vá là một lỗ hổng phân quyền, không phải một lỗi hiển thị.

Không dùng `requireRole('SALES')` có sẵn được: hàm đó **redirect** khi không đạt, mà redirect trong một Server Action gọi từ `useActionState` làm client không bao giờ nhận `ActionResult` — form treo ở "đang lưu". AGENTS.md §2 cấm throw xuyên biên giới Server Action để báo lỗi nghiệp vụ.

**Alternatives:**
(a) **Đưa guard vào `services/`.** Bị loại: AGENTS.md §5 nói service **không quyết định quyền**.
(b) **Mỗi feature giữ một bản riêng.** Bị loại — xem Reason.
(c) **Tách phần thuần sang `lib/auth/` rồi mỗi feature tự gọi `getCurrentProfile()`.** Bị loại: vẫn là `features/X` import `features/Y`, chỉ nhiều bước hơn.

**Impact:** `AGENTS.md §1.2`, `docs/04 §layering`, `features/auth/queries.ts`, `features/report-morning/actions.ts`, `features/report-evening/actions.ts`.
**Status:** **APPROVED** (architecture — cần người dùng biết, có thể veto)

---

## DEC-037

**Date:** 2026-08-07 (Phase 4)
**Loại:** Technical
**Decision:** `saveEveningReport` **tự `redirect()`** tới `/sales/today?saved=evening` sau khi ghi thành công, thay vì trả `ok: true` cho client tự điều hướng như `saveMorningReport`. Kiểu trả về vì thế chỉ còn nhánh thất bại:

```ts
export type EveningReportState = Exclude<ActionResult<never>, { ok: true }> | null;
```

Việc dọn draft localStorage chuyển sang `features/report-evening/discard-evening-draft.tsx` — một client component **không render gì**, gắn trên `/sales/today` khi `view.state === 'COMPLETED'`.

**Reason:** Đã **đo thật trên Chromium** ở Phase 4 và thấy hỏng: sau mỗi Server Action, Next render lại RSC của route hiện tại. Lần render lại đó của `/sales/today/evening` thấy `status` vừa thành `'COMPLETED'` nên chạy `redirect(SALES_TODAY_PATH)` — một điều hướng **phía server**, không mang `?saved=`. Nó làm form unmount **trước khi** `useEffect` bắt `state.ok` kịp commit, nên `router.replace()` và `clearDraft()` không bao giờ chạy.

Hậu quả đo được: **mất banner "Đã hoàn tất báo cáo hôm nay"**, và **draft còn nguyên trong localStorage** sau khi lưu thành công (3/62 mục của kịch bản kiểm chứng đỏ). Đã thử bỏ `revalidatePath('/sales/today/evening')` — **không cứu được**: Next re-render route hiện tại dù có revalidate hay không. Đây là **cùng họ với DEC-034**: `revalidate`/re-render của route hiện tại phá vỡ giả định "client được chạy nốt sau khi action thành công".

Vì sao dọn draft ở `/sales/today` là chỗ đúng, không phải chỗ chữa cháy: **báo cáo hôm nay đã hoàn tất ⇒ không còn bản nháp cuối ngày nào của hôm nay còn ý nghĩa.** Nó đúng cả khi người dùng hoàn tất ở tab khác, hoặc hoàn tất trên điện thoại rồi mở lại trên máy tính.

⚠ **Hệ quả cho BR-002 — chặt hơn chứ không lỏng hơn.** `docs/07 §3.7` viết rằng UI bật nút "Xuất ảnh" khi nhận `status: 'COMPLETED'` **từ action**. Bản triển khai không nhận gì từ action cả: nút nằm ở `/sales/today` và điều kiện bật là `getTodayView(report).canExportImage`, tức đọc `status` **đã persist** từ database. Không có đường nào cho trạng thái form phía client tham gia — đúng tinh thần Master Spec §12.

**Alternatives:**
(a) **Bỏ `redirect()` ở nhánh `COMPLETED` của trang, render một thẻ "đã hoàn tất".** Bị loại: form vẫn bị thay thế bởi cây RSC mới ⇒ effect vẫn không chạy. Không giải quyết gốc.
(b) **Xoá draft ngay khi bấm Lưu.** Bị loại: `values` của form được suy ra TỪ draft, nên ô nhập sẽ trống ngay lập tức, và nếu lưu hỏng thì mất trắng dữ liệu — vi phạm NFR-010.
(c) **Bọc server action bằng một reducer client rồi dọn sau `await`.** Bị loại: `redirect()` ném `NEXT_REDIRECT` nên code sau `await` không chạy; mà nếu không redirect thì lại rơi vào chính cuộc đua trên.

**Impact:** `features/report-evening/actions.ts`, `features/report-evening/evening-report-form.tsx`, `features/report-evening/discard-evening-draft.tsx`, `app/(sales)/sales/today/page.tsx`, `lib/reports/draft-keys.ts`, `docs/07 §3.7`, `docs/03 §5.2`, ISSUE-014.
**Status:** **APPROVED** (technical, có thể veto)

---

## DEC-038

**Date:** 2026-08-07
**Decision:** Hai chốt chặn của Phase 5 — **ISSUE-008** và phần cài đặt còn để ngỏ của **DEC-025** — đã được người dùng trả lời. Đây là quyết định **làm rõ cách cài đặt**, **không** thay đổi bản chất BR-004, BR-011, BR-014, BR-015, BR-023, BR-024 (Master Spec §71).

**(1) ISSUE-008 — `AchievementResult.percent = null` xảy ra khi nào.**
`percent: null` mang đúng một nghĩa: **không tồn tại một con số phần trăm có ý nghĩa**. Nó đúng cho **cả hai** trường hợp:

| Trường hợp | `percent` | `status` | Ý nghĩa |
|---|---|---|---|
| `target = 0 && actual > 0` | `null` | `EXCEEDED` | Vượt kế hoạch — không có mẫu số để chia |
| chưa có `actual` | `null` | `PENDING` | Chờ số liệu cuối ngày |

Hai ca phân biệt nhau bằng **`status`**, không bằng `percent`. Hệ quả cụ thể: bỏ chữ "**chỉ**" ở đoạn mô tả `AchievementResult` trong `docs/01`; `getAchievementStatus(null)` trả `'PENDING'` và `calculateAchievement()` **không** ủy quyền cho nó ở nhánh `target = 0 && actual > 0` mà gán thẳng `EXCEEDED` (đúng cảnh báo `docs/08 §3.1.1`).

**(2) DEC-025 — `AchievementResult` mang số vượt tuyệt đối bằng cách nào.**
`calculateAchievement()` **nhận thêm tham số thứ ba** `metric: KpiMetric` và trả về **cả hai** dạng:

```ts
type KpiMetric = 'VISIT_POINTS' | 'SALES_QUANTITY' | 'REVENUE' | 'CUSTOMER_VISITS';

calculateAchievement(target: number, actual: number | null, metric: KpiMetric): {
  percent: number | null;
  status: AchievementStatus;
  display: string;          // '83,3%' | '100,0%' | '+3 xe' | '+3.000.000 ₫' | '—'
  surplus: number | null;   // số vượt THÔ, chỉ khác null khi target = 0 && actual > 0
}
```

Kèm theo, `lib/kpi.ts` xuất thêm ba hàm thuần: `formatMetricValue(value, metric)` (nơi DUY NHẤT biết chỉ tiêu nào đi với đơn vị nào), `achievementLabel(result)` (phân biệt nhãn "Vượt mục tiêu" với "Vượt kế hoạch" — BR-015 × BR-023), và `isKpiAchievedDay(results)` (BR-024). Tên bốn hàm đã chốt từ Master Spec §9 — `calculateAchievement`, `getAchievementStatus` — **giữ nguyên**.

**Reason:**
*(1)* Cách đọc này là cách duy nhất khiến hai phát biểu mâu thuẫn trong `docs/01` cùng đúng mà không phải đổi một BR nào, và nó khớp với case `actual = null` mà `PROJECT_CHECKLIST.md § Phase 5` **bắt buộc** phải có unit test. Nếu chọn ngược lại (`percent` chỉ `null` ở một ca), `calculateAchievement` sẽ không nhận `actual = null` nữa và mỗi nơi hiển thị — bảng đối chiếu, thẻ ảnh 9:16, dashboard Admin — phải tự viết lấy nhánh "chờ số liệu", tức là ba bản sao của cùng một luật.
*(2)* Đơn vị hiển thị khác nhau theo chỉ tiêu (`xe` / `điểm` / `khách` / VND đầy đủ). Nếu trả số vượt thô rồi để tầng hiển thị tự ghép, cùng một luật format sẽ nằm ở ba nơi và chắc chắn lệch nhau — đúng thứ NFR-012 cấm. Trả **cả** `display` **lẫn** `surplus` giữ được một nguồn duy nhất mà vẫn không ép nơi cần con số phải parse ngược chuỗi.

**Alternatives:**
*(1a)* Giữ chữ "chỉ", đổi chữ ký thành `actual: number` — bị loại vì đẩy nhánh PENDING ra ba component. *(1b)* Thêm trường `reason: 'NO_TARGET' | 'NO_ACTUAL' | null` — an toàn nhưng trùng thông tin với `status`, kiểu trả về phình ra mà không thêm khả năng nào.
*(2a)* Trả `surplus` thô, tầng hiển thị tự format — bị loại theo lý do trên. *(2b)* Tách `formatSurplus(surplus, metric)` thành hàm riêng phải gọi ở bước hai — bị loại vì quên bước hai thì ô "Hoàn thành" ra số trần không đơn vị mà **không có lỗi nào báo**.

**Impact:** `lib/kpi.ts` (thân thật), `lib/kpi.test.ts` (46 test **MỚI**), `features/report-comparison/` (thư mục feature **MỚI**: `achievement-table.tsx`, `achievement-badge.tsx`, `report-notes.tsx`), `app/(sales)/sales/today/page.tsx`, `features/report-morning/commitment-summary.tsx` (chú thích), `docs/01 §8.1` + §"Hệ quả cho việc cài đặt", `docs/05 §7`, `docs/08 §3.1` + §3.2, ISSUE-008 (→ CLOSED).

**Ghi chú kèm theo — một hệ quả cố ý, đã khoá bằng test:** BR-014 làm tròn 1 chữ số thập phân ở tầng hiển thị, còn BR-023 xét ngưỡng trên số **chưa** làm tròn. Vì vậy `percent = 99.99` cho `display = '100,0%'` nhưng `status = 'NEAR'` ("Gần đạt"). Cả hai rule đều đang `APPROVED` và chính `PROJECT_CHECKLIST.md § Phase 5` liệt kê `99.99` là case biên bắt buộc. **Đừng "sửa" bằng cách xét ngưỡng trên số đã làm tròn** — đó là thay đổi BR-023 và phải có DEC mới.

**Status:** **APPROVED** (người dùng xác nhận 2026-08-07)

---

## DEC-039

**Date:** 2026-08-08
**Decision:** `middleware.ts` trả **mã trạng thái + JSON `{ code, message }`** cho request vào route dưới `/api/`, thay vì `307` redirect về `/login` như với trang. Cụ thể: chưa đăng nhập → **401 `UNAUTHENTICATED`**; hồ sơ mất hoặc `is_active = false` → **403 `ACCOUNT_DISABLED`**. Hàm nhận biết là `isApiPath()` ở `lib/auth/routes.ts`.

**Reason:** Phát hiện khi kiểm chứng Phase 6 (**ISSUE-015**) — không phải suy đoán. Middleware cố ý phủ cả `/api/*` để refresh cookie phiên, nhưng nhánh "chưa đăng nhập" của nó redirect **mọi** đường dẫn. Hậu quả với đúng client của tính năng này:

1. `fetch('/api/reports/<id>/share-image')` **tự đi theo redirect** — đó là hành vi mặc định của Fetch API, không tắt được từ phía server.
2. Client vì vậy nhận HTML của trang đăng nhập kèm `status = 200`, và `response.ok === true`.
3. Nút "Xuất ảnh" đi tiếp vào nhánh thành công và lưu trang HTML đó thành một file `.png` hỏng — người dùng gửi lên Zalo một tấm ảnh không mở được, **không có lỗi nào hiện ra**.

Một endpoint trả dữ liệu phải trả lời bằng mã trạng thái để client phân nhánh được. `docs/07 §4.1` vốn đã ghi "401 chưa đăng nhập" — quyết định này làm cho code khớp lại với hợp đồng đã viết, chứ không mở rộng nó.

**Alternatives:**
*(a)* Loại `/api/*` khỏi `matcher` của middleware — bị loại: mất luôn việc refresh cookie phiên cho route đó, và bỏ hẳn một lớp phòng thủ trong khi vấn đề chỉ nằm ở **hình dạng câu trả lời**.
*(b)* Để client tự phát hiện bằng cách kiểm `content-type` — **vẫn làm**, nhưng như lớp phòng thủ thứ hai chứ không phải cách sửa: nó không giúp gì cho một client khác (curl, ứng dụng khác) gọi cùng endpoint.
*(c)* Trả 401 kèm body rỗng — bị loại: `docs/07 §4.1` quy định body JSON `{ code, message }`, và nút chia sẻ hiển thị thẳng `message` do server quyết định (cùng tinh thần DEC-034).

**Impact:** `middleware.ts` (thêm `jsonPreservingCookies()`), `lib/auth/routes.ts` (`isApiPath()` + 2 unit test), `features/report-share/share-image-button.tsx` (kiểm `content-type`), `docs/06 §5.2`, `docs/07 §4.1`, ISSUE-015 (→ CLOSED).

**Ghi chú:** quyết định này **không** đổi biên giới bảo mật. RLS vẫn là thứ chặn thật (DEC-004), route handler vẫn tự kiểm `auth` và `status` một lần nữa. Nó chỉ đổi **cách nói** với client khi bị từ chối.

**Status:** APPROVED (technical, người dùng có quyền veto)

---

## DEC-040 — `getVietnamMonthRange()` trả `null` khi chuỗi tháng sai định dạng, không ném lỗi

**Date:** 2026-08-10 · **Phase:** 7 · **Loại:** technical

**Decision:** `getVietnamMonthRange(yyyyMM)` trả `{ from, to } | null`. Chuỗi không khớp `^\d{4}-(0[1-9]|1[0-2])$` cho `null`. Hàm **không** tự lùi về tháng hiện tại — việc chọn tháng thay thế là của tầng gọi (`/sales/history` và `/admin/*` dùng `getVietnamCurrentMonth()`).

**Reason:** `docs/08 §3.5.3` để ngỏ hành vi này từ Phase 0, và đề xuất cũ là "ném lỗi có kiểu rồi để caller fallback". Đầu vào thật của hàm là `searchParams.month` — **một chuỗi bất kỳ người dùng gõ được vào URL**. Ném lỗi biến `?month=abc` thành một trang 500, và một `try/catch` mà caller có thể quên là thứ compiler không nhắc được. `null` thì ngược lại: TypeScript **bắt** mọi nơi gọi phải xử lý, và không có đường nào làm sập trang. Cùng tinh thần DEC-033 (hàm hiển thị trả `'—'` thay vì throw), nhưng giữ kiểu an toàn vì kết quả đi vào truy vấn chứ không đi thẳng ra màn hình.

Hàm cố ý **không** tự fallback về tháng hiện tại: làm vậy buộc nó phải đọc đồng hồ, và một hàm thuần biến thành hàm phụ thuộc thời gian — không test được nếu không giả lập giờ hệ thống.

**Alternatives:**
*(a)* Ném `RangeError` — bị loại, lý do ở trên.
*(b)* Trả về tháng hiện tại khi đầu vào sai — bị loại: mất tính thuần, và che mất lỗi thật (một link hỏng vẫn hiện dữ liệu, không ai biết link sai).
*(c)* Nhận `Date` thay vì chuỗi — bị loại: `searchParams` là chuỗi, và `new Date('2026-02-30')` không ném lỗi mà cuộn sang `2026-03-02` (đúng cái bẫy DEC-033 đã ghi).

**Impact:** `lib/date.ts` (`getVietnamMonthRange` + nhóm hàm tháng `getVietnamCurrentMonth` / `formatVietnamMonth` / `shiftVietnamMonth` / `resolveVietnamMonth`), `lib/date.test.ts`, `lib/reports/admin-filters.ts`, `services/reports.ts`, `app/(sales)/sales/history/page.tsx`, `app/(admin)/admin/analytics/page.tsx`, `docs/08 §3.5.3`. Có bài E2E khoá lại (`?month=abc&page=-5` không làm sập trang).

**Status:** APPROVED (technical)

---

## DEC-041 — Chính sách mật khẩu: tối thiểu 8 ký tự, không ép đổi ở lần đăng nhập đầu

**Date:** 2026-08-10 · **Phase:** 10 · **Loại:** business (người dùng đã xác nhận)

**Decision:**

1. Mật khẩu tối thiểu **8 ký tự**, tối đa **72** (giới hạn thật của bcrypt mà GoTrue dùng). **Không** bắt buộc chữ hoa / chữ số / ký tự đặc biệt.
2. Form đổi mật khẩu bắt **nhập lại lần 2**; lỗi không khớp gắn vào **ô nhập lại**, không đặt ở cấp form.
3. Mật khẩu tạm do Admin đặt khi tạo tài khoản (UC-17) dùng **cùng chính sách** — không nới lỏng hơn, vì nó là mật khẩu thật cho tới khi Sales tự đổi.
4. **v1 KHÔNG ép đổi mật khẩu ở lần đăng nhập đầu.** Điểm treo số 3 ở `SESSION_CHECKPOINT.md § OPEN QUESTIONS` (`docs/06 §3.3` ghi chú 6 — cờ trong `user_metadata` vs thêm cột vào `profiles`) **đóng lại theo hướng: không làm cả hai.**

**Reason:** Sales gõ mật khẩu trên bàn phím điện thoại, ngoài trời, giữa lúc đi tuyến. Quy tắc phức tạp đẩy họ tới chỗ ghi mật khẩu ra giấy hoặc đặt một chuỗi kiểu `Abc@1234` — tức là làm hệ thống **kém** an toàn hơn chứ không hơn. Đây cũng là khuyến nghị của NIST SP 800-63B: ưu tiên độ dài, bỏ quy tắc thành phần bắt buộc.

Về mục 4: ép đổi lần đầu cần **một trong hai** thay đổi có chi phí thật — thêm cột vào `profiles` (migration mới + sửa trigger `handle_new_user`), hoặc một cờ trong `user_metadata` mà client sửa được bằng `auth.updateUser()` nên **không** phải hàng rào thật. Với một đội nội bộ nơi Admin bàn giao mật khẩu trực tiếp, lợi ích không bù được chi phí ở v1. Đã ghi vào `docs/10-future-roadmap.md`.

**Alternatives:**
*(a)* Tối thiểu 12 ký tự — bị loại: cùng lý do trên, và không có yêu cầu tuân thủ nào bắt buộc con số đó.
*(b)* Bắt nhập mật khẩu **hiện tại** khi đổi — bị loại: lớp bảo vệ tương đương nằm ở tầng nền tảng (bật **Secure password change** trên Supabase Dashboard để GoTrue tự đòi phiên đăng nhập gần đây, `docs/09 §11`). Thêm một ô ở form **không** thay thế được lớp đó, chỉ thêm thao tác.
*(c)* Ép đổi lần đầu bằng cột trong `profiles` — hoãn sang v2, xem lý do ở trên.

**Impact:** `lib/validation/account.ts` (`PASSWORD_MIN_LENGTH = 8`), `lib/validation/sales-account.ts`, `features/account/`, `features/admin-sales-management/`, `docs/06 §11.1`, `docs/09 §11`, `docs/10-future-roadmap.md`.

⚠ **Con số 8 phải khớp cả ở Supabase Dashboard → Authentication → Password.** Chỉ đặt ở Zod thì đổi mật khẩu qua API vẫn lọt; chỉ đặt ở Supabase thì người dùng nhận thông báo lỗi tiếng Anh thô.

**Status:** APPROVED (người dùng xác nhận 2026-08-10)

---

## DEC-042 — Route Handler thứ hai: `GET /api/admin/reports/export` cho CSV

**Date:** 2026-08-10 · **Phase:** 9 · **Loại:** technical

**Decision:** FR-034 (xuất CSV) triển khai bằng **Route Handler** `GET /api/admin/reports/export`, không bằng Server Action. Đây là route API thứ hai và **cuối cùng** của v1, bên cạnh `GET /api/reports/[id]/share-image` của Phase 6.

**Reason:** DEC-003 nói "không REST API riêng cho **CRUD báo cáo**", và điều đó vẫn đúng — đây không phải CRUD, nó là **một file tải về**. Cùng lý do đã cho phép route ảnh tồn tại: Server Action không đặt được `Content-Disposition`, không trả được nội dung khác HTML, và không cho trình duyệt biết "đây là file, hãy lưu lại".

**Alternatives:**
*(a)* Server Action trả chuỗi CSV rồi client dựng `Blob` — bị loại: đẩy toàn bộ nội dung qua payload của action (giới hạn 1 MB mặc định của Next), và tải file vốn là đúng việc của một `GET` có thể bookmark.
*(b)* Sinh file rồi lưu vào Supabase Storage — bị loại: DEC-021 đã loại Storage khỏi v1, và file này chứa doanh thu toàn đội nên không nên tồn tại ở đâu ngoài lần tải đó.

**Impact:** `app/api/admin/reports/export/route.ts`, `lib/reports/csv.ts` (+ unit test), `services/reports.getAdminReportsForExport()` (có trần `CSV_EXPORT_MAX_ROWS`), `docs/04 §4`, `docs/07`. Ba lớp bảo vệ: middleware trả **401 JSON** cho `/api/*` (DEC-039) · route tự kiểm `role === 'ADMIN'` trả **403** · RLS `reports_select_own_or_admin` đứng dưới cùng. Header bắt buộc `Cache-Control: private, no-store`. Có 3 bài E2E khoá cả ba lớp.

**Status:** APPROVED (technical, người dùng có quyền veto)

---

## DEC-043 — NFR-008 nới thành "≤ 8 lần chạm" (trả lời OQ-18)

**Date:** 2026-08-10 · **Phase:** 3 (đóng nợ) · **Loại:** business (người dùng đã chọn)

**Decision:** NFR-008 sửa từ "hoàn tất báo cáo sáng ≤ 60 giây và **≤ 6 lần chạm**" thành "≤ 60 giây và **≤ 8 lần chạm**". **Giữ nguyên 5 trường bắt buộc của FR-008.** Đây là phương án **(a)** trong ba phương án ghi ở `docs/01 § OQ-18`.

**Reason:** Hai requirement mâu thuẫn nhau về mặt số học, không phải chỗ tối ưu được bằng code. FR-008 quy định 5 trường bắt buộc ⇒ sàn lý thuyết của luồng là `1 (mở form) + 5 (chạm từng ô) + 1 (lưu) = 7`. Đo thật ở 375px cho **7 chạm / 1,8 giây** — đạt vế thời gian, không đạt vế số chạm, và **không có cách nào đạt được** nếu vẫn giữ 5 trường.

Người dùng chọn (a) vì hai phương án còn lại đều tệ hơn: (b) định nghĩa lại "chạm" là sửa cách đo cho khớp con số — một kiểu tự chấm điểm; (c) bỏ bớt trường bắt buộc là **thay đổi nghiệp vụ thật**, làm báo cáo mất một chỉ tiêu và kéo theo migration mới cộng sửa bốn tài liệu, chỉ để làm đẹp một con số.

Ngưỡng mới là **8** chứ không phải 7 để còn một chạm dự phòng cho bước phát sinh trên thiết bị thật (ví dụ đóng bàn phím trước khi bấm Lưu), mà vẫn giữ được ý nghĩa gốc của NFR-008: luồng phải **ngắn và không có bước thừa**.

**Alternatives:** (b) và (c) — xem trên. Cả hai đều được trình bày cho người dùng trước khi chốt.

**Impact:** `docs/01 § NFR-008` và `§ OQ-18` (OQ-18 → ĐÃ TRẢ LỜI), `docs/08` (bảng đo), `docs/12 § ISSUE-013` (→ CLOSED), `PROJECT_CHECKLIST.md § Phase 3` (mục walkthrough NFR-008 nay tick được — đo thật **7 ≤ 8**). **Không có thay đổi code nào** — form giữ nguyên 5 trường, ba biện pháp giảm thao tác đã có (chip cộng nhanh, `inputMode="numeric"`, `enterKeyHint="next"`) giữ nguyên.

**Status:** APPROVED (người dùng chọn phương án (a) ngày 2026-08-10)

---

## DEC-044 — FR-037 vẽ biểu đồ bằng SVG viết tay, không thêm thư viện biểu đồ

**Date:** 2026-08-10 · **Phase:** 9 · **Loại:** technical

**Decision:** Biểu đồ trend theo ngày (FR-037, AF-08) render bằng **SVG viết tay trong Server Component**. Không thêm dependency nào. Toàn bộ phép tính toạ độ nằm ở `lib/reports/trend-chart.ts` (hàm thuần, 17 unit test); component chỉ đổ số vào thuộc tính SVG.

**Reason:** `PROJECT_CHECKLIST.md § Phase 9` ràng buộc FR-037 là **SHOULD, chỉ làm nếu không phát sinh dependency nặng**. Recharts kéo theo toàn bộ D3 (~90 kB gzip) và **buộc component phải là client component** — tức đẩy cả dữ liệu doanh thu của đội qua payload RSC cho một thứ chỉ để nhìn. Một biểu đồ cột tĩnh là khoảng 40 dòng SVG, không cần một byte JavaScript nào chạy trên máy khách.

**Hai ràng buộc thiết kế đã đo bằng mắt, không phải suy đoán:**

1. **Chữ KHÔNG được nằm trong SVG.** Bản đầu đặt nhãn ngày vào `<text>` với viewBox cố định cộng `width: 100%`; ảnh chụp thật ở 1440px cho thấy SVG phóng to **2,7 lần**, chữ `font-size: 11` render thành khoảng 30px và biểu đồ cao 540px — phá vỡ type scale của `docs/05 §3.3`. Sửa bằng cách đưa nhãn ra HTML và cho SVG `preserveAspectRatio="none"` cộng chiều cao cố định bằng CSS. Hệ quả bắt buộc: vùng vẽ phải trải kín bề rộng viewBox (`PLOT_LEFT = 0`) để nhãn HTML khớp cột, và có unit test khoá lại điều đó.
2. **Chỉ vẽ ngày CÓ báo cáo hoàn tất**, không `generate_series` cả tháng. v1 không có khái niệm ngày nghỉ (DEC-030), nên một cột 0 cho Chủ nhật là **số liệu bịa** — biểu đồ sẽ nói dối rằng cả đội thất bại hôm đó.

**Alternatives:**
*(a)* Recharts / Chart.js / visx — bị loại, lý do ở trên.
*(b)* Không làm FR-037, chỉ giữ bảng số — phương án cũ của session trước; bị thay khi thấy chi phí thật bằng 0 dependency.
*(c)* Vẽ bằng `<canvas>` — bị loại: cần client component cộng JavaScript, và không có gì cho trình đọc màn hình.

**Impact:** `supabase/migrations/0007_admin_daily_trend.sql` (RPC `admin_daily_trend`), `services/admin.getAdminDailyTrend()`, `lib/reports/trend-chart.ts` cộng test, `features/admin-analytics/daily-trend-chart.tsx`, `app/(admin)/admin/analytics/page.tsx`, `types/database.types.ts`, `docs/02`, `docs/05 §15`, `docs/07`. Biểu đồ có `role="img"` cộng `aria-label` tóm tắt **và** một `<table>` thật trong `<details>` — đúng yêu cầu "mọi bảng/biểu đồ có phương án `data-table` thay thế" của Phase 9.

**Status:** APPROVED (technical, người dùng đã chọn "có làm, vẽ bằng inline SVG" ngày 2026-08-10)

---

## DEC-045 — Hằng số dùng chung KHÔNG được nằm trong file `'use server'`

**Date:** 2026-08-10 · **Phase:** 11 · **Loại:** technical

**Decision:** Mọi bảng hằng số và chuỗi thông báo dùng chung phải nằm ở `lib/`. File `'use server'` (`features/*/actions.ts`) chỉ được chứa **async function** và `export type`.

**Reason:** Next.js ép luật này ở **runtime**: `A "use server" file can only export async functions, found object.` Điều nguy hiểm là `next build`, `tsc --noEmit` và `eslint` đều **xanh** — lỗi chỉ nổ khi người dùng mở đúng trang đó. Ở đây nó làm `/admin/sales/new` và `/admin/account` hiện "Đã có lỗi xảy ra", và **chỉ bộ E2E của Phase 11 mới bắt được** (ISSUE-016). Dự án vốn đã có sẵn khuôn đúng từ Phase 2/3 — `lib/auth/messages.ts` và `lib/reports/messages.ts` — nên đây là việc quay lại đúng khuôn, không phải phát minh quy ước mới.

**Alternatives:**
*(a)* Bọc hằng số trong một async function `getMessages()` — bị loại: biến một hằng số thành lời gọi bất đồng bộ ở mọi nơi dùng, chỉ để lách quy định của framework.
*(b)* Tách thành `actions.ts` cộng `constants.ts` **trong cùng thư mục feature** — chấp nhận được, nhưng đặt ở `lib/` đúng hơn: chuỗi thông báo là thứ cả server lẫn client đọc, và `lib/` là nơi dự án đã quy ước cho "một nguồn duy nhất" (AGENTS.md §9).

**Impact:** `lib/account/messages.ts` (MỚI), `lib/admin/messages.ts` (MỚI), `features/account/actions.ts`, `features/admin-sales-management/actions.ts`, `AGENTS.md`, `docs/12 § ISSUE-016`.

**Status:** APPROVED (technical)

---

## DEC-046 — Bảng màu lấy từ LOGO CHÍNH THỨC (thay bảng màu của DEC-014)

**Date:** 2026-08-10
**Decision:** Bảng màu của ứng dụng được dựng lại từ **logo chính thức** do người dùng cung cấp
(xe đạp **cam** trên nền **trắng**, chữ hiệu **xanh dương**): **trắng chủ đạo, cam và xanh dương là
màu phụ**. Cụ thể:

| Token | Trước (DEC-014) | Sau (DEC-046) | Đo được |
|---|---|---|---|
| `--color-background` | `#F8FAFC` | `#F4F7FA` | card trên nó **1,08:1** — đủ tách lớp để hover của nút `secondary`/`ghost` nhìn thấy được |
| `--color-heading` | `#1E3A8A` (chàm) | `#0B4A76` (xanh logo đậm) | nền **8,66:1** · card **9,31:1** · AAA |
| `--color-primary` | `#1E40AF` (chàm) | `#1273B8` | chữ trắng trên nó **5,04:1** · AA |
| `--color-primary-hover` | `#1D4ED8` | `#0F5F98` | chữ trắng trên nó **6,75:1** · AA |
| `--color-secondary` | `#3B82F6` | `#2E93D0` | trên card **3,39:1** — đủ WCAG 1.4.11 cho đồ hoạ |
| `--color-accent` | `#D97706` | **`#E9A04F`** (cam logo nguyên bản) | `foreground` trên nó **8,17:1** · AAA |
| `--color-accent-hover` | *(chưa có)* | `#D98324` | `foreground` trên nó **6,14:1** · AA |
| `--color-accent-text` | `#B45309` | `#97580B` | nền **5,26:1** · card **5,65:1** · AA |
| `--color-muted-foreground` | `#64748B` | `#566A7B` | nền **5,22:1** · card **5,61:1** · AA |
| `--color-ring` | `#1D4ED8` | `#0F5F98` | card **6,75:1** · nền **6,28:1** |
| `--color-border` | `#E2E8F0` | `#E3E9F0` | **1,22:1** — vẫn CHỈ trang trí |
| `--color-status-info-bg/fg` | `#DBEAFE` / `#1E40AF` | `#E0F0FB` / `#0B4A76` | **7,99:1** · AAA |

**Hai màu của logo KHÔNG dùng được nguyên bản, và đây là lý do đo được:**

| Cặp màu | Tỉ lệ | Kết luận |
|---|---:|---|
| cam logo `#E9A04F` trên trắng | **2,19:1** | **Trượt** cả AA (4,5) lẫn ngưỡng đồ hoạ (3,0) ⇒ **cấm** làm chữ và làm đồ hoạ mang nghĩa. Chỉ được làm **nền** (chữ tối trên nó) và làm **chính hình logo** — WCAG 1.4.3/1.4.11 miễn trừ logotype |
| xanh logo `#197DC3` trên trắng | **4,41:1** | Thiếu đúng **0,09** so với ngưỡng AA ⇒ `--color-primary` là bản tối hơn 4% (`#1273B8`, **5,04:1**). Chênh lệch mắt thường không phân biệt được |
| trắng trên cam logo | 2,19:1 | **Cấm tuyệt đối** — CTA cam phải dùng chữ tối `#0F172A` (8,17:1) |

**Reason:** Người dùng yêu cầu tone màu trang web khớp logo. Nhưng NFR-007 (WCAG 2.2 AA) là ràng
buộc cứng và **không** được nới để chiều màu thương hiệu — nên nguyên tắc áp dụng là: **giữ đúng
sắc (hue) của logo, chỉ chỉnh độ sáng vừa đủ để đạt ngưỡng**, và tách vai trò "màu nền" khỏi "màu
chữ" đúng như DEC-014 đã làm với amber. Toàn bộ số liệu ở hai bảng trên được tính bằng công thức
relative luminance của WCAG 2.x, không ước lượng bằng mắt.

**Kèm theo quyết định này:** logo được dựng thành **SVG inline** (`components/ui/brand-mark.tsx`),
không phải file ảnh. Toạ độ SVG được **sinh ra từ cùng bộ hằng số** dựng `app/icon.svg` và bốn file
`public/icons/*.png`, nên logo trên web và icon màn hình chính không thể lệch hình. Logo xuất hiện ở
ba chỗ: màn hình `/login` (lockup lớn), header của cả hai route group (chỉ dưới 1024px), và sidebar
từ 1024px.

**Alternatives:**
*(a)* Dùng nguyên hai màu logo — **bị loại**: chữ 2,19:1 là không đọc được ngoài nắng, đúng bối cảnh
Sales dùng điện thoại ngoài thị trường, và sẽ làm đỏ 30 lượt quét axe của Phase 11.
*(b)* Giữ DEC-014, chỉ thêm logo — **bị loại**: chàm `#1E40AF` cạnh cam logo là hai sắc lệch nhau,
người dùng đã nêu rõ đây là điều cần sửa.
*(c)* Nhúng file ảnh logo gốc (PNG) — **bị loại**: nét vỡ khi phóng to, không đổi màu theo ngữ cảnh
được, và tốn thêm một request mạng trên 4G (NFR-001).

**Impact:** `app/globals.css`, `components/ui/brand-mark.tsx` (MỚI), `app/(auth)/login/page.tsx`,
`app/(sales)/layout.tsx`, `app/(admin)/layout.tsx`, `features/navigation/main-nav.tsx`,
`app/icon.svg` + `app/apple-icon.png` + `app/favicon.ico` + `public/icons/*` (MỚI),
`lib/pwa/manifest.ts`, `docs/05-ui-ux-design.md §4` và `§15`.

**Hệ quả với DEC-014:** DEC-014 **KHÔNG bị xoá** — phương pháp của nó (đo contrast thật, tách màu
nền khỏi màu chữ) vẫn là luật. Chỉ **bảng giá trị** của nó bị thay. Đọc DEC-014 để hiểu *vì sao* làm
như vậy, đọc DEC-046 để biết *giá trị hiện hành*.

**Status:** APPROVED (do người dùng yêu cầu trực tiếp ngày 2026-08-10)

---

## DEC-047 — PWA: `app/manifest.ts` là metadata route, KHÔNG phải Route Handler thứ ba

**Date:** 2026-08-10
**Decision:** FR-036 được triển khai bằng **file quy ước metadata của Next**, không phải bằng Route
Handler:

| File | Vai trò |
|---|---|
| `app/manifest.ts` | phục vụ tại `/manifest.webmanifest`; nội dung nằm ở `lib/pwa/manifest.ts` |
| `app/favicon.ico` · `app/icon.svg` · `app/apple-icon.png` | ba icon theo quy ước — Next tự chèn thẻ `<link>` |
| `public/icons/icon-{192,512}.png` | `purpose: 'any'` |
| `public/icons/icon-maskable-{192,512}.png` | `purpose: 'maskable'` |

Bốn điểm được chốt kèm:

1. **`theme_color` và `background_color` đều là TRẮNG** (`#FFFFFF`), không phải xanh thương hiệu —
   thanh trạng thái nối liền header trắng của app, và màn hình chờ trùng nền trắng của icon nên icon
   không hiện ra như một ô vuông dán lên nền khác màu.
2. **Bản `maskable` là FILE RIÊNG, không dùng chung với bản `any`.** Vùng an toàn 80% của maskable
   buộc nét vẽ nhỏ hơn hẳn; khai một file `"any maskable"` thì hoặc Android cắt mất bánh xe, hoặc
   trình duyệt hiện icon thừa lề.
3. **`apple-icon.png` là bắt buộc, không phải cho đủ bộ.** iOS **bỏ qua manifest** khi "Thêm vào màn
   hình chính" — thiếu file này thì iPhone lấy ảnh chụp màn hình trang làm icon.
4. **`/manifest.webmanifest` phải đọc được khi CHƯA đăng nhập.** Trình duyệt tải nó bằng request
   **không kèm cookie**, nên nếu để nó đi qua nhánh xác thực thì middleware luôn thấy "chưa đăng
   nhập" và trả HTML của `/login` kèm `status = 200`; trình duyệt không báo lỗi gì, chỉ lặng lẽ
   **không** hiện "Thêm vào màn hình chính". Vì vậy `webmanifest` được thêm vào `PUBLIC_FILE` của
   `middleware.ts`.

**Reason:** DEC-042 chốt rằng v1 chỉ có **hai** Route Handler. Ba route mới xuất hiện trong bảng
`next build` (`/manifest.webmanifest`, `/icon.svg`, `/apple-icon.png`) **không** phá quyết định đó:
chúng là metadata tĩnh, không chạm database, không chạm phiên, không trả dữ liệu nghiệp vụ. Ghi
thành DEC riêng để session sau không đọc bảng route rồi kết luận DEC-042 đã bị vi phạm.

Điểm 4 là họ hàng trực tiếp của **ISSUE-015** (middleware redirect route `/api/*`) — cùng một kiểu
hỏng: một request máy-gọi-máy bị trả về HTML kèm mã 200. Vì vậy nó được khoá bằng bài E2E chứ không
chỉ bằng unit test.

**Alternatives:**
*(a)* File tĩnh `public/manifest.webmanifest` + thẻ `<link>` viết tay — bỏ được một route, nhưng mất
kiểm tra kiểu và tách nội dung manifest ra khỏi `lib/` nơi unit test với tới được.
*(b)* Một file `"any maskable"` duy nhất — xem điểm 2.
*(c)* `theme_color` xanh thương hiệu — xem điểm 1.

**Impact:** `lib/pwa/manifest.ts` (MỚI) + `lib/pwa/manifest.test.ts` (MỚI, 13 test), `app/manifest.ts`
(MỚI), `app/layout.tsx`, `middleware.ts`, `e2e/pwa.spec.ts` (MỚI), `docs/05 §15`, `docs/09`.

**Status:** APPROVED (technical)

---

## DEC-048 — Bỏ trường "Mục đích chuyến đi" khỏi giao diện, GIỮ cột trong database

**Date:** 2026-08-10
**Decision:** Trường `visit_purpose` **không còn được nhập và không còn được hiển thị ở bất kỳ màn
hình nào**. Cột `daily_reports.visit_purpose` **ở lại nguyên vẹn** cùng toàn bộ dữ liệu đã nhập.

Cụ thể đã làm:

| Nơi | Thay đổi |
|---|---|
| `morningReportSchema` | gỡ khoá `visit_purpose` ⇒ Zod **strip** nếu client cố gửi |
| `readMorningFormData()` | không đọc khoá đó khỏi `FormData` nữa (lớp chặn thứ hai) |
| `morning-report-form.tsx` | gỡ hẳn ô nhập — form còn **5 trường** |
| `report-notes.tsx` · `commitment-summary.tsx` | gỡ dòng hiển thị |
| `supabase/migrations/0008` | chỉ thêm `comment on column` đánh dấu **DI SẢN**, **không** `drop column` |

**Reason:** Người dùng gạch đỏ trường này trên ảnh chú thích tay (ảnh 1, `PROJECT_CHECKLIST.md §13c`).
Đây là **lật nửa sau của DEC-029** (đang `APPROVED`: "giữ **cả hai** — cột số bắt buộc + cột text tuỳ
chọn"), nên bắt buộc phải có DEC mới chứ không được sửa lén (CLAUDE.md §6).

Vì sao **giữ cột** thay vì `drop column`: **BR-013 cấm xoá dữ liệu báo cáo dưới mọi hình thức**, và
production đang có dữ liệu thật trong cột này. `drop column` là xoá vĩnh viễn, mà migration chỉ tiến
tới (AGENTS.md §13) nên không có đường lùi. Giữ cột tốn đúng một cột `text` nullable — rẻ hơn nhiều
so với mất dữ liệu.

**Alternatives:**
*(a)* `drop column visit_purpose` — bị loại: xung đột thẳng với BR-013, và không hoàn tác được.
*(b)* Giữ ô nhập nhưng ẩn bằng CSS — bị loại: dữ liệu vẫn bị ghi tiếp, và đó không phải điều người
dùng yêu cầu.

**Impact:** `lib/validation/report.ts`, `features/report-morning/{actions,morning-report-form,commitment-summary}`,
`features/report-comparison/report-notes.tsx`, `supabase/migrations/0008`, `supabase/seed.sql`,
`lib/validation/report.test.ts`, `e2e/sales-flow.spec.ts`, `docs/01`, `docs/02`, `docs/05`, `docs/07`.

**Status:** APPROVED

---

## DEC-049 — BR-026: mục tiêu điểm viếng thăm có SÀN 10, giữ nguyên trần 1.000

**Date:** 2026-08-10
**Decision:** Sinh **BR-026** — `target_visit_points` phải nằm trong **[10, 1000]**. Sàn chỉ áp cho
**MỤC TIÊU**; `actual_visit_points` giữ nguyên dải **[0, 1000]**.

Enforce ở ba tầng, đúng thứ tự dự án vẫn làm:
`ck_target_visit_points` (migration `0008`, dạng `not valid`) → `MIN_TARGET_VISIT_POINTS` trong
`lib/validation/report.ts` → helper text *"Số điểm dự kiến ghé trong ngày. Tối thiểu 10."*

**Reason:** Người dùng gạch cụm *"Tối đa 1.000."* và viết đè *"Tối thiểu 10"* (ảnh 2, `§13c`).

Câu hỏi thật sự nằm ở chỗ khác: *"tối thiểu 10"* là **THAY** trần hay **THÊM** sàn? Chọn **thêm sàn,
giữ trần**, vì bỏ trần nghĩa là một lần gõ thừa số 0 (`10000`) đi thẳng vào database và làm lệch mọi
phép tổng hợp tháng của Admin — mà BR-013 thì cấm xoá báo cáo để sửa lại.

Vì sao sàn **không** áp cho `actual`: đi được ít điểm hơn cam kết là **kết quả thật**, không phải dữ
liệu sai. Một ngày mưa chỉ ghé được 3 điểm vẫn phải nhập được, nếu không Sales sẽ buộc phải khai
khống cho đủ 10.

**Alternatives:**
*(a)* Thay trần bằng sàn (bỏ trần) — bị loại, lý do ở trên.
*(b)* Áp sàn cho cả `actual` — bị loại: biến một kết quả xấu thành một lỗi nhập liệu.

**Impact:** `supabase/migrations/0008`, `lib/validation/report.ts`,
`features/report-morning/morning-report-form.tsx`, `supabase/seed.sql`, `tests/integration/*`,
`tests/rls/*`, `e2e/*`, `docs/01` (BR-026), `docs/02`, `docs/05`, `docs/08`.

**Status:** APPROVED

---

## DEC-050 — "Doanh số" thành TIỀN; "Doanh thu" thành công nợ THU HỒI (trả lời OQ-19)

**Date:** 2026-08-10
**Decision:** Hai chỉ tiêu đổi nghĩa, và bộ chỉ tiêu **vẫn đúng bốn** (BR-024 không đổi):

| Chỉ tiêu | Nghĩa CŨ | Nghĩa MỚI | Cột đọc |
|---|---|---|---|
| Doanh số | **số lượng xe** (`integer`) | **số tiền bán hàng trong ngày** (VND) | `*_sales_amount` (**MỚI**) |
| Doanh thu công nợ | giá trị đơn hàng chốt trong ngày | **tiền công nợ THU HỒI ĐƯỢC trong ngày** | `*_revenue` (giữ) |
| Khách hàng đã gặp | nhãn "Khách hàng" | nhãn **"Khách hàng đã gặp"** | `*_customer_visits` (giữ) |

Ba câu của OQ-19, người dùng đã trả lời ngày 2026-08-10:

- **19a — số lượng xe:** **BỎ HẲN.** Không thành chỉ tiêu thứ 5. `BR-024` ("đạt cả **4**") và cấu
  trúc `lib/reports/metric-rows.ts` vì vậy **không đổi**.
- **19b — "doanh thu công nợ":** là **tiền THU HỒI ĐƯỢC**, càng nhiều càng tốt ⇒ **BR-014 giữ
  nguyên** (`achievement = actual / target × 100`). Không cần công thức đảo, không cần BR mới.
- **19c — dữ liệu cũ:** các dòng có **trước** migration `0008` mang **`null`** ở cột doanh số mới.

Cách cài đặt và vì sao:

1. **Thêm CẶP CỘT MỚI `target_sales_amount` / `actual_sales_amount` (bigint)** thay vì đổi kiểu cột
   cũ. Nếu `alter column ... type bigint` trên `target_sales_quantity` thì con số `50` (nghĩa cũ: 50
   **xe**) lập tức bị mọi màn hình đọc thành `50 ₫` — sai dữ liệu, mà lại **không phân biệt được**
   với một báo cáo mới ghi đúng 50 ₫. Cột cũ ở lại làm **di sản** (BR-013), có `comment on column`.
2. **`KpiMetric.SALES_QUANTITY` → `SALES_AMOUNT`**, và `lib/kpi.ts` có `isMoneyMetric()` — hai chỉ
   tiêu tiền đi đường `formatCurrencyVND`, hai chỉ tiêu đếm giữ `điểm` / `khách`. Đơn vị `xe` **biến
   mất khỏi toàn dự án**.
3. **`KpiMetricRow` thêm `shortLabel`** cho thẻ ảnh 9:16: cột nhãn ở đó có bề rộng **cố định** và
   Satori không đo được chữ để tự thu nhỏ, nên "Doanh thu công nợ" / "Khách hàng đã gặp" phải rút
   thành "Công nợ" / "Khách hàng". Nhãn đầy đủ vẫn dùng ở mọi nơi khác.
4. **Ba constraint của `0008` dùng `not valid`.** Dòng cũ không thể thoả điều kiện mới (chúng mang
   `null` ở cột mới). `not valid` là cơ chế chuẩn của Postgres cho đúng việc này: **không** kiểm dòng
   cũ, nhưng **ép đủ với mọi `insert`/`update` từ nay**. Đây **không** phải constraint bị tắt, và cố
   ý **không** chạy `validate constraint` sau đó.
5. **Hệ quả đã lường trước:** báo cáo có trước `0008` **không** được đếm vào `kpi_achieved_days`, vì
   phép so sánh với `null` cho `null`. Đúng chủ ý — một ngày cũ chấm theo bộ chỉ tiêu cũ thì không
   thể tuyên bố là đạt theo bộ chỉ tiêu mới.

**Reason:** Yêu cầu trực tiếp của người dùng: *"Doanh số là doanh số bán hàng trong ngày (cho nhập số
tiền), doanh thu là doanh thu công nợ khách hàng (cho nhập số tiền)"*. Việc này lật **OQ-03/BR-006**
(doanh số = số lượng xe) và **OQ-14** (doanh thu = giá trị đơn hàng), cả hai đang `APPROVED`.

**Alternatives:**
*(a)* Giữ đếm xe thành chỉ tiêu thứ 5 — người dùng đã loại (19a). Nó sẽ kéo theo sửa BR-024, thẻ ảnh
9:16 (đang vừa khít 4 dòng), 5 hàm SQL aggregate và toàn bộ CSV.
*(b)* "Công nợ còn lại" thay vì "thu hồi được" — người dùng đã loại (19b). Nó cần công thức đảo, tức
một BR mới, cộng đảo ngưỡng màu của BR-023.
*(c)* Đổi kiểu cột cũ tại chỗ + quy đổi theo đơn giá trung bình — bị loại (19c): kết quả là số **ước
lượng** nằm lẫn với số thật mà không cách nào phân biệt về sau.

**⚠ Một điểm KHÔNG được suy rộng:** phương án "`null` cho dòng cũ" chỉ áp cho **doanh số**, là chỗ
kiểu dữ liệu thật sự đổi (đếm → tiền). Cột `*_revenue` **giữ nguyên giá trị cũ** vì nó vẫn là một số
tiền hợp lệ; điều đổi là *cách gọi tên*. Các dòng trước 2026-08-10 vì vậy mang nghĩa cũ "giá trị đơn
hàng chốt trong ngày" — đã ghi vào `comment on column` để không ai đọc nhầm sau này.

**Impact:** `supabase/migrations/0008` (4 hàm aggregate dựng lại), `supabase/seed.sql`,
`types/database.types.ts`, `lib/kpi.ts`, `lib/reports/metric-rows.ts`, `lib/reports/share-card.ts`,
`lib/validation/report.ts`, `services/{admin,reports}.ts`, `features/report-{morning,evening}/*`,
`features/admin-*`, `app/(sales)/*`, toàn bộ `tests/`, `e2e/`, `docs/01`, `docs/02`, `docs/05`,
`docs/07`, `docs/08`.

**Status:** APPROVED

---

## DEC-051 — Đăng xuất quay lại header; phản hồi khi chạm cho điều hướng

**Date:** 2026-08-10
**Decision:** Ba thay đổi giao diện của Phase 13 nhóm A:

1. **Nút Đăng xuất trở lại góc trên bên phải** của cả hai route group. Bản ở `/sales/account` và
   `/admin/account` **giữ nguyên**. Vấn đề bề rộng 375px từng là lý do gỡ nó đi (Phase 7/8) được giải
   bằng: dưới 640px nút **chỉ có icon** + `aria-label`, `shrink-0`; khối tên có `min-w-0` + `truncate`
   nên tên dài cắt bằng "…" thay vì đẩy nút ra khỏi màn hình. Panel xác nhận rơi xuống **dưới** thanh
   header (`absolute top-full`) nên không bao giờ làm vỡ hàng ngang.
2. **`components/ui/link-spinner.tsx`** — vòng xoay dựa trên `useLinkStatus()` của Next, đặt **bên
   trong** `<Link>`. Dự án đã có `loading.tsx`, nhưng nó chỉ hiện **sau khi** Next bắt đầu render
   trang đích; quãng từ lúc chạm tới đó trên 4G là khoảng lặng khiến Sales bấm lại lần hai. Luật
   `tap-feedback-speed` đòi phản hồi < 100 ms.
3. **`/sales/today` đảo thứ tự**: "Tuyến và ghi chú" đứng **trước** "Cam kết và thực đạt"; hai trang
   chi tiết báo cáo đồng bộ theo.

**Reason:** Yêu cầu trực tiếp của người dùng (ảnh 3 + hai gạch đầu dòng ở `§13c`). Điểm 3 cũng đúng
thứ tự công việc thật: buổi sáng Sales cần thấy mình định đi đâu, bảng số chỉ có nghĩa sau khi đã ra
thị trường.

**Alternatives:**
*(a)* Nút Đăng xuất có chữ ở mọi bề rộng — bị loại: chiếm ~120px của 375px, đúng vấn đề cũ.
*(b)* Thanh tiến trình toàn trang thay cho spinner theo từng link — bị loại: cần một provider client
bọc toàn app, trong khi `useLinkStatus` cho đúng tín hiệu cần mà không thêm state toàn cục nào.

**Impact:** `app/(sales)/layout.tsx`, `app/(admin)/layout.tsx`, `features/auth/header-sign-out.tsx`
(MỚI), `components/ui/link-spinner.tsx` (MỚI), `app/(sales)/sales/today/page.tsx`,
`app/(sales)/sales/reports/[id]/page.tsx`, `app/(admin)/admin/reports/[id]/page.tsx`, `docs/05`.

**Status:** APPROVED (technical)

---

## DEC-052 — Bảng số liệu của biểu đồ trend đổi sang thẻ ở mobile (theo DEC-019)

**Date:** 2026-08-10
**Decision:** Bảng trong `<details>` "Xem số liệu dạng bảng" của `DailyTrendChart` nay render **hai
nhánh** đúng như DEC-019: danh sách thẻ ở `< 768px`, `<table>` thật từ `768px`.

**Reason:** **Đo được thật**, không phải phòng xa: sau khi DEC-050 đổi doanh số sang tiền, bảng này
**tràn ngang 116px ở 375px**. Bốn cột — ngày kiểu "Chủ Nhật, 02/08/2026" cộng ba cột số kiểu
`100.000.000.000 ₫` — không có cách kê chữ nào vừa được 375px. Đây là vi phạm thẳng CLAUDE.md §11
("không dùng `<table>` cuộn ngang trên mobile") và luật `horizontal-scroll` (CRITICAL).

Lỗi này **bài E2E bắt được trước**, rồi bộ soát giao diện của Phase 13 chỉ đích danh từng phần tử gây
tràn. Nó **không thể** lộ ra ở lượt soát đầu tiên vì `<details>` đang đóng — nội dung gập lại không
tham gia layout. Bài học ghi lại: **soát bố cục phải mở mọi `<details>` trước khi đo.**

Phương án data-table bắt buộc của FR-037 (yêu cầu a11y cho biểu đồ) **không mất đi** ở bất kỳ bề rộng
nào — chỉ đổi hình thức trình bày ở mobile.

**Alternatives:**
*(a)* `overflow-x: auto` quanh bảng — bị loại: CLAUDE.md §11 cấm đúng điều đó.
*(b)* Rút gọn ngày và dùng `formatCompactVND` trong bảng — bị loại: `formatCompactVND` cố ý **chỉ**
dành cho thẻ ảnh 9:16, và bảng này tồn tại để cho **con số chính xác**.

**Impact:** `features/admin-analytics/daily-trend-chart.tsx`, `e2e/admin-flow.spec.ts`, `docs/05`.

**Status:** APPROVED (technical)

---

## DEC-053 — Soft UI Evolution: thêm CHIỀU SÂU, BO GÓC, CHUYỂN ĐỘNG (giữ nguyên bảng màu DEC-046)

**Date:** 2026-08-10
**Decision:** Áp một lớp ngôn ngữ thị giác lên toàn bộ sản phẩm. **Không đụng một token MÀU nào của
DEC-046** — chỉ thêm ba nhóm token mà bản cũ hoàn toàn không có, và đó chính là lý do giao diện đọc
ra "phẳng".

| Nhóm token mới | Nội dung |
|---|---|
| Chiều sâu | `--shadow-xs/sm/md/lg` (mỗi bậc **hai lớp**) + `--shadow-brand`/`--shadow-brand-sm` mang màu thương hiệu |
| Bo góc | `--radius-sm/md/lg/xl/pill` — 10/14/18/24px |
| Chuyển động | `--ease-out-soft`, `--ease-spring`, `--animate-rise-in`, `--animate-shimmer` |

Thay đổi trên từng lớp:

1. **`Card`** — tách lớp bằng **bóng mềm** thay vì viền mảnh. Viền cũ `#E3E9F0` chỉ **1,22:1** so với
   nền, nghĩa là ngoài nắng ranh giới card gần như không nhìn thấy và cả trang đọc ra một mảng trắng.
2. **`Button`** — chuyển sắc nhẹ + **bóng mang màu thương hiệu**, bóng **xẹp xuống** khi nhấn. Thêm
   biến thể **`accent`** (cam logo, chữ TỐI 8,17:1).
3. **`Input`/`Textarea`** — cao **52px** (từ 48px), nền **chìm** một bậc, **bật trắng + vòng sáng**
   khi focus. Ô nhập cũ trắng-trên-trắng trông như khối chữ chỉ đọc.
4. **`ProgressBar` (MỚI)** — thanh đọc-nhanh cho từng chỉ tiêu.
5. **`Skeleton`** — shimmer quét ngang thay cho nhấp nháy độ mờ.
6. **Header** — dính trên + kính mờ. **Bottom nav** — kính mờ + **gạch chỉ báo** ở tab đang mở.
7. **`/login`** — form vào trong thẻ nổi trên nền chuyển sắc thương hiệu.
8. **Ô chỉ số Admin** — **con số lên trước và to hẳn**, traffic-light chuyển thành **vạch màu bên
   trái ô** thay vì bọc con số trong một mảng màu.

**Reason:** Người dùng nói thẳng sau Phase 13: *"tôi chẳng thấy giao diện thay đổi gì hết, vẫn xấu i
chang"*. Phản hồi đó **đúng**. Phase 13b trước đó chỉ **ĐO TUÂN THỦ** (tương phản, cỡ chạm, tràn
ngang) và kết luận "0 vi phạm" — nhưng *"không vi phạm"* và *"đẹp"* là hai câu hỏi khác nhau, và
việc đo cái thứ nhất rồi báo cáo như thể đã trả lời cái thứ hai là một lỗi thật của phiên trước.

Hướng đi **không tự nghĩ ra**: tra `ui-ux-pro-max` cho product type gần nhất — *CRM & Client
Management* → **Flat + Minimalism** (nền, đã có sẵn) + **Soft UI Evolution + Micro-interactions**
(lớp còn thiếu). Bản thân style đó ghi rõ *"WCAG AA+, bóng mềm hơn flat nhưng rõ hơn neumorphism,
bo 8–12px, chuyển động 200–300ms"* — tức nó **cộng thêm** vào DEC-012/DEC-046 chứ không thay thế.

Vì sao bóng pha **xanh** (`rgba(15,23,42,…)`, chính là `--color-foreground`) chứ không đen thuần: nền
trang `#F4F7FA` đã ngả xanh, nên bóng đen thuần cho ra viền xám bẩn.

**Alternatives:**
*(a)* Đổi bảng màu cho "tươi hơn" — **bị loại thẳng**: người dùng chốt *"đúng theo tone màu tôi đã
yêu cầu"*, và DEC-046 đã đo contrast cho từng cặp. Vấn đề chưa bao giờ nằm ở màu.
*(b)* Glassmorphism / Dark Mode như skill gợi cho "IoT Dashboard" — bị loại: DEC-016 chốt v1 không
dark mode, và kính mờ toàn trang làm tụt tương phản đúng thứ NFR-007 cấm. Kính mờ vì vậy **chỉ** dùng
cho header và bottom nav, nơi không có nội dung đọc lâu.
*(c)* Thêm thư viện animation — bị loại: DEC-015 cấm, và toàn bộ chuyển động ở đây là hai
`@keyframes` chỉ chạm `transform`/`opacity`.

**Kiểm chứng — bắt buộc, vì thay đổi này đụng độ mờ và chuyển sắc trên gần như mọi bề mặt:**
`e2e/ui-quality.spec.ts` (**MỚI, ĐƯỢC COMMIT**) đo trên DOM đã render ở cả `mobile-375` lẫn
`desktop-1440`: `color-contrast` trên **cặp thực tế chồng nhau** · `touch-target-size` ·
`readable-font-size` · `horizontal-scroll` · `dynamic-type` ở 150%.

⚠ Bài test đó **cố ý được commit**, khác mọi bộ soát dùng-một-lần của Phase 2–6: `bg-card/85` trông y
hệt `bg-card` cho tới khi đo, nên đây đúng loại thay đổi làm tỉ lệ tương phản trôi đi mà không ai
nhận ra. Nó cũng mang theo **bốn cái bẫy đã sập một lần** (mở `<details>`, đi vào nhánh có dữ liệu,
dùng tài khoản vào được form, xuất bộ đếm để chống "xanh oan") — gỡ bất kỳ điều nào là mù lại.

**Impact:** `app/globals.css` · `components/ui/{card,button,input,textarea,badge,skeleton}.tsx` ·
`components/ui/progress-bar.tsx` (MỚI) · `features/report-comparison/{achievement-table,achievement-badge}.tsx` ·
`features/admin-dashboard/overview-tiles.tsx` · `features/navigation/main-nav.tsx` ·
`features/report-share/share-image-button.tsx` · `app/(sales)/layout.tsx` · `app/(admin)/layout.tsx` ·
`app/(sales)/sales/today/page.tsx` · `app/(auth)/login/page.tsx` · `e2e/ui-quality.spec.ts` (MỚI) ·
`e2e/accounts.ts` + `e2e/fixtures.ts` (thêm `uiSalesEmail`) · `docs/05 §14` · `docs/08 §13.5`.

⚠ **Một hệ quả không lường trước, đáng ghi lại:** bài `ui-quality` ban đầu dùng chung tài khoản Sales
với `sales-flow.spec.ts` và **xanh khi chạy riêng, đỏ ở cả ba project khi chạy `npm run e2e` đầy
đủ** — spec kia chạy trước, đưa tài khoản lên `COMPLETED`, rồi BR-019 khoá vĩnh viễn. Bài học mở
rộng quy tắc cũ của Phase 11: **mỗi spec CÓ GHI báo cáo phải có Sales riêng, không chỉ mỗi project**,
vì BR-001 + BR-019 biến một tài khoản Sales thành **tài nguyên dùng một lần trong ngày**
(`docs/08 §13.5`).

**Status:** APPROVED (technical)

---

## DEC-054 — `/login` bố cục chia đôi từ 1024px · Đăng xuất thành popover neo vào nút

**Date:** 2026-08-10
**Trigger:** Người dùng xem bản deploy và nói thẳng: *"trang đăng nhập và chỗ hiện nút đăng xuất quá
xấu, thiết kế lại giao diện cho đẹp hơn, ưu tiên điện thoại và laptop."* Đây là **đánh giá bằng mắt**,
không phải một phép đo trượt ngưỡng — và đó chính là loại tín hiệu mà bốn nhóm luật đo được của
DEC-053 **không thể** phát hiện (bài học đã ghi ở cuối DEC-053: *"không vi phạm" ≠ "đẹp"*).

**Decision:** Sáu thay đổi, tất cả nằm ở tầng trình bày. **Không đụng** một business rule, một token
màu (DEC-046), hay một luồng dữ liệu nào.

### 1. `/login` — một cột ở mọi bề rộng ⇒ **chia đôi từ `lg`**

| Bề rộng | Bố cục |
|---|---|
| < 1024px | **Một cột `max-w-md` canh giữa** — y như cũ, chỉ đẹp hơn. Cột thương hiệu **không tồn tại**, không thu nhỏ, không xếp chồng |
| ≥ 1024px | **Hai cột**: trái là mặt thương hiệu nền `heading`, phải là form |

Vì sao phải sửa: ở 1440px bản cũ để **~1.100px khoảng trắng chết** hai bên một thẻ 448px. Mắt đọc ra
"biểu mẫu bị bỏ quên giữa trang", không phải "màn hình mở đầu của một sản phẩm".

Vì sao cột trái **biến mất hẳn** dưới 1024px chứ không xếp chồng lên trên form: bắt Sales cuộn qua
một khối giới thiệu trước khi thấy ô Email là phản tác dụng trực tiếp với mobile-first
(CLAUDE.md §3 điều 9). Nội dung ba gạch đầu dòng ở cột trái phải soi được về **chức năng đã có
trong v1** — không được hứa thứ sản phẩm không giao (Master Spec §71).

### 2. Chữ hiệu logo có tone **`inverse`**

`BrandLockup` nhận `tone: 'brand' | 'inverse'`. Nền đậm dùng `inverse` (chữ **trắng**); hình xe
**giữ nguyên màu cam** ở cả hai tone vì đó là bản sắc logo gốc, và cam #E9A04F trên #0B4A76 đo được
**4,30:1** — vượt ngưỡng 3:1 của WCAG 1.4.11 cho đồ hoạ.

> ⚠ **Đây là một lỗi ĐÃ XẢY RA THẬT ở bản đầu của chính DEC này.** Cột trái ban đầu gọi
> `<BrandLockup className="text-white" />`, nhưng `class` bên trong là `text-heading` nên nó thắng:
> chữ **#0B4A76 trên nền #0B4A76 — tỉ lệ 1:1, chữ biến mất hoàn toàn**. Không một phép đo tự động
> nào của dự án bắt được, vì WCAG **miễn trừ logotype** khỏi ngưỡng tương phản nên bộ đo cũng bỏ
> qua nó. Nó chỉ lộ ra khi **chụp ảnh ra và nhìn**. Đây là lần thứ hai bài học đó phải trả giá.

### 3. Nút **hiện/ẩn mật khẩu**

Sales gõ mật khẩu một ngón, ngoài nắng, trên bàn phím ảo 375px. Không có nút hiện thì cách duy nhất
để sửa một ký tự gõ nhầm là xoá sạch gõ lại. Ràng buộc: `type="button"`, `aria-label` đổi theo trạng
thái + `aria-pressed`, vùng chạm **52×52px**, mặc định **luôn ẩn** và không nhớ trạng thái.

### 4. Xác nhận Đăng xuất ở header: **dải ngang toàn màn hình ⇒ thẻ neo vào nút**

Bản cũ là `absolute inset-x-0` chạy hết bề rộng. Ở 1440px câu hỏi nằm mãi bên trái còn hai nút nằm
mãi bên phải, cách nhau cả nghìn pixel — mắt không nối chúng thành một câu hỏi, và nó che mất dòng
đầu của nội dung như một thanh lỗi hệ thống.

Nay là popover `w-72` neo dưới đúng cái nút vừa bấm, có mũi nhọn chỉ lên nút. Kèm ba thứ một popover
buộc phải có mà bản cũ không có: **Esc đóng**, **chạm ra ngoài đóng**, **focus vào panel khi mở và
trả về nút khi đóng**. Focus đặt ở nút **Huỷ** — mở panel rồi gõ Enter theo quán tính thì kết quả
phải là "không có gì xảy ra".

**Hai nút xếp DỌC, không phải hai cột.** Bản đầu xếp `grid-cols-2`; chụp ảnh ra thì chữ "Đăng xuất"
**gãy làm hai dòng** trong ô 128px, và nới bề rộng panel cũng không cứu được vì nhãn lúc đang gửi
còn dài hơn ("Đang đăng xuất…"). Xếp dọc thì không nhãn nào gãy, ở bất kỳ độ dài nào.

### 5. `SignOutSubmit` — một nút gửi dùng chung cho **cả hai** chỗ xác nhận

Trước đây bản ở header có trạng thái `useFormStatus()`, bản ở `/…/account` **không có**. Gộp về
`features/auth/sign-out-submit.tsx` để hai chỗ không bao giờ lệch nhau nữa.

Ở `/…/account` khối xác nhận vẫn là **khối tại chỗ**, KHÔNG phải popover: nút ở đó nằm trong dòng
chảy của trang nên đẩy nội dung xuống là hành vi đúng và rẻ nhất — không có lớp nổi nào phải quản lý
focus, phím Esc hay bấm-ra-ngoài.

### 6. Logo trong header ngồi trong một ô bo góc `bg-accent/15`

Cân được khối lượng thị giác của nút Đăng xuất ở đầu kia hàng. Nền chỉ 15% nên không sinh cặp
nền×chữ mới nào phải đo (bài học ISSUE-018).

**Alternatives rejected:**
- *Đổi bảng màu cho "tươi hơn"* — cấm tuyệt đối, DEC-046 do người dùng chốt theo logo.
- *Xếp chồng cột thương hiệu lên trên form ở mobile* — xem lý do ở mục 1.
- *Dùng `window.confirm()` cho đăng xuất* — đã bác từ Phase 2 (NFR-009, webview Zalo).
- *Ẩn nhãn nút thành icon-only ở mọi bề rộng để tránh gãy chữ* — mất chữ là mất nghĩa; xếp dọc giải
  quyết triệt để hơn mà không mất gì.

**Impact:** `app/(auth)/login/page.tsx` · `features/auth/login-form.tsx` ·
`features/auth/header-sign-out.tsx` · `features/auth/sign-out-button.tsx` ·
**`features/auth/sign-out-submit.tsx` (MỚI)** · `components/ui/brand-mark.tsx` ·
`app/globals.css` (`@utility auth-brand-aura`) · `app/(sales)/layout.tsx` · `app/(admin)/layout.tsx` ·
`docs/05 §13.4 + §17` · `next.config.ts` (ISSUE-025).

**Tương phản đã ĐO trên cột thương hiệu** (không ước lượng): chữ trắng trên `heading` #0B4A76 =
**8,66:1**; chỗ sáng nhất của vệt sáng xanh (alpha 0,55 chồng lên `heading` ⇒ #1E72A7) =
**5,21:1**. Vì vậy cột trái dùng `text-white` **đặc** ở mọi dòng chữ và phân cấp bằng cỡ/độ đậm —
`text-white/85` đo được chỉ **4,21:1**, trượt AA. **Đừng đưa opacity vào chữ trên nền đó.**

**Status:** APPROVED (design, theo yêu cầu trực tiếp của người dùng)

---

## DEC-055 — Gỡ hẳn "Sửa cam kết sáng" (UC-05 / FR-012 ra khỏi v1)

**Date:** 2026-08-11
**Decision:** Sales **không còn sửa được cam kết đầu ngày** sau khi đã gửi. Cụ thể, năm thứ bị xoá
cùng lúc chứ không chỉ ẩn nút đi:

| Thứ bị xoá | Ở đâu |
|---|---|
| CTA phụ "Sửa cam kết sáng" | `lib/reports/today-cta.ts` — nhánh `MORNING_SUBMITTED` nay `secondaryCta: null`, khoá `EDIT_MORNING` biến mất khỏi `TodayCtaKey` |
| Chế độ `edit` của form sáng | `features/report-morning/morning-report-form.tsx` — hết `mode`, hết `reportId`, hết input ẩn `report_id` |
| Server Action `updateMorningReport` | `features/report-morning/actions.ts` |
| Hàm service `updateMorningReport()` | `services/reports.ts` |
| Thông báo `MORNING_UPDATED` | `lib/reports/messages.ts` |

`canOpenMorningForm()` rút về đúng một vế: **`report === null`**. Vào thẳng
`/sales/today/morning` khi hôm nay đã có báo cáo thì bị `redirect()` về `/sales/today`.

**Reason:** Người dùng yêu cầu trực tiếp ("bỏ hẳn nút sửa cam kết sáng"), và khi được hỏi rõ phạm
vi thì chọn **bỏ hẳn khả năng sửa**, không phải chỉ ẩn nút. Lý do nghiệp vụ đứng vững: cam kết sáng
là một **lời hứa đã gửi đi**. Sửa được nó trong ngày — sau khi đã biết mình đang thắng hay thua —
làm rỗng ý nghĩa của cả bản đối chiếu cuối ngày, thứ mà toàn bộ sản phẩm này tồn tại để tạo ra.

**Ba điều KHÔNG đổi, ghi lại để không ai "dọn dẹp" nhầm:**

1. **Policy `reports_update_own_open` ở lại nguyên vẹn.** Nó vẫn là đường ghi hợp lệ duy nhất của
   `completeEveningReport()` (UC-06). Bỏ nó là làm sập luồng cuối ngày.
2. **BR-019 không đổi** — nó nói về khoá vĩnh viễn sau `COMPLETED`. DEC này khoá **sớm hơn một
   bước**, ngay ở `MORNING_SUBMITTED`.
3. **BR-001 không đổi** — vẫn đúng một báo cáo mỗi ngày; nay nó cũng có nghĩa là **đúng một lần
   nhập** cam kết sáng.

**Alternatives:**
*(a)* Chỉ ẩn nút, giữ route sửa được bằng URL — **bị loại**: người dùng đã chọn phương án bỏ hẳn, và
để lại một màn hình không có lối vào là nợ kỹ thuật thuần tuý.
*(b)* Cho sửa trong N phút đầu — **bị loại**: thêm một chiều thời gian vào nghiệp vụ mà không ai yêu
cầu, và phải có audit log đi kèm (AF-12).

**Impact:** `lib/reports/today-cta.ts` + test · `lib/reports/messages.ts` ·
`features/report-morning/{actions,morning-report-form}.tsx` · `services/reports.ts` ·
`app/(sales)/sales/today/morning/page.tsx` · `e2e/sales-flow.spec.ts` · `docs/01`, `docs/02`,
`docs/03`, `docs/07`.

**Status:** APPROVED (theo yêu cầu trực tiếp của người dùng, 2026-08-11)

---

## DEC-056 — Thẻ ảnh: "Công nợ" thành "Doanh thu"; "Doanh thu thực đạt" thành "Số khách làm việc"

**Date:** 2026-08-11
**Decision:** Hai sửa đổi **nội dung** trên tấm ảnh 9:16:

1. **Nhãn rút gọn của chỉ tiêu `REVENUE` đổi từ `'Công nợ'` thành `'Doanh thu'`**
   (`lib/reports/metric-rows.ts`). Nhãn đầy đủ trên web giữ nguyên "Doanh thu công nợ".
2. **Khối nhấn mạnh dưới bảng đổi hẳn nội dung**: từ "DOANH THU THỰC ĐẠT" (số tiền đầy đủ) thành
   **"SỐ KHÁCH LÀM VIỆC"** — một tỉ lệ phần trăm:

   ```text
   Số khách làm việc = actual_customer_visits / actual_visit_points × 100
   ```

   Kèm một dòng phụ giải thích (`'5 khách / 10 điểm'`). Công thức nằm ở
   **`lib/kpi.calculateCustomerWorkRate()`**, không ở component và không ở `share-card.ts`.

**Reason:** Cả hai đều do người dùng nêu khi nhìn tấm ảnh thật.
*Nhãn:* từ DEC-050, cột này là **tiền đã THU HỒI ĐƯỢC**, nên chữ "Công nợ" nói ngược nghĩa với người
đọc tấm ảnh (thường là cấp trên trên Zalo).
*Khối nhấn mạnh:* "Doanh thu thực đạt" lặp lại đúng con số đã có ở dòng thứ ba của bảng ngay bên
trên — tấm ảnh nói một thông tin hai lần. "Số khách làm việc" thì không xuất hiện ở đâu khác.

**Bốn ràng buộc đã chốt kèm công thức:**

| Tình huống | Kết quả | Vì sao |
|---|---|---|
| `actual_visit_points = 0` | **`'—'`** | Chia cho 0 không xác định. Tinh thần BR-015: thà một ô trống đọc được còn hơn một `∞` lọt ra ảnh gửi cho khách |
| Chưa có số liệu cuối ngày | **`'—'`**, không có dòng phụ | `'— / —'` không giải thích được gì |
| Tỉ lệ > 100% | **KHÔNG clamp** | Một điểm viếng thăm gặp nhiều khách là kết quả thật, cùng lý do với BR-004 |
| Làm tròn | 1 chữ số thập phân ở `display`, `percent` giữ số thô | Cùng quy ước BR-014 |

**Đây KHÔNG phải chỉ tiêu thứ năm.** Nó không có cột `target_*`, không vào bảng bốn dòng, không đi
qua ngưỡng BR-023, và **không tham gia `isKpiAchievedDay()`** — BR-024 vẫn là "cả 4 chỉ tiêu ≥ 100%".
Vì vậy nó là một **DEC**, không phải một `BR` mới (dãy `BR` vẫn đóng ở BR-026).

**Alternatives:**
*(a)* Giữ khối doanh thu và thêm khối mới bên dưới — **bị loại**: thẻ đã dài, và người dùng nói rõ
là **đổi**, không phải thêm.
*(b)* Tính tỉ lệ trong component thẻ ảnh — **bị loại**: vi phạm AGENTS.md §1.3 và NFR-012; mọi phép
chia phần trăm của dự án nằm ở `lib/kpi.ts`.
*(c)* Mẫu số là `target_visit_points` — **bị loại**: người dùng nói "điểm **đã** viếng thăm", và khi
được hỏi lại đã xác nhận lấy số **thực đạt**.

**Impact:** `lib/kpi.ts` (+ 9 test mới) · `lib/reports/metric-rows.ts` · `lib/reports/share-card.ts`
(+ test) · `features/report-share/daily-report-share-card.tsx` · `docs/05 §14`.

**Status:** APPROVED (theo yêu cầu trực tiếp của người dùng, 2026-08-11)

---

## DEC-057 — Thẻ ảnh 9:16 đổi sang NỀN SÁNG tone logo (thay bảng hex tối của Phase 6)

**Date:** 2026-08-11
**Decision:** Thẻ ảnh bỏ bảng màu tối `#0B1220` + vàng `#FBBF24` của Phase 6, chuyển sang **nền
trắng, chữ xanh logo, nhấn cam logo** — lấy nguyên các token đã đo của **DEC-046**:

| Vai trò | Giá trị | Trên trắng | Trên sọc `#F4F7FA` |
|---|---|---:|---:|
| Nền thẻ | `#FFFFFF` | — | — |
| Sọc bảng (chẵn/lẻ) | `#F4F7FA` | 1,08:1 *(tách lớp, không mang chữ)* | — |
| Tên, tiêu đề, số cam kết | `#0B4A76` | **9,31:1** | **8,66:1** |
| Chữ thân | `#0F172A` | **17,85:1** | **16,60:1** |
| Nhãn phụ | `#566A7B` | **5,61:1** | **5,22:1** |
| Chữ cam | `#97580B` | **5,65:1** | — |
| Vượt mục tiêu | `#166534` | **7,13:1** | **6,63:1** |
| Gần đạt | `#92400E` | **7,09:1** | **6,59:1** |
| Chưa đạt | `#991B1B` | **8,31:1** | **7,73:1** |
| Nền khối nhấn mạnh | `#FDF1E3` | — | `body` 16,04 · `accentText` 5,08 · `muted` 5,04 |
| Cam logo (vạch + viền) | `#E9A04F` | *chỉ đồ hoạ* | — |

**Cặp thấp nhất của cả tấm ảnh là 5,04:1** — vẫn dư ngưỡng AA 4,5:1.

**Reason:** Người dùng nói thẳng: *"hiện tại đang bị tối quá, sử dụng tone màu logo"*. Bảng tối của
Phase 6 ra đời **trước** DEC-046 (bảng màu logo) nên nó là mảnh **duy nhất** của sản phẩm còn nói
một thứ tiếng màu khác với phần còn lại.

**Ba quyết định trình bày đi kèm, đều có lý do đo được:**

1. **Sọc nền chẵn/lẻ thay đường kẻ ngang.** Ảnh gửi Zalo bị nén; một đường kẻ 1px ở 1,25:1 là thứ
   đầu tiên biến mất sau khi nén, một mảng nền rộng thì không.
2. **Cam logo chỉ làm vạch trang trí và nền khối nhấn mạnh**, không bao giờ làm chữ — chữ trắng trên
   cam đo được **2,19:1**, đúng điều DEC-046 cấm tuyệt đối.
3. **Kích thước chữ khác nhau giữa hai biến thể** (xem DEC-058). Bản đầu dùng chung một cỡ và **mắt
   bắt được lỗi mà không phép đo nào bắt được**: bản sáng chỉ có 4 con số nên nội dung kết thúc ở
   khoảng 1030/1920 — gần nửa tấm ảnh là khoảng trắng. Đã render PNG thật ra nhìn, sửa, rồi nhìn
   lại. Đây là lần thứ ba bài học DEC-053 phải học lại.

**Alternatives:**
*(a)* Giữ nền tối nhưng đổi sang xanh logo `#0B4A76` → `#1273B8` — **bị loại**: người dùng chọn
phương án nền trắng khi được hỏi.
*(b)* Đầu ảnh là mảng cam đặc — **bị loại**: cùng lý do, và nó ăn mất 1/6 chiều cao cho trang trí.

**Impact:** `features/report-share/daily-report-share-card.tsx` (viết lại), `app/globals.css` (ghi
chú đầu file), `docs/05 §4.5` và `§14`.

**Status:** APPROVED (design, theo yêu cầu trực tiếp của người dùng, 2026-08-11)

---

## DEC-058 — Mỗi ngày HAI tấm ảnh: bản CAM KẾT (sáng) và bản KẾT QUẢ (chiều) — nới BR-002

**Date:** 2026-08-11
**Decision:** Sales xuất ảnh **hai lần một ngày**. Thẻ ảnh có hai biến thể, do `status` **đã
persist** quyết định:

| | `MORNING` | `EVENING` |
|---|---|---|
| Điều kiện | `status = 'MORNING_SUBMITTED'` | `status = 'COMPLETED'` |
| Chữ trên đầu thẻ | `CAM KẾT ĐẦU NGÀY` | `KẾT QUẢ CUỐI NGÀY` |
| Bảng | **2 cột** — chỉ tiêu · cam kết | **4 cột** — thêm thực đạt · % hoàn thành |
| Khối "Số khách làm việc" | *(không có)* | có |
| Ghi chú cuối ngày | *(chưa tồn tại)* | có nếu Sales nhập |
| Nhãn nút | **"Lưu hình báo cáo đầu ngày"** | "Xuất ảnh báo cáo" |
| Tên file | `BikeForce_CamKet_….png` | `BikeForce_Report_….png` |

Nút buổi sáng đứng **đúng chỗ** nút "Sửa cam kết sáng" vừa bị DEC-055 gỡ.

**Reason:** Yêu cầu trực tiếp của người dùng: *"chỗ sửa cam kết sáng này đổi thành lưu hình báo cáo
đầu ngày, để sáng gửi 1 lần chiều gửi 1 lần"*, và xác nhận lại: *"miễn sáng và chiều đều có thể
xuất ảnh báo cáo là được"*. Đây là cách đội Sales thật sự dùng Zalo — báo cam kết đầu ca, báo kết
quả cuối ca.

**BR-002 được NỚI, không bị bỏ.** Nguyên văn cũ: *"Chỉ xuất ảnh sau khi báo cáo persist thành công
và `status = 'COMPLETED'`"*. Nay:

> Chỉ xuất ảnh từ một báo cáo **đã persist**; `status` quyết định **biến thể** ảnh.
> Điều kiện KHÔNG BAO GIỜ được suy ra từ trạng thái form phía client.

Phần cốt lõi — thứ BR-002 sinh ra để chặn — **giữ nguyên**: không có đường nào dựng ảnh từ dữ liệu
client gửi lên, và client **không chọn được biến thể**. Route handler đọc `status` từ database.
Hệ quả kỹ thuật: nhánh `403 NOT_COMPLETED` trong route ảnh và chuỗi `REPORT_MESSAGES.NOT_COMPLETED`
đã bị xoá vì không còn đường nào tới được.

**Hai điểm ghi lại để không mắc lại:**

1. **Tham số `variant` của `shareImageFileName()` là BẮT BUỘC, cố ý không có giá trị mặc định.** Hai
   tấm ảnh cùng ngày mà trùng tên file thì tấm chiều **ghi đè** tấm sáng trong thư mục Tải về của
   điện thoại — lỗi chỉ lộ ra sau khi đã gửi nhầm.
2. **Trường `canExportImage: boolean` của `TodayView` bị thay bằng `shareImageVariant`.** Một
   boolean không diễn tả nổi "xuất được, nhưng là tấm nào".

**Alternatives:**
*(a)* Một tấm ảnh duy nhất, buổi sáng để cột "Thực đạt" là `—` — **bị loại**: bảng 4 cột với nửa số
ô là dấu gạch trông như dữ liệu lỗi, không như một bản cam kết.
*(b)* Client gửi `?variant=` lên route — **bị loại**: mở đúng bề mặt mà BR-002 sinh ra để đóng.

**Impact:** `lib/reports/share-card.ts` (+ test) · `lib/reports/today-cta.ts` (+ test) ·
`lib/reports/messages.ts` · `features/report-share/{daily-report-share-card,share-image-button}.tsx` ·
`app/api/reports/[id]/share-image/route.tsx` · `app/(sales)/sales/today/page.tsx` ·
`app/(sales)/sales/reports/[id]/page.tsx` · `e2e/sales-flow.spec.ts` · `docs/01`, `docs/03`,
`docs/05`, `docs/07`.

**Status:** APPROVED (theo yêu cầu trực tiếp của người dùng, 2026-08-11)

---

## DEC-059 — `saveMorningReport` cũng tự `redirect()` — DEC-037 nay áp cho CẢ HAI luồng

**Date:** 2026-08-11
**Decision:** Server Action `saveMorningReport` **không còn trả `ok: true`**. Khi lưu thành công nó
tự `redirect('/sales/today?saved=morning')`. Kiểu trả về rút về đúng nhánh lỗi:

```ts
export type MorningReportState = Exclude<ActionResult<never>, { ok: true }> | null;
```

Ba thay đổi đi kèm:

| Thay đổi | Ở đâu |
|---|---|
| Bỏ `useEffect` bắt `state.ok` để `clearDraft()` + `router.replace()` | `morning-report-form.tsx` |
| `isBusy` rút về `isPending` *(không còn giai đoạn "đã xong, chờ điều hướng")* | `morning-report-form.tsx` |
| **`DiscardMorningDraft` — component MỚI**, không render gì, dọn draft trên `/sales/today` khi hôm nay đã có báo cáo | `features/report-morning/discard-morning-draft.tsx` |
| Bỏ `revalidatePath(MORNING_REPORT_PATH)` | `features/report-morning/actions.ts` |

**Reason:** **DEC-055 làm cách cũ vỡ, và bộ E2E bắt được ngay ở lượt chạy đầu** — 3/3 project đỏ
cùng một dòng: `expect(page.getByText('Đã lưu báo cáo đầu ngày')).toBeVisible()` không tìm thấy
banner.

Cơ chế đã được chính dự án ghi lại từ Phase 4 (ISSUE-014, DEC-037): sau mỗi Server Action, Next
render lại RSC của **route hiện tại**. Từ DEC-055, lần render lại đó của `/sales/today/morning`
thấy hôm nay **đã có** báo cáo nên chạy `redirect(SALES_TODAY_PATH)` — một điều hướng **phía
server, không mang theo `?saved=`**. Nó thắng trước `useEffect` của form, nên:

- banner xác nhận biến mất, và
- `clearDraft()` không bao giờ chạy ⇒ draft còn sót trong localStorage.

**Bỏ `revalidatePath` của chính route đó KHÔNG cứu được** — Next re-render route hiện tại dù có
revalidate hay không. Điều này đã được đo thật ở Phase 4 và ghi ngay trong chú thích của
`features/report-evening/actions.ts`; phiên này chỉ việc đọc lại thay vì thử lại.

**Điều đáng nói nhất:** DEC-037 (Phase 4) đã viết sẵn quy tắc rút ra —

> *"nếu route hiện tại có thể tự `redirect()` sau khi dữ liệu đổi, hãy để Server Action tự
> `redirect()` — đừng trông chờ `useEffect` của client được chạy nốt."*

DEC-055 vừa biến `/sales/today/morning` thành đúng loại route đó. Vậy nên đây **không phải một
quyết định mới**, mà là quy tắc cũ nay áp đủ cho cả hai luồng. Câu trong DEC-037 mô tả luồng sáng
như một **ngoại lệ** ("form đầu ngày nhận `ok: true` rồi tự `router.replace()`") **hết hiệu lực từ
đây** — không còn ngoại lệ nào.

**Hai thứ KHÔNG đổi:**

1. **DEC-034 vẫn nguyên vẹn** — câu xác nhận do **server** quyết định, client không suy ra. Nay
   server còn quyết định luôn cả việc điều hướng, tức là đi xa hơn theo cùng một hướng.
2. **Ba lớp chống trùng của FR-011** vẫn đủ ba: RSC guard → Server Action → `UNIQUE(sales_id, report_date)`.

**Alternatives:**
*(a)* Bỏ `revalidatePath(MORNING_REPORT_PATH)` và giữ nguyên `ok: true` — **bị loại**: đã có bằng
chứng đo được từ Phase 4 rằng nó không đủ.
*(b)* Cho `/sales/today/morning` render một trang "đã cam kết rồi" thay vì `redirect()` — **bị
loại**: nó dựng lại đúng màn hình mà DEC-055 vừa gỡ, chỉ khác cái tên.
*(c)* Dọn draft bằng `useEffect` trong form với `cleanup` — **bị loại**: cleanup của một component
bị unmount vì điều hướng server không có gì bảo đảm chạy trước khi trang mới mount.

**Impact:** `features/report-morning/actions.ts` · `features/report-morning/morning-report-form.tsx` ·
`features/report-morning/discard-morning-draft.tsx` (**MỚI**) · `app/(sales)/sales/today/page.tsx` ·
`docs/03 §4.2` · `docs/07 §3.5`.

**Status:** APPROVED (technical — bắt buộc để E2E xanh, 2026-08-11)

---

## DEC-060 — Nút xuất ảnh: share sheet CHỈ cho thiết bị cảm ứng; mọi nhánh phải để lại dấu vết

**Date:** 2026-08-11
**Decision:** `features/report-share/share-image-button.tsx` được viết lại theo **ba nguyên tắc**:

**(a) Share sheet chỉ dùng khi `pointer: coarse`.** Máy tính có chuột đi thẳng đường tải về.

**(b) Không nhánh nào được kết thúc trong im lặng.** Mỗi đường ra để lại một thứ nhìn thấy được:
share sheet mở ra, hoặc dòng "Đã tải ảnh về máy…", hoặc một điều hướng thật, hoặc câu lỗi.

**(c) Luôn có một lối lấy ảnh KHÔNG cần JavaScript** — link `<a>` "Mở ảnh trực tiếp" trỏ thẳng vào
route ảnh, luôn hiện dưới nút.

Bảng đường đi sau khi sửa:

| Ngữ cảnh | Đường đi |
|---|---|
| `pointer: coarse` (điện thoại) | `navigator.share({files})` → nếu hỏng (kể cả `NotAllowedError`) thì **`window.location.href = shareImagePath(id)`** |
| `pointer: fine` (máy tính) | `fetch` → blob → `<a download>` → dòng xác nhận |
| Mọi ngữ cảnh | link "Mở ảnh trực tiếp", không cần JS |
| Người dùng huỷ share sheet | im lặng — huỷ **không** phải lỗi |

**Reason:** Người dùng báo hai lỗi thật trên production (**ISSUE-027**):
*(1)* trên điện thoại bấm nút **không có gì xảy ra**; *(2)* trên máy tính hiện share sheet của
Windows, trong đó **không có Zalo**.

Gốc của vế (1) là một cái bẫy đáng ghi lại: bản cũ đặt đường dự phòng trong `catch` của
`anchor.click()` — nhưng **`click()` không bao giờ ném lỗi**. Khi trình duyệt lặng lẽ **bỏ qua**
thuộc tính `download` (iOS Safari với `blob:`, webview Zalo), lệnh vẫn "thành công" nên nhánh dự
phòng không chạy. Và ca này **không phát hiện được bằng feature detection**: `'download' in anchor`
vẫn trả `true` trên iOS Safari. Vì vậy trên thiết bị cảm ứng ta **không dùng `<a download>` nữa** mà
điều hướng thật — server đã đặt `Content-Disposition: attachment` nên trình duyệt buộc phải tải file
hoặc hiện bảng chọn của nó. Một điều hướng thật **không thể im lặng**.

Gốc của vế (2): `navigator.canShare({files})` trả `true` trên Chrome Windows. Điều kiện
`pointer: coarse` vẫn là **feature detection** — nó hỏi đúng câu cần hỏi ("máy này có phải cái người
dùng cầm trên tay không"), khác hẳn việc đọc `userAgent` mà DEC-011 đã cấm.

**Điều đáng giá nhất của quyết định này nằm ở bộ test, không nằm ở code.** Bộ E2E chỉ kiểm nút
`toBeVisible()` và gọi route bằng `page.request.get()`; **không bài nào bấm nút**, nên
`handleExport()` chưa từng chạy một lần trong CI. 121 bài xanh trong khi nhánh quan trọng nhất của
tính năng chưa được chạm tới.

> **Luật mới, áp cho mọi nút về sau:** `toBeVisible()` chỉ chứng minh nút **tồn tại**, không chứng
> minh nút **làm được việc**. Nút nào gọi Web API của trình duyệt (`navigator.share`, `download`,
> clipboard, camera, notification) **bắt buộc** phải có một bài E2E **bấm thật**.

**Hàng rào:** `e2e/share-image.spec.ts` (MỚI) — 4 bài × 3 project: bấm thật và bắt sự kiện
`download`; khoá "máy tính KHÔNG mở share sheet"; khoá "thiết bị cảm ứng gửi đúng file PNG > 1KB";
khoá sự tồn tại của link không-cần-JS.

**Alternatives:**
*(a)* Giữ `<a download>` cho cả điện thoại và chỉ thêm thông báo — **bị loại**: thông báo sẽ **nói
dối** ("đã tải") ở đúng ca file không hề được tải.
*(b)* Đọc `userAgent` để nhận diện iOS/webview — **bị loại**: DEC-011 đã cấm, và danh sách webview
thì không bao giờ đầy đủ.
*(c)* Bỏ hẳn Web Share, chỉ tải về — **bị loại**: mục tiêu thật của tính năng là **gửi Zalo bằng
một chạm**, và trên điện thoại share sheet làm được đúng việc đó.
*(d)* Hai nút riêng ("Lưu ảnh" và "Chia sẻ") — **bị loại**: luật `primary-action` chỉ cho một hành
động chính mỗi màn hình, và người dùng ngoài thị trường không nên phải chọn.

**Impact:** `features/report-share/share-image-button.tsx` (viết lại) · `e2e/share-image.spec.ts`
(MỚI) · `playwright.config.ts` (ISSUE-028) · `docs/07 §4.1` · `docs/08` · `docs/12` (ISSUE-027,
ISSUE-028).

**Status:** APPROVED (bug fix, do người dùng báo trên production, 2026-08-11)

---

## Trạng thái: không còn quyết định nào bị chặn

Ngày **2026-08-07**, người dùng đã trả lời **đủ 17/17 OPEN QUESTION**. Bốn quyết định trước đó ở trạng thái `PROPOSED` đã chuyển sang `APPROVED`:

| DEC | Trước | Sau | OQ đã trả lời | Nội dung chốt |
|---|---|---|---|---|
| DEC-025 | PROPOSED | **APPROVED** | OQ-11 | `target=0 & actual=0` → `100,0%`. `target=0 & actual>0` → **số vượt tuyệt đối** (`+3 xe`, `+3.000.000 ₫`), `percent = null`, loại khỏi mẫu số khi tổng hợp |
| DEC-026 | PROPOSED | **APPROVED** | OQ-04, OQ-05, OQ-12, OQ-13 | Khoá vĩnh viễn khi `COMPLETED`; Admin không sửa; chỉ nhập đúng ngày hôm nay; không xoá (kể cả soft delete) |
| DEC-029 | PROPOSED | **APPROVED** | OQ-01, OQ-02 | Giữ **cả hai**: cột số bắt buộc + cột text tuỳ chọn, cho cả target lẫn actual |
| DEC-030 | PROPOSED | **APPROVED** | OQ-08, OQ-09, OQ-10, OQ-15, OQ-16 | Không ngày nghỉ, không team/vùng, chỉ 2 role, không SKU/đại lý/đơn hàng, KPI do Sales tự cam kết |

**Hệ quả:** Phase 2 (migrations + RLS) **đã hết blocker**, có thể viết được ngay sau khi Phase 1 dựng xong nền.

Hai điểm cần theo dõi tiếp, **không chặn tiến độ** nhưng đã ghi nhận:
- **AF-12 (audit log)** — chưa cần vì không ai được sửa sau khi hoàn tất. Nếu sau này mở quyền sửa (OQ-04/OQ-05), **phải làm audit log trước**.

Danh sách câu hỏi và câu trả lời đầy đủ nằm ở `docs/01-business-analysis.md` mục OPEN QUESTIONS.

---

## DEC-061 — "Tải về" không phải "lưu vào thư viện": route ảnh có thêm chế độ XEM

**Date:** 2026-08-11
**Status:** APPROVED (người dùng báo lỗi trực tiếp — ISSUE-029)
**Bối cảnh:** ngay sau khi DEC-060 sửa xong ISSUE-027, người dùng báo tiếp: trên điện thoại, ảnh
"tải về xong tự động lưu ở đâu đó", không vào Thư viện ảnh, và họ **không tìm ra file**.

**Sự thật kỹ thuật phải nhớ trước khi đọc quyết định:**

> **Trang web không có bất kỳ API nào ghi vào Thư viện ảnh của Android hay app Ảnh của iOS.**
> Không có `navigator.saveToGallery`, và `Content-Disposition` dù đặt thế nào cũng chỉ điều khiển
> được *thư mục tải xuống*. Đây là giới hạn của hệ điều hành, không phải thiếu sót của sản phẩm.

Từ đó chỉ còn **hai** đường vào thư viện, **cả hai đều cần một thao tác tay của con người**:

| # | Đường | Cơ chế | Có trên |
|---|---|---|---|
| 1 | Bảng chia sẻ của hệ điều hành → "Lưu ảnh" | `navigator.share({ files })` | Android + iOS |
| 2 | **Nhấn giữ vào ảnh đang hiển thị** → "Lưu ảnh" / "Tải ảnh xuống" | ảnh phải được HIỆN | Android + iOS |

**Decision:**

1. `GET /api/reports/[id]/share-image` nhận thêm tham số **`?view=1`** → trả
   `Content-Disposition: **inline**` thay vì `attachment`. Mặc định **không đổi**: không có tham số
   thì vẫn là `attachment`.
   Tham số này **không** chạm quyền, **không** chọn dữ liệu, **không** chọn biến thể ảnh — mọi lớp
   kiểm tra chạy y hệt ở cả hai chế độ, nên không mở ra bề mặt tấn công mới.
2. Khi bảng chia sẻ không dùng được, nút **hiện thẳng tấm ảnh ra trong trang** bằng
   `<img src="…?view=1">`, kèm câu "Nhấn giữ vào ảnh bên dưới rồi chọn *Lưu ảnh*…". **Không** điều
   hướng, **không** sinh file lạc.
3. Link "lối thoát không cần JavaScript" (nguyên tắc (c) của DEC-060) trỏ vào `?view=1` — trước đây
   nó trỏ vào chế độ tải nên chỉ mở ra một tab trắng rồi tải thêm một file.
4. Ảnh xem trước dùng **URL http thật**, không dùng `blob:` của lượt `fetch`: thao tác "Lưu ảnh" khi
   nhấn giữ chạy ổn định với URL thật trên cả Chrome Android lẫn Safari iOS, còn với `blob:` thì tuỳ
   phiên bản.

**Phương án đã cân nhắc và loại:**

| Phương án | Vì sao loại |
|---|---|
| Đổi tên file / đổi thư mục tải về | Không giải quyết gì: vấn đề không phải tên file mà là **file không nằm trong thư viện**, và web không chọn được thư mục đích |
| Ghi thẳng vào thư viện | **Không tồn tại API nào.** Đây là điều kiện biên, không phải lựa chọn |
| Bỏ hẳn `attachment`, luôn trả `inline` | Máy tính không có "thư viện ảnh"; người dùng máy tính cần **file**, và DEC-060 vừa chốt điều đó |
| Chỉ thêm một câu hướng dẫn "vào thư mục Tải xuống mà tìm" | Đúng nhưng vô dụng: người dùng muốn ảnh **trong thư viện** để gửi lại, không muốn học đường đi của file |

**Hệ quả bắt buộc nhớ:**
- **Không** đặt giá trị mặc định `inline` cho route ảnh.
- **Không** đưa nhánh dự phòng của điện thoại về `window.location.href` — đó chính là ISSUE-029.
- Mọi câu chữ trong giao diện phải phân biệt rạch ròi **"đã tải về"** với **"đã lưu vào thư viện"**.

---

## DEC-062 — Giao diện điện thoại tách hai nút: "Gửi qua Zalo" và "Lưu vào thư viện ảnh"

**Date:** 2026-08-11
**Status:** APPROVED (người dùng yêu cầu trực tiếp: *"triển khai thêm nút gửi qua zalo ở giao diện
điện thoại"*, và *"áp dụng được cho cả android và ios nhé"*)

**Decision:** trên thiết bị cảm ứng, khối xuất ảnh có **hai** nút thay vì một:

| Nút | Biến thể | Hành vi |
|---|---|---|
| **Gửi cam kết qua Zalo** (sáng) / **Gửi kết quả qua Zalo** (chiều) | `accent` (cam logo) | `navigator.share({ files })` → **bảng chia sẻ của hệ điều hành**, nơi Zalo là một mục. Hỏng thì hiện ảnh ra kèm hướng dẫn 3 bước: lưu ảnh ⇢ mở Zalo ⇢ gửi |
| **Lưu vào thư viện ảnh** | `secondary` | Hiện `<img …?view=1>` ngay trong trang + câu "nhấn giữ để lưu". **Không chờ mạng**, không dựng blob |

Máy tính **giữ nguyên một nút tải file** ("Xuất ảnh báo cáo") — không có Zalo trong bảng chia sẻ của
Windows (DEC-060), và cũng không có "thư viện ảnh".

**Ba điểm kỹ thuật là phần cốt lõi của quyết định này, không phải chi tiết cài đặt:**

1. **Tách bằng CSS (`pointer-coarse:` của Tailwind v4), không bằng JavaScript.** Một hook đọc
   `matchMedia` chỉ biết kết quả *sau khi hydrate*, nên HTML của server luôn là bản máy tính và điện
   thoại sẽ thấy nhãn "Xuất ảnh báo cáo" nhấp nháy một nhịp. CSS đúng ngay từ khung hình đầu tiên.
   Vẫn là **feature detection** (kiểu con trỏ), không sniff `userAgent`, và `pointer: coarse` đúng
   trên **cả Android lẫn iOS**.
   ⚠ Hai class ẩn/hiện đặt lên **thẻ bọc**, không đặt lên `<Button>`: `cn()` của dự án cố ý không có
   `tailwind-merge`, nên `hidden` gặp `inline-flex` sẵn có trong class nền là một xung đột do thứ tự
   CSS quyết định.
2. **Nạp trước tấm ảnh trên thiết bị cảm ứng** (`useEffect` + `ref`, không `setState`). Đây là điều
   kiện sống còn của **iOS**: Safari chỉ cho gọi `navigator.share()` khi quyền hạn từ cú chạm còn
   hiệu lực, mà dựng ảnh 1080×1920 mất vài trăm ms tới vài giây thì quyền đó đã hết hạn —
   `NotAllowedError`, và nút "không làm gì cả" đúng như ISSUE-027. Nạp trước ⇒ lúc chạm chỉ còn một
   microtask. Máy tính **không** nạp trước: `<a download>` không đòi quyền hạn đó, và không đáng bắt
   mỗi lượt xem trang trả giá một lượt dựng ảnh.
3. **Không có deep link Zalo nào nhận file.** `zalo://`, `sharer.zalo.me`, `intent://` chỉ chia sẻ
   được **đường dẫn**, mà đường dẫn ảnh của BikeForce đòi đăng nhập nên người nhận chỉ thấy màn hình
   đăng nhập. Nhãn "Gửi qua Zalo" mô tả **ý định**; bảng chia sẻ là con đường duy nhất tồn tại. Giao
   diện **không được hứa hơn thế** trong bất kỳ chữ nào.

**Nhãn nút Zalo chia theo biến thể ảnh (DEC-058), nhãn nút thư viện thì không.** Người dùng phải
biết mình đang gửi *cam kết đầu ngày* hay *kết quả cuối ngày* — đó chính là thông tin mà DEC-058 cố
ý đặt vào nhãn cũ, và gộp thành một chữ "Gửi qua Zalo" là làm mất nó ở đúng màn hình mà cả hai tấm
đều xuất hiện được. Ngược lại, "cất ảnh vào máy" là **cùng một việc** với cả hai tấm nên nút thư
viện giữ một nhãn.

**Hệ quả:** nhãn nút nằm ở `lib/reports/share-card.ts` (`SEND_TO_ZALO_LABEL` — một `Record` theo
biến thể, `SAVE_TO_GALLERY_LABEL` — một chuỗi) — từ vựng nghiệp vụ, không để rải trong component
(AGENTS.md §9).

---

## DEC-063 — Admin sửa được hồ sơ của chính mình; Sales vẫn không

**Date:** 2026-08-11
**Status:** APPROVED (người dùng yêu cầu trực tiếp: *"tài khoản admin chỗ tài khoản, hồ sơ của bạn
có thể thay đổi được họ và tên, số điện thoại, mã nhân viên"*)

**Bối cảnh — một mâu thuẫn có thật trong sản phẩm:** `/admin/account` dùng chung `ProfileCard` chỉ
đọc với `/sales/account`, và kết thúc bằng câu *"Cần sửa thông tin hồ sơ? Hãy liên hệ Admin — chỉ
Admin mới đổi được các trường này."* Với Sales thì câu đó đúng. Với **Admin** thì nó bảo họ đi liên
hệ chính mình — và không có màn hình nào trong sản phẩm sửa được hồ sơ Admin, vì UC-18 lọc
`role = 'SALES'`. Kết quả: họ tên của Admin bị khoá vĩnh viễn ở giá trị lúc tạo tài khoản.

**Decision:**

1. `/admin/account` thay `ProfileCard` bằng **`OwnProfileForm`** — sửa được **ba** trường:
   `full_name`, `phone`, `employee_code`.
2. `/sales/account` **giữ nguyên `ProfileCard` chỉ đọc.** Hồ sơ Sales do Admin quản lý (UC-18,
   FR-031): mã nhân viên và họ tên đi thẳng vào ảnh báo cáo gửi khách.
3. **`email`, `role`, `is_active` không sửa được ở đây**, mỗi cái một lý do khác nhau: email là định
   danh đăng nhập và phải đồng bộ với `auth.users` (BR-025); `role` là đường tự nâng quyền kinh điển
   (BR-012); `is_active` là UC-19, một hành động riêng trên tài khoản **người khác** (BR-009).
   Email và vai trò vẫn **hiển thị** dạng `<dl>`, **không** phải `<input disabled>` — một ô nhập mờ
   đi đọc ra "tạm thời chưa sửa được", trong khi sự thật là không bao giờ.
4. **Không cần migration.** Policy `profiles_update_self` đã có từ Phase 2, và trigger
   `guard_profile_self_update()` đã chặn sẵn nhóm cột nhạy cảm.

**⚠ Điểm phải nhớ về nơi luật được ép:**

`profiles_update_self` cho **mọi vai** sửa dòng của chính mình — nó không phân biệt ADMIN với SALES.
Vì vậy luật nghiệp vụ *"Sales không tự sửa hồ sơ"* được ép ở **Server Action**
(`updateOwnProfileAction` kiểm `profile.role !== 'ADMIN'`), **không** ở RLS. Có một bài test trong
`tests/rls/profiles.rls.test.ts` khoá đúng sự thật này lại, để không ai bỏ dòng kiểm đó với lý do
"RLS lo rồi".

Hệ quả còn lại, **đã biết và chấp nhận**: một Sales gọi thẳng PostgREST bằng token của mình vẫn đổi
được `full_name` của chính họ. Đây là lệch luật nghiệp vụ, **không** phải leo thang quyền — nhóm cột
nguy hiểm vẫn bị trigger chặn. Muốn bịt nốt thì phải siết `profiles_update_self` xuống chỉ còn Admin
bằng một migration `0009` + đẩy lên cloud; việc đó **chưa làm** vì nằm ngoài phạm vi người dùng yêu
cầu, và siết RLS là thay đổi cần được quyết định riêng.

**Hệ quả kỹ thuật:** ba trường hồ sơ dọn sang `lib/validation/profile-fields.ts` để form UC-18 và
form DEC-063 dùng **chung một định nghĩa** — ràng buộc đến từ CHECK constraint của
`0001_init_enums_profiles.sql`, chép ra hai bản là mở đường cho hai bản trôi khỏi nhau.
