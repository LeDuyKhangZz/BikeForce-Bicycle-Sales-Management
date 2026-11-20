import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { authAdmin, closePool, sql } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

const input = {
  p_report_date: '2000-02-29',
  p_report_time: '01:23',
  p_total_revenue: 0,
  p_total_transactions: 0,
  p_branches: [{
    branch_code: '77_oik_q11', revenue: 0, transactions: 0,
    vs_yesterday: -100, vs_last_week: -100,
  }],
};
let fixture: RlsFixture;

beforeAll(async () => {
  fixture = await setUpRlsFixture();
  const { error } = await authAdmin.rpc('upsert_hatde_snapshot', input);
  if (error) throw error;
});

afterAll(async () => {
  await sql('delete from public.hatde_snapshots where report_date = $1 and report_time = $2',
    [input.p_report_date, input.p_report_time]);
  await tearDownRlsFixture();
  await closePool();
});

describe('RLS Hạt Dẻ sau khi thêm 77 OIK Q11', () => {
  it('Admin đọc được chi nhánh mới, Sales không đọc được', async () => {
    const admin = await fixture.clients.admin.from('hatde_branch_snapshots')
      .select('branch_code').eq('branch_code', '77_oik_q11').limit(1);
    const sales = await fixture.clients.salesA.from('hatde_branch_snapshots')
      .select('branch_code').eq('branch_code', '77_oik_q11').limit(1);
    expect(admin.error).toBeNull();
    expect(admin.data).toEqual([{ branch_code: '77_oik_q11' }]);
    expect(sales.error).toBeNull();
    expect(sales.data).toEqual([]);
  });

  it('anon và tài khoản authenticated không được gọi RPC ghi', async () => {
    for (const client of [fixture.anon, fixture.clients.salesA, fixture.clients.admin]) {
      const result = await client.rpc('upsert_hatde_snapshot', input);
      expect(result.error?.code).toBe('42501');
    }
  });

  it('giữ forced RLS và không cấp DML bảng cho worker', async () => {
    const result = await sql(`select relname, relrowsecurity, relforcerowsecurity,
      has_table_privilege('service_role', oid, 'INSERT') as can_insert,
      has_table_privilege('service_role', oid, 'UPDATE') as can_update,
      has_table_privilege('service_role', oid, 'DELETE') as can_delete
      from pg_class where oid in ('public.hatde_snapshots'::regclass,
        'public.hatde_branch_snapshots'::regclass)`);
    expect(result.rows).toHaveLength(2);
    for (const row of result.rows) {
      expect(row).toMatchObject({
        relrowsecurity: true, relforcerowsecurity: true,
        can_insert: false, can_update: false, can_delete: false,
      });
    }
  });
});
