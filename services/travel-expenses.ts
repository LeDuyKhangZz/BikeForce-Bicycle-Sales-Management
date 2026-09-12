import type { SupabaseClient } from '@supabase/supabase-js';

import { isMonthlySalaryParticipant } from '@/lib/reports/monthly-summary-participants';
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
  if (isMonthlySalaryParticipant(salesId)) {
    const { data, error } = await supabase.from('monthly_participant_travel_expenses')
      .select('amount').eq('participant_key', salesId).eq('period_month', periodMonth)
      .maybeSingle<Pick<Database['public']['Tables']['monthly_participant_travel_expenses']['Row'], 'amount'>>();
    if (error) {
      console.error('[getMonthlyTravelExpense:participant]', error.code, error.message);
      return null;
    }
    return data?.amount ?? null;
  }
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
    .select('sales_id, amount', { count: 'exact' })
    .eq('period_month', periodMonth)
    .order('sales_id').range(0, MAX_TEAM_SIZE - 1)
    .returns<MonthlyTravelExpenseRow[]>();

  if (error) {
    console.error('[listMonthlyTravelExpenses]', error.code, error.message);
    return [];
  }
  return data ?? [];
}

export async function listTravelExpenseEntries(supabase: SupabaseClient<Database>, periodMonth: string): Promise<MonthlyTravelExpenseRow[]> {
  const [salesRows, participantResult] = await Promise.all([
    listMonthlyTravelExpenses(supabase, periodMonth),
    supabase.from('monthly_participant_travel_expenses').select('participant_key, amount', { count: 'exact' })
      .eq('period_month', periodMonth).order('participant_key').range(0, MAX_TEAM_SIZE - 1)
      .returns<Pick<Database['public']['Tables']['monthly_participant_travel_expenses']['Row'], 'participant_key' | 'amount'>[]>(),
  ]);
  if (participantResult.error) {
    console.error('[listTravelExpenseEntries]', participantResult.error.code, participantResult.error.message);
    return salesRows;
  }
  return [...salesRows, ...(participantResult.data ?? []).map(row => ({ sales_id: row.participant_key, amount: row.amount }))];
}

export async function saveTravelExpenseEntries(
  supabase: SupabaseClient<Database>, periodMonth: string, rows: readonly MonthlyTravelExpenseWrite[],
): Promise<{ ok: true; saved: number } | { ok: false }> {
  const { data, error } = await supabase.rpc('save_monthly_travel_expense_entries', {
    p_period_month: periodMonth,
    p_entries: rows.map(row => ({ participant_id: row.sales_id, amount: row.amount ?? null })),
  });
  if (error || data === null) {
    console.error('[saveTravelExpenseEntries]', error?.code, error?.message);
    return { ok: false };
  }
  return { ok: true, saved: data };
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
