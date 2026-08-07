# BikeForce — Bicycle Sales Management System
## Master Specification for Claude Code

> Đây là tài liệu **source of truth cấp cao** cho dự án BikeForce.
> Claude Code phải đọc tài liệu này trước khi phân tích, thiết kế hoặc triển khai.
> Không tự ý thay đổi business rule đã được người dùng xác nhận.
> Nếu có điểm nghiệp vụ quan trọng chưa rõ, phải gom câu hỏi thành một lần trước khi chốt database/workflow.

---

# 1. MỤC TIÊU HỆ THỐNG

BikeForce là ứng dụng nội bộ dành cho đội ngũ Sales kinh doanh xe đạp.

Mục tiêu chính:

- Sales khai báo **cam kết đầu ngày**.
- Cuối ngày Sales nhập **kết quả thực tế**.
- Hệ thống tự động so sánh:
  - Cam kết buổi sáng.
  - Kết quả thực tế buổi chiều.
  - % hoàn thành.
- Sales lưu báo cáo lên hệ thống.
- **Chỉ sau khi lưu báo cáo cuối ngày thành công mới được phép xuất ảnh.**
- Ảnh báo cáo tỷ lệ **9:16**, tối ưu để gửi Zalo.
- Admin theo dõi báo cáo của toàn bộ Sales.
- Giao diện Sales ưu tiên điện thoại.
- Hệ thống deploy bằng **Vercel Free + Supabase**.

Tên sản phẩm:

**BikeForce**

Subtitle:

**Bicycle Sales Management System**

---

# 2. TECH STACK BẮT BUỘC

Ưu tiên stack đơn giản, dễ maintain, phù hợp Vercel Free/Supabase Free:

- Next.js phiên bản stable phù hợp tại thời điểm triển khai.
- App Router.
- TypeScript strict.
- Tailwind CSS.
- Supabase:
  - PostgreSQL.
  - Authentication.
  - Row Level Security.
- Vercel Free.
- Schema validation: ưu tiên Zod nếu phù hợp.
- E2E: Playwright nếu khả thi.

Không over-engineer.

Không tự xây:

- microservices;
- queue;
- event bus;
- Kubernetes;
- kiến trúc enterprise không cần thiết.

---

# 3. UI/UX SKILL BẮT BUỘC

Trước khi thiết kế UI, Claude Code phải tải và nghiên cứu:

https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git

Phải thực sự áp dụng các nguyên tắc phù hợp trong skill vào BikeForce.

Không được clone repository chỉ để cho có.

Phải đánh giá và áp dụng:

- visual hierarchy;
- typography;
- spacing;
- mobile form;
- card;
- dashboard;
- data visualization;
- color;
- CTA;
- touch target;
- accessibility;
- loading state;
- empty state;
- error state;
- success state;
- responsive behavior.

---

# 4. NGUYÊN TẮC UI

BikeForce là **mobile-first**.

Sales thường dùng điện thoại khi đang đi thị trường.

Yêu cầu:

- Không thiết kế như desktop dashboard rồi thu nhỏ.
- Form nhanh, gọn.
- Input lớn, dễ bấm.
- Numeric input gọi bàn phím số khi phù hợp.
- CTA quan trọng phải rõ.
- Có thể dùng sticky action area nếu hợp lý.
- Hạn chế số bước.
- Không animation dư thừa.
- Không nhồi biểu đồ.
- Desktop vẫn phải tốt, đặc biệt cho Admin.

Phong cách:

- hiện đại;
- chuyên nghiệp;
- mạnh mẽ;
- gọn;
- dễ đọc;
- phù hợp ngành xe đạp;
- mang cảm giác Field Sales / Sales Performance.

---

# 5. ROLE

Chỉ có 2 role ban đầu:

## ADMIN

Quản trị và theo dõi hệ thống.

## SALES

Nhân viên kinh doanh xe đạp.

Role phải được enforce tại:

- UI;
- route;
- server;
- Supabase RLS.

Không coi việc ẩn nút/menu phía frontend là security.

---

# 6. AUTHENTICATION

Dùng Supabase Auth.

Tối thiểu:

- Login.
- Logout.
- Session persistence.
- Protected routes.
- Role-based authorization.
- Xử lý inactive account.

Ưu tiên:

- Admin tạo tài khoản Sales.
- Sales không tự đăng ký nếu chưa được yêu cầu.

Nếu cần Service Role Key:

- chỉ dùng server-side;
- không expose client;
- không commit vào Git;
- không ghi secret thật vào docs.

---

# 7. BÁO CÁO ĐẦU NGÀY

Sales tạo báo cáo đầu ngày.

Các trường:

## Họ và tên

- Tự động lấy từ profile.
- Không bắt Sales nhập lại.

## Ngày báo cáo

- Mặc định ngày hiện tại.
- Phải tính theo timezone `Asia/Ho_Chi_Minh`.
- Không để UTC làm lệch ngày nghiệp vụ.

## Tuyến ghé thăm

Text hoặc phương án tốt hơn sau khi phân tích nghiệp vụ.

Ví dụ:

- Quận 1 → Quận 3.
- Bình Thạnh.
- Thủ Đức.
- Đại lý khu vực Tây Ninh.

## Mục tiêu viếng thăm

Đây là business rule cần xác nhận nếu chưa rõ:

- số điểm/đại lý mục tiêu;

hoặc

- mục đích chuyến đi/chăm sóc khách hàng.

## Mục tiêu doanh số

Hiện đang hiểu:

**Doanh số = số lượng xe/sản phẩm bán được.**

- Integer.
- >= 0.

## Mục tiêu doanh thu

- VND.
- >= 0.
- Không lưu formatted string.

## SL khách hàng sẽ ghé thăm

- Integer.
- >= 0.

---

# 8. BÁO CÁO CUỐI NGÀY

Sales mở lại báo cáo cùng ngày.

Phải hiển thị cam kết đầu ngày để đối chiếu.

Các trường:

## Họ và tên

Tự động.

## Đã viếng thăm

Cần xác nhận nghiệp vụ nếu chưa rõ:

- số lượng điểm/đại lý đã ghé;

hay

- tuyến/danh sách địa điểm đã đi.

## Bán được doanh số

Hiện đang hiểu:

- số lượng xe/sản phẩm thực tế bán được;
- integer >= 0.

## Thu được doanh thu

- doanh thu thực tế;
- VND;
- >= 0.

## SL khách hàng đã ghé thăm

- integer >= 0.

## Ghi chú cuối ngày

Nên có, optional.

Dùng để ghi:

- lý do chưa đạt KPI;
- khách hẹn lại;
- vấn đề thị trường;
- cơ hội bán hàng;
- thông tin cạnh tranh.

---

# 9. SO SÁNH CAM KẾT VÀ THỰC ĐẠT

Sau báo cáo cuối ngày, hiển thị:

| Chỉ tiêu | Cam kết sáng | Thực đạt | Hoàn thành |
|---|---:|---:|---:|
| Viếng thăm | X | Y | Z% |
| Doanh số | X | Y | Z% |
| Doanh thu | X | Y | Z% |
| Khách hàng | X | Y | Z% |

Công thức cơ bản:

`achievement = actual / target * 100`

Quy tắc:

- Cho phép > 100%.
- Không clamp về 100%.
- Không được xuất hiện `NaN`.
- Không được xuất hiện `Infinity`.
- Trường hợp target = 0 phải có business rule rõ ràng trước khi chốt.

Ví dụ:

- Target = 10, Actual = 8 → 80%.
- Target = 8, Actual = 10 → 125%.

Centralize logic:

- `calculateAchievement()`
- `getAchievementStatus()`
- `formatCurrencyVND()`
- `getVietnamToday()`

Không duplicate công thức trong nhiều component.

---

# 10. TRẠNG THÁI REPORT

Tối thiểu xem xét:

- `MORNING_SUBMITTED`
- `COMPLETED`

Có thể thêm:

- `DRAFT`
- `LOCKED`

chỉ khi thật sự cần.

Không làm workflow phức tạp vô ích.

---

# 11. UNIQUE DAILY REPORT

Một Sales chỉ có tối đa **một báo cáo chính thức cho một ngày**.

Database phải enforce:

`UNIQUE(sales_id, report_date)`

Không chỉ kiểm tra ở frontend.

---

# 12. SAVE TRƯỚC — EXPORT SAU

Business rule bắt buộc.

Flow:

1. Sales nhập báo cáo cuối ngày.
2. Nhấn `Lưu báo cáo`.
3. Validate.
4. Persist lên Supabase.
5. Supabase trả success.
6. UI báo lưu thành công.
7. Lúc này mới enable `Xuất ảnh báo cáo`.

Nếu save thất bại:

- không cho export;
- giữ form data;
- hiển thị lỗi rõ;
- không reset form.

Nút Export không được enable chỉ vì form "trông có vẻ đầy đủ".

Phải dựa trên trạng thái persisted thành công.

---

# 13. ẢNH BÁO CÁO 9:16

Tạo component riêng, ví dụ:

`DailyReportShareCard`

Không screenshot nguyên page.

Target:

- 1080 × 1920;
- PNG;
- dễ đọc trên Zalo;
- không cắt chữ;
- hiển thị tốt số tiền lớn;
- hiển thị % > 100%;
- xử lý tên dài;
- route dài;
- note dài.

Nội dung gợi ý:

- BikeForce.
- DAILY SALES REPORT.
- Ngày.
- Nhân viên.
- Tuyến.
- Bảng Cam kết / Thực đạt / %.
- Tổng quan KPI.
- Ghi chú cuối ngày.
- Branding tối giản.

Có thể đánh giá:

- `html-to-image`;
- `html2canvas`;
- hoặc giải pháp client-side ổn định hơn.

Không bắt buộc lưu ảnh lên Supabase.

Tên file gợi ý:

`BikeForce_Report_Nguyen-Van-A_2026-08-07.png`

---

# 14. SALES DASHBOARD

Sau login:

- Chào Sales.
- Hiển thị ngày.
- Trạng thái báo cáo hôm nay.

Nếu chưa báo cáo sáng:

`Tạo báo cáo đầu ngày`

Nếu đã báo cáo sáng:

`Hoàn thành báo cáo cuối ngày`

Nếu đã hoàn tất:

- `Xem báo cáo hôm nay`
- `Xuất ảnh`

Có thể hiển thị:

- target sales qty;
- actual sales qty;
- target revenue;
- actual revenue;
- customer visits;
- achievement.

---

# 15. SALES HISTORY

Sales được xem báo cáo của chính mình.

Có:

- danh sách theo ngày;
- filter tháng;
- trạng thái;
- doanh số;
- doanh thu;
- % hoàn thành;
- report detail.

RLS phải đảm bảo Sales không xem Sales khác.

---

# 16. ADMIN DASHBOARD

Tối thiểu:

- Tổng số Sales active.
- Số Sales đã báo cáo sáng hôm nay.
- Số Sales đã hoàn thành báo cáo cuối ngày.
- Số Sales chưa báo cáo.
- Tổng target sales quantity.
- Tổng actual sales quantity.
- % đạt doanh số.
- Tổng target revenue.
- Tổng actual revenue.
- % đạt doanh thu.
- Tổng target customer visits.
- Tổng actual customer visits.

Có thể đề xuất thêm nhưng phải đánh giá:

- giá trị;
- complexity;
- có nên vào MVP hay không.

---

# 17. ADMIN REPORT MANAGEMENT

Admin có thể:

- xem toàn bộ report;
- xem report detail;
- filter ngày;
- filter khoảng ngày;
- filter tháng;
- filter Sales;
- filter status;
- search Sales.

Desktop có thể table.

Mobile có thể card.

Pagination/server-side filtering nếu dữ liệu lớn.

---

# 18. ADMIN MONTHLY ANALYTICS

Admin chọn tháng.

Hiển thị:

- tổng target vs actual sales quantity;
- tổng target vs actual revenue;
- target vs actual customer visits;
- achievement percentage.

Có thể có trend theo ngày nếu hữu ích.

Không nhồi chart.

---

# 19. ADMIN SALES PERFORMANCE

Theo từng Sales:

- total sales quantity;
- total revenue;
- customer visits;
- average achievement;
- số ngày đạt KPI;
- ranking nếu hợp lý.

Không xây gamification phức tạp trong MVP.

---

# 20. ADMIN SALES MANAGEMENT

Module quản lý Sales.

Có thể gồm:

- danh sách Sales;
- tạo Sales;
- sửa profile;
- activate/deactivate;
- xem lịch sử report;
- xem performance.

Profile xem xét:

- id;
- full_name;
- email;
- phone;
- employee_code;
- role;
- is_active;
- created_at;
- updated_at.

Không thêm field vô nghĩa.

---

# 21. ADMIN ALERTS

Nên đánh giá và triển khai nếu complexity thấp:

- Sales chưa báo cáo sáng.
- Sales đã báo cáo sáng nhưng chưa hoàn thành cuối ngày.

---

# 22. EXPORT ADMIN

Có thể hỗ trợ:

- CSV;
- Excel.

Ưu tiên đơn giản.

Nếu dependency/complexity cao, đưa vào SHOULD HAVE hoặc roadmap.

---

# 23. DATABASE DESIGN

Schema tham khảo, Claude Code phải tự phân tích và chốt sau Phase 0.

Có thể gồm:

## profiles

- id
- full_name
- email
- phone
- employee_code
- role
- is_active
- created_at
- updated_at

## daily_reports

- id
- sales_id
- report_date

Morning:
- planned_route
- visit_goal
- target_sales_quantity
- target_revenue
- target_customer_visits
- morning_submitted_at

Evening:
- actual_route / actual_visits
- actual_sales_quantity
- actual_revenue
- actual_customer_visits
- evening_note
- evening_submitted_at

Other:
- status
- created_at
- updated_at

Bắt buộc:

- primary key;
- FK;
- unique `(sales_id, report_date)`;
- indexes hợp lý;
- RLS.

Không lưu achievement % nếu có thể tính reliable từ source data.

---

# 24. SUPABASE RLS

Sales:

- đọc profile của mình;
- đọc report của mình;
- tạo report của mình;
- update report của mình theo business rule;
- không đọc report người khác.

Admin:

- đọc toàn bộ report;
- quản lý profile/report theo quyền đã chốt.

Phải test IDOR/RLS trực tiếp, không chỉ test UI.

---

# 25. VALIDATION

Không cho:

- số âm;
- invalid date;
- NaN;
- Infinity;
- invalid revenue;
- duplicate report.

Client validation để UX tốt.

Server/database validation để bảo vệ dữ liệu.

---

# 26. VND

Display theo `vi-VN`.

Ví dụ:

`125000000` → `125.000.000 ₫`

Database không lưu string đã format.

---

# 27. TIMEZONE

Business timezone:

`Asia/Ho_Chi_Minh`

Phải test trường hợp gần 00:00.

`report_date` phải là ngày nghiệp vụ tại Việt Nam.

---

# 28. MOBILE NAVIGATION

Sales:

- Hôm nay.
- Lịch sử.
- Tài khoản.

Admin:

- Tổng quan.
- Báo cáo.
- Sales.
- Tài khoản.

Desktop có thể dùng sidebar.

---

# 29. PWA

Đánh giá PWA cơ bản vì Sales dùng điện thoại.

Có thể hỗ trợ Add to Home Screen.

Không bắt buộc offline sync trong MVP.

---

# 30. UX CHỐNG MẤT DỮ LIỆU

Cần:

- disable submit khi đang gửi;
- prevent double submit;
- loading feedback;
- toast success;
- error rõ;
- giữ form khi request fail;
- cảnh báo khi rời trang có unsaved changes.

Có thể dùng localStorage draft nếu không làm phức tạp source of truth.

Server vẫn là source of truth.

---

# 31. REPORT LOCKING — CẦN XÁC NHẬN

Phải hỏi nếu chưa được xác nhận:

- Sales hoàn thành cuối ngày rồi có được sửa không?
- Chỉ sửa trong ngày?
- Khóa ngay?
- Admin có quyền sửa không?

Không tự chốt nếu ảnh hưởng database/audit/workflow.

---

# 32. DELETE REPORT — CẦN XÁC NHẬN

Default an toàn:

- Sales không xóa report đã gửi.

Cần hỏi:

- Admin có xóa không?
- Soft delete hay không?

---

# 33. EMPTY / LOADING / ERROR STATES

Phải có:

- loading;
- skeleton nếu phù hợp;
- empty report;
- no reports selected month;
- auth expired;
- save failure;
- export failure;
- unauthorized;
- 404.

---

# 34. SECURITY

Kiểm tra:

- Authentication.
- Authorization.
- RLS.
- Service Role Key.
- Environment variables.
- Input validation.
- XSS.
- Injection.
- IDOR.
- Không expose report người khác.
- Không expose secret ra client bundle.

---

# 35. PERFORMANCE

- Query có index.
- Không fetch toàn DB.
- Admin list pagination.
- Server-side filter khi phù hợp.
- Tránh N+1.
- Hạn chế dependency.
- Lazy-load image export library nếu nặng.

---

# 36. CODE STRUCTURE

Ưu tiên cấu trúc rõ ràng, ví dụ:

```text
app/
components/
features/
lib/
services/
types/
hooks/
utils/
supabase/
docs/
```

Không bắt buộc đúng cấu trúc trên nếu có phương án tốt hơn.

Tách:

- UI;
- data access;
- validation;
- business logic;
- permission;
- formatting;
- image export.

Không tạo component/file khổng lồ nếu có thể chia hợp lý.

---

# 37. TESTING

## Unit

Bắt buộc test:

- `calculateAchievement()`
- target = 0
- actual > target
- actual < target
- actual = target
- validation rejects negative
- currency formatting
- Vietnam date helper

## Integration / DB

- report persistence
- unique daily report
- RLS

## E2E

Sales:

Login
→ Today
→ Morning Report
→ Save
→ Reopen
→ Evening Report
→ Save
→ Comparison
→ Export Image

Admin:

Login
→ Dashboard
→ Reports
→ Filter month
→ Filter Sales
→ Detail

Security:

Sales A không đọc report Sales B.

---

# 38. DEPLOYMENT

## Supabase

- project setup;
- migrations;
- indexes;
- RLS;
- policies;
- Auth;
- seed/dev data nếu cần.

## Vercel

- env vars;
- build;
- production deploy;
- domain config nếu cần.

Phải có:

`.env.example`

Không commit secret.

---

# 39. MVP SCOPE

## MUST HAVE

- Login.
- Admin/Sales roles.
- Morning Report.
- Evening Report.
- KPI calculation.
- Save report.
- Export image 9:16.
- Export chỉ sau save.
- Sales history.
- Admin dashboard.
- Admin reports.
- Filter month.
- Filter Sales.
- Sales management cơ bản.
- Supabase RLS.
- Mobile-first.
- Vercel deployment ready.

## SHOULD HAVE

- dashboard charts hữu ích;
- CSV/Excel;
- PWA;
- draft recovery;
- missing-report alerts.

## LATER

Không tự thêm vào MVP:

- CRM lớn;
- warehouse;
- inventory;
- POS;
- accounting;
- delivery management;
- product catalog phức tạp;
- GPS tracking;
- dealer CRM;

trừ khi người dùng yêu cầu.

BikeForce v1 tập trung:

**Daily Sales Performance Reporting**

---

# 40. CÂU HỎI BUSINESS CẦN XÁC NHẬN

Trong Phase 0, nếu chưa có câu trả lời, Claude Code phải gom các câu hỏi quan trọng thành một lần.

Tối thiểu xem xét:

1. `Mục tiêu viếng thăm` là số điểm/đại lý hay mục đích chuyến đi?
2. `Đã viếng thăm` là số lượng hay tuyến/danh sách thực tế?
3. Xác nhận `Doanh số = số lượng xe`, `Doanh thu = tiền`.
4. Sales hoàn tất report rồi có được sửa không?
5. Admin có được sửa report Sales không?
6. Admin tạo Sales hay Sales tự đăng ký?
7. Tuyến nhập tự do hay Admin cấu hình sẵn?
8. Có trạng thái nghỉ phép/nghỉ/ngày không đi thị trường không?
9. KPI là Sales tự cam kết sáng hay Admin đặt?
10. V1 có cần quản lý SKU/model xe/đại lý/đơn hàng không?

Chỉ hỏi các câu ảnh hưởng:

- business rule;
- database;
- permission;
- workflow lớn.

Không hỏi best practice kỹ thuật mà Claude tự quyết được.

---

# 41. IMPLEMENTATION PHASES

## PHASE 0 — Discovery & Business Analysis

- đọc repository nếu đã có;
- đọc Master Spec;
- clone/read UI UX Pro Max;
- phân tích nghiệp vụ;
- đề xuất feature Admin;
- đề xuất architecture;
- đề xuất DB;
- đề xuất page map;
- đề xuất navigation;
- đề xuất export 9:16;
- đề xuất security;
- gom câu hỏi business.

**Không code production feature trước khi hoàn tất Phase 0 và giải quyết các OPEN QUESTION quan trọng.**

## PHASE 1 — Foundation

- Next.js setup;
- TypeScript strict;
- Tailwind;
- dependencies;
- folder structure;
- Supabase clients;
- env.

## PHASE 2 — Database & Auth

- migrations;
- profiles;
- reports;
- RLS;
- auth;
- role guards.

## PHASE 3 — Morning Report

## PHASE 4 — Evening Report

## PHASE 5 — KPI Engine

## PHASE 6 — 9:16 Image Export

## PHASE 7 — Sales History

## PHASE 8 — Admin Dashboard

## PHASE 9 — Admin Reports & Filters

## PHASE 10 — Sales Management

## PHASE 11 — Testing & Security

## PHASE 12 — Deployment Preparation

---

# 42. QUALITY GATE SAU MỖI PHASE

Sau mỗi phase:

1. Build.
2. Typecheck.
3. Lint.
4. Relevant unit/integration/E2E tests.
5. Fix lỗi trước khi sang phase tiếp.
6. Update docs.
7. Update checklist/worklog/checkpoint.

Không để lỗi tích tụ đến cuối.

---

# 43. CODE QUALITY

- TypeScript strict.
- Không lạm dụng `any`.
- Naming rõ.
- Không duplicate business logic.
- Không hardcode credentials.
- Không hardcode magic number vô lý.
- Không rewrite project không cần thiết.
- Comment chỉ khi logic cần giải thích.
- Giữ kiến trúc đủ đơn giản cho MVP.

---

# 44. PROJECT CONTROL DOCUMENTATION — BẮT BUỘC

Sau Phase 0, project phải có tối thiểu:

```text
CLAUDE.md
AGENTS.md

docs/
├── 01-business-analysis.md
├── 02-database-design.md
├── 03-workflow.md
├── 04-system-architecture.md
├── 05-ui-ux-design.md
├── 06-auth-permissions.md
├── 07-api-data-flow.md
├── 08-testing-strategy.md
├── 09-deployment.md
├── 10-future-roadmap.md
├── 11-decisions.md
└── 12-known-issues.md

WORKLOG.md
SESSION_CHECKPOINT.md
PROJECT_CHECKLIST.md
```

Nếu file chưa đủ thông tin vì chờ người dùng:

```text
Status: DRAFT
OPEN QUESTION:
```

Không bỏ file.

---

# 45. 01-business-analysis.md

Phải chứa:

- mục tiêu;
- scope;
- actors;
- roles;
- use cases;
- functional requirements;
- non-functional requirements;
- business rules;
- morning flow;
- evening flow;
- save/export rule;
- admin flow;
- validation;
- edge cases;
- approved decisions;
- open questions.

Business rule nên có ID:

```text
BR-001
BR-002
BR-003
```

Ví dụ:

```text
BR-001: Một Sales chỉ có tối đa một Daily Report mỗi ngày.
BR-002: Chỉ cho export ảnh sau khi report đã được lưu thành công.
BR-003: Sales không được đọc report của Sales khác.
BR-004: Achievement có thể vượt 100%.
```

---

# 46. 02-database-design.md

Phải có:

- ERD Mermaid;
- tables;
- columns;
- data types;
- nullable;
- defaults;
- PK;
- FK;
- unique;
- indexes;
- enums;
- triggers nếu có;
- RLS;
- policies;
- relationships;
- lý do thiết kế.

Phải giải thích dữ liệu nào:

- persist;
- derived runtime.

---

# 47. 03-workflow.md

Phải có end-to-end workflow.

Ví dụ:

```text
Login
→ Today Dashboard
→ Morning Report
→ Validate
→ Save
→ MORNING_SUBMITTED
```

```text
Open Today Report
→ View Commitment
→ Enter Actual
→ Save
→ COMPLETED
→ Calculate Achievement
→ Enable Export
```

Phải có cả failure flow:

- validation error;
- network error;
- duplicate;
- permission;
- export fail.

---

# 48. 04-system-architecture.md

Phải có architecture diagram Mermaid.

Ví dụ:

```text
Mobile/Desktop Browser
        ↓
     Next.js
        ↓
     Supabase
   ├─ Auth
   ├─ PostgreSQL
   └─ RLS
```

Ghi rõ:

- client/server boundaries;
- Supabase clients;
- data access;
- validation;
- business logic;
- image generation;
- deployment;
- secret handling.

---

# 49. 05-ui-ux-design.md

Phải dựa trên UI UX Pro Max skill.

Ghi:

- design direction;
- typography;
- spacing;
- color;
- form;
- card;
- button;
- status;
- responsive;
- mobile navigation;
- accessibility;
- page inventory.

Ví dụ routes:

```text
/auth/login

/sales
/sales/today
/sales/history
/sales/reports/[id]

/admin
/admin/reports
/admin/reports/[id]
/admin/sales
/admin/sales/[id]
```

---

# 50. 06-auth-permissions.md

Phải có permission matrix.

Ví dụ:

| Feature | Admin | Sales |
|---|---|---|
| View own report | Yes | Yes |
| View all reports | Yes | No |
| Create morning report | Optional | Yes |
| Complete evening report | Optional | Yes |
| Manage Sales | Yes | No |

Ghi rõ:

- auth flow;
- route protection;
- server protection;
- RLS;
- inactive account;
- session expiration.

---

# 51. 07-api-data-flow.md

Nếu dùng Server Actions/Route Handlers/query functions, ghi:

- input;
- validation;
- permission;
- database query;
- output;
- errors.

Ví dụ:

```text
MorningReportForm
→ Zod
→ saveMorningReport()
→ Supabase
→ daily_reports
```

---

# 52. 08-testing-strategy.md

Ghi:

- unit tests;
- integration;
- RLS tests;
- E2E;
- security cases;
- mobile viewport cases.

Có checklist test.

---

# 53. 09-deployment.md

Ghi:

- Supabase setup.
- Migrations.
- Auth.
- RLS.
- Env vars.
- Vercel.
- Build.
- Production deploy.

Không ghi secret thật.

---

# 54. 10-future-roadmap.md

Mỗi feature ngoài MVP:

```text
Feature:
Status:
Priority:
Reason:
Dependency:
Complexity:
```

Không tự triển khai roadmap.

---

# 55. 11-decisions.md

Decision log.

Format:

```text
DEC-001

Date:
Decision:
Reason:
Alternatives:
Impact:
Status:
```

Không tự thay đổi quyết định đã `APPROVED` mà không cập nhật log và/hoặc hỏi người dùng nếu là business decision.

---

# 56. 12-known-issues.md

Không xóa issue sau khi fix.

Format:

```text
ISSUE-001

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

---

# 57. WORKLOG.md

Theo dõi Claude đã làm gì.

Tối thiểu:

```markdown
# BikeForce Worklog

## Current Phase

PHASE X

## Overall Progress

- [x] Phase 0
- [ ] Phase 1
...
```

Mỗi lần làm việc ghi:

```text
Date:
Phase:
Completed:
Files Changed:
Tests:
Errors:
Decisions:
Remaining:
Next:
```

---

# 58. SESSION_CHECKPOINT.md

Đây là file quan trọng nhất để session sau tiếp tục.

Format:

```markdown
# BikeForce Session Checkpoint

## Current State

Current Phase:
Current Task:
Current Branch:

## Completed

## Currently Working On

## Not Started

## Known Issues

## Important Business Decisions

## Important Files

## Database State

## Testing State

Build:
Typecheck:
Lint:
Unit:
Integration:
E2E:

## Last Working Feature

## Next Exact Steps

1.
2.
3.

## DO NOT REDO

- ...
```

Phải cập nhật cuối milestone/session.

---

# 59. PROJECT_CHECKLIST.md

Checklist tổng thể.

Ví dụ:

```markdown
## Foundation
- [ ] Next.js
- [ ] TypeScript strict
- [ ] Tailwind
- [ ] Supabase

## Authentication
- [ ] Login
- [ ] Logout
- [ ] Session
- [ ] Admin role
- [ ] Sales role

## Morning Report
- [ ] UI
- [ ] Validation
- [ ] Save
- [ ] Duplicate prevention
```

Chỉ tick `[x]` khi:

- code xong;
- build pass;
- typecheck pass;
- relevant test pass.

---

# 60. CLAUDE.md

Tạo ở root.

Nội dung phải yêu cầu mọi Claude Code session:

1. Đọc `BIKEFORCE_MASTER_SPEC.md`.
2. Đọc `SESSION_CHECKPOINT.md`.
3. Đọc `WORKLOG.md`.
4. Đọc `PROJECT_CHECKLIST.md`.
5. Đọc docs liên quan task.
6. Không tự đổi business rule.
7. Không rewrite architecture vô lý.
8. Không bỏ RLS.
9. Mobile-first.
10. Không expose secret.
11. Test sau thay đổi quan trọng.
12. Update docs/checkpoint/worklog.

---

# 61. AGENTS.md

Chứa engineering rules:

- architecture;
- TypeScript;
- naming;
- component;
- data access;
- Supabase;
- RLS;
- security;
- testing;
- documentation;
- Git nếu cần.

---

# 62. DOCUMENTATION UPDATE MATRIX

Nếu business rule thay đổi:

- `docs/01-business-analysis.md`
- `docs/11-decisions.md`

Nếu DB thay đổi:

- `docs/02-database-design.md`

Nếu workflow thay đổi:

- `docs/03-workflow.md`

Nếu architecture thay đổi:

- `docs/04-system-architecture.md`

Nếu UI structure thay đổi:

- `docs/05-ui-ux-design.md`

Nếu permission thay đổi:

- `docs/06-auth-permissions.md`

Nếu API/data flow thay đổi:

- `docs/07-api-data-flow.md`

Nếu testing thay đổi:

- `docs/08-testing-strategy.md`

Nếu deployment thay đổi:

- `docs/09-deployment.md`

Nếu bug mới:

- `docs/12-known-issues.md`

Khi hoàn thành task:

- `WORKLOG.md`
- `PROJECT_CHECKLIST.md`
- `SESSION_CHECKPOINT.md`

---

# 63. DEFINITION OF DONE

Một task không được DONE chỉ vì đã viết code.

DONE khi:

1. Code hoàn tất.
2. Typecheck pass.
3. Build pass.
4. Lint pass.
5. Relevant tests pass.
6. UI mobile đã kiểm tra nếu liên quan UI.
7. Security/RLS test nếu liên quan data.
8. Docs liên quan đã cập nhật.
9. Checklist cập nhật.
10. Worklog cập nhật.
11. Checkpoint cập nhật.

---

# 64. SESSION START PROTOCOL

Mỗi session sau lần đầu phải đọc theo thứ tự:

1. `CLAUDE.md`
2. `BIKEFORCE_MASTER_SPEC.md`
3. `SESSION_CHECKPOINT.md`
4. `WORKLOG.md`
5. `PROJECT_CHECKLIST.md`
6. Docs liên quan task
7. Source code liên quan

Không scan lại toàn repo nếu checkpoint đã đủ context.

Nhưng nếu phát hiện checkpoint/docs không khớp source code, phải kiểm tra và đồng bộ.

---

# 65. SESSION END PROTOCOL

Trước khi kết thúc milestone/session:

1. Run build.
2. Run typecheck.
3. Run lint.
4. Run relevant tests.
5. Update docs nếu có thay đổi.
6. Update `PROJECT_CHECKLIST.md`.
7. Update `WORKLOG.md`.
8. Update `SESSION_CHECKPOINT.md`.

`Next Exact Steps` phải cụ thể để session sau tiếp tục ngay.

---

# 66. SOURCE OF TRUTH PRIORITY

Nếu mâu thuẫn:

1. Business decision người dùng vừa xác nhận.
2. `docs/11-decisions.md`.
3. `docs/01-business-analysis.md`.
4. `docs/02-database-design.md`.
5. `docs/03-workflow.md`.
6. `docs/04-system-architecture.md`.
7. Source code hiện tại.

Nếu docs và code mâu thuẫn:

- không âm thầm chọn;
- xác định nguyên nhân;
- sửa cho đồng bộ;
- ghi decision/worklog nếu cần.

---

# 67. PHASE 0 DELIVERABLE

Trước khi code production feature, tạo:

```text
CLAUDE.md
AGENTS.md

docs/
├── 01-business-analysis.md
├── 02-database-design.md
├── 03-workflow.md
├── 04-system-architecture.md
├── 05-ui-ux-design.md
├── 06-auth-permissions.md
├── 07-api-data-flow.md
├── 08-testing-strategy.md
├── 09-deployment.md
├── 10-future-roadmap.md
├── 11-decisions.md
└── 12-known-issues.md

WORKLOG.md
SESSION_CHECKPOINT.md
PROJECT_CHECKLIST.md
```

File chưa đủ thông tin vẫn phải tạo và đánh dấu DRAFT/OPEN QUESTION.

---

# 68. PHASE 0 CÁCH LÀM VIỆC

Lần đầu:

1. Đọc toàn bộ file này.
2. Khảo sát repo hiện tại.
3. Đọc package/config nếu có.
4. Clone/read UI UX Pro Max skill.
5. Phân tích BikeForce.
6. Tạo bộ docs control.
7. Đề xuất:
   - architecture;
   - DB;
   - page map;
   - navigation;
   - admin features;
   - MVP;
   - export strategy;
   - security;
   - testing;
   - deployment.
8. Gom các câu hỏi business quan trọng thành **một lần**.
9. Chờ người dùng trả lời các câu hỏi đó trước khi chốt những phần bị ảnh hưởng.
10. Sau khi được trả lời:
    - cập nhật `11-decisions.md`;
    - cập nhật docs DRAFT;
    - chuyển phần phù hợp sang APPROVED/ACTIVE;
    - tạo implementation plan;
    - bắt đầu Phase 1.

Không hỏi từng câu nhỏ rải rác.

---

# 69. ADMIN FEATURE PROPOSAL FORMAT

Mỗi feature Claude đề xuất phải ghi:

```text
Feature:
Business Value:
Complexity: Low / Medium / High
MVP: Yes / No
Reason:
```

Không tự thêm feature chỉ để project lớn hơn.

---

# 70. SUCCESS CRITERIA

## SALES

Sales login trên điện thoại
→ tạo Morning Report
→ lưu Supabase
→ cuối ngày mở lại
→ nhập actual
→ save
→ tính % đúng
→ export enable sau save
→ tạo PNG 9:16 đẹp
→ lịch sử vẫn thấy report.

## ADMIN

Admin login
→ dashboard toàn đội
→ thấy ai đã/chưa báo cáo
→ tổng target/actual
→ filter tháng
→ filter Sales
→ report detail
→ sales performance.

## SECURITY

Sales A không thể truy cập report Sales B bằng:

- UI;
- URL;
- direct request;
- Supabase query.

---

# 71. NGUYÊN TẮC CUỐI

- Không code ào ạt toàn bộ project.
- Làm theo phase.
- Không tự thay đổi business rule đã approved.
- Không bỏ documentation.
- Không bỏ RLS.
- Không bỏ testing.
- Không claim DONE nếu quality gate chưa pass.
- Ưu tiên MVP thực sự sử dụng được.
- Giữ BikeForce gọn, nhanh, dễ dùng trên điện thoại.
