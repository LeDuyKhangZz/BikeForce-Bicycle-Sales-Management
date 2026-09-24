import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export const CUSTOMER_PLAN_IMPORT_MAX_ROWS = 2_000;

export type MisaCustomerPlanTemplateRow = {
  customerId: number;
  customerCode: string;
  customerName: string;
  orderSales: number | null;
  monthlyFrequency: number | null;
  committedSales: number | null;
};

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

export async function listMisaCustomerPlanTemplateRows(
  supabase: SupabaseClient,
  periodMonth: string,
  employeeId: number,
): Promise<MisaCustomerPlanTemplateRow[]> {
  const [customersResult, plansResult] = await Promise.all([
    supabase.from('misa_report119_customers')
      .select('misa_customer_id,customer_code,customer_name,order_sales')
      .eq('period_month', periodMonth)
      .eq('misa_employee_id', employeeId)
      .order('customer_name')
      .order('misa_customer_id')
      .range(0, CUSTOMER_PLAN_IMPORT_MAX_ROWS - 1),
    supabase.from('misa_customer_monthly_plans')
      .select('misa_customer_id,monthly_frequency,committed_sales')
      .eq('period_month', periodMonth)
      .eq('misa_employee_id', employeeId)
      .range(0, CUSTOMER_PLAN_IMPORT_MAX_ROWS - 1),
  ]);
  if (customersResult.error) throw new Error(`Không đọc được khách hàng để tạo file mẫu: ${customersResult.error.message}`);
  if (plansResult.error) throw new Error(`Không đọc được kế hoạch để tạo file mẫu: ${plansResult.error.message}`);
  const planByCustomer = new Map<number, { monthlyFrequency: number; committedSales: number | null }>();
  for (const value of plansResult.data ?? []) {
    if (typeof value.misa_customer_id === 'number' && typeof value.monthly_frequency === 'number') {
      planByCustomer.set(value.misa_customer_id, {
        monthlyFrequency: value.monthly_frequency,
        committedSales: typeof value.committed_sales === 'number' ? value.committed_sales : null,
      });
    }
  }
  return (customersResult.data ?? []).map((value) => {
    const plan = planByCustomer.get(value.misa_customer_id);
    return {
      customerId: value.misa_customer_id,
      customerCode: value.customer_code,
      customerName: value.customer_name,
      orderSales: typeof value.order_sales === 'number' ? value.order_sales : null,
      monthlyFrequency: plan?.monthlyFrequency ?? null,
      committedSales: plan?.committedSales ?? null,
    };
  });
}

export async function upsertMisaCustomerPlans(
  supabase: SupabaseClient,
  values: {
    salesId: string;
    periodMonth: string;
    employeeId: number;
    rows: Array<{ customerId: number; monthlyFrequency: number; committedSales: number | null }>;
  },
): Promise<boolean> {
  const allowedRows = await listMisaCustomerPlanTemplateRows(supabase, values.periodMonth, values.employeeId);
  const allowedCustomerIds = new Set(allowedRows.map((row) => row.customerId));
  if (values.rows.some((row) => !allowedCustomerIds.has(row.customerId))) return false;
  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from('misa_customer_monthly_plans').upsert(
    values.rows.map((row) => ({
      sales_id: values.salesId,
      period_month: values.periodMonth,
      misa_employee_id: values.employeeId,
      misa_customer_id: row.customerId,
      monthly_frequency: row.monthlyFrequency,
      committed_sales: row.committedSales,
      updated_at: updatedAt,
    })),
    { onConflict: 'period_month,misa_employee_id,misa_customer_id' },
  );
  if (error) {
    console.error('[upsertMisaCustomerPlans]', error.code, error.message);
    return false;
  }
  return true;
}
