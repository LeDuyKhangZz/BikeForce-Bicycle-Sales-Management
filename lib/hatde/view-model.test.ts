import { describe, expect, it } from 'vitest';

import { buildHatdeSnapshotViewModel } from './view-model';

describe('buildHatdeSnapshotViewModel', () => {
  it('format số lớn, dấu phần trăm và giữ thứ tự doanh thu', () => {
    const result = buildHatdeSnapshotViewModel({
      snapshot: {
        id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3',
        report_date: '2026-10-11',
        report_time: '12:25',
        total_revenue: 9_999_999_999,
        total_transactions: 105,
        created_at: '2026-10-11T05:25:00Z',
      },
      branches: [
        {
          id: '0e3e5a8f-2723-4dc1-ac63-222fce53b134',
          snapshot_id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3',
          branch_code: 'lotte_vung_tau',
          revenue: 9_999_999_999,
          transactions: 105,
          vs_yesterday: -55.6,
          vs_last_week: 100,
        },
      ],
    });

    expect(result.totalRevenueDisplay).toBe('9.999.999.999 VND');
    expect(result.branches[0]?.name).toBe('LOTTE VŨNG TÀU');
    expect(result.branches[0]?.vsYesterday.display).toBe('-55,6%');
    expect(result.branches[0]?.vsYesterday.direction).toBe('DOWN');
    expect(result.branches[0]?.vsLastWeek.display).toBe('+100%');
    expect(result.branches[0]?.vsLastWeek.direction).toBe('UP');
  });

  it('giữ và format chi nhánh doanh thu, giao dịch cùng bằng 0', () => {
    const result = buildHatdeSnapshotViewModel({
      snapshot: {
        id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3',
        report_date: '2026-10-11',
        report_time: '12:25',
        total_revenue: 0,
        total_transactions: 0,
        created_at: '2026-10-11T05:25:00Z',
      },
      branches: [{
        id: '0e3e5a8f-2723-4dc1-ac63-222fce53b134',
        snapshot_id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3',
        branch_code: 'cn_15h',
        revenue: 0,
        transactions: 0,
        vs_yesterday: 0,
        vs_last_week: 0,
      }],
    });

    expect(result.branches).toHaveLength(1);
    expect(result.branches[0]?.revenueDisplay).toBe('0 VND');
    expect(result.branches[0]?.transactionsDisplay).toBe('0');
  });
});
