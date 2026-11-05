import type { SupabaseClient } from '@supabase/supabase-js';

import { includeMonthlySummaryParticipants } from '@/lib/reports/monthly-summary-participants';
import { listSalesOptions } from '@/services/profiles';
import { listTravelExpenseYearEntries } from '@/services/travel-expenses';
import type { Database } from '@/types/database.types';

export async function listTravelExpenseParticipants(supabase: SupabaseClient<Database>) {
  return includeMonthlySummaryParticipants(await listSalesOptions(supabase));
}

export async function getTravelExpensePageData(supabase: SupabaseClient<Database>, periodMonth: string) {
  const year = periodMonth.slice(0, 4);
  const selectedMonth = periodMonth.slice(0, 7);
  const [salesRows, yearEntries] = await Promise.all([
    listTravelExpenseParticipants(supabase), listTravelExpenseYearEntries(supabase, year),
  ]);
  const currentEntries = yearEntries.filter((row) => row.period_month.startsWith(selectedMonth));
  const monthAmounts = new Map<string, number>();
  for (let month = 1; month <= 12; month += 1) {
    monthAmounts.set(`${year}-${String(month).padStart(2, '0')}`, 0);
  }
  for (const entry of yearEntries) {
    if (entry.amount === null) continue;
    const month = entry.period_month.slice(0, 7);
    monthAmounts.set(month, (monthAmounts.get(month) ?? 0) + entry.amount);
  }
  return {
    salesRows,
    currentAmounts: Object.fromEntries(currentEntries.map((row) => [row.sales_id, row.amount])),
    monthlyAmounts: [...monthAmounts].map(([month, amount]) => ({ month, amount })),
  };
}
