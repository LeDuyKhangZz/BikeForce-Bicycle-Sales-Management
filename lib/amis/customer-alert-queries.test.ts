import { createClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMisaCustomerAlertCounts } from '@/services/misa-customer-alerts';
import { getCachedMisaEmployeeCustomers } from '@/services/misa-report119-cache';

vi.mock('server-only', () => ({}));
afterEach(() => vi.unstubAllEnvs());

describe('truy vấn cảnh báo khách hàng', () => {
  it('production chưa bật chăm sóc mới vẫn dùng bảng cũ và giữ phiếu đã duyệt', async () => {
    vi.stubEnv('SALEWORK_CARE_SYNC_ENABLED', 'false');
    const client = createClient('http://localhost:54321', 'test-anon', { global: {
      fetch: async (input) => {
        const url = new URL(String(input));
        expect(url.pathname).not.toContain('misa_customer_care_snapshot');
        if (url.pathname.endsWith('customer_care_submissions')) {
          return Response.json([{ misa_customer_id: 7 }], { headers: { 'content-range': '0-0/1' } });
        }
        const condition = url.searchParams.get('or');
        if (condition?.includes('last_visit_date')) {
          expect(url.searchParams.get('misa_customer_id')).toBe('not.in.(7)');
        }
        return new Response(null, { status: 200, headers: { 'content-range': '*/4' } });
      },
    } });
    expect(await getMisaCustomerAlertCounts(client, '2026-10', 42, '2026-09-01')).toEqual({ purchase: 4, care: 4 });
  });

  it('danh sách khi chưa bật không truy vấn view hoặc cột mới chưa có trên production', async () => {
    vi.stubEnv('SALEWORK_CARE_SYNC_ENABLED', 'false');
    const client = createClient('http://localhost:54321', 'test-anon', { global: {
      fetch: async (input) => {
        const url = new URL(String(input));
        expect(url.pathname).not.toContain('misa_customer_care_snapshot');
        if (url.pathname.endsWith('misa_report119_employees')) {
          return Response.json({ misa_employee_id: 42, employee_name: 'Sales A', customer_count: 0 });
        }
        if (url.pathname.endsWith('misa_report119_customers')) {
          expect(url.searchParams.get('select')).toContain('last_care_date:last_visit_date');
          expect(url.searchParams.get('or')).toContain('last_visit_date.is.null');
        }
        return Response.json([], { headers: { 'content-range': '*/0' } });
      },
    } });
    expect(await getCachedMisaEmployeeCustomers(client, {
      month: '2026-10', employeeId: 42, page: 1, filters: {}, searchQuery: '', alert: 'care', alertCutoff: '2026-09-01',
    })).toMatchObject({ total: 0, rows: [] });
  });

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
      '(days_without_purchase.gte.30)', '(last_care_date.is.null,last_care_date.lte.2026-09-01)',
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
          '(last_care_date.is.null,last_care_date.lte.2026-09-01)',
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
