import { createClient } from '@supabase/supabase-js';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CustomerCommitmentProgress } from '@/features/misa-employees/customer-commitment-progress';
import { MisaCustomerToolbar } from '@/features/misa-employees/misa-customer-toolbar';
import { getCachedMisaEmployeeCustomers } from '@/services/misa-report119-cache';
import { parseCustomerCommitmentFilter } from './customer-commitment-filter';
import { misaCustomerQuery } from './customer-filters';

vi.mock('server-only', () => ({}));
vi.mock('@/features/misa-employees/customer-plan-import', () => ({ CustomerPlanImport: () => null }));

describe('danh sách cam kết khách hàng', () => {
  it('chỉ nhận trạng thái hợp lệ và giữ khi tìm kiếm/phân trang', () => {
    expect(parseCustomerCommitmentFilter('committed')).toBe('committed');
    expect(parseCustomerCommitmentFilter('uncommitted')).toBe('uncommitted');
    expect(parseCustomerCommitmentFilter('other')).toBeUndefined();
    expect(Object.fromEntries(new URLSearchParams(misaCustomerQuery('2026-10', {}, 2, 'BTR', undefined, undefined, 'committed')))).toEqual({ month: '2026-10', page: '2', q: 'BTR', commitment: 'committed' });
  });
  it('hai số đếm mở nhóm riêng, giữ kỳ doanh số', () => {
    const html = renderToStaticMarkup(<CustomerCommitmentProgress stats={{ total: 10, committed: 3, uncommitted: 7 }} path="/sales/customers" month="2026-10" salesMonth="2026-09" />);
    expect(html).toContain('commitment=committed&amp;salesMonth=2026-09');
    expect(html).toContain('commitment=uncommitted&amp;salesMonth=2026-09');
    expect(html).toContain('3/10 KH');
  });
  it('tìm kiếm và đổi tháng giữ trạng thái trong popup', () => {
    const html = renderToStaticMarkup(<MisaCustomerToolbar employeeId={42} month="2026-10" monthLabel="Tháng 10/2026" filters={{}} searchQuery="" rows={[]} showPlanImport={false} compact commitment="uncommitted" />);
    expect(html).toContain('name="commitment" value="uncommitted"');
  });
  it.each(['committed', 'uncommitted'] as const)('lọc %s server-side trước phân trang, 0 vẫn được tính đã cam kết', async (commitment) => {
    const client = createClient('http://localhost:54321', 'test-anon', { global: { fetch: async (input) => {
      const url = new URL(String(input));
      expect(url.searchParams.get('period_month')).toBe('eq.2026-10-01');
      expect(url.searchParams.get('misa_employee_id')).toBe('eq.42');
      if (url.pathname.endsWith('misa_report119_employees')) return Response.json({ misa_employee_id: 42, employee_name: 'Sales A', customer_count: 10 });
      if (url.pathname.endsWith('misa_customer_monthly_plans')) {
        expect(url.searchParams.get('committed_sales')).toBe('not.is.null');
        expect(url.searchParams.get('limit')).toBe('500');
        return Response.json([{ misa_customer_id: 7 }], { headers: { 'content-range': '0-0/1' } });
      }
      expect(url.searchParams.get('misa_customer_id')).toBe(commitment === 'committed' ? 'in.(7)' : 'not.in.(7)');
      expect(url.searchParams.get('offset')).toBe('10');
      expect(url.searchParams.get('limit')).toBe('10');
      return Response.json([], { headers: { 'content-range': '*/12' } });
    } } });
    const result = await getCachedMisaEmployeeCustomers(client, { month: '2026-10', employeeId: 42, page: 2, filters: {}, searchQuery: '', commitment });
    expect(result).toMatchObject({ total: 12, totalPages: 2 });
  });
});
