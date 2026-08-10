/**
 * Dựng nội dung CSV — FR-034, UC-21, AF-09.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO KHÔNG DÙNG THƯ VIỆN, VÀ VÌ SAO KHÔNG NỐI CHUỖI Ở COMPONENT
 * ─────────────────────────────────────────────────────────────────────────
 *  CSV nghe như "nối chuỗi bằng dấu phẩy", và đó chính là lý do nó hay sai.
 *  Bốn cái bẫy thật, cả bốn đều xuất hiện trong dữ liệu BikeForce:
 *
 *    1. **Tuyến và ghi chú chứa dấu phẩy** ("Quận 1, Quận 3") → phải bọc `"`.
 *    2. **Ghi chú cuối ngày chứa xuống dòng** (`Textarea`, tới 1000 ký tự) →
 *       phải bọc `"`, và dùng CRLF làm dấu ngắt dòng theo RFC 4180.
 *    3. **Dấu nháy kép trong ghi chú** → phải nhân đôi thành `""`.
 *    4. **Excel tiếng Việt** mở UTF-8 không BOM sẽ ra `Tuyáº¿n` — nên file
 *       BẮT BUỘC có BOM `﻿` ở đầu. Đây là lý do thực dụng nhất khiến hàm
 *       này tồn tại: người nhận file mở bằng Excel, không phải bằng `cat`.
 *
 *  Không thêm dependency cho việc này (dự án giữ danh sách phụ thuộc ngắn):
 *  toàn bộ quy tắc RFC 4180 cần dùng gói gọn trong `escapeCell` bên dưới, và
 *  nó có unit test riêng.
 */
import { asciiNameSlug } from '@/lib/reports/share-card';

/** RFC 4180 quy định CRLF, và đó cũng là thứ Excel trên Windows mong đợi. */
const ROW_SEPARATOR = '\r\n';

/**
 * BOM UTF-8. Không có nó thì Excel đoán bảng mã theo locale máy và làm hỏng
 * toàn bộ dấu tiếng Việt — lỗi trông như lỗi dữ liệu chứ không như lỗi encoding.
 */
export const UTF8_BOM = '﻿';

/** Ký tự buộc phải bọc ô trong dấu nháy kép. */
const MUST_QUOTE = /[",\r\n]/;

/**
 * Một giá trị → một ô CSV an toàn.
 *
 * `null` / `undefined` → ô rỗng (không phải chuỗi `"null"`). Số giữ nguyên dạng
 * số để Excel tính toán được — **không** format tiền ở đây: một ô
 * `125.000.000 ₫` là chuỗi, cộng lại trong Excel ra 0 (BR-010 tinh thần: tiền
 * là số nguyên, chuỗi đã format chỉ dành cho màn hình).
 */
export function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';

  const text = String(value);

  if (!MUST_QUOTE.test(text)) return text;

  return `"${text.replaceAll('"', '""')}"`;
}

/**
 * Hàng tiêu đề + các hàng dữ liệu → nội dung CSV hoàn chỉnh kèm BOM.
 *
 * Không nhận `undefined` cho `headers` vì một file CSV không tiêu đề là thứ
 * người nhận phải đoán nghĩa từng cột.
 */
export function buildCsv(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<string | number | boolean | null | undefined>>,
): string {
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  // Dòng cuối cũng kết thúc bằng CRLF — một số công cụ cắt mất dòng cuối nếu
  // thiếu.
  return `${UTF8_BOM}${lines.join(ROW_SEPARATOR)}${ROW_SEPARATOR}`;
}

/**
 * Tên file tải về. Cùng quy ước với `shareImageFileName()` của Phase 6: chỉ ASCII
 * an toàn, vì header `Content-Disposition` với ký tự có dấu bị các trình duyệt
 * xử lý khác nhau.
 *
 * Dùng lại `asciiNameSlug()` chứ **không** tự viết một bộ lọc thứ hai: cắt thẳng
 * `[^A-Za-z0-9]` sẽ biến `'Báo cáo'` thành `'Bocao'` — mất chữ chứ không phải bỏ
 * dấu. `asciiNameSlug` tách dấu bằng `normalize('NFD')` nên giữ đủ mặt chữ
 * (`'Bao-cao'`).
 */
export function csvFileName(prefix: string, stamp: string): string {
  const safeStamp = stamp.replace(/[^0-9-]/g, '');

  return `${asciiNameSlug(prefix)}_${safeStamp}.csv`;
}
