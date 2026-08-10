import { describe, expect, it } from 'vitest';

import { anonClient } from './setup';

/**
 * TẦNG 3 — deny-by-default cho role `anon` (NFR-004).
 *
 * Mọi policy đều khai `to authenticated`, và GRANT cho `anon` đã bị thu hồi ở
 * `0001`/`0002`. Vì vậy anon key **một mình nó** không mở được cửa nào — đúng
 * tiền đề của `docs/06 §5.1`: anon key nằm trong bundle client là thiết kế
 * đúng, KHÔNG phải rò rỉ, vì RLS mới là thứ quyết định.
 */

describe('anon — không có JWT', () => {
  it('không đọc được daily_reports', async () => {
    const { data, error } = await anonClient().from('daily_reports').select('id');

    // Chấp nhận cả hai hình thức chặn: lỗi quyền (thiếu GRANT) hoặc 0 rows
    // (RLS lọc sạch). Điều KHÔNG được phép là trả về dữ liệu.
    expect(error ?? { code: 'none' }).toBeTruthy();
    expect(data ?? []).toEqual([]);
  });

  it('không đọc được profiles', async () => {
    const { data } = await anonClient().from('profiles').select('id');
    expect(data ?? []).toEqual([]);
  });

  it('không ghi được daily_reports', async () => {
    const { error } = await anonClient().from('daily_reports').insert({
      sales_id: crypto.randomUUID(),
      report_date: '2026-01-01',
      planned_route: 'Tuyến giả mạo',
      target_visit_points: 1,
      target_sales_amount: 1,
      target_revenue: 1,
      target_customer_visits: 1,
    });

    expect(error).not.toBeNull();
  });
});
