# 05 — UI/UX Design

> Status: ACTIVE | Phase: 16 | Last updated: 2026-08-12
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này
> Đáp ứng Master Spec §3, §4, §28, §33, §49.

---

## 1. Nguồn: skill ui-ux-pro-max — những gì đã thực sự chạy

Master Spec §3 yêu cầu tải và **thực sự nghiên cứu** `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git`, và nói rõ "Không được clone repository chỉ để cho có". Dưới đây là những gì đã chạy thật, để bất kỳ ai cũng kiểm chứng lại được.

Repo được clone (`--depth 1`) vào thư mục scratchpad của phiên làm việc. Công cụ tìm kiếm của skill là một script Python (`.claude/skills/ui-ux-pro-max/scripts/search.py`), chạy bằng Python 3.13.2.

| # | Lệnh đã chạy | Dùng để quyết định gì |
|---|---|---|
| 1 | `--design-system --density 7 --motion 2 --variance 3 -p "BikeForce"` với query `"internal field sales performance reporting dashboard mobile-first professional data-dense"` | Lần thử đầu — kết quả bị bác bỏ, xem §1.1 |
| 2 | `--design-system --density 8 --motion 2 --variance 2` với query `"b2b saas admin dashboard data table kpi metrics enterprise clean utility"` | Thử lại với từ khoá khác — vẫn ra cùng style sai, xem §1.1 |
| 3 | `--domain product "field sales daily report productivity tool internal"` | Xác định loại sản phẩm gần nhất: **Productivity Tool** (style chính: Flat Design + Micro-interactions; dashboard style: Drill-Down Analytics; palette focus: *Clear hierarchy + functional colors*) |
| 4 | `--domain style "clean professional utility dashboard neutral corporate"` | **Nguồn của style cuối cùng** — xem §2 |
| 5 | `--domain color "dashboard analytics professional blue trust status green amber red"` | Palette gốc (§4) |
| 6 | `--domain typography "dashboard data numbers tabular readable sans neutral"` | Font (§3) |
| 7 | `--domain ux "mobile form input validation touch target error empty loading state"` | 14 rule về form/touch/state (§8, §12) |
| 8 | `--domain ux "navigation bottom nav hierarchy back accessibility contrast focus keyboard"` | 10 rule về điều hướng/a11y (§10, §11) |
| 9 | `--stack nextjs "server component form action image data fetching bundle"` | Rendering strategy — đã dùng ở `docs/04-system-architecture.md §6` |

Ngoài ra đã đọc **toàn văn** hai file tham chiếu của skill: `references/quick-reference.md` (đủ 10 nhóm rule, ~98 guideline) và `references/pro-rules.md` (Pre-Delivery Checklist).

### 1.1 Bác bỏ kết quả tự động của công cụ — nói thẳng, không giấu

Bộ sinh `--design-system` được chạy **hai lần** với hai bộ từ khoá khác hẳn nhau, và **cả hai lần** đều trả về cùng một style:

```
Style: Exaggerated Minimalism
Keywords: Bold minimalism, oversized typography, high contrast, negative space, statement design
Best For: Fashion, architecture, portfolios, agency landing pages, luxury brands, editorial
Key Effects: font-size: clamp(3rem, 10vw, 12rem), font-weight: 900, letter-spacing: -0.05em, massive whitespace
Pattern: Real-Time / Operations Landing
Sections: 1. Hero  2. Key metrics  3. How it works  4. CTA (Start trial / Contact)
```

Đây là ngôn ngữ thị giác cho một **trang giới thiệu sản phẩm**, không phải cho một công cụ nhập liệu mà nhân viên Sales dùng một tay khi đang đứng ở đại lý. Ba dấu hiệu sai loại rất rõ:

1. `Best For` liệt kê thời trang, kiến trúc, portfolio, thương hiệu xa xỉ, editorial — không có một mục nào là công cụ nội bộ.
2. `Key Effects` đề xuất chữ tới `12rem` và `font-weight: 900`. Màn hình đối chiếu của BikeForce cần **bốn hàng số liệu đọc được cùng lúc**, không cần một con chữ chiếm nửa màn hình.
3. `Pattern` là "Landing" với section "How it works" và CTA "Start trial / Contact" — BikeForce không có landing page, không có người lạ ghé thăm, không có trial.

Chính skill có quy tắc `style-match` ("Match style to product type") và hướng dẫn xử lý ở mục *Tips*: **"Can't decide on style/color → Re-run `--design-system` with different keywords"**. Đã chạy lại (lệnh #2), vẫn ra kết quả cũ. Theo đúng tinh thần đó, chuyển sang tra trực tiếp `--domain style` (lệnh #4) và lấy kết quả xếp hạng 1 làm nền.

> **Ghi nhận trung thực:** design system cuối cùng của BikeForce **không** phải là output trực tiếp của `--design-system`. Nó được ghép từ các kết quả `--domain style` / `--domain color` / `--domain typography` / `--domain ux` của cùng skill, cộng với một bước kiểm định contrast độc lập (§4). Quyết định này được ghi thành **DEC-012**.

---

## 2. Design direction (Master Spec §49 — *design direction*)

### 2.1 Ba nguồn được ghép lại

| Thành phần | Lấy từ | Đóng góp gì cho BikeForce |
|---|---|---|
| **Swiss Modernism 2.0** *(nền)* | `--domain style` kết quả 1 | Lưới 12 cột, spacing toán học 8px, phân cấp bằng kích thước + khoảng trắng chứ không bằng màu, **một** màu nhấn duy nhất, không trang trí. Chỉ số của skill: `Accessibility: WCAG AAA`, `Performance: ⚡ Excellent`, `Tailwind 10/10`, `Complexity: Low`. |
| **Executive Dashboard** *(khối KPI)* | `--domain style` kết quả 4 | Tối đa 4–6 thẻ KPI lớn, chỉ số hiển thị 24–48px, đèn giao thông xanh/vàng/đỏ, "một màn hình nhìn hết", mobile rút gọn. Áp dụng cho `/sales/today` và `/admin`. |
| **Flat Design** *(cảm giác tương tác)* | `--domain style` kết quả 3, khớp với `--domain product` kết quả 1 | Không gradient, không đổ bóng nặng, chuyển cảnh 150–200ms, màu đặc, icon dẫn dắt. Bảng màu giới hạn 4–6 màu chức năng. |

### 2.2 Những gì đã cân nhắc và bác bỏ

| Bác bỏ | Xếp hạng của công cụ | Lý do bác bỏ |
|---|---|---|
| **Exaggerated Minimalism** | Output của `--design-system` | Sai loại sản phẩm — xem §1.1. |
| **Bento Box Grid** | `--domain style` #2 | Card kích thước lệch nhau (1x1, 2x1, 2x2) là điểm mạnh cho trang marketing, nhưng bảng đối chiếu của BikeForce có **đúng 4 chỉ tiêu ngang hàng nhau**. Cho chúng kích thước khác nhau tạo ra một thứ tự quan trọng giả, làm mắt phải dừng lại suy nghĩ thay vì quét thẳng. |
| **Glassmorphism** | `--domain style` #6 | Chính dữ liệu của skill gắn cờ `Performance: ⚠ Good` và `Accessibility: ⚠ Ensure 4.5:1`. Thêm nữa, nền mờ giảm tương phản — hỏng đúng bối cảnh sử dụng thật là **ngoài nắng**. |
| **GSAP scroll choreography** | Snippet đính kèm design system | Dial motion đặt 2/10 và Master Spec §4 nói "Không animation dư thừa". ~70KB JS đổi lấy 0 giá trị nghiệp vụ — **DEC-015**. |

### 2.3 Tính cách thị giác cần đạt (Master Spec §4)

Hiện đại · chuyên nghiệp · mạnh mẽ · gọn · dễ đọc · mang cảm giác **Field Sales / Sales Performance**.

Cách thể hiện cụ thể, không nói chung chung:
- "Mạnh mẽ" thể hiện bằng **số to và tương phản cao**, không bằng màu loè loẹt hay đổ bóng.
- "Chuyên nghiệp" thể hiện bằng **nhịp spacing đều 8px** và căn cột số thẳng hàng, không bằng hiệu ứng.
- "Gọn" nghĩa là mỗi màn hình có **đúng một hành động chính**, phần còn lại là thông tin.
- Liên tưởng ngành xe đạp được xử lý **rất tiết chế**: chỉ ở logo/wordmark và thẻ ảnh chia sẻ. Không dùng icon bánh xe làm hoạ tiết nền, không dùng hình xe đạp trang trí trong form nhập liệu.

---

## 3. Typography (Master Spec §49 — *typography*)

### 3.1 Quyết định font và lý do đi khác công cụ

Kết quả `--domain typography` xếp hạng 1 là cặp **"Dashboard Data" = Fira Code (heading) + Fira Sans (body)**. **Không chọn.** Chọn kết quả xếp hạng 4: **"Minimal Swiss" = Inter, một họ font duy nhất** (`Best For: Dashboards, admin panels, documentation, enterprise apps, design systems`) — **DEC-013**.

Ba lý do:

1. **Payload.** Một họ font thay vì hai giảm khoảng một nửa dung lượng font phải tải. Sales dùng mạng di động ngoài thị trường; quy tắc `font-loading` và `font-preload` (skill §3 Performance) đều chỉ về hướng này, và nó phục vụ trực tiếp NFR-001.
2. **Tiếng Việt.** Inter có bộ dấu tiếng Việt đầy đủ, đã được kiểm chứng rộng rãi — quan trọng vì toàn bộ giao diện là tiếng Việt và chữ có dấu bị vỡ là lỗi rất dễ lọt.
3. **Mục đích của font mono đã có cách khác đạt được.** Lý do duy nhất khiến cặp Mono+Sans được đề xuất là **căn thẳng cột số**. Quy tắc `number-tabular` của chính skill nói rõ: *"Use tabular/monospaced figures for data columns, prices, and timers to prevent layout shift"*. `font-variant-numeric: tabular-nums` của Inter đạt đúng mục đích đó mà không tốn thêm một họ font.

**Phương án dự phòng đã ghi nhận:** nếu font nhúng cho thẻ ảnh 9:16 (DEC-010) gặp vấn đề hiển thị dấu, chuyển sang **Be Vietnam Pro** — font thiết kế riêng cho tiếng Việt.

### 3.2 Cấu hình

```ts
// app/layout.tsx — ĐỀ XUẤT, chưa triển khai
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],   // 'vietnamese' là BẮT BUỘC
  display: 'swap',                     // rule font-loading — không để FOIT
  variable: '--font-sans',
})
```

```css
/* app/globals.css */
:root { --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif; }
body  { font-family: var(--font-sans); }

/* Mọi số liệu: KPI, bảng đối chiếu, tiền, %, ngày */
.tabular { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }
```

### 3.3 Type scale

Thang từ quy tắc `font-scale` ("Use consistent modular scale, e.g. 12 14 16 18 24 32"), mở rộng thêm 20/40 cho số KPI:

| Token | px | rem | Line-height | Weight | Dùng cho |
|---|---:|---|---|---|---|
| `text-xs` | 12 | 0.75 | 1.5 | 400/500 | Helper text, nhãn phụ, timestamp. **Không dùng cho nội dung chính.** |
| `text-sm` | 14 | 0.875 | 1.5 | 400/500/600 | Nhãn form, nội dung trong bảng, badge, nút phụ |
| `text-base` | 16 | 1 | 1.5 | 400 | **Body. Mức tối thiểu cho mọi `<input>` trên mobile.** |
| `text-lg` | 18 | 1.125 | 1.4 | 500/600 | Tiêu đề card, nhãn chỉ tiêu trong bảng đối chiếu |
| `text-xl` | 20 | 1.25 | 1.35 | 600 | Tiêu đề section |
| `text-2xl` | 24 | 1.5 | 1.3 | 600/700 | Tiêu đề trang (h1 trên mobile) |
| `text-3xl` | 32 | 2 | 1.25 | 700 | Số KPI trên mobile |
| `text-4xl` | 40 | 2.5 | 1.2 | 700 | Số KPI trên desktop, số lớn trên thẻ ảnh |

**Quy tắc bắt buộc:**
- `readable-font-size` — **mọi `<input>`, `<select>`, `<textarea>` phải `font-size: 16px`**. Dưới 16px iOS Safari tự phóng to trang khi focus, làm layout nhảy và người dùng phải zoom ra thủ công. Đây không phải chuyện thẩm mỹ.
- `line-height` — body 1.5, heading 1.2–1.35.
- `line-length-control` — mobile 35–60 ký tự/dòng, desktop 60–75. Ghi chú cuối ngày và text dài dùng `max-w-prose`.
- `weight-hierarchy` — heading 600–700, body 400, nhãn 500. Không dùng weight 900 (đó là di sản của style đã bị bác bỏ).
- `truncation-strategy` — **ưu tiên xuống dòng hơn cắt chữ**. Chỉ cắt bằng `line-clamp` ở danh sách, và luôn có đường dẫn xem đầy đủ.
- `letter-spacing` — giữ mặc định cho body. Chỉ siết `-0.02em` cho `text-3xl`/`text-4xl`.

---

## 4. Color (Master Spec §49 — *color*)

### 4.1 Nguyên tắc: mọi tỉ lệ dưới đây đã được TÍNH, không ước lượng

**Bảng màu hiện hành lấy từ LOGO CHÍNH THỨC — DEC-046** (thay bảng giá trị của DEC-014, giữ nguyên *phương pháp* của nó). Logo: xe đạp **cam** trên nền **trắng**, chữ hiệu **xanh dương** ⇒ **trắng chủ đạo, cam và xanh dương là màu phụ**.

Toàn bộ cặp màu được tính bằng công thức relative luminance của WCAG 2.x, và **những giá trị không đạt đã bị chỉnh độ sáng** — giữ đúng sắc của logo, chỉ đủ để qua ngưỡng. NFR-007 yêu cầu WCAG 2.2 AA thật, không phải "trông có vẻ đủ tương phản", và **không** được nới để chiều màu thương hiệu.

### 4.2 Token chính (light theme)

| Token | Hex | Dùng cho | Contrast đã đo |
|---|---|---|---|
| `--color-background` | `#F4F7FA` | Nền app — một hơi xanh thương hiệu | card trên nó **1.08:1** — đủ để hover `secondary`/`ghost` nhìn thấy được |
| `--color-card` | `#FFFFFF` | Bề mặt card, bảng, form | — |
| `--color-foreground` | `#0F172A` | Chữ chính | trên nền **16.60:1** · trên card **17.85:1 · AAA** |
| `--color-heading` | `#0B4A76` | Riêng tiêu đề — xanh logo đậm | trên nền **8.66:1** · trên card **9.31:1 · AAA** |
| `--color-muted-foreground` | `#566A7B` | Chữ phụ, helper text | trên nền **5.22:1** · trên card **5.61:1 · AA** |
| `--color-primary` | `#1273B8` | Nút chính, nav active, link | chữ trắng trên nó **5.04:1 · AA** · làm chữ trên card **5.04:1 · AA** |
| `--color-primary-hover` | `#0F5F98` | Hover/active của nút chính | chữ trắng trên nó **6.75:1 · AA** |
| `--color-secondary` | `#2E93D0` | Nhấn phụ, chuỗi dữ liệu 2 | trên card **3.39:1** — đủ WCAG 1.4.11 cho **đồ hoạ**, **không** dùng làm chữ |
| `--color-accent` | `#E9A04F` | **Nền** CTA cam + **chính hình logo** | `foreground` trên nó **8.17:1 · AAA**. Chữ **trắng** trên nó chỉ **2.19:1 ⇒ CẤM** |
| `--color-accent-hover` | `#D98324` | Hover của CTA cam | `foreground` trên nó **6.14:1 · AA** |
| `--color-accent-text` | `#97580B` | **Chữ** cam trên nền sáng | trên nền **5.26:1** · trên card **5.65:1 · AA** |
| `--color-success` | `#15803D` | Nền success có chữ trắng | chữ trắng trên nó **5.02:1 · AA** |
| `--color-warning` | `#B45309` | Nền warning có chữ trắng | chữ trắng trên nó **5.02:1** · làm chữ trên nền **4.67:1 · AA** |
| `--color-destructive` | `#B91C1C` | Nền nguy hiểm có chữ trắng | chữ trắng trên nó **6.47:1** · làm chữ trên nền **6.02:1 · AA** |
| `--color-border` | `#E3E9F0` | Đường kẻ **trang trí** | **1.22:1** — chỉ trang trí, **không bao giờ** làm viền của control |
| `--color-input-border` | `#64748B` | Viền của **control tương tác** | trên card **4.76:1** · trên nền **4.43:1** — vượt ngưỡng WCAG 1.4.11 (≥3:1) |
| `--color-ring` | `#0F5F98` | Focus ring, 2px + offset 2px | trên card **6.75:1** · trên nền **6.28:1** |

### 4.3 Những giá trị đã bị loại vì đo không đạt

Ghi lại để không ai vô tình đưa chúng trở lại:

| Giá trị bị loại | Định dùng cho | Đo được | Vì sao trượt |
|---|---|---:|---|
| **cam logo `#E9A04F`** | **Chữ** hoặc **đồ hoạ mang nghĩa** trên trắng | **2.19:1** | Trượt cả AA (4.5) lẫn ngưỡng đồ hoạ (3.0). Chỉ hợp lệ làm **nền** và làm **chính hình logo** — WCAG miễn trừ logotype (DEC-046) |
| **chữ trắng trên cam logo** | Chữ của CTA cam | **2.19:1** | CTA cam phải dùng chữ tối `#0F172A` (**8.17:1**) |
| **xanh logo `#197DC3`** | `--color-primary` | **4.41:1** | Thiếu **0.09** so với AA. Dùng bản tối hơn 4%: `#1273B8` (**5.04:1**) |
| `#D97706` | Chữ amber trên nền trắng | **3.19:1** | Dưới 4.5:1 của AA cho chữ thường (giá trị cũ của DEC-014) |
| `#16A34A` | Nền success có chữ trắng | **3.30:1** | Dưới 4.5:1. Thay bằng `#15803D`. |
| `#DBEAFE` | Viền (palette gốc đề xuất) | **1.22:1** | Dưới 3:1 của WCAG 1.4.11 cho ranh giới control. |
| `#94A3B8` | Viền input | **2.56:1** | Vẫn dưới 3:1. Phải dùng `#64748B`. |
| `#E3E9F0` làm viền input | Viền input | **1.22:1** | Được giữ lại **chỉ** cho đường kẻ trang trí. |

### 4.4 Badge trạng thái achievement

Bốn trạng thái này do `getAchievementStatus()` trả về (BR-023) — **giao diện không tự quyết ngưỡng**.

| Trạng thái | Điều kiện | Nền | Chữ | Contrast | Icon (Lucide) | Nhãn |
|---|---|---|---|---:|---|---|
| `EXCEEDED` | `≥ 100%` | `#DCFCE7` | `#166534` | **6.49:1** | `TrendingUp` | Vượt mục tiêu |
| `NEAR` | `80% – 99.99%` | `#FEF3C7` | `#92400E` | **6.37:1** | `Minus` | Gần đạt |
| `MISSED` | `< 80%` | `#FEE2E2` | `#991B1B` | **6.80:1** | `TrendingDown` | Chưa đạt |
| `PENDING` | chưa có actual | `#F1F5F9` | `#334155` | **9.45:1** | `Clock` | Chờ số liệu |
| *(info)* | trung tính | `#E0F0FB` | `#0B4A76` | **7.99:1** | `Info` | — |

> **Quy tắc `color-not-only` — bắt buộc.** Mỗi badge phải có **icon + chữ**, không bao giờ chỉ có màu. Khoảng 8% nam giới bị mù màu đỏ-lục; một đội Sales 25 người thì gần như chắc chắn có người không phân biệt được nền xanh với nền đỏ. Ngoài ra ảnh chụp màn hình gửi qua Zalo có thể bị nén màu.

### 4.5 Token cho thẻ ảnh chia sẻ 9:16 (**nền sáng** — DEC-057)

⚠ **ĐỔI HẲN Ở PHASE 14.** Bảng cũ là nền tối `#0B1220` + vàng `#FBBF24`, ra đời **trước** DEC-046 nên nó là mảnh duy nhất của sản phẩm còn nói một thứ tiếng màu khác với phần còn lại. Người dùng nói thẳng: *"tối quá, dùng tone màu logo"*. Bảng hiện hành lấy nguyên token của DEC-046:

| Vai trò | Hex | Trên `#FFFFFF` | Trên sọc `#F4F7FA` |
|---|---|---:|---:|
| Nền thẻ | `#FFFFFF` | — | — |
| Sọc bảng chẵn/lẻ | `#F4F7FA` | 1,08:1 *(tách lớp, không mang chữ)* | — |
| Tên, tiêu đề, số cam kết | `#0B4A76` | **9,31:1 · AAA** | **8,66:1 · AAA** |
| Chữ thân | `#0F172A` | **17,85:1 · AAA** | **16,60:1 · AAA** |
| Nhãn / chú thích | `#566A7B` | **5,61:1 · AA** | **5,22:1 · AA** |
| Chữ sắc cam | `#97580B` | **5,65:1 · AA** | — |
| Vượt mục tiêu | `#166534` | **7,13:1 · AAA** | **6,63:1 · AA** |
| Gần đạt | `#92400E` | **7,09:1 · AAA** | **6,59:1 · AA** |
| Chưa đạt | `#991B1B` | **8,31:1 · AAA** | **7,73:1 · AAA** |
| Nền khối nhấn mạnh | `#FDF1E3` | *(nền)* | `#0F172A` 16,04 · `#97580B` 5,08 · `#566A7B` 5,04 |
| Cam logo — **chỉ vạch/nền** | `#E9A04F` | *đồ hoạ* | — |

**Cặp thấp nhất của cả tấm ảnh là 5,04:1**, vẫn dư ngưỡng AA 4,5:1. Toàn bộ số đo bằng công thức relative luminance của WCAG 2.x, không ước lượng bằng mắt.

⚠ **Chữ trắng trên cam logo đo được 2,19:1 — CẤM tuyệt đối** (DEC-046). Cam chỉ làm vạch trang trí và nền khối nhấn mạnh (chữ tối trên nó).

> **Lưu ý kỹ thuật:** thẻ ảnh render bằng Satori (DEC-010) nên bảng màu này phải viết bằng **hex thuần**, không dùng `oklch()` mà Tailwind v4 sinh ra, và không dùng biến CSS.

---

## 5. Spacing, lưới, breakpoint (Master Spec §49 — *spacing*, *responsive*)

### 5.1 Thang spacing

Quy tắc `spacing-scale` (4/8px) — nhịp bắt buộc, không có giá trị lẻ:

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`

| Cấp | Giá trị | Dùng cho |
|---|---|---|
| Trong component | 4, 8 | Icon–chữ, chip, badge |
| Trong card | 12, 16 | Padding card, khoảng cách field |
| Giữa section | 24, 32 | Khoảng cách giữa các khối |
| Giữa vùng lớn | 48, 64 | Đầu/cuối trang, giữa các nhóm lớn (desktop) |

### 5.2 Breakpoint

Quy tắc `breakpoint-consistency` — **375 / 768 / 1024 / 1440**, thiết kế từ 375 đi lên (`mobile-first`).

| Breakpoint | Từ | Thay đổi bố cục |
|---|---|---|
| *(mặc định)* | 375px | Một cột. Bottom nav. Bảng đối chiếu = 4 card. Admin list = card. |
| `md` | 768px | Bảng đối chiếu chuyển sang `<table>` thật (DEC-019). Admin list chuyển sang `<table>` có `aria-sort`. KPI 2 cột. |
| `lg` | 1024px | Bottom nav **ẩn**, sidebar trái xuất hiện (`adaptive-navigation`). KPI 3–4 cột. |
| `xl` | 1440px | Container tối đa. Tăng gutter ngang. |

Container: `max-w-md` (448px) cho form Sales — dài hơn nữa thì mắt phải đi ngang quá nhiều; `max-w-7xl` cho trang Admin nhiều dữ liệu.

### 5.3 Quy tắc bố cục bắt buộc

- `horizontal-scroll` — **không có cuộn ngang ở bất kỳ đâu trên mobile**. Đây là lý do tồn tại của DEC-019.
- `viewport-units` — dùng `min-h-dvh`, **không** `100vh` (thanh địa chỉ mobile làm `100vh` sai).
- `viewport-meta` — `width=device-width, initial-scale=1`. **Không bao giờ** `user-scalable=no` hay `maximum-scale=1`.
- `safe-area-awareness` — bottom nav và sticky CTA bar phải có `padding-bottom: env(safe-area-inset-bottom)`.
- `fixed-element-offset` — nội dung trang phải có `padding-bottom` bù chiều cao thanh cố định (`pb-20` với nav `h-16`), nếu không mục cuối danh sách bị che.
- `z-index-management` — thang cố định: `0` nội dung · `10` sticky header · `20` bottom nav / sticky CTA · `40` dropdown · `100` dialog + scrim · `1000` toast.
- `orientation-support` — form vẫn dùng được ở landscape; sticky CTA không được chiếm quá 25% chiều cao khi bàn phím mở.

---

## 6. Component specs (Master Spec §49 — *form*, *card*, *button*, *status*)

> Tất cả là **đề xuất, chưa triển khai**. Kích thước tính bằng px.

### 6.1 Button

| Biến thể | Nền | Chữ | Viền | Dùng khi |
|---|---|---|---|---|
| `primary` | `#1E40AF` | `#FFFFFF` | — | Hành động chính duy nhất của màn hình |
| `secondary` | `#FFFFFF` | `#1E40AF` | 1px `#64748B` | Hành động phụ |
| `ghost` | trong suốt | `#0F172A` | — | Huỷ, quay lại |
| `destructive` | `#B91C1C` | `#FFFFFF` | — | Vô hiệu hoá tài khoản, hành động không hoàn tác |

- Kích thước: `h-12` (48px) full-width trên mobile; `h-10` (40px) cho nút phụ trên desktop. **Vùng chạm không bao giờ dưới 44×44** (`touch-target-size`).
- Radius 8px. `cursor-pointer` (`cursor-pointer` rule). `touch-action: manipulation` để bỏ độ trễ 300ms (`tap-delay`).
- **Trạng thái:** `hover` đổi sang `--color-primary-hover` trong 150ms · `active` `scale(0.98)` (`scale-feedback`, không đổi layout bounds) · `focus-visible` ring 2px `#1D4ED8` offset 2px (`focus-states` — **không bao giờ** `outline: none` mà không thay thế) · `disabled` opacity 0.45 + `cursor-not-allowed` + thuộc tính `disabled` thật (`disabled-states`) · `loading` disabled + spinner + chữ đổi thành "Đang lưu…" (`loading-buttons`, `submit-feedback`).
- `destructive-emphasis` — nút nguy hiểm phải **tách khỏi** nút chính về mặt không gian, không đặt cạnh nhau.
- `primary-action` — **mỗi màn hình chỉ một** nút primary.

### 6.2 Input / NumberInput / CurrencyInput / Textarea

- `min-h-[48px]`, `font-size: 16px` (bắt buộc, §3.3), padding `12px 16px`, radius 8px, viền 1px `#64748B`.
- **Label luôn hiện phía trên**, 14px weight 500 (`input-labels` — placeholder **không được** thay label).
- Trường bắt buộc có dấu `*` (`required-indicators`).
- Helper text 12px `#64748B` **luôn hiển thị**, không chỉ trong placeholder (`input-helper-text`).
- Lỗi hiện **ngay dưới field**, 14px `#B91C1C`, có `role="alert"` (`error-placement`, `aria-live-errors`), kèm icon cảnh báo (`color-not-only`).
- Focus: ring 2px `#1D4ED8`, viền đổi sang `#1D4ED8`.
- **NumberInput:** `inputMode="numeric"` `pattern="[0-9]*"` (`input-type-keyboard` — gọi bàn phím số trên mobile), `enterKeyHint="next"`, không dùng `type="number"` để tránh cuộn chuột làm đổi giá trị và tránh spinner khó chạm.
- **CurrencyInput:** gõ số thuần; khi `blur` hiển thị phân nhóm nghìn (`125.000.000`); giá trị gửi đi là **số nguyên** (BR-010, DEC-008). Có 3 chip cộng nhanh `+1tr` `+5tr` `+10tr` — giảm số lần gõ trên bàn phím số điện thoại (NFR-008: ≤6 chạm).
- **Textarea:** `min-h-[96px]`, có bộ đếm ký tự khi còn dưới 100 ký tự cuối (giới hạn 1000 — BR-018).
- `inline-validation` — kiểm tra khi **blur**, không kiểm tra theo từng phím gõ (báo lỗi khi người dùng mới gõ được một ký tự là gây khó chịu).
- `autofill-support` — `autocomplete="email"` / `"current-password"` ở form đăng nhập.
- `password-toggle` — ô mật khẩu có nút hiện/ẩn, nút đó phải có `aria-label`.

### 6.3 Card

`bg-white` · viền 1px `#E2E8F0` · radius 12px · padding 16px (mobile) / 24px (desktop) · **không đổ bóng** (Swiss/Flat — phân tách bằng viền). Card bấm được thì có `hover:border-[#64748B]` và toàn bộ card là vùng chạm.

### 6.4 StatTile (thẻ KPI)

```
┌────────────────────────────┐
│ ▸ Doanh thu          [icon]│  ← nhãn 14px #64748B + icon 20px
│                            │
│ 125.000.000 ₫              │  ← 32px mobile / 40px desktop, weight 700, tabular-nums
│                            │
│ Mục tiêu 150.000.000 ₫     │  ← 14px #64748B
│ ┌──────────────────┐       │
│ │ ▲ 83,3% Gần đạt  │       │  ← badge §4.4, có icon + chữ
│ └──────────────────┘       │
└────────────────────────────┘
```
Tối đa **6** thẻ một màn hình (Executive Dashboard: "KPIs 4-6 maximum"). Số dùng `tabular-nums`. Tiền dài xuống dòng chứ không cắt (`truncation-strategy`).

### 6.5 ComparisonRow — thành phần quan trọng nhất của sản phẩm

Xem §7 để biết bố cục hai chế độ.

### 6.6 BottomNav item

`h-16` tổng chiều cao · mỗi mục tối thiểu 44×44 · icon 24px **và** nhãn 12px (`nav-label-icon` — icon-only làm giảm khả năng khám phá) · mục đang active dùng màu `#1E40AF` + weight 600 + gạch chỉ báo trên (`nav-state-active`) · `aria-current="page"`.

### 6.7 Toast

Góc dưới (mobile: phía trên bottom nav), tự đóng sau 4 giây (`toast-dismiss`: 3–5s), `aria-live="polite"`, **không cướp focus** (`toast-accessibility`). Toast lỗi **không** tự đóng và có nút "Thử lại" (`error-recovery`).

### 6.8 Skeleton · EmptyState · ErrorState

- **Skeleton:** hiện khi tải quá 300ms (`loading-states`, `progressive-loading`). Khối skeleton phải đúng kích thước nội dung thật để không gây layout shift (`content-jumping`).
- **EmptyState:** icon 48px + tiêu đề + một câu giải thích + **một CTA**. Không bao giờ để trắng (`empty-states`).
- **ErrorState:** nói rõ chuyện gì xảy ra + việc cần làm (`error-clarity`: nêu nguyên nhân **và** cách sửa) + nút "Thử lại".

### 6.9 Dialog

Chỉ dùng để **xác nhận hành động nguy hiểm** (`confirmation-dialogs`), không dùng làm điều hướng (`modal-vs-navigation`). Scrim đen 50% (`scrim` 40–60%). Có nút đóng rõ ràng + đóng bằng `Esc` (`modal-escape`). Focus bị bẫy trong dialog khi mở và trả về nút kích hoạt khi đóng.

---

## 7. Bảng đối chiếu — hai chế độ hiển thị (DEC-019)

Đây là màn hình Sales nhìn nhiều nhất, nên không được thoả hiệp.

> ✅ **ĐÃ TRIỂN KHAI ở Phase 5 (2026-08-07).** Component: `features/report-comparison/achievement-table.tsx`
> (bốn chỉ tiêu, hai chế độ) + `achievement-badge.tsx` (badge trạng thái) + `report-notes.tsx`
> (tuyến kế hoạch / mục đích / tuyến thực tế / ghi chú cuối ngày — phần CHỮ, tách khỏi bảng để
> không phá cấu trúc `<table>` ở ≥ 768px). Đang gắn ở **`/sales/today`**; Phase 7 sẽ dùng lại cho
> `/sales/reports/[id]`.
>
> **Kiểm chứng thật trên Chromium 375px + 1440px (2026-08-07): 36/36 PASS** — 4 card ở mobile với
> `<table>` bị ẩn, `<table>` thật có `<caption>` + `scope="row"` ở 1440px, số liệu hai chế độ khớp
> nhau, **không cuộn ngang** ở cả hai, và cả ba tình huống của §7.3 đều đúng.
>
> ⚠ Không nhầm với `features/report-morning/commitment-summary.tsx` — component đó **cố ý chỉ một
> cột** ("Cam kết") và chỉ còn phục vụ `/sales/today/evening`, nơi Sales đang NHẬP thực đạt nên chưa
> có gì để đối chiếu. Đừng gộp hai component làm một.

### 7.1 Mobile (< 768px) — 4 card xếp dọc

```
┌──────────────────────────────────────┐
│ Viếng thăm                           │
│ Cam kết  8 điểm   →   Thực đạt  10   │
│ ┌───────────────────┐                │
│ │ ▲ 125,0%  Vượt MT │                │
│ └───────────────────┘                │
├──────────────────────────────────────┤
│ Doanh số                             │
│ Cam kết  5 xe     →   Thực đạt  4    │
│ ┌───────────────────┐                │
│ │ ▼ 80,0%  Gần đạt  │                │
│ └───────────────────┘                │
├──────────────────────────────────────┤
│ Doanh thu                            │
│ Cam kết  150.000.000 ₫               │
│ Thực đạt 125.000.000 ₫               │  ← tiền dài thì xuống dòng, KHÔNG cắt
│ ┌───────────────────┐                │
│ │ ▼ 83,3%  Gần đạt  │                │
│ └───────────────────┘                │
├──────────────────────────────────────┤
│ Khách hàng                           │
│ Cam kết  12       →   Thực đạt  12   │
│ ┌───────────────────┐                │
│ │ ▲ 100,0% Vượt MT  │                │
│ └───────────────────┘                │
└──────────────────────────────────────┘
```

### 7.2 Từ 768px — bảng thật

```
┌────────────┬──────────────────┬──────────────────┬────────────────────┐
│ Chỉ tiêu   │     Cam kết sáng │         Thực đạt │         Hoàn thành │
├────────────┼──────────────────┼──────────────────┼────────────────────┤
│ Viếng thăm │          8 điểm  │         10 điểm  │  ▲ 125,0% Vượt MT  │
│ Doanh số   │            5 xe  │            4 xe  │  ▼  80,0% Gần đạt  │
│ Doanh thu  │  150.000.000 ₫   │  125.000.000 ₫   │  ▼  83,3% Gần đạt  │
│ Khách hàng │              12  │              12  │  ▲ 100,0% Vượt MT  │
└────────────┴──────────────────┴──────────────────┴────────────────────┘
```
Cột số căn phải, `tabular-nums`. `<caption>` mô tả bảng cho screen reader.

### 7.3 Ba tình huống hiển thị bắt buộc xử lý đúng

| Tình huống | Hiển thị | Nguồn |
|---|---|---|
| Chưa có số liệu cuối ngày | Cột "Thực đạt" là `—`, badge `PENDING` "Chờ số liệu" | BR-023 |
| Vượt xa mục tiêu | `1.250,0%` — hiện đầy đủ, **không cắt về 100%** | BR-004 |
| `target = 0` và `actual > 0` | Ô "Hoàn thành" hiện **số vượt tuyệt đối** có dấu cộng và đơn vị — `+3 xe`, `+2 điểm`, `+5 khách`, `+3.000.000 ₫` — kèm nhãn "Vượt kế hoạch". **Không bao giờ** `NaN` hay `∞` | BR-015 · **APPROVED** (OQ-11) |

Cả ba chuỗi trên do **`lib/kpi.ts` sinh sẵn** (`display`), không component nào tự ghép (NFR-012, DEC-038). Badge trạng thái luôn **icon + text**, không bao giờ chỉ bằng màu: Lucide `TrendingUp` (Vượt mục tiêu / Vượt kế hoạch) · `Minus` (Gần đạt) · `TrendingDown` (Chưa đạt) · `Clock` (Chờ số liệu). Riêng ở trạng thái `PENDING`, badge **chỉ** hiện chữ "Chờ số liệu" — cột "Thực đạt" đã mang dấu `—` rồi, lặp lại thành `— · Chờ số liệu` chỉ thêm nhiễu.

**Một điểm dễ tưởng là lỗi:** `percent = 99.99` hiện `100,0%` nhưng badge vẫn "Gần đạt". BR-014 làm tròn ở hiển thị, BR-023 xét ngưỡng trên số chưa làm tròn — cả hai đang `APPROVED`, xem DEC-038.

---

## 8. Nguyên tắc form mobile (Master Spec §4, §30)

1. **Một field một hàng.** Không ghép hai ô trên cùng một dòng ở mobile — ngón tay không chính xác bằng chuột.
2. **Nhóm theo ý nghĩa** (`field-grouping`): "Kế hoạch tuyến" (tuyến + mục đích) rồi "Chỉ tiêu" (4 con số).
3. **Sticky action bar** ở đáy: nền trắng, viền trên 1px, `padding-bottom: env(safe-area-inset-bottom)`, chứa đúng một nút primary full-width.
4. **Chống mất dữ liệu** (Master Spec §30):
   - Disable nút khi đang gửi, chống double-submit.
   - Toast thành công; lỗi hiện rõ.
   - **Khi request thất bại: giữ nguyên toàn bộ dữ liệu form, không reset.**
   - Cảnh báo `beforeunload` khi rời trang lúc form đang có thay đổi chưa lưu (`sheet-dismiss-confirm`).
   - Draft localStorage (FR-035, `form-autosave`) — **server vẫn là nguồn sự thật duy nhất**, draft chỉ để khôi phục lúc mở lại.
5. **Khi submit lỗi nhiều field:** hiện summary ở đầu form có link neo tới từng field (`error-summary`) **và** tự focus field lỗi đầu tiên (`focus-management`).
6. **Tự động điền họ tên** từ profile, không cho sửa trong form báo cáo (FR-009).
7. **Ngày báo cáo** hiển thị read-only, do server tính (BR-005) — `read-only-distinction`: trạng thái chỉ-đọc phải trông khác trạng thái disabled.

---

## 9. Page inventory (Master Spec §49 — *page inventory*)

> **Ba primitive UI thêm ở Phase 3**, bổ sung cho bộ 6 primitive của Phase 1:
> `components/ui/textarea.tsx` (§6.2 — `min-h-24`, `resize-y` để không sinh cuộn ngang) ·
> `components/ui/form-field.tsx` (bố cục chuẩn label → control → helper/counter → lỗi có `role="alert"` + icon) ·
> `buttonClassName()` xuất từ `components/ui/button.tsx` — để một CTA điều hướng render bằng `<Link>` thật mà vẫn trông và chạm y hệt nút (giữ được mở tab mới, back stack, và ngữ nghĩa cho screen reader).
>
> **Đã kiểm chứng thật trên Chromium 375px và 1440px (2026-08-07)** cho cả ba route Sales: không cuộn ngang, mọi touch target ≥ 44px, mọi input ≥ 48px và ≥ 16px, mọi input có `<label for>`.

| Route | Role | Mục đích | Component chính | Loading | Empty | Error | Mobile → Desktop |
|---|---|---|---|---|---|---|---|
| `/` | any | Redirect theo role | — | spinner | — | về `/login` | như nhau |
| `/login` | public | UC-01 | LoginForm | nút loading | — | lỗi dưới form + banner | **1 cột `max-w-md` canh giữa → CHIA ĐÔI từ `lg`** (DEC-054, §17) |
| `/sales/today` | SALES | UC-03, FR-007 | ✅ **ĐÃ DỰNG (Phase 3)** — badge trạng thái, `CommitmentSummary`, đúng 1 CTA chính | skeleton card | "Chưa có báo cáo hôm nay" + CTA tạo | ErrorState + Thử lại | 1 cột → 2–3 cột KPI |
| `/sales/today/morning` | SALES | UC-04, UC-05 | ✅ **ĐÃ DỰNG (Phase 3)** — `MorningReportForm` | skeleton form | — | lỗi theo field + banner | 1 cột `max-w-md`, sticky CTA |
| `/sales/today/evening` | SALES | UC-06 | ⚠ **TRANG TỐI THIỂU (Phase 3)** — mới có guard vai + BR-007 + `CommitmentSummary` (FR-013). `EveningReportForm` là **Phase 4** | skeleton | — | như trên | như trên |
| `/sales/history` | SALES | UC-09, FR-021 | MonthFilter, ReportListItem, Pagination | skeleton list | "Tháng này chưa có báo cáo" | ErrorState | card → bảng từ 768px |
| `/sales/reports/[id]` | SALES | UC-10, UC-07, UC-08 | ReportDetail, ComparisonTable, ShareButton | skeleton | — | 404 nếu không phải của mình | card → bảng từ 768px |
| `/sales/account` | SALES | UC-11 | ProfileCard, ChangePasswordForm, LogoutButton | skeleton | — | lỗi theo field | 1 cột |
| `/admin` | ADMIN | UC-12, UC-20 | 12 StatTile + AlertList | skeleton từng khối (stream) | "Chưa Sales nào báo cáo hôm nay" | ErrorState từng khối | 1 → 2 → 4 cột |
| `/admin/reports` | ADMIN | UC-13, FR-025 | ReportFilterBar thu gọn, ActiveReportFilters, AdvancedReportFilters, ReportTable/Card, AdminPaginationNav, ExportCsv | skeleton | "Không có báo cáo khớp bộ lọc" + nút xoá lọc | ErrorState | card → `<table>` có `aria-sort` |
| `/admin/reports/[id]` | ADMIN | UC-14 | ReportDetail, ComparisonTable | skeleton | — | 404 | như `/sales/reports/[id]` |
| `/admin/analytics` | ADMIN | UC-15, FR-028 | MonthPicker, SummaryTable, TrendChart *(SHOULD)* | skeleton | "Tháng này chưa có dữ liệu" | ErrorState | 1 cột → 2 cột |
| `/admin/sales` | ADMIN | UC-16, FR-029 | SalesTable, SearchBox, CreateButton | skeleton | "Chưa có Sales nào" + CTA tạo | ErrorState | card → `<table>` |
| `/admin/sales/new` | ADMIN | UC-17 | CreateSalesForm | — | — | lỗi theo field (email trùng, mã NV trùng) | `max-w-md` |
| `/admin/sales/[id]` | ADMIN | UC-18, UC-19, UC-16 | ProfileForm, ActiveToggle, PerformanceCard, HistoryList | skeleton | "Sales này chưa có báo cáo" | 404 | 1 cột → 2 cột |
| `/admin/account` | ADMIN | UC-11, **DEC-063** | **OwnProfileForm** (sửa họ tên / SĐT / mã NV) · ChangePasswordForm · SignOutButton. ⚠ **KHÔNG còn giống `/sales/account`** — trang kia là `ProfileCard` chỉ đọc | — | — | lỗi theo field (mã NV trùng, SĐT sai định dạng) | 1 cột |
| `/api/reports/[id]/share-image` | SALES(own) + ADMIN | UC-08, FR-018 | *(trả PNG, không phải trang)* | — | — | 403/404 dạng JSON | — |

Mỗi route group có đủ `loading.tsx`, `error.tsx`, `not-found.tsx`.

---

## 10. Điều hướng (Master Spec §28 · DEC-018)

### 10.1 Cấu trúc

| | Mobile (< 1024px) | Desktop (≥ 1024px) |
|---|---|---|
| **Sales** | Bottom tab 3 mục: **Hôm nay** (`Home`) · **Lịch sử** (`History`) · **Tài khoản** (`User`) | Sidebar trái cố định, cùng 3 mục |
| **Admin** | Bottom tab 4 mục: **Tổng quan** (`LayoutDashboard`) · **Báo cáo** (`FileText`) · **Sales** (`Users`) · **Tài khoản** (`User`) | Sidebar trái cố định, cùng 4 mục |

**Không bao giờ hiển thị đồng thời bottom nav và sidebar** (`avoid-mixed-patterns`).

### 10.2 Quy tắc áp dụng

| Rule | Áp dụng |
|---|---|
| `bottom-nav-limit` | Tối đa 5 — BikeForce dùng 3 và 4 ✓ |
| `bottom-nav-top-level` | Bottom nav **chỉ** cho màn hình cấp cao nhất. `/sales/today/morning` không phải một tab. |
| `nav-label-icon` | Mỗi mục có icon **và** nhãn chữ |
| `nav-state-active` | Mục hiện tại: màu primary + weight 600 + chỉ báo + `aria-current="page"` |
| `adaptive-navigation` | ≥1024px chuyển sidebar |
| `back-behavior` · `back-stack-integrity` | Trang con có nút Back thật; không bao giờ reset stack hay nhảy về home bất ngờ |
| `state-preservation` | Quay lại `/sales/history` hay `/admin/reports` phải khôi phục tháng đang lọc, trang đang xem và vị trí cuộn |
| `deep-linking` | Mọi màn hình quan trọng có URL riêng, chia sẻ và bookmark được |
| `persistent-nav` | Điều hướng chính luôn tới được từ trang sâu |
| `destructive-nav-separation` | Đăng xuất nằm ở `/…/account`, tách khỏi các mục điều hướng thường |
| `focus-on-route-change` | Sau khi chuyển trang, focus chuyển về vùng nội dung chính |
| `skip-links` | Có link "Bỏ qua điều hướng" cho người dùng bàn phím |

---

## 11. Accessibility (Master Spec §49 — *accessibility* · NFR-007)

Mục tiêu: **WCAG 2.2 mức AA** cho toàn bộ ứng dụng.

| Nhóm | Rule | BikeForce đáp ứng thế nào |
|---|---|---|
| **Tương phản** | `color-contrast`, `color-accessible-pairs`, `contrast-feedback` | Toàn bộ §4 đã đo. Chữ ≥4.5:1, ranh giới control ≥3:1. Cặp không đạt đã bị loại và ghi lại. |
| | `color-not-only` | Mọi badge có icon + chữ (§4.4). Không có thông tin nào chỉ truyền bằng màu. |
| **Bàn phím** | `keyboard-nav` | Thứ tự Tab khớp thứ tự thị giác. Không có bẫy focus ngoài dialog. |
| | `focus-states` | Ring 2px `#1D4ED8` offset 2px. Cấm `outline: none` không thay thế. |
| | `skip-links` | Link "Bỏ qua điều hướng" đầu mỗi trang. |
| **Cấu trúc** | `heading-hierarchy` | h1 → h2 → h3 tuần tự, không nhảy cấp, không dùng heading để tạo kiểu chữ. |
| | `focus-on-route-change` | Chuyển focus về `<main>` sau khi đổi route. |
| **Form** | `form-labels`, `input-labels` | `<label for>` thật cho mọi input. Placeholder không thay label. |
| | `aria-live-errors` | Lỗi field có `role="alert"`. |
| | `error-summary`, `focus-management` | Summary có link neo + tự focus field lỗi đầu tiên. |
| **Chạm** | `touch-target-size` | ≥44×44 cho mọi phần tử bấm được; input 48px. |
| | `touch-spacing` | Khoảng cách ≥8px giữa các vùng chạm liền kề. |
| **Icon** | `aria-labels` | Nút chỉ có icon phải có `aria-label`. |
| | `no-emoji-icons` | **Chỉ dùng Lucide SVG**. Tuyệt đối không dùng emoji làm icon. |
| **Chuyển động** | `reduced-motion` | `@media (prefers-reduced-motion: reduce)` tắt mọi transition. |
| **Chữ** | `dynamic-type` | Dùng `rem`, layout không vỡ khi phóng chữ hệ thống. Không dùng chiều cao cố định cho khối chứa chữ. |
| | `readable-font-size` | Body ≥16px trên mobile. |
| **Zoom** | `viewport-meta` | Không bao giờ chặn zoom. |
| **Bảng** | `sortable-table`, `data-table` | Bảng Admin có `aria-sort`. Nếu thêm biểu đồ (FR-037) thì **bắt buộc** có bảng số liệu tương đương. |
| **Toast** | `toast-accessibility` | `aria-live="polite"`, không cướp focus. |

### 11.1 Pre-Delivery Checklist (phỏng theo `references/pro-rules.md` của skill, chỉnh cho web)

Chạy trước khi đóng bất kỳ phase nào có UI:

- [ ] Đã kiểm tra ở **375px** và ở landscape
- [ ] Đã kiểm tra với `prefers-reduced-motion` bật
- [ ] Đã kiểm tra với cỡ chữ hệ thống lớn nhất — không có chữ bị cắt, không vỡ layout
- [ ] Mọi vùng chạm ≥44×44, không có nội dung nào bị safe-area che
- [ ] Không có emoji nào được dùng làm icon
- [ ] Icon cùng một bộ (Lucide), cùng độ dày nét, cùng thang kích thước
- [ ] Trạng thái nhấn không làm dịch chuyển layout
- [ ] Chỉ dùng semantic color token, không có hex viết thẳng trong component
- [ ] Mọi phần tử bấm được có phản hồi nhấn trong 100ms
- [ ] Micro-interaction nằm trong 150–300ms
- [ ] Trạng thái disabled nhìn rõ là disabled và thật sự không bấm được
- [ ] Thứ tự đọc của screen reader khớp thứ tự thị giác
- [ ] Chữ chính ≥4.5:1, chữ phụ ≥3:1 — **đã đo, không ước lượng**
- [ ] Đường kẻ và trạng thái tương tác đều nhìn thấy được
- [ ] Nội dung cuộn không bị thanh cố định che
- [ ] Nhịp spacing 4/8px được giữ đúng
- [ ] Mọi ảnh/icon có nghĩa đều có nhãn trợ năng
- [ ] Field có label, helper text và thông báo lỗi rõ ràng
- [ ] Không có thông tin nào chỉ truyền bằng màu
- [ ] `axe` không báo lỗi mức serious/critical

---

## 12. Trạng thái màn hình (Master Spec §33 — đủ 9 trạng thái bắt buộc)

| # | Trạng thái | Xuất hiện ở đâu | Người dùng thấy gì |
|---|---|---|---|
| 1 | **Loading** | Mọi trang có dữ liệu | Skeleton đúng kích thước nội dung thật, hiện sau 300ms |
| 2 | **Skeleton** | Danh sách, KPI, bảng | Khối xám bo góc, không có animation nhấp nháy gây khó chịu |
| 3 | **Empty — chưa có báo cáo** | `/sales/today` | Icon + "Hôm nay bạn chưa tạo báo cáo đầu ngày" + nút **Tạo báo cáo đầu ngày** |
| 4 | **Empty — tháng không có báo cáo** | `/sales/history`, `/admin/analytics` | "Tháng MM/YYYY chưa có báo cáo nào" + nút chuyển sang tháng khác |
| 5 | **Auth expired** | Bất kỳ đâu | Banner "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." + nút Đăng nhập. **Dữ liệu form được giữ nguyên**, không reset |
| 6 | **Save failure** | Form đầu ngày / cuối ngày | Toast lỗi không tự tắt + thông báo nêu nguyên nhân và cách xử lý + nút **Thử lại**. **Form giữ nguyên toàn bộ dữ liệu** (Master Spec §12) |
| 7 | **Export failure** | `/sales/reports/[id]` | "Không tạo được ảnh báo cáo" + nguyên nhân + nút Thử lại. Báo cáo đã lưu **không** bị ảnh hưởng |
| 8 | **Unauthorized** | Route sai role | Chuyển hướng về dashboard đúng role kèm thông báo "Bạn không có quyền truy cập trang này" |
| 9 | **404** | ID không tồn tại, hoặc báo cáo của người khác | "Không tìm thấy báo cáo" + nút quay lại. **Không** tiết lộ rằng báo cáo đó tồn tại nhưng thuộc người khác (chống dò ID) |

Bổ sung ngoài Master Spec:

| # | Trạng thái | Ghi chú |
|---|---|---|
| 10 | **Offline** | Banner "Mất kết nối mạng"; nút Lưu chuyển sang trạng thái chờ; draft localStorage giữ dữ liệu |
| 11 | **Tài khoản bị vô hiệu hoá giữa phiên** | Đăng xuất bắt buộc + "Tài khoản của bạn đã bị vô hiệu hoá. Liên hệ quản lý." |
| 12 | **Đang gửi** | Nút disabled + spinner + "Đang lưu…", chống double-submit |
| 13 | **Lưu thành công** | Toast xanh "Đã lưu báo cáo" + nút Xuất ảnh **mới được** enable (BR-002) |

---

## 13. Motion (DEC-015)

Dial motion **2/10 — Subtle**.

| Quy tắc | Áp dụng |
|---|---|
| `duration-timing` | 150–200ms cho micro-interaction; tối đa 250ms cho mở dialog |
| `transform-performance` | **Chỉ** animate `transform` và `opacity`. Không animate `width`/`height`/`top`/`left` |
| `easing` | `ease-out` khi vào, `ease-in` khi ra |
| `exit-faster-than-enter` | Thời gian ra ≈ 60–70% thời gian vào |
| `excessive-motion` | Tối đa 1–2 phần tử chuyển động mỗi màn hình |
| `motion-meaning` | Mỗi chuyển động phải diễn tả một quan hệ nhân–quả. Không có animation trang trí |
| `layout-shift-avoid` | Chuyển động không được gây reflow |
| `reduced-motion` | `@media (prefers-reduced-motion: reduce)` → `transition: none` |

Danh sách đầy đủ những chỗ có chuyển động: nút (màu + scale 0.98 khi nhấn), toast (trượt vào 8px + fade), dialog (fade + scale 0.98→1), skeleton (fade khi thay bằng nội dung thật), bottom nav (đổi màu mục active). **Hết.** Không có gì khác được phép có animation mà không giải trình trong PR.

---

## 14. Thẻ ảnh chia sẻ 9:16 — bố cục (Master Spec §13)

Kích thước cố định **1080 × 1920**, nền **`#FFFFFF`**, render server-side bằng Satori (DEC-010).
Component: **`features/report-share/daily-report-share-card.tsx`** (tên file `kebab-case` theo `AGENTS.md §3`; `DailyReportShareCard` là tên **component**).

> ⚠ **VIẾT LẠI HOÀN TOÀN Ở PHASE 14 (2026-08-11).** Ba quyết định đổi cùng lúc — đọc trước khi tin bất kỳ dòng nào của bản Phase 6:
>
> | | Phase 6 (cũ) | PHASE 14 (hiện hành) |
> |---|---|---|
> | Nền | tối `#0B1220`, nhấn vàng `#FBBF24` | **trắng `#FFFFFF`, tone logo** — **DEC-057** |
> | Số biến thể | một | **hai**: `MORNING` (cam kết) · `EVENING` (kết quả) — **DEC-058** |
> | Khối nhấn mạnh | "DOANH THU THỰC ĐẠT" (số tiền) | **"SỐ KHÁCH LÀM VIỆC"** (tỉ lệ %) — **DEC-056** |
> | Nhãn dòng 3 | `Công nợ` | **`Doanh thu`** — **DEC-056** |

> ⚠ **CẬP NHẬT PHASE 17 (2026-08-14) — DEC-068. Đọc trước bảng ở trên: dòng "Khối nhấn mạnh" đã hết hiệu lực.**
>
> | | PHASE 14 | **PHASE 17 (hiện hành)** |
> |---|---|---|
> | Khối dưới bảng | "SỐ KHÁCH LÀM VIỆC" — chỉ bản chiều | **Cụm LŨY KẾ THÁNG — CẢ HAI biến thể** |
> | Nội dung | một tỉ lệ % của riêng ngày đó | **Doanh số tháng · Doanh thu tháng · Ngày đạt KPI** |
> | Mốc cộng | — | từ ngày 01 → **ngày báo cáo** (chiều) / **hết hôm trước** (sáng) |
>
> `calculateCustomerWorkRate()` vẫn còn trong `lib/kpi.ts` cùng test của nó, nhưng **không tầng trình bày
> nào còn gọi tới**. Đừng thêm lại khối cũ — người dùng yêu cầu bỏ trực tiếp.

> ✅ **ĐÃ KIỂM CHỨNG BẰNG MẮT — render PNG thật cả hai biến thể rồi nhìn (2026-08-11).** Lượt render đầu dùng chung một cỡ chữ cho cả hai biến thể: bản sáng chỉ có 4 con số nên nội dung kết thúc ở ~1030/1920 — **gần nửa tấm ảnh là khoảng trắng**, trông như ảnh lỗi. Đã tăng nhịp dòng riêng cho bản sáng (`ROW_METRICS`), render lại, nhìn lại. Không phép đo nào bắt được lỗi này.

> Toàn bộ chuỗi hiển thị do **`lib/reports/share-card.ts`** dựng (hàm thuần, có unit test); component chỉ render và ánh xạ `status → màu`.

### 14.1 Bản CHIỀU — `EVENING` (`status = 'COMPLETED'`)

```
┌──────────────────────────────────────┐ 1080 × 1920, nền #FFFFFF
│  ▬▬▬▬                                │  vạch cam #E9A04F, 132×10
│   BIKEFORCE                          │  #0B4A76, 50px, weight 700
│   KẾT QUẢ CUỐI NGÀY                  │  #97580B, 26px, letter-spacing 5
│  ──────────────────────────────────  │  đường kẻ 3px #0B4A76
│   Thứ Ba, 11/08/2026                 │  #566A7B, 36px
│   TRƯƠNG CHÍ CƯỜNG                   │  #0B4A76, 64px, weight 700
│   VP-IT-001                          │  #566A7B, 30px
│  ┌────────────────────────────────┐  │  khối nền #F4F7FA
│  │ TUYẾN                          │  │  #566A7B, 24px
│  │ Quận 1 → Quận 5 → Quận 10      │  │  #0F172A, 34px, tối đa 2 dòng
│  └────────────────────────────────┘  │
│   CHỈ TIÊU  CAM KẾT  THỰC ĐẠT  HOÀN  │  header #566A7B, 26px, weight 600
│  ══════════════════════════════════  │  2px #0B4A76
│   Viếng thăm  12 điểm  10 điểm 83,3% │  dòng lẻ nền trắng
│                                Gần đạt│  nhãn chữ #566A7B, 24px
│                          ▰▰▰▱▱  ▁     │  thanh 200×14 + ô lửa 30px — DEC-069
│   Doanh số        1tr      5tr 500,0%│  dòng chẵn nền #F4F7FA (sọc)
│                          ▰▰▰▰▰  🔥    │  vượt >100% ⇒ SVG lửa #E9A04F/#C2410C
│   Doanh thu       1tr      0 ₫   0,0%│  % vượt #166534 · gần đạt #92400E
│   Khách hàng  10 khách 5 khách  50,0%│  % chưa đạt #991B1B
│  ▌┌──────────────────────────────┐   │  vạch cam dọc 10px + nền #FDF1E3
│  ▌│ TỔNG THÁNG 08/2026           │   │  #97580B, 26px, letter-spacing 3
│  ▌│ Tính đến hết ngày 13/08/2026 │   │  #566A7B, 24px — DEC-068
│  ▌│ Doanh số tháng  330.000.000 ₫│   │  nhãn 32px #0F172A · số 38px #0B4A76
│  ▌│ Doanh thu tháng  37.000.000 ₫│   │  số tiền dạng ĐẦY ĐỦ, không rút gọn
│  ▌│ Ngày đạt KPI            5 ngày│  │  BR-024 — đạt cả 4 chỉ tiêu
│  ▌└──────────────────────────────┘   │
│   GHI CHÚ                            │  #566A7B, 26px
│   Khách đóng cửa nhiều, chiều…       │  #0F172A, 32px, tối đa 3 dòng
│  ──────────────────────────────────  │
│   BikeForce · Bicycle Sales System   │  #566A7B, 24px, canh giữa
└──────────────────────────────────────┘
```

### 14.2 Bản SÁNG — `MORNING` (`status = 'MORNING_SUBMITTED'`)

Cùng phần đầu và phần chân. Khác đúng ba chỗ:

1. Chữ dưới wordmark là **`CAM KẾT ĐẦU NGÀY`**.
2. Bảng chỉ **2 cột** (`CHỈ TIÊU` · `CAM KẾT`), dòng cao hơn và số to hơn hẳn (`paddingY: 44`, nhãn `42px`, số `56px` weight 700 màu `#0B4A76`).
   ⚠ **PHASE 17: `paddingY` hạ từ 70 → 44, đừng nâng lại.** Con số 70 sinh ra để lấp khoảng trắng đáy;
   từ DEC-068 cụm lũy kế đã chiếm chỗ đó, và giữ 70 khiến bản sáng **tràn quá 1920px** → chồng chữ (ISSUE-032).
3. **Vẫn có** cụm lũy kế tháng (giống bản chiều, nhưng mốc dừng là **hết ngày hôm trước**), **không có** ghi chú
   cuối ngày; cuối thẻ là một dòng nhắc `#566A7B` 32px: *"Kết quả thực đạt sẽ được gửi vào cuối ngày."* —
   người nhận trên Zalo không có ngữ cảnh nào khác ngoài tấm ảnh.

### 14.3 Ràng buộc bắt buộc

| Ràng buộc | Cách xử lý | Kết quả |
|---|---|---|
| Tên dài 40+ ký tự → xuống dòng, không cắt chữ | không cắt gì cả, để Satori tự wrap | ✅ tên 42 ký tự xuống 2 dòng |
| Tuyến 300 ký tự → cắt an toàn ở 2 dòng, có `…` | `truncateText(route, 104)` ở tầng dữ liệu | ✅ |
| Ghi chú 1000 ký tự → cắt ở 3 dòng, có `…` | `truncateText(note, 174)` ở tầng dữ liệu — hạ từ 232 ở PHASE 17 (ISSUE-032) | ✅ |
| **Nội dung dài tổng cộng vượt 1920px** | `flexShrink: 0` cho mọi khối bắt buộc; riêng ghi chú co được + `overflow: hidden` | ✅ cắt gọn thay vì **chồng chữ** (ISSUE-032) |
| **Lũy kế tháng** khi truy vấn hỏng | `buildShareCardModel(source, null)` → bỏ hẳn cụm | ✅ không in `0 ₫` sai sự thật |
| **Lũy kế tháng** của ảnh sáng ngày 01 | khoảng rỗng (`isEmpty`) → ba số 0 + dòng "Chưa có ngày nào trong tháng" | ✅ không tụt sang tháng trước |
| **Thanh tiến độ** với `250%` | `buildProgress()` clamp `fill` về 1; con số KHÔNG clamp (BR-004) | ✅ thanh đầy + ngọn lửa, chữ vẫn `250,0%` |
| **Ngọn lửa** ở đúng `100,0%` | ngưỡng `percent > 100` **nghiêm ngặt** (DEC-069) | ✅ không cháy — người dùng chốt |
| **Thanh** phải thẳng hàng ở mọi dòng | ô lửa 30px **luôn** chiếm chỗ, kể cả khi không cháy | ✅ bốn thanh thẳng tuyệt đối |
| Ngọn lửa không có glyph trong Inter | vẽ bằng **SVG path 2 lớp**, tuyệt đối không emoji | ✅ Satori dựng được `<svg><path>` |
| Doanh thu 12 chữ số vẫn trong khung | `formatCompactVND()` — nay là đường dùng tiền **duy nhất** của thẻ | ✅ `100tỷ` |
| Achievement 4 chữ số (`1.250,0%`) hiển thị đủ | không clamp (BR-004) | ✅ |
| `target = 0` không bao giờ ra `∞`/`NaN` (BR-015) | lấy nguyên `display` của `lib/kpi.ts` | ✅ `actual = 0` → `100,0%`; `actual > 0` → `+3 điểm` + "Vượt kế hoạch" |
| **Số khách làm việc** với `actual_visit_points = 0` | `calculateCustomerWorkRate()` trả `'—'` | ✅ không bao giờ `∞` |
| **Dấu tiếng Việt đầy đủ** `ừ ẫ ợ ỹ đ Đ Ệ Ỡ` | 3 file `.ttf` Inter nhúng trong `public/fonts/` | ✅ đủ, kèm `₫` (`U+20AB`) |
| Satori không có CSS Grid | flexbox toàn bộ, `display: 'flex'` ở mọi container nhiều con | ✅ |
| Satori không dựng được `<>…</>` | hàng tiêu đề dựng bằng **mảng** `MORNING_HEADER` / `EVENING_HEADER` rồi `.map()` | ✅ |

> ⚠ **Đính chính so với bản trước:** dòng `target = 0` ở đây từng ghi "hiện `—`". Từ **DEC-038** (Phase 5), `—` chỉ dành cho ca **chưa có số liệu**; ca `target = 0 && actual > 0` hiện **số vượt tuyệt đối có đơn vị**. Thẻ ảnh không tự quyết định điều này — nó render `AchievementResult.display`.

**Bốn cái bẫy kỹ thuật đã trả giá thật, ghi lại để không ai mất công lần nữa:**
1. **Satori không đọc `woff2`.** Phải là `.ttf`/`.otf`/`.woff`. Google Fonts trả `woff2` cho trình duyệt hiện đại và trả `.ttf` cho User-Agent lạ — lấy đúng bản `.ttf`.
2. **Subset `vietnamese` của Google Fonts KHÔNG chứa chữ Latin cơ bản** — nó chỉ có các ký tự riêng của tiếng Việt cộng `₫`. Nhúng mỗi subset đó thì chữ thường mất glyph. Dùng file `.ttf` đủ bộ ký tự (2849 glyph, ~320 KB mỗi weight).
3. **Đường kẻ ngang mảnh biến mất sau khi Zalo nén ảnh.** Bảng dùng **sọc nền chẵn/lẻ** `#F4F7FA` thay vì kẻ 1px — một mảng nền rộng chịu được nén, một đường 1,25:1 thì không (DEC-057).
4. **Cam logo `#E9A04F` chỉ làm nền và vạch trang trí.** Chữ trắng trên nó đo được **2,19:1** — DEC-046 cấm tuyệt đối. Chữ sắc cam trên nền sáng dùng `#97580B` (5,65:1).

## 15. PWA (Master Spec §29 · DEC-024 · DEC-047)

Chỉ manifest + icon + `display: standalone` để Sales "Thêm vào màn hình chính". **Không** service worker, **không** offline sync ở v1.

**Đã triển khai (2026-08-10) — `lib/pwa/manifest.ts` là nguồn duy nhất, có 13 unit test khoá lại:**

| File | Kích thước | `purpose` | Vai trò |
|---|---|---|---|
| `public/icons/icon-192.png` · `icon-512.png` | 192 · 512 | `any` | icon thường của manifest |
| `public/icons/icon-maskable-192.png` · `icon-maskable-512.png` | 192 · 512 | `maskable` | nội dung nằm gọn trong vòng an toàn 80% |
| `app/apple-icon.png` | 180 | — | **iOS bỏ qua manifest** — thiếu file này thì iPhone lấy ảnh chụp màn hình làm icon |
| `app/icon.svg` | vector | — | favicon hiện đại **và** bản vector gốc của hình logo |
| `app/favicon.ico` | 32 | — | favicon dự phòng cho trình duyệt cũ |

- **`theme_color` = `background_color` = `#FFFFFF`** (DEC-047), **không** phải xanh thương hiệu: thanh trạng thái nối liền header trắng của app, và màn hình chờ trùng nền trắng của icon.
- Hình icon là **chiếc xe đạp của logo, màu cam `#E9A04F` trên nền trắng** — sinh ra từ cùng bộ toạ độ với `components/ui/brand-mark.tsx` nên logo trên web và icon màn hình chính không thể lệch hình (DEC-046).
- ⚠ **Cùng toạ độ KHÔNG có nghĩa là cùng khung nhìn — ISSUE-030.** Các file trong bảng trên đặt hình vào khung vuông **có đệm đều bốn phía**, còn `BrandMark` lấy khung **khít**, nên riêng bản inline mới cần độ lệch `y`. Bản đầu ghi `viewBox="0 0 101 75"` (đúng kích thước, thiếu độ lệch) và **chém mất 12,92 đơn vị ~17% chiều cao ở đáy hai bánh xe** suốt từ Phase 13 — trong khi bộ icon vẫn đúng, nên không có gì để đối chiếu. Giá trị đúng là **`viewBox="0 13.07 101 74.86"`**; luật E2E `logo-clipped` khoá nó lại.
- **`/manifest.webmanifest` phải đọc được khi chưa đăng nhập** — trình duyệt tải nó không kèm cookie. Đã thêm `webmanifest` vào `PUBLIC_FILE` của `middleware.ts`, có bài E2E khoá lại (`e2e/pwa.spec.ts`).

---

## 16. Dark mode

**Không có ở v1** — DEC-016. Ứng dụng chỉ có light theme. ⚠ Câu cũ ở đây ghi *"thẻ ảnh 9:16 nền tối là quyết định thiết kế riêng của tấm ảnh"* — **hết hiệu lực từ PHASE 14**: thẻ ảnh nay cũng nền sáng (DEC-057), nên sản phẩm không còn bề mặt tối nào.

Điều này được ghi ra thành **quyết định** để không bị hiểu nhầm là nợ kỹ thuật bị bỏ quên. Nếu sau này làm dark mode, phải đo lại **toàn bộ** bảng contrast ở §4 cho theme tối — quy tắc `color-dark-mode` nói rõ dark mode dùng biến thể nhạt/giảm bão hoà chứ **không phải đảo ngược màu**.

---

## OPEN QUESTIONS

Danh sách đầy đủ ở `docs/01-business-analysis.md` §OPEN QUESTIONS. Những câu ảnh hưởng trực tiếp tới tài liệu này:

| ID | Câu hỏi (rút gọn) | Đề xuất mặc định | Đổi gì ở UI |
|---|---|---|---|
| **OQ-01** | "Mục tiêu viếng thăm" là số điểm hay mục đích chuyến đi? | Cả hai: `target_visit_points` (số) + `visit_purpose` (text) | Nếu bỏ phần số thì bảng đối chiếu (§7) chỉ còn **3 dòng** thay vì 4, và form đầu ngày bớt một ô số |
| **OQ-02** | "Đã viếng thăm" là con số hay tuyến thực tế? | Cả hai: `actual_visit_points` + `actual_route` | Tương tự OQ-01 cho form cuối ngày |
| **OQ-11** | `target = 0` thì ô % hiển thị gì? | `actual=0` → 100%; `actual>0` → `—` + "Vượt kế hoạch" | Quyết định nội dung ô "Hoàn thành" ở §7.3 và trên thẻ ảnh §14 |
| OQ-07 | Tuyến nhập tự do hay chọn từ danh sách? | Tự do + gợi ý 5 tuyến gần nhất | Đổi `Input` thành `Combobox`/`Select` ở form đầu ngày |
| OQ-09 | KPI do Sales tự cam kết hay Admin giao? | Sales tự cam kết | Nếu Admin giao thì form đầu ngày trở thành **read-only** với Sales, và cần một màn hình mới cho Admin |

---

## Tài liệu liên quan

| Nội dung | Tài liệu chủ |
|---|---|
| Route đầy đủ, ranh giới client/server, cấu trúc thư mục | `docs/04-system-architecture.md` |
| Luồng màn hình và luồng lỗi end-to-end | `docs/03-workflow.md` |
| Chữ ký Server Action, thông báo lỗi cho người dùng | `docs/07-api-data-flow.md` |
| Test viewport mobile và test accessibility | `docs/08-testing-strategy.md` |
| Trạng thái của DEC-012..DEC-019 (đều APPROVED) | `docs/11-decisions.md` |
| Rủi ro ISSUE-002 (Satori), ISSUE-003 (Zalo webview) | `docs/12-known-issues.md` |

---

## CẬP NHẬT PHASE 7–11 (2026-08-10) — page inventory đầy đủ và đặc tả biểu đồ trend

### §16.1 — Page inventory: 18 route, tất cả đã dựng thật

| Route | UC / FR | Ghi chú hiển thị |
|---|---|---|
| `/login` | UC-01, FR-001 | DEC-017 |
| `/sales/today` | UC-03, FR-007 | badge trạng thái · bảng đối chiếu 4 chỉ tiêu · **đúng 1 CTA chính** · khối xuất ảnh khi đã có báo cáo: **ảnh xem trước LUÔN hiện** + nút *Gửi qua Zalo* (điện thoại) + nút *Tải ảnh về máy* (mọi thiết bị) — DEC-064 |
| `/sales/today/morning` | UC-04, UC-05, FR-008 | 5 trường bắt buộc · chip cộng nhanh · nút Lưu **sticky** đáy |
| `/sales/today/evening` | UC-06, FR-013, FR-014 | mỗi ô nhắc lại con số cam kết sáng |
| `/sales/history` | UC-09, FR-021 | **MỚI** — lọc tháng · card < 768px, `<table>` từ 768px (DEC-019) · phân trang · empty state có icon + CTA |
| `/sales/reports/[id]` | UC-10, FR-022 | **MỚI** — dùng lại `AchievementTable` + `ReportNotes` + `ShareImageButton`, không viết lại |
| `/sales/account` | UC-11, FR-023 | **MỚI** — đúng 3 khối: hồ sơ · đổi mật khẩu · đăng xuất. **Không** có form sửa hồ sơ (`docs/06 §7 (b)`) |
| `/admin` | UC-12, FR-024 | **MỚI (thật)** — 12 chỉ số · cảnh báo chưa báo cáo · Suspense + Skeleton |
| `/admin/reports` | UC-13, FR-025, FR-026 | **MỚI** — 7 chiều lọc · tìm theo tên · phân trang server-side · nút Xuất CSV |
| `/admin/reports/[id]` | UC-14, FR-027 | **MỚI** — BR-022, Admin xem được báo cáo bất kỳ |
| `/admin/analytics` | UC-15, FR-028, FR-037 | **MỚI** — tổng 4 chỉ tiêu · **biểu đồ trend theo ngày** · chọn tháng bằng link |
| `/admin/sales` | UC-16, FR-029 | **MỚI** — bảng hiệu suất + số ngày đạt KPI (BR-024) |
| `/admin/sales/new` | UC-17, FR-030 | **MỚI** — mật khẩu tạm hiện **đúng một lần**, cố ý không redirect sau khi tạo |
| `/admin/sales/[id]` | UC-18, UC-19, FR-031, FR-032 | **MỚI** — hồ sơ · sửa · bật/tắt `is_active` · lịch sử báo cáo |
| `/admin/account` | FR-023, **DEC-063** | hồ sơ **sửa được** (họ tên · SĐT · mã NV) · đổi mật khẩu · đăng xuất. Email và vai trò chỉ đọc, dạng `<dl>` chứ không phải `<input disabled>` |
| `/api/reports/[id]/share-image` | UC-08, FR-018 | Route Handler, PNG 1080×1920 |
| `/api/admin/reports/export` | UC-21, FR-034 | **MỚI** — Route Handler, CSV (DEC-042) |
| `/` | FR-005 | phân luồng theo role |

### §16.2 — Điều hướng (DEC-018) — đã dựng

- **Sales: 3 mục** — Hôm nay · Lịch sử · Tài khoản. **Admin: 4 mục** — Tổng quan · Báo cáo · Sales · Tài khoản. Cả hai đều **≤ 5 mục**.
- Mỗi mục có **icon VÀ chữ**. Không dùng emoji làm icon.
- **< 1024px:** bottom nav cố định. Mọi trang có danh sách phải có `pb-20` để nav không che dòng cuối.
- **≥ 1024px:** sidebar cố định bên trái. **Không bao giờ hiển thị đồng thời cả hai.**
- Trạng thái active xác định bằng **tập tiền tố đường dẫn**, không phải so sánh chuỗi bằng nhau — `/sales/reports/<id>` thuộc về mục "Lịch sử" dù `href` là `/sales/history`. Bảng tiền tố nằm ở `lib/navigation/nav-items.ts` (hàm thuần, có unit test).
- Trang con có `BackLink` với **`href` tường minh**, không dùng `router.back()`: mở trang từ một link Zalo thì lịch sử trình duyệt trống, "quay lại" sẽ rơi ra ngoài ứng dụng.

### §16.3 — Bảng và danh sách: một luật, không ngoại lệ

Mọi bảng render **hai nhánh cùng lúc trong DOM**: card xếp dọc cho `< 768px` (`md:hidden`) và `<table>` thật từ `768px` (`hidden md:table`) — DEC-019. Không cuộn ngang ở bất kỳ bề rộng nào, đã đo bằng E2E ở cả ba project.

> ⚠ Hệ quả cho người viết test và người debug: **mỗi con số xuất hiện hai lần trong DOM**, và ở 1440px thì bản đứng **trước** chính là bản bị ẩn. Đây là nguyên nhân đã làm 4 bài E2E đỏ cùng lúc — xem `docs/08 §E`.

### §15 — Biểu đồ trend theo ngày (FR-037, AF-08) — đặc tả đã dựng thật

**Hình thức:** biểu đồ cột, một cột cho mỗi ngày **có báo cáo hoàn tất**. Mỗi cột gồm hai lớp:

- **khung cam kết** — chỉ viền (`--color-input-border`, 4.76:1), rộng 72% khe;
- **cột thực đạt** — nền đặc, rộng 50% khung cam kết, vẽ **đè lên giữa** để lộ khung tham chiếu; màu theo BR-023: `EXCEEDED` → `--color-success` · `NEAR` → `--color-warning` · `MISSED` → `--color-destructive`.

**Bốn ràng buộc bắt buộc:**

1. **Không có CHỮ nào bên trong `<svg>`.** Nhãn ngày là HTML (`<li class="flex-1">`) đặt ngay dưới, nên nhận đúng `--text-xs` như phần còn lại của trang. Lý do: SVG có viewBox cố định cộng `width: 100%` sẽ phóng to theo màn hình — ở 1440px là **2,7 lần**, biến chữ 11px thành ~30px và biểu đồ cao 540px. Đã nhìn thấy trên ảnh chụp thật (DEC-044).
2. **`preserveAspectRatio="none"` + chiều cao cố định bằng CSS** (`h-40 md:h-52`). Mọi nét vẽ dùng `vector-effect="non-scaling-stroke"`, nếu không phép kéo ngang làm viền dày mỏng không đều.
3. **Phương án `data-table` thay thế là BẮT BUỘC.** `<svg role="img">` mang `aria-label` tóm tắt (số ngày có báo cáo, số ngày đạt chỉ tiêu), và ngay dưới là một `<table>` **thật** trong `<details>` chứa đúng những con số đã vẽ — vẫn nằm trong DOM, vẫn tìm được bằng `Ctrl+F`.
4. **Màu không bao giờ là kênh thông tin duy nhất.** Có chú giải bằng chữ ("Cam kết / Đạt / Gần đạt / Chưa đạt") và bảng bên dưới có cột "Hoàn thành" bằng chữ.

**Gridline:** 3 vạch ngang màu `--color-border`, mảnh, **không kèm nhãn số**. Nhãn tiền VND đầy đủ không đọc được ở cỡ chữ trục, mà rút gọn thì phải dùng `formatCompactVND` — hàm đó **chỉ** dành cho thẻ ảnh 9:16 (kết luận Phase 6). Con số lớn nhất hiện bằng chữ thường ở dòng mô tả phía trên ("Cao nhất: …"), con số chính xác nằm ở bảng.

**Nhãn trục X giãn thưa:** tối đa 8 nhãn. Với 31 ngày thì hiện ngày 01, 05, 09, … — đủ để định vị mà không chồng chữ ở 375px.

**Chọn chỉ tiêu:** bốn `<Link>` thật đổi `?metric=`, **không phải state client**. Đổi chỉ tiêu là đổi câu hỏi đang xem nên nó thuộc về URL: chia sẻ được, quay lại được bằng nút Back, và không cần một byte JavaScript nào.

---

## CẬP NHẬT PHASE 13 (2026-08-10) — nhãn chỉ tiêu, thứ tự khối, Đăng xuất, phản hồi khi chạm

> Nguồn: **DEC-048** · **DEC-049** · **DEC-050** · **DEC-051** · **DEC-052** ·
> `PROJECT_CHECKLIST.md §13`.

### 13.1 Nhãn bốn chỉ tiêu — đổi ở ĐÚNG MỘT NƠI

| Chỉ tiêu | Nhãn đầy đủ (web, Admin, CSV) | `shortLabel` (chỉ thẻ ảnh 9:16) | Đơn vị |
|---|---|---|---|
| `VISIT_POINTS` | Viếng thăm | Viếng thăm | `điểm` |
| `SALES_AMOUNT` | Doanh số | Doanh số | **VND** |
| `REVENUE` | **Doanh thu công nợ** | **Doanh thu** *(đổi ở PHASE 14 — DEC-056)* | **VND** |
| `CUSTOMER_VISITS` | **Khách hàng đã gặp** | Khách hàng | `khách` |

`shortLabel` sinh ra vì cột nhãn của thẻ ảnh có **bề rộng cố định** và Satori **không đo được chữ**
để tự thu nhỏ. Nó vẫn nằm trong `lib/reports/metric-rows.ts` — cùng một nguồn duy nhất — chứ không
phải component tự cắt chuỗi.

⚠ **Không component nào được viết cứng bốn nhãn này.** `commitment-summary.tsx` từng viết cứng và đã
được sửa để đọc `KPI_METRIC_ROWS`; nếu không, màn hình đó sẽ âm thầm nói khác ba màn hình còn lại.

### 13.2 Form cam kết đầu ngày — còn **5** trường

Bỏ hẳn "Mục đích chuyến đi" (DEC-048). Thứ tự và kiểu ô:

1. **Tuyến ghé thăm** — `<textarea>`
2. **Mục tiêu điểm viếng thăm** — ô số, helper *"Số điểm dự kiến ghé trong ngày. **Tối thiểu 10**."*
3. **Mục tiêu doanh số** — **`CurrencyField`** (chip cộng nhanh `+1tr/+5tr/+10tr`)
4. **Mục tiêu doanh thu công nợ** — **`CurrencyField`**
5. **Mục tiêu số lượng khách hàng** — ô số, `enterKeyHint="done"`

Form cuối ngày đối xứng: hai ô tiền dùng `CurrencyField`, và câu nhắc *"Cam kết sáng: …"* gọi
`formatMetricValue()` chứ **không tự ghép đơn vị** — bản cũ tự ghép và đó đúng là chỗ đã nói sai đơn
vị khi DEC-050 đổi doanh số sang tiền.

### 13.3 Thứ tự khối của một báo cáo — giống nhau ở **cả ba** màn hình

`Tuyến và ghi chú` → `Cam kết và thực đạt`, áp cho `/sales/today`, `/sales/reports/[id]` và
`/admin/reports/[id]`. Buổi sáng Sales cần thấy ngay mình định đi đâu; bảng số chỉ có nghĩa sau khi
đã ra thị trường. Ba màn hình cùng trình bày một báo cáo thì không được bắt người dùng học ba bố cục.

### 13.4 Đăng xuất ở header — và cách giải bề rộng 375px

> ⚠ **Mục này đã được DEC-054 sửa một phần** — xem **§17.2** cho bản hiện hành của bước xác nhận.
> Phần dưới đây vẫn đúng về *nút bấm*; phần *panel xác nhận* thì không còn.

Nút nằm **góc trên bên phải** của cả hai route group, cạnh bản ở `/…/account` (giữ nguyên).

| Bề rộng | Hiển thị | Vì sao |
|---|---|---|
| < `sm` (**375px**) | **chỉ icon** + `aria-label="Đăng xuất"` | chiếm 44px thay vì ~120px, không bóp tên người dùng |
| ≥ `sm` (**375px**) | icon + chữ "Đăng xuất" | đã có chỗ |

⚠ Ghi chú cũ ghi ngưỡng là **640px** — **sai**. Dự án khai lại `--breakpoint-sm: 375px` (§ token), nên
`hidden sm:inline` bật chữ ngay từ 375px. Nghĩa là **mọi điện thoại phổ biến đều thấy chữ**; chỉ máy
hẹp hơn 375px mới rơi về icon-only. Con số 640px là mặc định của Tailwind, không phải của dự án này.

Khối tên có `min-w-0` + `truncate`, nút có `shrink-0` ⇒ tên dài cắt bằng "…" thay vì đẩy nút ra khỏi
màn hình.

~~Panel xác nhận định vị `absolute top-full` **dưới** thanh header~~ — **hết hiệu lực từ DEC-054**,
xem §17.2.

### 13.5 Phản hồi khi chạm — `tap-feedback-speed` < 100 ms

`components/ui/link-spinner.tsx` dùng `useLinkStatus()` của Next và **phải nằm bên trong `<Link>`**
(hợp đồng của hook — đặt ra ngoài thì `pending` mãi `false`, không có lỗi nào được ném ra).

Dự án đã có `loading.tsx`, nhưng nó chỉ hiện **sau khi** Next bắt đầu render trang đích; quãng từ
lúc chạm tới đó trên 4G là khoảng lặng khiến Sales bấm lại lần hai.

Chuyển động là `rotate` thuần (transform) nên không phá luật "chỉ transform/opacity".
`prefers-reduced-motion` đã có quy tắc toàn cục ở `app/globals.css`, cộng `motion-reduce:animate-none`
trên chính spinner.

### 13.6 Bảng số liệu của biểu đồ trend — hai nhánh theo DEC-019

Thẻ ở `< 768px`, `<table>` thật từ `768px`. **Đo được thật:** bản một-bảng-cho-mọi-bề-rộng **tràn
ngang 116px ở 375px** sau khi doanh số thành tiền — bốn cột gồm ngày kiểu "Chủ Nhật, 02/08/2026" và
ba cột số kiểu `100.000.000.000 ₫` không có cách kê chữ nào vừa 375px.

⚠ Lỗi này **không lộ ra** ở lượt soát đầu vì `<details>` đang đóng. **Soát bố cục phải mở mọi
`<details>` trước khi đo.**

### 13.7 Kết quả soát UI/UX bằng máy (13b)

**20 URL × 2 bề rộng**, đo trên DOM đã render — không phải đọc code đoán:

| Luật | Kết quả |
|---|---|
| `color-contrast` | **~2.400 cặp thực tế chồng nhau — 0 vi phạm.** Thấp nhất **4,68:1** (AA cần 4,5). Nền lấy bằng cách **leo cây tổ tiên** tới màu đầu tiên không trong suốt, tức đúng cặp mắt người thấy — bài học ISSUE-018 |
| `touch-target-size` | **0** phần tử tương tác dưới 44px (9–60 phần tử mỗi trang) |
| `readable-font-size` | **0** `<input>` dưới 16px · **0** chữ dưới 12px |
| `horizontal-scroll` | **1 vi phạm** → đã sửa bằng DEC-052 |
| `dynamic-type` | phóng cỡ chữ gốc lên **150%** — bố cục **không vỡ** |
| `reduced-motion` | đã có quy tắc toàn cục sẵn |

**Bảng màu DEC-046 không phải sửa token nào.**

---

## CẬP NHẬT PHASE 13 — DEC-053: lớp SOFT UI EVOLUTION

> Bảng màu DEC-046 **giữ nguyên tuyệt đối**. Mục này chỉ mô tả ba nhóm token
> **mới** — chiều sâu, bo góc, chuyển động — cùng cách chúng được dùng.

### 14.1 Vì sao có mục này

Phase 13b đo tuân thủ và kết luận "0 vi phạm". Điều đó đúng, nhưng **"không vi
phạm" và "đẹp" là hai câu hỏi khác nhau**. Giao diện lúc đó phẳng vì nó thiếu
đúng ba thứ mà bảng token chưa từng có: bóng đổ, thang bo góc, và chuyển động.

Hướng đi lấy từ `ui-ux-pro-max` cho product type gần nhất (*CRM & Client
Management*): **Flat + Minimalism** làm nền — dự án đã có — cộng **Soft UI
Evolution + Micro-interactions** làm lớp hoàn thiện.

### 14.2 Thang chiều sâu — mỗi bậc HAI lớp

| Token | Dùng ở đâu |
|---|---|
| `--shadow-xs` | header dính trên · nút `secondary` |
| `--shadow-sm` | **mọi `Card`** — thay cho viền mảnh |
| `--shadow-md` | card khi trỏ vào · nút khi hover |
| `--shadow-lg` | thẻ đăng nhập |
| `--shadow-brand` / `-sm` | **chỉ** nút `primary` và vòng sáng khi focus ô nhập |

Một lớp bóng duy nhất cho ra hiệu ứng "dán tem"; hai lớp (gần + xa) mới ra được
cảm giác vật thể nâng lên. Bóng pha **xanh** (`rgba(15,23,42,…)` — chính
`--color-foreground`) vì nền trang `#F4F7FA` đã ngả xanh; bóng đen thuần trên nền
đó cho ra viền xám bẩn.

⚠ **Viền `--color-border` chỉ còn là lớp phụ.** Nó là 1,22:1 so với nền — ngoài
nắng gần như không thấy. Việc tách lớp nay do **bóng** đảm nhiệm; viền chỉ giúp
khi người dùng bật chế độ tương phản cao của hệ điều hành.

### 14.3 Bo góc và chuyển động

`--radius-sm/md/lg/xl` = 10/14/18/24px, `--radius-pill` cho badge và chip. Skill
khuyến nghị 8–12px; dự án lấy cận trên vì màn hình chính là điện thoại, nơi góc
bo lớn đọc ra "mềm" hơn.

Đúng **hai** `@keyframes` cho cả dự án — `rise-in` (nội dung vào trang) và
`shimmer` (skeleton). Cả hai chỉ chạm `transform`/`opacity` nên không sinh reflow.
`prefers-reduced-motion` đã có quy tắc toàn cục; các chỗ chuyển động thêm
`motion-reduce:` tường minh.

### 14.4 `ProgressBar` — thay đổi có ích nhất cho người dùng thật

Sales **không mạnh về công nghệ**. Bản cũ bắt họ đọc `90.000.000 ₫` cạnh
`100.000.000 ₫` rồi tự so trong đầu — mỗi ngày, bốn lần, trên màn hình 375px.
Một thanh dài ngắn trả lời câu đó trong một phần tư giây. Con số vẫn giữ nguyên
bên cạnh; thanh chỉ là lớp đọc nhanh.

Ba ràng buộc không được phá:
1. **Không tự tính, không tự quyết ngưỡng** — `percent` từ `calculateAchievement()`,
   `tone` từ `getAchievementStatus()` (BR-023). Thanh chỉ VẼ.
2. **`percent = null` vẽ máng có vân chéo, KHÔNG vẽ thanh 0%** — 0% nói sai rằng
   người dùng chưa làm được gì. Áp cho cả hai ca: chưa có số liệu (PENDING) và
   `target = 0 && actual > 0` (BR-015).
3. **Chiều dài chặn ở 100%** dù `percent` lớn hơn (BR-004 cho phép `1.250,0%`).
   Đây là giới hạn của **hình vẽ**, không phải clamp dữ liệu — con số vượt đã
   hiện đầy đủ ở badge bên cạnh.

`aria-hidden` vì mọi thông tin ở đây đã có dạng chữ ngay cạnh.

### 14.5 Ba quy tắc mới về màu, đọc trước khi thêm bề mặt

1. **Kính mờ CHỈ cho header và bottom nav.** Đó là hai nơi không có nội dung đọc
   lâu. Kính mờ dưới một khối chữ làm tụt tương phản đúng thứ NFR-007 cấm. Luôn
   kèm `supports-backdrop-filter:` để trình duyệt không hỗ trợ vẫn nhận nền đục.
2. **Cam logo làm nền nút CHỈ ở "Xuất ảnh báo cáo"** (biến thể `accent`). Luật
   `primary-action` cho đúng một CTA chính mỗi màn hình; cam ở đây nói một câu
   khác ("khoe kết quả"), không tranh chỗ với nút xanh. Chữ trên nền cam là chữ
   **TỐI** (8,17:1) — chữ trắng chỉ 2,19:1 và **BỊ CẤM**.
3. **Traffic-light của ô chỉ số Admin là VẠCH bên trái**, không phải nền bọc con
   số. Vạch là đồ hoạ không có chữ nằm trên nên chịu ngưỡng 3:1 của WCAG 1.4.11,
   và nó **không sinh thêm cặp nền×chữ nào phải đo lại** — bài học ISSUE-018.

### 14.6 Hàng rào tự động

`e2e/ui-quality.spec.ts` **được commit** (khác mọi bộ soát dùng-một-lần trước
đó): `bg-card/85` trông y hệt `bg-card` cho tới khi đo, nên đây đúng loại thay
đổi làm tỉ lệ tương phản trôi đi mà không ai nhận ra. Bài test mang theo bốn cái
bẫy đã sập một lần — mở `<details>`, đi vào nhánh có dữ liệu, dùng tài khoản vào
được form, và **xuất bộ đếm** để "0 vi phạm" có mẫu số. **Gỡ điều nào cũng là mù
lại.**

**Luật thứ năm — `logo-clipped`, thêm 2026-08-11 (ISSUE-030).** Bốn luật trên đo
*màu và kích thước*; không luật nào hỏi *hình có được vẽ đủ không*. Một `viewBox`
hẹp hơn nội dung sẽ cắt hình trong im lặng tuyệt đối: không lỗi console, không
cảnh báo build, không vi phạm axe, layout đúng từng pixel. Logo BikeForce đã bị
chém mất ~17% chiều cao suốt Phase 13 với cả bốn luật đều xanh. Phép đo mới lấy
`getBBox()` của `svg[data-brand-mark]`, nới thêm nửa bề rộng nét (vì `getBBox()`
**không** tính nét, mà `stroke-linecap="round"` thò ra đủ chừng ấy), rồi bắt buộc
kết quả nằm trọn trong `viewBox`. Kèm bộ đếm `marks > 0` theo đúng bẫy thứ tư.

---

## 17. CẬP NHẬT PHASE 13b (2026-08-10) — `/login` chia đôi · Đăng xuất thành popover

> Nguồn: **DEC-054**. Kích hoạt bởi **đánh giá bằng MẮT của người dùng** trên bản deploy, không phải
> bởi một phép đo trượt ngưỡng — đúng loại tín hiệu mà §14 (bốn nhóm luật đo được) **không thể** phát
> hiện. Đây là lần thứ hai bài học *"không vi phạm" ≠ "đẹp"* phải trả giá.

### 17.1 `/login` — bố cục theo bề rộng

| Bề rộng | Bố cục |
|---|---|
| **< 1024px** | Một cột `max-w-md` canh giữa: lockup logo `lg` → tagline → banner lý do (nếu có) → thẻ form → dòng "không cho tự đăng ký". Cột thương hiệu **KHÔNG tồn tại** |
| **≥ 1024px** | `lg:grid lg:grid-cols-[1.05fr_1fr]` (`xl:grid-cols-[1.2fr_1fr]`). Trái = mặt thương hiệu, phải = form. Lockup ở cột phải bị `lg:hidden` để không gắn thương hiệu hai lần trên một khung nhìn |

**Cột thương hiệu chứa gì:** lockup `tone="inverse"` → headline `text-4xl` → **ba** gạch đầu dòng
(icon trong ô `bg-white/15`) → dòng chân "Ứng dụng nội bộ · Tài khoản do Admin cấp". Hình xe cỡ
`w-104` ở góc dưới phải làm hoa văn, `text-white/8`.

⚠ Ba gạch đầu dòng phải soi được về **chức năng đã có trong v1** (cam kết sáng · đối chiếu tối · xuất
ảnh 9:16). Trang đăng nhập **không được hứa** thứ sản phẩm không giao — Master Spec §71.

**Nền cột trái = HAI LỚP, không phải một.** `bg-heading` là nền **đặc**; hai vệt sáng nằm ở một `div`
phủ riêng mang `@utility auth-brand-aura`. Tách hai lớp là bắt buộc: mọi phép đo tương phản (axe và
bộ đo của `e2e/ui-quality.spec.ts`) **leo cây tổ tiên tìm màu nền đầu tiên không trong suốt**, nên
đặt gradient thẳng lên phần tử chứa chữ sẽ khiến phép đo đọc trúng nền của cha và cho số sai
(ISSUE-018).

**Tương phản đã ĐO trên cột trái:**

| Cặp | Tỉ lệ | Kết luận |
|---|---|---|
| trắng trên `heading` #0B4A76 | **8,66:1** | AAA |
| trắng trên chỗ sáng nhất của vệt xanh (#1E72A7) | **5,21:1** | AA ✓ |
| **`text-white/85`** trên chỗ sáng nhất | **4,21:1** | ❌ **TRƯỢT AA** |
| cam logo #E9A04F trên `heading` | **4,30:1** | ✓ (đồ hoạ cần ≥ 3:1) |

➜ **Cột trái dùng `text-white` ĐẶC ở mọi dòng chữ.** Phân cấp bằng **cỡ và độ đậm**, không bằng
opacity. Đừng "làm mềm" chữ phụ bằng `/70`, `/80`, `/85` — cả ba đều trượt.

**Thẻ form** có vạch màu `h-1.5` chuyển sắc `primary → secondary → accent` ở mép trên. Thuần trang
trí, không phải đo. Đây là chi tiết rẻ nhất mà đổi được nhiều nhất: mặt trắng bo góc có một vệt màu
thương hiệu đọc ra "có thiết kế", mặt trắng trơn đọc ra "hộp thoại hệ thống".

**Nút hiện/ẩn mật khẩu** — `type="button"`, `aria-label` đổi theo trạng thái + `aria-pressed`, vùng
chạm **52×52px** (`w-13`), ô nhập có `pr-14` đúng bằng chỗ nút chiếm nên không bao giờ đè lên chữ.
Mặc định **luôn ẩn**, không nhớ trạng thái sang lần sau.

### 17.2 Xác nhận Đăng xuất — hai hình thức, theo NGỮ CẢNH của nút

| Nơi | Hình thức | Vì sao |
|---|---|---|
| **Header** (`HeaderSignOut`) | **Popover `w-72` neo dưới nút**, có mũi nhọn chỉ lên nút | Nút nằm trên thanh dính, không có chỗ nở ra. Neo vào nút làm quan hệ nguyên nhân–kết quả thành thứ **nhìn thấy được** |
| **`/…/account`** (`SignOutButton`) | **Khối tại chỗ**, đẩy nội dung xuống | Nút nằm trong dòng chảy trang ⇒ không cần lớp nổi, không phải quản lý focus / Esc / bấm-ra-ngoài |

**Popover bắt buộc có đủ ba thứ** (bản cũ — dải `absolute inset-x-0` — không có thứ nào):
**Esc đóng** · **chạm ra ngoài đóng** (`pointerdown`, không phải `click`) · **focus vào panel khi mở,
trả về nút khi đóng**. Focus đặt ở nút **Huỷ**: mở panel rồi gõ Enter theo quán tính thì kết quả
phải là "không có gì xảy ra".

**Hai nút xếp DỌC, mỗi nút tràn hết bề rộng.** Bản đầu xếp `grid-cols-2` và chữ "Đăng xuất" **gãy làm
hai dòng** trong ô 128px; nới bề rộng panel không cứu được vì nhãn lúc đang gửi còn dài hơn
("Đang đăng xuất…"). Thứ tự "hành động trước, Huỷ sau" là quy ước action sheet của cả iOS lẫn
Android — và đường thoát không hề khó với tới vì Esc, chạm-ra-ngoài và chính nút Huỷ đều huỷ.

⚠ `w-72` = 288px **không phải số tuỳ tiện**: ở 375px mép phải của nút cách mép màn hình đúng 16px
(`px-4` của header), nên panel còn dư 71px bên trái ⇒ không bao giờ tràn ngang (NFR-003).

**`SignOutSubmit`** (`features/auth/sign-out-submit.tsx`) là nút gửi dùng chung cho **cả hai** chỗ.
Trước DEC-054, bản header có `useFormStatus()` còn bản `/…/account` **không có** — gộp về một nơi để
hai chỗ không bao giờ lệch nhau nữa. Nó phải là component **con** của `<form>`, nếu không
`useFormStatus()` luôn trả `pending: false`.

### 17.3 Logo trong header ngồi trong một ô

`<span class="grid size-11 place-items-center rounded-md bg-accent/15">` bọc `BrandMark w-7`, ở **cả
hai** route group. Nó cho hình một chỗ đứng rõ ràng và cân được khối lượng thị giác của nút Đăng xuất
ở đầu kia hàng. Nền 15% nên **không sinh cặp nền×chữ mới nào phải đo** (ISSUE-018).

### 17.4 `BrandLockup` có tone — và cái bẫy đã sập

`tone: 'brand' | 'inverse'`. `inverse` chỉ đổi **chữ hiệu** sang trắng; **hình xe giữ nguyên màu cam**
ở cả hai tone vì đó là bản sắc logo gốc.

> ⚠ Bản đầu của DEC-054 gọi `<BrandLockup className="text-white" />` trên nền `heading`. Class bên
> trong là `text-heading` nên nó thắng: **chữ #0B4A76 trên nền #0B4A76 — 1:1, biến mất hoàn toàn.**
> Không phép đo tự động nào bắt được, vì **WCAG miễn trừ logotype** khỏi ngưỡng tương phản nên bộ đo
> cũng bỏ qua. Nó chỉ lộ ra khi **chụp ảnh ra và nhìn**.

---

## 18. CẬP NHẬT PHASE 15 (2026-08-11) — hệ phản hồi loading (DEC-065)

### 18.1 Ba quãng chờ, ba phản hồi

| Quãng chờ | Component | Người dùng thấy |
|---|---|---|
| Từ cú chạm tới khi Next bắt đầu route | `LinkPendingIcon` / `LinkSpinner` | Icon tại đúng link vừa chạm đổi thành spinner; label không nhảy |
| Route đang đọc dữ liệu | `RouteLoading` trong hai `loading.tsx` | Status card + skeleton đúng hình học heading/KPI/danh sách |
| Server Action / thao tác trình duyệt | `Button loading loadingText` | Nút tự khoá, spinner thay icon, nhãn nói đúng việc đang làm |

Đây là chuỗi nối tiếp, không phải ba animation cùng lúc: phản hồi link lấp khoảng lặng đầu; loading
boundary tiếp quản khi route stream; nội dung thật thay skeleton mà không nhảy bố cục.

### 18.2 Đặc tả thị giác

- **Không thêm màu mới:** status pill dùng `status-info-bg/fg`, spinner dùng màu chữ semantic của
  chính bề mặt, card dùng `shadow-sm`, skeleton dùng `border/70` + shimmer đã có từ DEC-053.
- Loading route giữ header/sidebar/bottom nav để người dùng luôn biết mình đang ở đâu. Không scrim,
  không overlay, không `z-[9999]`.
- Skeleton đặt trước hai KPI card và một danh sách ba dòng; ở 375px vẫn là hai cột vừa khung, không
  cuộn ngang. Nội dung thật dài hơn vẫn do page thật quyết định.
- Nút giữ nguyên chiều cao/rộng khi pending. Spinner `size-5` thay icon, nhãn đổi trong cùng flex
  box; không animate width/height nên không tạo reflow chủ động.

### 18.3 Ngữ nghĩa và reduced motion

- Route: `aria-busy="true"`, `aria-live="polite"`, `data-route-loading` chỉ làm mốc kiểm thử.
- Nút: `disabled` thật + `aria-busy="true"`; nhãn pending nằm trong `role="status"`.
- Link: spinner `aria-hidden`; câu "Đang mở…" nằm trong `role="status"` cho screen reader.
- `prefers-reduced-motion: reduce` dừng spinner/shimmer gần như tức thì nhưng **giữ nguyên khối
  tĩnh**, nên ý nghĩa loading không biến mất.

### 18.4 Phạm vi đã phủ

Đăng nhập · đăng xuất · lưu cam kết sáng · hoàn tất cuối ngày · đổi mật khẩu · lưu hồ sơ Admin/Sales
· tạo tài khoản · bật/tắt tài khoản · gửi/tải/sao chép ảnh · retry error boundary · lọc báo cáo ·
bottom nav/sidebar · CTA Hôm nay · quay lại · đổi tháng · phân trang · mở chi tiết báo cáo/nhân viên.

CSV vẫn là link tải native với `Content-Disposition`; trình duyệt không có sự kiện hoàn tất download
đáng tin cậy nên không hiển thị một spinner giả kéo dài tuỳ tiện.

### 18.5 Kiểm chứng trực quan thực tế

Ngày 2026-08-11, `RouteLoading` được render trong chính layout Admin production và chụp ở **375×812**
cùng **1440×900**. Cả hai bản đều giữ header/navigation, status card không gãy chữ, hai KPI skeleton
không tràn ngang và danh sách không bị bottom nav che. Pending icon trên bottom nav 375px cũng được
giữ request để quan sát trực tiếp: icon đổi thành spinner nhưng label/vị trí không nhảy.

---

## 19. CẬP NHẬT PHASE 16 (2026-08-11) — Báo cáo Admin cho dữ liệu lớn (DEC-066)

- Mặc định mở **tháng hiện tại theo giờ Việt Nam**; báo cáo mới nhất đứng trước. “Tất cả thời gian” là
  lựa chọn chủ động, không còn là trạng thái ngầm định.
- Hàng luôn hiện gồm tìm tên Sales, tháng đang xem, tháng trước/sau và “Tháng này”. Các điều kiện ít dùng
  nằm trong `<details>` “Bộ lọc nâng cao”, đóng mặc định; chip phía trên giữ trạng thái nhìn thấy khi đóng.
- Ở 375px, form và phân trang xếp một cột, control tối thiểu 44px, input 48px, không tạo vùng cuộn ngang.
  Ở desktop, control đi theo hàng/lưới và phân trang hiện cụm số quanh trang hiện tại.
- Mobile có nút trước/sau và ô GET “Đi tới trang”; desktop có đầu/trước/số trang/sau/cuối. Nhãn phạm vi dùng
  dạng “Báo cáo 21–40 trên 2.438”. Mọi link giữ bộ lọc và trang chi tiết giữ `returnTo`.
- Danh sách vẫn chỉ render 20 dòng nên không dùng infinite scroll hoặc virtualization.

---

## 20. SỬA BỐ CỤC BỘ LỌC LAPTOP (2026-08-12) — ISSUE-031

- Nguyên nhân thanh tìm kiếm trông bị tụt là cột tháng có thêm dòng “Tháng này”, trong khi lưới cha dùng
  `items-end`; toàn bộ cột tìm kiếm vì vậy bị kéo xuống theo chiều cao lớn hơn của cột bên cạnh.
- Từ `md`, hai control chính dùng lưới tỷ lệ `3fr / 2fr`; label tháng và lối về tháng hiện tại nằm cùng
  hàng, còn ô tìm kiếm và bộ chuyển tháng phải có cùng `y` và cùng chiều cao.
- Ô tìm kiếm có icon Lucide nằm trong control để tăng khả năng nhận diện, không thay label hiển thị.
  Bộ chuyển tháng giữ ba vùng rõ ràng, hai nút điều hướng tối thiểu 44px và có đường phân cách nhẹ.
- Nhóm hành động desktop tách khỏi phần điều kiện bằng viền trang trí; CTA có bề rộng ổn định để tránh
  cảm giác nút bị co hoặc trôi. Ở 375px, toàn bộ vẫn xếp một cột và không cuộn ngang.
- E2E `desktop-1440` đo trực tiếp bounding box của ô tìm kiếm và group tháng; sai lệch vị trí hoặc chiều
  cao quá 1px làm test đỏ. Đây là hàng rào tái hiện cho ISSUE-031.
