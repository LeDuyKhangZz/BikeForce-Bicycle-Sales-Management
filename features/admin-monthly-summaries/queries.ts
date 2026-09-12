import type { SupabaseClient } from '@supabase/supabase-js';

import { includeMonthlyAccountingParticipant, MONTHLY_ACCOUNTING_PARTICIPANT } from '@/lib/reports/monthly-summary-participants';
import { getSaleWorkAccountName } from '@/lib/salework/sales-account-map';
import { getMonthlySummarySales, listSalesOptions } from '@/services/profiles';
import { AMIS_EMPLOYEE_MAP } from '@/services/salework';
import type { Database } from '@/types/database.types';

export async function listMonthlySummaryParticipants(supabase: SupabaseClient<Database>) {
  return includeMonthlyAccountingParticipant(await listSalesOptions(supabase));
}

export async function getMonthlySummaryParticipant(supabase: SupabaseClient<Database>, id: string) {
  if (id === MONTHLY_ACCOUNTING_PARTICIPANT.id) {
    return {
      ...MONTHLY_ACCOUNTING_PARTICIPANT,
      profileId: null,
      saleWorkAccountName: MONTHLY_ACCOUNTING_PARTICIPANT.full_name,
      amis_employee_name: AMIS_EMPLOYEE_MAP[MONTHLY_ACCOUNTING_PARTICIPANT.full_name] ?? null,
    };
  }
  const sales = await getMonthlySummarySales(supabase, id);
  return sales === null ? null : {
    ...sales,
    profileId: sales.id,
    saleWorkAccountName: getSaleWorkAccountName(sales.full_name),
  };
}
