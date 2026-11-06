import { formatMetricValue, formatMetricValueCompact } from '@/lib/kpi';

export type MonthlySalesTargetTrendPoint = {
  periodMonth: string;
  targetSalesAmount: number;
  actualSalesAmount: number;
};

export type MonthlySalesTargetTrendModel = {
  year: number;
  maxValue: number;
  gridValues: number[];
  gridLabels: string[];
  selectedMonth: string;
  points: Array<MonthlySalesTargetTrendPoint & {
    label: string;
    targetY: number;
    actualY: number;
    targetText: string;
    actualText: string;
    targetFullText: string;
    actualFullText: string;
    targetChartText: string;
    actualChartText: string;
  }>;
};

const CHART_TOP = 20;
const CHART_BOTTOM = 180;

function usableAmount(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/** Biểu đồ ghi đơn vị triệu đồng, giống quy ước báo cáo quản trị. */
function formatMillions(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value / 1_000_000);
}

/** Tháng gần nhất theo vị trí ngang 0..1 của con trỏ trong vùng đồ thị. */
export function getMonthlyTrendNearestIndex(position: number, pointCount: number): number {
  if (!Number.isFinite(position) || pointCount < 1) return 0;
  const bounded = Math.min(1, Math.max(0, position));
  return Math.min(pointCount - 1, Math.round(bounded * (pointCount - 1)));
}

/** Chuẩn bị toàn bộ số và toạ độ cho biểu đồ; component chỉ vẽ SVG. */
export function buildMonthlySalesTargetTrend(
  points: readonly MonthlySalesTargetTrendPoint[],
  selectedMonth: string,
): MonthlySalesTargetTrendModel {
  const selectedYear = Number(selectedMonth.slice(0, 4));
  // `selectedMonth` xuất phát từ resolveVietnamMonth(); nhánh dự phòng chỉ giúp
  // hàm thuần không sinh NaN nếu bị gọi sai trong test hoặc khi tái sử dụng.
  const year = Number.isInteger(selectedYear) ? selectedYear : 0;
  const byMonth = new Map(points.map((point) => [point.periodMonth, point]));
  const values = Array.from({ length: 12 }, (_, index) => {
    const periodMonth = `${year}-${String(index + 1).padStart(2, '0')}-01`;
    const source = byMonth.get(periodMonth);
    return {
      periodMonth,
      targetSalesAmount: usableAmount(source?.targetSalesAmount ?? 0),
      actualSalesAmount: usableAmount(source?.actualSalesAmount ?? 0),
    };
  });
  const maxValue = Math.max(1, ...values.flatMap((point) => [point.targetSalesAmount, point.actualSalesAmount]));

  return {
    year,
    maxValue,
    gridValues: [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0],
    gridLabels: [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0].map(formatMillions),
    selectedMonth,
    points: values.map((point, index) => ({
      ...point,
      label: `T${index + 1}`,
      targetY: CHART_BOTTOM - (point.targetSalesAmount / maxValue) * (CHART_BOTTOM - CHART_TOP),
      actualY: CHART_BOTTOM - (point.actualSalesAmount / maxValue) * (CHART_BOTTOM - CHART_TOP),
      targetText: formatMetricValueCompact(point.targetSalesAmount, 'SALES_AMOUNT'),
      actualText: formatMetricValueCompact(point.actualSalesAmount, 'SALES_AMOUNT'),
      targetFullText: formatMetricValue(point.targetSalesAmount, 'REVENUE'),
      actualFullText: formatMetricValue(point.actualSalesAmount, 'REVENUE'),
      targetChartText: formatMillions(point.targetSalesAmount),
      actualChartText: formatMillions(point.actualSalesAmount),
    })),
  };
}
