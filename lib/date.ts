/**
 * Nguồn DUY NHẤT của "hôm nay là ngày nghiệp vụ nào" (BR-005, AGENTS.md §9).
 *
 * ⚠ CẤM tuyệt đối dùng `new Date()` trực tiếp ở bất kỳ đâu để suy ra ngày
 * nghiệp vụ. Vercel chạy ở UTC còn Sales ở UTC+7: từ 00:00 đến 07:00 giờ VN,
 * `new Date().getDate()` trên server trả về NGÀY HÔM QUA. Đó là loại bug
 * không ai phát hiện cho tới khi có tranh cãi với Admin về một báo cáo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  TRẠNG THÁI: TOÀN BỘ file đã triển khai thật.
 *  `getVietnamToday()` + `formatVietnamDate()` ở PHASE 3 (DEC-032);
 *  nhóm hàm THÁNG (`getVietnamMonthRange`, `getVietnamCurrentMonth`,
 *  `formatVietnamMonth`, `shiftVietnamMonth`) ở PHASE 7 cho filter tháng của
 *  FR-021 / FR-028. Hành vi với chuỗi tháng sai định dạng chốt bằng **DEC-040**.
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

/* ===========================================================================
 * NHÓM HÀM THÁNG — PHASE 7 (FR-021), dùng lại ở PHASE 9 (FR-028)
 * ========================================================================= */

/** `'YYYY-MM'` — định dạng tháng nghiệp vụ, khớp `searchParams.month`. */
const ISO_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Chuỗi thay thế khi không có tháng hợp lệ để hiển thị — cùng quy ước DEC-033. */
export const INVALID_MONTH_DISPLAY = INVALID_DATE_DISPLAY;

/**
 * `'2026-08'` → `{ from: '2026-08-01', to: '2026-08-31' }`, **inclusive hai đầu**
 * để truy vấn `report_date between from and to` không bỏ sót ngày cuối tháng.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO TRẢ `null` CHỨ KHÔNG NÉM LỖI — DEC-040
 * ─────────────────────────────────────────────────────────────────────────
 *  `docs/08 §3.5.3` để ngỏ hành vi với chuỗi sai định dạng, và đề xuất cũ là
 *  "ném lỗi có kiểu rồi để caller fallback". Đầu vào thật của hàm này là
 *  `searchParams.month` — tức là **một chuỗi bất kỳ người dùng gõ vào URL**.
 *  Ném lỗi ở đó biến `?month=abc` thành một trang 500; và một `try/catch` mà
 *  caller có thể quên là thứ compiler không nhắc được.
 *
 *  `null` thì ngược lại: TypeScript **bắt** mọi caller xử lý, và không có
 *  đường nào làm sập trang. Cùng tinh thần DEC-033 (hàm hiển thị trả `'—'` thay
 *  vì throw), nhưng giữ kiểu an toàn vì kết quả này đi vào truy vấn chứ không
 *  đi thẳng ra màn hình.
 *
 *  Hàm cố ý KHÔNG tự fallback về tháng hiện tại: nó sẽ phải đọc đồng hồ, và
 *  một hàm thuần biến thành hàm phụ thuộc thời gian. Fallback là việc của
 *  caller (`/sales/history` dùng `getVietnamCurrentMonth()`).
 */
export function getVietnamMonthRange(yyyyMM: string): { from: string; to: string } | null {
  if (typeof yyyyMM !== 'string' || !ISO_MONTH_PATTERN.test(yyyyMM)) return null;

  // `split` cho đúng 2 phần vì regex ở trên đã khoá hình dạng chuỗi.
  const [yearPart, monthPart] = yyyyMM.split('-') as [string, string];
  const year = Number(yearPart);
  const month = Number(monthPart);

  // `Date.UTC(year, month, 0)` = "ngày số 0 của tháng KẾ TIẾP" = ngày cuối cùng
  // của `month`. Để lịch tự trả lời 28/29/30/31 thay vì tự viết bảng số ngày và
  // tự xử lý năm nhuận — hai chỗ dễ sai nhất của loại code này.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    from: `${yyyyMM}-01`,
    to: `${yyyyMM}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** Tháng nghiệp vụ hôm nay tại `Asia/Ho_Chi_Minh`, dạng `'YYYY-MM'`. */
export function getVietnamCurrentMonth(): string {
  // Cắt từ `getVietnamToday()` thay vì tạo formatter thứ hai: một nguồn duy
  // nhất cho "hôm nay là khi nào" (BR-005).
  return getVietnamToday().slice(0, 7);
}

/**
 * `'2026-08'` → `'Tháng 08/2026'`.
 *
 * Đầu vào không hợp lệ trả `'—'` chứ KHÔNG ném lỗi (DEC-033) — hàm này chỉ phục
 * vụ hiển thị.
 */
export function formatVietnamMonth(yyyyMM: string): string {
  if (typeof yyyyMM !== 'string' || !ISO_MONTH_PATTERN.test(yyyyMM)) {
    return INVALID_MONTH_DISPLAY;
  }

  const [year, month] = yyyyMM.split('-') as [string, string];

  return `Tháng ${month}/${year}`;
}

/** Kết quả chuẩn hoá `?month=` — luôn dùng được, không bao giờ `null`. */
export type ResolvedMonth = {
  /** `'YYYY-MM'` đã hợp lệ. Bằng tháng hiện tại nếu đầu vào không dùng được. */
  month: string;
  from: string;
  to: string;
  /** `true` khi đầu vào bị từ chối và hàm đã lùi về tháng hiện tại. */
  didFallback: boolean;
};

/**
 * `?month=` trên URL → cặp `{ month, from, to }` **luôn dùng được**.
 *
 * Đây là chỗ DUY NHẤT được phép ghép "khoảng tháng" với "đồng hồ":
 * `getVietnamMonthRange()` cố ý giữ tính thuần và trả `null` cho đầu vào rác
 * (DEC-040), nhưng mọi màn hình lọc theo tháng đều cần **một** tháng để hiển
 * thị dù người dùng gõ gì vào URL. Gom việc lùi-về-tháng-hiện-tại vào một hàm
 * thay vì lặp lại ở `/sales/history` (FR-021) và `/admin/analytics` (FR-028) —
 * hai chỗ đó phải cư xử giống hệt nhau.
 *
 * `didFallback` để tầng gọi biết mình đã bị chuyển tháng, nếu muốn nói ra.
 */
export function resolveVietnamMonth(raw: string | undefined): ResolvedMonth {
  const requested = typeof raw === 'string' ? getVietnamMonthRange(raw) : null;

  if (requested !== null && typeof raw === 'string') {
    return { month: raw, from: requested.from, to: requested.to, didFallback: false };
  }

  const currentMonth = getVietnamCurrentMonth();
  const currentRange = getVietnamMonthRange(currentMonth);

  // `getVietnamCurrentMonth()` sinh ra từ `getVietnamToday()` nên luôn đúng
  // định dạng — nhánh này không tới được. Vẫn xử lý thay vì `!` để không có
  // một dấu chấm than nào đứng trên đường dữ liệu chính.
  if (currentRange === null) {
    return { month: currentMonth, from: `${currentMonth}-01`, to: `${currentMonth}-01`, didFallback: true };
  }

  return {
    month: currentMonth,
    from: currentRange.from,
    to: currentRange.to,
    didFallback: raw !== undefined,
  };
}

/**
 * Lùi/tiến `delta` tháng: `('2026-01', -1)` → `'2025-12'`.
 *
 * Phục vụ hai nút "Tháng trước / Tháng sau" của `/sales/history` — cách chuyển
 * tháng rẻ nhất trên điện thoại, và cũng là CTA của empty state "tháng này chưa
 * có báo cáo" (`docs/05 §12` dòng 4).
 *
 * `Date.UTC` tự xử lý việc tràn năm, nên không có phép chia lấy dư nào ở đây.
 * Trả `null` cho đầu vào sai định dạng, cùng lý do với `getVietnamMonthRange()`.
 */
export function shiftVietnamMonth(yyyyMM: string, delta: number): string | null {
  if (typeof yyyyMM !== 'string' || !ISO_MONTH_PATTERN.test(yyyyMM)) return null;
  if (!Number.isInteger(delta)) return null;

  const [yearPart, monthPart] = yyyyMM.split('-') as [string, string];
  const shifted = new Date(Date.UTC(Number(yearPart), Number(monthPart) - 1 + delta, 1));

  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}
