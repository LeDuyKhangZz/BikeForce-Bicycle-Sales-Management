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
