import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getMonthlyTravelExpense, listTravelExpenseEntries, saveTravelExpenseEntries } from '@/services/travel-expenses';
import { closePool, setRole, sql } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

let fixture: RlsFixture;
const MONTH = '2039-09-01';
const NEXT_MONTH = '2039-10-01';
const recipients = ['salework-accounting-sales', 'amis-kim-huong', 'amis-dang-khoa'];
beforeAll(async () => { fixture = await setUpRlsFixture(); });
afterAll(async () => {
  await sql('delete from public.monthly_participant_travel_expenses where period_month in ($1, $2)', [MONTH, NEXT_MONTH]);
  await tearDownRlsFixture(); await closePool();
});

describe('công tác phí nhân viên tháng không có profile', () => {
  it('Admin lưu/đọc lại cả ba người và Sales cũ, tách tháng, cập nhật/null/0 đúng', async () => {
    expect(await saveTravelExpenseEntries(fixture.clients.admin, MONTH, [
      ...recipients.map((id, index) => ({ sales_id: id, amount: 15000000 + index })),
      { sales_id: fixture.ids.salesA, amount: 20000000 },
    ])).toEqual({ ok: true, saved: 4 });
    expect(await listTravelExpenseEntries(fixture.clients.admin, MONTH)).toHaveLength(4);
    for (const [index, id] of recipients.entries()) {
      expect(await getMonthlyTravelExpense(fixture.clients.admin, id, MONTH)).toBe(15000000 + index);
      expect(await getMonthlyTravelExpense(fixture.clients.admin, id, NEXT_MONTH)).toBeNull();
    }
    expect(await getMonthlyTravelExpense(fixture.clients.admin, fixture.ids.salesA, MONTH)).toBe(20000000);
    expect(await saveTravelExpenseEntries(fixture.clients.admin, NEXT_MONTH, [{ sales_id: recipients[0] ?? '', amount: 25000000 }])).toEqual({ ok: true, saved: 1 });
    await saveTravelExpenseEntries(fixture.clients.admin, MONTH, [
      { sales_id: recipients[0] ?? '', amount: null }, { sales_id: recipients[1] ?? '', amount: 0 },
    ]);
    expect(await getMonthlyTravelExpense(fixture.clients.admin, recipients[0] ?? '', MONTH)).toBeNull();
    expect(await getMonthlyTravelExpense(fixture.clients.admin, recipients[1] ?? '', MONTH)).toBe(0);
  });
  it('Sales A/B, anon và Admin inactive không đọc/ghi công tác phí tích hợp', async () => {
    await setRole(fixture.ids.inactive, 'ADMIN');
    for (const client of [fixture.clients.salesA, fixture.clients.salesB, fixture.clients.inactive, fixture.anon]) {
      expect(await getMonthlyTravelExpense(client, 'amis-dang-khoa', MONTH)).toBeNull();
      expect((await saveTravelExpenseEntries(client, MONTH, [{ sales_id: 'amis-dang-khoa', amount: 999999 }])).ok).toBe(false);
    }
    expect(await getMonthlyTravelExpense(fixture.clients.admin, 'amis-dang-khoa', MONTH)).toBe(15000002);
  });
  it('transaction lỗi không làm đổi công tác phí Sales đã ghi trước; chặn âm/khóa/tháng giả', async () => {
    for (const row of [
      { sales_id: 'amis-dang-khoa', amount: -1 },
      { sales_id: 'unknown-participant', amount: 1000 },
    ]) {
      expect((await saveTravelExpenseEntries(fixture.clients.admin, MONTH, [
        { sales_id: fixture.ids.salesA, amount: 1 }, row,
      ])).ok).toBe(false);
      expect(await getMonthlyTravelExpense(fixture.clients.admin, fixture.ids.salesA, MONTH)).toBe(20000000);
    }
    expect((await saveTravelExpenseEntries(fixture.clients.admin, '2039-09-02', [{ sales_id: 'amis-dang-khoa', amount: 1 }])).ok).toBe(false);
  });
  it('DB ép force RLS/no service-role/no delete và RPC invoker', async () => {
    const { rows: [row] } = await sql<{ rls: boolean; forced: boolean; service_select: boolean; service_insert: boolean; user_delete: boolean; definer: boolean }>(`
      select c.relrowsecurity as rls, c.relforcerowsecurity as forced,
        has_table_privilege('service_role', c.oid, 'SELECT') as service_select,
        has_table_privilege('service_role', c.oid, 'INSERT') as service_insert,
        has_table_privilege('authenticated', c.oid, 'DELETE') as user_delete,
        p.prosecdef as definer
      from pg_class c cross join pg_proc p
      where c.oid = 'public.monthly_participant_travel_expenses'::regclass
        and p.oid = 'public.save_monthly_travel_expense_entries(date,jsonb)'::regprocedure
    `);
    expect(row).toEqual({ rls: true, forced: true, service_select: false, service_insert: false, user_delete: false, definer: false });
  });
});
