import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

import {
  closePool,
  createTestUser,
  deleteTestUser,
  setActive,
  setRole,
  signIn,
  sql,
} from './setup';

/** TẦNG 2 — `vn_today()`, `is_admin()`, `is_active_sales()` (BR-005, BR-009, DEC-006). */

const EMAIL_ADMIN = 'it.fn-admin@bikeforce.test';
const EMAIL_SALES = 'it.fn-sales@bikeforce.test';

let adminClient: SupabaseClient<Database>;
let salesClient: SupabaseClient<Database>;
let salesId = '';

beforeAll(async () => {
  const admin = await createTestUser({ email: EMAIL_ADMIN, fullName: 'Function Admin' });
  const sales = await createTestUser({ email: EMAIL_SALES, fullName: 'Function Sales' });
  salesId = sales.id;

  await setRole(admin.id, 'ADMIN');

  adminClient = await signIn(EMAIL_ADMIN);
  salesClient = await signIn(EMAIL_SALES);
});

afterAll(async () => {
  await deleteTestUser(EMAIL_ADMIN);
  await deleteTestUser(EMAIL_SALES);
  await closePool();
});

describe('vn_today()', () => {
  it('BR-005 — khớp chính xác với Intl.DateTimeFormat("en-CA", Asia/Ho_Chi_Minh)', async () => {
    const { rows } = await sql<{ d: string }>(
      "select to_char(public.vn_today(), 'YYYY-MM-DD') as d",
    );

    // DEC-009: đây đúng là công thức mà lib/date.ts sẽ dùng ở Phase 5.
    // Hai nguồn — Postgres và Node — phải luôn cho cùng một ngày.
    const expected = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());

    expect(rows[0]?.d).toBe(expected);
  });

  it('NFR-011 — lệch đúng một ngày so với UTC trong khoảng 17:00–23:59 UTC', async () => {
    // Không đổi đồng hồ hệ thống; kiểm bằng chính Postgres ở hai mốc cố định.
    const { rows } = await sql<{ before_cutoff: string; after_cutoff: string }>(`
      select
        to_char((timestamptz '2026-08-06 16:59:00+00' at time zone 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD') as before_cutoff,
        to_char((timestamptz '2026-08-06 17:01:00+00' at time zone 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD') as after_cutoff
    `);

    expect(rows[0]?.before_cutoff).toBe('2026-08-06');
    expect(rows[0]?.after_cutoff).toBe('2026-08-07');
  });
});

describe('is_admin() / is_active_sales()', () => {
  it('is_admin() = true cho Admin đang hoạt động', async () => {
    const { data, error } = await adminClient.rpc('is_admin');
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it('is_admin() = false cho Sales', async () => {
    const { data } = await salesClient.rpc('is_admin');
    expect(data).toBe(false);
  });

  it('is_active_sales() = true cho Sales đang hoạt động', async () => {
    const { data } = await salesClient.rpc('is_active_sales');
    expect(data).toBe(true);
  });

  it('BR-009 — is_active_sales() = false NGAY khi bị vô hiệu hoá, dù JWT cũ còn hạn', async () => {
    await setActive(salesId, false);

    const { data } = await salesClient.rpc('is_active_sales');
    expect(data).toBe(false);

    await setActive(salesId, true);
  });

  it('DEC-006 — SECURITY DEFINER nên KHÔNG gây đệ quy 42P17 trên profiles', async () => {
    // Nếu is_admin() chạy SECURITY INVOKER, chính lời gọi này sẽ ném
    // `42P17: infinite recursion detected in policy for relation "profiles"`.
    const { error } = await adminClient.from('profiles').select('id').limit(1);
    expect(error).toBeNull();
  });

  it('DEC-006 — hàm khai đúng: stable + security definer + search_path cố định', async () => {
    const { rows } = await sql<{
      proname: string;
      provolatile: string;
      prosecdef: boolean;
      proconfig: string[] | null;
    }>(`
      select p.proname, p.provolatile, p.prosecdef, p.proconfig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in ('is_admin', 'is_active_sales')
      order by p.proname
    `);

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.provolatile).toBe('s'); // stable
      expect(row.prosecdef).toBe(true); // security definer
      // Thiếu search_path cố định là lỗ hổng chiếm quyền hàm SECURITY DEFINER.
      expect(row.proconfig?.join(',')).toContain('search_path=');
    }
  });
});

describe('NFR-004 — trạng thái RLS của toàn schema public', () => {
  it('MỌI bảng trong public đều bật RLS và force RLS', async () => {
    const { rows } = await sql<{ relname: string; rls: boolean; forced: boolean }>(`
      select c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as forced
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname
    `);

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.rls, `${row.relname} chưa bật RLS`).toBe(true);
      expect(row.forced, `${row.relname} chưa force RLS`).toBe(true);
    }
  });

  it('DEC-005 — service_role KHÔNG có DML trên hai bảng nghiệp vụ', async () => {
    // BYPASSRLS không vượt qua GRANT. Việc service_role không được cấp DML biến
    // DEC-005 thành hàng rào do database ép, không chỉ là kỷ luật code (DEC-031).
    const { rows } = await sql<{ privilege_type: string }>(`
      select privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('profiles', 'daily_reports')
        and grantee = 'service_role'
        and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    `);

    expect(rows).toEqual([]);
  });

  it('BR-013 — authenticated KHÔNG được cấp DELETE trên daily_reports', async () => {
    const { rows } = await sql<{ privilege_type: string }>(`
      select privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and table_name = 'daily_reports'
        and grantee = 'authenticated' and privilege_type = 'DELETE'
    `);

    expect(rows).toEqual([]);
  });

  it('anon không được cấp bất kỳ quyền DML nào trên hai bảng', async () => {
    const { rows } = await sql<{ privilege_type: string }>(`
      select privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('profiles', 'daily_reports')
        and grantee = 'anon'
        and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    `);

    expect(rows).toEqual([]);
  });
});
