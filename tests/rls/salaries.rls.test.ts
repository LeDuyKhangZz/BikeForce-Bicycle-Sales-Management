import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getMonthlySalary, listMonthlySalaries, saveMonthlySalaries } from '@/services/salaries';

import { closePool } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

let fixture: RlsFixture;
const PERIOD_MONTH = '2032-07-01';

beforeAll(async () => {
  fixture = await setUpRlsFixture();
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

describe('RLS lương theo tháng', () => {
  it('Admin lưu, đọc và cập nhật được lương của nhân viên', async () => {
    expect(
      await saveMonthlySalaries(
        fixture.clients.admin,
        PERIOD_MONTH,
        [{ sales_id: fixture.ids.salesA, amount: 15_000_000 }],
        fixture.ids.admin,
      ),
    ).toEqual({ ok: true, saved: 1 });
    expect(await listMonthlySalaries(fixture.clients.admin, PERIOD_MONTH)).toEqual([
      { sales_id: fixture.ids.salesA, amount: 15_000_000 },
    ]);

    await saveMonthlySalaries(
      fixture.clients.admin,
      PERIOD_MONTH,
      [{ sales_id: fixture.ids.salesA, amount: 16_000_000 }],
      fixture.ids.admin,
    );
    expect(await listMonthlySalaries(fixture.clients.admin, PERIOD_MONTH)).toEqual([
      { sales_id: fixture.ids.salesA, amount: 16_000_000 },
    ]);
  });

  it('database từ chối số tiền âm', async () => {
    const { error } = await fixture.clients.admin.from('sales_monthly_salaries').upsert({
      period_month: '2032-08-01',
      sales_id: fixture.ids.salesA,
      amount: -1,
      updated_by: fixture.ids.admin,
    });
    expect(error).not.toBeNull();
  });

  it('Sales chỉ đọc được lương của chính mình để dựng báo cáo; anon không đọc được', async () => {
    await saveMonthlySalaries(
      fixture.clients.admin,
      PERIOD_MONTH,
      [{ sales_id: fixture.ids.salesB, amount: 18_000_000 }],
      fixture.ids.admin,
    );

    expect(await getMonthlySalary(fixture.clients.salesA, fixture.ids.salesA, PERIOD_MONTH)).toBe(
      16_000_000,
    );
    expect(await getMonthlySalary(fixture.clients.salesA, fixture.ids.salesB, PERIOD_MONTH)).toBeNull();
    expect(await listMonthlySalaries(fixture.clients.salesA, PERIOD_MONTH)).toEqual([
      { sales_id: fixture.ids.salesA, amount: 16_000_000 },
    ]);
    expect(await listMonthlySalaries(fixture.anon, PERIOD_MONTH)).toEqual([]);
  });

  it('Sales không thể tự ghi lương', async () => {
    const result = await saveMonthlySalaries(
      fixture.clients.salesA,
      PERIOD_MONTH,
      [{ sales_id: fixture.ids.salesA, amount: 99_000_000 }],
      fixture.ids.salesA,
    );
    expect(result.ok).toBe(false);
  });
});
