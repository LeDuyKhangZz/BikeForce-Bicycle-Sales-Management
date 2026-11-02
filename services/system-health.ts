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

const LOADERS = [latestAmis, latestMisaDirectory, latestMisaSales, latestPancake, latestPancakeFinancials, latestHatde, latestMonthlyJob] as const;

export async function listSyncSourceSnapshots(client: Client): Promise<SyncSourceSnapshot[]> {
  const results = await Promise.allSettled(LOADERS.map((load) => load(client)));

  return results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    console.error('[system-health] Không đọc được nguồn đồng bộ:', result.reason);
    return {
      key: `unavailable-${index}`,
      label: 'Nguồn dữ liệu không khả dụng',
      description: 'Không thể đọc trạng thái nguồn này trong lần kiểm tra hiện tại.',
      cadence: 'DAILY', latestSyncedAt: null, dataPeriod: null, href: '/admin', queryFailed: true,
    };
  });
}

