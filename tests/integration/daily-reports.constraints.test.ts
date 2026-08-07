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

/**
 * TẦNG 2 — ràng buộc toàn vẹn của `public.daily_reports`.
 * Điều kiện đóng Phase 2 theo AGENTS.md §11.
 */

const EMAIL_A = 'it.sales-a@bikeforce.test';
const EMAIL_B = 'it.sales-b@bikeforce.test';

let salesA = '';
let salesB = '';
let today = '';

beforeAll(async () => {
  salesA = (await createTestUser({ email: EMAIL_A, fullName: 'Integration Sales A' })).id;
  salesB = (await createTestUser({ email: EMAIL_B, fullName: 'Integration Sales B' })).id;
  today = await vnToday();
});

afterAll(async () => {
  await deleteTestUser(EMAIL_A);
  await deleteTestUser(EMAIL_B);
  await closePool();
});

beforeEach(async () => {
  await sql('delete from public.daily_reports where sales_id = any($1::uuid[])', [[salesA, salesB]]);
});

describe('handle_new_user()', () => {
  it('sinh được profiles dưới FORCE RLS và không có INSERT policy nào', async () => {
    // Chính là kiểm chứng CẢNH BÁO 2 của docs/02 §11.
    const { rows } = await sql<{
      full_name: string;
      email: string;
      role: string;
      is_active: boolean;
    }>('select full_name, email, role, is_active from public.profiles where id = $1', [salesA]);

    expect(rows[0]?.full_name).toBe('Integration Sales A');
    expect(rows[0]?.email).toBe(EMAIL_A);
    // role KHÔNG lấy từ user_metadata — mọi tài khoản mới đều là SALES (BR-012).
    expect(rows[0]?.role).toBe('SALES');
    expect(rows[0]?.is_active).toBe(true);
  });

  it('BR-012 — từ chối tạo user thiếu full_name trong metadata', async () => {
    const error = await expectSqlError(
      `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
               'authenticated', 'no.name@bikeforce.test', 'x', now(), now())`,
    );
    expect(error.message).toContain('full_name');
  });
});

describe('vòng đời báo cáo', () => {
  it('persist cam kết sáng rồi hoàn tất cuối ngày — FR-008 → FR-015', async () => {
    const id = await insertMorningReport(salesA, today);

    const before = await sql<{ status: string; morning_submitted_at: string; evening_submitted_at: string | null }>(
      'select status, morning_submitted_at, evening_submitted_at from public.daily_reports where id = $1',
      [id],
    );
    expect(before.rows[0]?.status).toBe('MORNING_SUBMITTED');
    expect(before.rows[0]?.evening_submitted_at).toBeNull();

    await sql(
      `update public.daily_reports
          set status = 'COMPLETED', actual_route = $2, actual_visit_points = 4,
              actual_sales_quantity = 6, actual_revenue = 120000000,
              actual_customer_visits = 9, evening_note = $3, evening_submitted_at = now()
        where id = $1`,
      [id, 'Quận 1 → Quận 3 → Quận 5', 'Chốt thêm một đơn.'],
    );

    const after = await sql<{ status: string; morning_submitted_at: string; evening_submitted_at: string | null }>(
      'select status, morning_submitted_at, evening_submitted_at from public.daily_reports where id = $1',
      [id],
    );
    expect(after.rows[0]?.status).toBe('COMPLETED');
    expect(after.rows[0]?.evening_submitted_at).not.toBeNull();
    // Dấu thời gian buổi sáng KHÔNG được đổi khi hoàn tất cuối ngày.
    expect(after.rows[0]?.morning_submitted_at).toEqual(before.rows[0]?.morning_submitted_at);
  });
});

describe('UNIQUE (sales_id, report_date) — BR-001', () => {
  it('báo cáo thứ hai cùng cặp bị chặn bằng 23505', async () => {
    await insertMorningReport(salesA, today);

    const error = await expectSqlError(
      `insert into public.daily_reports
         (sales_id, report_date, planned_route, target_visit_points,
          target_sales_quantity, target_revenue, target_customer_visits)
       values ($1, $2, 'Tuyến trùng', 1, 1, 1, 1)`,
      [salesA, today],
    );

    expect(error.code).toBe('23505');
    expect(error.constraint).toBe('uq_daily_reports_sales_date');
  });

  it('cùng ngày nhưng KHÁC sales_id thì hợp lệ', async () => {
    await insertMorningReport(salesA, today);
    await expect(insertMorningReport(salesB, today)).resolves.toBeTypeOf('string');
  });

  it('cùng sales_id nhưng KHÁC report_date thì hợp lệ', async () => {
    await insertMorningReport(salesA, today);
    const { rows } = await sql<{ d: string }>(
      "select to_char(public.vn_today() - 1, 'YYYY-MM-DD') as d",
    );
    await expect(insertMorningReport(salesA, rows[0]!.d)).resolves.toBeTypeOf('string');
  });
});

describe('CHECK constraints', () => {
  it('BR-007 / BR-008 — COMPLETED mà thiếu actual bị ck_completed_requires_actuals chặn', async () => {
    const id = await insertMorningReport(salesA, today);

    const error = await expectSqlError(
      `update public.daily_reports
          set status = 'COMPLETED', actual_visit_points = 4, actual_sales_quantity = 6,
              evening_submitted_at = now()
        where id = $1`,
      [id],
    );

    expect(error.code).toBe('23514');
    expect(error.constraint).toBe('ck_completed_requires_actuals');
  });

  it('BR-008 — MORNING_SUBMITTED không được mang evening_submitted_at', async () => {
    const error = await expectSqlError(
      `insert into public.daily_reports
         (sales_id, report_date, planned_route, target_visit_points, target_sales_quantity,
          target_revenue, target_customer_visits, evening_submitted_at)
       values ($1, $2, 'Tuyến', 1, 1, 1, 1, now())`,
      [salesA, today],
    );

    expect(error.code).toBe('23514');
    expect(error.constraint).toBe('ck_morning_has_no_evening_ts');
  });

  it('BR-016 — ck_report_not_future chặn báo cáo cho ngày mai', async () => {
    const error = await expectSqlError(
      `insert into public.daily_reports
         (sales_id, report_date, planned_route, target_visit_points, target_sales_quantity,
          target_revenue, target_customer_visits)
       values ($1, public.vn_today() + 1, 'Tuyến tương lai', 1, 1, 1, 1)`,
      [salesA],
    );

    expect(error.code).toBe('23514');
    expect(error.constraint).toBe('ck_report_not_future');
  });

  it('BR-006 — số âm bị chặn', async () => {
    const error = await expectSqlError(
      `insert into public.daily_reports
         (sales_id, report_date, planned_route, target_visit_points, target_sales_quantity,
          target_revenue, target_customer_visits)
       values ($1, $2, 'Tuyến', 1, -1, 1, 1)`,
      [salesA, today],
    );

    expect(error.code).toBe('23514');
    expect(error.constraint).toBe('ck_target_sales_quantity');
  });

  it('BR-017 — doanh thu vượt trần 100 tỷ bị chặn, đúng trần thì hợp lệ (biên inclusive)', async () => {
    const error = await expectSqlError(
      `insert into public.daily_reports
         (sales_id, report_date, planned_route, target_visit_points, target_sales_quantity,
          target_revenue, target_customer_visits)
       values ($1, $2, 'Tuyến', 1, 1, 100000000001, 1)`,
      [salesA, today],
    );
    expect(error.constraint).toBe('ck_target_revenue');

    await expect(
      insertMorningReport(salesA, today, { target_revenue: 100_000_000_000 }),
    ).resolves.toBeTypeOf('string');
  });

  it('BR-018 — evening_note 1001 ký tự bị chặn; 1000 ký tự CÓ DẤU thì hợp lệ', async () => {
    const id = await insertMorningReport(salesA, today);

    const error = await expectSqlError(
      `update public.daily_reports
          set status = 'COMPLETED', actual_visit_points = 1, actual_sales_quantity = 1,
              actual_revenue = 1, actual_customer_visits = 1,
              evening_note = repeat('a', 1001), evening_submitted_at = now()
        where id = $1`,
      [id],
    );
    expect(error.constraint).toBe('ck_evening_note_len');

    // Đo theo KÝ TỰ chứ không theo byte — 'ừ' chiếm 3 byte UTF-8.
    await sql(
      `update public.daily_reports
          set status = 'COMPLETED', actual_visit_points = 1, actual_sales_quantity = 1,
              actual_revenue = 1, actual_customer_visits = 1,
              evening_note = repeat('ừ', 1000), evening_submitted_at = now()
        where id = $1`,
      [id],
    );

    const { rows } = await sql<{ len: number }>(
      'select char_length(evening_note) as len from public.daily_reports where id = $1',
      [id],
    );
    expect(rows[0]?.len).toBe(1000);
  });

  it('BR-018 — planned_route chỉ có khoảng trắng bị chặn (CHECK dùng btrim)', async () => {
    const error = await expectSqlError(
      `insert into public.daily_reports
         (sales_id, report_date, planned_route, target_visit_points, target_sales_quantity,
          target_revenue, target_customer_visits)
       values ($1, $2, '   ', 1, 1, 1, 1)`,
      [salesA, today],
    );
    expect(error.constraint).toBe('ck_planned_route_len');
  });
});

describe('Khoá ngoại — BR-013', () => {
  it('không xoá được profiles còn báo cáo (ON DELETE RESTRICT)', async () => {
    await insertMorningReport(salesA, today);

    const error = await expectSqlError('delete from public.profiles where id = $1', [salesA]);
    expect(error.code).toBe('23503');
  });

  it('xoá auth.users cũng bị chặn theo dây chuyền CASCADE → RESTRICT', async () => {
    await insertMorningReport(salesA, today);

    const error = await expectSqlError('delete from auth.users where id = $1', [salesA]);
    expect(error.code).toBe('23503');
  });

  it('sales_id không tồn tại bị chặn bằng 23503', async () => {
    const error = await expectSqlError(
      `insert into public.daily_reports
         (sales_id, report_date, planned_route, target_visit_points, target_sales_quantity,
          target_revenue, target_customer_visits)
       values (gen_random_uuid(), $1, 'Tuyến', 1, 1, 1, 1)`,
      [today],
    );
    expect(error.code).toBe('23503');
  });
});
