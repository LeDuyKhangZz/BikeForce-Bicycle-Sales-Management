import { createClient } from '@supabase/supabase-js';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CustomerGroupSummary } from '@/features/misa-employees/customer-group-summary';
import { getCachedMisaEmployeeCustomers, getCachedMisaCustomerGroupCounts } from '@/services/misa-report119-cache';
import { misaCustomerQuery } from './customer-filters';
import { parseCustomerRevenueGroup } from './customer-revenue-group';

vi.mock('server-only', () => ({}));

describe('lọc nhóm khách hàng', () => {
  it('chỉ nhận A/B/C/D và giữ nhóm khi tìm kiếm, phân trang, lọc cảnh báo', () => {
    expect(parseCustomerRevenueGroup('A')).toBe('A');
    expect(parseCustomerRevenueGroup('invalid')).toBeUndefined();
    expect(Object.fromEntries(new URLSearchParams(misaCustomerQuery('2026-10', {}, 2, 'ABC', 'care', 'B'))))
      .toEqual({ month: '2026-10', page: '2', q: 'ABC', alert: 'care', group: 'B' });
  });

  it('bốn nút dẫn về đúng nhóm, reset trang và có nút xem tất cả', () => {
    const html = renderToStaticMarkup(<CustomerGroupSummary counts={{ A: 1, B: 2, C: 3, D: 4 }} path="/sales/customers" month="2026-10" active="B" />);
    for (const group of ['A', 'B', 'C', 'D']) expect(html).toContain(`page=1&amp;group=${group}`);
    expect(html).toContain('Đang xem khách hàng nhóm B');
    expect(html).toContain('Xem tất cả khách hàng');
    expect(html).not.toContain('xl:hidden');
  });

  it.each([
    ['A', '(order_sales.gte.150000000)'],
    ['B', '(and(order_sales.gte.50000000,order_sales.lt.150000000))'],
    ['C', '(and(order_sales.gt.0,order_sales.lt.50000000))'],
    ['D', '(order_sales.is.null,order_sales.lte.0)'],
  ] as const)('nhóm %s: count và danh sách dùng cùng ngưỡng, lọc trước phân trang', async (group, condition) => {
    const countConditions: Array<string | null> = [];
    const client = createClient('http://localhost:54321', 'test-anon', { global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        expect(url.searchParams.get('period_month')).toBe('eq.2026-10-01');
        expect(url.searchParams.get('misa_employee_id')).toBe('eq.42');
        if (url.pathname.endsWith('misa_report119_employees')) return Response.json({ misa_employee_id: 42, employee_name: 'Sales A', customer_count: 100 });
        if (init?.method === 'HEAD') {
          countConditions.push(url.searchParams.get('or'));
          return new Response(null, { headers: { 'content-range': '*/12' } });
        }
        expect(url.searchParams.get('or')).toBe(condition);
        expect(url.searchParams.get('offset')).toBe('10');
        expect(url.searchParams.get('limit')).toBe('10');
        return Response.json([], { headers: { 'content-range': '10-11/12' } });
      },
    } });
    const counts = await getCachedMisaCustomerGroupCounts(client, '2026-10', 42);
    expect(countConditions).toContain(condition);
    const result = await getCachedMisaEmployeeCustomers(client, { month: '2026-10', employeeId: 42, page: 2, filters: {}, searchQuery: '', group });
    expect(result).toMatchObject({ total: counts[group], totalPages: 2 });
  });
});
