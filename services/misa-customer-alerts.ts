import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { customerAlertCondition, type CustomerAlert, type CustomerAlertCounts } from '@/lib/amis/customer-alerts';

export async function getMisaCustomerAlertCounts(
  supabase: SupabaseClient,
  month: string,
  employeeId: number,
  cutoff: string,
): Promise<CustomerAlertCounts> {
  const countAlert = async (alert: CustomerAlert) => {
    const { count, error } = await supabase.from('misa_report119_customers')
      .select('misa_customer_id', { count: 'exact', head: true })
      .eq('period_month', `${month}-01`)
      .eq('misa_employee_id', employeeId)
      .or(customerAlertCondition(alert, cutoff));
    if (error) throw new Error(`Không đếm được cảnh báo khách hàng: ${error.message}`);
    return count ?? 0;
  };
  const [purchase, care] = await Promise.all([countAlert('purchase'), countAlert('care')]);
  return { purchase, care };
}
