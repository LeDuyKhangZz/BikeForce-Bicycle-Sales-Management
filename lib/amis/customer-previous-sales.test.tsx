import { createClient } from '@supabase/supabase-js';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CustomerSalesComparison } from '@/features/misa-employees/customer-sales-comparison';
import { getPreviousMonthCustomerSales } from '@/services/misa-customer-previous-sales';
import { getCachedMisaEmployeeCustomers } from '@/services/misa-report119-cache';
import { customerSalesMonthLabels, formatPreviousCustomerSales } from './customer-sales-comparison';

vi.mock('server-only', () => ({}));

describe('doanh số khách hàng tháng trước', () => {
  it('đọc một lô đúng tháng trước, cùng nhân viên, chỉ ID khách trang hiện tại', async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.searchParams.get('period_month')).toBe('eq.2025-12-01');
      expect(url.searchParams.get('misa_employee_id')).toBe('eq.42');
      expect(url.searchParams.get('misa_customer_id')).toBe('in.(1,2,3)');
      expect(url.searchParams.get('select')).toBe('misa_customer_id,order_sales');
      expect(url.searchParams.get('limit')).toBe('3');
      return Response.json([{ misa_customer_id: 2, order_sales: 0 }, { misa_customer_id: 1, order_sales: 150000000 }]);
    });
    const client = createClient('http://localhost:54321', 'test-anon', { global: { fetch } });
    const result = await getPreviousMonthCustomerSales(client, '2026-01', 42, [1, 2, 3]);
    expect(result.get(1)).toBe(150000000);
    expect(result.get(2)).toBe(0);
    expect(result.has(3)).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    await getPreviousMonthCustomerSales(client, '2026-01', 42, []);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('ghép theo ID, không ghép theo thứ tự/tên và không thay doanh số tháng đang xem', async () => {
    const client = createClient('http://localhost:54321', 'test-anon', { global: {
      fetch: async input => {
        const url = new URL(String(input));
        if (url.pathname.endsWith('misa_report119_employees')) return Response.json({ misa_employee_id: 42, employee_name: 'Sales A', customer_count: 3 });
        if (url.pathname.endsWith('misa_customer_monthly_plans')) return Response.json([]);
        if (url.searchParams.get('period_month') === 'eq.2026-09-01') return Response.json([{ misa_customer_id: 2, order_sales: 0 }, { misa_customer_id: 1, order_sales: 50000000 }]);
        return Response.json([1, 2, 3].map(id => ({ misa_customer_id: id, customer_code: `KH${id}`, customer_name: 'Tên trùng', billing_province: '', owner_name: '', order_sales: 123 })), { headers: { 'content-range': '0-2/3' } });
      },
    } });
    const result = await getCachedMisaEmployeeCustomers(client, { month: '2026-10', employeeId: 42, page: 1, filters: {}, searchQuery: '' });
    expect(result?.rows.map(row => [row.id, row.orderSales, row.previousMonthOrderSales])).toEqual([[1, 123, 50000000], [2, 123, 0], [3, 123, null]]);
  });

  it('không biến lỗi truy vấn thành dữ liệu trống hoặc số 0', async () => {
    const client = createClient('http://localhost:54321', 'test-anon', { global: { fetch: async () => Response.json({ message: 'Unavailable' }, { status: 403 }) } });
    await expect(getPreviousMonthCustomerSales(client, '2026-10', 42, [1])).rejects.toThrow();
  });

  it('hiển thị kỳ đúng qua ranh giới năm; phân biệt chưa có dữ liệu và 0', () => {
    expect(customerSalesMonthLabels('2026-01')).toEqual({ current: 'Tháng 01/2026', previous: 'Tháng 12/2025' });
    expect(formatPreviousCustomerSales(null)).toBe('Chưa có dữ liệu');
    expect(formatPreviousCustomerSales(undefined)).toBe('Chưa có dữ liệu');
    expect(formatPreviousCustomerSales(0)).toContain('0');
    expect(formatPreviousCustomerSales(0)).not.toContain('Chưa');
    const html = renderToStaticMarkup(<CustomerSalesComparison month="2026-01" current={1000000} previous={0} />);
    expect(html).toContain('Tháng 01/2026');
    expect(html).toContain('Tháng 12/2025');
    expect(html).toContain('1.000.000');
  });
});
