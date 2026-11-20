import { afterAll, describe, expect, it } from 'vitest';

import { HATDE_BRANCH_CODES } from '@/lib/hatde/branches';
import { closePool, inRollbackTransaction } from './setup';

const branch = (branch_code: string) => ({
  branch_code, revenue: 0, transactions: 0, vs_yesterday: -100, vs_last_week: -100,
});
const payload = [
  'lotte_gold_coast', 'lotte_2310', 'lotte_vung_tau',
  'passio_dong_den', 'bep_trung_tam', '77_oik_q11',
].map(branch);
const call = `select public.upsert_hatde_snapshot(
  date '2026-11-20', '09:51', $1::bigint, $2::integer, $3::jsonb
) as result`;

afterAll(closePool);

describe('Hạt Dẻ — danh mục chi nhánh và tính nguyên tử', () => {
  it('nhận sáu chi nhánh 0/0 rồi cập nhật cùng snapshot không nhân đôi', async () => {
    await inRollbackTransaction(async (query) => {
      await query("delete from public.hatde_snapshots where report_date = '2026-11-20' and report_time = '09:51'");
      const first = await query(call, [0, 0, JSON.stringify(payload)]);
      expect(first.rows[0]?.result).toMatchObject({ created: true });
      const second = await query(call, [0, 0, JSON.stringify(payload)]);
      expect(second.rows[0]?.result).toMatchObject({ created: false });
      const stored = await query(`select b.branch_code from public.hatde_branch_snapshots b
        join public.hatde_snapshots s on s.id = b.snapshot_id
        where s.report_date = '2026-11-20' and s.report_time = '09:51'`);
      expect(stored.rows.map((row) => row.branch_code).sort())
        .toEqual(payload.map((row) => row.branch_code).sort());
    });
  });

  it('nhận cả tám mã cũ/mới; không bắt payload phải có đủ tám', async () => {
    await inRollbackTransaction(async (query) => {
      await query(call, [0, 0, JSON.stringify(HATDE_BRANCH_CODES.map(branch))]);
      const single = await query(call, [0, 0, JSON.stringify([branch('77_oik_q11')])]);
      expect(single.rows[0]?.result).toMatchObject({ created: false });
    });
  });

  it.each([
    ['mã lạ', [branch('unknown')], 0, 0],
    ['mã trùng', [branch('77_oik_q11'), branch('77_oik_q11')], 0, 0],
    ['tổng doanh thu lệch', payload, 1, 0],
    ['tổng giao dịch lệch', payload, 0, 1],
    ['doanh thu âm', [{ ...branch('77_oik_q11'), revenue: -1 }], 0, 0],
    ['giao dịch null', [{ ...branch('77_oik_q11'), transactions: null }], 0, 0],
    ['thiếu so sánh', [{ ...branch('77_oik_q11'), vs_yesterday: null }], 0, 0],
    ['mảng rỗng', [], 0, 0],
    ['không phải mảng', {}, 0, 0],
    ['quá tám dòng', Array.from({ length: 9 }, () => branch('77_oik_q11')), 0, 0],
  ])('từ chối %s trước khi thay snapshot đã có', async (_label, rows, revenue, transactions) => {
    await inRollbackTransaction(async (query) => {
      await query(call, [0, 0, JSON.stringify(payload)]);
      await query('savepoint rejected_payload');
      await expect(query(call, [revenue, transactions, JSON.stringify(rows)]))
        .rejects.toMatchObject({ code: 'P0001' });
      await query('rollback to savepoint rejected_payload');
      const stored = await query(`select count(*)::integer as count from public.hatde_branch_snapshots b
        join public.hatde_snapshots s on s.id = b.snapshot_id
        where s.report_date = '2026-11-20' and s.report_time = '09:51'`);
      expect(stored.rows[0]?.count).toBe(6);
    });
  });

  it('CHECK bảng vẫn chặn mã lạ kể cả khi bỏ qua RPC', async () => {
    await inRollbackTransaction(async (query) => {
      await query(call, [0, 0, JSON.stringify(payload)]);
      await expect(query(`update public.hatde_branch_snapshots set branch_code = 'unknown'
        where branch_code = '77_oik_q11'`)).rejects.toMatchObject({ code: '23514' });
    });
  });
});
