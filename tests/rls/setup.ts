import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

import {
  ANON_KEY,
  SUPABASE_URL,
  createTestUser,
  deleteTestUser,
  insertMorningReport,
  setActive,
  setRole,
  signIn,
  sql,
  vnToday,
} from '../integration/setup';

/**
 * Hạ tầng của TẦNG 3 — RLS / SECURITY (`docs/08 §2.2`).
 *
 * Nguyên tắc sống còn: mọi client ở tầng này dùng **anon key + JWT THẬT** của
 * từng user, gọi thẳng vào PostgREST, **bỏ qua hoàn toàn UI, middleware và
 * Server Action**. Đây chính là kịch bản 4 của `docs/06 §10`: kẻ tấn công mở
 * DevTools và tự tạo `createClient`. Nếu chỉ test qua UI thì mọi thứ đều "xanh"
 * kể cả khi KHÔNG có RLS.
 */

export const RLS_EMAILS = {
  salesA: 'rls.sales-a@bikeforce.test',
  salesB: 'rls.sales-b@bikeforce.test',
  admin: 'rls.admin@bikeforce.test',
  inactive: 'rls.inactive@bikeforce.test',
} as const;

export type RlsFixture = {
  today: string;
  ids: Record<keyof typeof RLS_EMAILS, string>;
  clients: Record<keyof typeof RLS_EMAILS, SupabaseClient<Database>>;
  /** Client anon KHÔNG đăng nhập — dùng để chứng minh deny-by-default. */
  anon: SupabaseClient<Database>;
  reports: { salesA: string; salesB: string };
};

export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function setUpRlsFixture(): Promise<RlsFixture> {
  const today = await vnToday();

  const salesA = await createTestUser({
    email: RLS_EMAILS.salesA,
    fullName: 'RLS Sales A',
    employeeCode: 'RLS-A',
  });
  const salesB = await createTestUser({
    email: RLS_EMAILS.salesB,
    fullName: 'RLS Sales B',
    employeeCode: 'RLS-B',
  });
  const admin = await createTestUser({ email: RLS_EMAILS.admin, fullName: 'RLS Admin' });
  const inactive = await createTestUser({ email: RLS_EMAILS.inactive, fullName: 'RLS Inactive' });

  await setRole(admin.id, 'ADMIN');

  // Đăng nhập TRƯỚC khi vô hiệu hoá — mô phỏng đúng kịch bản 6 của docs/06 §10:
  // người dùng đang cầm một access token còn hạn thì bị Admin tắt tài khoản.
  const clients = {
    salesA: await signIn(RLS_EMAILS.salesA),
    salesB: await signIn(RLS_EMAILS.salesB),
    admin: await signIn(RLS_EMAILS.admin),
    inactive: await signIn(RLS_EMAILS.inactive),
  };

  await setActive(inactive.id, false);

  // Fixture báo cáo dựng bằng SQL trực tiếp (kênh chỉ có ở local) để bài test đo
  // đúng cái cần đo: quyền ĐỌC/GHI của từng user, không phải quyền tạo fixture.
  const reports = {
    salesA: await insertMorningReport(salesA.id, today),
    salesB: await insertMorningReport(salesB.id, today),
  };

  return {
    today,
    ids: { salesA: salesA.id, salesB: salesB.id, admin: admin.id, inactive: inactive.id },
    clients,
    anon: anonClient(),
    reports,
  };
}

export async function tearDownRlsFixture(): Promise<void> {
  for (const email of Object.values(RLS_EMAILS)) {
    await deleteTestUser(email);
  }
}

/** Xoá sạch báo cáo của một user — chỉ dùng để dựng lại fixture giữa các test. */
export async function clearReportsOf(salesId: string): Promise<void> {
  await sql('delete from public.daily_reports where sales_id = $1', [salesId]);
}
