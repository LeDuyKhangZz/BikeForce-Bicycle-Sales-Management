import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE_SIZE = 20;
const MONTH_SCAN_LIMIT = 20_000;

export type MisaCustomerMonthlySale = {
  customerCode: string;
  customerName: string;
  orderSales: number;
};

export type MisaCustomerMonthlySalesPage = {
  rows: MisaCustomerMonthlySale[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function monthlySaleFromRow(value: unknown): MisaCustomerMonthlySale | null {
  if (typeof value !== 'object' || value === null ||
      !('customer_code' in value) || typeof value.customer_code !== 'string' ||
      !('customer_name' in value) || typeof value.customer_name !== 'string' ||
      !('order_sales' in value) || typeof value.order_sales !== 'number' ||
      !Number.isFinite(value.order_sales)) return null;
  return {
    customerCode: value.customer_code,
    customerName: value.customer_name,
    orderSales: value.order_sales,
  };
}

export async function listMisaReport44Months(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('misa_report44_customer_monthly_sales')
    .select('period_month')
    .order('period_month', { ascending: false })
    .range(0, MONTH_SCAN_LIMIT - 1);
  if (error) throw new Error(`Không đọc được kỳ report 44: ${error.message}`);
  const months = new Set<string>();
  for (const value of data ?? []) {
    if (typeof value !== 'object' || value === null ||
        !('period_month' in value) || typeof value.period_month !== 'string') {
      throw new Error('Kỳ report 44 không hợp lệ.');
    }
    months.add(value.period_month.slice(0, 7));
  }
  return [...months].sort((left, right) => right.localeCompare(left));
}

export async function listMisaCustomerMonthlySales(
  supabase: SupabaseClient,
  params: { month: string; page: number; searchQuery: string },
): Promise<MisaCustomerMonthlySalesPage | null> {
  let query = supabase
    .from('misa_report44_customer_monthly_sales')
    .select('customer_code,customer_name,order_sales', { count: 'exact' })
    .eq('period_month', `${params.month}-01`);
  if (params.searchQuery) {
    const safe = params.searchQuery.replace(/[,%()]/g, ' ');
    query = query.or(`customer_code.ilike.%${safe}%,customer_name.ilike.%${safe}%`);
  }
  const from = (params.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order('customer_name')
    .order('customer_code')
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(`Không đọc được doanh số khách hàng report 44: ${error.message}`);
  const rows = (data ?? []).map(monthlySaleFromRow);
  if (rows.some((row) => row === null)) throw new Error('Dữ liệu doanh số khách hàng không hợp lệ.');
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (params.page > totalPages) return null;
  return {
    rows: rows.filter((row) => row !== null),
    page: params.page,
    pageSize: PAGE_SIZE,
    total,
    totalPages,
  };
}
