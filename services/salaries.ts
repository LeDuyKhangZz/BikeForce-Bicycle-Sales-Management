import type { SupabaseClient } from '@supabase/supabase-js';

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
