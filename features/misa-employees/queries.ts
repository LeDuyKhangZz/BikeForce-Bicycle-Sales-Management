import type { SupabaseClient } from '@supabase/supabase-js';

import { getVietnamCurrentMonth, getVietnamMonthRange } from '@/lib/date';
import { summarizeMonthToDate } from '@/lib/reports/month-summary';
import {
  buildSaleWorkMetrics,
  buildShareCardPerformance,
  type ShareCardPerformance,
  type ShareCardSaleWorkMetric,
} from '@/lib/reports/share-card';
import { getSaleWorkAccountName } from '@/lib/salework/sales-account-map';
import { getMonthlyTargets } from '@/services/monthly-targets';
import { getSalesProfileByAmisEmployeeName } from '@/services/profiles';
import { getAmisMetricsForShare, listMonthToDateMetrics } from '@/services/reports';
import {
  getMonthlySaleWorkReportByAccountName,
  getSaleWorkReportByAccountName,
} from '@/services/salework';
import type { Database } from '@/types/database.types';

export type MisaEmployeeActivity = {
  employeeName: string;
  linkedSalesName: string | null;
  performance: ShareCardPerformance | null;
  saleWorkMetrics: readonly ShareCardSaleWorkMetric[] | null;
  saleWorkPeriodLabel: string;
};

/** Ghép MISA, chỉ tiêu BikeForce và SaleWork theo đúng hồ sơ nhân viên đã ánh xạ. */
export async function getMisaEmployeeActivity(
  supabase: SupabaseClient<Database>,
  employeeName: string,
  month: string,
): Promise<MisaEmployeeActivity> {
  const periodMonth = `${month}-01`;
  const profile = await getSalesProfileByAmisEmployeeName(supabase, employeeName);
  const accountName = profile === null ? null : getSaleWorkAccountName(profile.full_name);
  const range = getVietnamMonthRange(month);

  const [amis, targets, reportRows, saleWork] = await Promise.all([
    getAmisMetricsForShare(supabase, employeeName, periodMonth),
    profile === null ? Promise.resolve(null) : getMonthlyTargets(supabase, profile.id, periodMonth),
    profile === null || range === null
      ? Promise.resolve(null)
      : listMonthToDateMetrics(supabase, profile.id, range),
    accountName === null
      ? Promise.resolve(null)
      : month === getVietnamCurrentMonth()
        ? getSaleWorkReportByAccountName(accountName)
        : getMonthlySaleWorkReportByAccountName(accountName, month),
  ]);

  const summary = reportRows === null ? null : summarizeMonthToDate(reportRows);
  const performance = amis === null
    ? null
    : buildShareCardPerformance({
        amisTargetAmount: amis.target_amount,
        amisSalesActual: amis.current_amount,
        amisReceiveAmount: amis.receive_amount,
        amisAccountInCharge: amis.qty_account_in_charge,
        amisAccountInteractive: amis.qty_account_interactive,
        amisAccountSold: amis.qty_account_sold_this_period,
        amisOrderCount: amis.no_of_orders,
        amisReturnAmount: amis.return_sales,
        syncedAt: amis.synced_at,
        monthlyTargetSalesAmount: targets?.target_sales_amount ?? null,
        monthlyTargetRevenue: targets?.target_revenue ?? null,
        targetRevenue: summary?.targetRevenue ?? 0,
      }, month);

  return {
    employeeName,
    linkedSalesName: profile?.full_name ?? null,
    performance,
    saleWorkMetrics: saleWork === null ? null : buildSaleWorkMetrics(saleWork),
    saleWorkPeriodLabel: month === getVietnamCurrentMonth() ? 'Trong ngày' : `Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`,
  };
}
