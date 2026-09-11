import { formatCurrencyVND } from '@/lib/currency';
import { formatVietnamMonth } from '@/lib/date';
import {
  buildSaleWorkMetrics,
  buildShareCardPerformance,
  type ShareCardPerformance,
  type ShareCardPerformanceSource,
  type ShareCardSaleWorkMetric,
  type ShareCardSaleWorkSource,
} from '@/lib/reports/share-card';

export type MonthlySummaryCardModel = {
  readonly monthText: string;
  readonly salesName: string;
  readonly employeeCode: string | null;
  readonly performance: ShareCardPerformance | null;
  readonly saleWorkMetrics: readonly ShareCardSaleWorkMetric[] | null;
  readonly travelExpenseText: string;
  readonly salaryText: string;
};

export function buildMonthlySummaryCardModel(input: {
  month: string;
  salesName: string;
  employeeCode: string | null;
  performance: ShareCardPerformanceSource | null;
  saleWork: ShareCardSaleWorkSource | null;
  travelExpense: number | null;
  salary: number | null;
}): MonthlySummaryCardModel {
  const monthText = formatVietnamMonth(input.month);

  return {
    monthText,
    salesName: input.salesName.trim().toLocaleUpperCase('vi-VN'),
    employeeCode: input.employeeCode?.trim() || null,
    performance:
      input.performance === null
        ? null
        : buildShareCardPerformance(input.performance, input.month),
    saleWorkMetrics: input.saleWork === null ? null : buildSaleWorkMetrics(input.saleWork),
    travelExpenseText:
      input.travelExpense === null ? '-' : formatCurrencyVND(input.travelExpense),
    salaryText: input.salary === null ? '-' : formatCurrencyVND(input.salary),
  };
}

export function monthlySummaryImagePath(salesId: string, month: string): string {
  return `/api/admin/monthly-summaries/${salesId}/image?month=${encodeURIComponent(month)}`;
}
