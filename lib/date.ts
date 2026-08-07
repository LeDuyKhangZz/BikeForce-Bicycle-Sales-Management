/**
 * ─────────────────────────────────────────────────────────────────────────
 *  KHUNG CỦA PHASE 1 — CHƯA CÓ LOGIC. Triển khai đầy đủ ở PHASE 5.
 * ─────────────────────────────────────────────────────────────────────────
 * Nguồn DUY NHẤT của "hôm nay là ngày nghiệp vụ nào" (BR-005, AGENTS.md §9).
 *
 * ⚠ CẤM tuyệt đối dùng `new Date()` trực tiếp ở bất kỳ đâu để suy ra ngày
 * nghiệp vụ. Vercel chạy ở UTC còn Sales ở UTC+7: từ 00:00 đến 07:00 giờ VN,
 * `new Date().getDate()` trên server trả về NGÀY HÔM QUA. Đó là loại bug
 * không ai phát hiện cho tới khi có tranh cãi với Admin về một báo cáo.
 *
 * Ràng buộc Phase 5 phải tuân thủ:
 *   • DEC-009 — dùng `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })`.
 *     `'en-CA'` được chọn vì nó cho sẵn định dạng `YYYY-MM-DD`.
 *     KHÔNG thêm dependency timezone ngoài (không date-fns-tz, không dayjs).
 *   • Hàm không được "ăn theo" timezone của máy đang chạy — unit test ở Phase 5
 *     phải đóng băng đồng hồ và chạy cả ở `Pacific/Kiritimati` (UTC+14) để
 *     chứng minh điều đó (docs/08 §3).
 *   • Biên bắt buộc test: 16:59Z và 17:01Z phải ra HAI ngày khác nhau;
 *     23:30 VN và 00:30 VN cũng vậy (NFR-011).
 *   • DB có `public.vn_today()` xác nhận lại phía Postgres — hai bên phải khớp.
 */

/** Ngày nghiệp vụ hôm nay tại `Asia/Ho_Chi_Minh`, dạng `'YYYY-MM-DD'`. */
export function getVietnamToday(): string {
  throw new Error('getVietnamToday() chưa được triển khai — xem PHASE 5.');
}

/** `'2026-08-07'` → `'Thứ Sáu, 07/08/2026'`. */
export function formatVietnamDate(_date: string): string {
  throw new Error('formatVietnamDate() chưa được triển khai — xem PHASE 5.');
}

/** `'2026-08'` → `{ from: '2026-08-01', to: '2026-08-31' }`. */
export function getVietnamMonthRange(_yyyyMM: string): { from: string; to: string } {
  throw new Error('getVietnamMonthRange() chưa được triển khai — xem PHASE 5.');
}
