import { parseCurrencyInput } from '@/lib/currency';
import { MAX_REVENUE_VND } from '@/lib/validation/report';

/**
 * Kiểm dữ liệu của màn hình "Chỉ tiêu tháng" — DEC-071.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO KHÔNG DÙNG ZOD Ở ĐÂY
 * ─────────────────────────────────────────────────────────────────────────
 *  Mọi form khác của dự án có **tập trường cố định**, nên một `z.object` mô tả
 *  đúng nó. Form này thì không: số ô bằng **số Sales × 2**, và danh sách Sales
 *  chỉ biết được lúc chạy. Dựng schema động cho mỗi request là viết một trình
 *  sinh schema chỉ để bọc đúng một phép kiểm số nguyên — hàm thuần dưới đây
 *  ngắn hơn, đọc thẳng hơn và test dễ hơn.
 *
 *  Phép kiểm SỐ vẫn đi qua `parseCurrencyInput()` của `lib/currency.ts`, không
 *  có parser tiền thứ hai trong dự án (AGENTS.md §9).
 */

/**
 * Trần một ô chỉ tiêu — dùng lại đúng trần của cột tiền theo ngày (BR-017).
 *
 * Chỉ tiêu tháng thực tế của một Sales là vài trăm triệu, nên trần này rộng gấp
 * hàng trăm lần nhu cầu. Nó không ở đây để chặn con số hợp lý mà để bắt lỗi gõ
 * thừa số 0 trước khi câu lệnh chạm database.
 */
export const MAX_MONTHLY_TARGET_VND = MAX_REVENUE_VND;

/** Hai ô của một dòng. Tên khớp cột trong `sales_monthly_targets`. */
export type MonthlyTargetKind = 'target_sales_amount' | 'target_revenue';

export const MONTHLY_TARGET_KINDS: readonly MonthlyTargetKind[] = [
  'target_sales_amount',
  'target_revenue',
];

/**
 * Tên field trong `FormData` của một ô.
 *
 * Một form, nhiều dòng ⇒ tên field phải mang `salesId`. Dùng `__` làm dấu ngăn
 * vì `salesId` là uuid (chỉ có chữ, số và `-`), nên không bao giờ đụng độ.
 */
export function monthlyTargetFieldName(kind: MonthlyTargetKind, salesId: string): string {
  return `${kind}__${salesId}`;
}

export type ParsedMonthlyTarget =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

/**
 * Một ô chỉ tiêu: `''` ⇒ **chưa giao** (`null`), không phải `0`.
 *
 * Phân biệt này là cốt lõi của DEC-071 chứ không phải chuyện hình thức: `null`
 * làm thẻ ảnh rơi về đường lùi (chỉ tiêu AMIS / tổng cam kết ngày), còn `0` là
 * một chỉ tiêu THẬT và BR-015 có hẳn nhánh xử lý nó. Gộp hai thứ lại là đổi
 * nghĩa tấm ảnh gửi cấp trên.
 */
export function parseMonthlyTargetInput(raw: unknown): ParsedMonthlyTarget {
  if (typeof raw !== 'string') return { ok: true, value: null };

  const trimmed = raw.trim();
  if (trimmed === '') return { ok: true, value: null };

  // `parseCurrencyInput` chỉ nhận số nguyên không âm (có thể phân nhóm nghìn),
  // nên số âm và số lẻ rơi vào đúng nhánh này.
  const value = parseCurrencyInput(trimmed);
  if (value === null) {
    return { ok: false, message: 'Chỉ nhập số tiền, ví dụ 640000000.' };
  }

  if (value > MAX_MONTHLY_TARGET_VND) {
    return { ok: false, message: 'Số quá lớn, hãy kiểm tra lại số chữ số.' };
  }

  return { ok: true, value };
}

/** `'2026-08'` → `'2026-08-01'`, khớp khoá `period_month` (kiểu `date`, luôn ngày 01). */
export function periodMonthOf(yyyyMM: string): string {
  return `${yyyyMM}-01`;
}
