import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  getMonthlyTravelExpense,
  listMonthlyTravelExpenses,
  saveMonthlyTravelExpenses,
} from '@/services/travel-expenses';

import { closePool } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

let fixture: RlsFixture;
const PERIOD_MONTH = '2032-04-01';

beforeAll(async () => {
  fixture = await setUpRlsFixture();
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

describe('RLS công tác phí theo tháng', () => {
  it('Admin lưu và đọc được công tác phí của nhân viên', async () => {
    const result = await saveMonthlyTravelExpenses(
      fixture.clients.admin,
      PERIOD_MONTH,
      [{ sales_id: fixture.ids.salesA, amount: 3_500_000 }],
      fixture.ids.admin,
    );
    expect(result).toEqual({ ok: true, saved: 1 });
    expect(await listMonthlyTravelExpenses(fixture.clients.admin, PERIOD_MONTH)).toEqual([
      { sales_id: fixture.ids.salesA, amount: 3_500_000 },
    ]);
  });

  it('cùng một nhân viên/tháng được cập nhật, không sinh dòng trùng', async () => {
    expect(
      await saveMonthlyTravelExpenses(
        fixture.clients.admin,
        PERIOD_MONTH,
        [{ sales_id: fixture.ids.salesA, amount: 4_000_000 }],
        fixture.ids.admin,
      ),
    ).toEqual({ ok: true, saved: 1 });
    expect(await listMonthlyTravelExpenses(fixture.clients.admin, PERIOD_MONTH)).toEqual([
      { sales_id: fixture.ids.salesA, amount: 4_000_000 },
    ]);
  });

  it('database từ chối số tiền âm', async () => {
    const { error } = await fixture.clients.admin.from('sales_monthly_travel_expenses').upsert({
      period_month: '2032-06-01',
      sales_id: fixture.ids.salesA,
      amount: -1,
      updated_by: fixture.ids.admin,
    });
    expect(error).not.toBeNull();
  });

  it('Sales chỉ đọc được công tác phí của chính mình để dựng báo cáo', async () => {
    await saveMonthlyTravelExpenses(
      fixture.clients.admin,
      PERIOD_MONTH,
      [{ sales_id: fixture.ids.salesB, amount: 8_000_000 }],
      fixture.ids.admin,
    );

    expect(await getMonthlyTravelExpense(fixture.clients.salesA, fixture.ids.salesA, PERIOD_MONTH)).toBe(
      4_000_000,
    );
    expect(await getMonthlyTravelExpense(fixture.clients.salesA, fixture.ids.salesB, PERIOD_MONTH)).toBeNull();
    expect(await listMonthlyTravelExpenses(fixture.clients.salesA, PERIOD_MONTH)).toEqual([
      { sales_id: fixture.ids.salesA, amount: 4_000_000 },
    ]);
  });

  it('Sales không thể tự ghi công tác phí', async () => {
    const result = await saveMonthlyTravelExpenses(
      fixture.clients.salesA,
      PERIOD_MONTH,
      [{ sales_id: fixture.ids.salesA, amount: 99_000_000 }],
      fixture.ids.salesA,
    );
    expect(result.ok).toBe(false);
  });

  it('anon không đọc được dữ liệu', async () => {
    expect(await listMonthlyTravelExpenses(fixture.anon, PERIOD_MONTH)).toEqual([]);
  });
});
