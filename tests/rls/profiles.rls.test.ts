import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closePool } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

/** TẦNG 3 — policy trên `public.profiles`. */

let fx: RlsFixture;

beforeAll(async () => {
  fx = await setUpRlsFixture();
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

describe('profiles_select_self_or_admin', () => {
  it('Sales chỉ thấy hồ sơ của CHÍNH MÌNH khi quét toàn bảng', async () => {
    const { data, error } = await fx.clients.salesA.from('profiles').select('id, email');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(fx.ids.salesA);
  });

  it('Sales không đọc được hồ sơ đồng nghiệp dù biết chính xác id', async () => {
    const { data, error } = await fx.clients.salesA
      .from('profiles')
      .select('id, email, phone, employee_code')
      .eq('id', fx.ids.salesB);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('Admin đọc được hồ sơ của mọi người (cần cho UC-13, UC-16, UC-18)', async () => {
    const { data, error } = await fx.clients.admin
      .from('profiles')
      .select('id')
      .in('id', [fx.ids.salesA, fx.ids.salesB, fx.ids.admin]);

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
  });
});

describe('INSERT — BR-012, FR-006', () => {
  it('không ai tự tạo được hồ sơ (không có INSERT policy, không GRANT INSERT)', async () => {
    const { error } = await fx.clients.salesA.from('profiles').insert({
      id: crypto.randomUUID(),
      full_name: 'Hồ sơ tự tạo',
      email: 'self.made@bikeforce.test',
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('kể cả Admin cũng không INSERT thẳng vào profiles — phải qua auth.admin.createUser', async () => {
    const { error } = await fx.clients.admin.from('profiles').insert({
      id: crypto.randomUUID(),
      full_name: 'Admin tạo tay',
      email: 'admin.made@bikeforce.test',
    });

    expect(error?.code).toBe('42501');
  });
});

describe('DELETE — BR-013', () => {
  it('không ai xoá được hồ sơ qua API', async () => {
    const { error } = await fx.clients.admin.from('profiles').delete().eq('id', fx.ids.salesA);

    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });
});

describe('BR-009 — giới hạn ĐÃ BIẾT của tài khoản bị vô hiệu hoá', () => {
  it('vẫn ĐỌC được hồ sơ của chính mình cho tới khi access token hết hạn', async () => {
    // Đây KHÔNG phải lỗi mà là đánh đổi có ý thức, ghi rõ ở docs/06 §8.2:
    // policy SELECT cố ý không kiểm `is_active` để giữ policy đọc đơn giản.
    // Cái bị chặn tức thì là GHI (qua is_active_sales) và TRUY CẬP UI (middleware).
    const { data, error } = await fx.clients.inactive
      .from('profiles')
      .select('id, is_active')
      .eq('id', fx.ids.inactive)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.is_active).toBe(false);
  });
});

/**
 * PHASE 14 — DEC-063: Admin sửa hồ sơ của CHÍNH MÌNH.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ĐỌC KỸ: LUẬT "CHỈ ADMIN" **KHÔNG** NẰM Ở TẦNG NÀY
 * ─────────────────────────────────────────────────────────────────────────
 *  `profiles_update_self` có từ Phase 2 và cho **mọi vai** sửa dòng của chính
 *  mình. Nó không phân biệt ADMIN với SALES, và nhóm test dưới đây chứng minh
 *  đúng điều đó thay vì giả vờ ngược lại.
 *
 *  Luật nghiệp vụ "Sales không tự sửa hồ sơ" vì vậy được ép ở **Server Action**
 *  `updateOwnProfileAction` (kiểm `profile.role !== 'ADMIN'`). Ai định bỏ dòng
 *  kiểm đó với lý do "RLS lo rồi" thì đọc lại bài test cuối nhóm này.
 *
 *  Cái RLS + trigger THẬT SỰ chặn là nhóm cột nhạy cảm — role, is_active,
 *  email — và nhóm đó đã có bài riêng ở `tests/integration/profiles.triggers.test.ts`.
 */
describe('profiles_update_self — DEC-063', () => {
  it('Admin sửa được họ tên, SĐT và mã NV của chính mình', async () => {
    const { data, error } = await fx.clients.admin
      .from('profiles')
      .update({
        full_name: 'Quản trị viên Đã Đổi Tên',
        phone: '0901234567',
        employee_code: 'ADM-001',
      })
      .eq('id', fx.ids.admin)
      .select('full_name, phone, employee_code')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toEqual({
      full_name: 'Quản trị viên Đã Đổi Tên',
      phone: '0901234567',
      employee_code: 'ADM-001',
    });
  });

  it('Admin KHÔNG sửa được hồ sơ của một Admin khác qua đường tự-sửa', async () => {
    // `profiles_update_self` khoá theo `id = auth.uid()`. Sửa người khác phải đi
    // qua `profiles_update_admin`, và UC-18 còn lọc thêm `role = 'SALES'`.
    const { data, error } = await fx.clients.salesA
      .from('profiles')
      .update({ full_name: 'Đổi tên người khác' })
      .eq('id', fx.ids.salesB)
      .select('id')
      .maybeSingle();

    expect(error).toBeNull();
    // 0 dòng khớp: RLS lọc hết trước khi UPDATE chạm tới dòng nào.
    expect(data).toBeNull();
  });

  it('mã nhân viên trùng bị `uq_profiles_employee_code` chặn (23505)', async () => {
    await fx.clients.salesA
      .from('profiles')
      .update({ employee_code: 'TRUNG-MA' })
      .eq('id', fx.ids.salesA);

    const { error } = await fx.clients.admin
      .from('profiles')
      .update({ employee_code: 'TRUNG-MA' })
      .eq('id', fx.ids.admin);

    expect(error?.code).toBe('23505');
  });

  it('⚠ TẦNG DATABASE VẪN CHO Sales tự sửa họ tên — nên luật chỉ-Admin phải ở Server Action', async () => {
    const { data, error } = await fx.clients.salesA
      .from('profiles')
      .update({ full_name: 'Sales Tự Đổi Tên' })
      .eq('id', fx.ids.salesA)
      .select('full_name')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.full_name).toBe('Sales Tự Đổi Tên');
  });
});
