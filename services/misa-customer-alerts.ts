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
    const query = supabase.from(alert === 'care' ? 'misa_customer_care_snapshot' : 'misa_report119_customers')
      .select('misa_customer_id', { count: 'exact', head: true })
      .eq('period_month', `${month}-01`)
      .eq('misa_employee_id', employeeId)
      .or(customerAlertCondition(alert, cutoff));
    const { count, error } = await query;
    if (error) throw new Error(`Không đếm được cảnh báo khách hàng: ${error.message}`);
    return count ?? 0;
  };
  const [purchase, care] = await Promise.all([countAlert('purchase'), countAlert('care')]);
  return { purchase, care };
}

export type MisaCustomerAlertRow = {
  customerId: number;
  code: string;
  name: string;
  province: string;
  debt: number | null;
  daysWithoutPurchase: number | null;
  lastVisitDate: string | null;
  lastCareDate: string | null;
};

export async function listMisaCustomerAlerts(
  supabase: SupabaseClient,
  month: string,
  employeeId: number,
  alert: CustomerAlert,
  cutoff: string,
): Promise<MisaCustomerAlertRow[]> {
  const pageSize = 500;
  const result: MisaCustomerAlertRow[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const query = supabase
      .from('misa_customer_care_snapshot')
      .select('misa_customer_id,customer_code,customer_name,billing_province,debt,days_without_purchase,last_visit_date,last_care_date', { count: 'exact' })
      .eq('period_month', `${month}-01`)
      .eq('misa_employee_id', employeeId)
      .or(customerAlertCondition(alert, cutoff))
      .order('customer_name')
      .order('misa_customer_id')
      .range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;
    if (error) throw new Error(`Không tải được danh sách khách hàng: ${error.message}`);
    for (const row of data ?? []) {
      result.push({
        customerId: row.misa_customer_id,
        code: row.customer_code,
        name: row.customer_name,
        province: row.billing_province,
        debt: row.debt,
        daysWithoutPurchase: row.days_without_purchase,
        lastVisitDate: row.last_visit_date,
        lastCareDate: row.last_care_date,
      });
    }
    if (offset + pageSize >= (count ?? 0)) break;
  }

  return result;
}
