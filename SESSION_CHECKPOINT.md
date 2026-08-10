# BikeForce Session Checkpoint

> Status: ACTIVE | Phase: **13 — gần đóng** (còn 2 mục cần **mắt người** / **thiết bị thật**) | Last updated: 2026-08-10

---

## ⚠ ĐỌC BA DÒNG NÀY TRƯỚC MỌI THỨ KHÁC (cập nhật cuối phiên 2026-08-10 — Entry 016)

1. **Nghiệp vụ ĐÃ ĐỔI.** Doanh số nay là **TIỀN** (không còn đếm xe), doanh thu nay là **công nợ THU
   HỒI ĐƯỢC**, nhãn khách hàng thành **"Khách hàng đã gặp"**, trường **"Mục đích chuyến đi" đã bị
   gỡ**, mục tiêu điểm viếng thăm có **sàn 10**. Nguồn: **OQ-19 đã trả lời** + **DEC-048/049/050** +
   **BR-026**. Đơn vị `xe` **không còn tồn tại** ở bất kỳ đâu trong dự án.
2. ✅ **CLOUD ĐÃ ĐỦ `0008` — 8/8**, đẩy ngày 2026-08-10. Đã kiểm chứng thật (xem bảng dưới).
3. ✅ **ĐÃ PUSH.** GitHub ở `356f9dd`, xác minh bằng `git ls-remote origin refs/heads/main`.
   ⚠ **Việc còn lại của người dùng:** xác nhận Vercel đã build xong `356f9dd` rồi mở lại `/admin` —
   bản deploy CŨ đọc `admin_*` theo tên cột cũ nên sẽ hiện số sai cho tới khi bản mới lên.
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

Đây là file **quan trọng nhất** để một session hoàn toàn mới tiếp tục công việc mà không phải làm
lại từ đầu. Đọc file này ngay sau `BIKEFORCE_MASTER_SPEC.md`.

---

## Current State

**Current Phase:** `PHASE 11 — Testing & Security` — **12/14 mục `[x]`** (2026-08-10).
Phase 0, 1, 2, **3**, **4**, 5, **7**, **8**, **9**, **10** đã đóng đủ. Phase 6 còn 1 mục cần **thiết
bị thật**; Phase 11 còn 2 mục cũng cần thiết bị thật.

**🚀 ĐÃ LÊN PRODUCTION — `https://bike-force-bicycle-sales-management.vercel.app`** (2026-08-10).
Smoke test Admin **16/16 PASS** ở 375px và 1440px. Người dùng đã đăng nhập thật, đổi mật khẩu, và
tạo tài khoản Sales qua UC-17 ngay trên bản deploy.

**Việc còn lại đáng giá nhất: ISSUE-019** — function Vercel đang chạy ở **`iad1` (Mỹ)** còn database
ở Singapore, đo được **~230 ms phụ trội mỗi lượt gọi DB**. Sửa: Settings → Functions → Region =
`sin1` → **Redeploy**. **Đo Lighthouse SAU khi sửa**, không phải trước.

**Current Task:** **PHASE 13 — Nhận diện thương hiệu & soát UI/UX.** 13a ✅ · **13b ✅** (trừ 2 mục
cần mắt người / thiết bị thật) · **13c ✅ đủ ba nhóm A, B, C**. Không còn công việc code nào đang dở.

**Phiên 2026-08-10 (Entry 016) làm được gì:**

| Hạng mục | Trạng thái |
|---|---|
| **OQ-19** | ✅ **Đã trả lời đủ 3/3** — bỏ đếm xe · công nợ = tiền THU HỒI · `null` cho dòng cũ |
| **Migration `0008`** | ✅ chạy thật trên local: cặp cột `*_sales_amount`, sàn 10 điểm viếng thăm, 4 hàm aggregate dựng lại |
| **DEC-048 · 049 · 050 · 051 · 052** | ✅ ghi đủ ở `docs/11` |
| **BR-026** | ✅ business rule **MỚI** — mục tiêu điểm viếng thăm ∈ `[10, 1000]` |
| Nhóm A (`§13c`) | ✅ phản hồi khi chạm · Đăng xuất ở header · đảo thứ tự khối `/sales/today` |
| Nhóm B (`§13c`) | ✅ "Khách hàng đã gặp" — sửa **đúng một chỗ** ở `metric-rows.ts` |
| Soát UI/UX (13b) | ✅ đo máy **20 URL × 2 bề rộng**; **tìm ra 1 lỗi thật** (tràn ngang 116px), đã sửa bằng DEC-052 |
| Quality gate | ✅ typecheck · lint · build · `npm test` **745/745** · `npm run e2e` **111/111** |

**⚠ CHƯA PUSH.** GitHub vẫn ở `9935dff`; toàn bộ Phase 13 còn nằm trong working tree.

> ⚠ **MỘT NIỀM TIN CŨ CỦA DỰ ÁN NAY ĐÃ SAI.** Suốt Phase 0→12, tài liệu ghi "agent không chạy được
> `git push` vì không có TTY cho Git Credential Manager". Ngày 2026-08-10 **thử thật thì nó chạy** —
> credential đã được cache. Đây là lần thứ hai cùng một kiểu sai lặp lại (lần đầu là `supabase db
> push`, Entry 011). **Bài học: đừng suy giới hạn của công cụ này sang công cụ kia — thử đã.**
> Và luôn xác minh bằng `git ls-remote`, đừng tin mỗi dòng "Everything up-to-date".

**Đã mở PHASE 13 — Nhận diện thương hiệu & soát UI/UX** (`PROJECT_CHECKLIST.md`). Phần *đổi màu theo
logo* đã làm xong trong phiên 2026-08-10 (**DEC-046**); phần *soát 98 guideline trên 18 route* được
cất lại đó theo yêu cầu "deploy trước".

> ✅ **Phiên 2026-08-10 gộp năm phase: 7 → 8 → 9 → 10 → 11.** Toàn bộ **18 route của v1 nay chạy
> thật**. Chi tiết ở `WORKLOG.md` Entry 010.

> ⚠ **ĐỌC TRƯỚC KHI TIN CHECKPOINT NÀY:** phiên trước đã viết khoảng **7.000 dòng code Phase 7–10 mà
> không cập nhật một dòng tài liệu nào**, nên checkpoint cũ ghi "Phase 7 chưa bắt đầu" trong khi code
> đã có đủ. Bài học đã trả giá: **luôn đo trạng thái thật bằng công cụ** (`git status`, `npm test`,
> `npm run build`) trước khi tin bất kỳ tài liệu nào — đúng như CLAUDE.md §4 yêu cầu. Lần này tài
> liệu đã được đồng bộ đầy đủ.

**Phiên 2026-08-10 làm được gì (tóm tắt cho session mới):**

| Hạng mục | Trạng thái |
|---|---|
| `/sales/history` · `/sales/reports/[id]` · `/sales/account` | ✅ **Phase 7 thật** — lọc tháng, phân trang server-side, empty state, `BackLink` có `href` tường minh |
| `/admin` | ✅ **Phase 8 thật** — 12 chỉ số + 2 nhóm cảnh báo, Suspense + Skeleton |
| `/admin/reports` · `/admin/reports/[id]` · `/admin/analytics` | ✅ **Phase 9 thật** — 7 chiều lọc, tìm theo tên (`ilike`), **biểu đồ trend FR-037** |
| `/admin/sales` · `/admin/sales/new` · `/admin/sales/[id]` · `/admin/account` | ✅ **Phase 10 thật** — bảng hiệu suất + số ngày đạt KPI (BR-024), UC-17/18/19 |
| `GET /api/admin/reports/export` | ✅ **Route Handler thứ hai và CUỐI CÙNG** của v1 (DEC-042) |
| 5 hàm SQL aggregate | ✅ `0006_admin_aggregates.sql` (4 hàm) + `0007_admin_daily_trend.sql` (1 hàm) |
| Bộ E2E Playwright | ✅ **MỚI** — 3 project × 33 bài = **99/99 PASS**, gồm 30 lượt quét axe |
| `tests/integration/indexes.test.ts` | ✅ **MỚI** — 14 bài `EXPLAIN ANALYZE`, **đóng ISSUE-005** |
| Nợ Phase 3 và Phase 4 | ✅ **ĐÃ ĐÓNG** — OQ-18 được trả lời (DEC-043) · bộ E2E có commit ra đời |
| Test | ✅ **729** (`unit` **542** · `integration` **54** · `rls` **133**) + **99** E2E |

**Sáu quyết định mới của phiên này — đọc trước khi động vào code:**

| DEC | Nội dung một dòng |
|---|---|
| **DEC-040** | `getVietnamMonthRange()` trả **`null`** khi chuỗi tháng sai, **không ném lỗi** |
| **DEC-041** | Mật khẩu tối thiểu **8** ký tự, không bắt quy tắc thành phần, **v1 KHÔNG ép đổi lần đầu** |
| **DEC-042** | `GET /api/admin/reports/export` là Route Handler **thứ hai và cuối cùng** |
| **DEC-043** | **OQ-18 đã trả lời** — NFR-008 nới thành **≤ 8 lần chạm**, giữ nguyên 5 trường |
| **DEC-044** | FR-037 vẽ bằng **SVG viết tay**, không thêm thư viện; **chữ không được nằm trong SVG** |
| **DEC-045** | Hằng số dùng chung **KHÔNG** được nằm trong file `'use server'` |

**Supabase — trạng thái hai môi trường KHÁC NHAU, đây là điều quan trọng nhất phải nhớ:**

| Migration | Local | Cloud `rnmywhwanpxmipqducqu` |
|---|---|---|
| `0001` … `0007` | ✅ | ✅ **đã push** ngày 2026-08-10 |
| **`0008`** | ✅ **đã apply + seed chạy sạch** | ✅ **ĐÃ PUSH ngày 2026-08-10 — cloud nay 8/8** |

**Đã kiểm chứng thật trên cloud SAU khi đẩy `0008` (2026-08-10):**

| Phép kiểm | Kết quả |
|---|---|
| `npx supabase migration list --linked` | **8/8** khớp cả `local` lẫn `remote` |
| `gen types --linked` so với bản đã commit | khác **đúng một khối metadata** (`__InternalSupabase.PostgrestVersion`) ⇒ **schema hai bên khớp** |
| **`has_function_privilege` cho cả 5 hàm `admin_*`** | `authenticated` = **`t`** · `anon` = **`f`** ⇒ **`drop function` KHÔNG làm mất GRANT** |
| Gọi `admin_today_overview` qua REST bằng `anon` | **`42501 permission denied for function`** |
| Dữ liệu production (1 báo cáo, `2026-08-10`) | `target_sales_quantity = 50` **còn nguyên** · `visit_purpose` **còn nguyên** · `target_sales_amount` = **`null`** ⇒ **đúng OQ-19c**, không mất dữ liệu nào |
| `pg_constraint.convalidated` | 3 constraint mới = **`f`** (đúng thiết kế `not valid`) · 2 constraint dải giá trị = **`t`** |
| `https://…vercel.app/login` | **200**, `x-vercel-id` = `hkg1::sin1::…` ⇒ function chạy ở **Singapore** (ISSUE-019 đã sửa) |

> ⚠ **Thứ TỰ đã làm và rủi ro đi kèm — ghi lại để lần sau biết:** code được `git push` **trước**,
> database migrate **sau**. Giữa hai mốc đó, nếu Vercel build xong trước thì bản deploy MỚI chạy trên
> schema CŨ trong ít phút. Với app nội bộ một người dùng thì chấp nhận được, nhưng lần sau **nên
> migrate database TRƯỚC rồi mới push code** — migration `0008` chỉ THÊM cột và dùng `not valid`, nên
> nó tương thích ngược với code cũ, còn chiều ngược lại thì không.

**Đã kiểm chứng thật trên cloud sau khi đẩy (2026-08-10):**

| Phép kiểm | Kết quả |
|---|---|
| `npx supabase migration list --linked` | **7/7** khớp cả `local` lẫn `remote` |
| Gọi cả 5 RPC qua REST bằng `anon` | **`42501 permission denied for function`** — hàm **tồn tại** và `anon` **không execute được** |
| `gen types --linked` so với bản đã commit | khác **đúng một khối metadata** ⇒ **schema hai bên khớp** |
| `POST /auth/v1/signup` | **`422`** — tự đăng ký vẫn tắt (BR-012) |
| `anon` đọc `profiles` / `daily_reports` | **`401` + `42501`** — deny-by-default còn nguyên |

> ⚠ **Seed KHÔNG được đẩy** (`"seeds":[]`) — đúng thiết kế. **Cloud chưa có user nào**, nên bước kế
> tiếp bắt buộc là **runbook tạo Admin đầu tiên** (`docs/09 §10`), nếu không sẽ không đăng nhập được
> vào bản deploy.

> ⏳ **Hai việc chờ người dùng, KHÔNG chặn code:**
> 1. **Rotate service role key** (ISSUE-011, P1) — key đã lọt vào transcript hội thoại.
> 2. **Kiểm ảnh 9:16 trong Zalo trên điện thoại thật** (ISSUE-003) — cần link công khai ⇒ chờ deploy.

**Current Branch:** `main` — remote `origin` =
`https://github.com/LeDuyKhangZz/BikeForce-Bicycle-Sales-Management.git` (DEC-028).

> ⚠ **`git push` KHÔNG chạy được từ phía agent** (giới hạn kỹ thuật, không phải thiếu quyền —
> credential helper là Git Credential Manager và môi trường không có TTY). Agent **commit bình
> thường**, rồi **báo người dùng tự chạy `git push origin main`**.


---

## Completed

### Phase 0 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 001 + 002

Bộ 17 tài liệu kiểm soát dự án; 21 UC · 37 FR · 15 NFR · 25 BR · 15 AF; DEC-001..DEC-030; ISSUE-001..ISSUE-007;
**17/17 OPEN QUESTION đã được người dùng trả lời**; git init + push GitHub; đo contrast toàn bộ palette.

### Phase 1 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 003

Next.js 16.3.0 + TypeScript 6.0.3 + Tailwind v4 + ESLint 9.39.5 (pin sau smoke test ISSUE-004);
cấu trúc DEC-023; 3 Supabase client + `lib/env.ts`; design token DEC-014; font Inter; khung
`lib/kpi|currency|date`; 6 primitive UI; baseline build/typecheck/lint xanh.

### Phase 2 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 004

- **Supabase local chạy thật** bằng Docker + Supabase CLI 2.111.0. Cả 5 migration apply thành công.
- **5 migration** `0001_init_enums_profiles.sql` → `0005_indexes.sql`: 2 enum, 2 bảng, 20 cột trên
  `daily_reports`, 16 constraint, 7 function, 6 trigger, 6 RLS policy, 3 index hiệu năng.
- **`supabase/seed.sql`** (LOCAL ONLY): 4 tài khoản + 22 báo cáo phủ đủ các nhánh hiển thị.
- **`types/database.types.ts` generate thật** (259 dòng), không còn placeholder.
- **Tầng auth đầy đủ**: `lib/auth/{routes,messages}.ts`, `lib/validation/auth.ts`,
  `services/profiles.ts`, `features/auth/{queries,actions,login-form,sign-out-button}`,
  `middleware.ts`, `/login`, guard cho `(sales)` và `(admin)`, `app/page.tsx` phân luồng theo role.
- **Bộ test đầu tiên của dự án**: `vitest.config.mts` với 3 project và 8 file test.
- **Kiểm chứng bằng công cụ thật**: build/typecheck/lint exit 0 · `npm test` **80/80** ·
  Chromium **32/32** ở 375px và 1440px · tài khoản inactive **6/6**.

### Phase 3 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 006

- **`lib/date.ts` + `lib/currency.ts` triển khai thật** (DEC-032 — kéo lên sớm từ Phase 5 vì
  `report_date` của FR-010 không có đường nào khác). 33 + 29 unit test.
- **`lib/validation/report.ts`** — `morningReportSchema` + `reportDateSchema`, **47 test**. Schema
  **strip** `sales_id`/`report_date`/`status` do client gửi; một schema gánh cả chuỗi `FormData` lẫn số.
- **`lib/reports/today-cta.ts`** — bảng ba trạng thái FR-007 dưới dạng **hàm thuần**, **17 test**.
- **`lib/reports/messages.ts`** — chuỗi thông báo của luồng báo cáo, dùng chung cho Phase 4.
- **`services/reports.ts`** — `getTodayReport` / `insertMorningReport` / `updateMorningReport`.
- **`features/report-morning/`** — 2 Server Action, form client, `useReportDraft`, `CurrencyField`
  (3 chip cộng nhanh), `CommitmentSummary`.
- **3 route Sales** + **3 primitive UI mới** (`Textarea`, `FormField`, `buttonClassName`).
- **Kiểm chứng bằng công cụ thật**: build/typecheck/lint exit 0 · `npm test` **213/213** ·
  Chromium **57/58** ở 375px và 1440px (mục lệch duy nhất: NFR-008 — ISSUE-013).

### Phase 4 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 007

- **`eveningReportSchema`** thêm vào `lib/validation/report.ts` — **49 test mới** (file này giờ 96
  test). 4 chỉ số `actual_*` **bắt buộc** khớp `ck_completed_requires_actuals`; `actual_route` và
  `evening_note` tuỳ chọn. Strip cả `target_*` — form tối **không** được sửa cam kết sáng.
- **`completeEveningReport()`** trong `services/reports.ts` — ghi 4 cột `actual_*` + `evening_note`
  + `evening_submitted_at` + `status` trong **MỘT** câu lệnh (CHECK đánh giá trên dòng sau lệnh).
- **`features/report-evening/`** — `saveEveningReport`, `evening-report-form.tsx`,
  `discard-evening-draft.tsx`.
- **`/sales/today/evening`** thành FR-013 + FR-014 thật. Guard: chưa có cam kết sáng →
  `/sales/today/morning` (BR-007); đã `COMPLETED` → `/sales/today` (BR-019).
- **Ba thứ nâng lên tầng dùng chung** (DEC-035, DEC-036): `useReportDraft` → `lib/hooks/` ·
  `CurrencyField` → `components/ui/` · `authorizeSalesWrite()` → `features/auth/queries.ts`.
- **`tests/rls/report-service.rls.test.ts`** — 7 test chạy service dưới **JWT thật**.
- **Kiểm chứng bằng công cụ thật**: typecheck/lint/build exit 0 · `npm test` **269/269** ·
  Chromium **62/62** (cuối ngày) và **11/11** (hồi quy luồng sáng) ở 375px và 1440px.

### Phase 5 (2026-08-07) — chi tiết ở `WORKLOG.md` Entry 008

- **Chốt hai chốt chặn TRƯỚC khi viết code** — ISSUE-008 và phần cài đặt còn để ngỏ của DEC-025,
  ghi thành **DEC-038**. ISSUE-008 nay `CLOSED`.
- **`lib/kpi.ts` có thân thật**, thay khung ném lỗi từ Phase 1. Năm hàm thuần:
  `calculateAchievement(target, actual, metric)` · `getAchievementStatus(pct)` ·
  `formatMetricValue(value, metric)` · `achievementLabel(result)` · `isKpiAchievedDay(results)`.
- **`lib/kpi.test.ts` — 46 test**, gồm một bài quét lưới **288 tổ hợp** khoá bất biến BR-015
  (không bao giờ `NaN` / `Infinity` / `∞`).
- **`features/report-comparison/` — feature MỚI**: `achievement-table.tsx` (hai chế độ hiển thị
  DEC-019) · `achievement-badge.tsx` (status → tone + icon Lucide) · `report-notes.tsx` (phần chữ).
- **`/sales/today`** thay danh sách cam kết một cột bằng bảng đối chiếu thật.
- **Kiểm chứng bằng công cụ thật**: typecheck/lint/build exit 0 · `npm test` **315/315** ·
  `npm run test:coverage` → `lib/**` stmt **98,57%** / branch **99,01%** / lines **99,11%** ·
  Chromium **36/36** ở 375px và 1440px.

### Phase 6 (2026-08-08) — chi tiết ở `WORKLOG.md` Entry 009

- **Dựng prototype Satori TRƯỚC** (đúng thứ tự `docs/12 § ISSUE-002 Fix bước 1`) → biết ngay từ đầu
  là **không cần fallback**. **ISSUE-002 → CLOSED**, DEC-010 giữ nguyên.
- **3 file font Inter `.ttf`** trong `public/fonts/` (400/600/700). Xác minh bằng cách **parse bảng
  `cmap`**: 2849 glyph, đủ `ừ ẫ ợ ỹ đ Đ Ệ Ỡ ₫ …`. Ghim bundle bằng `outputFileTracingIncludes`.
- **`lib/reports/share-card.ts`** — view model thuần: cắt tuyến/ghi chú ở tầng dữ liệu, dựng tên
  file FR-019, `shareImagePath()`. **43 unit test** phủ toàn bộ edge case bắt buộc của Phase 6.
- **`lib/reports/metric-rows.ts`** — gộp bản sao thứ hai của danh sách 4 chỉ tiêu; `AchievementTable`
  và thẻ ảnh nay đọc **cùng một** định nghĩa (`docs/07 §5`).
- **`formatCompactVND()` + `formatMetricValueCompact()`** — dạng rút gọn `150tr` / `100tỷ` cho bảng
  trong ảnh (`docs/05 §14`); số đầy đủ vẫn ở khối "DOANH THU THỰC ĐẠT".
- **`services/reports.getReportForShare()`** — **cố ý không nhận `salesId`**, để RLS quyết định
  (nếu lọc thêm sẽ chặn nhầm Admin — BR-022).
- **Route Handler + thẻ ảnh + nút chia sẻ** — xem bảng "Important Files" bên dưới.
- **Phát sinh: ISSUE-015 (P1)**, sửa bằng **DEC-039** — middleware trả 401/403 JSON cho `/api/*`.
- **Kiểm chứng bằng công cụ thật**: typecheck/lint/build exit 0 · `npm test` **368/368** ·
  Chromium **44/44** ở 375px và 1440px · **xem tận mắt 2 tấm ảnh PNG** xuất ra.

---

### Phase 7 → Phase 11 (2026-08-10) — chi tiết ở `WORKLOG.md` Entry 010

**Phase 7 — Sales History (11/11):**
- `lib/date.ts` hoàn tất — nhóm 5 hàm tháng, `getVietnamMonthRange()` trả `null` khi sai định dạng (DEC-040).
- `lib/reports/{pagination,history-row,history-url,report-status}.ts` — hàm thuần, có unit test.
- `services/reports.listReportsByMonth()` — phân trang **server-side** bằng `.range()` + `count: 'exact'`.
- `/sales/history` · `/sales/reports/[id]` · `/sales/account`; `features/sales-history/`, `features/account/`.
- `features/navigation/` + `lib/navigation/nav-items.ts` — bottom nav 3 mục / sidebar từ 1024px (DEC-018).
- `components/ui/back-link.tsx` — `href` tường minh, không `router.back()`.
- **Xoá `CTA_ROUTES_NOT_READY`** — không còn cờ "chưa sẵn sàng" nào trong dự án.

**Phase 8 — Admin Dashboard (9/9):**
- `supabase/migrations/0006_admin_aggregates.sql` — 4 hàm SQL, `security invoker`, guard InitPlan.
- `services/admin.ts`; `features/admin-dashboard/{overview-tiles,missing-report-alerts}.tsx`.
- `/admin` thật với 12 chỉ số + 2 nhóm cảnh báo; Suspense + Skeleton.

**Phase 9 — Admin Reports & Filters (11/11, gồm cả mục SHOULD):**
- `lib/reports/{admin-filters,admin-overview,csv}.ts` — hàm thuần, có unit test.
- `/admin/reports` (7 chiều lọc + tìm theo tên) · `/admin/reports/[id]` · `/admin/analytics`.
- `GET /api/admin/reports/export` — CSV đúng tập đang lọc (DEC-042).
- **FR-037** — `0007_admin_daily_trend.sql` + `lib/reports/trend-chart.ts` + `features/admin-analytics/` (DEC-044).

**Phase 10 — Sales Management (11/11):**
- `lib/validation/{account,sales-account}.ts` (DEC-041); `services/profiles.ts` mở rộng.
- `features/admin-sales-management/` — UC-17/18/19; **service role chỉ dùng đúng một lời gọi** `auth.admin.createUser`.
- `/admin/sales` · `/admin/sales/new` · `/admin/sales/[id]` · `/admin/account`.

**Phase 11 — Testing & Security (12/14):**
- `tests/integration/indexes.test.ts` — 14 bài `EXPLAIN ANALYZE`, **đóng ISSUE-005**.
- `playwright.config.ts` + `e2e/` (9 file) — 3 project × 33 bài = **99/99 PASS**.
- 30 lượt quét `@axe-core/playwright` — **0 vi phạm serious/critical** (NFR-007).
- Bắt được **ISSUE-016 (P1)** ngay lượt chạy đầu; sửa bằng **DEC-045**.
- Còn `[ ]`: Lighthouse · ma trận thử tay Chrome/Safari mobile — **cả hai cần thiết bị thật**.

---

## Currently Working On

**Không có công việc code nào đang dở.** Phiên 2026-08-10 dừng ở trạng thái sạch: mọi thứ đã viết đều
đã chạy thật, có test, và tài liệu đã đồng bộ đầy đủ.

Việc kế tiếp là **Phase 12 — Deployment**, và bước đầu tiên (**đẩy migration 0006 + 0007 lên cloud**)
cần thao tác của người dùng vì `supabase db push` hỏi mật khẩu database.

---

## Not Started

- **Phase 12 — Deployment Preparation:** chưa bắt đầu. Xem `Next Exact Steps`.

**Những thứ CỐ Ý chưa làm** (đúng kế hoạch, không phải thiếu sót):

| Thứ chưa làm | Thuộc phase | Vì sao chưa làm |
|---|---|---|
| Kiểm Zalo webview trên máy thật | Phase 6 (nợ) | Cần điện thoại thật + link công khai ⇒ chờ deploy (ISSUE-003) |
| Lighthouse mobile | Phase 11 (nợ) | Cần bản deploy thật để đo có ý nghĩa |
| Ma trận thử tay Chrome/Safari mobile | Phase 11 (nợ) | Cần thiết bị thật |
| Ép đổi mật khẩu lần đầu | — | **Cố ý không làm ở v1** (DEC-041), đã ghi vào `docs/10` |
| `pg_trgm` GIN cho tìm kiếm tên | — | Chỉ cần khi vượt 200 Sales; đã ghi vào `docs/10` |
| PWA manifest | Phase 12 | Chưa tới lượt |

**Không còn màn hình nào của v1 chưa dựng.** 18/18 route đã chạy thật.

---

## Known Issues

Chi tiết đầy đủ ở `docs/12-known-issues.md`. **Còn 7 OPEN, 10 CLOSED.**

| ID | Sev | Status | Nội dung |
|---|---|---|---|
| ISSUE-001 | P1 | **CLOSED** | 17/17 OQ đã được trả lời |
| ISSUE-002 | P2 | **CLOSED** | Satori dựng được toàn bộ bố cục — không cần fallback |
| ISSUE-003 | P2 | OPEN | Zalo in-app webview **vẫn** chưa kiểm trên thiết bị thật — cần điện thoại + link công khai |
| ISSUE-004 | P2 | **CLOSED** | TS 7 + ESLint 10 đã vỡ thật; pin `typescript@6.0.3` + `eslint@9.39.5` |
| ISSUE-005 | P3 | **CLOSED** | **MỚI ĐÓNG 2026-08-10** — `EXPLAIN ANALYZE` cho thấy `is_admin()` được nâng thành **InitPlan**, chạy đúng 1 lần/câu lệnh |
| ISSUE-006 | P3 | **CLOSED** | Không xử lý gì quanh ngày nghỉ ở v1 |
| ISSUE-007 | P3 | OPEN | Chưa có audit log; chỉ cần nếu mở quyền sửa sau `COMPLETED` |
| ISSUE-008 | P3 | **CLOSED** | Đã chốt bằng DEC-038 |
| ISSUE-009 | P3 | OPEN | Next 16.3 deprecate tên `middleware.ts`, khuyến nghị `proxy.ts`. Cố ý hoãn |
| ISSUE-010 | P3 | OPEN | Máy đang chạy **3 stack Supabase local**; chọn nhầm container đã xảy ra thật |
| ISSUE-011 | **P1** | OPEN | Service role key lọt vào transcript hội thoại. **Phải rotate.** Chưa vào git |
| ISSUE-012 | P3 | OPEN | Sau `supabase db reset`, GoTrue + Kong không tự phục hồi → đăng nhập nhận `502` |
| ISSUE-013 | P3 | **CLOSED** | **MỚI ĐÓNG 2026-08-10** — OQ-18 được trả lời bằng phương án (a); NFR-008 nới thành ≤ 8 chạm (DEC-043) |
| ISSUE-014 | P2 | **CLOSED** | Mất banner + draft không bị xoá; sửa bằng DEC-037 |
| ISSUE-015 | P1 | **CLOSED** | Middleware redirect `/api/*`; sửa bằng DEC-039 |
| ISSUE-016 | **P1** | **CLOSED** | **MỚI** — file `'use server'` export object hằng số ⇒ `/admin/sales/new` sập ở runtime **trong khi build/typecheck/lint/724 test đều xanh**. Chỉ E2E bắt được. Sửa bằng **DEC-045** |
| ISSUE-017 | P3 | OPEN | **MỚI** — `notFound()` trên route có `loading.tsx` trả **200** thay vì 404 do response đã stream. **Cố ý không sửa** — tính không-phân-biệt-được của BR-003 vẫn đúng, route API vẫn trả mã thật |


---

## Important Business Decisions

Danh sách đầy đủ DEC-001..DEC-034 ở `docs/11-decisions.md`. Những điều một session mới **bắt buộc
phải biết**:

**Kiến trúc & bảo mật**

- **DEC-003** — Server Components để **đọc**, Server Actions để **ghi**; **không** REST API riêng cho
  CRUD báo cáo. Route Handler duy nhất: `GET /api/reports/[id]/share-image`.
- **DEC-004** — **RLS là biên giới bảo mật thật**; middleware và layout guard chỉ là defense-in-depth.
- **DEC-005** — Service role key **chỉ** cho `auth.admin.*`.
- **DEC-006 + KẾT LUẬN PHASE 2** — `is_admin()` phải `SECURITY DEFINER` + `search_path` cố định, gọi
  dạng `(select public.is_admin())`. **Đã kiểm chứng:** `postgres` có `rolbypassrls` nên
  `force row level security` **không** gây đệ quy và **không** chặn `handle_new_user()`. Giữ nguyên
  `enable` + `force`.
- **DEC-031 (MỚI)** — **`service_role` không có DML** trên `profiles` và `daily_reports`.
  `rolbypassrls` **không** vượt qua `GRANT`, nên DEC-005 nay được **database ép**. Hệ quả: tầng test
  dùng kết nối Postgres trực tiếp qua `SUPABASE_DB_URL` (devDependency `pg`).
- **DEC-023** — Business logic và data access **không** được viết trong component.

**Toolchain**

- **DEC-002** — pin `typescript@6.0.3` + `eslint@9.39.5`. **Đừng "nâng cấp cho mới".**
- Next 16 dùng **Turbopack mặc định**.

**Nghiệp vụ & dữ liệu**

- **DEC-007** achievement không persist · **DEC-008** tiền `bigint` VND · **DEC-009** ngày nghiệp vụ
  bằng `Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})` · **DEC-020** chỉ 2 trạng thái ·
  **DEC-025** `target=0` → xem BR-015 · **DEC-026** không sửa sau `COMPLETED`, Admin không sửa,
  không xoá, không nhập bù · **DEC-029/030** viếng thăm giữ cả số lẫn text; không ngày nghỉ, không
  team, chỉ 2 role, KPI do Sales tự cam kết.

**UI/UX**

- **DEC-012/013/014** Swiss Modernism 2.0, chỉ font Inter, bảng màu theo contrast đã đo ·
  **DEC-016** không dark mode v1 · **DEC-017** route `/login` · **DEC-018/019** bottom nav ≤5 mục,
  bảng so sánh 4 card ở mobile.

**Quyết định MỚI của Phase 5 — đọc trước khi động vào `lib/kpi.ts` hoặc bất kỳ chỗ nào hiển thị `%`**

- **DEC-038** — hai phần:
  1. **`percent = null` đúng cho CẢ HAI ca** (`target = 0 && actual > 0` → `EXCEEDED`; chưa có
     `actual` → `PENDING`), phân biệt bằng **`status`**. Đóng ISSUE-008. Bản chất BR-015 **không đổi**.
  2. **`calculateAchievement(target, actual, metric)`** — ba tham số. Trả
     `{ percent, status, display, surplus }`. `display` đã format sẵn để render thẳng
     (`'83,3%'` / `'+3 xe'` / `'—'`); `surplus` là số vượt **thô** cho thẻ ảnh 9:16 và tổng hợp
     Admin. Bảng đơn vị (`xe` / `điểm` / `khách` / VND) chỉ tồn tại trong `formatMetricValue()`.
- **Một hệ quả cố ý, đã khoá bằng test:** `percent = 99.99` cho `display = '100,0%'` nhưng
  `status = 'NEAR'`. BR-014 làm tròn ở hiển thị, BR-023 xét ngưỡng trên số **chưa** làm tròn — cả
  hai đều `APPROVED`. **Đừng "sửa"** bằng cách xét ngưỡng trên số đã làm tròn.

**Ba quyết định của Phase 4 — đọc trước khi sửa `features/`, `lib/hooks/` hay `components/ui/`**

- **DEC-035** — `useReportDraft` nay ở **`lib/hooks/`**, `CurrencyField` nay ở **`components/ui/`**,
  và khoá localStorage của draft ở **`lib/reports/draft-keys.ts`**. Đừng tìm chúng trong
  `features/report-morning/` nữa, và **đừng copy** một bản thứ hai vào feature mới.
- **DEC-036** — **`features/auth/` là ngoại lệ DUY NHẤT** của luật "`features/X` không import
  `features/Y`" (AGENTS.md §1.2). Mọi Server Action ghi báo cáo dùng chung
  `authorizeSalesWrite()` ở `features/auth/queries.ts` — **không viết lại guard quyền trong feature
  mới**. Không mở rộng ngoại lệ này cho feature khác mà không có DEC mới.
- **DEC-037** — `saveEveningReport` **tự `redirect()`**, không trả `ok: true` cho client điều hướng
  như luồng sáng. Lý do là ISSUE-014, đã đo thật. **Quy tắc rút ra cho Phase 6 và Phase 10:** nếu
  route hiện tại có thể tự `redirect()` sau khi dữ liệu đổi, **hãy để Server Action tự
  `redirect()`** — đừng trông chờ `useEffect` của client được chạy nốt.

**Ba quyết định của Phase 3 — đọc trước khi sửa `lib/` hay `features/report-*`**

- **DEC-032** — `lib/date.ts` và `lib/currency.ts` **đã triển khai ở Phase 3**, không phải Phase 5.
  *(Câu tiếp theo của mục này trước đây ghi "`lib/kpi.ts` vẫn là khung và vẫn bị ISSUE-008 chặn" —
  **đã hết hiệu lực từ Phase 5**, xem DEC-038.)*
- **DEC-033** — Hàm **hiển thị** trả `'—'` (hoặc `''` cho `formatThousands`) khi đầu vào không hợp
  lệ, **không ném lỗi**. Có `isValidVietnamDate()` vì `new Date('2026-02-30')` không ném lỗi mà
  cuộn sang `2026-03-02`.
- **DEC-034** — Zod schema của báo cáo dùng **`snake_case` trùng tên cột**, khác ví dụ `camelCase`
  ở `docs/07 §3.5`. Và **`ActionResult` thành công mang `data.notice`** — server quyết định câu xác
  nhận, client không suy ra từ `mode` (đã có lỗi thật vì chuyện này).

---

## Important Files

**Tài liệu điều khiển (17 file):** `CLAUDE.md`, `AGENTS.md`, `docs/01`…`docs/12`, `WORKLOG.md`,
`SESSION_CHECKPOINT.md`, `PROJECT_CHECKLIST.md`.

**Database (Phase 2 — MỚI):**

| File | Vai trò |
|---|---|
| `supabase/migrations/0001_init_enums_profiles.sql` | `citext` (schema `extensions`), 2 enum, `profiles`, GRANT, `enable`+`force` RLS |
| `supabase/migrations/0002_daily_reports.sql` | `daily_reports` 20 cột + 16 constraint, GRANT, `enable`+`force` RLS |
| `supabase/migrations/0003_functions_triggers.sql` | 7 function + 6 trigger |
| `supabase/migrations/0004_rls_policies.sql` | **Chỉ policy** (6 cái) — phụ thuộc hàm của `0003` |
| `supabase/migrations/0005_indexes.sql` | 3 index hiệu năng + `analyze` |
| `supabase/seed.sql` | **LOCAL ONLY** — 4 tài khoản, 22 báo cáo. Mật khẩu local: `LocalDev#2026` |
| `supabase/config.toml` | Sinh bởi `supabase init` |
| `types/database.types.ts` | **Generate thật.** Không sửa tay |

**Tầng auth (Phase 2 — MỚI):**

| File | Vai trò |
|---|---|
| `lib/auth/routes.ts` | **Hàm thuần**: `dashboardPathFor`, `requiredRoleForPath`, `sanitizeNextPath`, `isPublicPath` |
| `lib/auth/messages.ts` | Chuỗi thông báo auth — **một nguồn duy nhất** |
| `lib/validation/auth.ts` | `signInSchema` — dùng chung client và server |
| `services/profiles.ts` | `getSessionProfile()` — nhận supabase client làm tham số |
| `features/auth/queries.ts` | `requireProfile` / `requireRole` / `requireAdmin`. **Ở `features/` chứ không phải `lib/`** vì chạm `services/` |
| `features/auth/actions.ts` | `signInAction`, `signOutAction` |
| `middleware.ts` | Lớp 1 — refresh cookie + guard route/role. Tự tạo Supabase client vì `next/headers` không có ở đây |
| `app/(auth)/login/page.tsx` | `/login` (DEC-017) |
| `app/(sales)/layout.tsx` · `app/(admin)/layout.tsx` | Lớp 2 — guard theo route group |

**Tầng báo cáo đầu ngày (Phase 3 — MỚI):**

| File | Vai trò |
|---|---|
| `lib/date.ts` | `getVietnamToday`, `formatVietnamDate`, `isValidVietnamDate` — **đã có logic thật**. `getVietnamMonthRange` vẫn ném lỗi (Phase 7) |
| `lib/currency.ts` | `formatCurrencyVND`, `parseCurrencyInput`, `formatThousands` — **đã có logic thật** |
| `lib/validation/report.ts` | `morningReportSchema` (6 ô, strip mọi khoá server-owned) + `reportDateSchema` + 6 hằng số miền giá trị khớp CHECK constraint |
| `lib/reports/today-cta.ts` | **Hàm thuần** `getTodayView` / `canOpenMorningForm` + hằng số đường dẫn. Đây là nơi DUY NHẤT quyết định CTA của FR-007 |
| `lib/reports/messages.ts` | `REPORT_MESSAGES`, `SAVED_PARAM`, `messageForSavedParam` — dùng chung với Phase 4 |
| `services/reports.ts` | `getTodayReport`, `insertMorningReport`, `updateMorningReport`. Dịch mã lỗi Postgres sang `DUPLICATE`/`REJECTED`/`UNKNOWN` |
| `features/report-morning/actions.ts` | `saveMorningReport` (UC-04) + `updateMorningReport` (UC-05), đủ 7 bước `docs/07 §1.3` |
| `features/report-morning/morning-report-form.tsx` | Form client — validate on blur bằng **chính** schema của server |
| `features/report-morning/commitment-summary.tsx` | 4 chỉ tiêu cam kết — dùng lại ở `/sales/today` **và** `/sales/today/evening` |
| `components/ui/{textarea,form-field}.tsx` | Primitive mới |
| `components/ui/button.tsx` | Thêm `buttonClassName()` cho CTA dạng `<Link>` |

**Tầng báo cáo cuối ngày (Phase 4 — MỚI):**

| File | Vai trò |
|---|---|
| `lib/validation/report.ts` | Thêm `eveningReportSchema` + `MAX_EVENING_NOTE_LENGTH` + helper `optionalTextField()` |
| `lib/reports/draft-keys.ts` | **MỚI** — `morningDraftKey()` / `eveningDraftKey()`. Ba nơi cần đúng chuỗi này (DEC-035) |
| `lib/hooks/use-report-draft.ts` | **CHUYỂN TỪ** `features/report-morning/`. Hook thuần, `useSyncExternalStore` (DEC-035) |
| `components/ui/currency-field.tsx` | **CHUYỂN TỪ** `features/report-morning/`. Nhận thêm prop `helperText` (DEC-035) |
| `features/auth/queries.ts` | Thêm `authorizeSalesWrite()` — guard 3 bước dùng chung cho MỌI action ghi báo cáo (DEC-036) |
| `services/reports.ts` | Thêm `EveningReportWrite` + `completeEveningReport()` |
| `features/report-evening/actions.ts` | `saveEveningReport` (UC-06). **Tự `redirect()`**, chỉ trả về khi lỗi (DEC-037) |
| `features/report-evening/evening-report-form.tsx` | Form client — mỗi ô mang theo con số cam kết sáng trong helper text |
| `features/report-evening/discard-evening-draft.tsx` | Client component **không render gì** — dọn draft trên `/sales/today` khi `COMPLETED` (DEC-037) |
| `lib/reports/messages.ts` | Thêm `NO_MORNING_REPORT`, `ALREADY_COMPLETED`, `EVENING_COMPLETED` + `SAVED_PARAM.EVENING_COMPLETED` |

**Tầng KPI và bảng đối chiếu (Phase 5 — MỚI):**

| File | Vai trò |
|---|---|
| `lib/kpi.ts` | **Nguồn DUY NHẤT** của công thức KPI **và** của bảng đơn vị. 5 hàm thuần, không I/O |
| `lib/kpi.test.ts` | 46 test — bảng biên `docs/08 §3.1` + `§3.2`, cộng lưới 288 tổ hợp chống `NaN`/`∞` |
| `features/report-comparison/achievement-table.tsx` | Bảng đối chiếu DEC-019 — 4 card ở < 768px, `<table>` thật từ 768px |
| `features/report-comparison/achievement-badge.tsx` | Ánh xạ `status` → tone + icon Lucide. **Ngưỡng và nhãn vẫn ở `lib/kpi.ts`** |
| `features/report-comparison/report-notes.tsx` | Tuyến kế hoạch / mục đích / tuyến thực tế / ghi chú cuối ngày |

**Test (Phase 2 + 3 + 4 + 5):** `vitest.config.mts` (3 project) · `lib/auth/routes.test.ts` ·
`lib/date.test.ts` (33) · `lib/currency.test.ts` (**36**) · `lib/validation/report.test.ts` (96) ·
`lib/reports/today-cta.test.ts` (17) · **`lib/kpi.test.ts` (46 — MỚI)** · `tests/integration/*`
(4 file, 40 test) · `tests/rls/*` (4 file, 33 test).

**Hai file env (không commit, đều bị `.gitignore` chặn):**

| File | Ai dùng | Trỏ vào đâu |
|---|---|---|
| `.env.local` | Ứng dụng — `npm run dev` / `build` / `start` | Supabase **cloud** (sau khi người dùng tạo project) |
| `.env.test.local` | Bộ test — `npm test` / `npm run test:db` | Supabase **local**, luôn luôn |

`loadEnv('test', …)` nạp `.env.test.local` **sau** `.env.local` nên nó đè lên ⇒ `npm test` không bao
giờ chạm production dù `.env.local` trỏ cloud (DEC-022). Đã kiểm chứng thật: đặt `.env.local` sang
một URL cloud giả, `npm run test:db` vẫn **66/66 PASS**. `tests/integration/setup.ts` còn một chặn
thứ hai — URL không phải localhost thì ném lỗi ngay.

**Tầng xuất ảnh 9:16 (Phase 6 — MỚI):**

| File | Vai trò |
|---|---|
| `public/fonts/Inter-{Regular,SemiBold,Bold}.ttf` | **Asset BẮT BUỘC commit** — Satori đọc bằng `fs`. Không tải font qua mạng lúc render (`docs/09 §7.1`) |
| `next.config.ts` | `outputFileTracingIncludes` ghim `public/fonts/**` vào bundle của route ảnh. **Thiếu dòng này build vẫn xanh, Vercel ném `ENOENT`** |
| `app/api/reports/[id]/share-image/route.tsx` | Route Handler **DUY NHẤT** của dự án (DEC-003). `.tsx` vì chứa JSX. `runtime = 'nodejs'`. Font đọc một lần mỗi tiến trình |
| `features/report-share/daily-report-share-card.tsx` | Thẻ ảnh — flexbox thuần, hex thuần, không `className`. Chỉ tự quyết `status → màu` |
| `features/report-share/share-image-button.tsx` | Client — Web Share API → `<a download>` → mở tab mới. Kiểm `content-type` để không lưu HTML thành `.png` (ISSUE-015) |
| `lib/reports/share-card.ts` | View model **thuần**: cắt chuỗi, tên file FR-019, `shareImagePath()` |
| `lib/reports/metric-rows.ts` | **Nguồn DUY NHẤT** của "4 chỉ tiêu là gì" — dùng chung với `AchievementTable` |
| `services/reports.ts` | Thêm `getReportForShare()` + `ShareReport`. **Không nhận `salesId`** — cố ý |
| `middleware.ts` | Thêm `jsonPreservingCookies()` — 401/403 JSON cho `/api/*` (DEC-039) |
| `lib/auth/routes.ts` | Thêm `isApiPath()` |

---

**Tầng Sales History, Admin và E2E (Phase 7–11 — MỚI):**

| File | Vai trò |
|---|---|
| `lib/date.ts` | Thêm nhóm **5 hàm tháng**. `getVietnamMonthRange()` trả `null` khi sai định dạng (DEC-040) — **không còn khung ném lỗi nào trong `lib/`** |
| `lib/reports/pagination.ts` | `REPORTS_PAGE_SIZE = 20`, `parsePageParam()`, số học phân trang. Ba màn hình dùng chung |
| `lib/reports/admin-filters.ts` | Chuẩn hoá `searchParams` của Admin thành một khoảng ngày + 3 bộ lọc rời. Tham số tìm kiếm là **`q`** |
| `lib/reports/{history-row,history-url,admin-overview,report-status}.ts` | View model thuần cho danh sách và dashboard |
| `lib/reports/csv.ts` | Dựng CSV + escape đúng chuẩn. Tên cột đọc từ `metric-rows.ts` |
| `lib/reports/trend-chart.ts` | **Toàn bộ hình học biểu đồ** dưới dạng hàm thuần (DEC-044). SVG chỉ đổ số vào |
| `lib/reports/metric-rows.ts` | Thêm `kpiMetricRow(metric)` — bảng tra **toàn phần**, trả kiểu không `undefined` |
| `lib/navigation/nav-items.ts` | Nav Sales 3 mục / Admin 4 mục + **tập tiền tố** cho trạng thái active (DEC-018) |
| `lib/validation/{account,sales-account}.ts` | Zod cho đổi mật khẩu và quản lý tài khoản (DEC-041) |
| `lib/account/messages.ts` · `lib/admin/messages.ts` | **MỚI** — chuỗi thông báo. Ở `lib/` vì file `'use server'` không được export object (DEC-045) |
| `supabase/migrations/0006_admin_aggregates.sql` | 4 hàm SQL aggregate cho Admin |
| `supabase/migrations/0007_admin_daily_trend.sql` | RPC `admin_daily_trend` cho FR-037 |
| `services/admin.ts` | 5 hàm gọi RPC. Trả **giá trị an toàn khi lỗi** (0 / mảng rỗng), không ném |
| `services/reports.ts` | Thêm `listReportsByMonth`, `getReportById`, `listAdminReports`, `getAdminReportsForExport` |
| `services/profiles.ts` | Thêm `getAccountProfile`, `updateSalesProfile`, `setSalesActive`, `listSalesProfiles` |
| `app/api/admin/reports/export/route.ts` | Route Handler **thứ hai và cuối cùng** của v1 (DEC-042) |
| `features/sales-history/` · `features/account/` · `features/navigation/` | Phase 7 |
| `features/admin-dashboard/` · `features/admin-reports/` · `features/admin-analytics/` · `features/admin-sales-management/` | Phase 8–10 |
| `components/ui/back-link.tsx` | `href` tường minh, không phá back stack |
| `playwright.config.ts` | 3 project · `webServer` tự build + start ở cổng 3100 với env local · `reuseExistingServer: false` |
| `e2e/env.ts` | Nạp `.env.test.local` + **chặn an toàn** không cho trỏ ra cloud. Dùng `process.cwd()`, **không** `import.meta` |
| `e2e/accounts.ts` | Hằng số email — tách riêng để spec không kéo theo pool `pg` |
| `e2e/fixtures.ts` · `e2e/global-{setup,teardown}.ts` | Dựng/dọn tài khoản `@e2e.bikeforce.test`. **Mỗi project một Sales riêng** |
| `e2e/helpers.ts` | `signIn`, `visibleText`, `expectNoBrokenNumbers`, `expectNoHorizontalScroll` |
| `e2e/{sales-flow,admin-flow,security,a11y}.spec.ts` | 33 bài |
| `tests/integration/indexes.test.ts` | 14 bài `EXPLAIN ANALYZE`. Đóng ISSUE-005 |
| `tests/integration/setup.ts` | Thêm `inRollbackTransaction()` — đổi vai sang `authenticated` trên **một** kết nối |
| `tests/rls/{admin-aggregates,admin-reports,history-service,sales-management}.rls.test.ts` | RLS cho toàn bộ khu vực Admin và lịch sử |

---

## Database State

**Schema chạy thật trên Supabase local với 7 migration.** ⚠ **Cloud mới có 5** — xem bảng ở
`Current State` và hướng dẫn đẩy ở `docs/09 §12`.

- 2 enum, 2 bảng, `UNIQUE(sales_id, report_date)`, 16 CHECK, **3 index hiệu năng** (không thêm index
  mới nào ở Phase 7–11), 7 function + 6 trigger của Phase 2, **cộng 5 hàm aggregate** của 0006/0007.
- RLS **`enable` + `force`** trên cả 2 bảng, **6 policy**, deny-by-default. Không DELETE policy.
- 5 hàm aggregate: `security invoker`, guard `(select public.is_admin())` dạng InitPlan, chỉ
  `authenticated` được `execute` — `anon` **không** gọi được hàm nào.
- GRANT không đổi: `service_role` **không có DML** trên hai bảng nghiệp vụ (DEC-031).

- Cổng local của **BikeForce**: API `54321`, Postgres **`54322`**, Studio `54323`.
  ⚠ Máy đang chạy thêm 2 stack Supabase khác (ISSUE-010). Luôn lấy cổng bằng `npx supabase status`
  **trong thư mục dự án**.

> ⚠ **Sau mỗi `npx supabase db reset` phải restart 3 container**, nếu không mọi lần đăng nhập nhận
> `502` (ISSUE-012 — `docker ps` vẫn báo `healthy` nên rất dễ chẩn đoán sai):
>
> ```bash
> docker restart supabase_auth_<project> supabase_rest_<project>
> sleep 8 && docker restart supabase_kong_<project>
> ```
>
> ⚠ **`db reset` sẽ xoá cả hai migration mới nếu chúng chưa nằm trong thư mục `supabase/migrations/`**
> — chúng đã nằm ở đó, nên `reset` sẽ apply lại đủ 7 file.
>
> **Fixture cho kiểm chứng tay — ĐỌC TRẠNG THÁI THẬT TRƯỚC KHI DÙNG.** Các phiên kiểm chứng tay đã
> ghi vào database local nhiều lần, nên mô tả cũ trong tài liệu **luôn có thể lỗi thời**:
>
> ```bash
> docker exec supabase_db_<project> psql -U postgres -d postgres -c \
>   "select p.email, r.status from daily_reports r join profiles p on p.id = r.sales_id \
>    where r.report_date = (select (now() at time zone 'Asia/Ho_Chi_Minh')::date);"
> ```
>
> **Bộ E2E tự dựng và tự dọn fixture riêng** (`@e2e.bikeforce.test`), nên nó **không** đụng tới trạng
> thái seed mà bạn đang kiểm tay.

---

## Testing State

| Loại | Trạng thái |
|---|---|
| **Build** | ✅ `npm run build` → **exit 0** (Next.js 16.3.0, Turbopack, **18 route nghiệp vụ + 3 route metadata**: `/manifest.webmanifest`, `/icon.svg`, `/apple-icon.png`) |
| **Typecheck** | ✅ `npm run typecheck` → **exit 0** |
| **Lint** | ✅ `npm run lint` → **exit 0**, 0 error 0 warning |
| **Unit** | ✅ **555 passed** — 16 file, gồm **`pwa/manifest` 13** |
| **Integration (DB)** | ✅ **57 passed** — 5 file, gồm **`indexes` 14** + **3 bài MỚI khoá ràng buộc `0008`** (sàn BR-026 · cam kết sáng đòi doanh số tiền · `COMPLETED` đòi cột MỚI chứ không phải cột di sản) |
| **RLS** | ✅ **133 passed** — 9 file, phủ toàn bộ khu vực Admin và lịch sử |
| **Tổng `npm test`** | ✅ **745 passed / 745** |
| **Soát UI/UX (Phase 13b)** | ✅ **20 URL × 2 bề rộng**, đo trên DOM đã render: **~2.400 cặp màu — 0 vi phạm**, thấp nhất **4,68:1** · **0** phần tử tương tác < 44px · **0** input < 16px · `dynamic-type` **150%** không vỡ bố cục. **Tìm ra 1 lỗi thật** (tràn ngang 116px) → DEC-052 |
| **Coverage (`--project unit --coverage`)** | ✅ `lib/**` — stmt **99%** · branch **98,69%** · func **100%** · lines **99,4%** *(đo trước khi thêm `lib/pwa/`)* |
| **E2E (Playwright)** | ✅ **111 passed / 111** — 3 project × 37 bài, **4,0 phút**. Đã chạy lại SAU toàn bộ thay đổi của Phase 13. ⚠ Trong phiên có **2 lượt đỏ 1 bài**, mỗi lượt một bài KHÁC nhau, đều khi máy đang chạy song song nhiều lượt Playwright — xem **ISSUE-023**; lượt sạch cho **111/111** |
| **A11y (axe-core)** | ✅ **30 lượt quét** (10 màn hình × 3 project) — **0 vi phạm serious/critical** (NFR-007) |
| **EXPLAIN ANALYZE / InitPlan** | ✅ **ĐÃ ĐO** — `is_admin()` là InitPlan, mọi truy vấn list đi qua index. **ISSUE-005 CLOSED** |
| **Bảo mật (E2E)** | ✅ IDOR · 401/403 JSON cho `/api/*` · CSV Sales→403 Admin→200 + `no-store` · PNG **1080×1920** đọc từ `IHDR` · **service role key không có trong HTML** |
| **Xem tận mắt biểu đồ trend** | ✅ chụp và mở xem ở **375px và 1440px** — phát hiện lỗi type scale thật, đã sửa (DEC-044) |
| **Kiểm chứng các phase trước (script dùng-một-lần, đã xoá)** | ✅ Phase 2 **32/32** · Phase 3 **57/58** *(mục lệch NFR-008 nay ĐẠT theo DEC-043)* · Phase 4 **62/62** + hồi quy **11/11** · Phase 5 **36/36** · Phase 6 **44/44** |
| **Tài khoản inactive** | ✅ **6/6 PASS**, gồm cả bị vô hiệu hoá **giữa phiên** |
| **Zalo webview thiết bị thật** | ❌ `N/A — chưa làm được, cần điện thoại thật + link công khai` (ISSUE-003) |
| **Lighthouse** | ❌ `N/A — chưa chạy` |

Hai dòng `N/A` cuối **không được diễn giải thành pass** dưới bất kỳ hình thức nào. Các script kiểm
chứng trình duyệt của Phase 2–6 là **công cụ dùng một lần, đã xoá, không commit** — chúng không phải
bộ hồi quy. **Bộ hồi quy thật nay là `e2e/`**, đã commit, chạy bằng `npm run e2e`.


---

## Last Working Feature


**Toàn bộ v1 chạy thật đầu-cuối, cả Sales lẫn Admin (Phase 7–11).** `npm run e2e` tự `next build` +
`next start` trỏ vào Supabase local rồi chạy **99 bài trên 3 project**, tất cả xanh. Đường đi được
kiểm bằng máy, không phải bằng mắt:

**Phía Sales** — đăng nhập → `/sales/today` hiện "Chưa báo cáo" → **Tạo báo cáo đầu ngày** → điền 5
trường → **Lưu** → banner "Đã lưu báo cáo đầu ngày" do **server** quyết định (DEC-034) → **Sửa cam
kết sáng**, form prefill đúng `10`, đổi thành `8` → banner đổi thành "Đã cập nhật cam kết sáng" →
**Hoàn thành báo cáo cuối ngày**, form nhắc lại "8 xe" để đối chiếu → điền 4 chỉ số + tuyến + ghi chú
có dấu tiếng Việt → **Hoàn tất** → bảng đối chiếu hiện `125,0%` (vượt) và `75,0%` (chưa đạt), hai đầu
của BR-023 → vào lại `/evening` **và** `/morning` đều bị đá về `/sales/today` (BR-019 khoá vĩnh viễn)
→ nút **Xuất ảnh** xuất hiện (BR-002). Rồi **Lịch sử** → tháng trước → mở một dòng →
`/sales/reports/[id]` hiện đúng bảng đối chiếu + nút Xuất ảnh → **Tài khoản** → đổi mật khẩu, hai lần
nhập lệch nhau báo lỗi vào **đúng ô nhập lại**.

**Phía Admin** — đăng nhập → `/admin` hiện 12 chỉ số và cảnh báo → `/admin/reports`, tìm theo tên có
kết quả còn tên không tồn tại ra **empty state** (cặp đối chứng, chứng minh bộ lọc chạy thật ở server)
→ lọc tháng → mở chi tiết báo cáo của một Sales bất kỳ (BR-022) → `/admin/analytics` hiện tổng 4 chỉ
tiêu, **biểu đồ trend theo ngày**, mở `<details>` ra bảng số, đổi chỉ tiêu bằng URL → `/admin/sales`
hiện bảng hiệu suất → **Tạo tài khoản**, mật khẩu tạm hiện đúng một lần, tạo lại cùng email thì báo
"Email này đã được dùng cho một tài khoản khác" (BR-025) → mở `/sales/today` thì bị guard đưa về
`/admin` (FR-004).

**Phía bảo mật** — `salesA` mở `/sales/reports/<id-của-salesB>` nhận **đúng cùng một giao diện** với
`id` không tồn tại (BR-003, không dò được ID) · `anon` gọi hai route API nhận **401 JSON** không phải
HTML (DEC-039) · Sales gọi route CSV nhận **403** và **không một dòng dữ liệu nào** · Admin gọi thì
nhận `text/csv` + `attachment` + `no-store` · ảnh PNG đọc từ khối `IHDR` đúng **1080×1920** · HTML
của 4 trang Admin **không chứa** service role key.

**Phía khả năng tiếp cận** — 30 lượt quét axe trên 10 màn hình: **0 vi phạm serious/critical**.

Đây là **mốc an toàn thứ bảy**, và là mốc đầu tiên được chứng minh bằng một bộ test **có commit** thay
vì script dùng-một-lần.

**Xuất ảnh 9:16 chạy thật đầu-cuối (Phase 6).** `next build` + `next start` trỏ vào Supabase local,
đăng nhập bằng một Sales đã `COMPLETED` → `/sales/today` hiện nút **"Xuất ảnh báo cáo"** (chưa hoàn
tất thì nút **không xuất hiện**) → bấm → trình duyệt tải về
`BikeForce_Report_Le-Duy-Khang_2026-08-08.png`, `image/png`, `Cache-Control: private, no-store`,
`IHDR` đúng **1080×1920**. Mở ảnh ra: wordmark BIKEFORCE vàng, ngày `Thứ Bảy, 08/08/2026`, tên viết
HOA, bảng 4 dòng `125,0% / 80,0% / 83,3% / 100,0%` mỗi dòng kèm **nhãn chữ** ("Vượt mục tiêu" /
"Gần đạt") chứ không chỉ có màu, khối `125.000.000 ₫`, ghi chú `Ừ ẫ ợ ỹ đ Đ Ệ Ỡ` **đủ dấu**.
Một tấm thứ hai gom tất cả edge case: tên 42 ký tự xuống dòng không cắt, tuyến 300 ký tự cắt ở 2
dòng, ghi chú 1000 ký tự cắt ở 4 dòng, `100tỷ` trong bảng và `99.999.999.999 ₫` ở khối dưới,
`1.250,0%`, `+3 điểm` kèm "Vượt kế hoạch" — **không chỗ nào có `NaN`, `Infinity` hay `∞`**.
Gọi thẳng URL: chính chủ với báo cáo chưa hoàn tất → **403**; salesA với `id` của salesB → **404**;
Admin → **200** (BR-022); chưa đăng nhập → **401 JSON**, không phải trang HTML.

Đây là **mốc an toàn thứ sáu**.

**Mốc an toàn thứ năm — bảng đối chiếu KPI chạy thật trên cả hai bề rộng (Phase 5).** `next build` + `next start` trỏ vào
Supabase local. Đăng nhập bằng `sales.c@bikeforce.local` (đang `MORNING_SUBMITTED`) → `/sales/today`
hiện 4 card "Viếng thăm / Doanh số / Doanh thu / Khách hàng", mỗi card có cột **Cam kết** với đúng
đơn vị (`5 điểm`, `9 xe`, `90.000.000 ₫`, `11 khách`), cột **Thực đạt** là `—`, badge xám
"Chờ số liệu" kèm icon đồng hồ. Đăng nhập bằng `sales.a` (đã `COMPLETED`, số liệu lẫn lộn) → bốn
badge khác nhau: `100,0% Vượt mục tiêu` (▲ xanh) · `75,0% Chưa đạt` (▼ đỏ) · `80,0% Gần đạt`
(— vàng) · `90,0% Gần đạt`. Giãn cửa sổ lên 1440px → 4 card **biến mất**, `<table>` thật hiện ra
với `<caption>` cho screen reader, 4 cột "Chỉ tiêu / Cam kết sáng / Thực đạt / Hoàn thành", số căn
phải `tabular-nums`, **số liệu khớp y hệt bản mobile**. Đặt `target = 0` cho một chỉ tiêu → ô
"Hoàn thành" hiện `+7 xe` kèm nhãn "Vượt kế hoạch", `target = 0 && actual = 0` hiện `100,0%` —
**không chỗ nào có `NaN`, `Infinity` hay `∞`**. Không cuộn ngang ở cả hai bề rộng.

Đây là **mốc an toàn thứ năm**. (Phase 6 đã chạy xong mà không làm vỡ gì ở đây — bảng đối chiếu vẫn
đúng sau khi `AchievementTable` chuyển sang dùng chung `KPI_METRIC_ROWS`.)

**Mốc an toàn thứ tư — luồng báo cáo ngày chạy thật ĐẦY ĐỦ cả hai nửa (Phase 4).** `next build` + `next start` trỏ vào
Supabase local, đăng nhập bằng `sales.a@bikeforce.local` (đang `MORNING_SUBMITTED`) → `/sales/today`
hiện "Đã cam kết" + CTA "Hoàn thành báo cáo cuối ngày" → bấm CTA → `/sales/today/evening` hiện lại
đủ 4 cam kết sáng để đối chiếu, mỗi ô nhập nhắc lại con số đã cam kết → điền 4 chỉ số thực đạt +
tuyến thật + ghi chú có dấu tiếng Việt → **Hoàn tất báo cáo hôm nay** → quay về
`/sales/today?saved=evening` với banner "Đã hoàn tất báo cáo hôm nay", trạng thái đổi thành "Đã hoàn
thành", draft localStorage bị xoá → vào lại `/evening` **và** `/morning` đều bị đá về `/sales/today`
(BR-019 khoá vĩnh viễn). Tài khoản chưa có cam kết sáng (`sales.c`) vào `/evening` thì được đưa
thẳng tới `/sales/today/morning` (BR-007).

**Mốc an toàn thứ ba — luồng cam kết đầu ngày chạy thật đầu-cuối (Phase 3).** `next build` + `next start` trỏ vào Supabase
local, đăng nhập bằng `sales.c@bikeforce.local` → `/sales/today` hiện "Chưa báo cáo" + empty state →
bấm CTA → điền form → **Lưu** → quay về `/sales/today` với banner "Đã lưu báo cáo đầu ngày", trạng
thái đổi thành "Đã cam kết", CTA đổi thành "Hoàn thành báo cáo cuối ngày" → bấm "Sửa cam kết sáng"
→ form prefill đúng → sửa → banner "Đã cập nhật cam kết sáng". Tài khoản đã `COMPLETED` (`sales.b`)
vào thẳng `/sales/today/morning` thì bị đá về `/sales/today` (BR-019).

Luồng này **đã được chạy lại nguyên vẹn ở Phase 4** sau khi refactor `authorizeSalesWrite`,
`CurrencyField` và khoá draft: **11/11 PASS**.

**Mốc an toàn thứ hai — luồng xác thực đầu-cuối (Phase 2).** `next build` + `next start`, đăng nhập bằng tài khoản seed
(`sales.a@bikeforce.local` / `admin@bikeforce.local`, mật khẩu local `LocalDev#2026`) → vào đúng
dashboard theo role → đăng xuất → bị chặn lại. Sai vai bị đưa về dashboard của chính mình; tài khoản
bị vô hiệu hoá giữa phiên bị đá về `/login?reason=deactivated`.

Đây là **mốc an toàn thứ hai**.

---

## Next Exact Steps

**LÀM ĐÚNG BA VIỆC NÀY TRƯỚC, THEO THỨ TỰ — cập nhật cuối phiên Entry 016:**

> ✅ **Ba việc kỹ thuật đầu tiên ĐÃ XONG ngày 2026-08-10:** commit + `git push` (`356f9dd`) ·
> `supabase db push` đưa `0008` lên cloud (**8/8**) · xác minh đủ 7 phép kiểm (bảng ở
> `Database State`). **Không làm lại.**

**VIỆC SỐ 1 CÒN LẠI — cần người dùng, làm ngay:**

Mở Vercel, xác nhận deployment của `356f9dd` đã **Ready**, rồi **mở lại `/admin`** và kiểm hai điều:
- 12 chỉ số hiện số thật, **không** có `NaN` / `undefined`;
- báo cáo ngày `2026-08-10` hiện **`—`** ở ô "Doanh số" — đó là **đúng** (OQ-19c: dòng có trước
  `0008` mang `null`), **không phải lỗi**.

Nếu Vercel chưa build xong thì bản deploy CŨ vẫn đang đọc `admin_*` theo tên cột cũ và sẽ hiện số
sai — **Redeploy** là đủ, không phải sửa gì.

**Sau đó là bốn việc cần NGƯỜI hoặc THIẾT BỊ THẬT (không phải code):**

| # | Việc | Vì sao agent không làm được |
|---|---|---|
| 4 | **Xem tận mắt** 18 route ở 375px và 1440px | Đã đo đủ bằng máy; phần còn lại là thẩm mỹ, cần mắt người |
| 5 | "Thêm vào màn hình chính" trên Chrome Android + Safari iOS | Cần điện thoại thật |
| 6 | **ISSUE-003** — ảnh 9:16 trong Zalo | Cần điện thoại thật + link công khai |
| 7 | **Lighthouse mobile** (NFR-001) · **ISSUE-011** rotate service role key | Cần bản deploy / Dashboard |

**Việc dọn dẹp còn nợ:** xoá `.env.admin-bootstrap`.

---

> ✅ Phase 0, 1, 2, 3, 4, 5, 7, 8, 9, 10 đã đóng đủ. Phase 6 xong 11/12, Phase 11 xong 12/14 —
> **bốn mục còn lại của cả hai phase đều cần thiết bị thật hoặc link công khai**, không phải code.
> **Không làm lại bất cứ thứ gì trong danh sách trên.**

**VIỆC 0 — kiểm môi trường trước khi gõ code (1 phút):**

1. `npx supabase status` **trong thư mục dự án**, rồi `npm test`. Kỳ vọng **729 passed**
   (`unit` 542 · `integration` 54 · `rls` 133) trong khoảng 24 giây. Nếu test treo hàng phút rồi
   FAIL, **kiểm `docker ps` trước khi nghi ngờ code** (`WORKLOG.md` Entry 009 mục Errors 3). Đăng
   nhập nhận `502` thì đó là **ISSUE-012**, lệnh khắc phục ở mục `Database State`.
2. Muốn chạy E2E: `npm run e2e`. Nó **tự `next build` rồi `next start` ở cổng 3100** với env bơm từ
   `.env.test.local`, tự dựng và tự dọn tài khoản `@e2e.bikeforce.test`. Kỳ vọng **99 passed**,
   khoảng 4,5 phút. Chỉ chạy một project: `npx playwright test --project=mobile-375`.

**PHASE 12 — làm theo `docs/09 §13` (runbook 8 bước, từng cú bấm). Tóm tắt thứ tự:**

| Bước | Ai làm | Việc |
|---|---|---|
| ~~0~~ | ~~bạn~~ | ~~`git push origin main`~~ — ✅ **XONG 2026-08-10, agent tự chạy được** |
| 1 | bạn | Dashboard → Authentication → **Minimum password length = 8** (DEC-041); xác nhận signup vẫn TẮT |
| 2 | bạn | Dashboard → API Keys → **Generate new secret key** (ISSUE-011). **Đóng `.env.local` trong VS Code trước khi dán** |
| 3 | bạn | Chép 3 giá trị env |
| ~~4~~ | ~~bạn~~ | ~~Tạo Admin đầu tiên~~ — ✅ **XONG 2026-08-10, agent tự chạy được.** `datathongdat@gmail.com` / "Lê Duy Khang", `role='ADMIN'`, `is_active=true`, email đã confirm. **Đã kiểm chứng bằng đăng nhập thật** vào cloud rồi đọc `profiles` qua chính JWT đó. Mật khẩu tạm ở `.env.admin-bootstrap` (git bỏ qua) — đổi xong thì xoá file |
| 5 | bạn | Vercel: Import repo → Next.js → Node 22 → **3 biến env** (tick cả 3 môi trường) → Deploy → đổi region **`sin1`** → bật Deployment Protection cho **Preview** (Production để công khai) |
| 6 | bạn | Supabase → Authentication → **URL Configuration** → Site URL + Redirect URLs = domain Vercel |
| 7 | bạn | Smoke test **trên điện thoại thật** — 8 điều, gồm **Thêm vào màn hình chính** và **ISSUE-003 (Zalo)** |
| 8 | bạn | Lighthouse mobile (NFR-001), rồi ghi `WORKLOG.md` |

**Chi tiết cũ, giữ lại làm tham chiếu:**

3. ~~**Đẩy migration 0006 + 0007 lên cloud.**~~ ✅ **XONG 2026-08-10** bằng
   `npx supabase db push --linked --yes` (mật khẩu lấy từ `SUPABASE_DB_PASSWORD` trong `.env.local`,
   truyền qua biến môi trường nên không cần TTY). Cloud nay **7/7 migration**, cả 5 hàm `admin_*` tồn
   tại, `anon` không execute được hàm nào, schema hai bên khớp. **Không làm lại.**
4. **Đặt `Minimum password length = 8`** trên Supabase Dashboard → Authentication → Password, cho
   khớp `PASSWORD_MIN_LENGTH` ở `lib/validation/account.ts` (**DEC-041**). Không bật yêu cầu chữ
   hoa/chữ số/ký tự đặc biệt. Xác nhận **Enable email signup vẫn TẮT** (BR-012, FR-006).
5. **Rotate service role key (ISSUE-011, P1).** Dashboard → Project Settings → API Keys → mục secret
   → **`Generate new secret key`**. **Đóng `.env.local` trong VS Code trước khi dán** giá trị mới,
   hoặc dán bằng terminal — nếu không, IDE lại tự đưa key vào ngữ cảnh hội thoại đúng như lần trước.
6. ~~**Regenerate `types/database.types.ts` từ cloud** rồi so với bản `--local`.~~ ✅ **XONG
   2026-08-10** — khác **đúng một khối metadata** (`__InternalSupabase.PostgrestVersion`), nghĩa là
   schema hai bên khớp. Bản đã commit (generate từ local) **dùng được cho production**, không cần
   commit lại bản cloud.

6b. **Runbook tạo Admin đầu tiên — LÀM SỚM, trước khi test bản deploy.** Seed **không** được đẩy nên
   **cloud chưa có user nào**; không làm bước này thì không đăng nhập được vào bản deploy. `docs/09
   §10`: tạo user trên Dashboard → `update public.profiles set role = 'ADMIN' where email = '<email>';`
   **một lần duy nhất**.
7. **Vercel** — `docs/09 §12.5`: framework Next.js, region `sin1`, Node 22, ba biến môi trường
   (**không** thêm `SUPABASE_DB_URL`), bật "Protect Preview Deployments".
8. **Chạy runbook tạo Admin đầu tiên trên production** — `docs/09 §10`: tạo user trên Dashboard rồi
   `update public.profiles set role = 'ADMIN' where email = '<email>';` **một lần duy nhất**.
9. **PWA manifest + icon + `display: standalone`** (FR-036). **Không** service worker (DEC-024).
10. **Smoke test trên production** — 5 điều ở `docs/09 §12.6`.

**Ba việc chỉ làm được SAU khi có link công khai:**

11. **ISSUE-003 — kiểm ảnh 9:16 trong Zalo trên điện thoại thật.** Mục cuối cùng còn nợ của Phase 6.
    Kiểm đủ ba đường ra: share sheet có Zalo không · `<a download>` có lưu được không · ảnh mở ra có
    đúng dấu tiếng Việt không. **Project `zalo-like` của Playwright KHÔNG thay thế được** — nó chỉ
    đội một `userAgent` khác, không tái hiện giới hạn API thật của webview.
12. **Lighthouse mobile ≥ 90, LCP < 2,5s trên 4G** (NFR-001) — mục còn lại của Phase 11.
13. **Ma trận thử tay** Chrome mobile + Safari mobile 2 phiên bản gần nhất (NFR-009) — mục còn lại
    của Phase 11.

**Nếu cần sửa code ở phase sau, đọc `DO NOT REDO` bên dưới trước.**


---

## DO NOT REDO

**Từ phiên THIẾT KẾ LẠI GIAO DIỆN (MỚI NHẤT — DEC-053, 2026-08-10):**

- **Bảng màu DEC-046 KHÔNG bị đụng.** DEC-053 chỉ thêm **chiều sâu, bo góc, chuyển động**. Đừng
  "sửa lại màu cho tươi" — người dùng đã chốt giữ đúng tone logo, và vấn đề chưa bao giờ ở màu.
- **`Card` tách lớp bằng BÓNG, không phải viền.** Viền `--color-border` chỉ **1,22:1** so với nền;
  ngoài nắng gần như không thấy. Đừng đổi ngược lại thành `border` đậm.
- **Kính mờ CHỈ cho header và bottom nav** — hai nơi không có nội dung đọc lâu. Đặt lên khối chữ là
  tụt tương phản, đúng thứ NFR-007 cấm. Luôn kèm `supports-backdrop-filter:`.
- **Cam logo làm nền nút CHỈ ở "Xuất ảnh báo cáo"** (`variant="accent"`, chữ TỐI 8,17:1). Luật
  `primary-action` cho đúng MỘT CTA chính mỗi màn hình. Chữ trắng trên cam là **2,19:1 — CẤM**.
- **`ProgressBar` không tự tính và không tự quyết ngưỡng.** `percent = null` vẽ **máng vân chéo**,
  KHÔNG vẽ thanh 0% — 0% nói sai rằng người dùng chưa làm được gì. Chiều dài chặn ở 100% là giới hạn
  của HÌNH VẼ, không phải clamp dữ liệu (BR-004 vẫn cho `1.250,0%` ở badge).
- **Traffic-light của ô chỉ số Admin là VẠCH bên trái**, không bọc con số trong mảng màu — vạch là đồ
  hoạ nên chịu ngưỡng 3:1, và **không sinh thêm cặp nền×chữ nào** phải đo lại (bài học ISSUE-018).
- **`e2e/ui-quality.spec.ts` ĐƯỢC COMMIT — đừng xoá như các bộ soát dùng-một-lần trước.** Lý do:
  `bg-card/85` trông y hệt `bg-card` cho tới khi đo. Trong đó có **bốn cái bẫy đã sập một lần**; gỡ
  điều nào cũng là mù lại.
- **MỖI SPEC CÓ GHI BÁO CÁO PHẢI CÓ SALES RIÊNG — không chỉ mỗi project.** `ui-quality.spec.ts` dùng
  `uiSalesEmail(project)`, `sales-flow.spec.ts` dùng `flowSalesEmail(project)`. Bản đầu gộp chung và
  **xanh khi chạy riêng, đỏ ở cả 3 project khi chạy đầy đủ**: spec chạy trước đưa tài khoản lên
  `COMPLETED`, BR-019 khoá vĩnh viễn, form không mở được nữa. Đây là bản mở rộng của cảnh báo
  "mỗi project một Sales riêng" có từ Phase 11.
- **Chạy riêng một bài rồi thấy xanh KHÔNG chứng minh bài test đúng.** Chỉ một lượt `npm run e2e`
  **đầy đủ** mới lộ ra va chạm trạng thái giữa các spec.
- **Bài soát giao diện: tối đa ~5 route mỗi bài, timeout 240 giây.** Phép đo quét cả cây DOM và gọi
  `getComputedStyle` cho từng phần tử; ở `desktop-1440` chi phí gần **gấp đôi** vì DEC-019 render cả
  hai nhánh (thẻ + `<table>`) cùng lúc. Bài 8 route đã hết giờ thật ở 180 giây.
- **Bài soát đỏ thì ĐỌC ẢNH CHỤP LÚC ĐỎ TRƯỚC.** Trang render bình thường + `Test timeout exceeded`
  ⇒ **test hết giờ**, sửa ngân sách. Trang render sai / có `findings` ⇒ **giao diện sai**, sửa giao
  diện. Hai nguyên nhân, hai cách sửa hoàn toàn khác nhau.
- **`ui-quality` CỐ Ý bỏ qua ở `zalo-like`** — project đó cùng viewport 375×812 với `mobile-375`,
  chỉ khác `userAgent`, mà bốn luật đo đều là hàm của bề rộng và CSS. Chạy ở đó là đo lại y hệt.
  **Đừng "bật lại cho đủ ba project".**
- **Ngưỡng chờ `signIn` là 45 giây** (nâng từ 20). Lý do đầy đủ ở `e2e/helpers.ts` và `docs/08 §13.8`.
  ⚠ **Cần nâng tiếp thì ĐỪNG NÂNG — hãy sửa ISSUE-021.** Ngưỡng này là chỗ chi phí đó lộ ra.
- **Thêm một bài E2E NẶNG thì phải hỏi "project nào thật sự cho thêm thông tin?".** Chạy mọi bài
  trên mọi project không phải kỹ lưỡng — nó đánh đổi độ tin cậy của cả bộ lấy lượt chạy trùng lặp.
  12 bài soát thêm vào đã làm **đỏ oan hai bài KHÁC** đúng theo cơ chế đó.
- **Bài học lớn nhất của phiên:** *"không vi phạm"* và *"đẹp"* là **hai câu hỏi khác nhau**. Bốn
  nhóm luật đo được (tương phản/cỡ chạm/tràn ngang/cỡ chữ) không bao giờ trả lời được câu thứ hai.
  **Muốn biết giao diện có đẹp không thì phải CHỤP ẢNH RA VÀ NHÌN.**

**Từ phiên PHASE 13 (Entry 016, 2026-08-10):**

- **`SALES_QUANTITY` KHÔNG CÒN TỒN TẠI.** Khoá chỉ tiêu là **`SALES_AMOUNT`**, đọc từ cặp cột
  **`target_sales_amount` / `actual_sales_amount`**. Cột `*_sales_quantity` vẫn nằm trong database
  nhưng là **DI SẢN** — **không code nào được đọc nó**. Đơn vị `xe` đã bị xoá khỏi `lib/kpi.ts`.
- **`visit_purpose` KHÔNG được hiển thị ở đâu nữa** (DEC-048), kể cả với báo cáo cũ đang có dữ liệu.
  Đừng "khôi phục cho đủ thông tin" — đó chính là thứ người dùng yêu cầu bỏ. Cột giữ lại chỉ vì
  BR-013 cấm xoá dữ liệu.
- **Ba constraint của `0008` là `not valid` một cách CỐ Ý.** Chúng **không** kiểm dòng cũ (dòng cũ
  mang `null` ở cột mới nên không thể thoả) nhưng **ép đủ với mọi `insert`/`update` mới** — có 3 bài
  integration khoá lại. **Đừng chạy `validate constraint`**: nó sẽ đỏ, và đỏ là đúng.
- **Sàn 10 của BR-026 chỉ áp cho `target_visit_points`.** `actual_visit_points` vẫn từ 0. Đi được ít
  hơn cam kết là **kết quả thật**, không phải dữ liệu sai.
- **Đổi tên cột trong `returns table (...)` bắt buộc `drop function` rồi `create`** — Postgres từ
  chối `create or replace`. Và `drop function` **cuốn theo mọi `GRANT`**, phải cấp lại đủ.
- **`gen types --local` cần `SUPABASE_DB_PASSWORD=postgres` và phải bỏ `stderr`** (ISSUE-022). Gộp
  `stderr` vào file sẽ ghi dòng `Connecting to db 5432` vào đầu `types/database.types.ts`.
- **Chuỗi tiền dùng NO-BREAK SPACE `U+00A0`.** Assertion gõ space thường cho ra
  `expected '5 ₫' to be '5 ₫'` — hai chuỗi nhìn y hệt nhau.
- **Soát bố cục PHẢI mở mọi `<details>` trước khi đo**, và **phải đo bằng tài khoản vào được form**.
  Lượt soát đầu tiên báo "0 phát hiện" **sai** vì cả hai lý do đó. Luôn xuất kèm bộ đếm — "0 phát
  hiện" chỉ có nghĩa khi biết mẫu số.
- **Bảng số liệu của biểu đồ trend nay có HAI nhánh** (thẻ < 768px, `<table>` từ 768px — DEC-052).
  Bài E2E vì vậy assert theo **nội dung nhìn thấy**, không theo `role=table`: role đó **cố ý không
  tồn tại** ở mobile.
- **`commitment-summary.tsx` nay đọc nhãn từ `KPI_METRIC_ROWS`**, không viết cứng. Đừng gõ lại bốn
  chuỗi nhãn ở bất kỳ component nào.
- **`KpiMetricRow.shortLabel` chỉ dành cho thẻ ảnh 9:16.** Web luôn dùng `label` đầy đủ.
- **Đừng chạy bộ soát giao diện SONG SONG với `npm run e2e`** — cả hai tự `next build` + `next start`
  và tranh nhau CPU lẫn database local; đã gây một lượt đỏ oan (ISSUE-023).

**Từ phiên PWA + đổi màu theo logo (2026-08-10):**

- **Bảng màu nay lấy từ LOGO — DEC-046.** `--color-primary` là **`#1273B8`** (azure), **không** còn
  là chàm `#1E40AF`. Cam logo `--color-accent` = **`#E9A04F`**. Đừng "khôi phục" bảng cũ; DEC-014
  vẫn còn hiệu lực về **phương pháp**, chỉ bảng **giá trị** bị thay.
- **Cam logo `#E9A04F` chỉ 2,19:1 trên trắng.** Nó **CẤM** làm chữ và làm đồ hoạ mang nghĩa. Chỉ
  hợp lệ làm **nền** (chữ tối trên nó, 8,17:1) và làm **chính hình logo**. Muốn chữ màu cam thì dùng
  `--color-accent-text` (`#97580B`, 5,65:1).
- **ĐỪNG ghép `text-` của cặp này lên `bg-` của cặp khác** — ISSUE-018. Ghép `text-primary` lên
  `bg-status-info-bg` cho ra **4,32:1** và làm đỏ 9 lượt quét axe ở `desktop-1440`. Mỗi dòng trong
  `TONE_CLASS` của `components/ui/badge.tsx` là **một cặp trọn vẹn**.
- **Đo token so với `card`/`background` là CHƯA ĐỦ** — phải đo cả những cặp **thực tế chồng lên nhau
  trong DOM**. Đây là bài học của ISSUE-018.
- **`components/ui/brand-mark.tsx` có toạ độ SINH RA từ cùng nguồn với bộ icon.** Đừng sửa tay `d=`;
  sửa ở trình sinh rồi xuất lại cả bộ, nếu không logo web và icon màn hình chính sẽ lệch hình.
- **`app/manifest.ts` + 3 file icon KHÔNG phải Route Handler thứ ba** (DEC-047). Thấy 3 route lạ
  trong bảng `next build` thì đó là **metadata route**, DEC-042 vẫn nguyên vẹn.
- **`webmanifest` trong `PUBLIC_FILE` của `middleware.ts` là BẮT BUỘC.** Bỏ đi thì manifest bị trả
  về HTML `/login` kèm **200**, và "Thêm vào màn hình chính" **im lặng biến mất**. Có bài E2E khoá.
- **`theme_color` = `background_color` = TRẮNG là CỐ Ý** (DEC-047). Đừng đổi sang xanh thương hiệu.
- **Skill `ui-ux-pro-max` đã tải về** `~/.claude/skills/ui-ux-pro-max` (v2.13.0). Dùng
  `references/quick-reference.md` + `references/pro-rules.md`. ⚠ **`--design-system` của nó khớp
  NHẦM** cho sản phẩm này (trả về "Newsletter / Content First" + bảng màu **đỏ** + font Atkinson) —
  **chỉ dùng phần checklist**, đừng dùng phần sinh design system.

**Từ Phase 7–11 (2026-08-10):**

- **Toàn bộ Phase 7, 8, 9, 10 ĐÃ XONG và có test.** 18 route đều chạy thật. **Đừng dựng lại** bất kỳ
  màn hình nào vì checkpoint cũ ghi "chưa bắt đầu" — checkpoint đó đã lỗi thời và đã được sửa.
- **`getVietnamMonthRange()` ĐÃ CÓ THÂN THẬT**, trả `{from,to} | null` (DEC-040). Ghi chú cũ
  "vẫn cố ý là khung ném lỗi" **đã hết hiệu lực**. Nhóm hàm tháng nay có 5 hàm:
  `getVietnamMonthRange` · `getVietnamCurrentMonth` · `formatVietnamMonth` · `shiftVietnamMonth` ·
  `resolveVietnamMonth`.
- **`CTA_ROUTES_NOT_READY` đã bị xoá** khỏi `app/(sales)/sales/today/page.tsx`. Không còn cờ
  "chưa sẵn sàng" nào trong dự án. CTA "Xem báo cáo hôm nay" nay **bấm được thật**.
- **`lib/reports/metric-rows.ts` nay có `kpiMetricRow(metric)`** trả kiểu **không** `undefined`.
  Dùng nó thay cho `KPI_METRIC_ROWS.find(...)` — hàm kia buộc mọi nơi gọi viết một nhánh dự phòng
  không bao giờ chạy tới. Mảng `KPI_METRIC_ROWS` dựng **TỪ** bảng tra, nên hai bên không thể lệch.
- **Năm hàm SQL aggregate là `security invoker`, KHÔNG phải `security definer`.** `definer` sẽ chạy
  vượt RLS — đúng thứ DEC-004 cấm. Ngoại lệ duy nhất vẫn là `is_admin()` (DEC-006). **Đừng "sửa cho
  chạy được"** bằng cách đổi sang `definer`; có 31 bài RLS khoá lại và chúng sẽ đỏ.
- **ISSUE-005 ĐÃ ĐÓNG bằng phép đo thật.** `(select public.is_admin())` được Postgres nâng thành
  **InitPlan**, `actual rows=1 loops=1`. **Đừng đo lại**, và đừng "tối ưu" cách gọi hàm đó.
- **`idx_daily_reports_sales_date_desc` KHÔNG dư thừa — ĐỪNG DROP.** Câu hỏi bỏ ngỏ trong
  `0005_indexes.sql` đã có câu trả lời: nó thắng `uq_daily_reports_sales_date` cho truy vấn FR-021,
  và không sinh node `Sort`. `idx_profiles_role_active` thì phủ được truy vấn nhưng ở quy mô vài
  chục dòng planner chọn `Seq Scan` là **hợp lý** — đừng kết luận "index hỏng" từ điều đó.
- **Bộ `indexes.test.ts` PHẢI tự sinh dữ liệu và PHẢI đo dưới vai `authenticated`.** Trên bảng 22
  dòng của seed thì **mọi** truy vấn đều `Seq Scan`; và role `postgres` có `rolbypassrls` nên policy
  không tham gia kế hoạch. Bỏ một trong hai điều đó là bài test "xanh" một cách vô nghĩa.
- **File `'use server'` chỉ được export async function** (DEC-045, ISSUE-016). Chuỗi thông báo nằm ở
  `lib/account/messages.ts` và `lib/admin/messages.ts`. **Đừng chuyển ngược vào `actions.ts`** —
  build, typecheck, lint và toàn bộ unit test vẫn xanh, còn trang thì sập ở runtime.
- **Bộ E2E phải chạm ít nhất một Server Action của mỗi feature.** Đây là điều kiện duy nhất bắt được
  nhóm lỗi ISSUE-016. Thêm feature mới có Server Action mà không có bài E2E chạm tới nó là để lại
  một lỗ hổng cùng loại.
- **Đừng dùng `getByText(...).first()` trong E2E — dùng `visibleText()` ở `e2e/helpers.ts`.**
  DEC-019 render **hai nhánh cùng lúc trong DOM**, và ở 1440px thì bản đứng **trước** là bản bị ẩn.
  Đã làm 4 bài đỏ cùng lúc trong khi giao diện hoàn toàn đúng.
- **Mỗi project Playwright có Sales riêng — đừng gộp.** BR-001 chỉ cho một báo cáo mỗi ngày và
  BR-019 khoá vĩnh viễn, nên dùng chung một tài khoản thì lượt chạy thứ hai trong ngày sẽ đỏ dù code
  đúng. Cũng **đừng dùng tài khoản seed** cho E2E — nó phá trạng thái người dùng đang kiểm tay.
- **`reuseExistingServer: false` trong `playwright.config.ts` là CỐ Ý.** Một `next start` cũ giữ cổng
  sẽ phục vụ bản build cũ với env cũ — đã gây một vòng chẩn đoán sai ở Phase 4.
- **`e2e/env.ts` dùng `process.cwd()`, KHÔNG dùng `import.meta.url`.** Playwright biên dịch file cấu
  hình sang CommonJS, nơi `import.meta` là **lỗi cú pháp**.
- **`globalSetup` KHÔNG được đóng pool `pg`** — `globalTeardown` dùng chung instance module đó và sẽ
  không dọn được fixture, trong khi Playwright chỉ báo "1 error was not a part of any test".
- **Biểu đồ trend: KHÔNG đặt chữ vào trong `<svg>`.** viewBox cố định cộng `width: 100%` làm SVG
  phóng to 2,7 lần ở 1440px, biến chữ 11px thành ~30px (DEC-044). Nhãn ngày là HTML, và vùng vẽ phải
  trải kín bề rộng viewBox (`PLOT_LEFT = 0`) để nhãn khớp cột — có unit test khoá lại.
- **`admin_daily_trend` cố ý chỉ trả ngày CÓ báo cáo hoàn tất.** Đừng "hoàn thiện" bằng
  `generate_series` cả tháng: v1 không có khái niệm ngày nghỉ (DEC-030), nên cột 0 cho Chủ nhật là
  số liệu bịa.
- **ISSUE-017 là hành vi đã hiểu rõ và CỐ Ý không sửa:** `notFound()` trên route có `loading.tsx`
  trả **200** kèm giao diện "Không tìm thấy". Tính không-phân-biệt-được của BR-003 vẫn đúng, không
  có dữ liệu nào rò rỉ, và route API vẫn trả mã thật. **Đừng bỏ `loading.tsx`** để lấy lại 404.
- **`formatCompactVND` vẫn CHỈ dành cho thẻ ảnh 9:16.** Biểu đồ trend cố ý **không** có nhãn số trên
  trục vì lý do này — con số chính xác nằm ở bảng `<details>` bên dưới.


**Từ Phase 0:**

- Đã đọc toàn bộ `BIKEFORCE_MASTER_SPEC.md`; đã chạy thật skill `ui-ux-pro-max`; đã đo contrast toàn
  bộ bảng màu; đã `git init` + push GitHub; **đã hỏi và nhận đủ 17/17 câu trả lời OPEN QUESTION —
  tuyệt đối không hỏi lại**; đã parse kiểm chứng 30/30 khối Mermaid.
- Bộ 17 tài liệu Phase 0 **chỉ cập nhật, không viết lại từ đầu**. Giữ nguyên toàn bộ ID. **Không bao
  giờ renumber.**

**Từ Phase 1:**

- Đã chạy smoke test toolchain — **không thử lại TypeScript 7 hay ESLint 10**.
- Đã `create-next-app` và pin phiên bản — không chạy lại, không đổi thành dải `^`.
- Đã dựng cấu trúc thư mục DEC-023, 3 Supabase client, design token, font Inter — không dựng lại.

**Từ Phase 2 (mới):**

- **Đã viết và CHẠY THẬT cả 5 migration** — không viết lại. Muốn đổi schema thì viết **migration mới**
  (`0006_*.sql`), migration chỉ tiến tới (AGENTS.md §13).
- **Đã kiểm chứng CẢNH BÁO 2 của `docs/02 §11`** (`force RLS` + `handle_new_user`): rủi ro **không
  xảy ra** vì `postgres` có `rolbypassrls`. **Không kiểm lại**, không áp dụng lối thoát (A) hay (B).
  Kết quả đầy đủ ở `docs/11 § DEC-006 — KẾT LUẬN PHASE 2`.
- **Đã kiểm chứng `now()` dùng được trong CHECK constraint** — Postgres chấp nhận. Đừng gỡ
  `ck_report_not_future` vì nghĩ rằng nó không hợp lệ (chính tôi đã mắc lỗi này ở Entry 004).
- **Đã kiểm chứng `extensions.citext` so sánh được dưới role `authenticated`** — không cần phương án
  dự phòng `lower(email)`.
- **Đã đo bảng GRANT thật** và chốt DEC-031. **Đừng "sửa cho tiện"** bằng cách cấp DML cho
  `service_role` — đó là một lớp phòng thủ thật, và có test khoá lại (sẽ đỏ nếu ai đó cấp thêm).
- **Đã dựng bộ test 80 case và chạy xanh** — không viết lại từ đầu, chỉ thêm.
- **Đã quyết định giữ tên `middleware.ts`** dù Next 16.3 deprecate (ISSUE-009). Đừng tự ý đổi sang
  `proxy.ts` mà không sweep 5 tài liệu và tạo DEC mới.
- **Đã đổi `vitest.config.ts` → `vitest.config.mts`** có lý do (cảnh báo `configLoader: 'native'`).
  Đừng đổi ngược lại.

**Từ Phase 3 (mới):**

- **Đã triển khai `lib/date.ts` và `lib/currency.ts`** với đủ test — **không viết lại**. Nếu thấy
  chúng "lẽ ra thuộc Phase 5", đọc DEC-032 trước khi động tay.
- ~~**`lib/kpi.ts` vẫn ném lỗi có chủ đích.**~~ — **hết hiệu lực.** ISSUE-008 đã đóng ở Phase 5
  (DEC-038) và `lib/kpi.ts` nay có thân thật. Xem mục "Từ Phase 5" ở trên.
- **Đã kiểm chứng trên trình duyệt thật rằng client KHÔNG được suy ra thông báo từ `mode` của form**
  (DEC-034). `revalidatePath` làm trang form render lại ở chế độ SỬA ngay sau khi TẠO thành công.
  Đừng "đơn giản hoá" bằng cách bỏ `data.notice` — lỗi sẽ quay lại y nguyên.
- **`useReportDraft` cố ý dùng `useSyncExternalStore`,** không phải `useEffect` + `setState`.
  React Compiler chặn cách viết kia (`react-hooks/set-state-in-effect`). Đừng đổi ngược lại.
- **Đã đo NFR-008 thật: 7 chạm / 1,8 giây.** Đừng đo lại rồi kết luận khác; và **đừng bỏ bớt trường
  bắt buộc** để ép xuống 6 — đó là thay đổi nghiệp vụ, phải chờ OQ-18.
- ~~**Nút "Xuất ảnh" và CTA "Xem báo cáo hôm nay" cố ý `disabled`.**~~ — **hết hiệu lực một nửa.**
  `EXPORT_IMAGE_NOT_READY` **đã xoá ở Phase 6**, nút Xuất ảnh nay chạy thật. Chỉ còn
  `CTA_ROUTES_NOT_READY` (Phase 7) trong `app/(sales)/sales/today/page.tsx`. Không phải bug.

**Từ Phase 5 (mới):**

- **`lib/kpi.ts` ĐÃ CÓ THÂN THẬT** — không còn ném lỗi, không viết lại. Nếu thấy nó "lẽ ra vẫn là
  khung", đọc DEC-038 trước khi động tay.
- **`calculateAchievement()` nhận BA tham số** (`target, actual, metric`). Gọi bằng hai tham số sẽ
  không biên dịch. `metric` chỉ dùng để dựng chuỗi số vượt, **không** tham gia phép tính.
- **`percent = 99.99` cho `display = '100,0%'` nhưng `status = 'NEAR'` là ĐÚNG.** BR-014 làm tròn ở
  hiển thị, BR-023 xét ngưỡng trên số chưa làm tròn — cả hai đang `APPROVED`, đã có test khoá lại.
  **Đừng "sửa"**; muốn đổi phải sửa BR-023 bằng DEC mới.
- **Bảng đơn vị chỉ nằm trong `formatMetricValue()`.** Đừng viết `` `${n} xe` `` ở component nào —
  kể cả thẻ ảnh 9:16 của Phase 6.
- **`CommitmentSummary` cố ý CHỈ CÓ MỘT CỘT** và chỉ còn phục vụ `/sales/today/evening`. Nó **không
  phải** bảng đối chiếu, và **không** được gộp với `AchievementTable`.
- **`getVietnamMonthRange()` VẪN cố ý là khung ném lỗi.** Phase 5 đóng **không** có nghĩa hàm đó đã
  xong — nó phục vụ FR-021/FR-028 nên thuộc Phase 7/9.
- **Đã đo coverage thật lần đầu** — `lib/**` vượt xa ngưỡng 90%. Không cần đo lại ở Phase 6 trừ khi
  thêm module mới vào `lib/`.
- **Script kiểm chứng trình duyệt phải chờ PHẦN TỬ THẬT, không chờ mạng.**
  `waitForLoadState('networkidle')` bắn **trước khi React render xong** — đã gây một vòng chẩn đoán
  sai (27/36 FAIL trong khi code hoàn toàn đúng). Dùng `waitForSelector` cho một phần tử cụ thể.
- **Đừng kiểm chuỗi cấm bằng `page.textContent('body')`** — nó gộp cả RSC flight payload của Next,
  mà payload đó **luôn** chứa `$undefined`. Dùng `page.innerText('body')`.

**Từ Phase 6 (mới):**

- **Satori DỰNG ĐƯỢC bố cục 9:16 — đã chứng minh bằng ảnh thật.** ISSUE-002 đã `CLOSED`. **Đừng
  chuyển sang `html-to-image`** vì "nghe nói Satori hạn chế"; muốn đổi phải có DEC mới và một lý do
  đo được.
- **Ba file font trong `public/fonts/` là ASSET BẮT BUỘC, không phải rác.** Đừng xoá, đừng thay bằng
  `woff2` (Satori không đọc được), đừng thay bằng subset `vietnamese` đơn lẻ (subset đó **không có**
  chữ Latin cơ bản). Cũng đừng chuyển sang tải font qua mạng lúc render.
- **`outputFileTracingIncludes` trong `next.config.ts` KHÔNG được xoá.** Không có nó thì `next build`
  vẫn xanh còn hàm trên Vercel ném `ENOENT` — một lỗi chỉ lộ ra sau khi deploy.
- **Route ảnh là `route.tsx`, không phải `.ts`.** Nó chứa JSX. Đổi đuôi là vỡ build.
- **`getReportForShare()` cố ý KHÔNG nhận `salesId`.** Thêm `.eq('sales_id', …)` "cho chắc" sẽ chặn
  nhầm **Admin** (BR-022). Quyền ở đây là việc của RLS, và có 6 test RLS khoá lại.
- **404 cho "không tồn tại" và "không có quyền" là CỐ Ý giống hệt nhau.** Phân biệt hai ca là biến
  404 thành kênh dò ID. Đừng "cải thiện thông báo lỗi" ở chỗ này.
- **Middleware trả 401/403 JSON cho `/api/*` (DEC-039) — đừng gộp lại thành redirect.** Lý do là
  ISSUE-015, đã đo thật: `fetch()` tự đi theo redirect nên client lưu HTML thành file `.png` hỏng
  **mà không báo lỗi gì**. Cũng đừng bỏ lớp kiểm `content-type` ở `share-image-button.tsx`.
- **`lib/reports/metric-rows.ts` là nguồn DUY NHẤT của "4 chỉ tiêu là gì".** `AchievementTable` và
  thẻ ảnh cùng đọc nó. **Đừng khai báo lại danh sách đó** trong màn hình Admin của Phase 8/9 — import
  vào dùng.
- **`formatCompactVND` chỉ dành cho THẺ ẢNH.** Bảng đối chiếu trên web và mọi màn hình khác dùng
  `formatCurrencyVND` / `formatMetricValue` (số đầy đủ). Đừng "thống nhất" hai bên.
- **Con số cắt chuỗi (104 / 232 ký tự) là ước lượng đã kiểm bằng ảnh thật.** Nếu đổi cỡ chữ hoặc lề
  của thẻ, **phải render lại một tấm ảnh để nhìn** — không có test tự động nào bắt được chữ tràn khung.
- **Khi một phép kiểm bảo mật báo đỏ, đo lại bằng công cụ KHÔNG tự đi theo redirect** (`curl` trần,
  hoặc `maxRedirects: 0`) trước khi kết luận. Đã suýt kết luận sai thành "ảnh phát cho người lạ".

**Từ Phase 4 (mới):**

- **Đã đo thật và đã sửa ISSUE-014.** `revalidatePath` **không** phải nguyên nhân — Next re-render
  route hiện tại sau **mọi** Server Action, dù có revalidate hay không. **Đừng thử lại cách "trả
  `ok: true` rồi client `router.replace`"** cho một route có thể tự `redirect()` sau khi dữ liệu
  đổi; nó đã hỏng thật và cách sửa là DEC-037.
- **`saveEveningReport` cố ý không trả gì khi thành công.** Kiểu trả về chỉ còn nhánh lỗi. Đừng
  "sửa cho đủ bộ" bằng cách thêm lại nhánh `ok: true` — nó không bao giờ tới được client.
- **`DiscardEveningDraft` cố ý không render gì** và cố ý nằm ở `/sales/today` chứ không ở form.
  Đừng gộp ngược vào `EveningReportForm`.
- **`useReportDraft` và `CurrencyField` ĐÃ CHUYỂN CHỖ** (DEC-035). Nếu grep không thấy chúng trong
  `features/report-morning/` thì đó là đúng, không phải file bị mất.
- **Guard quyền của Server Action đã gom về `authorizeSalesWrite()`** (DEC-036). **Đừng viết lại**
  khối `getUser() → getSessionProfile() → is_active → role` trong feature mới.
- **`/sales/today/evening` KHÔNG còn là trang tối thiểu** — nó là FR-013 + FR-014 thật. Ghi chú
  "trang tối thiểu của Phase 3" trong file đó đã bị xoá.
- **Đã có 7 test RLS cho `completeEveningReport`** ở `tests/rls/report-service.rls.test.ts`.
  **Đừng chuyển chúng sang `tests/integration/`** — role `postgres` ở đó có `rolbypassrls` nên
  chúng sẽ "xanh" kể cả khi policy sai hoàn toàn. Có một bài trong đó cố ý ghi lại sự thật rằng
  **RLS KHÔNG chặn việc hoàn tất báo cáo ngày cũ** — thứ chặn là Server Action.
- **Khi cần kiểm chứng trình duyệt với Supabase local, dùng `.env.production.local` tạm** (ưu tiên
  cao hơn `.env.local` trong thứ tự nạp của Next ở chế độ production) rồi xoá. **Không sửa
  `.env.local` của người dùng** — đó là cách ISSUE-011 đã xảy ra.
- **`next start` không phải lúc nào cũng chết theo lệnh dừng.** Trước khi chạy lại, kiểm
  `Get-NetTCPConnection -LocalPort <port> -State Listen` rồi `Stop-Process -Force` theo PID thật.
  Một server cũ giữ port và phục vụ build đã bị ghi đè đã gây một vòng chẩn đoán sai.

---

## OPEN QUESTIONS — ✅ ĐÃ ĐÓNG ĐỦ **18/18**

**KHÔNG CÒN CÂU HỎI NGHIỆP VỤ NÀO ĐANG CHỜ.** Người dùng đã trả lời **17/17** ngày `2026-08-07` và
**OQ-18** ngày `2026-08-10`. Danh sách đầy đủ kèm câu trả lời chính thức:
`docs/01-business-analysis.md § OPEN QUESTIONS`.

> ✅ **OQ-18 ĐÃ ĐƯỢC TRẢ LỜI ngày 2026-08-10 — phương án (a):** NFR-008 nới thành **≤ 8 lần chạm**,
> **giữ nguyên 5 trường bắt buộc** của FR-008 — **DEC-043**. Con số đo được **7 chạm / 1,8 giây** nay
> **ĐẠT cả hai vế**; ISSUE-013 → **CLOSED**; Phase 3 đóng ở **14/14**. **Không sửa một dòng code nào.**

| ID | Câu trả lời chính thức |
|---|---|
| OQ-01 / OQ-02 | Viếng thăm giữ **cả hai**: cột số bắt buộc + cột text tuỳ chọn |
| OQ-03 | Doanh số = **số lượng xe** (integer). Doanh thu = **tiền VND** (bigint) |
| OQ-04 | **KHÔNG** sửa sau khi `COMPLETED` — khoá vĩnh viễn |
| OQ-05 | Admin **KHÔNG** sửa báo cáo của Sales |
| OQ-06 | Admin tạo tài khoản; Sales **không** tự đăng ký |
| OQ-07 | Tuyến nhập tự do + gợi ý 5 tuyến gần nhất |
| OQ-08 | **KHÔNG** có khái niệm ngày nghỉ ở v1 |
| OQ-09 | KPI do **Sales tự cam kết buổi sáng**; không có bảng `targets` |
| OQ-10 | **KHÔNG** SKU / model xe / đại lý / đơn hàng |
| OQ-11 | `target=0 & actual=0` → `100,0%`; `actual>0` → `percent = null` + số vượt tuyệt đối |
| OQ-12 | Chỉ đúng **ngày hôm nay** giờ VN; không nhập bù |
| OQ-13 | **KHÔNG** xoá báo cáo — kể cả soft delete |
| OQ-14 | Doanh thu = **giá trị đơn hàng chốt trong ngày** |
| OQ-15 | **Chưa** chia team / khu vực ở v1 |
| OQ-16 | **Chỉ 2 role**: `ADMIN`, `SALES` |
| OQ-17 | "Ngày đạt KPI" = đạt **cả 4** chỉ tiêu ≥ 100% |

**Ba điểm kỹ thuật còn treo (không chặn tiến độ, phải chốt đúng lúc):**

1. ~~**ISSUE-008 — đầu Phase 5**~~ — ✅ **ĐÃ ĐÓNG 2026-08-07** bằng **DEC-038**: `percent = null`
   đúng cho **cả hai** ca, phân biệt bằng `status`.
2. ~~**DEC-025 — đầu Phase 5**~~ — ✅ **ĐÃ ĐÓNG 2026-08-07** bằng **DEC-038**:
   `calculateAchievement(target, actual, metric)` trả cả `display` đã format lẫn `surplus` thô.
3. ~~**Buộc đổi mật khẩu lần đầu — trước Phase 10**~~ — ✅ **ĐÃ ĐÓNG 2026-08-10** bằng **DEC-041**:
   **v1 KHÔNG ép đổi mật khẩu lần đầu.** Cả hai phương án của `docs/06 §3.3` ghi chú 6 đều bị loại —
   cờ trong `user_metadata` không phải hàng rào thật (client sửa được), còn thêm cột vào `profiles`
   thì cần migration mới cộng sửa trigger. Schema **cố ý không có** cột nào cho việc này, và đó là
   trạng thái đúng. Đã ghi điều kiện kích hoạt cho v2 vào `docs/10-future-roadmap.md`.
4. **AF-12 (audit log) chưa cần** vì không ai được sửa sau khi hoàn tất. Nếu sau này mở quyền sửa,
   **phải làm audit log trước**, và phải tạo `DEC` mới thay vì sửa DEC-026.
