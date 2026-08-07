/**
 * Định nghĩa BỐN chỉ tiêu của một báo cáo ngày — nguồn DUY NHẤT của "có những
 * chỉ tiêu nào, xếp theo thứ tự nào, nhãn tiếng Việt là gì, và đọc từ cột nào".
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO TÁCH RA ĐÂY (Phase 6)
 * ─────────────────────────────────────────────────────────────────────────
 *  Bảng đối chiếu trên web (`features/report-comparison/achievement-table.tsx`,
 *  Phase 5) và thẻ ảnh 9:16 (`features/report-share/`, Phase 6) trình bày CÙNG
 *  bốn dòng đó. `docs/07 §5` ghi rõ yêu cầu: "màn hình đối chiếu và thẻ ảnh 9:16
 *  không bao giờ ra hai con số khác nhau". Hai bảng hằng số song song là cách
 *  chắc chắn nhất để một ngày nào đó chỉ một bên được sửa — đúng thứ AGENTS.md §9
 *  cấm. Danh sách này còn được Admin dùng lại ở Phase 8/9.
 *
 *  Ở đây CHỈ có ánh xạ "chỉ tiêu ↔ cột ↔ nhãn". Công thức `%`, ngưỡng BR-023 và
 *  bảng đơn vị vẫn nằm nguyên ở `lib/kpi.ts` — file này không tính gì cả.
 */
import type { KpiMetric } from '@/lib/kpi';
import type { Database } from '@/types/database.types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

/**
 * Tên cột cam kết sáng và thực đạt của bốn chỉ tiêu ĐO ĐƯỢC.
 *
 * Liệt kê tường minh thay vì suy ra bằng `Extract<…, \`actual_${string}\`>`:
 * mẫu đó cũng khớp `actual_route`, một cột **text** không phải chỉ tiêu (DEC-029).
 * `Pick` bên dưới vẫn giữ ràng buộc với schema — gõ sai một tên cột là lỗi biên
 * dịch, không phải lỗi runtime.
 */
type TargetColumn =
  | 'target_visit_points'
  | 'target_sales_quantity'
  | 'target_revenue'
  | 'target_customer_visits';

type ActualColumn =
  | 'actual_visit_points'
  | 'actual_sales_quantity'
  | 'actual_revenue'
  | 'actual_customer_visits';

export type KpiMetricRow = {
  readonly metric: KpiMetric;
  /** Nhãn hiển thị — tiếng Việt, dùng chung cho web và ảnh. */
  readonly label: string;
  readonly targetColumn: TargetColumn;
  readonly actualColumn: ActualColumn;
};

/**
 * Thứ tự bốn dòng lấy đúng `docs/05 §7.1` và `§14`, giữ giống `CommitmentSummary`.
 * `actual_route` là cột text nên KHÔNG nằm trong danh sách này — nó không phải
 * một chỉ tiêu đo được (DEC-029).
 */
export const KPI_METRIC_ROWS: readonly KpiMetricRow[] = [
  {
    metric: 'VISIT_POINTS',
    label: 'Viếng thăm',
    targetColumn: 'target_visit_points',
    actualColumn: 'actual_visit_points',
  },
  {
    metric: 'SALES_QUANTITY',
    label: 'Doanh số',
    targetColumn: 'target_sales_quantity',
    actualColumn: 'actual_sales_quantity',
  },
  {
    metric: 'REVENUE',
    label: 'Doanh thu',
    targetColumn: 'target_revenue',
    actualColumn: 'actual_revenue',
  },
  {
    metric: 'CUSTOMER_VISITS',
    label: 'Khách hàng',
    targetColumn: 'target_customer_visits',
    actualColumn: 'actual_customer_visits',
  },
];

/**
 * Đúng tập cột mà một tầng trình bày cần đọc để dựng bốn dòng trên. Khai báo
 * tường minh thay vì nhận cả `DailyReportRow` để `lib/` không phụ thuộc vào
 * những cột nó không dùng.
 */
export type KpiMetricSource = Pick<DailyReportRow, TargetColumn | ActualColumn>;
