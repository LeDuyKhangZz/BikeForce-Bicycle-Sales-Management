import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

type MonthlySyncJobRow = Database['public']['Tables']['monthly_sync_jobs']['Row'];
export type MonthlySyncStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type MonthlySyncJob = Omit<MonthlySyncJobRow, 'status'> & {
  status: MonthlySyncStatus;
};

function isMonthlySyncStatus(value: string): value is MonthlySyncStatus {
  return value === 'PENDING' || value === 'RUNNING' || value === 'COMPLETED' || value === 'FAILED';
}

function toMonthlySyncJob(row: MonthlySyncJobRow): MonthlySyncJob | null {
  return isMonthlySyncStatus(row.status) ? { ...row, status: row.status } : null;
}

export async function getLatestMonthlySyncJob(
  supabase: SupabaseClient<Database>,
  periodMonth: string,
): Promise<MonthlySyncJob | null> {
  const { data, error } = await supabase
    .from('monthly_sync_jobs')
    .select('id, period_month, status, requested_by, requested_at, started_at, completed_at, synced_rows, error_message')
    .eq('period_month', periodMonth)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle<MonthlySyncJobRow>();

  if (error) {
    console.error('[getLatestMonthlySyncJob]', error.code, error.message);
    return null;
  }
  return data === null ? null : toMonthlySyncJob(data);
}

export async function createMonthlySyncJob(
  supabase: SupabaseClient<Database>,
  periodMonth: string,
  requestedBy: string,
): Promise<'CREATED' | 'ACTIVE_EXISTS' | 'FAILED'> {
  const { error } = await supabase.from('monthly_sync_jobs').insert({
    period_month: periodMonth,
    requested_by: requestedBy,
  });

  if (!error) return 'CREATED';
  if (error.code === '23505') return 'ACTIVE_EXISTS';
  console.error('[createMonthlySyncJob]', error.code, error.message);
  return 'FAILED';
}
