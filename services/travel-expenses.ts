import type { SupabaseClient } from '@supabase/supabase-js';

import { isMonthlySalaryParticipant } from '@/lib/reports/monthly-summary-participants';
import type { Database } from '@/types/database.types';

const MAX_TEAM_SIZE = 200;
const MAX_YEAR_ENTRIES = MAX_TEAM_SIZE * 12;
const YEAR_QUERY_PAGE_SIZE = 1000;

type TravelExpenseTable = Database['public']['Tables']['sales_monthly_travel_expenses'];
export type MonthlyTravelExpenseRow = Pick<TravelExpenseTable['Row'], 'sales_id' | 'amount'>;
export type MonthlyTravelExpenseWrite = Pick<TravelExpenseTable['Insert'], 'sales_id' | 'amount'>;
export type YearTravelExpenseEntry = { period_month: string; sales_id: string; amount: number | null };

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

export async function listTravelExpenseYearEntries(
  supabase: SupabaseClient<Database>,
  year: string,
): Promise<YearTravelExpenseEntry[]> {
  const firstDay = `${year}-01-01`;
  const nextYear = `${Number(year) + 1}-01-01`;
  const salesRows: YearTravelExpenseEntry[] = [];
  const participantRows: YearTravelExpenseEntry[] = [];

  for (let from = 0; from < MAX_YEAR_ENTRIES; from += YEAR_QUERY_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('sales_monthly_travel_expenses')
      .select('period_month,sales_id,amount')
      .gte('period_month', firstDay)
      .lt('period_month', nextYear)
      .order('period_month')
      .order('sales_id')
      .range(from, from + YEAR_QUERY_PAGE_SIZE - 1)
      .returns<Pick<TravelExpenseTable['Row'], 'period_month' | 'sales_id' | 'amount'>[]>();
    if (error) {
      console.error('[listTravelExpenseYearEntries:sales]', error.code, error.message);
      break;
    }
    salesRows.push(...(data ?? []));
    if (!data || data.length < YEAR_QUERY_PAGE_SIZE) break;
  }

  for (let from = 0; from < MAX_YEAR_ENTRIES; from += YEAR_QUERY_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('monthly_participant_travel_expenses')
      .select('period_month,participant_key,amount')
      .gte('period_month', firstDay)
      .lt('period_month', nextYear)
      .order('period_month')
      .order('participant_key')
      .range(from, from + YEAR_QUERY_PAGE_SIZE - 1)
      .returns<Pick<Database['public']['Tables']['monthly_participant_travel_expenses']['Row'], 'period_month' | 'participant_key' | 'amount'>[]>();
    if (error) {
      console.error('[listTravelExpenseYearEntries:participants]', error.code, error.message);
      break;
    }
    participantRows.push(...(data ?? []).map((row) => ({
      period_month: row.period_month,
      sales_id: row.participant_key,
      amount: row.amount,
    })));
    if (!data || data.length < YEAR_QUERY_PAGE_SIZE) break;
  }

  return [...salesRows, ...participantRows];
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
