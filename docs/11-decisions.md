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
| APPROVED | **30** | DEC-001…DEC-030 — **toàn bộ**, sau khi người dùng trả lời đủ 17 OPEN QUESTION ngày 2026-08-07 |
| PROPOSED | 0 | — |
| SUPERSEDED | 0 | — |
| REJECTED | 0 | — |
| **Tổng** | **30** | DEC-001…DEC-030 |

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
