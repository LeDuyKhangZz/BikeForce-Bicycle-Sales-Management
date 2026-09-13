# Chạy Scheduled Task đồng bộ ẩn

Task `BikeForce - Auto Sync Reports` giữ nguyên lịch mỗi phút và logic trong
`scripts/sync-all-reports.bat` → `npm.cmd run reports:sync`.

## Action mới

- Program: `C:\Windows\System32\wscript.exe`
- Arguments: `//B //NoLogo "<PROJECT_ROOT>\scripts\sync-all-reports-hidden.vbs"`
- Start in: `<PROJECT_ROOT>`
- Settings → If the task is already running: **Do not start a new instance**.

VBScript chạy PowerShell ẩn và chờ hoàn tất để truyền exit code về Task Scheduler.
PowerShell khởi động CMD với `CreateNoWindow`, chờ toàn bộ batch, đọc stdout/stderr
đồng thời để tránh kẹt pipe. Wrapper không thay đổi thứ tự hoặc dữ liệu đồng bộ.
Khóa file ngăn hai wrapper chạy chồng nhau, kể cả khi chạy thủ công.

## Cập nhật lại tự động

Mở PowerShell có quyền quản lý task, chuyển vào thư mục dự án rồi chạy:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/install-hidden-report-sync.ps1
```

Installer chỉ thay action và `MultipleInstances`, giữ các thiết lập còn lại.
XML dự phòng được lưu trong `logs/auto-sync-task-<timestamp>.xml` trước khi sửa.
Không cần thay task bằng chế độ chạy dưới tài khoản khác: profile Chrome AMIS hiện tại
vẫn cần được dùng bởi tài khoản Windows đã đăng nhập AMIS.

## Telegram và log

Wrapper đọc `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` từ environment hoặc cấu hình
hiện có trong `.env.local`, `scripts/amis-sync/.env`. Không đưa token vào action.
Nếu chưa cấu hình, thêm hai tên biến trên vào file `.env` bằng giá trị riêng của bạn.
Bot phải được người nhận mở hội thoại trước khi gửi tin.

Exit code khác 0 hoặc exception: gửi một tin cho mỗi lượt lỗi, gồm thời gian có múi giờ,
tên task, exit code và phần cuối log. Thành công: không gửi tin. Wrapper tắt thông báo
AMIS lồng bên trong bằng environment riêng để tránh hai tin cho cùng một lỗi.
Các lượt chạy lỗi liên tiếp vẫn gửi tin; không áp dụng cooldown làm mất cảnh báo.

Toàn bộ stdout/stderr và trạng thái wrapper lưu nối tiếp vào `logs/auto-sync.log`;
log cũ của batch vẫn giữ nguyên. Secret đã biết và Bearer/JWT được che trước khi ghi
log hoặc gửi Telegram. Tin Telegram giới hạn phần log ở 3.200 ký tự; log file giữ đầy đủ.
Telegram thất bại được ghi vào log và không thay đổi exit code của đồng bộ.

Chỉ cửa sổ console của chuỗi launcher/CMD được ẩn. Chrome dùng chung do script AMIS
mở khi chưa chạy vẫn là trình duyệt tương tác theo logic hiện có.

## Kiểm chứng

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-hidden-sync.ps1
```

Smoke test dùng batch giả và HTTP Telegram giả: thành công không gửi, lỗi exit 7
giữ đúng exit và kèm stderr đã che token, exception trả 1 và gửi thông báo.
Không gửi tin Telegram thật trong kiểm thử. Xem Last Run Result của Task Scheduler
và `logs/auto-sync.log` sau lượt lịch tiếp theo để kiểm tra đồng bộ thật.

API Telegram: [sendMessage](https://core.telegram.org/bots/api#sendmessage).

**Kiểm chứng thật 2026-09-13 21:39:** đã chạy task qua launcher mới. push_amis.py gặp ConnectionResetError/WinError 10054 tại upsert; wrapper giữ exit 1, lưu traceback đầy đủ, Telegram API xác nhận gửi thành công lúc 21:39:50. Đồng bộ lượt này chưa hoàn tất vì kết nối bị reset; không phải lỗi launcher. Chưa xác nhận trực quan desktop. Push commit bị auto-review chặn vì quyền chia sẻ lên remote chưa xác minh; chờ người dùng cho phép.
