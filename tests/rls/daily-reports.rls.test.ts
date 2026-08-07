import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closePool, insertMorningReport, morningPayload, sql } from '../integration/setup';
import { clearReportsOf, setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

/**
 * TẦNG 3 — policy trên `public.daily_reports`.
 * Điều kiện BẮT BUỘC để đóng Phase 2 (AGENTS.md §11) và là bài kiểm tra thật sự
 * của mô hình bảo mật (DEC-004).
 */

let fx: RlsFixture;

beforeAll(async () => {
  fx = await setUpRlsFixture();
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

describe('reports_select_own_or_admin', () => {
  it('BR-003 — salesA đọc báo cáo của salesB bằng id trực tiếp → 0 rows, KHÔNG phải lỗi quyền', async () => {
    const { data, error } = await fx.clients.salesA
      .from('daily_reports')
      .select('id')
      .eq('id', fx.reports.salesB);

    // 0 rows chứ không phải 403: không xác nhận cả sự tồn tại của bản ghi.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('BR-003 — quét toàn bảng bằng JWT của salesA chỉ trả về dòng của chính salesA', async () => {
    // Kịch bản 4 của docs/06 §10: gọi thẳng PostgREST, bỏ qua toàn bộ middleware
    // và Server Action. Chỉ RLS còn đứng đó.
    const { data, error } = await fx.clients.salesA.from('daily_reports').select('id, sales_id');

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((row) => row.sales_id === fx.ids.salesA)).toBe(true);
  });

  it('salesA đọc được báo cáo của chính mình', async () => {
    const { data } = await fx.clients.salesA
      .from('daily_reports')
      .select('id')
      .eq('id', fx.reports.salesA)
      .maybeSingle();

    expect(data?.id).toBe(fx.reports.salesA);
  });

  it('BR-022 — Admin đọc được báo cáo của mọi Sales', async () => {
    const { data, error } = await fx.clients.admin
      .from('daily_reports')
      .select('id, sales_id')
      .in('id', [fx.reports.salesA, fx.reports.salesB]);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
  });
});

describe('reports_insert_own_today', () => {
  it('BR-003 — salesA insert với sales_id của salesB → bị từ chối 42501', async () => {
    const { error } = await fx.clients.salesA
      .from('daily_reports')
      .insert(morningPayload(fx.ids.salesB, fx.today));

    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('BR-021 — không nhập bù ngày cũ, kể cả cho chính mình', async () => {
    const { rows } = await sql<{ d: string }>(
      "select to_char(public.vn_today() - 1, 'YYYY-MM-DD') as d",
    );

    const { error } = await fx.clients.salesA
      .from('daily_reports')
      .insert(morningPayload(fx.ids.salesA, rows[0]!.d));

    expect(error?.code).toBe('42501');
  });

  it('BR-008 — không tạo thẳng bản ghi COMPLETED, bỏ qua vòng đời', async () => {
    await clearReportsOf(fx.ids.salesA);

    const { error } = await fx.clients.salesA.from('daily_reports').insert({
      ...morningPayload(fx.ids.salesA, fx.today),
      status: 'COMPLETED',
      actual_visit_points: 1,
      actual_sales_quantity: 1,
      actual_revenue: 1,
      actual_customer_visits: 1,
      evening_submitted_at: new Date().toISOString(),
    });

    expect(error?.code).toBe('42501');

    fx.reports.salesA = await insertMorningReport(fx.ids.salesA, fx.today);
  });

  it('BR-009 — tài khoản đã bị vô hiệu hoá không ghi được, dù JWT cũ còn hạn', async () => {
    const { error } = await fx.clients.inactive
      .from('daily_reports')
      .insert(morningPayload(fx.ids.inactive, fx.today));

    expect(error?.code).toBe('42501');
  });

  it('BR-020 — Admin KHÔNG tạo được báo cáo (is_active_sales() = false)', async () => {
    const { error } = await fx.clients.admin
      .from('daily_reports')
      .insert(morningPayload(fx.ids.admin, fx.today));

    expect(error?.code).toBe('42501');
  });

  it('Sales tạo được báo cáo của chính mình cho đúng hôm nay', async () => {
    await clearReportsOf(fx.ids.salesA);

    const { data, error } = await fx.clients.salesA
      .from('daily_reports')
      .insert(morningPayload(fx.ids.salesA, fx.today))
      .select('id, status')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('MORNING_SUBMITTED');
    fx.reports.salesA = data!.id;
  });
});

describe('reports_update_own_open', () => {
  it('BR-003 — salesA update báo cáo của salesB → 0 rows affected, không lỗi', async () => {
    const { data, error } = await fx.clients.salesA
      .from('daily_reports')
      .update({ planned_route: 'Tuyến bị chiếm quyền' })
      .eq('id', fx.reports.salesB)
      .select('id');

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { rows } = await sql<{ planned_route: string }>(
      'select planned_route from public.daily_reports where id = $1',
      [fx.reports.salesB],
    );
    expect(rows[0]?.planned_route).not.toBe('Tuyến bị chiếm quyền');
  });

  it('BR-020 — Admin KHÔNG sửa được báo cáo của Sales (không có policy UPDATE nào cho Admin)', async () => {
    const { data, error } = await fx.clients.admin
      .from('daily_reports')
      .update({ planned_route: 'Admin sửa' })
      .eq('id', fx.reports.salesB)
      .select('id');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('FR-012 — Sales sửa được cam kết sáng khi còn MORNING_SUBMITTED', async () => {
    const { data, error } = await fx.clients.salesA
      .from('daily_reports')
      .update({ planned_route: 'Tuyến đã điều chỉnh' })
      .eq('id', fx.reports.salesA)
      .select('planned_route');

    expect(error).toBeNull();
    expect(data?.[0]?.planned_route).toBe('Tuyến đã điều chỉnh');
  });

  it('BR-019 — hoàn tất được ĐÚNG MỘT lần, sau đó báo cáo TỰ KHOÁ vĩnh viễn', async () => {
    const complete = await fx.clients.salesA
      .from('daily_reports')
      .update({
        status: 'COMPLETED',
        actual_visit_points: 4,
        actual_sales_quantity: 6,
        actual_revenue: 120_000_000,
        actual_customer_visits: 9,
        evening_submitted_at: new Date().toISOString(),
      })
      .eq('id', fx.reports.salesA)
      .select('status');

    expect(complete.error).toBeNull();
    expect(complete.data?.[0]?.status).toBe('COMPLETED');

    // Lần thứ hai: USING đánh giá trên dòng CŨ (status = 'COMPLETED') nên không
    // policy nào khớp ⇒ 0 rows affected, KHÔNG phải lỗi.
    const second = await fx.clients.salesA
      .from('daily_reports')
      .update({ actual_revenue: 999_000_000 })
      .eq('id', fx.reports.salesA)
      .select('id');

    expect(second.error).toBeNull();
    expect(second.data).toEqual([]);

    const { rows } = await sql<{ actual_revenue: string }>(
      'select actual_revenue from public.daily_reports where id = $1',
      [fx.reports.salesA],
    );
    // pg trả bigint dưới dạng chuỗi để không mất chính xác — so sánh theo chuỗi.
    expect(rows[0]?.actual_revenue).toBe('120000000');
  });
});

describe('DELETE — BR-013', () => {
  it('salesA không xoá được báo cáo của chính mình', async () => {
    const { error } = await fx.clients.salesA
      .from('daily_reports')
      .delete()
      .eq('id', fx.reports.salesA);

    // Không có policy DELETE **và** không GRANT DELETE cho `authenticated`.
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('Admin cũng không xoá được', async () => {
    const { error } = await fx.clients.admin
      .from('daily_reports')
      .delete()
      .eq('id', fx.reports.salesB);

    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });
});
