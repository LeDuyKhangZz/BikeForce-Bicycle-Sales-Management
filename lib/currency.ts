/**
 * Nguồn DUY NHẤT của việc format và parse tiền (AGENTS.md §9). Không component
 * nào được gọi `toLocaleString` hay `Intl.NumberFormat` trực tiếp.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  TRẠNG THÁI: ĐÃ TRIỂN KHAI ở PHASE 3 (DEC-032). Ban đầu thuộc Phase 5, kéo
 *  lên sớm vì `CurrencyInput` của form đầu ngày (FR-008, docs/05 §6.2) và cột
 *  "Mục tiêu doanh thu" của `/sales/today` (FR-007) đều cần ngay.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Ràng buộc đã tuân thủ:
 *   • BR-010 / DEC-008 — tiền lưu trong DB là SỐ NGUYÊN VND (`bigint`).
 *     TUYỆT ĐỐI không lưu chuỗi đã format. Format CHỈ ở tầng hiển thị.
 *   • `parseCurrencyInput` trả `null` cho input không hợp lệ — bao gồm số vượt
 *     `Number.MAX_SAFE_INTEGER`: chống mất chính xác TRƯỚC khi gửi xuống cột
 *     `bigint`.
 *   • Trần doanh thu 100.000.000.000 VND (BR-017) do Zod + DB CHECK gác, KHÔNG
 *     phải hàm này. `parseCurrencyInput('100000000001')` vẫn trả về số —
 *     ranh giới trách nhiệm này có test khoá lại (docs/08 §3.4).
 */

/** Hiển thị khi không có giá trị hợp lệ. Không bao giờ để `NaN` lọt ra UI. */
const EMPTY_DISPLAY = '—';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/**
 * `125000000` → `'125.000.000 ₫'`.
 *
 * ⚠ Ký tự giữa số và `₫` là **NO-BREAK SPACE `U+00A0`**, không phải space
 * thường. Assertion nào so chuỗi tiền mà gõ space thường sẽ FAIL dù code đúng
 * (docs/08 §3.3). `parseCurrencyInput` bên dưới xử lý được cả hai.
 */
export function formatCurrencyVND(value: number): string {
  if (!Number.isFinite(value)) return EMPTY_DISPLAY;
  return currencyFormatter.format(value);
}

const groupFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/**
 * `125000000` → `'125.000.000'` — **không kèm ký hiệu `₫`**.
 *
 * Đây là bạn đồng hành của `parseCurrencyInput` cho ô nhập tiền: `docs/05 §6.2`
 * yêu cầu CurrencyInput phân nhóm nghìn khi `blur`, nhưng để ký hiệu tiền tệ
 * ngay trong ô thì con trỏ và bàn phím số trên điện thoại rất khó dùng.
 * Nhãn đơn vị nằm ở helper text của field, không nằm trong giá trị.
 */
export function formatThousands(value: number): string {
  if (!Number.isFinite(value)) return '';
  return groupFormatter.format(value);
}

/* ---------------------------------------------------------------------------
 * Dạng RÚT GỌN — thêm ở PHASE 6 cho thẻ ảnh 9:16 (`docs/05 §14`).
 *
 * Bảng 4 dòng của thẻ ảnh chỉ rộng 1080px mà phải chứa cả cột "Cam kết" lẫn cột
 * "Thực đạt"; doanh thu 12 chữ số ở dạng đầy đủ (`100.000.000.000 ₫`) làm vỡ
 * khung. `docs/05 §14` vì vậy quy định: **trong bảng dùng dạng rút gọn**, còn số
 * đầy đủ đặt ở khối "DOANH THU THỰC ĐẠT" bên dưới.
 *
 * Đặt ở đây chứ không ở component vì AGENTS.md §9: định dạng tiền chỉ có MỘT
 * nhà. Thẻ ảnh gọi qua `formatMetricValueCompact()` của `lib/kpi.ts`.
 * ------------------------------------------------------------------------- */

/** Bậc rút gọn theo cách người Việt đọc số tiền. Xếp GIẢM DẦN — thứ tự quan trọng. */
const COMPACT_TIERS = [
  { divisor: 1_000_000_000, suffix: 'tỷ' },
  { divisor: 1_000_000, suffix: 'tr' },
  { divisor: 1_000, suffix: 'k' },
] as const;

/** Dưới ngưỡng này thì rút gọn không rút được gì — hiện luôn số đầy đủ. */
const COMPACT_FLOOR = 1_000;

const compactFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/**
 * `150000000` → `'150tr'` · `1250000000` → `'1,3tỷ'` · `950000` → `'950k'`.
 *
 * Dưới 1.000 ₫ (và mọi giá trị âm — không thể tới đây bằng đường dữ liệu thật vì
 * DB có CHECK `>= 0`) thì trả về đúng `formatCurrencyVND()`, nên `0` vẫn đọc là
 * `'0 ₫'` chứ không phải `'0k'`.
 */
export function formatCompactVND(value: number): string {
  if (!Number.isFinite(value)) return EMPTY_DISPLAY;
  if (value < COMPACT_FLOOR) return formatCurrencyVND(value);

  for (let index = 0; index < COMPACT_TIERS.length; index += 1) {
    const tier = COMPACT_TIERS[index];
    if (tier === undefined || value < tier.divisor) continue;

    const scaled = Math.round((value / tier.divisor) * 10) / 10;

    // Làm tròn 1 chữ số có thể đẩy `999,97tr` thành `1.000tr` — con số đó đúng
    // nhưng đọc sai bậc. Bậc cao hơn luôn tồn tại ở đây: nếu nó không tồn tại
    // thì `value >= 1e9` và `scaled` không thể chạm 1.000 (trần BR-017 là 100 tỷ).
    const higher = COMPACT_TIERS[index - 1];
    if (scaled >= 1_000 && higher !== undefined) {
      return `${compactFormatter.format(scaled / 1_000)}${higher.suffix}`;
    }

    return `${compactFormatter.format(scaled)}${tier.suffix}`;
  }

  // Không tới được: vòng lặp trên luôn khớp một bậc khi `value >= COMPACT_FLOOR`.
  return formatCurrencyVND(value);
}

/** Số nguyên thuần: `'125000000'`. */
const PLAIN_INTEGER = /^\d+$/;

/**
 * Số đã phân nhóm nghìn kiểu vi-VN: `'125.000.000'`.
 *
 * Bắt buộc có ÍT NHẤT một nhóm `.ddd` và nhóm đầu tối đa 3 chữ số. Nhờ vậy
 * `'1.500'` là một nghìn rưỡi, còn `'1.5'` bị TỪ CHỐI thay vì bị hiểu nhầm
 * thành `1.5` hay `15`. VND không có phần lẻ (BR-010).
 */
const GROUPED_INTEGER = /^\d{1,3}(?:\.\d{3})+$/;

/**
 * `'125.000.000 ₫'` → `125000000`. Trả `null` với mọi đầu vào không phải một số
 * nguyên VND hợp lệ: chuỗi rỗng, chữ cái, số âm, số thập phân, ký hiệu khoa học
 * (`'1e9'`), và số vượt `Number.MAX_SAFE_INTEGER`.
 */
export function parseCurrencyInput(raw: string): number | null {
  if (typeof raw !== 'string') return null;

  // Bỏ ký hiệu tiền tệ và MỌI khoảng trắng — gồm cả NBSP `U+00A0` do Intl chèn.
  const cleaned = raw.replace(/[\s ₫]/g, '');
  if (cleaned === '') return null;

  if (!PLAIN_INTEGER.test(cleaned) && !GROUPED_INTEGER.test(cleaned)) return null;

  const value = Number(cleaned.replace(/\./g, ''));

  // `Number.isSafeInteger` bắt cả `1e20`: quá ngưỡng an toàn thì mọi phép so
  // sánh sau đó đều không đáng tin, và `bigint` phía Postgres sẽ nhận số sai.
  if (!Number.isSafeInteger(value)) return null;

  return value;
}
