import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

const MAX_TEAM_SIZE = 200;

type TravelExpenseTable = Database['public']['Tables']['sales_monthly_travel_expenses'];
export type MonthlyTravelExpenseRow = Pick<TravelExpenseTable['Row'], 'sales_id' | 'amount'>;
export type MonthlyTravelExpenseWrite = Pick<TravelExpenseTable['Insert'], 'sales_id' | 'amount'>;

export async function getMonthlyTravelExpense(
  supabase: SupabaseClient<Database>,
  salesId: string,
  periodMonth: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('sales_monthly_travel_expenses')
    .select('amount')
    .eq('sales_id', salesId)
    .eq('period_month', periodMonth)
    .maybeSingle<Pick<TravelExpenseTable['Row'], 'amount'>>();

  if (error) {
    console.error('[getMonthlyTravelExpense]', error.code, error.message);
    return null;
  }
  return data?.amount ?? null;
}

export async function listMonthlyTravelExpenses(
  supabase: SupabaseClient<Database>,
  periodMonth: string,
): Promise<MonthlyTravelExpenseRow[]> {
  const { data, error } = await supabase
    .from('sales_monthly_travel_expenses')
    .select('sales_id, amount')
    .eq('period_month', periodMonth)
    .limit(MAX_TEAM_SIZE)
    .returns<MonthlyTravelExpenseRow[]>();

  if (error) {
    console.error('[listMonthlyTravelExpenses]', error.code, error.message);
    return [];
  }
  return data ?? [];
}

export async function saveMonthlyTravelExpenses(
  supabase: SupabaseClient<Database>,
  periodMonth: string,
  rows: readonly MonthlyTravelExpenseWrite[],
  adminId: string,
): Promise<{ ok: true; saved: number } | { ok: false }> {
  if (rows.length === 0) return { ok: true, saved: 0 };

  const { error } = await supabase.from('sales_monthly_travel_expenses').upsert(
    rows.map((row) => ({
      period_month: periodMonth,
      sales_id: row.sales_id,
      amount: row.amount,
      updated_by: adminId,
    })),
    { onConflict: 'period_month,sales_id' },
  );

  if (error) {
    console.error('[saveMonthlyTravelExpenses]', error.code, error.message);
    return { ok: false };
  }
  return { ok: true, saved: rows.length };
}
