import { formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDate, formatVietnamDateTime } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { getLatestPancakeDailyReport } from '@/services/pancake-reports';

export type EcommerceReportViewModel = {
  employeeName: string;
  reportDate: string;
  syncedAt: string;
  metrics: readonly { label: string; display: string }[];
  sources: readonly { name: string; orderCount: number; revenueDisplay: string }[];
};

export async function getLatestEcommerceReportViewModel(): Promise<EcommerceReportViewModel | null> {
  const supabase = await createClient();
  const report = await getLatestPancakeDailyReport(supabase);
  if (report === null) return null;

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
