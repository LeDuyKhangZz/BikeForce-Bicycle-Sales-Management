import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { customerAlertCondition, type CustomerAlert, type CustomerAlertCounts } from '@/lib/amis/customer-alerts';
import { listRecentlyApprovedCustomerIds } from '@/services/customer-care';

export async function getMisaCustomerAlertCounts(
  supabase: SupabaseClient,
  month: string,
  employeeId: number,
  cutoff: string,
): Promise<CustomerAlertCounts> {
  const recentlyApprovedCustomerIds = await listRecentlyApprovedCustomerIds(supabase, cutoff);
  const countAlert = async (alert: CustomerAlert) => {
    let query = supabase.from('misa_report119_customers')
      .select('misa_customer_id', { count: 'exact', head: true })
      .eq('period_month', `${month}-01`)
      .eq('misa_employee_id', employeeId)
      .or(customerAlertCondition(alert, cutoff));
    if (alert === 'care' && recentlyApprovedCustomerIds.length > 0) {
      query = query.not('misa_customer_id', 'in', `(${recentlyApprovedCustomerIds.join(',')})`);
    }
    const { count, error } = await query;
    if (error) throw new Error(`Không đếm được cảnh báo khách hàng: ${error.message}`);
    return count ?? 0;
  };
  const [purchase, care] = await Promise.all([countAlert('purchase'), countAlert('care')]);
  return { purchase, care };
}
