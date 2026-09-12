import { createClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMonthlySummaryAmisMetrics } from '@/features/admin-monthly-summaries/queries';
import { excludeAccountingAugustSnapshot, MONTHLY_ACCOUNTING_AUGUST_KEY, MONTHLY_ACCOUNTING_AUGUST_RECEIVABLE_EMPLOYEE, usesAccountingAugustReport119 } from '@/lib/reports/monthly-accounting-august';
import { getAmisMetricsForShare, type AmisShareMetrics } from '@/services/reports';
import type { Database } from '@/types/database.types';

vi.mock('@/services/reports', () => ({ getAmisMetricsForShare: vi.fn() }));
const client = createClient<Database>('http://127.0.0.1:54321', 'unit-test-key');
const id = 'salework-accounting-sales';
const employee = 'Kế Toán Bán Hàng';
const original: AmisShareMetrics = {
  target_amount: null, current_amount: 458661000, net_sales: 458661000,
  receive_amount: 123456, qty_account_in_charge: 867, qty_account_interactive: 15,
  qty_account_sold_this_period: 0, no_of_orders: 0, return_sales: 0,
  synced_at: '2026-09-12T00:00:00Z',
};
const snapshot: AmisShareMetrics = {
  ...original, current_amount: 477633500, qty_account_in_charge: 0,
  qty_account_interactive: 31, qty_account_sold_this_period: 30,
  no_of_orders: 35, return_sales: 18972500, receive_amount: null,
};

beforeEach(() => vi.resetAllMocks());

describe('ngoại lệ Report 119 tháng 08/2026 Abraham', () => {
  it('snapshot kỹ thuật không xuất hiện thành nhân viên ở đối chiếu Admin; giữ mọi dòng khác kể cả NULL', () => {
    const rows = [
      { full_name: MONTHLY_ACCOUNTING_AUGUST_KEY, period_month: '2026-08-01' },
      { full_name: 'Kế Toán Bán Hàng', period_month: '2026-08-01' },
      { full_name: null, period_month: null },
      { full_name: MONTHLY_ACCOUNTING_AUGUST_KEY, period_month: '2026-09-01' },
    ];
    expect(excludeAccountingAugustSnapshot(rows)).toEqual(rows.slice(1));
  });
  it('chỉ đúng participant và đúng tháng 08/2026', () => {
    expect(usesAccountingAugustReport119(id, '2026-08')).toBe(true);
    for (const month of ['2026-07', '2026-09', '2026-10', '2027-08']) {
      expect(usesAccountingAugustReport119(id, month)).toBe(false);
    }
    expect(usesAccountingAugustReport119('sales-khoa', '2026-08')).toBe(false);
  });

  it('doanh số Sales không NetSales, khách mua trong kỳ, đơn/trả hàng từ phòng kế toán; giữ công nợ ACT', async () => {
    vi.mocked(getAmisMetricsForShare).mockResolvedValueOnce(original).mockResolvedValueOnce(snapshot)
      .mockResolvedValueOnce({ ...original, receive_amount: 391973996 });
    const metrics = await getMonthlySummaryAmisMetrics(client, id, employee, '2026-08');
    expect(metrics).toEqual({ ...snapshot, receive_amount: 391973996 });
    expect(getAmisMetricsForShare).toHaveBeenNthCalledWith(2, client, MONTHLY_ACCOUNTING_AUGUST_KEY, '2026-08-01');
    expect(getAmisMetricsForShare).toHaveBeenNthCalledWith(3, client, MONTHLY_ACCOUNTING_AUGUST_RECEIVABLE_EMPLOYEE, '2026-08-01');
  });

  it.each(['2026-09', '2026-10', '2027-08'])('tháng %s giữ nguyên object/logic cũ, không đọc snapshot', async (month) => {
    vi.mocked(getAmisMetricsForShare).mockResolvedValue(original);
    expect(await getMonthlySummaryAmisMetrics(client, id, employee, month)).toBe(original);
    expect(getAmisMetricsForShare).toHaveBeenCalledExactlyOnceWith(client, employee, `${month}-01`);
  });

  it('Sales khác tháng 8 giữ nguyên', async () => {
    vi.mocked(getAmisMetricsForShare).mockResolvedValue(original);
    expect(await getMonthlySummaryAmisMetrics(client, 'sales-khoa', 'Khoa', '2026-08')).toBe(original);
    expect(getAmisMetricsForShare).toHaveBeenCalledTimes(1);
  });

  it('không lấy doanh thu từ tên CRM khi nguồn Quỳnh thiếu; số 0 thật của nguồn vẫn giữ nguyên', async () => {
    vi.mocked(getAmisMetricsForShare).mockResolvedValueOnce(original).mockResolvedValueOnce(snapshot).mockResolvedValueOnce(null);
    expect(await getMonthlySummaryAmisMetrics(client, id, employee, '2026-08')).toMatchObject({ receive_amount: null });
    vi.mocked(getAmisMetricsForShare).mockResolvedValueOnce(original).mockResolvedValueOnce(snapshot)
      .mockResolvedValueOnce({ ...original, receive_amount: 0 });
    expect(await getMonthlySummaryAmisMetrics(client, id, employee, '2026-08')).toMatchObject({ receive_amount: 0 });
  });

  it('không fallback sang scope sai khi snapshot thiếu, không lấy công nợ CRM', async () => {
    vi.mocked(getAmisMetricsForShare).mockResolvedValueOnce(original).mockResolvedValueOnce(null);
    expect(await getMonthlySummaryAmisMetrics(client, id, employee, '2026-08')).toBeNull();
    vi.mocked(getAmisMetricsForShare).mockResolvedValueOnce(null).mockResolvedValueOnce(snapshot);
    expect(await getMonthlySummaryAmisMetrics(client, id, employee, '2026-08')).toMatchObject({ receive_amount: null });
  });
});
