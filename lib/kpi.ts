/**
 * Nguồn DUY NHẤT của công thức KPI (NFR-012, AGENTS.md §9). Không component,
 * service, Server Action hay route ảnh nào được tự tính lại `actual / target × 100`,
 * và cũng không nơi nào được tự ghép đơn vị (`xe` / `điểm` / `khách` / `₫`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  TRẠNG THÁI: ĐÃ TRIỂN KHAI ở PHASE 5 (2026-08-07).
 *  Hai chốt chặn của Phase 5 đã được người dùng trả lời — xem DEC-038:
 *    • ISSUE-008 → `percent = null` đúng cho CẢ HAI ca; phân biệt bằng `status`.
 *    • DEC-025   → `calculateAchievement()` nhận thêm tham số `metric`, và trả
 *                  về CẢ chuỗi đã format (`display`) LẪN số vượt thô (`surplus`).
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Ràng buộc đã tuân thủ:
 *   • BR-004  — achievement được phép > 100%, KHÔNG clamp (`1.250,0%` hiện đủ).
 *   • BR-011  — KHÔNG persist vào DB, luôn tính runtime (DEC-007).
 *   • BR-014  — `achievement = actual / target × 100`; làm tròn 1 chữ số thập
 *               phân CHỈ ở `display`, còn `percent` giữ nguyên độ chính xác.
 *   • BR-015  — KHÔNG BAO GIỜ để `NaN` / `Infinity` lọt ra UI (DEC-025):
 *       ┌ target > 0             → percent = actual/target×100 → '83,3%'
 *       ├ target = 0, actual = 0 → percent = 100               → '100,0%'  EXCEEDED
 *       ├ target = 0, actual > 0 → percent = null → số vượt tuyệt đối có dấu
 *       │                          cộng + đơn vị ('+3 xe', '+3.000.000 ₫'),
 *       │                          nhãn "Vượt kế hoạch", EXCEEDED
 *       └ chưa có actual         → percent = null → '—'                    PENDING
 *   • BR-023  — ngưỡng ≥100 / 80–99.99 / <80 / chưa có actual. Giao diện KHÔNG
 *               BAO GIỜ tự quyết ngưỡng này.
 *   • BR-024  — "ngày đạt KPI" = cả 4 chỉ tiêu ≥ 100% (`isKpiAchievedDay`).
 *
 * ⚠ MỘT HỆ QUẢ CỐ Ý của việc BR-014 làm tròn ở tầng hiển thị còn BR-023 xét
 * ngưỡng trên số CHƯA làm tròn: `percent = 99.99` hiện `'100,0%'` nhưng mang
 * status `NEAR` ("Gần đạt"). Đây là hành vi ĐÚNG theo cả hai rule đang APPROVED —
 * chính `PROJECT_CHECKLIST.md § Phase 5` liệt kê `99.99` là một case biên bắt
 * buộc test, và BR-023 ghi rõ dải "Gần đạt" là `80–99.99%`. Đừng "sửa" bằng cách
 * xét ngưỡng trên số đã làm tròn: làm vậy là đổi BR-023, phải có DEC mới.
 */
import { formatCompactVND, formatCurrencyVND, formatThousands } from '@/lib/currency';

/** Ngưỡng do BR-023 quy định. Giao diện KHÔNG BAO GIỜ tự quyết ngưỡng này. */
export type AchievementStatus = 'EXCEEDED' | 'NEAR' | 'MISSED' | 'PENDING';

/**
 * Bốn chỉ tiêu của một báo cáo ngày. Tên khoá bám đúng hậu tố cột trong
 * `daily_reports` (`target_visit_points` / `actual_visit_points` → `VISIT_POINTS`)
 * để không ai phải tra bảng ánh xạ khi đọc code.
 */
export type KpiMetric = 'VISIT_POINTS' | 'SALES_QUANTITY' | 'REVENUE' | 'CUSTOMER_VISITS';

export type AchievementResult = {
  /**
   * `null` khi KHÔNG TỒN TẠI một con số phần trăm có ý nghĩa — đúng cho cả hai
   * ca: `target = 0 && actual > 0` (vượt kế hoạch) và chưa có `actual` (chờ số
   * liệu). Phân biệt hai ca bằng `status`, không phải bằng `percent` (ISSUE-008,
   * DEC-038). Không bao giờ `NaN` / `Infinity`.
   */
  percent: number | null;
  status: AchievementStatus;
  /** Chuỗi ĐÃ format sẵn để render thẳng: '83,3%' | '100,0%' | '+3 xe' | '—'. */
  display: string;
  /**
   * Số vượt tuyệt đối THÔ, chỉ khác `null` ở đúng ca `target = 0 && actual > 0`
   * (BR-015). Dành cho nơi cần con số chứ không cần chuỗi — thẻ ảnh 9:16 (Phase
   * 6) và tổng hợp của Admin (Phase 9). `display` đã chứa bản đã format.
   */
  surplus: number | null;
};

/** Hiển thị khi không có số liệu. Trùng quy ước `'—'` của `lib/currency.ts`. */
const EMPTY_DISPLAY = '—';

/** Đơn vị hiển thị theo từng chỉ tiêu — DEC-025. `REVENUE` đi đường riêng. */
const METRIC_UNIT: Record<Exclude<KpiMetric, 'REVENUE'>, string> = {
  VISIT_POINTS: 'điểm',
  SALES_QUANTITY: 'xe',
  CUSTOMER_VISITS: 'khách',
};

const STATUS_LABEL: Record<AchievementStatus, string> = {
  EXCEEDED: 'Vượt mục tiêu',
  NEAR: 'Gần đạt',
  MISSED: 'Chưa đạt',
  PENDING: 'Chờ số liệu',
};

/** Nhãn riêng của ca `target = 0 && actual > 0` — BR-015, DEC-025. */
const EXCEEDED_PLAN_LABEL = 'Vượt kế hoạch';

const percentFormatter = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * `83.333…` → `'83,3%'`, `1250` → `'1.250,0%'`.
 *
 * Làm tròn 1 chữ số thập phân là yêu cầu của BR-014 và chỉ áp dụng Ở ĐÂY —
 * `AchievementResult.percent` vẫn giữ giá trị chưa làm tròn.
 */
function formatPercent(percent: number): string {
  return `${percentFormatter.format(percent)}%`;
}

/**
 * Một số liệu chỉ dùng được nếu nó hữu hạn và không âm. Cột `target_*`/`actual_*`
 * đều có CHECK `>= 0` ở database nên số âm không thể tới đây bằng đường dữ liệu
 * thật; guard này chặn đường còn lại — lỗi lập trình ở tầng gọi.
 */
function isUsableNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * `8` + `VISIT_POINTS` → `'8 điểm'` · `150000000` + `REVENUE` → `'150.000.000 ₫'`.
 *
 * Đây là nơi DUY NHẤT biết chỉ tiêu nào đi với đơn vị nào (DEC-025). Bảng đối
 * chiếu, thẻ ảnh 9:16 và màn hình Admin đều phải gọi hàm này thay vì tự ghép
 * chuỗi — nếu không, ba nơi sẽ lệch nhau đúng lúc không ai để ý.
 *
 * Nhận `null` vì mọi cột `actual_*` đều nullable cho tới khi báo cáo hoàn tất:
 * ô "Thực đạt" của bảng đối chiếu cần đúng `'—'` ở trạng thái đó, và `'—'` chỉ
 * nên tồn tại ở một chỗ.
 */
export function formatMetricValue(value: number | null, metric: KpiMetric): string {
  if (value === null || !isUsableNumber(value)) return EMPTY_DISPLAY;
  if (metric === 'REVENUE') return formatCurrencyVND(value);
  return `${formatThousands(value)} ${METRIC_UNIT[metric]}`;
}

/**
 * Bản RÚT GỌN của `formatMetricValue()` — thêm ở PHASE 6 cho thẻ ảnh 9:16.
 *
 * `150000000` + `REVENUE` → `'150tr'`; ba chỉ tiêu còn lại **không đổi** vì trần
 * của chúng chỉ 4 chữ số (`MAX_SALES_QUANTITY = 10.000`) nên đã vừa khung sẵn.
 *
 * Vì sao là một hàm riêng chứ không phải một tham số `compact` của
 * `formatMetricValue()`: chỗ gọi nhiều nhất vẫn là bảng đối chiếu trên web, nơi
 * số đầy đủ mới đúng. Một tham số boolean ở đó sẽ luôn là `false` và sớm muộn
 * cũng có người truyền nhầm. Hai cái tên, hai chỗ dùng rõ ràng.
 *
 * Chỗ DUY NHẤT được dùng bản này là bảng 4 dòng của thẻ ảnh (`docs/05 §14`) —
 * khối "DOANH THU THỰC ĐẠT" bên dưới vẫn phải hiện số đầy đủ.
 */
export function formatMetricValueCompact(value: number | null, metric: KpiMetric): string {
  if (value === null || !isUsableNumber(value)) return EMPTY_DISPLAY;
  if (metric === 'REVENUE') return formatCompactVND(value);
  return formatMetricValue(value, metric);
}

/**
 * Ngưỡng BR-023 trên con số phần trăm CHƯA làm tròn.
 *
 * `null` ở đây mang đúng một nghĩa: **chưa có `actual`** → `PENDING`. Ca
 * `target = 0 && actual > 0` cũng có `percent = null` nhưng KHÔNG đi qua hàm này
 * — `calculateAchievement()` xử lý nó trước và gán thẳng `EXCEEDED` (BR-015).
 * Đó là lý do `AchievementResult.status` mới là thứ phân biệt hai ca, chứ không
 * phải `percent` (ISSUE-008).
 */
export function getAchievementStatus(pct: number | null): AchievementStatus {
  if (pct === null || !Number.isFinite(pct)) return 'PENDING';
  if (pct >= 100) return 'EXCEEDED';
  if (pct >= 80) return 'NEAR';
  return 'MISSED';
}

const PENDING_RESULT: AchievementResult = {
  percent: null,
  status: 'PENDING',
  display: EMPTY_DISPLAY,
  surplus: null,
};

/**
 * `actual / target × 100` theo BR-014, KHÔNG clamp (BR-004).
 *
 * `metric` chỉ dùng cho đúng một việc: dựng chuỗi số vượt tuyệt đối của ca
 * `target = 0 && actual > 0` (`'+3 xe'`, `'+3.000.000 ₫'`). Nó không tham gia
 * vào phép tính nào.
 *
 * Đầu vào không dùng được (không hữu hạn, âm) trả về `PENDING` + `'—'` thay vì
 * ném lỗi — cùng triết lý với DEC-033: một ô "Hoàn thành" trống thì đọc được,
 * còn một trang lỗi thì không.
 */
export function calculateAchievement(
  target: number,
  actual: number | null,
  metric: KpiMetric,
): AchievementResult {
  if (!isUsableNumber(target)) return PENDING_RESULT;
  if (actual === null || !isUsableNumber(actual)) return PENDING_RESULT;

  if (target === 0) {
    // Đã làm đúng cam kết "không đặt mục tiêu" → coi là đạt, 100,0% (BR-015).
    if (actual === 0) {
      return { percent: 100, status: 'EXCEEDED', display: formatPercent(100), surplus: null };
    }

    // Chia cho 0 không xác định về mặt toán học ⇒ không bịa ra `%`, mà nói thẳng
    // đã vượt BAO NHIÊU. `percent` để `null`, `status` mang thông tin phân biệt.
    return {
      percent: null,
      status: 'EXCEEDED',
      display: `+${formatMetricValue(actual, metric)}`,
      surplus: actual,
    };
  }

  const percent = (actual / target) * 100;

  return {
    percent,
    status: getAchievementStatus(percent),
    display: formatPercent(percent),
    surplus: null,
  };
}

/**
 * Nhãn tiếng Việt của badge trạng thái — BR-023, và BR-015 cho ca đặc biệt.
 *
 * Ở đây chứ không ở component vì đây là **từ vựng nghiệp vụ**: "Vượt mục tiêu"
 * (đạt ≥ 100% của một mục tiêu có thật) khác "Vượt kế hoạch" (không đặt mục tiêu
 * mà vẫn làm được). Ba nơi sẽ hiển thị nhãn này — bảng đối chiếu, thẻ ảnh 9:16,
 * màn hình Admin — và cả ba phải nói cùng một câu.
 *
 * Việc ánh xạ status → màu/icon thì ngược lại: đó là trình bày, thuộc `features/`
 * (xem chú thích đầu `components/ui/badge.tsx`).
 */
export function achievementLabel(result: AchievementResult): string {
  if (result.status === 'EXCEEDED' && result.percent === null) return EXCEEDED_PLAN_LABEL;
  return STATUS_LABEL[result.status];
}

/** Đúng bốn chỉ tiêu của một ngày — BR-024 nói "cả 4", không phải "phần lớn". */
const REQUIRED_METRIC_COUNT = 4;

/**
 * BR-024 — "ngày đạt KPI" = **cả 4** chỉ tiêu ≥ 100%.
 *
 * `EXCEEDED` đã bao gồm cả hai ca `target = 0` của BR-015: `actual = 0` cho
 * `100,0%`, còn `actual > 0` là vượt kế hoạch. `PENDING` (chưa hoàn tất báo cáo
 * cuối ngày) KHÔNG được tính là đạt — chưa có số liệu thì chưa kết luận được.
 *
 * Trả `false` nếu không nhận đủ 4 chỉ tiêu: thà báo "chưa đạt" còn hơn tuyên bố
 * một ngày là đạt KPI dựa trên 3 con số.
 */
export function isKpiAchievedDay(results: readonly AchievementResult[]): boolean {
  if (results.length !== REQUIRED_METRIC_COUNT) return false;
  return results.every((result) => result.status === 'EXCEEDED');
}
