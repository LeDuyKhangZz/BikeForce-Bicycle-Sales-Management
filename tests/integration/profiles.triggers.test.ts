import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

import { closePool, createTestUser, deleteTestUser, signIn, sql } from './setup';

/**
 * TẦNG 2 — trigger `guard_profile_self_update()`.
 *
 * Đây là hàng rào chống LEO THANG ĐẶC QUYỀN. RLS `profiles_update_self` CHO PHÉP
 * Sales update dòng của chính mình, và RLS **không phân biệt cột** — nên nếu bỏ
 * trigger này thì `update profiles set role='ADMIN' where id = auth.uid()` sẽ
 * chạy lọt (`docs/06 §6.2`, kịch bản 5 của §10).
 *
 * Vì vậy test này BẮT BUỘC chạy bằng JWT của chính user: trigger cố ý bỏ qua
 * khi `auth.uid()` là null (đường của migration và của Admin).
 */

const EMAIL = 'it.profile-self@bikeforce.test';
let userId = '';
let userClient: SupabaseClient<Database>;

async function readProfile() {
  const { rows } = await sql<{ role: string; is_active: boolean; email: string; phone: string | null }>(
    'select role, is_active, email, phone from public.profiles where id = $1',
    [userId],
  );
  return rows[0]!;
}

beforeAll(async () => {
  userId = (await createTestUser({ email: EMAIL, fullName: 'Profile Guard User' })).id;
  userClient = await signIn(EMAIL);
});

afterAll(async () => {
  await deleteTestUser(EMAIL);
  await closePool();
});

describe('guard_profile_self_update()', () => {
  it('chặn Sales tự nâng quyền lên ADMIN', async () => {
    const { error } = await userClient.from('profiles').update({ role: 'ADMIN' }).eq('id', userId);

    expect(error).not.toBeNull();
    expect(error?.message).toContain('role/is_active/email');
    expect((await readProfile()).role).toBe('SALES');
  });

  it('BR-009 — chặn Sales tự đổi is_active', async () => {
    const { error } = await userClient
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId);

    expect(error?.message).toContain('role/is_active/email');
    expect((await readProfile()).is_active).toBe(true);
  });

  it('BR-025 — chặn Sales tự đổi email', async () => {
    const { error } = await userClient
      .from('profiles')
      .update({ email: 'someone.else@bikeforce.test' })
      .eq('id', userId);

    expect(error?.message).toContain('role/is_active/email');
    expect((await readProfile()).email).toBe(EMAIL);
  });

  it('vẫn cho Sales sửa cột không nhạy cảm của chính mình', async () => {
    const { error } = await userClient
      .from('profiles')
      .update({ phone: '0912345678' })
      .eq('id', userId);

    expect(error).toBeNull();
    expect((await readProfile()).phone).toBe('0912345678');
  });

  it('CHECK ck_profiles_phone_format chặn số điện thoại sai định dạng', async () => {
    const { error } = await userClient
      .from('profiles')
      .update({ phone: 'abc-123' })
      .eq('id', userId);

    expect(error?.code).toBe('23514');
  });

  it('migration/Admin (auth.uid() = null) được bỏ qua — đây là đường nâng quyền hợp lệ', async () => {
    await sql("update public.profiles set role = 'ADMIN' where id = $1", [userId]);
    expect((await readProfile()).role).toBe('ADMIN');

    await sql("update public.profiles set role = 'SALES' where id = $1", [userId]);
  });
});
