import { formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDate, formatVietnamDateTime } from '@/lib/date';
import type { Database } from '@/types/database.types';

type PancakeDailyReportRow = Database['public']['Tables']['pancake_daily_reports']['Row'];
type PancakeSourceReportRow =
  Database['public']['Tables']['pancake_daily_source_reports']['Row'];

export type EcommerceReportData = {
  daily: PancakeDailyReportRow;
  sources: PancakeSourceReportRow[];
};

export type EcommerceReportViewModel = {
  employeeName: string;
  reportDate: string;
  syncedAt: string;
  metrics: readonly { label: string; display: string }[];
  sources: readonly { name: string; orderCount: number; revenueDisplay: string }[];
};

export function buildEcommerceReportViewModel(
  report: EcommerceReportData,
): EcommerceReportViewModel {
  const { daily, sources } = report;
  return {
    employeeName: daily.employee_name,
    reportDate: formatVietnamDate(daily.report_date),
    syncedAt: formatVietnamDateTime(daily.synced_at),
    metrics: [
      { label: 'Đơn hàng', display: String(daily.order_count) },
      { label: 'Doanh thu', display: formatCurrencyVND(daily.revenue) },
      { label: 'Đơn hủy', display: String(daily.cancelled_count) },
      { label: 'Đơn hoàn', display: String(daily.returned_count) },
      { label: 'Đơn trễ', display: String(daily.late_count) },
      { label: 'Đơn từ Ads', display: String(daily.ads_order_count) },
      { label: 'GMV Ads', display: formatCurrencyVND(daily.ads_gmv) },
    ],
    sources: sources.map((source) => ({
      name: source.source_name,
      orderCount: source.order_count,
      revenueDisplay: formatCurrencyVND(source.revenue),
    })),
  };
}
