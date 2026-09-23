import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { MISA_CUSTOMER_FILTER_FIELDS, type MisaCustomerFilters } from '@/lib/amis/customer-filters';
import { misaRelativeDateRange } from '@/lib/amis/customer-filter-date-range';
import type { MisaCustomer } from '@/types/misa-customer';
import type { MisaCustomerPage, MisaEmployee } from '@/services/misa-report119';

const PAGE_SIZE = 10;

export type MisaCustomerGroupCounts = { A: number; B: number; C: number; D: number };
export type MisaCustomerCommitmentStats = { total: number; committed: number; uncommitted: number };

type CacheEmployeeRow = {
  misa_employee_id: number;
  employee_name: string;
  customer_count: number;
};

const CUSTOMER_COLUMN_BY_KEY = {
  code: 'customer_code',
  name: 'customer_name',
  province: 'billing_province',
  debt: 'debt',
  orderSales: 'order_sales',
  recentPurchase: 'recent_purchase_date',
  daysWithoutPurchase: 'days_without_purchase',
  lastVisit: 'last_visit_date',
  owner: 'owner_name',
} as const;

function isEmployeeRow(value: unknown): value is CacheEmployeeRow {
  if (typeof value !== 'object' || value === null) return false;
  return 'misa_employee_id' in value && typeof value.misa_employee_id === 'number'
    && 'employee_name' in value && typeof value.employee_name === 'string'
    && 'customer_count' in value && typeof value.customer_count === 'number';
}

function customerFromRow(value: unknown): MisaCustomer | null {
  if (typeof value !== 'object' || value === null ||
      !('misa_customer_id' in value) || typeof value.misa_customer_id !== 'number' ||
      !('customer_code' in value) || typeof value.customer_code !== 'string' ||
      !('customer_name' in value) || typeof value.customer_name !== 'string' ||
      !('billing_province' in value) || typeof value.billing_province !== 'string' ||
      !('owner_name' in value) || typeof value.owner_name !== 'string') return null;
  const debt = 'debt' in value && typeof value.debt === 'number' && Number.isFinite(value.debt) ? value.debt : null;
  const orderSales = 'order_sales' in value && typeof value.order_sales === 'number' && Number.isFinite(value.order_sales) ? value.order_sales : null;
  const daysWithoutPurchase = 'days_without_purchase' in value && typeof value.days_without_purchase === 'number' && Number.isFinite(value.days_without_purchase) ? value.days_without_purchase : null;
  const recentPurchaseDate = 'recent_purchase_date' in value && typeof value.recent_purchase_date === 'string' ? value.recent_purchase_date : null;
  const lastVisitDate = 'last_visit_date' in value && typeof value.last_visit_date === 'string' ? value.last_visit_date : null;
  return {
    id: value.misa_customer_id,
    code: value.customer_code,
    name: value.customer_name,
    billingProvince: value.billing_province,
    debt,
    orderSales,
    recentPurchaseDate,
    daysWithoutPurchase,
    lastVisitDate,
    owner: value.owner_name,
  };
}

export async function listCachedMisaEmployees(
  supabase: SupabaseClient,
  month: string,
): Promise<MisaEmployee[]> {
  const { data, error } = await supabase
    .from('misa_report119_employees')
    .select('misa_employee_id,employee_name,customer_count')
    .eq('period_month', `${month}-01`)
    .order('employee_name');
  if (error) throw new Error(`Không đọc được snapshot nhân viên MISA: ${error.message}`);
  if (!(data ?? []).every(isEmployeeRow)) throw new Error('Snapshot nhân viên MISA không hợp lệ.');
  return (data ?? []).map((row) => ({
    id: row.misa_employee_id,
    name: row.employee_name,
    customerCount: row.customer_count,
  }));
}

export async function getCachedMisaEmployeeByName(
  supabase: SupabaseClient,
  month: string,
  employeeName: string,
): Promise<MisaEmployee | null> {
  const { data, error } = await supabase
    .from('misa_report119_employees')
    .select('misa_employee_id,employee_name,customer_count')
    .eq('period_month', `${month}-01`)
    .eq('employee_name', employeeName)
    .maybeSingle();
  if (error) throw new Error(`Không đọc được nhân viên MISA đã ánh xạ: ${error.message}`);
  if (data === null) return null;
  if (!isEmployeeRow(data)) throw new Error('Snapshot nhân viên MISA không hợp lệ.');
  return { id: data.misa_employee_id, name: data.employee_name, customerCount: data.customer_count };
}

export async function getCachedMisaEmployeeCustomers(
  supabase: SupabaseClient,
  params: {
    month: string;
    employeeId: number;
    page: number;
    filters: MisaCustomerFilters;
    searchQuery: string;
  },
): Promise<MisaCustomerPage | null> {
  const periodMonth = `${params.month}-01`;
  const { data: employeeValue, error: employeeError } = await supabase
    .from('misa_report119_employees')
    .select('misa_employee_id,employee_name,customer_count')
    .eq('period_month', periodMonth)
    .eq('misa_employee_id', params.employeeId)
    .maybeSingle();
  if (employeeError) throw new Error(`Không đọc được nhân viên MISA: ${employeeError.message}`);
  if (employeeValue === null) return null;
  if (!isEmployeeRow(employeeValue)) throw new Error('Snapshot nhân viên MISA không hợp lệ.');

  let query = supabase
    .from('misa_report119_customers')
    .select('misa_customer_id,customer_code,customer_name,billing_province,debt,order_sales,recent_purchase_date,days_without_purchase,last_visit_date,owner_name', { count: 'exact' })
    .eq('period_month', periodMonth)
    .eq('misa_employee_id', params.employeeId);

  if (params.searchQuery) {
    const safe = params.searchQuery.replace(/[,%()]/g, ' ');
    query = query.or(`customer_code.ilike.%${safe}%,customer_name.ilike.%${safe}%,billing_province.ilike.%${safe}%,owner_name.ilike.%${safe}%`);
  }

  for (const field of MISA_CUSTOMER_FILTER_FIELDS) {
    const filter = params.filters[field.key];
    if (filter === undefined) continue;
    const column = CUSTOMER_COLUMN_BY_KEY[field.key];
    if (field.kind === 'text') {
      if (filter.operator === 1) query = query.ilike(column, `%${filter.value}%`);
      else if (filter.operator === 8) query = query.not(column, 'ilike', `%${filter.value}%`);
      else if (filter.operator === 11) query = query.eq(column, filter.value);
      else if (filter.operator === 12) query = query.neq(column, filter.value);
      else if (filter.operator === 13) query = query.eq(column, '');
      else if (filter.operator === 14) query = query.neq(column, '');
    } else if (field.kind === 'number') {
      const value = Number(filter.value);
      if (filter.operator === 0) query = query.eq(column, value);
      else if (filter.operator === 9) query = query.neq(column, value);
      else if (filter.operator === 3) query = query.lt(column, value);
      else if (filter.operator === 5) query = query.lte(column, value);
      else if (filter.operator === 2) query = query.gt(column, value);
      else if (filter.operator === 4) query = query.gte(column, value);
      else if (filter.operator === 13) query = query.is(column, null);
      else if (filter.operator === 14) query = query.not(column, 'is', null);
    } else {
      if (filter.operator === 11) query = query.eq(column, filter.value);
      else if (filter.operator === 17) query = query.lt(column, filter.value);
      else if (filter.operator === 18) query = query.gt(column, filter.value);
      else if (filter.operator === 13) query = query.is(column, null);
      else if (filter.operator === 14) query = query.not(column, 'is', null);
      else {
        const range = misaRelativeDateRange(filter.operator);
        if (range !== null) query = query.gte(column, range.from).lte(column, range.to);
      }
    }
  }

  const from = (params.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order('customer_name')
    .order('misa_customer_id')
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(`Không đọc được snapshot khách hàng MISA: ${error.message}`);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (params.page > totalPages) return null;
  const rows = (data ?? []).map(customerFromRow);
  if (rows.some((row) => row === null)) throw new Error('Snapshot khách hàng MISA không hợp lệ.');
  const validRows = rows.filter((row) => row !== null);
  const customerIds = validRows.map((row) => row.id);
  let plans: unknown[] = [];
  if (customerIds.length > 0) {
    const planResult = await supabase
      .from('misa_customer_monthly_plans')
      .select('misa_customer_id,monthly_frequency,committed_sales')
      .eq('period_month', periodMonth)
      .eq('misa_employee_id', params.employeeId)
      .in('misa_customer_id', customerIds);
    if (planResult.error === null) plans = planResult.data ?? [];
    else if (planResult.error.code !== '42P01' && planResult.error.code !== 'PGRST205') {
      throw new Error(`Không đọc được kế hoạch khách hàng: ${planResult.error.message}`);
    }
  }
  const planByCustomer = new Map<number, { monthlyFrequency: number; committedSales: number | null }>();
  for (const plan of plans) {
    if (typeof plan !== 'object' || plan === null || !('misa_customer_id' in plan) || typeof plan.misa_customer_id !== 'number' ||
        !('monthly_frequency' in plan) || typeof plan.monthly_frequency !== 'number') continue;
    const committedSales = 'committed_sales' in plan && typeof plan.committed_sales === 'number' ? plan.committed_sales : null;
    planByCustomer.set(plan.misa_customer_id, { monthlyFrequency: plan.monthly_frequency, committedSales });
  }
  return {
    employee: { id: employeeValue.misa_employee_id, name: employeeValue.employee_name, customerCount: employeeValue.customer_count },
    rows: validRows.map((row) => ({ ...row, ...planByCustomer.get(row.id) })),
    page: params.page,
    pageSize: PAGE_SIZE,
    total,
    totalPages,
  };
}

export async function getCachedMisaCustomerGroupCounts(
  supabase: SupabaseClient,
  month: string,
  employeeId: number,
): Promise<MisaCustomerGroupCounts> {
  const base = () => supabase.from('misa_report119_customers').select('misa_customer_id', { count: 'exact', head: true })
    .eq('period_month', `${month}-01`).eq('misa_employee_id', employeeId);
  const [a, b, c, d] = await Promise.all([
    base().gte('order_sales', 150_000_000),
    base().gte('order_sales', 50_000_000).lt('order_sales', 150_000_000),
    base().gt('order_sales', 0).lt('order_sales', 50_000_000),
    base().or('order_sales.is.null,order_sales.eq.0'),
  ]);
  const failed = [a, b, c, d].find((result) => result.error !== null);
  if (failed?.error) throw new Error(`Không đếm được nhóm khách hàng: ${failed.error.message}`);
  return { A: a.count ?? 0, B: b.count ?? 0, C: c.count ?? 0, D: d.count ?? 0 };
}

export async function getCachedMisaCustomerCommitmentStats(
  supabase: SupabaseClient,
  month: string,
  employeeId: number,
  total: number,
): Promise<MisaCustomerCommitmentStats> {
  const { count, error } = await supabase
    .from('misa_customer_monthly_plans')
    .select('misa_customer_id', { count: 'exact', head: true })
    .eq('period_month', `${month}-01`)
    .eq('misa_employee_id', employeeId)
    .not('committed_sales', 'is', null);
  if (error) throw new Error(`Không đếm được khách hàng đã cam kết: ${error.message}`);
  const committed = Math.min(total, count ?? 0);
  return { total, committed, uncommitted: Math.max(0, total - committed) };
}
