import { formatCurrencySGDFromCents, formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDate, formatVietnamDateTime } from '@/lib/date';
import type { Database } from '@/types/database.types';

type PancakeDailyReportRow = Database['public']['Tables']['pancake_daily_reports']['Row'];
type PancakeSourceReportRow =
  Database['public']['Tables']['pancake_daily_source_reports']['Row'];

export type EcommerceDailyReportData = {
  daily: PancakeDailyReportRow;
  sources: PancakeSourceReportRow[];
};

export type EcommerceReportData = {
  reports: EcommerceDailyReportData[];
};

export type EcommerceReportViewModel = {
  employeeName: string;
  reportDate: string;
  syncedAt: string;
  metrics: readonly { label: string; display: string }[];
  sourceGroups: readonly {
    label: string;
    reportDate: string;
    syncedAt: string;
    sources: readonly { name: string; orderCount: number; revenueDisplay: string }[];
  }[];
};

function formatSourceRevenue(value: number, currencyCode: string): string {
  return currencyCode === 'SGD'
    ? formatCurrencySGDFromCents(value)
    : formatCurrencyVND(value);
}

function buildSourceRows(
  marketCode: string,
  currencyCode: string,
  sources: PancakeSourceReportRow[],
): readonly { name: string; orderCount: number; revenueDisplay: string }[] {
  if (marketCode === 'SG') {
    return ['Shopee', 'Tiktok'].map((name) => {
      const source = sources.find(
        (candidate) => candidate.source_name.toLowerCase() === name.toLowerCase(),
      );
      return {
        name,
        orderCount: source?.order_count ?? 0,
        revenueDisplay: formatCurrencySGDFromCents(source?.revenue ?? 0),
      };
    });
  }
  return sources.map((source) => ({
    name: source.source_name,
    orderCount: source.order_count,
    revenueDisplay: formatSourceRevenue(source.revenue, currencyCode),
  }));
}

export function buildEcommerceReportViewModel(
  report: EcommerceReportData,
): EcommerceReportViewModel | null {
  const primary = report.reports.find(({ daily }) => daily.market_code === 'VN');
  if (primary === undefined) return null;
  const { daily } = primary;
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
    sourceGroups: report.reports.map(({ daily: marketDaily, sources }) => ({
      label: marketDaily.market_code === 'SG' ? 'Nguồn Singapore' : 'Nguồn Việt Nam',
      reportDate: formatVietnamDate(marketDaily.report_date),
      syncedAt: formatVietnamDateTime(marketDaily.synced_at),
      sources: buildSourceRows(marketDaily.market_code, marketDaily.currency_code, sources),
    })),
  };
}
