import { describe, expect, it } from 'vitest';

import type { KpiMetric } from '@/lib/kpi';
import { KPI_METRIC_ROWS, kpiMetricRow } from '@/lib/reports/metric-rows';

/**
 * `lib/reports/metric-rows.ts` là nguồn DUY NHẤT của "4 chỉ tiêu là gì" — bảng
 * đối chiếu web (Phase 5), thẻ ảnh 9:16 (Phase 6), phân tích tháng và biểu đồ
 * trend (Phase 9) đều đọc từ đây. `docs/07 §5` yêu cầu chúng **không bao giờ**
 * ra hai con số khác nhau, nên bài test này khoá lại chính cái hợp đồng đó.
 */

const ALL_METRICS: readonly KpiMetric[] = [
  'VISIT_POINTS',
  'SALES_QUANTITY',
  'REVENUE',
  'CUSTOMER_VISITS',
];

describe('KPI_METRIC_ROWS', () => {
  it('có đúng bốn dòng, đúng thứ tự docs/05 §7.1', () => {
    expect(KPI_METRIC_ROWS.map((row) => row.metric)).toEqual([
      'VISIT_POINTS',
      'SALES_QUANTITY',
      'REVENUE',
      'CUSTOMER_VISITS',
    ]);
  });

  it('mỗi dòng trỏ đúng cặp cột target/actual của schema', () => {
    for (const row of KPI_METRIC_ROWS) {
      expect(row.targetColumn.startsWith('target_')).toBe(true);
      expect(row.actualColumn.startsWith('actual_')).toBe(true);
      // Hai cột phải là cùng một chỉ tiêu, chỉ khác tiền tố.
      expect(row.targetColumn.slice('target_'.length)).toBe(
        row.actualColumn.slice('actual_'.length),
      );
    }
  });

  /**
   * `actual_route` là cột **text** (DEC-029), không phải chỉ tiêu đo được, nên
   * nó không được nằm trong danh sách.
   *
   * Ràng buộc này thực ra đã được TypeScript ép ở tầng kiểu: `ActualColumn`
   * liệt kê tường minh bốn cột, nên `row.actualColumn === 'actual_route'` là
   * **lỗi biên dịch** chứ không phải một phép so sánh chạy được. Bài test vì
   * thế khoá **danh sách đầy đủ** — cách duy nhất còn lại để một cột lạ lọt vào
   * là ai đó sửa cả kiểu lẫn dữ liệu, và khi đó bài này đỏ.
   */
  it('tập cột actual đúng bằng bốn chỉ tiêu đo được, không hơn không kém', () => {
    expect(KPI_METRIC_ROWS.map((row) => row.actualColumn).sort()).toEqual([
      'actual_customer_visits',
      'actual_revenue',
      'actual_sales_quantity',
      'actual_visit_points',
    ]);
  });

  it('nhãn tiếng Việt không rỗng và không trùng nhau', () => {
    const labels = KPI_METRIC_ROWS.map((row) => row.label);

    expect(labels.every((label) => label.trim() !== '')).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('kpiMetricRow', () => {
  it('tra được cả bốn chỉ tiêu và trả về đúng dòng trong danh sách', () => {
    for (const metric of ALL_METRICS) {
      const row = kpiMetricRow(metric);

      expect(row.metric).toBe(metric);
      // Cùng một đối tượng với phần tử trong mảng — mảng dựng TỪ bảng tra, nên
      // không có đường nào để hai bên lệch nội dung.
      expect(row).toBe(KPI_METRIC_ROWS.find((item) => item.metric === metric));
    }
  });
});
