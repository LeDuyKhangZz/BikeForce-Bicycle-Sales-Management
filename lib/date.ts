/**
 * Nguồn DUY NHẤT của "hôm nay là ngày nghiệp vụ nào" (BR-005, AGENTS.md §9).
 *
 * ⚠ CẤM tuyệt đối dùng `new Date()` trực tiếp ở bất kỳ đâu để suy ra ngày
 * nghiệp vụ. Vercel chạy ở UTC còn Sales ở UTC+7: từ 00:00 đến 07:00 giờ VN,
 * `new Date().getDate()` trên server trả về NGÀY HÔM QUA. Đó là loại bug
 * không ai phát hiện cho tới khi có tranh cãi với Admin về một báo cáo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  TRẠNG THÁI: `getVietnamToday()` và `formatVietnamDate()` ĐÃ TRIỂN KHAI ở
 *  PHASE 3 (DEC-032) vì FR-010 và FR-007 không chạy được nếu thiếu chúng.
 *  `getVietnamMonthRange()` vẫn là khung — nó chỉ phục vụ filter tháng của
 *  FR-021 / FR-028 (Phase 7, Phase 9) nên để đúng phase sở hữu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Ràng buộc đã tuân thủ:
 *   • DEC-009 — dùng `Intl.DateTimeFormat` với `timeZone: 'Asia/Ho_Chi_Minh'`.
 *     `'en-CA'` được chọn vì nó cho sẵn định dạng `YYYY-MM-DD`.
 *     KHÔNG thêm dependency timezone ngoài (không date-fns-tz, không dayjs).
 *   • Hàm không "ăn theo" timezone của máy đang chạy — unit test đóng băng đồng
 *     hồ và chạy lại toàn bộ bảng ở `UTC`, `America/New_York`,
 *     `Asia/Ho_Chi_Minh`, `Pacific/Kiritimati` (docs/08 §3.5.1).
 *   • DB có `public.vn_today()` xác nhận lại phía Postgres — hai bên phải khớp,
 *     và `tests/integration/db-functions.test.ts` khoá điều đó lại.
 */

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** `'YYYY-MM-DD'` — định dạng ngày nghiệp vụ dùng thống nhất toàn dự án. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Chuỗi thay thế khi không có ngày hợp lệ để hiển thị (DEC-033).
 * Cùng ký tự em dash mà `lib/kpi.ts` dùng cho `display` khi không có số liệu —
 * giao diện không bao giờ hiện `Invalid Date`.
 */
export const INVALID_DATE_DISPLAY = '—';

/**
 * `'en-CA'` cho ra đúng `YYYY-MM-DD`. Tạo formatter một lần ở module scope:
 * khởi tạo `Intl.DateTimeFormat` là thao tác đắt, còn hàm này được gọi trong
 * mọi request của `/sales/today`.
 */
const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VIETNAM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Ngày nghiệp vụ hôm nay tại `Asia/Ho_Chi_Minh`, dạng `'YYYY-MM-DD'`. */
export function getVietnamToday(): string {
  return isoDateFormatter.format(new Date());
}

/**
 * Kiểm tra `'YYYY-MM-DD'` là ngày CÓ THẬT trên lịch.
 *
 * Cần thiết vì `new Date('2026-02-30')` KHÔNG ném lỗi — JavaScript cuộn sang
 * `2026-03-02`. Muốn từ chối `2026-02-30` (docs/08 §3.6) thì phải so ngược lại
 * từng thành phần sau khi parse.
 */
export function isValidVietnamDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  // `split` cho đúng 3 phần vì regex ở trên đã khoá hình dạng chuỗi.
  const [yearPart, monthPart, dayPart] = value.split('-') as [string, string, string];
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  // Dựng ở UTC rồi đọc lại bằng getUTC*: không đụng tới timezone của máy.
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/**
 * Thứ trong tuần bằng tiếng Việt. `timeZone: 'UTC'` là CỐ Ý: chuỗi đầu vào đã
 * là một ngày lịch thuần (không có giờ), ta dựng nó ở UTC rồi đọc lại ở UTC nên
 * không có cơ hội lệch ±1 ngày. Dùng `Asia/Ho_Chi_Minh` ở đây sẽ đẩy
 * `2026-08-07T00:00Z` thành 07:00 sáng cùng ngày — vô hại, nhưng `UTC` khiến
 * lập luận về tính đúng đắn ngắn hơn một bậc.
 */
const weekdayFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'UTC',
  weekday: 'long',
});

/**
 * `'2026-08-07'` → `'Thứ Sáu, 07/08/2026'`.
 *
 * Đầu vào không hợp lệ trả `'—'` chứ KHÔNG ném lỗi (DEC-033): hàm này chỉ phục
 * vụ hiển thị, và một ngày rác trong DB không được phép làm sập cả trang.
 */
export function formatVietnamDate(date: string): string {
  if (typeof date !== 'string' || !isValidVietnamDate(date)) {
    return INVALID_DATE_DISPLAY;
  }

  const [year, month, day] = date.split('-') as [string, string, string];
  const weekday = weekdayFormatter.format(new Date(`${date}T00:00:00Z`));

  return `${weekday}, ${day}/${month}/${year}`;
}

/**
 * `'2026-08'` → `{ from: '2026-08-01', to: '2026-08-31' }`.
 *
 * ⚠ KHUNG — triển khai ở PHASE 7 (FR-021) / PHASE 9 (FR-028). Hành vi với chuỗi
 * sai định dạng chưa chốt (docs/08 §3.5.3), nên chưa viết bừa.
 */
export function getVietnamMonthRange(_yyyyMM: string): { from: string; to: string } {
  throw new Error('getVietnamMonthRange() chưa được triển khai — xem PHASE 7.');
}
