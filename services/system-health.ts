import type { SupabaseClient } from '@supabase/supabase-js';

import type { SyncSourceSnapshot } from '@/lib/system-health/sync-health';
import type { Database } from '@/types/database.types';

type Client = SupabaseClient<Database>;

async function latestAmis(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('amis_employee_metrics')
    .select('period_month,synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'amis', label: 'AMIS · Chỉ số nhân viên', description: 'Doanh số, công nợ và KPI nhân viên theo tháng.',
    cadence: 'DAILY', latestSyncedAt: data?.synced_at ?? null, dataPeriod: data?.period_month ?? null,
    href: '/admin/reconciliation',
  };
}
async function latestMisaDirectory(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('misa_report119_employees')
    .select('period_month,synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'misa-report-119', label: 'MISA · Danh mục khách hàng', description: 'Nhân viên và khách hàng phụ trách từ Report 119.',
    cadence: 'MONTHLY', latestSyncedAt: data?.synced_at ?? null, dataPeriod: data?.period_month ?? null,
    href: '/admin/misa-employees',
  };
}
async function latestMisaSales(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('misa_report44_customer_monthly_sales')
    .select('period_month,synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'misa-report-44', label: 'MISA · Doanh số khách hàng', description: 'Doanh số đơn hàng theo khách hàng từ Report 44.',
    cadence: 'MONTHLY', latestSyncedAt: data?.synced_at ?? null, dataPeriod: data?.period_month ?? null,
    href: '/admin/misa-employees',
  };
}

async function latestPancake(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('pancake_daily_reports')
    .select('report_date,synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'pancake-orders', label: 'Pancake · Đơn hàng', description: 'Đơn hàng và doanh thu theo sàn thương mại điện tử.',
    cadence: 'DAILY', latestSyncedAt: data?.synced_at ?? null, dataPeriod: data?.report_date ?? null,
    href: '/admin/ecommerce',
  };
}

async function latestPancakeFinancials(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('pancake_marketplace_financial_reports')
    .select('report_date,synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'pancake-financials', label: 'Pancake · Tài chính sàn', description: 'Phí sàn, tiền sàn trả và tiền nạp quảng cáo.',
    cadence: 'DAILY', latestSyncedAt: data?.synced_at ?? null, dataPeriod: data?.report_date ?? null,
    href: '/admin/ecommerce',
  };
}

async function latestMisaInventory(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('inventory')
    .select('synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'misa-inventory', label: 'MISA · Tồn kho', description: 'Số lượng tồn theo kho và sản phẩm.',
    cadence: 'DAILY', latestSyncedAt: data?.synced_at ?? null, dataPeriod: null,
    href: '/admin/inventory',
  };
}

async function latestMisaOrders(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('orders')
    .select('order_date,synced_at')
    .eq('source_system', 'MISA')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'misa-orders', label: 'MISA · Đơn hàng', description: 'Đơn bán hàng và công nợ đồng bộ từ MISA.',
    cadence: 'DAILY', latestSyncedAt: data?.synced_at ?? null, dataPeriod: data?.order_date ?? null,
    href: '/admin/orders',
  };
}

async function latestSaleWorkContacts(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('customers')
    .select('synced_at')
    .eq('source_system', 'SALEWORK_ZALO')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'salework-contacts', label: 'SaleWork · Khách hàng và liên hệ', description: 'Danh bạ đồng bộ từ tài khoản SaleWork Zalo.',
    cadence: 'ON_DEMAND', latestSyncedAt: data?.synced_at ?? null, dataPeriod: null,
    href: '/admin/salework/customers',
  };
}

async function latestTikTokAds(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('tiktok_ad_balance_snapshots')
    .select('captured_at,synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'tiktok-ads', label: 'TikTok · Số dư Ads', description: 'Snapshot số dư tài khoản quảng cáo TikTok.',
    cadence: 'DAILY', latestSyncedAt: data?.synced_at ?? null, dataPeriod: data?.captured_at ?? null,
    href: '/admin/ecommerce',
  };
}

async function latestShopeeAds(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('shopee_ad_balance_snapshots')
    .select('captured_at,synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'shopee-ads', label: 'Shopee · Số dư Ads', description: 'Snapshot số dư tài khoản quảng cáo Shopee.',
    cadence: 'DAILY', latestSyncedAt: data?.synced_at ?? null, dataPeriod: data?.captured_at ?? null,
    href: '/admin/ecommerce',
  };
}

async function latestHatde(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('hatde_snapshots')
    .select('report_date,report_time,created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'hatde', label: 'Hạt Dẻ · Snapshot chi nhánh', description: 'Doanh thu và giao dịch từ webhook n8n.',
    cadence: 'ON_DEMAND', latestSyncedAt: data?.created_at ?? null,
    dataPeriod: data === null ? null : `${data.report_date} · ${data.report_time}`,
    href: '/admin/hatde',
  };
}

async function latestMonthlyJob(client: Client): Promise<SyncSourceSnapshot> {
  const { data, error } = await client
    .from('monthly_sync_jobs')
    .select('period_month,status,requested_at,started_at,completed_at,error_message')
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    key: 'monthly-worker', label: 'Worker tổng kết tháng', description: 'Tác vụ tổng hợp AMIS, SaleWork và CRM theo tháng.',
    cadence: 'MONTHLY', latestSyncedAt: data?.completed_at ?? data?.started_at ?? data?.requested_at ?? null,
    dataPeriod: data?.period_month ?? null, href: '/admin/monthly-summaries',
    runStatus: data?.status ?? null, runError: data?.error_message ?? null,
  };
}

const LOADERS = [
  latestAmis,
  latestMisaInventory,
  latestMisaOrders,
  latestPancake,
  latestPancakeFinancials,
  latestSaleWorkContacts,
  latestTikTokAds,
  latestShopeeAds,
  latestMisaDirectory,
  latestMisaSales,
  latestHatde,
  latestMonthlyJob,
] as const;

const SOURCE_FAILURES = [
  { key: 'amis', label: 'AMIS · Chỉ số nhân viên', description: 'Doanh số, công nợ và KPI nhân viên theo tháng.', cadence: 'DAILY', href: '/admin/reconciliation' },
  { key: 'misa-inventory', label: 'MISA · Tồn kho', description: 'Số lượng tồn theo kho và sản phẩm.', cadence: 'DAILY', href: '/admin/inventory' },
  { key: 'misa-orders', label: 'MISA · Đơn hàng', description: 'Đơn bán hàng và công nợ đồng bộ từ MISA.', cadence: 'DAILY', href: '/admin/orders' },
  { key: 'pancake-orders', label: 'Pancake · Đơn hàng', description: 'Đơn hàng và doanh thu theo sàn thương mại điện tử.', cadence: 'DAILY', href: '/admin/ecommerce' },
  { key: 'pancake-financials', label: 'Pancake · Tài chính sàn', description: 'Phí sàn, tiền sàn trả và tiền nạp quảng cáo.', cadence: 'DAILY', href: '/admin/ecommerce' },
  { key: 'salework-contacts', label: 'SaleWork · Khách hàng và liên hệ', description: 'Danh bạ đồng bộ từ tài khoản SaleWork Zalo.', cadence: 'ON_DEMAND', href: '/admin/salework/customers' },
  { key: 'tiktok-ads', label: 'TikTok · Số dư Ads', description: 'Snapshot số dư tài khoản quảng cáo TikTok.', cadence: 'DAILY', href: '/admin/ecommerce' },
  { key: 'shopee-ads', label: 'Shopee · Số dư Ads', description: 'Snapshot số dư tài khoản quảng cáo Shopee.', cadence: 'DAILY', href: '/admin/ecommerce' },
  { key: 'misa-report-119', label: 'MISA · Danh mục khách hàng', description: 'Nhân viên và khách hàng phụ trách từ Report 119.', cadence: 'MONTHLY', href: '/admin/misa-employees' },
  { key: 'misa-report-44', label: 'MISA · Doanh số khách hàng', description: 'Doanh số đơn hàng theo khách hàng từ Report 44.', cadence: 'MONTHLY', href: '/admin/misa-employees' },
  { key: 'hatde', label: 'Hạt Dẻ · Snapshot chi nhánh', description: 'Doanh thu và giao dịch từ webhook n8n.', cadence: 'ON_DEMAND', href: '/admin/hatde' },
  { key: 'monthly-worker', label: 'Worker tổng kết tháng', description: 'Tác vụ tổng hợp AMIS, SaleWork và CRM theo tháng.', cadence: 'MONTHLY', href: '/admin/monthly-summaries' },
] as const;

export async function listSyncSourceSnapshots(client: Client): Promise<SyncSourceSnapshot[]> {
  const results = await Promise.allSettled(LOADERS.map((load) => load(client)));

  return results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    console.error('[system-health] Không đọc được nguồn đồng bộ:', result.reason);
    const fallback = SOURCE_FAILURES[index];
    return fallback
      ? { ...fallback, latestSyncedAt: null, dataPeriod: null, queryFailed: true }
      : {
          key: `unavailable-${index}`,
          label: 'Nguồn dữ liệu không khả dụng',
          description: 'Không thể đọc trạng thái nguồn này trong lần kiểm tra hiện tại.',
          cadence: 'DAILY', latestSyncedAt: null, dataPeriod: null, href: '/admin', queryFailed: true,
        };
  });
}

