import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getMonthlySalary, listSalaryEntries, saveSalaryEntries } from '@/services/salaries';
import { closePool, setRole, sql } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

let fixture: RlsFixture;
const MONTH = '2038-09-01';
const NEXT_MONTH = '2038-10-01';
const recipients = ['salework-accounting-sales', 'amis-kim-huong', 'amis-dang-khoa'];
beforeAll(async () => { fixture = await setUpRlsFixture(); });
afterAll(async () => {
  await sql('delete from public.monthly_participant_salaries where period_month in ($1, $2)', [MONTH, NEXT_MONTH]);
  await tearDownRlsFixture(); await closePool();
});

describe('lương nhân viên tháng không có profile', () => {
  it('Admin lưu/đọc lại cả ba người và Sales cũ, tách tháng, cập nhật/null/0 đúng', async () => {
    expect(await saveSalaryEntries(fixture.clients.admin, MONTH, [
      ...recipients.map((id, index) => ({ sales_id: id, amount: 15000000 + index })),
      { sales_id: fixture.ids.salesA, amount: 20000000 },
    ])).toEqual({ ok: true, saved: 4 });
    expect(await listSalaryEntries(fixture.clients.admin, MONTH)).toHaveLength(4);
    for (const [index, id] of recipients.entries()) {
      expect(await getMonthlySalary(fixture.clients.admin, id, MONTH)).toBe(15000000 + index);
      expect(await getMonthlySalary(fixture.clients.admin, id, NEXT_MONTH)).toBeNull();
    }
    expect(await getMonthlySalary(fixture.clients.admin, fixture.ids.salesA, MONTH)).toBe(20000000);
    expect(await saveSalaryEntries(fixture.clients.admin, NEXT_MONTH, [{ sales_id: recipients[0] ?? '', amount: 25000000 }])).toEqual({ ok: true, saved: 1 });
    await saveSalaryEntries(fixture.clients.admin, MONTH, [
      { sales_id: recipients[0] ?? '', amount: null }, { sales_id: recipients[1] ?? '', amount: 0 },
    ]);
    expect(await getMonthlySalary(fixture.clients.admin, recipients[0] ?? '', MONTH)).toBeNull();
    expect(await getMonthlySalary(fixture.clients.admin, recipients[1] ?? '', MONTH)).toBe(0);
  });
  it('Sales A/B, anon và Admin inactive không đọc/ghi lương tích hợp', async () => {
    await setRole(fixture.ids.inactive, 'ADMIN');
    for (const client of [fixture.clients.salesA, fixture.clients.salesB, fixture.clients.inactive, fixture.anon]) {
      expect(await getMonthlySalary(client, 'amis-dang-khoa', MONTH)).toBeNull();
      expect((await saveSalaryEntries(client, MONTH, [{ sales_id: 'amis-dang-khoa', amount: 999999 }])).ok).toBe(false);
    }
    expect(await getMonthlySalary(fixture.clients.admin, 'amis-dang-khoa', MONTH)).toBe(15000002);
  });
  it('transaction lỗi không làm đổi lương Sales đã ghi trước; chặn âm/khóa/tháng giả', async () => {
    for (const row of [
      { sales_id: 'amis-dang-khoa', amount: -1 },
      { sales_id: 'unknown-participant', amount: 1000 },
    ]) {
      expect((await saveSalaryEntries(fixture.clients.admin, MONTH, [
        { sales_id: fixture.ids.salesA, amount: 1 }, row,
      ])).ok).toBe(false);
      expect(await getMonthlySalary(fixture.clients.admin, fixture.ids.salesA, MONTH)).toBe(20000000);
    }
    expect((await saveSalaryEntries(fixture.clients.admin, '2038-09-02', [{ sales_id: 'amis-dang-khoa', amount: 1 }])).ok).toBe(false);
  });
  it('DB ép force RLS/no service-role/no delete và RPC invoker', async () => {
    const { rows: [row] } = await sql<{ rls: boolean; forced: boolean; service_select: boolean; service_insert: boolean; user_delete: boolean; definer: boolean }>(`
      select c.relrowsecurity as rls, c.relforcerowsecurity as forced,
        has_table_privilege('service_role', c.oid, 'SELECT') as service_select,
        has_table_privilege('service_role', c.oid, 'INSERT') as service_insert,
        has_table_privilege('authenticated', c.oid, 'DELETE') as user_delete,
        p.prosecdef as definer
      from pg_class c cross join pg_proc p
      where c.oid = 'public.monthly_participant_salaries'::regclass
        and p.oid = 'public.save_monthly_salary_entries(date,jsonb)'::regprocedure
    `);
    expect(row).toEqual({ rls: true, forced: true, service_select: false, service_insert: false, user_delete: false, definer: false });
  });
});
