import type { SupabaseClient } from '@supabase/supabase-js';

import { MONTHLY_ACCOUNTING_AUGUST_KEY, usesAccountingAugustReport119 } from '@/lib/reports/monthly-accounting-august';
import { includeMonthlyAccountingParticipant, MONTHLY_ACCOUNTING_PARTICIPANT } from '@/lib/reports/monthly-summary-participants';
import { getSaleWorkAccountName } from '@/lib/salework/sales-account-map';
import { getMonthlySummarySales, listSalesOptions } from '@/services/profiles';
import { getAmisMetricsForShare } from '@/services/reports';
import { AMIS_EMPLOYEE_MAP } from '@/services/salework';
import type { Database } from '@/types/database.types';

export async function getMonthlySummaryAmisMetrics(
  supabase: SupabaseClient<Database>,
  participantId: string,
  employeeName: string | null,
  month: string,
) {
  const periodMonth = `${month}-01`;
  const original = await getAmisMetricsForShare(supabase, employeeName, periodMonth);
  if (!usesAccountingAugustReport119(participantId, month)) return original;

  const report119 = await getAmisMetricsForShare(supabase, MONTHLY_ACCOUNTING_AUGUST_KEY, periodMonth);
  // Không quay về số dashboard/scope sai nếu snapshot riêng chưa được đồng bộ.
  if (report119 === null) return null;
  return {
    ...report119,
    target_amount: original?.target_amount ?? null,
    // Công nợ vẫn từ AMIS Kế toán theo mapping/logic hiện hữu, không từ CRM.
    receive_amount: original?.receive_amount ?? null,
  };
}

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
