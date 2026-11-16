import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CustomerAlertSummary } from '@/features/misa-employees/customer-alert-summary';
import { CustomerCareStatus } from '@/features/misa-employees/customer-care-status';
import { MisaCustomerToolbar } from '@/features/misa-employees/misa-customer-toolbar';
import { CustomerFilterPanel } from '@/features/misa-employees/customer-filter-panel';

vi.mock('@/features/misa-employees/customer-plan-import', () => ({ CustomerPlanImport: () => null }));

vi.mock('server-only', () => ({}));

describe('giao diện cảnh báo khách hàng', () => {
  it('mỗi thẻ có số đếm và liên kết riêng, có đường trở lại toàn bộ danh sách', () => {
    const html = renderToStaticMarkup(<CustomerAlertSummary counts={{ purchase: 23, care: 17 }} path="/sales/customers" month="2026-10" active="care" />);
    expect(html).toContain('23 khách');
    expect(html).toContain('17 khách');
    expect(html).toContain('aria-label="23 khách: Từ 30 ngày chưa mua hàng"');
    expect(html).toContain('aria-label="17 khách: Từ 30 ngày chưa chăm sóc"');
    expect(html).toContain('Xem tất cả khách hàng');
  });

  it('ngày ghé thăm gần đây không cảnh báo, ngày trống cần chăm sóc', () => {
    const recent = renderToStaticMarkup(<CustomerCareStatus lastVisitDate="2026-09-02" cutoff="2026-09-01" />);
    const missing = renderToStaticMarkup(<CustomerCareStatus lastVisitDate={null} cutoff="2026-09-01" />);
    expect(recent).not.toContain('text-destructive');
    expect(missing).toContain('Cần chăm sóc');
    expect(missing).toContain('Chưa có ngày chăm sóc');
  });

  it('tin chăm sóc mới loại cảnh báo dù ngày ghé thăm MISA đã cũ', () => {
    const html = renderToStaticMarkup(<CustomerCareStatus lastVisitDate="2026-08-01" lastCareDate="2026-09-20" cutoff="2026-09-01" />);
    expect(html).not.toContain('text-destructive');
    expect(html).toContain('20/09/2026');
  });

  it('tìm kiếm và bộ lọc giữ loại cảnh báo đang xem', () => {
    const toolbar = renderToStaticMarkup(<MisaCustomerToolbar employeeId={42} month="2026-10" monthLabel="Tháng 10/2026" filters={{}} searchQuery="" rows={[]} alert="care" showPlanImport={false} />);
    const panel = renderToStaticMarkup(<CustomerFilterPanel employeeId={42} month="2026-10" filters={{}} searchQuery="" alert="care" />);
    for (const html of [toolbar, panel]) expect(html).toContain('name="alert" value="care"');
  });
});
