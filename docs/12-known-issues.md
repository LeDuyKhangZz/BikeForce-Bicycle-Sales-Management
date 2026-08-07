# 12 — Known Issues

> Status: ACTIVE | Phase: 0 | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

---

## 0. ĐỌC TRƯỚC — Đây là RỦI RO, không phải BUG đã quan sát

Tính đến `2026-08-07`, repository **chưa có bất kỳ dòng code nào**: chỉ có `BIKEFORCE_MASTER_SPEC.md`, `PROMPT_FIRST_SESSION.md`, `PROMPT_NEXT_SESSION.md` và thư mục `docs/`. Chưa có `package.json`, chưa có migration, chưa khởi tạo git repository (sẽ khởi tạo ở Phase 1 theo DEC-027).

Hệ quả bắt buộc phải nói thẳng:

- **Không có bug nào được tái hiện**, vì không có gì để chạy.
- Toàn bộ `ISSUE-001` … `ISSUE-007` dưới đây là **rủi ro đã nhận diện ở Phase 0** — những chỗ đã biết trước là sẽ vỡ hoặc sẽ chặn tiến độ nếu không xử lý.
- Trường **Actual** và **Root Cause** của hầu hết các mục ghi đúng sự thật là *chưa quan sát được*, kèm **giả thuyết** rõ ràng là giả thuyết. Không mục nào bịa ra bước tái hiện, log lỗi, hay stack trace.
- Trường **Verification** mô tả **cách sẽ kiểm chứng**, chưa mục nào được kiểm chứng. **Không mục nào được ghi là PASS.**

Khi Phase 1 trở đi phát sinh bug thật, bug đó được thêm vào đây theo đúng cùng một format (xem §5 "Cách thêm issue mới") — không tách file khác, không viết vào chỗ khác.

---

## 1. Severity legend

| Severity | Nghĩa | Ứng xử |
|---|---|---|
| **P1** | **Chặn tiến độ** hoặc **gây mất / lộ dữ liệu**. Không thể đi tiếp phase sau, hoặc dữ liệu người dùng bị sai/mất/rò rỉ. | Dừng việc đang làm, xử lý trước. Không được đóng phase khi còn P1 OPEN. |
| **P2** | **Ảnh hưởng chức năng chính, nhưng có workaround**. Người dùng vẫn hoàn thành được việc bằng đường khác, hoặc có phương án dự phòng đã ghi nhận. | Phải có mitigation ghi rõ trong `Fix:` trước khi phase liên quan được coi là DONE. |
| **P3** | **Nhỏ, hoặc chỉ là nợ kỹ thuật** — chưa ảnh hưởng người dùng ngay, nhưng sẽ đắt dần nếu để lâu. | Ghi nhận, gắn với điều kiện kích hoạt cụ thể. Không được im lặng bỏ qua. |

Quy tắc phân loại khi phân vân: nếu có khả năng **người dùng thấy số liệu sai mà không biết là sai** → P1, không phải P2. Sai thầm lặng luôn nặng hơn lỗi ồn ào.

---

## 2. Status legend

| Status | Nghĩa | Điều kiện chuyển tiếp |
|---|---|---|
| **OPEN** | Đã ghi nhận, chưa ai bắt tay xử lý. | Có người nhận + xác định được cách xử lý → `FIXING`. |
| **FIXING** | Đang sửa / đang thực hiện mitigation. | Code hoặc quyết định đã hoàn tất, chờ kiểm chứng → `VERIFY`. |
| **VERIFY** | Đã sửa, **đang chờ kiểm chứng**. Chưa được coi là xong. | Kiểm chứng đạt → `CLOSED`. Kiểm chứng không đạt → quay lại `FIXING`. |
| **CLOSED** | Đã sửa **và** đã kiểm chứng, trường `Verification:` đã điền bằng chứng cụ thể. | Nếu tái phát: **không tạo ID mới**, chuyển lại `FIXING` và ghi thêm dòng lịch sử vào chính entry đó. |

```mermaid
stateDiagram-v2
    [*] --> OPEN : phát hiện rủi ro hoặc bug
    OPEN --> FIXING : có người nhận + có hướng xử lý
    FIXING --> VERIFY : đã sửa xong, chờ kiểm chứng
    VERIFY --> CLOSED : kiểm chứng đạt, điền Verification
    VERIFY --> FIXING : kiểm chứng không đạt
    CLOSED --> FIXING : tái phát, dùng lại đúng ID cũ
```

---

## 3. STANDING RULE — Không bao giờ xoá issue

Nguyên văn quy tắc từ **Master Spec §56**: *"Không xóa issue sau khi fix."*

Diễn giải bắt buộc tuân thủ:

1. **Một issue đã được tạo thì tồn tại vĩnh viễn trong file này.** Kể cả khi đã sửa xong, kể cả khi hoá ra là báo động giả, kể cả khi phạm vi v1 thay đổi làm nó không còn liên quan.
2. Sau khi fix, **chỉ đổi `Status:` sang `CLOSED` và điền `Verification:`** bằng bằng chứng cụ thể (tên test, lệnh đã chạy, kết quả đo, ngày kiểm chứng, người kiểm chứng). Không xoá dòng, không rút gọn, không gộp entry.
3. **ID không bao giờ được tái sử dụng.** `ISSUE-004` đã đóng thì số 004 chết theo nó; issue tiếp theo lấy số kế tiếp của số lớn nhất từng dùng.
4. Nếu một issue **hoá ra không phải vấn đề**, vẫn giữ entry, đặt `Status: CLOSED` và ghi trong `Root Cause:` rằng đây là báo động giả cùng lý do — để session sau không mất công điều tra lại đúng con đường đó.
5. Lý do của quy tắc này: file `docs/12-known-issues.md` là **bộ nhớ dài hạn** của dự án về những chỗ đã từng vỡ. Xoá một entry đã fix là xoá đúng phần thông tin có giá trị nhất — cảnh báo cho lần tới.

---

## 4. Index

| ID | Severity | Status | Chủ đề ngắn gọn | Phase liên quan | ID liên quan |
|---|---|---|---|---|---|
| ISSUE-001 | **P1** | **CLOSED** | OPEN QUESTION mức BLOCKING chưa được trả lời → không viết được migration. **Đã giải quyết 2026-08-07: người dùng trả lời đủ 17/17** | Phase 0 → Phase 2 | OQ-01…OQ-17, DEC-025, DEC-026, DEC-029, DEC-030 |
| ISSUE-002 | P2 | OPEN | Satori (`next/og`) chỉ hỗ trợ tập con CSS + cần font có dấu tiếng Việt | Phase 6 | DEC-010, FR-018, UC-08 |
| ISSUE-003 | P2 | OPEN | Zalo in-app webview chưa được kiểm chứng trên thiết bị thật | Phase 6, Phase 11 | NFR-009, DEC-011, FR-020 |
| ISSUE-004 | P2 | **CLOSED** | TypeScript 7.0.2 + ESLint 10.8.0 là bản major mới, chưa xác nhận tương thích Next 16. **Đã xảy ra thật 2026-08-07: cả hai đều vỡ; pin `typescript@6.0.3` + `eslint@9.39.5`** | Phase 1 | DEC-002, NFR-012 |
| ISSUE-005 | P3 | OPEN | `is_admin()` phát sinh thêm một truy vấn `profiles` mỗi câu lệnh RLS | Phase 2, Phase 11 | DEC-006, NFR-002, NFR-015 |
| ISSUE-006 | P3 | **CLOSED** | Chưa có khái niệm ngày nghỉ → cảnh báo "chưa báo cáo" có thể tính cả người nghỉ. **Chủ nghiệp vụ xác nhận 2026-08-07: không xử lý gì thêm ở v1** | Phase 8 | OQ-08, AF-02, AF-15, FR-033, UC-20 |
| ISSUE-007 | P3 | OPEN | Chưa có audit log; là điều kiện tiên quyết nếu cho phép sửa sau khi `COMPLETED` | Phase 4+ (điều kiện) | OQ-04, OQ-05, BR-019, BR-020, AF-12 |
| ISSUE-008 | P3 | **CLOSED** | `docs/01` mâu thuẫn nội bộ về khi nào `AchievementResult.percent = null` — đã chốt cách đọc ở **DEC-038** (2026-08-07) | Phase 5 | BR-015, DEC-025, DEC-038, OQ-11 |
| ISSUE-009 | P3 | OPEN | Next.js 16.3 **deprecate** quy ước file `middleware.ts`, khuyến nghị đổi tên thành `proxy.ts` | Phase 2 → khi nâng Next major | DEC-004, FR-002, FR-004 |
| ISSUE-010 | P3 | OPEN | Máy phát triển chạy **nhiều stack Supabase local cùng lúc** → chọn nhầm container/port là chuyện đã xảy ra thật | Phase 2, Phase 11 | DEC-022, DEC-031 |
| ISSUE-011 | **P1** | OPEN | **Service role key đã lọt vào transcript hội thoại** khi IDE tự đồng bộ `.env.local`. Phải **rotate** | Phase 2 | NFR-005, DEC-005, DEC-031 |
| ISSUE-012 | P3 | OPEN | Sau `supabase db reset`, GoTrue + Kong không tự phục hồi → mọi lần đăng nhập nhận `502` cho tới khi restart hai container | Phase 3 → mọi phase sau | ISSUE-010, DEC-022 |
| ISSUE-013 | P3 | OPEN | **NFR-008 mâu thuẫn với FR-008**: form sáng có 5 trường bắt buộc nên sàn lý thuyết là 7 lần chạm, không thể ≤ 6. Đo thật: **7 chạm / 1,8 giây**. **Cần người dùng quyết định (OQ-18)** | Phase 3 | NFR-008, FR-008, UC-04, OQ-18 |
| ISSUE-014 | P2 | **CLOSED** | Lưu báo cáo cuối ngày thành công nhưng **mất banner xác nhận** và **draft không bị xoá** — re-render RSC của route hiện tại sau Server Action làm form unmount trước khi effect chạy. Đã sửa bằng DEC-037 | Phase 4 | FR-015, FR-035, DEC-034, DEC-037 |

Tổng: **10 OPEN** (1 × P1, 2 × P2, 7 × P3), **0 FIXING**, **0 VERIFY**, **3 CLOSED** (ISSUE-001, ISSUE-004, ISSUE-006).

---

## 5. Danh sách issue

### ISSUE-001

**Severity: P1**
**Status: CLOSED** — đóng ngày `2026-08-07`, xem mục Verification

**Module:**
Bàn giao Phase 0 → Phase 2. Ảnh hưởng trực tiếp: `supabase/migrations/0001_init_enums_profiles.sql`, `0002_daily_reports.sql`, `0003_functions_triggers.sql`, `0004_rls_policies.sql` (đều **đề xuất, chưa triển khai**), `docs/01-business-analysis.md`, `docs/02-database-design.md`, `docs/06-auth-permissions.md`, `docs/11-decisions.md`.

**Description:**
Các OPEN QUESTION được đánh dấu **BLOCKING** trong `docs/01-business-analysis.md §OPEN QUESTIONS` chưa có câu trả lời chính thức từ phía nghiệp vụ. Chừng nào chúng còn mở, schema không thể chốt và **không được viết migration Phase 2**, vì mỗi câu trả lời khác đi sẽ kéo theo thay đổi cột, CHECK constraint, hoặc RLS policy — tức là phải viết migration sửa chữa ngay sau khi vừa tạo.

Các câu được đánh dấu BLOCKING và thứ chúng chặn:

| OQ | Chặn cái gì cụ thể |
|---|---|
| OQ-01 | Có tồn tại cột `target_visit_points` (integer) và/hoặc `visit_purpose` (text) hay không → quyết định dòng "Viếng thăm" trong bảng đối chiếu có tính được % hay không |
| OQ-02 | Có tồn tại `actual_visit_points` và/hoặc `actual_route` hay không → mẫu số/tử số của cùng dòng đó |
| OQ-03 | Xác nhận đơn vị: doanh số = số lượng xe (integer), doanh thu = VND (bigint) → kiểu dữ liệu, CHECK range, nhãn UI |
| OQ-04 | RLS `reports_update_own_open`, `public.guard_report_transition()`, BR-019 → có khoá báo cáo khi `COMPLETED` hay không |
| OQ-05 | Có cấp UPDATE policy cho Admin trên cột số liệu hay không, BR-020 → và kéo theo ISSUE-007 |
| OQ-08 | Có bảng/cột ngày nghỉ hay không → logic "chưa báo cáo" (AF-02), kéo theo ISSUE-006 |
| OQ-09 | Sales tự cam kết hay Admin giao chỉ tiêu → nếu Admin giao thì cần bảng `targets` riêng và đổi cả workflow (AF-11) |
| OQ-11 | Hành vi khi `target = 0`, BR-015 → `lib/kpi.ts` `calculateAchievement()` và mọi chỗ hiển thị `%` |
| OQ-12 | RLS INSERT `reports_insert_own_today`, CHECK `ck_report_not_future`, BR-021 → có cho nhập bù ngày cũ hay không |
| OQ-13 | Có cột `deleted_at` hay không, BR-013 → nếu có thì **mọi** truy vấn phải thêm điều kiện lọc |

- *Ghi chú về số đếm (không phải một issue riêng, không cấp ID mới):* bảng OQ trong `docs/01-business-analysis.md` đánh dấu **10** mục là BLOCKING, trong đó **OQ-03** ghi là `BLOCKING (xác nhận)` — tức là câu xác nhận lại điều đã hiểu, không phải câu quyết định mới. Các tài liệu Phase 0 khác nói "9 câu BLOCKING" theo cách đếm loại trừ OQ-03. Cần thống nhất một con số duy nhất khi cập nhật `docs/01` sau khi người dùng trả lời; trước mắt **coi cả 10 câu là phải trả lời**, cách đếm an toàn hơn.

**Expected:**
Trước khi Phase 2 bắt đầu:
1. Mọi OQ BLOCKING có câu trả lời chính thức, ghi kèm ngày và người quyết định.
2. `DEC-025` (BR-015 / OQ-11) và `DEC-026` (BR-013/BR-019/BR-020/BR-021 ↔ OQ-04/OQ-05/OQ-12/OQ-13) chuyển từ `PROPOSED` → `APPROVED` hoặc bị thay bằng quyết định khác trong `docs/11-decisions.md`.
3. `BR-013`, `BR-015`, `BR-019`, `BR-020`, `BR-021` trong `docs/01-business-analysis.md` chuyển từ `PROPOSED` → `APPROVED`.
4. `docs/02-database-design.md` và `docs/06-auth-permissions.md` được đồng bộ theo câu trả lời.
5. Chỉ khi đó mới viết file migration đầu tiên.

**Actual:**
*(Trạng thái tại thời điểm phát hiện, giữ nguyên để có vết)* — khi issue được mở, **chưa có câu trả lời nào** cho các OQ BLOCKING; `DEC-025`, `DEC-026` ở `PROPOSED`; `BR-013/015/019/020/021` ở `PROPOSED`; chưa có migration nào trong repository.

**Cập nhật `2026-08-07`:** người dùng đã trả lời **đủ 17/17 OPEN QUESTION** trong cùng ngày. Toàn bộ nguyên nhân gây chặn đã được gỡ. Vẫn chưa có migration nào tồn tại trong repository, nhưng lý do bây giờ là **chưa tới Phase 2**, không còn là **bị chặn nghiệp vụ**.

**Root Cause:**
Không phải lỗi kỹ thuật. Master Spec cố ý để mở một số quyết định nghiệp vụ và đánh dấu chúng là cần xác nhận — §31 `REPORT LOCKING — CẦN XÁC NHẬN`, §32 `DELETE REPORT — CẦN XÁC NHẬN`, §40 `CÂU HỎI BUSINESS CẦN XÁC NHẬN`. Phase 0 đã làm đúng việc của mình là biến chúng thành danh sách `OQ-xx` có đề xuất mặc định và phân tích ảnh hưởng, nhưng **quyền trả lời thuộc về chủ nghiệp vụ**, không thuộc về người/agent viết tài liệu. Tự trả lời thay sẽ tạo ra schema sai một cách im lặng.

**Fix:**
1. Trình danh sách OQ BLOCKING cho người dùng, mỗi câu kèm đề xuất mặc định đã có sẵn để người dùng chỉ cần xác nhận hoặc bác bỏ — giảm chi phí trả lời.
2. Ghi câu trả lời vào `docs/01-business-analysis.md §OPEN QUESTIONS` dưới dạng `Answer:` + ngày, **không xoá câu hỏi gốc**.
3. Cập nhật `docs/11-decisions.md`: DEC-025, DEC-026 → `APPROVED` (hoặc thay bằng DEC mới nếu người dùng chọn khác đề xuất).
4. Đồng bộ `docs/01`, `docs/02`, `docs/03`, `docs/06` theo Documentation Update Matrix (Master Spec §62).
5. Sau đó mới chạy Phase 1 rồi Phase 2.
- **Không dùng workaround "cứ viết migration theo đề xuất mặc định rồi sửa sau".** Với `OQ-09` (Admin giao KPI) và `OQ-13` (soft delete), sửa sau nghĩa là viết lại phần lớn schema và toàn bộ query — chi phí không tuyến tính.

**Verification:**
Checklist đóng issue — **cả 6 mục đã đạt ngày `2026-08-07`**:
- [x] Mọi OQ trong `docs/01-business-analysis.md §OPEN QUESTIONS` có cột **CÂU TRẢ LỜI CHÍNH THỨC** kèm ngày; câu hỏi gốc được giữ nguyên, không xoá.
- [x] `DEC-025`, `DEC-026` (và cả `DEC-029`, `DEC-030`) trong `docs/11-decisions.md` chuyển sang `Status: APPROVED`. Bảng tra nhanh: **30/30 APPROVED, 0 PROPOSED**.
- [x] `BR-013`, `BR-015`, `BR-019`, `BR-020`, `BR-021`, `BR-024` không còn `PROPOSED` trong `docs/01` — đều `APPROVED`.
- [x] `docs/02-database-design.md`: bảng "BR enforce ở đâu" đã chuyển toàn bộ sang `APPROVED`; các chú thích `(OQ-xx)` trên cột được giữ lại **có chủ ý** để ghi vết nguồn gốc quyết định, không phải dấu hiệu còn treo.
- [x] `docs/06-auth-permissions.md`: ma trận quyền không còn dòng `PROPOSED`; mục OQ đánh dấu ✅ ĐÃ TRẢ LỜI.
- [x] `PROJECT_CHECKLIST.md`: mục "Toàn bộ 17 OPEN QUESTION đã được người dùng trả lời" đã `[x]`.

**Người xác nhận:** chủ nghiệp vụ (người dùng), qua trao đổi trực tiếp ngày `2026-08-07`.
**Ghi chú theo Master Spec §56:** issue này **không bị xoá** sau khi fix — giữ lại toàn bộ nội dung gốc làm lịch sử.

---

### ISSUE-002

**Severity: P2**
**Status: OPEN**

**Module:**
`app/api/reports/[id]/share-image/route.ts` và `features/report-share/DailyReportShareCard.tsx` — **cả hai đều là đề xuất, chưa triển khai**. Liên quan: DEC-010, DEC-021, FR-017, FR-018, FR-019, BR-002, UC-08, Phase 6.

**Description:**
Quyết định DEC-010 chọn sinh ảnh 9:16 **server-side** bằng `ImageResponse` (`next/og`, dựa trên Satori). Satori **không phải trình duyệt**: nó chỉ hỗ trợ một tập con CSS. Ràng buộc đã biết trước:

- Chỉ **flexbox**, **không có CSS grid**. Mọi phần tử có nhiều hơn một con phải khai báo `display: flex` tường minh.
- Không hỗ trợ đầy đủ các thuộc tính layout nâng cao; `-webkit-line-clamp` để cắt ghi chú cuối ngày phải được thay bằng cách cắt tương đương (cắt chuỗi ở tầng dữ liệu, hoặc giới hạn chiều cao + `overflow: hidden`).
- **Font phải được nhúng thủ công**: đọc file `.ttf`/`.woff` bằng `fs` ở Node runtime và truyền vào `ImageResponse`. Font đó **bắt buộc phải có bộ dấu tiếng Việt** (subset `latin` + `vietnamese`) — nếu không, `ừ ẫ ợ ỹ đ` sẽ mất dấu hoặc rơi về glyph rỗng, và lỗi này chỉ lộ ra ở ảnh cuối cùng gửi cho khách.
- Tailwind CSS v4 phát sinh màu ở dạng `oklch()`. Thẻ share **không được** phụ thuộc vào token Tailwind mà phải dùng bảng hex tối cố định đã đo trong `docs/05-ui-ux-design.md` (`#0B1220`, `#FFFFFF`, `#CBD5E1`, `#94A3B8`, `#FBBF24`, `#4ADE80`, `#F87171`, `#60A5FA`).

Rủi ro cụ thể: layout thẻ 9:16 thiết kế ở `docs/05` có thể **không dựng được nguyên vẹn** bằng Satori và phải làm lại giữa Phase 6.

**Expected:**
`GET /api/reports/[id]/share-image` trả về PNG **đúng 1080×1920**, đúng layout dark đã thiết kế (brand + "DAILY SALES REPORT", ngày, tên NV + mã NV, tuyến, bảng 4 dòng Cam kết/Thực đạt/%, dải KPI tổng quan, ghi chú cuối ngày, footer), đủ dấu tiếng Việt, kèm `Content-Disposition: attachment; filename="BikeForce_Report_<Ho-Ten>_<YYYY-MM-DD>.png"` (FR-019) và `Cache-Control: private, no-store`.

**Actual:**
**Chưa quan sát được — đây là rủi ro đã nhận diện ở Phase 0, chưa có code để tái hiện.** Chưa có route handler, chưa có component thẻ, chưa có file font trong repository.

**Root Cause:**
**Chưa xác định được**, vì chưa dựng prototype. Giả thuyết (ghi rõ là giả thuyết): khoảng cách giữa CSS mà thiết kế UI dùng tự nhiên (grid, `line-clamp`, biến màu `oklch` của Tailwind v4) và tập con CSS mà Satori thực sự dựng được. Chỉ prototype mới trả lời được khoảng cách đó rộng đến đâu.

**Fix:**
1. **Việc đầu tiên của Phase 6** là dựng prototype thẻ 9:16 với dữ liệu giả, trước khi nối vào dữ liệu thật. Nếu Satori không dựng nổi, biết ngay từ ngày đầu chứ không phải cuối phase.
2. Viết thẻ theo kỷ luật Satori ngay từ đầu: `display: flex` ở mọi container, không grid, không `oklch`, chỉ hex thuần, không `line-clamp` — cắt ghi chú ở tầng dữ liệu trước khi render.
3. Commit file font Inter (hoặc Be Vietnam Pro) subset `latin+vietnamese` vào repository, đọc bằng `fs` ở Node runtime. Không tải font qua mạng lúc render.
4. **Fallback đã ghi nhận trong DEC-010**: nếu Phase 6 chứng minh Satori không dựng nổi layout cần thiết → chuyển sang `html-to-image` client-side với `next/dynamic({ ssr: false })`, chờ `document.fonts.ready` trước khi chụp, và dùng đúng bảng hex thuần đó cho thẻ share. Việc chuyển này phải **ghi thành một DEC mới** trong `docs/11-decisions.md`, không sửa lén DEC-010.
5. Nếu phải dùng fallback, lưu ý kéo theo: thư viện sinh ảnh không được nằm trong initial bundle (NFR-003) và ISSUE-003 trở nên nặng hơn vì việc chụp DOM chạy ngay trong webview Zalo.

**Verification:**
Kế hoạch kiểm chứng (**chưa chạy**):
- Snapshot 6 edge case bắt buộc: tên 40+ ký tự, tuyến 300 ký tự, ghi chú 1000 ký tự, doanh thu 12 chữ số, achievement 4 chữ số (`1250,0%`), `—` khi `target = 0` (BR-015).
- Kiểm tra thủ công dấu tiếng Việt trên ảnh xuất ra: `ừ ẫ ợ ỹ đ` hiển thị đúng, không rơi font.
- Kiểm tra kích thước file PNG đúng `1080×1920`.
- Kiểm tra header `Content-Disposition` sinh đúng tên file theo FR-019.
- Kiểm tra BR-002: gọi route với report `status = 'MORNING_SUBMITTED'` → bị từ chối.
- Kiểm tra bảo mật: salesA gọi `GET /api/reports/<id-của-salesB>/share-image` → 403/404 (thuộc bộ test E2E security ở `docs/08-testing-strategy.md`).

---

### ISSUE-003

**Severity: P2**
**Status: OPEN**

**Module:**
Luồng chia sẻ ảnh phía client trong `features/report-share/` (**đề xuất, chưa triển khai**). Liên quan: FR-020, NFR-009, DEC-011, UC-08, Playwright project `zalo-like`, Phase 6 và Phase 11.

**Description:**
Kênh phân phối thật của sản phẩm là **Zalo**, và người dùng Sales rất có khả năng mở BikeForce **ngay trong Zalo in-app webview** (bấm link trong khung chat). Ba hành vi then chốt chưa được kiểm chứng trên môi trường đó:

1. `navigator.canShare({ files })` / `navigator.share({ files })` — Web Share API level 2 với file đính kèm (DEC-011, FR-020).
2. Fallback `<a download>` — webview nhúng có thể chặn hoặc âm thầm không làm gì với thuộc tính `download`.
3. Cookie session `httpOnly` do `@supabase/ssr` đặt — hành vi lưu/gửi cookie trong webview nhúng có thể khác trình duyệt thường (đặc biệt khi webview bị reset giữa các lần mở).

NFR-009 nêu rõ Zalo in-app browser nằm trong ma trận tương thích bắt buộc, nên đây không phải "nice to have".

**Expected:**
Sales mở báo cáo `COMPLETED` trong Zalo webview → bấm "Xuất ảnh" → hoặc mở được share sheet có Zalo (đường đi lý tưởng), **hoặc** tải được file PNG về máy với thông báo rõ ràng. Không có trường hợp bấm nút mà **không có gì xảy ra** — đó là trạng thái tệ nhất vì người dùng không biết mình cần làm gì tiếp.

**Actual:**
**Chưa quan sát được — đây là rủi ro đã nhận diện ở Phase 0, chưa có code để tái hiện.** Chưa có app để mở trong Zalo, chưa có thiết bị nào được test.

**Root Cause:**
**Chưa xác định được.** Giả thuyết (ghi rõ là giả thuyết): các webview nhúng thường giới hạn Web Share API — hoặc không expose `navigator.share`, hoặc expose nhưng `canShare({files})` trả `false`, hoặc chấp nhận share text/URL nhưng không chấp nhận file. Thuộc tính `download` trên thẻ `<a>` cũng là chỗ hay bị webview bỏ qua. Chỉ thiết bị thật mới trả lời được.

**Fix:**
1. **Feature detection trước, không giả định**: chỉ hiển thị nút "Chia sẻ" khi `navigator.canShare?.({ files: [file] })` trả `true`; ngược lại hiển thị thẳng nút "Tải ảnh".
2. Chuẩn bị **đường thoát cuối cùng**: nếu cả share lẫn download đều không hoạt động, mở PNG trong tab mới kèm hướng dẫn hiển thị trên màn hình ("Nhấn giữ vào ảnh để lưu về máy"). Đây là hành vi người dùng Việt Nam đã quen, và nó không phụ thuộc API nào.
3. **Test tay trên thiết bị thật ở Phase 6**: tối thiểu 1 Android và 1 iOS, mở link qua chat Zalo thật.
4. Ghi nhận thẳng thắn: Playwright project `zalo-like` **chỉ giả lập userAgent của webview**, nó **không** tái hiện được giới hạn API thật của webview Zalo. Nó có giá trị để bắt lỗi layout, **không** thay thế được test thiết bị thật cho luồng chia sẻ. Không được coi `zalo-like` xanh là bằng chứng ISSUE-003 đã đóng.

**Verification:**
Ma trận test tay phải điền đầy đủ ở Phase 6 (**chưa thực hiện**, bảng dưới là khuôn mẫu, chưa có dữ liệu):

| Thiết bị / OS | Phiên bản Zalo | `canShare({files})` | `navigator.share()` | `<a download>` | Đường thoát "nhấn giữ" | Ngày test |
|---|---|---|---|---|---|---|
| Android (chờ điền) | — | — | — | — | — | — |
| iOS (chờ điền) | — | — | — | — | — | — |

Bổ sung: kiểm tra session còn sống sau khi đóng/mở lại webview; kiểm tra `/login` hoạt động trong webview. Đóng issue khi cả hai dòng ma trận có kết quả thật và có ít nhất một đường đi thành công trên mỗi nền tảng.

---

### ISSUE-004

**Severity: P2**
**Status: CLOSED (2026-08-07, Phase 1)**

**Module:**
Toolchain / `package.json` (**chưa tồn tại**), cấu hình ESLint và TypeScript. Liên quan: DEC-001, DEC-002, NFR-012, Phase 1.

**Description:**
Các phiên bản đã kiểm tra là **latest stable trên npm ngày 2026-08-07**: `next@16.3.0`, `react@19.2.8`, `typescript@7.0.2`, `eslint@10.8.0`, `tailwindcss@4.3.3`. Trong đó **TypeScript 7** và **ESLint 10** đều là bước nhảy major. Rủi ro: `eslint-config-next` của Next 16, plugin `@typescript-eslint`, và trình biên dịch TypeScript 7 có thể chưa khớp peer dependency với nhau, làm `next lint` hoặc `tsc --noEmit` không chạy được — trong khi NFR-012 yêu cầu **TypeScript strict** và **cấm `any` bằng lint** ngay từ đầu.

Nếu phát hiện muộn (sau khi đã viết nhiều feature), chi phí lùi phiên bản cao hơn nhiều so với phát hiện ở ngày đầu Phase 1.

**Expected:**
Ngay sau `create-next-app`, cả ba lệnh nền tảng đều chạy được trên dự án rỗng: build, typecheck (`tsc --noEmit` với `strict: true`), và lint (với rule cấm `any`). Sau đó mới pin phiên bản chính xác vào `package.json`.

**Actual:**
**Chưa quan sát được — đây là rủi ro đã nhận diện ở Phase 0, chưa có code để tái hiện.** Chưa có `package.json`, chưa cài dependency nào, chưa chạy lệnh nào. **Không có kết quả build/typecheck/lint nào tồn tại — không được ghi là PASS ở bất kỳ đâu.**

**Root Cause:**
**Chưa xác định được.** Giả thuyết (ghi rõ là giả thuyết): peer dependency range của `eslint-config-next` / `@typescript-eslint` chưa mở cho `eslint@10` hoặc `typescript@7`, hoặc TypeScript 7 thay đổi hành vi/loại bỏ tuỳ chọn `tsconfig` mà preset của Next đang dùng. Không thể xác nhận nếu chưa cài thật.

**Fix:**
1. **Smoke test là việc đầu tiên của Phase 1**, trước khi viết bất kỳ dòng code feature nào: `create-next-app` → chạy build, typecheck, lint trên dự án rỗng.
2. Nếu vỡ: lùi về **TypeScript 5.x LTS** (và/hoặc ESLint 9) theo đúng phương án dự phòng đã ghi trong **DEC-002**.
3. **Ghi kết quả smoke test vào `docs/11-decisions.md` như phần bổ sung của DEC-002** (phiên bản nào được pin, vì sao), và vào `WORKLOG.md` của ngày làm Phase 1.
4. Chỉ pin phiên bản chính xác **sau** khi smoke test xong. Trước đó, tài liệu chỉ được nói "verified latest stable on 2026-08-07", không được nói "đã dùng".
5. Không tự ý nới lỏng `strict` hoặc tắt rule cấm `any` để cho lint chạy được — đó là đánh đổi sai, vi phạm NFR-012. Nếu buộc phải chọn, lùi phiên bản chứ không hạ tiêu chuẩn.

**Verification:**
✅ **ĐÃ KIỂM CHỨNG BẰNG LỆNH THẬT — 2026-08-07, Phase 1.** Rủi ro này **đã xảy ra thật**, ở **cả hai** package nghi ngờ.

Nội dung gốc của issue ở trên được **giữ nguyên không sửa** theo STANDING RULE §3. Kết quả thật:

1. **Giả thuyết ở § Root Cause là ĐÚNG cả hai vế.** Không phải lỗi cấu hình, mà là peer dependency chặn cứng ở thượng nguồn:
   - `typescript-eslint@8.66.0` peer `typescript: ">=4.8.4 <6.1.0"` → **TS 7.0.2 bị từ chối** ngay lúc load module (`typescript-eslint does not support TS 7.0`, exit 2).
   - `eslint-plugin-react@7.37.5` peer `eslint: "... || ^9.7"` → **ESLint 10.8.0 làm vỡ rule loader** (`contextOrFilename.getFilename is not a function`, exit 2). `7.37.5` là bản **mới nhất tồn tại**, nên không override nào cứu được.
2. **Phát hiện ngoài dự kiến:** `create-next-app@16.3.0` vốn **không** cài TS 7 / ESLint 10 — template chính thức pin `"typescript": "^5"` và `"eslint": "^9"`. Giả định ngược lại trong `SESSION_CHECKPOINT.md` cũ là sai và đã được sửa.
3. **Phiên bản đã pin:** `typescript@6.0.3` + `eslint@9.39.5`. Chọn TS **6.0.3** thay vì 5.x LTS vì 6.0.3 là bản stable nằm trong peer range `<6.1.0` — lý do đầy đủ ở `docs/11-decisions.md § DEC-002 — KẾT LUẬN SMOKE TEST`.
4. **Ba lệnh nền tảng đã chạy và xanh** (trên project đã có code Phase 1):
   `npm run typecheck` → exit 0 · `npm run lint` → exit 0 (0 error, 0 warning) · `npm run build` → exit 0.
5. **Không hạ tiêu chuẩn để cho qua** (đúng yêu cầu số 5 của § Fix): `tsconfig.json` giữ `"strict": true` **và** thêm `noUncheckedIndexedAccess: true`; `@typescript-eslint/no-explicit-any` đặt mức **`error`** (mạnh hơn mặc định `warn`); không rule nào bị tắt.
6. Kết quả và phiên bản đã ghi vào `docs/11-decisions.md` (DEC-002) và `WORKLOG.md` Entry 003.

**Theo dõi tiếp (không chặn tiến độ):** nâng lên ESLint 10 / TS 7 chỉ khi `eslint-plugin-react` ra bản hỗ trợ ESLint 10 **và** `typescript-eslint` hỗ trợ TS ≥ 7.1 (typescript-eslint#10940). Khi đó tạo **DEC mới**, không sửa đè DEC-002.

---

### ISSUE-005

**Severity: P3**
**Status: OPEN**

**Module:**
`supabase/migrations/0003_functions_triggers.sql` và `0004_rls_policies.sql` (**đề xuất, chưa triển khai**) — hàm `public.is_admin()`, `public.is_active_sales()` và toàn bộ RLS policy trên `profiles`, `daily_reports`. Liên quan: DEC-004, DEC-006, NFR-002, NFR-015, Phase 2 và Phase 11.

**Description:**
Mọi RLS policy trong thiết kế đều gọi `public.is_admin()`, mà hàm này thực hiện `exists(select 1 from profiles where id = auth.uid() and role = 'ADMIN' and is_active)`. Nghĩa là **mỗi câu lệnh có RLS đều kèm thêm một lần tra bảng `profiles`**. Kèm theo đó là hai cạm bẫy đã biết:

- Nếu `is_admin()` **không** phải `SECURITY DEFINER`, policy trên `profiles` sẽ tự truy vấn `profiles` → **infinite recursion**, Postgres báo lỗi và mọi truy vấn hỏng.
- Nếu trong policy viết `public.is_admin()` trần thay vì `(select public.is_admin())`, Postgres đánh giá hàm **cho từng row** thay vì nâng thành InitPlan đánh giá một lần cho cả câu lệnh — chi phí tăng tuyến tính theo số row quét.

Ở quy mô v1 (NFR-015: 50 Sales × 365 ngày ≈ 18k row/năm) chi phí này gần như không đáng kể — vì vậy đây là **P3, nợ kỹ thuật**, không phải lỗi hiệu năng đang xảy ra.

**Expected:**
Truy vấn danh sách báo cáo của Admin (`/admin/reports`, có filter + phân trang server-side theo FR-026) dùng index `idx_daily_reports_date_status` và **không** phát sinh một lần tra `profiles` cho mỗi row (NFR-002).

**Actual:**
**Chưa quan sát được — đây là rủi ro đã nhận diện ở Phase 0, chưa có code để tái hiện.** Chưa có Supabase project, chưa có bảng, chưa chạy `EXPLAIN ANALYZE` lần nào.

**Root Cause:**
Đây là **nguyên nhân cấu trúc, đã biết trước**, không phải bug chờ điều tra: RLS cần biết role của người dùng; role được lưu trong bảng `profiles`; vì vậy policy trên chính `profiles` buộc phải truy vấn `profiles`. Cách duy nhất cắt vòng lặp là `SECURITY DEFINER` (bỏ qua RLS bên trong hàm), và cách duy nhất tránh đánh giá theo từng row là để Postgres nâng lời gọi thành InitPlan.

**Fix:**
1. **Đã nằm sẵn trong thiết kế (DEC-006), phải thực hiện đúng, không được đơn giản hoá:**
   - `public.is_admin()` khai báo `stable security definer set search_path = public, pg_temp`.
   - Trong policy **luôn** viết `(select public.is_admin())`, không bao giờ viết `public.is_admin()` trần.
   - Áp dụng cùng kỷ luật đó cho `(select auth.uid())` và `public.is_active_sales()`.
2. Nếu về sau đo được là vẫn chậm ở quy mô lớn hơn: chuyển `role` vào **custom JWT claim** (custom access token hook của Supabase) và đọc từ `auth.jwt()` — khi đó policy không cần tra `profiles` nữa.
3. Nếu chọn phương án JWT claim, phải ghi thành **DEC mới** và tài liệu hoá hệ quả: đổi role không có hiệu lực cho tới khi token được refresh, nên UC-19 (kích hoạt/vô hiệu hoá tài khoản) cần cân nhắc thêm bước huỷ session. **Không đổi sang JWT claim ở v1 khi chưa có số đo chứng minh cần thiết** — tối ưu sớm ở đây đắt hơn lợi ích.

**Verification:**
Kế hoạch kiểm chứng (**chưa chạy**):
- `EXPLAIN ANALYZE` truy vấn danh sách báo cáo của Admin dưới JWT admin thật trên Supabase local (DEC-022): kỳ vọng thấy **InitPlan** cho `is_admin()`, không phải SubPlan chạy lại theo từng row; kỳ vọng thấy index scan trên `idx_daily_reports_date_status`.
- Test RLS phải chứng minh không xảy ra lỗi recursion khi `select` trên `profiles` bằng cả JWT admin lẫn JWT sales.
- Ghi số đo vào `docs/08-testing-strategy.md` như một phần của bộ test NFR-002.
- Đóng issue khi có số đo thật chứng minh chi phí chấp nhận được ở quy mô NFR-015.

---

### ISSUE-006

**Severity: P3**
**Status: CLOSED** — đóng ngày `2026-08-07` theo quyết định của chủ nghiệp vụ, xem mục Verification

**Module:**
AF-02 Missing Report Alerts trên `/admin` (**đề xuất, chưa triển khai**). Liên quan: FR-033, UC-20, OQ-08, AF-15, Phase 8.

**Description:**
Theo đề xuất mặc định của **OQ-08**, v1 **không có** khái niệm ngày nghỉ / nghỉ phép / không đi thị trường. Do đó cảnh báo "Sales chưa báo cáo" chỉ có thể được tính bằng cách: lấy mọi `profiles` có `role = 'SALES'` và `is_active = true`, trừ đi những người đã có row `daily_reports` với `report_date = public.vn_today()`.

Tập kết quả đó **bao gồm cả** người đang nghỉ phép, nghỉ lễ, nghỉ ốm, hoặc đơn giản là hôm nay không có lịch đi thị trường. Admin sẽ thấy họ trong danh sách "chưa báo cáo" và có thể đốc thúc nhầm người. Nếu chuyện này lặp lại, hệ quả thật không phải kỹ thuật mà là **niềm tin vào cảnh báo giảm dần** — Admin bắt đầu bỏ qua toàn bộ danh sách, làm mất luôn giá trị của AF-02, vốn được đánh giá là tính năng có giá trị vận hành cao nhất.

**Expected:**
Cảnh báo chỉ trỏ vào người **thực sự quên báo cáo** trong một ngày họ đáng lẽ phải báo cáo.

**Actual:**
**Chưa quan sát được — đây là rủi ro đã nhận diện ở Phase 0, chưa có code để tái hiện.** Chưa có `/admin`, chưa có truy vấn alert, chưa có người dùng thật.

**Root Cause:**
Đây là **hệ quả của quyết định phạm vi**, không phải lỗi triển khai. Mô hình dữ liệu hiện tại **không có chỗ nào để biểu đạt** ý "hôm nay tôi không đi thị trường": `daily_reports` chỉ có hai trạng thái `MORNING_SUBMITTED` và `COMPLETED` (DEC-020), và không có row nào nghĩa là "chưa báo cáo" — không phân biệt được với "không cần báo cáo". Nguyên nhân gốc nằm ở OQ-08 chưa được trả lời, chứ không nằm ở câu SQL.

**Fix:**
**Không làm gì.** Chủ nghiệp vụ đã xem xét và quyết định ngày `2026-08-07`: **không xử lý gì quanh việc này ở v1** — không thêm bảng/cột ngày nghỉ, và **không** thêm ràng buộc đặc biệt nào cho nhãn hay cách hiển thị của khối cảnh báo AF-02. Khối cảnh báo cứ triển khai bình thường theo FR-033.

Nếu sau này thực tế vận hành cho thấy cần: kích hoạt **AF-15** (Quản lý ngày nghỉ) từ `docs/10-future-roadmap.md`, và việc đó phải ghi thành **DEC mới** kèm cập nhật `docs/02`, `docs/06` theo Master Spec §62.

**Verification:**
Đóng theo tiêu chí (a) mà chính issue này đặt ra khi mở: *"OQ-08 được xác nhận là 'không cần'"*.
- [x] **OQ-08 đã được trả lời `KHÔNG` ngày 2026-08-07** — ghi ở `docs/01-business-analysis.md § OPEN QUESTIONS` và DEC-030 (`APPROVED`).
- [x] Chủ nghiệp vụ xác nhận thêm, cũng ngày `2026-08-07`, rằng **không cần biện pháp giảm thiểu nào** — kể cả ràng buộc về từ ngữ trên UI. Mọi ràng buộc phái sinh trước đó đã được gỡ khỏi `docs/01`, `docs/11`, `CLAUDE.md`, `SESSION_CHECKPOINT.md`, `WORKLOG.md`, `PROJECT_CHECKLIST.md`.
- [x] Không còn mục checklist hay yêu cầu triển khai nào gắn với issue này.

**Người xác nhận:** chủ nghiệp vụ (người dùng), trao đổi trực tiếp ngày `2026-08-07`.
**Ghi chú theo Master Spec §56:** issue **không bị xoá** — giữ nguyên Description / Root Cause gốc làm lịch sử, chỉ đổi `Status` và điền Verification.

---

### ISSUE-007

**Severity: P3**
**Status: OPEN**

**Module:**
`public.daily_reports` (**đề xuất, chưa triển khai**), RLS policy `reports_update_own_open`, trigger `public.guard_report_transition()`, AF-12 (roadmap). Liên quan: OQ-04, OQ-05, BR-019, BR-020, BR-002, DEC-026, Phase 4 trở đi (theo điều kiện).

**Description:**
v1 **không có audit log**. Ở phương án mặc định điều này chấp nhận được, vì báo cáo bị khoá ngay khi chuyển sang `COMPLETED`: policy `reports_update_own_open` có `USING ... AND status = 'MORNING_SUBMITTED'`, nên sau khi hoàn tất thì không còn row nào khớp điều kiện UPDATE, báo cáo tự khoá; và Admin không được cấp quyền UPDATE trên các cột số liệu (BR-020).

Rủi ro nằm ở nhánh còn lại: **nếu OQ-04 được trả lời là (b) hoặc (c), hoặc OQ-05 được trả lời là "Admin được sửa"**, thì số liệu đã hoàn tất trở nên sửa được mà **không có bất kỳ dấu vết nào** về ai sửa, sửa lúc nào, từ giá trị nào sang giá trị nào.

Điều làm rủi ro này nghiêm trọng hơn vẻ ngoài của nó: theo BR-002 và Master Spec §12 (save trước — export sau), ảnh PNG **đã được gửi lên Zalo** trước khi ai đó sửa. Sau khi sửa, **ảnh trong nhóm chat và số trong database nói hai điều khác nhau**, và không ai chứng minh được cái nào đúng. Đây chính là kịch bản tranh chấp số liệu mà audit log sinh ra để giải quyết.

Xếp P3 vì ở cấu hình mặc định của v1 điều này **không thể xảy ra**; nó chỉ trở thành vấn đề khi quyền sửa được mở.

**Expected:**
Mọi thay đổi số liệu sau khi báo cáo đạt `COMPLETED` phải truy vết được đầy đủ: **ai** thay đổi, **khi nào**, **giá trị cũ → giá trị mới**, và bản ghi truy vết đó **không sửa/xoá được bởi bất kỳ role nào**.

**Actual:**
**Chưa quan sát được — đây là rủi ro đã nhận diện ở Phase 0, chưa có code để tái hiện.** Chưa có bảng nào, chưa có ai sửa gì.

**Root Cause:**
Chưa quyết định được phạm vi (OQ-04, OQ-05) nên chưa thiết kế bảng lịch sử. Trong schema hiện tại **không có cột hay bảng nào lưu giá trị trước khi sửa**: `updated_at` (do trigger `public.set_updated_at()` cập nhật) chỉ cho biết *"đã có thay đổi"*, không cho biết *"đổi cái gì"* và không cho biết *"do ai"*.

**Fix:**
1. **Giữ nguyên khoá cứng ở v1** — tức giữ đề xuất mặc định OQ-04 (a) "khoá ngay khi `COMPLETED`" và OQ-05 "Admin không sửa". Đây là cách rẻ nhất để không cần audit log.
2. **Nếu người dùng chọn cho phép sửa** (bất kể nhánh nào của OQ-04/OQ-05), thì **AF-12 là điều kiện tiên quyết, không phải việc làm sau**. Trình tự bắt buộc:
   - Tạo bảng `report_audit_log` dạng **append-only**: không cấp policy UPDATE, không cấp policy DELETE cho bất kỳ role nào.
   - Ghi bằng trigger `AFTER UPDATE ON public.daily_reports`, lưu tối thiểu: `report_id`, `changed_by` (`auth.uid()`), `changed_at`, và giá trị cũ/mới của các cột số liệu.
   - **Chỉ sau khi bảng và trigger đã có và đã test**, mới nới RLS policy cho phép UPDATE.
3. Ghi việc này thành **DEC mới** trong `docs/11-decisions.md`, cập nhật `docs/02-database-design.md` (schema) và `docs/06-auth-permissions.md` (policy) theo Master Spec §62.
4. Cân nhắc thêm khi mở quyền sửa: nếu số liệu thay đổi sau khi đã xuất ảnh, UI nên cảnh báo người dùng rằng ảnh đã gửi không còn khớp — nhưng đây là quyết định nghiệp vụ, không tự quyết.

**Verification:**
Kế hoạch kiểm chứng, **chỉ áp dụng nếu quyền sửa được mở** (hiện chưa áp dụng ở v1):
- Test RLS phải chứng minh: không role nào (`SALES`, `ADMIN`, `authenticated`) UPDATE hoặc DELETE được row trong `report_audit_log`.
- Test integration: sửa một `daily_reports` đã `COMPLETED` → sinh **đúng một** dòng audit, chứa đúng `changed_by`, và đúng cặp giá trị cũ/mới.
- Test: xoá bảng khỏi đường đi (giả lập trigger hỏng) → thao tác UPDATE phải **thất bại**, không được âm thầm bỏ qua audit.
- Nếu v1 giữ khoá cứng: kiểm chứng bằng test RLS chứng minh salesA **không** UPDATE được report của chính mình khi `status = 'COMPLETED'` (0 rows affected), và Admin **không** UPDATE được cột số liệu của bất kỳ report nào. Khi đó ISSUE-007 chuyển `CLOSED` với ghi chú "không áp dụng ở v1 vì báo cáo bị khoá — mở lại nếu OQ-04/OQ-05 thay đổi".

---

### ISSUE-008

**Severity: P3**
**Status: CLOSED** *(2026-08-07 — người dùng đã chốt cách đọc, xem DEC-038)*

**Module:**
`docs/01-business-analysis.md` (tài liệu, không phải code) → sẽ ảnh hưởng `lib/kpi.ts`. Liên quan: BR-015, DEC-025, OQ-11, Phase 5.

**Description:**
Hai chỗ trong cùng một tài liệu nói khác nhau về việc **khi nào** `AchievementResult.percent` được phép bằng `null`:

- `docs/01-business-analysis.md` (mục mô tả `AchievementResult`): *"`percent: null` **chỉ** xảy ra ở trường hợp `target = 0 && actual > 0` (BR-015)"*.
- `docs/01-business-analysis.md` §"Hệ quả cho việc cài đặt `lib/kpi.ts` (Phase 5)", bảng 4 dòng: dòng **"chưa có `actual`"** cũng ghi `percent` = `null`, status `PENDING`, hiển thị `—`.

Chữ "**chỉ**" ở chỗ thứ nhất loại trừ đúng trường hợp mà chỗ thứ hai cho phép. Phát hiện khi viết khung `lib/kpi.ts` ở Phase 1.

**Expected:**
Một quy tắc duy nhất, không mơ hồ, cho `percent: null` — vì Phase 5 phải viết unit test biên đúng theo nó (`actual = null` là một case bắt buộc trong `PROJECT_CHECKLIST.md § Phase 5`).

**Actual:**
Hai phát biểu mâu thuẫn cùng tồn tại. **Chưa gây bug** vì `lib/kpi.ts` hiện mới chỉ là khung (thân hàm `throw`, chưa có logic).

**Root Cause:**
Nhiều khả năng do soạn thảo: bảng ở §"Hệ quả cho việc cài đặt" được **thêm sau** khi người dùng trả lời OQ-11 (Entry 002), còn câu "chỉ xảy ra khi…" là văn bản có từ trước và không được rà lại. Đây là **giả thuyết**, chưa xác nhận.

**Fix:**
Cách đọc hợp lý nhất — **chưa được chốt, không được tự áp dụng**: `percent: null` mang nghĩa "không tồn tại một con số phần trăm có ý nghĩa", đúng cho **cả hai** trường hợp (`target = 0 && actual > 0` → vượt kế hoạch; `actual = null` → chưa có số liệu), và hai trường hợp này phân biệt nhau bằng `status` (`EXCEEDED` vs `PENDING`) chứ không bằng `percent`. Nếu đúng vậy thì chỉ cần bỏ chữ "**chỉ**" ở phát biểu thứ nhất.

Trình tự bắt buộc ở **đầu Phase 5**, trước khi viết thân `calculateAchievement()`:
1. Chốt cách đọc, sửa `docs/01-business-analysis.md` cho khớp ở **cả hai** chỗ.
2. Chốt luôn hạng mục còn treo của DEC-025: `AchievementResult` mang thêm **số vượt tuyệt đối + đơn vị** bằng cách nào (thêm tham số đơn vị vào `calculateAchievement()`, hay trả số vượt thô để tầng hiển thị tự format). `docs/11 § DEC-025` ghi rõ *"chốt cách cài đặt ở Phase 5"*.
3. Cập nhật `AchievementResult` trong `lib/kpi.ts` và ghi chú TODO tương ứng ở đầu file.

**Không** được đổi bản chất BR-015 — rule đã `APPROVED`; đây chỉ là làm rõ câu chữ mô tả kiểu dữ liệu, không phải đổi nghiệp vụ (Master Spec §71).

**Verification:**
**ĐÃ CHẠY THẬT ngày 2026-08-07 (Phase 5) — đạt cả 3 mục:**

1. ✅ `docs/01-business-analysis.md` chỉ còn **một** phát biểu về `percent: null` và nó khớp với bảng 4 dòng ở §"Hệ quả cho việc cài đặt `lib/kpi.ts`". Chữ "**chỉ**" đã bị bỏ; đoạn mô tả `AchievementResult` nay nói rõ `null` đúng cho **cả hai** ca, phân biệt bằng `status`.
2. ✅ `lib/kpi.test.ts` — **46 test, 46 PASS** (`npx vitest run --project unit lib/kpi.test.ts`). Phủ đủ 4 dòng của bảng, gồm `actual = null` → `{ percent: null, status: 'PENDING', display: '—', surplus: null }`, và cả hai ca `target = 0`.
3. ✅ Không test nào cho ra `NaN` / `Infinity`: có một bài quét lưới **8 target × 9 actual × 4 metric = 288 tổ hợp** (gồm cả `NaN`, `±Infinity`, số âm) và khẳng định `percent` luôn là `null` hoặc hữu hạn, `surplus` luôn là `null` hoặc hữu hạn, và `display` không bao giờ chứa `'NaN'` / `'Infinity'` / `'∞'` / `'undefined'`.

**Kiểm chứng thêm trên trình duyệt thật** (Chromium 375px + 1440px, Supabase local, script dùng-một-lần đã xoá): **36/36 PASS**, trong đó ba tình huống của `docs/05 §7.3` đều đúng — chưa có số liệu → `'—'` + "Chờ số liệu"; `target = 0 && actual = 0` → `'100,0%'` + "Vượt mục tiêu"; `target = 0 && actual > 0` → `'+7 xe'` + "Vượt kế hoạch". Không trang nào chứa `NaN` / `Infinity` / `∞` trong text đã render.

**Cách đọc chính thức** (DEC-038): `percent: null` nghĩa là *không tồn tại một con số phần trăm có ý nghĩa*, đúng cho **cả hai** ca; `status` (`EXCEEDED` vs `PENDING`) là thứ phân biệt chúng. Bản chất BR-015 **không đổi**.

---

### ISSUE-009

**Severity: P3**
**Status: OPEN**

**Module:**
`middleware.ts` (gốc dự án). Liên quan: DEC-004, FR-002, FR-004, Phase 2.

**Description:**
Next.js 16.3.0 **deprecate quy ước file `middleware.ts`** và khuyến nghị đổi tên thành `proxy.ts`. Mỗi lần `npm run build` đều in cảnh báo:

```text
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  To migrate automatically, run:
  npx @next/codemod@canary middleware-to-proxy .
```

Trong bản build, layer này đã được liệt kê dưới tên mới: `ƒ Proxy (Middleware)`.

**Expected:**
Build sạch, không có cảnh báo deprecation; và tên file trong repo khớp với tên mà framework khuyến nghị.

**Actual:**
Build **exit 0 và chạy đúng** — cảnh báo, không phải lỗi. Toàn bộ 32 kiểm chứng luồng auth trên trình duyệt thật đều PASS với `middleware.ts`.

**Root Cause:**
Next.js 16 đổi tên quy ước để phản ánh đúng vai trò (proxy cạnh request) và tách khỏi kỳ vọng "middleware kiểu Express". Đây là thay đổi tên, **không** đổi ngữ nghĩa.

**Fix:**
**Cố ý HOÃN, không sửa ở Phase 2.** Lý do:

1. Cả 17 tài liệu điều khiển đều gọi tên `middleware.ts` — `CLAUDE.md §6`, `AGENTS.md §6`, `docs/04`, `docs/06 §5.2` (bảng route protection và ba lỗi kinh điển), `PROJECT_CHECKLIST.md § Phase 2`. Đổi tên file giữa Phase 2 mà không sweep hết là tạo ra mâu thuẫn docs ↔ code, đúng thứ `CLAUDE.md §9` cấm.
2. Cảnh báo không ảnh hưởng chức năng và không ảnh hưởng người dùng cuối.

**Điều kiện kích hoạt:** khi nâng Next lên major tiếp theo (17.x), **hoặc** khi cảnh báo chuyển thành lỗi. Khi đó chạy `npx @next/codemod@canary middleware-to-proxy .` **và** cập nhật đồng bộ 5 tài liệu nêu ở mục 1, kèm một `DEC` mới.

**Verification:**
Kế hoạch kiểm chứng (**chưa chạy** — hoãn theo điều kiện trên):
- `npm run build` không còn dòng cảnh báo nào.
- Chạy lại đủ bộ kiểm chứng luồng auth (chưa đăng nhập → `/login?next=`, sai vai → dashboard đúng vai, đăng xuất, `is_active=false` giữa phiên) và tất cả phải PASS như hiện tại.
- `grep -r "middleware.ts" docs/ *.md` không còn kết quả lạc hậu.

---

### ISSUE-010

**Severity: P3**
**Status: OPEN**

**Module:**
Môi trường phát triển cục bộ (Supabase CLI + Docker). Liên quan: DEC-022, DEC-031, Phase 2, Phase 11.

**Description:**
Máy phát triển đang chạy **ba stack Supabase local cùng lúc**, mỗi stack một bộ cổng riêng:

| Project | Kong (API) | Postgres |
|---|---:|---:|
| **BikeForce** | 54321 | **54322** |
| `cq-tntt-manager` | 54421 | 54422 |
| `Polymind_Chinese` | 55321 | 55322 |

Mọi lệnh chọn container theo kiểu `docker ps --filter name=supabase_db` rồi lấy phần tử đầu tiên đều **không xác định** — thứ tự trả về của Docker không có bảo đảm.

**Expected:**
Mọi thao tác kiểm chứng schema phải chạm đúng database của BikeForce.

**Actual:**
**Đã xảy ra thật ngày 2026-08-07.** Một truy vấn kiểm tra `information_schema.role_table_grants` đã trúng container `supabase_db_cq-tntt-manager` và trả về bảng của một dự án hoàn toàn khác (`students`, `classes`, `committees`, …), suýt dẫn tới kết luận sai về quyền của `service_role` trên `public.profiles`. Phát hiện được vì kết quả có những bảng không hề tồn tại trong BikeForce.

**Root Cause:**
Lọc container theo tiền tố tên chung `supabase_db` thay vì theo tên đầy đủ của project, cộng với việc `docker ps` không bảo đảm thứ tự.

**Fix:**
Mitigation **đã áp dụng** ở Phase 2:

1. Bộ test **không** dùng `docker exec` — nó kết nối bằng `SUPABASE_DB_URL` đọc từ `.env.local`, tức là địa chỉ và cổng tường minh.
2. `tests/integration/setup.ts` có **chặn an toàn**: nếu `NEXT_PUBLIC_SUPABASE_URL` hoặc `SUPABASE_DB_URL` không trỏ `127.0.0.1`/`localhost` thì ném lỗi ngay, không chạy tiếp (DEC-022 — không bao giờ test trên production).
3. Quy tắc thao tác tay: luôn lấy cổng từ `npx supabase status` chạy **trong thư mục dự án**, hoặc gọi `docker exec` bằng **tên container đầy đủ** `supabase_db_BikeForce_Bicycle_Sales_Management_Syste`.

**Verification:**
Đã kiểm chứng 2026-08-07: sau khi chuyển sang tên container đầy đủ, truy vấn `information_schema.role_table_grants` trên schema `public` chỉ trả về đúng **2 bảng** (`profiles`, `daily_reports`) thay vì 50+ bảng của dự án khác. Bộ test `npm run test:db` chạy qua `SUPABASE_DB_URL` cho **66/66 PASS**.

Còn để `OPEN` vì mitigation là **quy ước thao tác**, không phải hàng rào kỹ thuật đầy đủ: một lệnh `docker exec` viết ẩu trong tương lai vẫn có thể trúng nhầm container.

---

### ISSUE-011

**Severity: P1**
**Status: OPEN**

**Module:**
`.env.local` (không commit) + project Supabase cloud `rnmywhwanpxmipqducqu`. Liên quan: NFR-005, DEC-005, DEC-031, Phase 2.

**Description:**
Sau khi người dùng điền giá trị thật vào `.env.local`, IDE **tự đồng bộ nội dung file đã sửa vào ngữ cảnh hội thoại**. Vì vậy **service role key** (dạng `sb_secret_...`) đã nằm trong transcript, dù cả tài liệu lẫn hướng dẫn đều nói rõ "không dán vào chat".

**Expected:**
Service role key chỉ tồn tại ở đúng hai nơi: `.env.local` trên máy (đã bị `.gitignore` chặn) và biến môi trường server-side trên Vercel.

**Actual:**
Key nằm thêm trong một transcript hội thoại. `.gitignore` vẫn hoạt động đúng — key **không** vào git, đã kiểm bằng `git check-ignore -v .env.local` → khớp `.gitignore:10:.env.*`.

**Root Cause:**
Không phải lỗi của `.gitignore` hay của quy trình commit. Nguyên nhân là **một kênh rò rỉ mà tài liệu chưa lường tới**: tính năng tự đồng bộ file đang mở của IDE. `docs/06 §11.2` liệt kê 7 biện pháp bảo vệ service role key (đặt tên biến, `server-only`, giới hạn phạm vi, không commit, không ghi vào docs, cấu hình Vercel, grep CI) — **không biện pháp nào chặn được kênh này**.

**Fix:**
1. **Rotate key ngay.** Dashboard → `Project Settings` → `API Keys` → mục secret → **`Generate new secret key`** (hoặc `Rotate`) → dán giá trị mới vào `.env.local`, ghi đè giá trị cũ.
2. Nếu đã đặt biến trên Vercel thì cập nhật lại ở cả 3 scope (Production / Preview / Development).
3. **Bổ sung vào `docs/06 §11.2`** biện pháp thứ 8: *khi điền secret vào `.env.local`, đóng file trong IDE trước, hoặc điền bằng terminal* — để tính năng đồng bộ của IDE không chạm tới.

**Bán kính thiệt hại — nhỏ hơn thông thường, và đây là công của DEC-031:**
Key này **bypass RLS** nhưng **không bypass GRANT**, mà migration `0001`/`0002` cố ý **không cấp DML** cho `service_role`. Đã kiểm chứng trên chính cloud: `anon` nhận `42501 permission denied` trên cả hai bảng, và `service_role` cũng không có `SELECT/INSERT/UPDATE/DELETE`. Vì vậy key rò rỉ **không đọc hay sửa được** `profiles` và `daily_reports`. Cái nó còn làm được là `auth.admin.*`: liệt kê `auth.users`, tạo/xoá tài khoản, đổi mật khẩu. Vẫn đủ nghiêm trọng để xếp **P1** và phải rotate.

**Verification:**
Kế hoạch kiểm chứng (**chưa chạy** — chờ người dùng rotate):
- Gọi `GET /auth/v1/admin/users` bằng key **cũ** ⇒ phải nhận `401`.
- Gọi cùng endpoint bằng key **mới** ⇒ `200`.
- `git log -S "sb_secret" --all` ⇒ **0 kết quả** (xác nhận key chưa từng vào lịch sử git).
- `docs/06 §11.2` đã có biện pháp thứ 8.

---

### ISSUE-012

**Severity: P3**
**Status: OPEN**

**Module:**
Môi trường phát triển — Supabase CLI local + Docker. Liên quan: ISSUE-010, DEC-022, Phase 3.

**Description:**
Sau khi chạy `npx supabase db reset`, hai container `supabase_auth_*` (GoTrue) và `supabase_kong_*` **không tự phục hồi**: mọi request đăng nhập trả `502` từ Kong, và server log của ứng dụng ghi `An invalid response was received from the upstream server`, sau đó là `Database error querying schema`.

**Expected:**
`db reset` xong là đăng nhập được ngay bằng tài khoản seed.

**Actual:**
`GET /auth/v1/health` → `502`. Bản thân container GoTrue báo `healthy`, nên nhìn `docker ps` sẽ tưởng mọi thứ bình thường. Đã tốn một vòng chẩn đoán sai hướng ở Phase 3 vì điều này.

**Root Cause:**
Hai nguyên nhân chồng lên nhau:
1. `db reset` tạo lại container Postgres ⇒ GoTrue giữ pool kết nối trỏ tới instance cũ.
2. Kong cache DNS/địa chỉ upstream ⇒ khi GoTrue được tạo lại với IP khác, Kong vẫn gọi địa chỉ cũ.

**Fix:**
Chạy sau mỗi lần `db reset` (đã kiểm chứng thật, khôi phục `200` trong dưới 15 giây):

```bash
docker restart supabase_auth_<project> supabase_rest_<project>
sleep 8
docker restart supabase_kong_<project>
```

Lấy đúng tên container bằng `docker ps --filter "name=supabase_auth"` — **trong thư mục dự án** để không đụng hai stack Supabase khác trên máy (ISSUE-010).

**Ghi chú thêm:** trên máy này `npx supabase db reset` **treo ở bước "Restarting containers"** và không tự thoát, dù migration + seed đã apply xong. Kiểm bằng
`docker exec supabase_db_<project> psql -U postgres -d postgres -t -c "select count(*) from public.daily_reports;"` → thấy `22` là seed đã chạy xong, có thể ngắt lệnh.

**Verification:**
- `curl -o /dev/null -w "%{http_code}" http://127.0.0.1:54321/auth/v1/health` → `200`.
- Đăng nhập bằng `sales.a@bikeforce.local` trên `next start` → vào được `/sales/today`. **Đã chạy thật 2026-08-07.**

---

### ISSUE-013

**Severity: P3**
**Status: OPEN — cần người dùng quyết định (OQ-18)**

**Module:**
`/sales/today/morning` — NFR-008, FR-008, UC-04. Liên quan: `docs/01 §OPEN QUESTIONS`, Phase 3.

**Description:**
NFR-008 đặt mục tiêu *"Hoàn tất báo cáo sáng ≤ 60 giây, ≤ 6 lần chạm"*. Đo thật trên Chromium ở 375px: **thời gian đạt (1,8 giây), số lần chạm KHÔNG đạt — 7 lần**.

**Expected:** ≤ 6 lần chạm.
**Actual:** 7 lần chạm, phân rã như sau:

| # | Thao tác |
|---|---|
| 1 | Chạm CTA "Tạo báo cáo đầu ngày" ở `/sales/today` |
| 2 | Chạm ô Tuyến ghé thăm |
| 3 | Chạm ô Mục tiêu điểm viếng thăm |
| 4 | Chạm ô Mục tiêu doanh số |
| 5 | Chạm chip `+10tr` của ô Doanh thu |
| 6 | Chạm ô Mục tiêu số lượng khách hàng |
| 7 | Chạm nút "Lưu báo cáo đầu ngày" |

*(Chưa tính số lần gõ trên bàn phím số — nếu tính cả gõ phím thì con số lớn hơn nhiều.)*

**Root Cause:**
Không phải lỗi cài đặt. FR-008 quy định **5 trường bắt buộc**; sàn lý thuyết của luồng là `1 (mở form) + 5 (chạm từng ô) + 1 (lưu) = 7`. **NFR-008 ≤ 6 không thể đạt cùng lúc với FR-008 nếu "chạm" nghĩa là một lần chạm màn hình.** Đây là mâu thuẫn giữa hai requirement, không phải chỗ để tối ưu code.

Ba thứ đã làm và có hiệu quả thật, nhưng không đủ để xuống 6: chip cộng nhanh `+1tr/+5tr/+10tr` (đổi 8 lần gõ phím thành 1 lần chạm), `inputMode="numeric"`, `enterKeyHint="next"`.

**Fix:** **CHƯA ÁP DỤNG — chờ người dùng chọn.** Ba phương án:

| # | Phương án | Đánh đổi |
|---|---|---|
| (a) | Nới NFR-008 thành **≤ 8 lần chạm**, giữ nguyên 5 trường | Không mất dữ liệu nghiệp vụ nào. Cần sửa `docs/01` + tạo DEC mới |
| (b) | Định nghĩa lại "chạm" = **số ô phải nhập** (5), không tính mở form và nút lưu | Chỉ là đổi cách đo, nhưng phải ghi rõ để lần đo sau không lệch |
| (c) | Bỏ bớt một trường bắt buộc khỏi form sáng | **Thay đổi nghiệp vụ** — đụng FR-008 và schema. Không được tự làm |

Cho tới khi có quyết định, mục *"Walkthrough xác nhận hoàn tất báo cáo sáng ≤ 60 giây và ≤ 6 lần chạm"* trong `PROJECT_CHECKLIST.md` Phase 3 **để nguyên `[ ]`**.

**Verification:**
Script kiểm chứng dùng-một-lần đã đếm số lần chạm và đo thời gian thật trên Chromium 375px (2026-08-07): **7 chạm / 1,8 giây**. Sau khi chốt phương án, phải đo lại và ghi số mới vào `WORKLOG.md`.

---

### ISSUE-014

**Severity: P2**
**Status: CLOSED — đã sửa trong cùng Phase 4 (DEC-037)**

**Module:**
`features/report-evening/*`, `app/(sales)/sales/today/evening/page.tsx`. Liên quan: DEC-034, DEC-037, FR-015, FR-035.

**Description:**
Sau khi lưu báo cáo cuối ngày **thành công**, người dùng bị đưa về `/sales/today` **không có** `?saved=evening`, nên **không thấy câu xác nhận** "Đã hoàn tất báo cáo hôm nay"; đồng thời **draft localStorage của form cuối ngày không bị xoá**.

Trạng thái dữ liệu vẫn đúng (`status = 'COMPLETED'`, đủ 4 cột `actual_*`, có `evening_submitted_at`) — đây là lỗi **phản hồi cho người dùng**, không phải lỗi ghi dữ liệu. Nhưng nó vi phạm FR-035 ("xoá draft sau khi lưu thành công") và làm người dùng không chắc mình đã lưu được hay chưa, đúng thứ `docs/05 §8` cấm.

**Expected:** quay về `/sales/today?saved=evening`, hiện banner xác nhận, draft bị xoá.
**Actual:** quay về `/sales/today`, không banner, draft còn nguyên.

**Root Cause:**
Sau mỗi Server Action, Next render lại RSC của **route hiện tại**. Lần render lại đó của `/sales/today/evening` thấy `status` vừa thành `'COMPLETED'` nên chạy `redirect(SALES_TODAY_PATH)` — điều hướng **phía server**, không mang query param. Nó làm `EveningReportForm` unmount **trước khi** `useEffect` bắt `state.ok` kịp commit, nên `router.replace()` và `clearDraft()` không bao giờ chạy.

**Cùng họ với ISSUE của DEC-034:** cả hai đều là "re-render route hiện tại sau Server Action phá vỡ giả định client được chạy nốt".

Đã thử bỏ `revalidatePath('/sales/today/evening')` — **không cứu được**, vì Next re-render route hiện tại dù có revalidate hay không.

**Fix (ĐÃ ÁP DỤNG — DEC-037):**
1. `saveEveningReport` **tự `redirect()`** tới `/sales/today?saved=evening`. Điều hướng do server phát ra, deterministic, không còn cuộc đua.
2. Dọn draft chuyển sang `features/report-evening/discard-evening-draft.tsx` — client component không render gì, gắn trên `/sales/today` khi trạng thái là `COMPLETED`.
3. Khoá localStorage của draft gom về `lib/reports/draft-keys.ts` để ba nơi không gõ lệch chuỗi (DEC-035).

**Verification:**
Script kiểm chứng dùng-một-lần trên Chromium 375px + 1440px (2026-08-07):
**trước khi sửa 59/62 PASS** (đỏ đúng 3 mục: URL `?saved=`, banner xác nhận, xoá draft) → **sau khi sửa 62/62 PASS**.
Hồi quy luồng đầu ngày sau refactor: **11/11 PASS**.

⚠ **Bài học cho các phase sau:** mọi Server Action kết thúc bằng "đổi trạng thái khiến chính route hiện tại redirect" đều dính lỗi này. Nếu route hiện tại có thể tự redirect sau khi dữ liệu đổi, **hãy để Server Action tự `redirect()`** thay vì trả `ok: true` cho client điều hướng. Phase 6 (xuất ảnh) và Phase 10 (bật/tắt `is_active`) đều có dạng đó.

---

## 6. Cách thêm issue mới

Áp dụng cho mọi session sau. Mục tiêu: file này phải đọc được như một dòng thời gian nhất quán, không phải một đống ghi chú rời.

### 6.1. Khi nào phải thêm

Theo Documentation Update Matrix (Master Spec §62): **có bug mới → cập nhật `docs/12-known-issues.md`**. Ngoài ra thêm entry khi:

- Phát hiện một rủi ro cụ thể, có thể mô tả bằng câu "nếu X thì Y sẽ hỏng", chứ không phải một lo lắng chung chung.
- Quality gate sau một phase (Master Spec §42) phát hiện lỗi mà **không** sửa ngay trong phase đó.
- Một quyết định trong `docs/11-decisions.md` tạo ra nợ kỹ thuật đã biết trước — ghi issue P3 và trỏ về DEC tương ứng.

**Không** tạo issue cho: ý tưởng tính năng (→ `docs/10-future-roadmap.md`), câu hỏi nghiệp vụ chưa có lời đáp (→ mục `OQ-xx` trong `docs/01-business-analysis.md`), hay lựa chọn kỹ thuật (→ `DEC-xxx` trong `docs/11-decisions.md`).

### 6.2. Cấp ID

- Lấy **số lớn nhất từng dùng + 1**. Tại thời điểm `2026-08-07`, số lớn nhất là `007` → issue tiếp theo là `ISSUE-008`.
- **Không tái sử dụng** ID của issue đã `CLOSED`.
- **Không renumber** các issue cũ vì bất kỳ lý do gì — ID được tham chiếu từ `SESSION_CHECKPOINT.md`, `WORKLOG.md` và các docs khác.

### 6.3. Khuôn mẫu bắt buộc (Master Spec §56 — copy nguyên xi)

```text
ISSUE-00X

Severity: P1 / P2 / P3
Status: OPEN / FIXING / VERIFY / CLOSED

Module:
Description:
Expected:
Actual:
Root Cause:
Fix:
Verification:
```

### 6.4. Quy tắc điền từng trường

| Trường | Phải chứa | Không được |
|---|---|---|
| `Severity` | Đúng một trong P1/P2/P3 theo legend §1 | Bỏ trống, hoặc tự chế mức mới |
| `Status` | Đúng một trong OPEN/FIXING/VERIFY/CLOSED theo legend §2 | Ghi "đang xem xét", "chờ" hay trạng thái tự chế |
| `Module` | Đường dẫn file/route/bảng cụ thể. Nếu chưa tồn tại, ghi rõ **"(đề xuất, chưa triển khai)"** | Ghi chung chung kiểu "backend", "frontend" |
| `Description` | Hiện tượng cụ thể + điều kiện xảy ra | Mô tả cảm tính, không thể kiểm chứng |
| `Expected` | Hành vi đúng, gắn với `FR-xxx` / `BR-xxx` / `NFR-xxx` cụ thể | Kỳ vọng mơ hồ kiểu "nên chạy tốt" |
| `Actual` | Hành vi thật đã quan sát, kèm cách tái hiện. **Nếu chưa quan sát được thì ghi thẳng như vậy** | **Bịa ra bước tái hiện, log, hay stack trace chưa từng thấy** |
| `Root Cause` | Nguyên nhân đã xác minh. Nếu chỉ là giả thuyết, **ghi rõ đó là giả thuyết** | Đoán mò rồi trình bày như sự thật |
| `Fix` | Cách sửa cụ thể, hoặc mitigation + điều kiện kích hoạt | Ghi "sẽ sửa sau" mà không có điều kiện gì |
| `Verification` | Cách kiểm chứng cụ thể: tên test, lệnh, số đo, thiết bị | **Ghi bất kỳ trạng thái test/build nào là PASS khi chưa chạy** |

Quy tắc chung: **không để trống trường nào**. Nếu chưa biết, viết ra là chưa biết và vì sao chưa biết — đó là thông tin, còn ô trống thì không.

### 6.5. Khi đóng một issue

1. Chuyển `Status:` → `VERIFY` khi đã sửa, **chưa** phải `CLOSED`.
2. Chạy đúng bước đã ghi trong `Verification:`, rồi **điền kết quả thật** vào chính trường đó: tên test, ngày, người kiểm chứng, số đo.
3. Chỉ khi kiểm chứng đạt mới chuyển `Status:` → `CLOSED`.
4. **Không xoá entry** (§3). Không rút gọn nội dung cũ.
5. Cập nhật kèm theo: bảng Index ở §4, mục `## Known Issues` trong `SESSION_CHECKPOINT.md`, và entry ngày tương ứng trong `WORKLOG.md`.
6. Nếu issue tái phát: giữ nguyên ID, chuyển về `FIXING`, và **thêm** một dòng lịch sử vào entry (ngày tái phát + bối cảnh) thay vì tạo ID mới.

---

## OPEN QUESTIONS

Các `OQ-xx` ảnh hưởng **trực tiếp** tới tài liệu này. Danh sách đầy đủ, có phân tích ảnh hưởng và mức độ chặn, nằm ở `docs/01-business-analysis.md §OPEN QUESTIONS` — mục dưới đây chỉ tóm tắt.

| OQ | Câu hỏi rút gọn | Đề xuất mặc định | Issue bị ảnh hưởng |
|---|---|---|---|
| OQ-04 | Sales hoàn tất báo cáo cuối ngày rồi có được sửa không? | (a) Khoá ngay khi `COMPLETED` | ISSUE-001, ISSUE-007 |
| OQ-05 | Admin có được sửa báo cáo của Sales không? | Không trong v1; nếu buộc phải sửa thì cần audit log (AF-12) | ISSUE-001, ISSUE-007 |
| OQ-08 | Có khái niệm ngày nghỉ / nghỉ phép / không đi thị trường không? | v1 không có | ISSUE-001, ISSUE-006 |
| OQ-11 | Khi `target = 0` thì `%` hoàn thành hiển thị thế nào? | `actual = 0` → 100%; `actual > 0` → `—` + "Vượt kế hoạch"; tuyệt đối không `NaN`/`∞` | ISSUE-001, ISSUE-002 (edge case snapshot) |
| OQ-12 | Có được nhập trễ / nhập bù ngày cũ không? Có giờ cắt không? | Chỉ đúng ngày hôm nay theo giờ VN, không giới hạn giờ, không nhập bù | ISSUE-001 |
| OQ-13 | Có được xoá báo cáo không? Soft hay hard delete? | v1 không xoá; nếu cần thì soft delete + chỉ Admin | ISSUE-001, ISSUE-007 |

Ngoài ra `ISSUE-001` bao trùm **toàn bộ** các OQ mức BLOCKING, kể cả những câu không liệt kê trong bảng trên (`OQ-01`, `OQ-02`, `OQ-03`, `OQ-09`), vì chừng nào chúng còn mở thì migration Phase 2 vẫn chưa được viết.
