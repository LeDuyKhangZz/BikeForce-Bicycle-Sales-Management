import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

import type { Database } from '@/types/database.types';

import {
  E2E_ADMIN_EMAIL,
  E2E_DONE_SALES_EMAIL,
  E2E_DONE_SALES_NAME,
  E2E_PROJECTS,
  createdSalesEmail,
  flowSalesEmail,
  uiSalesEmail,
} from './accounts';
import { E2E_PASSWORD, loadE2eEnv } from './env';

/**
 * Fixture của bộ E2E — tài khoản và dữ liệu dựng bằng **API/SQL**, không qua UI.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO KHÔNG DÙNG TÀI KHOẢN TRONG `supabase/seed.sql`
 * ─────────────────────────────────────────────────────────────────────────
 *  BR-001 cho mỗi Sales **đúng một** báo cáo mỗi ngày, và BR-019 khoá vĩnh viễn
 *  khi `COMPLETED`. Nghĩa là kịch bản "cam kết sáng → hoàn tất cuối ngày" chỉ
 *  chạy được **một lần mỗi ngày mỗi tài khoản**. Dùng chung `sales.a` thì:
 *    • chạy lần thứ hai trong ngày là đỏ, dù code hoàn toàn đúng;
 *    • ba project Playwright chạy song song sẽ giẫm lên nhau;
 *    • và bộ E2E phá luôn trạng thái mà người dùng đang kiểm bằng tay.
 *
 *  Nên mỗi project có **Sales riêng**, và mọi tài khoản E2E bị xoá sạch ở
 *  `global-teardown`. Trạng thái seed của người dùng không bị đụng tới.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO CÓ HAI KÊNH GHI
 * ─────────────────────────────────────────────────────────────────────────
 *  `auth.admin.createUser` là **đúng con đường** của UC-17 và là cách duy nhất
 *  tạo được `auth.users` — nó cũng kích hoạt trigger `handle_new_user()`.
 *  Còn `daily_reports` thì ghi bằng SQL trực tiếp: fixture cần đặt báo cáo vào
 *  **tháng trước** để có lịch sử, mà BR-021 cấm ứng dụng làm việc đó. Kênh SQL
 *  trực tiếp chỉ tồn tại ở local (DEC-031) và không phải đường dữ liệu của app.
 */

const env = loadE2eEnv();

const authAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const pool = new Pool({ connectionString: env.SUPABASE_DB_URL, max: 4 });

async function sql<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

/**
 * Đóng pool — **gọi bao nhiêu lần cũng được**.
 *
 * `globalSetup` và `globalTeardown` chạy trong CÙNG một tiến trình Playwright,
 * nên chúng dùng chung đúng một instance module này. Gọi `pool.end()` lần thứ
 * hai làm `pg` ném `Called end on pool more than once`, và Playwright báo đó là
 * "1 error was not a part of any test" — một dòng đỏ không thuộc về bài test
 * nào, rất tốn thời gian truy nguyên.
 */
let poolClosed = false;

export async function closeFixturePool(): Promise<void> {
  if (poolClosed) return;
  poolClosed = true;
  await pool.end();
}

type SeededUser = { id: string; email: string };

async function deleteUserByEmail(email: string): Promise<void> {
  const rows = await sql<{ id: string }>('select id from public.profiles where email = $1', [
    email,
  ]);
  const id = rows[0]?.id;
  if (id === undefined) return;

  // FK là ON DELETE RESTRICT — báo cáo phải đi trước.
  await sql('delete from public.daily_reports where sales_id = $1', [id]);
  await authAdmin.auth.admin.deleteUser(id);
}

async function createUser(
  email: string,
  fullName: string,
  employeeCode: string,
): Promise<SeededUser> {
  await deleteUserByEmail(email);

  const { data, error } = await authAdmin.auth.admin.createUser({
    email,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, employee_code: employeeCode, phone: '0900000000' },
  });

  if (error || !data.user) {
    throw new Error(`Không tạo được tài khoản E2E ${email}: ${error?.message ?? 'no user'}`);
  }

  return { id: data.user.id, email };
}

/** Ngày nghiệp vụ lấy TỪ DATABASE, không tự tính ở JS (BR-005). */
export async function vnToday(): Promise<string> {
  const rows = await sql<{ d: string }>("select to_char(public.vn_today(), 'YYYY-MM-DD') as d");
  const value = rows[0]?.d;
  if (value === undefined) throw new Error('Không gọi được public.vn_today()');
  return value;
}

export async function seedE2eFixture(): Promise<void> {
  const today = await vnToday();

  const admin = await createUser(E2E_ADMIN_EMAIL, 'E2E Quản Trị', 'E2E-ADM');
  await sql("update public.profiles set role = 'ADMIN' where id = $1", [admin.id]);

  // Sales "luồng" của từng project — cố ý KHÔNG có báo cáo nào hôm nay.
  //
  // ⚠ `uiSalesEmail` là tài khoản THỨ HAI, riêng cho `ui-quality.spec.ts`. Không
  // gộp với `flowSalesEmail`: cả hai spec đều GHI một báo cáo, mà BR-001 chỉ cho
  // một báo cáo mỗi ngày và BR-019 khoá vĩnh viễn sau khi hoàn tất. Dùng chung
  // thì spec chạy sau luôn đỏ — đã xảy ra thật, xem chú thích ở `accounts.ts`.
  for (const project of E2E_PROJECTS) {
    await createUser(flowSalesEmail(project), `E2E Luồng ${project}`, `E2E-${project.slice(0, 6)}`);
    await createUser(uiSalesEmail(project), `E2E Giao Diện ${project}`, `E2E-UI-${project.slice(0, 3)}`);
    await deleteUserByEmail(createdSalesEmail(project));
  }

  // Sales đã hoàn tất hôm nay — phục vụ kịch bản xuất ảnh (BR-002) và bảng đối
  // chiếu. Số liệu cố ý lệch nhau để bốn badge ra bốn trạng thái khác nhau.
  const done = await createUser(E2E_DONE_SALES_EMAIL, E2E_DONE_SALES_NAME, 'E2E-DONE');

  await sql(
    `insert into public.daily_reports (
       sales_id, report_date, status, planned_route, visit_purpose,
       target_visit_points, target_sales_amount, target_revenue, target_customer_visits,
       actual_route, actual_visit_points, actual_sales_amount, actual_revenue,
       actual_customer_visits, evening_note, evening_submitted_at
     -- PHASE 13: điểm viếng thăm ≥ 10 (BR-026) và doanh số là TIỀN (DEC-050).
     -- Bốn cặp số cố ý cho bốn trạng thái khác nhau của BR-023:
     --   15/12 = 125% EXCEEDED · 60tr/80tr = 75% MISSED
     --   90tr/100tr = 90% NEAR · 10/10 = 100% EXCEEDED
     ) values ($1, $2, 'COMPLETED', 'Quận 1 → Quận 3', 'Chăm sóc đại lý',
       12, 80000000, 100000000, 10,
       'Quận 1 → Quận 3 → Quận 5', 15, 60000000, 90000000, 10,
       'Ghi chú có dấu tiếng Việt: ừ ẫ ợ ỹ đ Đ.', now())`,
    [done.id, today],
  );

  /*
   * Lịch sử tháng trước — để `/sales/history` có gì để phân trang và
   * `/admin/analytics` có gì để vẽ. Ghi bằng SQL vì BR-021 cấm ứng dụng tạo báo
   * cáo cho ngày cũ; đây là fixture, không phải một đường đi của người dùng.
   */
  await sql(
    `insert into public.daily_reports (
       sales_id, report_date, status, planned_route, visit_purpose,
       target_visit_points, target_sales_amount, target_revenue, target_customer_visits,
       actual_route, actual_visit_points, actual_sales_amount, actual_revenue,
       actual_customer_visits, evening_submitted_at
     )
     select $1,
            d::date,
            'COMPLETED',
            'Tuyến ' || to_char(d, 'DD/MM'),
            'Chăm sóc đại lý',
            12, 80000000, 100000000, 10,
            'Tuyến thực tế',
            12, 80000000, 100000000, 10,
            d
       from generate_series(
              (date_trunc('month', $2::date) - interval '1 month')::date,
              (date_trunc('month', $2::date) - interval '1 day')::date,
              interval '1 day'
            ) d`,
    [done.id, today],
  );
}

export async function tearDownE2eFixture(): Promise<void> {
  const emails = [
    E2E_ADMIN_EMAIL,
    E2E_DONE_SALES_EMAIL,
    ...E2E_PROJECTS.map(flowSalesEmail),
    ...E2E_PROJECTS.map(uiSalesEmail),
    ...E2E_PROJECTS.map(createdSalesEmail),
  ];

  for (const email of emails) {
    await deleteUserByEmail(email);
  }
}
