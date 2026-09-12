import type { SupabaseClient } from '@supabase/supabase-js';

import { includeMonthlySummaryParticipants } from '@/lib/reports/monthly-summary-participants';
import { listSalesOptions } from '@/services/profiles';
import { listSalaryEntries } from '@/services/salaries';
import type { Database } from '@/types/database.types';

export async function listSalaryParticipants(supabase: SupabaseClient<Database>) {
  return includeMonthlySummaryParticipants(await listSalesOptions(supabase));
}

export async function getSalaryPageData(supabase: SupabaseClient<Database>, periodMonth: string) {
  const [salesRows, salaries] = await Promise.all([
    listSalaryParticipants(supabase), listSalaryEntries(supabase, periodMonth),
  ]);
  return { salesRows, currentAmounts: Object.fromEntries(salaries.map(row => [row.sales_id, row.amount])) };
}
