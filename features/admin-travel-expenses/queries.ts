import type { SupabaseClient } from '@supabase/supabase-js';

import { includeMonthlySummaryParticipants } from '@/lib/reports/monthly-summary-participants';
import { listSalesOptions } from '@/services/profiles';
import { listTravelExpenseEntries } from '@/services/travel-expenses';
import type { Database } from '@/types/database.types';

export async function listTravelExpenseParticipants(supabase: SupabaseClient<Database>) {
  return includeMonthlySummaryParticipants(await listSalesOptions(supabase));
}

export async function getTravelExpensePageData(supabase: SupabaseClient<Database>, periodMonth: string) {
  const [salesRows, expenses] = await Promise.all([
    listTravelExpenseParticipants(supabase), listTravelExpenseEntries(supabase, periodMonth),
  ]);
  return { salesRows, currentAmounts: Object.fromEntries(expenses.map(row => [row.sales_id, row.amount])) };
}
