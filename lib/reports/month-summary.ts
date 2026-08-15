/**
 * Lũy kế tháng của MỘT Sales — PHASE 17, **DEC-068**.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BỐN CON SỐ NÀY LÀ GÌ, VÀ AI CHỐT
 * ─────────────────────────────────────────────────────────────────────────
 *  Sếp của người dùng cần nhìn thấy, ngay trên tấm ảnh gửi Zalo, thành tích
 *  **cả tháng** của người gửi chứ không chỉ một ngày. Người dùng chốt ngày
 *  2026-08-14, đủ ba vế:
 *
 *    1. **Doanh số tháng** — cộng `actual_sales_amount`, tức tiền THỰC ĐẠT.
 *    2. **Doanh thu tháng** — cộng `actual_revenue` (tiền công nợ thu hồi được).
 *    3. **Số ngày đạt KPI** — đếm ngày đạt **cả 4** chỉ tiêu ≥ 100% (BR-024),
 *       KHÔNG phải số ngày đã gửi báo cáo.
 *
 *  ⚠ **Vế thứ tư thêm ở PHASE 19 (DEC-070): `targetRevenue`.** Cụm "Tình trạng
 *  thực hiện" trên thẻ ảnh lấy THỰC ĐẠT từ MISA AMIS, nhưng AMIS **không có**
 *  khái niệm "mục tiêu công nợ" — nó chỉ biết số đã thu. Chỉ tiêu của dòng
 *  doanh thu vì thế phải cộng từ chính `target_revenue` của các báo cáo trong
 *  tháng, đúng như màn hình "Hiệu suất tháng" của Admin đang làm.
 *
 *  Mốc cộng do `getVietnamMonthToDateRange()` quyết định và tầng gọi truyền
 *  xuống: từ ngày 01 của tháng chứa báo cáo, đến **ngày của báo cáo** với tấm
 *  ảnh chiều, và đến **hết ngày hôm trước** với tấm ảnh sáng (ngày hôm đó chưa
 *  có thực đạt nào). File này không tự chọn mốc và không đọc đồng hồ.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO CỘNG Ở ĐÂY CHỨ KHÔNG PHẢI BẰNG `sum()` CỦA POSTGRES
 * ─────────────────────────────────────────────────────────────────────────
 *  Vế "ngày đạt KPI" mới là vế quyết định. Đó là BR-024 áp lên **bốn** kết quả
 *  của `calculateAchievement()`, và BR-011 cấm persist phần trăm ⇒ muốn đếm
 *  bằng SQL thì phải chép công thức KPI (kèm cả hai nhánh `target = 0` của
 *  BR-015) xuống một hàm Postgres. Đó đúng là thứ AGENTS.md §9 và NFR-012 cấm:
 *  công thức KPI chỉ có MỘT nhà là `lib/kpi.ts`.
 *
 *  Chi phí của việc cộng ở tầng ứng dụng bằng không ở đây: `uq_daily_reports_
 *  sales_date` khiến một Sales có **tối đa 31 dòng** trong một tháng, và truy
 *  vấn chỉ kéo 8 cột số. Đây không phải màn hình tổng hợp toàn đội của Admin —
 *  chỗ đó vẫn dùng hàm SQL `admin_*` như cũ.
 */
import { calculateAchievement, isKpiAchievedDay } from '@/lib/kpi';
import { KPI_METRIC_ROWS, kpiMetricRow, type KpiMetricSource } from '@/lib/reports/metric-rows';

/**
 * Một ngày trong tháng, rút về đúng 8 cột số mà các con số trên cần đọc.
 *
 * Dùng lại `KpiMetricSource` thay vì khai một danh sách cột thứ hai: nếu một
 * ngày nào đó bộ bốn chỉ tiêu đổi (như DEC-050 đã đổi một lần), chỗ này hỏng
 * lúc biên dịch chứ không âm thầm cộng thiếu.
 */
export type MonthToDateRow = KpiMetricSource;

export type MonthToDateSummary = {
  /** Tổng `actual_sales_amount` — VND nguyên, chưa format (BR-010). */
  readonly salesAmount: number;
  /** Tổng `actual_revenue` — VND nguyên, chưa format (BR-010). */
  readonly revenue: number;
  /**
   * Tổng `target_revenue` — chỉ tiêu doanh thu cả tháng. PHASE 19, DEC-070.
   *
   * Là con số DUY NHẤT của cụm "Tình trạng thực hiện" không đến từ MISA AMIS:
   * AMIS ghi nhận tiền đã thu nhưng không biết Sales tự đặt mục tiêu bao nhiêu.
   */
  readonly targetRevenue: number;
  /** Số ngày đạt **cả 4** chỉ tiêu ≥ 100% — BR-024. */
  readonly kpiAchievedDays: number;
  /** Số ngày có báo cáo trong khoảng. Không in lên ảnh, dùng cho test và log. */
  readonly reportedDays: number;
};

/** Khoảng rỗng (ảnh sáng của ngày 01) vẫn phải ra số đọc được, không phải `null`. */
export const EMPTY_MONTH_SUMMARY: MonthToDateSummary = {
  salesAmount: 0,
  revenue: 0,
  targetRevenue: 0,
  kpiAchievedDays: 0,
  reportedDays: 0,
};

/** Tên các cột lấy TỪ bảng chỉ tiêu, không gõ lại chuỗi (DEC-050). */
const SALES_AMOUNT_COLUMN = kpiMetricRow('SALES_AMOUNT').actualColumn;
const REVENUE_COLUMN = kpiMetricRow('REVENUE').actualColumn;
const REVENUE_TARGET_COLUMN = kpiMetricRow('REVENUE').targetColumn;

/**
 * Cột `actual_*` là NULL cho tới khi Sales nhập cuối ngày. Một ngày mới có cam
 * kết sáng đóng góp **0**, không phải `NaN` — cùng tinh thần BR-015: không bao
 * giờ để một giá trị không tính được lọt ra tấm ảnh gửi cho cấp trên.
 */
function usableAmount(value: number | null): number {
  if (value === null || !Number.isFinite(value) || value < 0) return 0;
  return value;
}

/**
 * Cộng và đếm — hàm THUẦN, nên mọi ca biên kiểm được bằng unit test không cần
 * database.
 *
 * Không lo tràn số: trần một ngày là 100 tỷ (BR-017), 31 ngày cho 3,1e12, còn
 * `Number.MAX_SAFE_INTEGER` là 9e15.
 */
export function summarizeMonthToDate(
  rows: readonly MonthToDateRow[],
): MonthToDateSummary {
  let salesAmount = 0;
  let revenue = 0;
  let targetRevenue = 0;
  let kpiAchievedDays = 0;

  for (const row of rows) {
    salesAmount += usableAmount(row[SALES_AMOUNT_COLUMN]);
    revenue += usableAmount(row[REVENUE_COLUMN]);
    targetRevenue += usableAmount(row[REVENUE_TARGET_COLUMN]);

    // BR-024 đi qua ĐÚNG đường mà bảng đối chiếu và thẻ ảnh đang đi: bốn lời gọi
    // `calculateAchievement()` rồi `isKpiAchievedDay()`. Không có ngưỡng nào
    // được viết lại ở đây (NFR-012).
    const achievements = KPI_METRIC_ROWS.map((metricRow) =>
      calculateAchievement(row[metricRow.targetColumn], row[metricRow.actualColumn], metricRow.metric),
    );

    if (isKpiAchievedDay(achievements)) kpiAchievedDays += 1;
  }

  return { salesAmount, revenue, targetRevenue, kpiAchievedDays, reportedDays: rows.length };
}