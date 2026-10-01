import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { shiftVietnamMonth } from '@/lib/date';

/** Đọc một lô khách của trang hiện tại, giữ scope nhân viên và RLS. */
export async function getPreviousMonthCustomerSales(
  supabase: SupabaseClient,
  month: string,
  employeeId: number,
  customerIds: number[],
): Promise<Map<number, number | null>> {
  const previousMonth = shiftVietnamMonth(month, -1);
  if (previousMonth === null || customerIds.length === 0) return new Map();
  const { data, error } = await supabase.from('misa_report119_customers')
    .select('misa_customer_id,order_sales', { count: 'exact' })
    .eq('period_month', `${previousMonth}-01`)
    .eq('misa_employee_id', employeeId)
    .in('misa_customer_id', customerIds)
    .order('misa_customer_id')
    .range(0, customerIds.length - 1);
  if (error) throw new Error(`Không đọc được doanh số khách hàng tháng trước: ${error.message}`);
  const result = new Map<number, number | null>();
  for (const row of data ?? []) {
    if (typeof row.misa_customer_id !== 'number' ||
        (row.order_sales !== null && (typeof row.order_sales !== 'number' || !Number.isFinite(row.order_sales)))) {
      throw new Error('Doanh số khách hàng tháng trước không hợp lệ.');
    }
    result.set(row.misa_customer_id, row.order_sales);
  }
  return result;
}
