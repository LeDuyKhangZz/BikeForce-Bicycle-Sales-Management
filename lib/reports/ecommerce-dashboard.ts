import { formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDate, formatVietnamShortDate } from '@/lib/date';
import type { PancakeEcommerceTrendRows } from '@/types/pancake-dashboard';

export type EcommerceDashboardTrend = {
  dailyRevenue: readonly {
    date: string;
    label: string;
    revenue: number;
    display: string;
  }[];
  platformMix: readonly {
    name: string;
    amount: number;
    display: string;
    percentage: number;
    orders: number;
    color: string;
  }[];
  latestOrderSources: readonly {
    name: string;
    count: number;
    color: string;
  }[];
  latestDateLabel: string | null;
};

const MARKETPLACES = [
  { code: 'TIKTOK', name: 'TikTok Shop', color: '#9453d3' },
  { code: 'SHOPEE', name: 'Shopee', color: '#3486e8' },
] as const;

export function buildEcommerceDashboardTrend(
  rows: PancakeEcommerceTrendRows,
): EcommerceDashboardTrend {
  const daily = [...rows.daily].sort((left, right) => left.report_date.localeCompare(right.report_date));
  const dailyRevenue = daily.map((row) => ({
    date: row.report_date,
    label: formatVietnamShortDate(row.report_date).slice(0, 5),
    revenue: row.revenue,
    display: formatCurrencyVND(row.revenue),
  }));
  const latest = daily.at(-1);
  const latestFinancials = latest === undefined
    ? []
    : rows.financials.filter((row) => row.report_date === latest.report_date);
  const platformMix = MARKETPLACES.map((marketplace) => {
    const matchingRows = latestFinancials.filter((row) => row.marketplace_code === marketplace.code);
    const amount = matchingRows.reduce((sum, row) => sum + row.gross_sales, 0);
    const orders = matchingRows.reduce((sum, row) => sum + row.delivered_count, 0);
    return { ...marketplace, amount, orders, display: formatCurrencyVND(amount), percentage: 0 };
  });
  const totalAmount = platformMix.reduce((sum, row) => sum + row.amount, 0);
  const normalizedMix = platformMix.map((row) => ({
    ...row,
    percentage: totalAmount > 0 ? (row.amount / totalAmount) * 100 : 0,
  }));
  const deliveredOrders = normalizedMix.reduce((sum, row) => sum + row.orders, 0);
  const latestOrderSources = latest === undefined
    ? []
    : [
        ...normalizedMix.map((row) => ({ name: row.name, count: row.orders, color: row.color })),
        {
          name: latestFinancials.length > 0 ? 'Khác' : 'Chưa phân loại',
          count: latestFinancials.length > 0
            ? Math.max(0, latest.order_count - latest.cancelled_count - deliveredOrders)
            : Math.max(0, latest.order_count - latest.cancelled_count),
          color: '#cbd5e1',
        },
      ];

  return {
    dailyRevenue,
    platformMix: normalizedMix,
    latestOrderSources,
    latestDateLabel: latest === undefined ? null : formatVietnamDate(latest.report_date),
  };
}
