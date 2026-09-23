import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export async function upsertMisaCustomerPlan(
  supabase: SupabaseClient,
  values: {
    salesId: string;
    periodMonth: string;
    employeeId: number;
    customerId: number;
    monthlyFrequency: number;
    committedSales: number | null;
  },
): Promise<boolean> {
  const { error } = await supabase.from('misa_customer_monthly_plans').upsert({
    sales_id: values.salesId,
    period_month: values.periodMonth,
    misa_employee_id: values.employeeId,
    misa_customer_id: values.customerId,
    monthly_frequency: values.monthlyFrequency,
    committed_sales: values.committedSales,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'period_month,misa_employee_id,misa_customer_id' });
  if (error) {
    console.error('[upsertMisaCustomerPlan]', error.code, error.message);
    return false;
  }
  return true;
}
