/**
 * ─────────────────────────────────────────────────────────────────────────
 *  KHUNG CỦA PHASE 1 — CHƯA CÓ LOGIC. Triển khai đầy đủ ở PHASE 5.
 * ─────────────────────────────────────────────────────────────────────────
 * Nguồn DUY NHẤT của việc format tiền (AGENTS.md §9). Không component nào được
 * gọi `toLocaleString` hay `Intl.NumberFormat` trực tiếp.
 *
 * Ràng buộc Phase 5 phải tuân thủ:
 *   • BR-010 / DEC-008 — tiền lưu trong DB là SỐ NGUYÊN VND (`bigint`).
 *     TUYỆT ĐỐI không lưu chuỗi đã format. Format CHỈ ở tầng hiển thị.
 *   • `formatCurrencyVND` dùng
 *     `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })`
 *     → `125000000` cho ra `'125.000.000 ₫'`.
 *   • `parseCurrencyInput` trả `null` cho input không hợp lệ — bao gồm số vượt
 *     `Number.MAX_SAFE_INTEGER` (docs/08 §): chống mất chính xác TRƯỚC khi gửi
 *     xuống cột `bigint`.
 *   • Trần doanh thu 100.000.000.000 VND (BR-017) được enforce ở Zod +
 *     DB CHECK, không phải ở đây.
 *
 * Unit test bắt buộc ở Phase 5: 0 · 1000 · 125000000 · 99999999999.
 */

export function formatCurrencyVND(_value: number): string {
  throw new Error('formatCurrencyVND() chưa được triển khai — xem PHASE 5.');
}

export function parseCurrencyInput(_raw: string): number | null {
  throw new Error('parseCurrencyInput() chưa được triển khai — xem PHASE 5.');
}
