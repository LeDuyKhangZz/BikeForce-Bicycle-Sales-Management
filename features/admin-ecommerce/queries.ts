import {
  buildEcommerceReportViewModel,
  type EcommerceReportViewModel,
} from '@/lib/reports/ecommerce-report';
import { formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDateTime } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import {
  getLatestPancakeDailyReports,
  getRecentPancakeEcommerceTrend,
} from '@/services/pancake-reports';
import { getLatestTikTokAdBalance } from '@/services/tiktok-ad-balances';
import { buildAdFinanceViewModel, type AdFinanceViewModel } from '@/lib/reports/ad-finance';
import { getAdFinanceRows } from '@/services/ad-finance';
import { buildEcommerceDashboardTrend, type EcommerceDashboardTrend } from '@/lib/reports/ecommerce-dashboard';

export type { EcommerceReportViewModel } from '@/lib/reports/ecommerce-report';
export type { EcommerceDashboardTrend } from '@/lib/reports/ecommerce-dashboard';

export async function getEcommerceDashboardTrend(): Promise<EcommerceDashboardTrend> {
  const supabase = await createClient();
  return buildEcommerceDashboardTrend(await getRecentPancakeEcommerceTrend(supabase));
}

export type TikTokAdBalanceViewModel = {
  balanceDisplay: string;
  capturedAtDisplay: string;
  paymentPortfolioId: string;
};

export async function getLatestEcommerceReportViewModel(): Promise<EcommerceReportViewModel | null> {
  const supabase = await createClient();
  const report = await getLatestPancakeDailyReports(supabase);
  if (report === null) return null;

  return buildEcommerceReportViewModel(report);
}

export async function getLatestTikTokAdBalanceViewModel(): Promise<TikTokAdBalanceViewModel | null> {
  const supabase = await createClient();
  const snapshot = await getLatestTikTokAdBalance(supabase);
  if (snapshot === null) return null;

  return {
    balanceDisplay: formatCurrencyVND(snapshot.available_cash_balance),
    capturedAtDisplay: formatVietnamDateTime(snapshot.captured_at),
    paymentPortfolioId: snapshot.payment_portfolio_id,
  };
}

export async function getAdFinanceViewModel(): Promise<AdFinanceViewModel> {
  const supabase = await createClient();
  return buildAdFinanceViewModel(await getAdFinanceRows(supabase));
}
