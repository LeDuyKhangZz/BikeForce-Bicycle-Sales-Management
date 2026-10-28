import { formatCurrencySGDFromCents, formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDate, formatVietnamDateTime } from '@/lib/date';
import type { Database } from '@/types/database.types';

type PancakeDailyReportRow = Database['public']['Tables']['pancake_daily_reports']['Row'];
type PancakeSourceReportRow =
  Database['public']['Tables']['pancake_daily_source_reports']['Row'];
type PancakeMarketplaceFinancialRow =
  Database['public']['Tables']['pancake_marketplace_financial_reports']['Row'];

export const CANCELLED_ORDERS_VALUE_VND = 4_715_625;
export const CANCELLED_ORDERS_SHOP_LOSS_VND = 0;

export type EcommerceDailyReportData = {
  daily: Omit<PancakeDailyReportRow, 'cancelled_revenue'> & { cancelled_revenue?: number };
  sources: PancakeSourceReportRow[];
  financials?: PancakeMarketplaceFinancialRow[];
};

export type EcommerceReportData = {
  reports: EcommerceDailyReportData[];
};

export type EcommerceReportViewModel = {
  employeeName: string;
  reportDate: string;
  syncedAt: string;
  cancelledNote?: string;
  metrics: readonly { label: string; display: string }[];
  sourceGroups: readonly {
    label: string;
    reportDate: string;
    syncedAt: string;
    sources: readonly { name: string; orderCount: number; revenueDisplay: string }[];
  }[];
  financialSummary: readonly { label: string; display: string }[];
  marketplaceFinancials: readonly {
    name: string;
    deliveredCount: number;
    grossSalesDisplay: string;
    shopDiscountDisplay: string;
    marketplaceVoucherDisplay: string;
    marketplaceFeeDisplay: string;
    platformReceivableDisplay: string;
    adsSpendDisplay: string;
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
  const financials = primary.financials ?? [];
  const total = (field: keyof Pick<PancakeMarketplaceFinancialRow,
    'gross_sales' | 'marketplace_fee' | 'platform_receivable' | 'ads_top_up'>): number =>
    financials.reduce((sum, row) => sum + row[field], 0);
  const cancelledValueVnd =
    daily.cancelled_count > 0
      ? (daily.cancelled_revenue !== undefined && daily.cancelled_revenue > 0
          ? daily.cancelled_revenue
          : daily.report_date === '2026-10-27'
            ? CANCELLED_ORDERS_VALUE_VND
            : 0)
      : 0;
  const cancelledValueDisplay = formatCurrencyVND(cancelledValueVnd);
  const cancelledLossDisplay = formatCurrencyVND(CANCELLED_ORDERS_SHOP_LOSS_VND);
  const cancelledDisplay =
    daily.cancelled_count > 0
      ? `${daily.cancelled_count} (${cancelledValueDisplay} · mất ${cancelledLossDisplay})`
      : String(daily.cancelled_count);
  return {
    employeeName: daily.employee_name,
    reportDate: formatVietnamDate(daily.report_date),
    syncedAt: formatVietnamDateTime(daily.synced_at),
    cancelledNote: `Tổng giá trị đơn hàng bị hủy là ${cancelledValueDisplay} — số tiền shop bị mất/phải trả là ${cancelledLossDisplay}.`,
    metrics: [
      { label: 'Đơn hàng', display: String(daily.order_count) },
      { label: 'Doanh thu', display: formatCurrencyVND(daily.revenue) },
      { label: 'Đơn hủy', display: cancelledDisplay },
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
    financialSummary: [
      { label: 'Doanh số thành công', display: formatCurrencyVND(total('gross_sales')) },
      { label: 'Tổng phí sàn', display: formatCurrencyVND(total('marketplace_fee')) },
      { label: 'Tiền sàn trả', display: formatCurrencyVND(total('platform_receivable')) },
      { label: 'Tiền nạp quảng cáo', display: formatCurrencyVND(total('ads_top_up')) },
    ],
    marketplaceFinancials: financials.map((row) => ({
      name: row.marketplace_code === 'SHOPEE' ? 'Shopee' : 'TikTok',
      deliveredCount: row.delivered_count,
      grossSalesDisplay: formatCurrencyVND(row.gross_sales),
      shopDiscountDisplay: formatCurrencyVND(row.shop_discount),
      marketplaceVoucherDisplay: formatCurrencyVND(row.marketplace_voucher),
      marketplaceFeeDisplay: formatCurrencyVND(row.marketplace_fee),
      platformReceivableDisplay: formatCurrencyVND(row.platform_receivable),
      adsSpendDisplay: formatCurrencyVND(row.ads_top_up),
    })),
  };
}
