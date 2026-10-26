import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';
import { pancakeReportImageSchema } from '@/lib/validation/pancake-report';
import { PANCAKE_REPORT_SHOP_IDS } from '@/lib/pancake/shops';

type PancakeDailyReportRow = Database['public']['Tables']['pancake_daily_reports']['Row'];
type PancakeSourceReportRow =
  Database['public']['Tables']['pancake_daily_source_reports']['Row'];
type PancakeMarketplaceFinancialRow =
  Database['public']['Tables']['pancake_marketplace_financial_reports']['Row'];

export type PancakeDailyReport = {
  daily: PancakeDailyReportRow;
  sources: PancakeSourceReportRow[];
  financials?: PancakeMarketplaceFinancialRow[];
};

export type PancakeReportCollection = {
  reports: PancakeDailyReport[];
};

const SOURCE_PAGE_SIZE = 50;

async function getLatestPancakeDailyReportByShop(
  supabase: SupabaseClient<Database>,
  shopId: number,
): Promise<PancakeDailyReport | null> {
  const { data: daily, error: dailyError } = await supabase
    .from('pancake_daily_reports')
    .select(
      'report_date,shop_id,employee_name,market_code,currency_code,order_count,revenue,cancelled_count,returned_count,late_count,ads_order_count,ads_gmv,synced_at',
    )
    .eq('shop_id', shopId)
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dailyError) {
    console.error('[getLatestPancakeDailyReport]', dailyError.code, dailyError.message);
    return null;
  }
  if (daily === null) return null;

  const { data: sources, error: sourcesError } = await supabase
    .from('pancake_daily_source_reports')
    .select('report_date,shop_id,source_name,order_count,revenue,synced_at', { count: 'exact' })
    .eq('report_date', daily.report_date)
    .eq('shop_id', daily.shop_id)
    .order('source_name', { ascending: true })
    .range(0, SOURCE_PAGE_SIZE - 1);

  if (sourcesError) {
    console.error('[getLatestPancakeDailyReport:sources]', sourcesError.code, sourcesError.message);
    return null;
  }

  const { data: financials, error: financialsError } = await supabase
    .from('pancake_marketplace_financial_reports')
    .select(
      'report_date,shop_id,marketplace_code,currency_code,delivered_count,gross_sales,shop_discount,marketplace_voucher,marketplace_fee,platform_receivable,cod,prepaid,capital,payment_fee,seller_transaction_fee,service_fee,sfp_service_fee,affiliate_commission,platform_commission,platform_shipping_fee,diff_shipping_fee,marketplace_tax,marketing_fee,ads_top_up,synced_at',
      { count: 'exact' },
    )
    .eq('report_date', daily.report_date)
    .eq('shop_id', daily.shop_id)
    .order('marketplace_code', { ascending: true })
    .range(0, SOURCE_PAGE_SIZE - 1);

  if (financialsError) {
    console.error('[getLatestPancakeDailyReport:financials]', financialsError.code, financialsError.message);
    return null;
  }

  return { daily, sources: sources ?? [], financials: financials ?? [] };
}

export async function getLatestPancakeDailyReports(
  supabase: SupabaseClient<Database>,
): Promise<PancakeReportCollection | null> {
  const reports = await Promise.all(
    PANCAKE_REPORT_SHOP_IDS.map((shopId) => getLatestPancakeDailyReportByShop(supabase, shopId)),
  );
  const available = reports.filter((report): report is PancakeDailyReport => report !== null);
  return available.length === 0 ? null : { reports: available };
}

export async function getLatestPancakeReportForImage(
  supabase: SupabaseClient<Database>,
): Promise<PancakeReportCollection | null> {
  const { data, error } = await supabase.rpc('get_latest_pancake_report_image');
  if (error) {
    console.error('[getLatestPancakeReportForImage]', error.code, error.message);
    return null;
  }
  if (data === null) return null;

  const parsed = pancakeReportImageSchema.safeParse(data);
  if (!parsed.success) {
    console.error('[getLatestPancakeReportForImage] Invalid RPC response');
    return null;
  }

  return parsed.data;
}
