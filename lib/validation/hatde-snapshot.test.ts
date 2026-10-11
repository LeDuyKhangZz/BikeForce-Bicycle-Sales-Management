import { describe, expect, it } from 'vitest';

import { hatdeSnapshotSchema } from './hatde-snapshot';

const validBranch = {
  branch_code: 'lotte_vung_tau',
  revenue: 189000,
  transactions: 5,
  vs_yesterday: -55.6,
  vs_last_week: 100,
} as const;

describe('hatdeSnapshotSchema', () => {
  it('nhận payload hợp lệ từ 1 đến 6 chi nhánh', () => {
    expect(hatdeSnapshotSchema.safeParse({
      report_date: '2026-10-11',
      report_time: '12:25',
      branches: [validBranch],
    }).success).toBe(true);
  });

  it('nhận chi nhánh có doanh thu và giao dịch cùng bằng 0', () => {
    expect(hatdeSnapshotSchema.safeParse({
      report_date: '2026-10-11',
      report_time: '12:25',
      branches: [{ ...validBranch, revenue: 0, transactions: 0 }],
    }).success).toBe(true);
  });

  it.each([
    [{ report_date: '11-10-2026', report_time: '12:25', branches: [validBranch] }],
    [{ report_date: '2026-02-30', report_time: '12:25', branches: [validBranch] }],
    [{ report_date: '2026-10-11', report_time: '25:00', branches: [validBranch] }],
    [{ report_date: '2026-10-11', report_time: '12:25', branches: [] }],
    [{ report_date: '2026-10-11', report_time: '12:25', branches: [{ ...validBranch, branch_code: 'unknown' }] }],
    [{ report_date: '2026-10-11', report_time: '12:25', branches: [validBranch, validBranch] }],
    [{ report_date: '2026-10-11', report_time: '12:25', branches: [{ ...validBranch, revenue: -1 }] }],
  ])('từ chối payload sai: %j', (payload) => {
    expect(hatdeSnapshotSchema.safeParse(payload).success).toBe(false);
  });
});
