import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { Pool, type QueryResult } from 'pg';

import type { Database } from '@/types/database.types';

/**
 * Hạ tầng chung của TẦNG 2 — INTEGRATION (`docs/08 §2.2`).
 *
 * ⚠ SAI LỆCH CÓ CHỦ ĐÍCH SO VỚI THIẾT KẾ GỐC CỦA docs/08 — xem DEC-031.
 * `docs/08 §2.2` dự kiến tầng này dùng **service-role client** để dựng fixture.
 * Điều đó KHÔNG chạy được, và lý do là một phát hiện có giá trị:
 *
 *   `service_role` có `rolbypassrls = true`, nhưng **BYPASSRLS không vượt qua
 *   GRANT**. Migration 0001/0002 chỉ cấp DML cho `authenticated`; `service_role`
 *   vì thế KHÔNG có `select/insert/update/delete` trên `profiles` và
 *   `daily_reports` (đã kiểm chứng bằng `information_schema.role_table_grants`).
 *
 * Đây là trạng thái ĐÁNG GIỮ, không phải lỗi: nó biến DEC-005 ("service role
 * không bao giờ đọc/ghi daily_reports") từ một kỷ luật code thành một hàng rào
 * do chính database ép. Vì vậy tầng test đổi sang kết nối Postgres TRỰC TIẾP
 * bằng role `postgres` — một kênh chỉ tồn tại ở local (DEC-022), không phải
 * đường dữ liệu của ứng dụng.
 *
 * Lợi ích phụ: SQL trực tiếp trả về SQLSTATE và tên constraint THẬT, thay vì
 * chuỗi lỗi đã được PostgREST diễn giải lại.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL;

if (!url || !serviceRoleKey || !dbUrl) {
  throw new Error(
    'Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_DB_URL. Chạy `npm run db:start` rồi điền vào .env.local.',
  );
}

const LOCAL_HOST = /^(https?|postgresql):\/\/(?:[^@/]*@)?(127\.0\.0\.1|localhost)(:\d+)?/;

for (const [name, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_DB_URL: dbUrl })) {
  if (!LOCAL_HOST.test(value)) {
    throw new Error(
      `CHẶN AN TOÀN: test chỉ được chạy trên Supabase local, nhưng ${name} đang trỏ ra ngoài (DEC-022).`,
    );
  }
}

export const SUPABASE_URL = url;

export const ANON_KEY = (() => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  return key;
})();

/**
 * Client service role — CHỈ dùng cho `auth.admin.*`, đúng như DEC-005 quy định
 * cho code ứng dụng. Nó không có quyền chạm hai bảng nghiệp vụ, và đó là chủ ý.
 */
export const authAdmin: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/** Kết nối Postgres trực tiếp — chỉ tồn tại ở môi trường local. */
const pool = new Pool({ connectionString: dbUrl, max: 4 });

export async function sql<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/** Đóng pool khi toàn bộ test kết thúc, tránh Vitest treo tiến trình. */
export async function closePool(): Promise<void> {
  await pool.end();
}

/**
 * Chạy một khối lệnh trên **đúng MỘT kết nối**, trong một transaction luôn bị
 * `rollback`.
 *
 * `sql()` mượn một kết nối bất kỳ trong pool mỗi lần gọi, nên `set local role`
 * hay `set local request.jwt.claims` đặt ở lượt gọi này có thể không còn hiệu
 * lực ở lượt gọi sau. Bộ test EXPLAIN (`indexes.test.ts`) bắt buộc phải đổi vai
 * sang `authenticated` để RLS thực sự áp dụng — nên nó cần hàm này.
 *
 * Luôn `rollback`: bài đo kế hoạch truy vấn không được để lại dấu vết nào trong
 * database, kể cả khi assert giữa chừng ném lỗi.
 */
export async function inRollbackTransaction<T>(
  run: (query: (text: string, params?: unknown[]) => Promise<QueryResult>) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('begin');
    return await run((text, params = []) => client.query(text, params));
  } finally {
    // `rollback` phải chạy kể cả khi khối trên ném lỗi, nếu không kết nối trả về
    // pool trong trạng thái "đang mở transaction" và mọi test sau đó hỏng theo.
    await client.query('rollback').catch(() => undefined);
    client.release();
  }
}

export const TEST_PASSWORD = 'LocalDev#2026';

export type TestUserSpec = {
  email: string;
  fullName: string;
  employeeCode?: string | null;
  phone?: string | null;
};

/**
 * Tạo user qua **Auth Admin API** — đúng con đường của UC-17/FR-030. Mỗi lần gọi
 * đồng thời là một lần kiểm chứng trigger `handle_new_user()` thật sự sinh được
 * dòng `public.profiles` dưới `force row level security` và **không có INSERT
 * policy nào** (docs/02 §11 CẢNH BÁO 2).
 */
export async function createTestUser(spec: TestUserSpec): Promise<User> {
  await deleteTestUser(spec.email);

  const { data, error } = await authAdmin.auth.admin.createUser({
    email: spec.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: spec.fullName,
      employee_code: spec.employeeCode ?? null,
      phone: spec.phone ?? null,
    },
  });

  if (error || !data.user) {
    throw new Error(`Không tạo được user test ${spec.email}: ${error?.message ?? 'no user'}`);
  }

  return data.user;
}

/** Xoá user test. Phải xoá `daily_reports` trước vì FK là ON DELETE RESTRICT. */
export async function deleteTestUser(email: string): Promise<void> {
  const found = await sql<{ id: string }>('select id from public.profiles where email = $1', [
    email,
  ]);
  const id = found.rows[0]?.id;
  if (!id) return;

  await sql('delete from public.daily_reports where sales_id = $1', [id]);
  await authAdmin.auth.admin.deleteUser(id);
}

export async function setRole(userId: string, role: 'ADMIN' | 'SALES'): Promise<void> {
  await sql('update public.profiles set role = $2 where id = $1', [userId, role]);
}

export async function setActive(userId: string, isActive: boolean): Promise<void> {
  await sql('update public.profiles set is_active = $2 where id = $1', [userId, isActive]);
}

/** Ngày nghiệp vụ VN lấy TỪ DATABASE, không tự tính ở JS (BR-005). */
export async function vnToday(): Promise<string> {
  const result = await sql<{ d: string }>("select to_char(public.vn_today(), 'YYYY-MM-DD') as d");
  const value = result.rows[0]?.d;
  if (!value) throw new Error('Không gọi được public.vn_today()');
  return value;
}

/** Đăng nhập bằng anon key + JWT thật — dùng ở cả tầng 2 lẫn tầng 3. */
export async function signIn(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw new Error(`Không đăng nhập được ${email}: ${error.message}`);
  return client;
}

export type MorningOverrides = Partial<{
  planned_route: string;
  visit_purpose: string | null;
  target_visit_points: number;
  target_sales_quantity: number;
  target_revenue: number;
  target_customer_visits: number;
}>;

const MORNING_DEFAULTS = {
  planned_route: 'Quận 1 → Quận 3',
  visit_purpose: 'Chăm sóc đại lý',
  target_visit_points: 3,
  target_sales_quantity: 5,
  target_revenue: 100_000_000,
  target_customer_visits: 8,
};

/** Cam kết sáng hợp lệ tối thiểu (UC-04, FR-008) — dạng object cho supabase-js. */
export function morningPayload(salesId: string, reportDate: string, overrides: MorningOverrides = {}) {
  return {
    sales_id: salesId,
    report_date: reportDate,
    status: 'MORNING_SUBMITTED' as const,
    ...MORNING_DEFAULTS,
    ...overrides,
  };
}

/** Cùng dữ liệu nhưng chèn bằng SQL trực tiếp. Trả về `id` của dòng vừa tạo. */
export async function insertMorningReport(
  salesId: string,
  reportDate: string,
  overrides: MorningOverrides = {},
): Promise<string> {
  const row = { ...MORNING_DEFAULTS, ...overrides };
  const result = await sql<{ id: string }>(
    `insert into public.daily_reports
       (sales_id, report_date, status, planned_route, visit_purpose,
        target_visit_points, target_sales_quantity, target_revenue, target_customer_visits)
     values ($1, $2, 'MORNING_SUBMITTED', $3, $4, $5, $6, $7, $8)
     returning id`,
    [
      salesId,
      reportDate,
      row.planned_route,
      row.visit_purpose,
      row.target_visit_points,
      row.target_sales_quantity,
      row.target_revenue,
      row.target_customer_visits,
    ],
  );

  const id = result.rows[0]?.id;
  if (!id) throw new Error('Không chèn được báo cáo sáng.');
  return id;
}

/** Thực đạt đủ 4 chỉ tiêu + dấu thời gian (UC-06, FR-015). */
export function eveningPayload() {
  return {
    status: 'COMPLETED' as const,
    actual_route: 'Quận 1 → Quận 3 → Quận 5',
    actual_visit_points: 4,
    actual_sales_quantity: 6,
    actual_revenue: 120_000_000,
    actual_customer_visits: 9,
    evening_note: 'Chốt thêm một đơn ngoài kế hoạch.',
    evening_submitted_at: new Date().toISOString(),
  };
}

/** Lỗi Postgres đã thu hẹp kiểu — `pg` ném `Error` chứ không phải object có `.code`. */
export type PgError = Error & { code?: string; constraint?: string };

export function asPgError(error: unknown): PgError {
  if (error instanceof Error) return error as PgError;
  throw new Error(`Không phải lỗi Postgres: ${String(error)}`);
}

/** Chạy một câu lệnh và BẮT BUỘC nó phải hỏng; trả về lỗi để assert tiếp. */
export async function expectSqlError(text: string, params: unknown[] = []): Promise<PgError> {
  try {
    await sql(text, params);
  } catch (error) {
    return asPgError(error);
  }
  throw new Error(`Câu lệnh lẽ ra phải bị từ chối nhưng đã chạy thành công: ${text}`);
}
