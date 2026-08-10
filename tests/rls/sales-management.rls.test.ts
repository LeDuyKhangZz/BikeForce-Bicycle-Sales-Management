import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  getSalesProfileById,
  setSalesActive,
  updateSalesProfile,
} from '@/services/profiles';

import { closePool, sql } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

/**
 * TẦNG 3 — `getSalesProfileById()`, `updateSalesProfile()`, `setSalesActive()`
 * dưới JWT THẬT.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO BỘ NÀY LÀ QUAN TRỌNG NHẤT CỦA PHASE 10
 * ─────────────────────────────────────────────────────────────────────────
 *  Ba hàm này GHI vào `profiles` — bảng chứa `role` và `is_active`, tức là
 *  chứa chính định nghĩa "ai được làm gì". Một policy sai ở đây không làm rò
 *  dữ liệu, nó cho phép **tự nâng quyền**: một Sales sửa `role` của mình thành
 *  `ADMIN` là đọc được toàn bộ báo cáo của đội một cách hợp lệ.
 *
 *  Hai chốt chặn phải cùng đúng, và bộ này đo cả hai:
 *    1. policy `profiles_update_admin` / `profiles_update_self`;
 *    2. trigger `guard_profile_self_update()` — chặn non-admin đổi `role`,
 *       `is_active`, `email`, `id` **kể cả khi** policy cho phép UPDATE.
 *
 *  Cả ba hàm cố ý dùng client **anon chịu RLS**, KHÔNG dùng service role
 *  (DEC-005). Nếu ai đó "sửa cho tiện" bằng admin client, những bài dưới đây
 *  vẫn xanh — nhưng bài `service_role không có DML` ở
 *  `tests/integration/` sẽ đỏ (DEC-031). Hai tầng bổ trợ nhau.
 */

let fx: RlsFixture;

beforeAll(async () => {
  fx = await setUpRlsFixture();
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

/** Đọc trạng thái THẬT của một hồ sơ, bỏ qua RLS — để kiểm chứng độc lập. */
async function readProfile(
  id: string,
): Promise<{ full_name: string; role: string; is_active: boolean; employee_code: string | null }> {
  const result = await sql<{
    full_name: string;
    role: string;
    is_active: boolean;
    employee_code: string | null;
  }>('select full_name, role::text as role, is_active, employee_code from public.profiles where id = $1', [
    id,
  ]);

  const row = result.rows[0];
  if (!row) throw new Error(`Không tìm thấy hồ sơ ${id}`);
  return row;
}

describe('getSalesProfileById — UC-18, FR-031', () => {
  it('Admin đọc được hồ sơ của một Sales bất kỳ', async () => {
    const profile = await getSalesProfileById(fx.clients.admin, fx.ids.salesA);

    expect(profile).not.toBeNull();
    expect(profile?.full_name).toBe('RLS Sales A');
    expect(profile?.role).toBe('SALES');
  });

  it('BR-003 — salesA KHÔNG đọc được hồ sơ của salesB', async () => {
    expect(await getSalesProfileById(fx.clients.salesA, fx.ids.salesB)).toBeNull();
  });

  it('Sales vẫn đọc được hồ sơ của CHÍNH MÌNH', async () => {
    const profile = await getSalesProfileById(fx.clients.salesA, fx.ids.salesA);
    expect(profile?.id).toBe(fx.ids.salesA);
  });

  it('hỏi id của một ADMIN → null (hàm chỉ phục vụ hồ sơ Sales)', async () => {
    expect(await getSalesProfileById(fx.clients.admin, fx.ids.admin)).toBeNull();
  });

  it('id không tồn tại → null, KHÔNG phân biệt với "không có quyền"', async () => {
    expect(
      await getSalesProfileById(fx.clients.salesA, '00000000-0000-4000-8000-000000000000'),
    ).toBeNull();
  });

  it('anon → null, deny-by-default (NFR-004)', async () => {
    expect(await getSalesProfileById(fx.anon, fx.ids.salesA)).toBeNull();
  });
});

describe('updateSalesProfile — UC-18, FR-031', () => {
  it('Admin sửa được họ tên, phone và mã nhân viên', async () => {
    const result = await updateSalesProfile(fx.clients.admin, fx.ids.salesA, {
      full_name: 'RLS Sales A Đã Sửa',
      phone: '0900 111 222',
      employee_code: 'RLS-A2',
    });

    expect(result.ok).toBe(true);

    const after = await readProfile(fx.ids.salesA);
    expect(after.full_name).toBe('RLS Sales A Đã Sửa');
    expect(after.employee_code).toBe('RLS-A2');
    // Hai cột nhạy cảm KHÔNG nằm trong payload nên phải giữ nguyên.
    expect(after.role).toBe('SALES');
    expect(after.is_active).toBe(true);
  });

  /** ⚠ Bài quan trọng nhất: một Sales không được sửa hồ sơ người khác. */
  it('BR-003 — salesA KHÔNG sửa được hồ sơ của salesB', async () => {
    const before = await readProfile(fx.ids.salesB);

    const result = await updateSalesProfile(fx.clients.salesA, fx.ids.salesB, {
      full_name: 'Bị chiếm quyền',
      phone: null,
      employee_code: null,
    });

    expect(result.ok).toBe(false);

    const after = await readProfile(fx.ids.salesB);
    expect(after.full_name).toBe(before.full_name);
  });

  it('mã nhân viên trùng → DUPLICATE_CODE, không phải lỗi chung', async () => {
    const result = await updateSalesProfile(fx.clients.admin, fx.ids.salesA, {
      full_name: 'RLS Sales A Đã Sửa',
      phone: null,
      // `RLS-B` đang thuộc về salesB ⇒ vi phạm `uq_profiles_employee_code`.
      employee_code: 'RLS-B',
    });

    expect(result).toEqual({ ok: false, error: 'DUPLICATE_CODE' });
  });

  it('id không tồn tại → NOT_FOUND', async () => {
    const result = await updateSalesProfile(
      fx.clients.admin,
      '00000000-0000-4000-8000-000000000000',
      { full_name: 'Không ai', phone: null, employee_code: null },
    );

    expect(result).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('anon không sửa được gì', async () => {
    const before = await readProfile(fx.ids.salesA);

    const result = await updateSalesProfile(fx.anon, fx.ids.salesA, {
      full_name: 'anon ghi đè',
      phone: null,
      employee_code: null,
    });

    expect(result.ok).toBe(false);
    expect((await readProfile(fx.ids.salesA)).full_name).toBe(before.full_name);
  });
});

describe('setSalesActive — UC-19, FR-032, BR-009', () => {
  it('Admin vô hiệu hoá rồi mở lại được một Sales', async () => {
    expect(await setSalesActive(fx.clients.admin, fx.ids.salesB, false)).toEqual({ ok: true });
    expect((await readProfile(fx.ids.salesB)).is_active).toBe(false);

    expect(await setSalesActive(fx.clients.admin, fx.ids.salesB, true)).toEqual({ ok: true });
    expect((await readProfile(fx.ids.salesB)).is_active).toBe(true);
  });

  /**
   * ⚠ Bài chống TỰ NÂNG QUYỀN.
   *
   * Tài khoản đã bị vô hiệu hoá mà tự bật lại `is_active` là tự khôi phục quyền
   * truy cập — trigger `guard_profile_self_update()` phải chặn, kể cả khi
   * policy `profiles_update_self` cho phép UPDATE trên hồ sơ của chính mình.
   */
  it('BR-009 — tài khoản inactive KHÔNG tự bật lại `is_active` của mình', async () => {
    const result = await setSalesActive(fx.clients.inactive, fx.ids.inactive, true);

    expect(result.ok).toBe(false);
    expect((await readProfile(fx.ids.inactive)).is_active).toBe(false);
  });

  it('BR-003 — salesA KHÔNG vô hiệu hoá được salesB', async () => {
    const result = await setSalesActive(fx.clients.salesA, fx.ids.salesB, false);

    expect(result.ok).toBe(false);
    expect((await readProfile(fx.ids.salesB)).is_active).toBe(true);
  });

  it('Sales KHÔNG tự vô hiệu hoá chính mình qua đường này', async () => {
    const result = await setSalesActive(fx.clients.salesA, fx.ids.salesA, false);

    expect(result.ok).toBe(false);
    expect((await readProfile(fx.ids.salesA)).is_active).toBe(true);
  });

  it('không đụng được vào tài khoản ADMIN — hàm chỉ khớp role SALES', async () => {
    const result = await setSalesActive(fx.clients.admin, fx.ids.admin, false);

    expect(result).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect((await readProfile(fx.ids.admin)).is_active).toBe(true);
  });

  it('anon không đổi được gì', async () => {
    const result = await setSalesActive(fx.anon, fx.ids.salesA, false);

    expect(result.ok).toBe(false);
    expect((await readProfile(fx.ids.salesA)).is_active).toBe(true);
  });
});

describe('chống tự nâng quyền — trigger guard_profile_self_update()', () => {
  /**
   * Kịch bản 4 của `docs/06 §10`: kẻ tấn công mở DevTools và gọi thẳng
   * PostgREST. Không đi qua `services/`, không đi qua Server Action, không đi
   * qua một dòng TypeScript nào của dự án.
   */
  it('Sales gọi thẳng PostgREST để tự đặt role = ADMIN → bị chặn', async () => {
    const { error } = await fx.clients.salesA
      .from('profiles')
      .update({ role: 'ADMIN' })
      .eq('id', fx.ids.salesA);

    // Trigger ném lỗi, HOẶC policy khớp 0 dòng — cả hai đều chấp nhận được.
    // Điều KHÔNG chấp nhận được là `role` thật sự đổi.
    expect((await readProfile(fx.ids.salesA)).role).toBe('SALES');
    if (error === null) {
      // Không lỗi thì phải là "khớp 0 dòng", đã kiểm bằng câu đọc ở trên.
      expect(true).toBe(true);
    }
  });

  it('Sales gọi thẳng PostgREST để tự bật is_active → bị chặn', async () => {
    await fx.clients.inactive.from('profiles').update({ is_active: true }).eq('id', fx.ids.inactive);

    expect((await readProfile(fx.ids.inactive)).is_active).toBe(false);
  });

  it('Sales gọi thẳng PostgREST để đổi email của mình → bị chặn (BR-025)', async () => {
    const before = await sql<{ email: string }>(
      'select email::text as email from public.profiles where id = $1',
      [fx.ids.salesA],
    );

    await fx.clients.salesA
      .from('profiles')
      .update({ email: 'chiem-quyen@bikeforce.test' })
      .eq('id', fx.ids.salesA);

    const after = await sql<{ email: string }>(
      'select email::text as email from public.profiles where id = $1',
      [fx.ids.salesA],
    );

    expect(after.rows[0]?.email).toBe(before.rows[0]?.email);
  });
});
