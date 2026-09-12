import type { SupabaseClient } from '@supabase/supabase-js';

import { isMonthlySalaryParticipant } from '@/lib/reports/monthly-summary-participants';
import type { Database } from '@/types/database.types';

const MAX_TEAM_SIZE = 200;

type SalaryTable = Database['public']['Tables']['sales_monthly_salaries'];
export type MonthlySalaryRow = Pick<SalaryTable['Row'], 'sales_id' | 'amount'>;
export type MonthlySalaryWrite = Pick<SalaryTable['Insert'], 'sales_id' | 'amount'>;

export async function getMonthlySalary(
  supabase: SupabaseClient<Database>,
  salesId: string,
  periodMonth: string,
): Promise<number | null> {
  if (isMonthlySalaryParticipant(salesId)) {
    const { data, error } = await supabase.from('monthly_participant_salaries')
      .select('amount').eq('participant_key', salesId).eq('period_month', periodMonth)
      .maybeSingle<Pick<Database['public']['Tables']['monthly_participant_salaries']['Row'], 'amount'>>();
    if (error) {
      console.error('[getMonthlySalary:participant]', error.code, error.message);
      return null;
    }
    return data?.amount ?? null;
  }
  const { data, error } = await supabase
    .from('sales_monthly_salaries')
    .select('amount')
    .eq('sales_id', salesId)
    .eq('period_month', periodMonth)
    .maybeSingle<Pick<SalaryTable['Row'], 'amount'>>();

  if (error) {
    console.error('[getMonthlySalary]', error.code, error.message);
    return null;
  }
  return data?.amount ?? null;
}

/** Form Lương và ảnh tháng dùng cùng khóa người nhận; dữ liệu Sales cũ giữ nguyên. */
export async function listSalaryEntries(supabase: SupabaseClient<Database>, periodMonth: string): Promise<MonthlySalaryRow[]> {
  const [salesRows, participantResult] = await Promise.all([
    listMonthlySalaries(supabase, periodMonth),
    supabase.from('monthly_participant_salaries').select('participant_key, amount', { count: 'exact' })
      .eq('period_month', periodMonth).order('participant_key').range(0, MAX_TEAM_SIZE - 1)
      .returns<Pick<Database['public']['Tables']['monthly_participant_salaries']['Row'], 'participant_key' | 'amount'>[]>(),
  ]);
  if (participantResult.error) {
    console.error('[listSalaryEntries]', participantResult.error.code, participantResult.error.message);
    return salesRows;
  }
  return [...salesRows, ...(participantResult.data ?? []).map(row => ({ sales_id: row.participant_key, amount: row.amount }))];
}

/** RPC SECURITY INVOKER lưu một transaction, không lưu dở khi một khoản sai. */
export async function saveSalaryEntries(
  supabase: SupabaseClient<Database>, periodMonth: string, rows: readonly MonthlySalaryWrite[],
): Promise<{ ok: true; saved: number } | { ok: false }> {
  const { data, error } = await supabase.rpc('save_monthly_salary_entries', {
    p_period_month: periodMonth,
    p_entries: rows.map(row => ({ participant_id: row.sales_id, amount: row.amount ?? null })),
  });
  if (error || data === null) {
    console.error('[saveSalaryEntries]', error?.code, error?.message);
    return { ok: false };
  }
  return { ok: true, saved: data };
}

export async function listMonthlySalaries(
  supabase: SupabaseClient<Database>,
  periodMonth: string,
): Promise<MonthlySalaryRow[]> {
  const { data, error } = await supabase
    .from('sales_monthly_salaries')
    .select('sales_id, amount')
    .eq('period_month', periodMonth)
    .limit(MAX_TEAM_SIZE)
    .returns<MonthlySalaryRow[]>();

  if (error) {
    console.error('[listMonthlySalaries]', error.code, error.message);
    return [];
  }
  return data ?? [];
}

export async function saveMonthlySalaries(
  supabase: SupabaseClient<Database>,
  periodMonth: string,
  rows: readonly MonthlySalaryWrite[],
  adminId: string,
): Promise<{ ok: true; saved: number } | { ok: false }> {
  if (rows.length === 0) return { ok: true, saved: 0 };

  const { error } = await supabase.from('sales_monthly_salaries').upsert(
    rows.map((row) => ({
      period_month: periodMonth,
      sales_id: row.sales_id,
      amount: row.amount,
      updated_by: adminId,
    })),
    { onConflict: 'period_month,sales_id' },
  );

  if (error) {
    console.error('[saveMonthlySalaries]', error.code, error.message);
    return { ok: false };
  }
  return { ok: true, saved: rows.length };
}
