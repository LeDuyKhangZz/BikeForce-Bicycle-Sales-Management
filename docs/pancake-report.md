# Báo cáo đơn hàng Pancake

`Get-PancakeReport.ps1` lấy đơn của shop `1022081353` theo ngày Việt Nam (UTC+7), phân trang đến khi `response.data` rỗng và xuất:

- CSV tổng hợp: số đơn, doanh thu không gồm đơn hủy, hủy, hoàn, trễ, đơn Ads và GMV Ads;
- CSV phụ cùng tên với hậu tố `-by-source.csv`: số đơn và doanh thu không hủy theo nguồn Shopee/Tiktok/nguồn khác;
- bảng console và dòng `SUMMARY:` để dùng cho Telegram.

Đơn hoàn có thể được sàn cập nhật trễ vài ngày. Workflow vì vậy chạy lại ngày hôm qua lúc 08:00 giờ Việt Nam; số liệu ngày cũ có thể thay đổi giữa các lượt chạy.

## Chạy bằng PowerShell 5.1 hoặc 7

Đặt API key cho phiên hiện tại mà không ghi vào source:

```powershell
$env:PANCAKE_API_KEY = 'API_KEY_CUA_BAN'
```

Một ngày:

```powershell
./Get-PancakeReport.ps1 -Ngay 2026-10-07 -OutCsv ./artifacts/pancake-report-2026-10-07.csv
```

Nhiều ngày rời nhau:

```powershell
./Get-PancakeReport.ps1 -Ngay 2026-10-05,2026-10-07 -OutCsv ./artifacts/pancake-report-selected.csv
```

Khoảng ngày, mỗi ngày một dòng:

```powershell
./Get-PancakeReport.ps1 -TuNgay 2026-10-01 -DenNgay 2026-10-07 -OutCsv ./artifacts/pancake-report-range.csv
```

Nếu bỏ cả `-Ngay` lẫn khoảng ngày, script dùng hôm nay theo UTC+7. `-OutCsv` luôn bắt buộc. CSV được ghi UTF-8 có BOM để Excel đọc đúng tiếng Việt.

## Cấu hình GitHub Actions

1. Vào repository trên GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Chọn **New repository secret**, tạo `PANCAKE_API_KEY`.
3. Nếu muốn Telegram, tạo thêm `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID`. Thiếu một trong hai thì bước Telegram tự bỏ qua và workflow vẫn thành công.
4. Push `.github/workflows/pancake-report.yml` lên nhánh mặc định.
5. Vào **Actions** → **Pancake Daily Report** → **Run workflow**. Nhập ngày `yyyy-MM-dd` hoặc để trống để dùng hôm nay theo UTC+7.
6. Mở run vừa tạo: kiểm tra bước chọn ngày, dòng `SUMMARY:` trong bước lấy báo cáo và tải artifact ở cuối trang run. Artifact được giữ 30 ngày.

Hai lịch UTC trong workflow:

- `50 16 * * *` = 23:50 giờ Việt Nam, báo cáo ngày hiện tại;
- `0 1 * * *` = 08:00 giờ Việt Nam, chạy lại ngày hôm qua.

GitHub có thể bắt đầu scheduled workflow trễ hơn vài phút khi hệ thống đông; ngày báo cáo vẫn được tính tường minh từ UTC sang UTC+7 lúc job chạy.

## Task Scheduler trên Windows (tùy chọn)

Máy chạy task phải có `PANCAKE_API_KEY` ở môi trường của đúng tài khoản chạy task. Tạo **Create Task** → trigger hằng ngày → action **Start a program**:

- Program: `powershell.exe`
- Arguments: `-NoProfile -ExecutionPolicy Bypass -File "C:\duong-dan\Get-PancakeReport.ps1" -OutCsv "C:\duong-dan\artifacts\pancake-report-daily.csv"`
- Start in: thư mục repository.

Không đặt API key trực tiếp trong Arguments vì nó sẽ hiện trong Task Scheduler và danh sách process.
