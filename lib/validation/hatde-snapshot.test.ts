import { describe, expect, it } from 'vitest';

import { hatdeSnapshotSchema } from './hatde-snapshot';
import { getHatdeBranchName } from '@/lib/hatde/branches';

const validBranch = {
  branch_code: 'lotte_vung_tau',
  revenue: 189000,
  transactions: 5,
  vs_yesterday: -55.6,
  vs_last_week: 100,
} as const;

describe('hatdeSnapshotSchema', () => {
  it('nhận đủ sáu chi nhánh của n8n ngày 20/11, gồm Bếp trung tâm và 77 OIK Q11', () => {
    const codes = [
      'lotte_gold_coast', 'lotte_2310', 'lotte_vung_tau',
      'passio_dong_den', 'bep_trung_tam', '77_oik_q11',
    ];
    const result = hatdeSnapshotSchema.safeParse({
      report_date: '2026-11-20',
      report_time: '09:51',
      branches: codes.map((branch_code) => ({
        branch_code, revenue: 0, transactions: 0,
        vs_yesterday: -100, vs_last_week: -100,
      })),
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.branches).toHaveLength(6);
    expect(result.data.branches.map((branch) => getHatdeBranchName(branch.branch_code)))
      .toContain('77 OIK Q11');
  });

  it('nhận payload có một chi nhánh hợp lệ', () => {
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
