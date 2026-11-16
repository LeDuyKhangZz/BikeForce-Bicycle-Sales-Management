# Đồng bộ chăm sóc SaleWork

## Phạm vi

Worker dùng phiên đăng nhập SaleWork hiện hữu trong `.env.local`. Đọc đúng API giao diện đã kiểm chứng: `/api/account/getAll`, `/api/conversation`, `/api/message/filter`. Không cần tạo webhook hoặc xin Open API mới. Không gửi tin nhắn, không gọi endpoint đánh dấu đã đọc, không lưu nội dung chat hoặc token vào log/file.

`uidFrom = "0"` là phía tài khoản Zalo gửi đi, đã đối chiếu mã giao diện SaleWork và phản hồi thực tế. Worker lấy tin văn bản, ảnh, video, link, file và sticker gửi trong hội thoại riêng. Tin khách gửi đến, nhóm và sự kiện hệ thống không tính chăm sóc. Cuộc gọi, chiến dịch tự động và phân biệt người thao tác trong tài khoản dùng chung chưa được đối soát: việc gắn sale hiện dựa trên chủ tài khoản đã cấu hình, không chứng minh một người cụ thể đã gõ tin.

## Định danh và dữ liệu

- Ánh xạ tài khoản → Sales chỉ qua danh sách chính xác hiện có trong `lib/salework/sales-account-map.ts`; tên thiếu hoặc mâu thuẫn bị bỏ và không suy đoán.
- Định danh khách nguồn dùng đúng `FRIEND|CONTACT|REQUEST:<accountId>:<peerId>` trong `customers`. Khách không có định danh nguồn bị báo `unmatched_customers`, không tạo liên kết giả.
- Liên kết khách MISA chỉ dùng `customer_identity_links` do Admin duyệt theo DEC-122. Tin của nguồn chưa liên kết được giữ trên khách nguồn và báo `unlinked`; chưa loại khách MISA khỏi cảnh báo. Khi liên kết được duyệt, helper đọc được cả log nguồn; chạy lại worker chuyển log về canonical mà không tạo bản sao.
- Khóa chống trùng: `('SALEWORK', 'ZALO:<accountId>:<peerId>:<msgId>')`. Thời gian dùng `ts` gốc, không dùng thời điểm đồng bộ.
- `sync_salework_care_logs` chỉ cấp EXECUTE cho service role, không cấp quyền bảng trực tiếp. Hàm kiểm tra profile Sales duy nhất và input, nhận tối đa 500 sự kiện/lượt.
- `misa_customer_care_snapshot` chịu RLS của caller, giữ nguyên `last_visit_date`, bổ sung `last_care_date` từ ngày thăm, phiếu đã duyệt và log SaleWork được phép đọc. Tin SaleWork sau cuối tháng lịch sử không được đưa ngược vào tháng đó.

## Chạy thử và vận hành

```powershell
npm.cmd run salework:care:dry-run -- --from 2026-11-15 --limit-conversations 2
npm.cmd run salework:care:dry-run -- --from 2026-11-01
npm.cmd run salework:care:sync -- --from 2026-11-01
```

Mặc định quét từ 30 ngày trước theo ngày Việt Nam. Có thể lấy lịch sử cũ bằng `--from`; chỉ lấy được phần lịch sử mà SaleWork thực tế còn cung cấp. Cursor không tiến, lỗi API hoặc vượt giới hạn an toàn khiến lượt đọc thất bại, không bắt đầu nhập từ lượt đọc chưa đầy đủ. Lỗi sau một batch ghi có thể để lại các batch trước đã commit; chạy lại an toàn nhờ khóa chống trùng.

`--limit-conversations` chỉ dành cho đọc thử, bị cấm cùng `--write`. Không dùng kết quả mẫu để tuyên bố đã đồng bộ toàn bộ.

Sau migration `20261116100000_salework_care_sync.sql` và đối soát, đặt `SALEWORK_CARE_SYNC_ENABLED=true` trên máy chạy lịch. Lệnh `npm run salework:sync` hiện hữu sẽ gọi worker chăm sóc sau các bước báo cáo cũ. Khi chưa bật biến này, bước chăm sóc bỏ qua mà không đổi hành vi đồng bộ cũ. Máy chạy Chrome phải hoạt động tại giờ chạy lịch.

Exit 0: đọc/ghi hoàn tất trong phạm vi đã chọn. Exit 1: lỗi đọc, cấu hình hoặc ghi. Exit 2: đã ghi các log khớp nhưng còn sale/khách không khớp hoặc nguồn chưa liên kết; không được coi toàn bộ chỉ số đã đầy đủ. Không lấy `synced_at` làm ngày chăm sóc.

## Nghiệm thu

Đối chiếu theo cùng khoảng ngày Việt Nam trên từng tài khoản và khách đã duyệt định danh. So sánh tin gửi đi gần nhất với SaleWork; ghi rõ số khách có thể ghép, số chưa ghép và phần lịch sử API không trả. Mục tiêu khớp 95% là điều kiện nghiệm thu chưa đạt cho tới khi có đối soát đầy đủ. Unit/RLS và thử hai hội thoại không thay thế phép đo này.
