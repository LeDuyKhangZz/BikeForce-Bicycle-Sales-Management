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
const POS_PAGE_SIZE = 100;
const POS_MAX_PAGES = 20;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOrderOnVietnamDate(order: Record<string, unknown>, reportDate: string): boolean {
  const raw = order['inserted_at'];
  if (raw === undefined || raw === null || raw === '') return false;
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  const milliseconds = Number.isFinite(numeric)
    ? Math.abs(numeric) >= 100_000_000_000
      ? numeric
      : numeric * 1000
    : Date.parse(String(raw));
  if (!Number.isFinite(milliseconds)) return false;
  const localIso = new Date(milliseconds + VN_OFFSET_MS).toISOString();
  return localIso.slice(0, 10) === reportDate;
}

async function fetchCancelledRevenueFromPos(
  shopId: number,
  reportDate: string,
): Promise<number | null> {
  const apiKey = process.env.PANCAKE_POS_API_KEY ?? process.env.PANCAKE_API_KEY;
  if (!apiKey || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return null;

  const startMs = Date.parse(`${reportDate}T00:00:00+07:00`);
  if (!Number.isFinite(startMs)) return null;
  const startUnix = Math.floor(startMs / 1000);
  const endUnix = Math.floor((startMs + 24 * 60 * 60 * 1000 - 1000) / 1000);

  let cancelledRevenue = 0;
  try {
    for (let page = 1; page <= POS_MAX_PAGES; page += 1) {
      const url = new URL(`https://pos.pages.fm/api/v1/shops/${shopId}/orders`);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('startDateTime', String(startUnix));
      url.searchParams.set('endDateTime', String(endUnix));
      url.searchParams.set('page_size', String(POS_PAGE_SIZE));
      url.searchParams.set('page_number', String(page));

      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) return null;
      const payload: unknown = await response.json();
      if (!isRecord(payload) || !Array.isArray(payload['data'])) return null;
      const rows = payload['data'].filter(isRecord);
      if (rows.length === 0) break;

      for (const order of rows) {
        if (!isOrderOnVietnamDate(order, reportDate)) continue;
        if (Number(order['status']) !== 6) continue;
        const price = Number(order['total_price'] ?? 0);
        if (Number.isFinite(price) && price > 0) {
          cancelledRevenue += Math.round(price);
        }
      }
      if (rows.length < POS_PAGE_SIZE) break;
    }
    return cancelledRevenue;
  } catch {
    return null;
  }
}

async function enrichCancelledRevenueIfNeeded(
  collection: PancakeReportCollection,
): Promise<PancakeReportCollection> {
  const reports = await Promise.all(
    collection.reports.map(async (item) => {
      if (
        item.daily.market_code !== 'VN' ||
        item.daily.cancelled_count <= 0 ||
        item.daily.cancelled_revenue > 0
      ) {
        return item;
      }
      const liveCancelledRevenue = await fetchCancelledRevenueFromPos(
        item.daily.shop_id,
        item.daily.report_date,
      );
      if (liveCancelledRevenue === null || liveCancelledRevenue <= 0) {
        return item;
      }
      return {
        ...item,
        daily: {
          ...item.daily,
          cancelled_revenue: liveCancelledRevenue,
        },
      };
    }),
  );
  return { reports };
}

async function selectLatestDailyRow(
  supabase: SupabaseClient<Database>,
  shopId: number,
): Promise<PancakeDailyReportRow | null> {
  const { data, error } = await supabase
    .from('pancake_daily_reports')
    .select(
      'report_date,shop_id,employee_name,market_code,currency_code,order_count,revenue,cancelled_count,cancelled_revenue,returned_count,late_count,ads_order_count,ads_gmv,synced_at',
    )
    .eq('shop_id', shopId)
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error) return data;

  if (error.code === '42703') {
    const fallback = await supabase
      .from('pancake_daily_reports')
      .select(
        'report_date,shop_id,employee_name,market_code,currency_code,order_count,revenue,cancelled_count,returned_count,late_count,ads_order_count,ads_gmv,synced_at',
      )
      .eq('shop_id', shopId)
      .order('report_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fallback.error) {
      console.error('[getLatestPancakeDailyReport]', fallback.error.code, fallback.error.message);
      return null;
    }
    return fallback.data ? { ...fallback.data, cancelled_revenue: 0 } : null;
  }

  console.error('[getLatestPancakeDailyReport]', error.code, error.message);
  return null;
}

async function getLatestPancakeDailyReportByShop(
  supabase: SupabaseClient<Database>,
  shopId: number,
): Promise<PancakeDailyReport | null> {
  const daily = await selectLatestDailyRow(supabase, shopId);
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
  if (available.length === 0) return null;
  return enrichCancelledRevenueIfNeeded({ reports: available });
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

  return enrichCancelledRevenueIfNeeded(parsed.data);
}
