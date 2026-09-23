import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export async function getSalesIdForMisaEmployee(
  supabase: SupabaseClient,
  periodMonth: string,
  employeeId: number,
): Promise<string | null> {
  const { data: employee, error: employeeError } = await supabase
    .from('misa_report119_employees')
    .select('employee_name')
    .eq('period_month', periodMonth)
    .eq('misa_employee_id', employeeId)
    .maybeSingle();
  if (employeeError || employee === null || typeof employee.employee_name !== 'string') return null;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('amis_employee_name', employee.employee_name)
    .eq('role', 'SALES')
    .maybeSingle();
  if (profileError || profile === null || typeof profile.id !== 'string') return null;
  return profile.id;
}

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
