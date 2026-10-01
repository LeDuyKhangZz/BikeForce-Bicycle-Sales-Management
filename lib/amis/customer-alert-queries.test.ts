import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { getMisaCustomerAlertCounts } from '@/services/misa-customer-alerts';
import { getCachedMisaEmployeeCustomers } from '@/services/misa-report119-cache';

vi.mock('server-only', () => ({}));

describe('truy vấn cảnh báo khách hàng', () => {
  it('đếm toàn bộ dữ liệu đúng nhân viên/tháng, không tải các dòng về để đếm', async () => {
    const requests: URL[] = [];
    const client = createClient('http://localhost:54321', 'test-anon', { global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        requests.push(url);
        expect(init?.method).toBe('HEAD');
        expect(url.searchParams.get('period_month')).toBe('eq.2026-10-01');
        expect(url.searchParams.get('misa_employee_id')).toBe('eq.42');
        const total = url.searchParams.get('or')?.includes('days_without_purchase') ? 23 : 17;
        return new Response(null, { status: 200, headers: { 'content-range': `*/${total}` } });
      },
    } });
    expect(await getMisaCustomerAlertCounts(client, '2026-10', 42, '2026-09-01')).toEqual({ purchase: 23, care: 17 });
    expect(requests.map(url => url.searchParams.get('or'))).toEqual([
      '(days_without_purchase.gte.30)', '(last_visit_date.is.null,last_visit_date.lte.2026-09-01)',
    ]);
  });

  it('phân trang sau khi lọc cảnh báo, kết hợp tìm kiếm và giữ count chính xác', async () => {
    const client = createClient('http://localhost:54321', 'test-anon', { global: {
      fetch: async (input) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith('misa_report119_employees')) {
          return Response.json({ misa_employee_id: 42, employee_name: 'Sales A', customer_count: 100 });
        }
        expect(url.searchParams.get('misa_employee_id')).toBe('eq.42');
        expect(url.searchParams.get('period_month')).toBe('eq.2026-10-01');
        expect(url.searchParams.get('offset')).toBe('10');
        expect(url.searchParams.get('limit')).toBe('10');
        expect(url.searchParams.getAll('or')).toEqual([
          '(last_visit_date.is.null,last_visit_date.lte.2026-09-01)',
          '(customer_code.ilike.%ABC%,customer_name.ilike.%ABC%,billing_province.ilike.%ABC%,owner_name.ilike.%ABC%)',
        ]);
        return Response.json([], { headers: { 'content-range': '10-19/23' } });
      },
    } });
    const result = await getCachedMisaEmployeeCustomers(client, {
      month: '2026-10', employeeId: 42, page: 2, filters: {}, searchQuery: 'ABC', alert: 'care', alertCutoff: '2026-09-01',
    });
    expect(result).toMatchObject({ total: 23, totalPages: 3, page: 2 });
  });

  it('không biến lỗi đọc dữ liệu thành số 0 gây hiểu nhầm', async () => {
    const client = createClient('http://localhost:54321', 'test-anon', { global: {
      fetch: async () => new Response(null, { status: 403 }),
    } });
    await expect(getMisaCustomerAlertCounts(client, '2026-10', 42, '2026-09-01')).rejects.toThrow();
  });
});
