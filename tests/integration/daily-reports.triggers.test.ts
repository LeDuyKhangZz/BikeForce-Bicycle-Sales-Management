import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  closePool,
  createTestUser,
  deleteTestUser,
  expectSqlError,
  insertMorningReport,
  sql,
  vnToday,
} from './setup';

/** TẦNG 2 — trigger `guard_report_transition()` và `set_updated_at()` (BR-008). */

const EMAIL_A = 'it.trg-a@bikeforce.test';
const EMAIL_B = 'it.trg-b@bikeforce.test';

let salesA = '';
let salesB = '';
let today = '';
let reportId = '';

const COMPLETE_SQL = `
  update public.daily_reports
     set status = 'COMPLETED', actual_visit_points = 4, actual_sales_amount = 6,
         actual_revenue = 120000000, actual_customer_visits = 9,
         evening_submitted_at = now()
   where id = $1`;

beforeAll(async () => {
  salesA = (await createTestUser({ email: EMAIL_A, fullName: 'Trigger Sales A' })).id;
  salesB = (await createTestUser({ email: EMAIL_B, fullName: 'Trigger Sales B' })).id;
  today = await vnToday();
});

afterAll(async () => {
  await deleteTestUser(EMAIL_A);
  await deleteTestUser(EMAIL_B);
  await closePool();
});

beforeEach(async () => {
  await sql('delete from public.daily_reports where sales_id = any($1::uuid[])', [[salesA, salesB]]);
  reportId = await insertMorningReport(salesA, today);
});

describe('guard_report_transition()', () => {
  it('cho phép đúng MỘT chiều MORNING_SUBMITTED → COMPLETED', async () => {
    await expect(sql(COMPLETE_SQL, [reportId])).resolves.toBeDefined();
  });

  it('BR-008 — chặn quay lui COMPLETED → MORNING_SUBMITTED', async () => {
    await sql(COMPLETE_SQL, [reportId]);

    const error = await expectSqlError(
      `update public.daily_reports
          set status = 'MORNING_SUBMITTED', actual_visit_points = null,
              actual_sales_amount = null, actual_revenue = null,
              actual_customer_visits = null, evening_submitted_at = null
        where id = $1`,
      [reportId],
    );

    expect(error.message).toContain('COMPLETED -> MORNING_SUBMITTED');
  });

  it('BR-003 — chặn chuyển báo cáo sang Sales khác', async () => {
    const error = await expectSqlError(
      'update public.daily_reports set sales_id = $2 where id = $1',
      [reportId, salesB],
    );
    expect(error.message).toContain('Sales khác');
  });

  it('BR-001 — chặn đổi report_date của báo cáo đã tạo', async () => {
    const error = await expectSqlError(
      'update public.daily_reports set report_date = public.vn_today() - 1 where id = $1',
      [reportId],
    );
    expect(error.message).toContain('report_date');
  });

  it('chặn đổi id của báo cáo', async () => {
    const error = await expectSqlError(
      'update public.daily_reports set id = gen_random_uuid() where id = $1',
      [reportId],
    );
    expect(error.message).toContain('bất biến');
  });
});

describe('set_updated_at()', () => {
  it('ghi đè updated_at bằng now(), không tin giá trị client gửi lên', async () => {
    const before = await sql<{ updated_at: Date }>(
      'select updated_at from public.daily_reports where id = $1',
      [reportId],
    );

    await sql(
      "update public.daily_reports set planned_route = 'Tuyến đã sửa', updated_at = '2000-01-01T00:00:00Z' where id = $1",
      [reportId],
    );

    const after = await sql<{ updated_at: Date }>(
      'select updated_at from public.daily_reports where id = $1',
      [reportId],
    );

    expect(after.rows[0]!.updated_at.getUTCFullYear()).not.toBe(2000);
    expect(after.rows[0]!.updated_at.getTime()).toBeGreaterThanOrEqual(
      before.rows[0]!.updated_at.getTime(),
    );
  });
});
