import type { SupabaseClient } from '@supabase/supabase-js';

import { hatdeUpsertResultSchema, type HatdeSnapshotInput } from '@/lib/validation/hatde-snapshot';
import type { Database } from '@/types/database.types';

export type HatdeSnapshotRow = Database['public']['Tables']['hatde_snapshots']['Row'];
export type HatdeBranchRow = Database['public']['Tables']['hatde_branch_snapshots']['Row'];

export type HatdeSnapshot = {
  snapshot: HatdeSnapshotRow;
  branches: HatdeBranchRow[];
};

type StoredBranch = HatdeSnapshotInput['branches'][number];

const SNAPSHOT_PAGE_SIZE = 50;
const BRANCH_PAGE_SIZE = 20;

export async function upsertHatdeSnapshot(
  supabase: SupabaseClient<Database>,
  input: Pick<HatdeSnapshotInput, 'report_date' | 'report_time'> & {
    branches: StoredBranch[];
    totalRevenue: number;
    totalTransactions: number;
  },
): Promise<{ id: string; created: boolean } | null> {
  const { data, error } = await supabase.rpc('upsert_hatde_snapshot', {
    p_report_date: input.report_date,
    p_report_time: input.report_time,
    p_total_revenue: input.totalRevenue,
    p_total_transactions: input.totalTransactions,
    p_branches: input.branches,
  });

  if (error) {
    console.error('[upsertHatdeSnapshot]', error.code, error.message);
    return null;
  }

  const parsed = hatdeUpsertResultSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function listHatdeSnapshotTimes(
  supabase: SupabaseClient<Database>,
  reportDate: string,
): Promise<HatdeSnapshotRow[]> {
  const { data, error } = await supabase
    .from('hatde_snapshots')
    .select('id,report_date,report_time,total_revenue,total_transactions,created_at', { count: 'exact' })
    .eq('report_date', reportDate)
    .order('report_time', { ascending: false })
    .range(0, SNAPSHOT_PAGE_SIZE - 1);

  if (error) {
    console.error('[listHatdeSnapshotTimes]', error.code, error.message);
    throw new Error('Không thể tải danh sách thời điểm Hạt Dẻ.');
  }

  return data ?? [];
}

export async function getLatestHatdeSnapshot(
  supabase: SupabaseClient<Database>,
  filters: { reportDate?: string; reportTime?: string } = {},
): Promise<HatdeSnapshot | null> {
  let query = supabase
    .from('hatde_snapshots')
    .select('id,report_date,report_time,total_revenue,total_transactions,created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (filters.reportDate !== undefined) query = query.eq('report_date', filters.reportDate);
  if (filters.reportTime !== undefined) query = query.eq('report_time', filters.reportTime);

  const { data: snapshotData, error: snapshotError } = await query.maybeSingle();
  if (snapshotError) {
    console.error('[getLatestHatdeSnapshot]', snapshotError.code, snapshotError.message);
    throw new Error('Không thể tải snapshot Hạt Dẻ.');
  }
  if (snapshotData === null) return null;

  const snapshot = snapshotData;
  const { data: branchData, error: branchError } = await supabase
    .from('hatde_branch_snapshots')
    .select('id,snapshot_id,branch_code,revenue,transactions,vs_yesterday,vs_last_week', { count: 'exact' })
    .eq('snapshot_id', snapshot.id)
    .order('revenue', { ascending: false })
    .range(0, BRANCH_PAGE_SIZE - 1);

  if (branchError) {
    console.error('[getLatestHatdeSnapshot:branches]', branchError.code, branchError.message);
    throw new Error('Không thể tải chi tiết chi nhánh Hạt Dẻ.');
  }

  return { snapshot, branches: branchData ?? [] };
}