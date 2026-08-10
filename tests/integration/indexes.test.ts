import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  closePool,
  createTestUser,
  deleteTestUser,
  inRollbackTransaction,
  setRole,
  sql,
} from './setup';

/**
 * TẦNG 2 — KẾ HOẠCH TRUY VẤN (`EXPLAIN`). NFR-002, NFR-015, ISSUE-005.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BỘ NÀY TRẢ LỜI BỐN CÂU HỎI ĐÃ ĐƯỢC GHI NỢ TỪ PHASE 2
 * ─────────────────────────────────────────────────────────────────────────
 *  `0005_indexes.sql` cố ý ghi lại hai điều **chưa đo** ngay trong migration:
 *    • `idx_daily_reports_sales_date_desc` CÓ THỂ dư thừa vì
 *      `uq_daily_reports_sales_date` cũng là B-tree trên `(sales_id, report_date)`
 *      và Postgres đọc ngược được;
 *    • `idx_profiles_role_active` có cột dẫn đầu `role` gần như vô dụng vì
 *      mệnh đề `where` đã cố định `role = 'SALES'`.
 *  Cộng thêm ISSUE-005: `is_admin()` thêm một truy vấn `profiles` cho **mỗi
 *  câu lệnh**, và cách viết `(select public.is_admin())` được kỳ vọng làm
 *  Postgres nâng nó thành **InitPlan** — đánh giá một lần thay vì mỗi dòng.
 *
 *  Cả ba đều là **giả thuyết** cho tới khi có `EXPLAIN` thật. Bộ này đo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO PHẢI TỰ SINH DỮ LIỆU
 * ─────────────────────────────────────────────────────────────────────────
 *  Trên một bảng 22 dòng, Postgres **luôn** chọn `Seq Scan` — đọc cả bảng rẻ
 *  hơn đọc index rồi nhảy về heap. Một bài test chạy trên seed sẽ báo "không
 *  dùng index" với mọi truy vấn, kể cả truy vấn hoàn hảo. Nên bộ này chèn vài
 *  nghìn dòng, `analyze`, rồi mới hỏi kế hoạch — và dọn sạch ở `afterAll`.
 *
 *  ⚠ Bài đo này KHÔNG khẳng định thời gian chạy trên Supabase cloud. Nó khẳng
 *  định **hình dạng truy vấn khớp với index** — thứ duy nhất mà môi trường local
 *  chứng minh được một cách trung thực.
 */

const PERF_EMAILS = [
  'perf.sales-1@bikeforce.test',
  'perf.sales-2@bikeforce.test',
  'perf.sales-3@bikeforce.test',
  'perf.admin@bikeforce.test',
] as const;

/** Ngày bắt đầu vùng dữ liệu tổng hợp — đủ xa để không đụng seed lẫn fixture khác. */
const SYNTHETIC_FROM = '2019-01-01';
const SYNTHETIC_DAYS = 900;

let salesIds: string[] = [];
let adminId = '';

/** Đọc `Node Type` và `Index Name` của toàn bộ cây kế hoạch, phẳng hoá thành mảng. */
type PlanNode = {
  'Node Type'?: string;
  'Index Name'?: string;
  'Relation Name'?: string;
  Plans?: PlanNode[];
  [key: string]: unknown;
};

function flattenPlan(node: PlanNode): PlanNode[] {
  const children = Array.isArray(node.Plans) ? node.Plans : [];
  return [node, ...children.flatMap(flattenPlan)];
}

async function explain(text: string, params: unknown[] = []): Promise<PlanNode[]> {
  const result = await sql<{ 'QUERY PLAN': [{ Plan: PlanNode }] }>(
    `explain (format json, analyze, buffers off) ${text}`,
    params,
  );

  const root = result.rows[0]?.['QUERY PLAN']?.[0]?.Plan;
  if (!root) throw new Error(`Không đọc được kế hoạch của: ${text}`);

  return flattenPlan(root);
}

/** Tên mọi index thực sự được dùng trong kế hoạch. */
function indexesUsed(plan: PlanNode[]): string[] {
  return plan
    .map((node) => node['Index Name'])
    .filter((name): name is string => typeof name === 'string');
}

function hasSeqScanOn(plan: PlanNode[], relation: string): boolean {
  return plan.some(
    (node) => node['Node Type'] === 'Seq Scan' && node['Relation Name'] === relation,
  );
}

beforeAll(async () => {
  const users = [];
  for (const email of PERF_EMAILS) {
    users.push(
      await createTestUser({
        email,
        fullName: `Perf ${email}`,
        employeeCode: email.slice(0, 12),
      }),
    );
  }

  salesIds = users.slice(0, 3).map((user) => user.id);
  adminId = users[3]?.id ?? '';
  await setRole(adminId, 'ADMIN');

  /*
   * 3 Sales × 900 ngày = 2.700 dòng. `generate_series` sinh thẳng trong SQL —
   * 2.700 lượt round-trip từ Node sẽ chậm hơn hàng chục lần.
   *
   * Ngày đều nằm trong quá khứ nên `ck_report_not_future` chấp nhận;
   * `UNIQUE(sales_id, report_date)` được tôn trọng vì mỗi Sales một chuỗi ngày
   * riêng biệt. Một nửa số dòng để `COMPLETED` (kèm đủ 4 `actual_*` theo
   * `ck_completed_requires_actuals`) để bộ lọc theo `status` có gì để chọn.
   */
  for (const salesId of salesIds) {
    await sql(
      `insert into public.daily_reports (
         sales_id, report_date, status, planned_route, visit_purpose,
         target_visit_points, target_sales_amount, target_revenue, target_customer_visits,
         actual_route, actual_visit_points, actual_sales_amount, actual_revenue,
         actual_customer_visits, evening_submitted_at
       )
       select
         $1,
         d::date,
         case when (extract(day from d)::int % 2) = 0 then 'COMPLETED' else 'MORNING_SUBMITTED' end::public.report_status,
         'Tuyen ' || to_char(d, 'DD/MM'),
         'Cham soc dai ly',
         -- 12 chứ không phải 3: BR-026 đặt sàn 10 cho mục tiêu điểm viếng thăm
         -- (DEC-049). Doanh số là TIỀN từ DEC-050.
         12, 80000000, 100000000, 8,
         case when (extract(day from d)::int % 2) = 0 then 'Tuyen thuc te' end,
         case when (extract(day from d)::int % 2) = 0 then 4 end,
         case when (extract(day from d)::int % 2) = 0 then 60000000 end,
         case when (extract(day from d)::int % 2) = 0 then 120000000 end,
         case when (extract(day from d)::int % 2) = 0 then 9 end,
         case when (extract(day from d)::int % 2) = 0 then d end
       from generate_series($2::date, $2::date + ($3::int - 1), interval '1 day') d`,
      [salesId, SYNTHETIC_FROM, SYNTHETIC_DAYS],
    );
  }

  // Không `analyze` thì planner vẫn dùng thống kê cũ của bảng 22 dòng.
  await sql('analyze public.daily_reports');
  await sql('analyze public.profiles');
}, 120_000);

afterAll(async () => {
  for (const email of PERF_EMAILS) {
    await deleteTestUser(email);
  }
  await sql('analyze public.daily_reports');
  await closePool();
}, 120_000);

describe('khối lượng dữ liệu tổng hợp', () => {
  it('đã chèn đủ dòng để planner có lý do chọn index', async () => {
    const result = await sql<{ n: string }>(
      'select count(*)::text as n from public.daily_reports where report_date >= $1 and report_date < $2',
      [SYNTHETIC_FROM, '2022-01-01'],
    );

    expect(Number(result.rows[0]?.n ?? '0')).toBeGreaterThanOrEqual(SYNTHETIC_DAYS * 3);
  });
});

describe('FR-021 · /sales/history — lịch sử của MỘT Sales, phân trang', () => {
  /**
   * Đúng hình dạng truy vấn của `listReportsByMonth()`: lọc theo `sales_id` +
   * khoảng ngày, sắp giảm dần theo ngày, lấy 20 dòng.
   */
  const HISTORY_QUERY = `
    select id, report_date, status,
           target_visit_points, actual_visit_points,
           target_sales_amount, actual_sales_amount,
           target_revenue, actual_revenue,
           target_customer_visits, actual_customer_visits
      from public.daily_reports
     where sales_id = $1
       and report_date between $2 and $3
     order by report_date desc
     limit 20`;

  it('KHÔNG quét toàn bảng', async () => {
    const plan = await explain(HISTORY_QUERY, [salesIds[0], '2019-01-01', '2019-12-31']);
    expect(hasSeqScanOn(plan, 'daily_reports')).toBe(false);
  });

  it('dùng một B-tree trên (sales_id, report_date) — ghi nhận index nào thắng', async () => {
    const plan = await explain(HISTORY_QUERY, [salesIds[0], '2019-01-01', '2019-12-31']);
    const used = indexesUsed(plan);

    /*
     * GHI NHẬN TRUNG THỰC cho `0005_indexes.sql`: hai index cùng phủ được truy
     * vấn này. Bài test chấp nhận cả hai và **in ra** cái thắng, vì mục đích là
     * xác minh hình dạng truy vấn khớp index — không phải ép planner chọn một
     * cái cụ thể (planner được phép đổi ý khi thống kê đổi).
     */
    expect(
      used.some(
        (name) =>
          name === 'idx_daily_reports_sales_date_desc' || name === 'uq_daily_reports_sales_date',
      ),
      `Index đã dùng: ${used.join(', ') || '(không có)'}`,
    ).toBe(true);
  });

  it('không sắp xếp lại ở bộ nhớ — index đã trả đúng thứ tự', async () => {
    const plan = await explain(HISTORY_QUERY, [salesIds[0], '2019-01-01', '2019-12-31']);

    // Một node `Sort` ở đây nghĩa là `order by report_date desc` không khớp
    // index, và chi phí sẽ bùng lên theo số dòng của cả tháng.
    expect(plan.some((node) => node['Node Type'] === 'Sort')).toBe(false);
  });

  it('chỉ đọc đúng số dòng của một trang, không đọc cả tháng', async () => {
    const plan = await explain(HISTORY_QUERY, [salesIds[0], '2019-01-01', '2019-12-31']);
    const root = plan[0];

    expect(root).toBeDefined();
    expect(Number(root?.['Actual Rows'] ?? 0)).toBeLessThanOrEqual(20);
  });
});

describe('FR-024 · /admin — 12 chỉ số của MỘT ngày', () => {
  const TODAY_QUERY = `
    select status, target_revenue, actual_revenue
      from public.daily_reports
     where report_date = $1`;

  it('dùng idx_daily_reports_date_status, không quét toàn bảng', async () => {
    const plan = await explain(TODAY_QUERY, ['2019-06-15']);

    expect(hasSeqScanOn(plan, 'daily_reports')).toBe(false);
    expect(indexesUsed(plan)).toContain('idx_daily_reports_date_status');
  });
});

describe('FR-025 / FR-026 · /admin/reports — danh sách toàn đội có filter', () => {
  const ADMIN_LIST_QUERY = `
    select id, sales_id, report_date, status
      from public.daily_reports
     where report_date between $1 and $2
     order by report_date desc
     limit 20`;

  it('dùng idx_daily_reports_date_status và không sắp xếp lại', async () => {
    const plan = await explain(ADMIN_LIST_QUERY, ['2019-03-01', '2019-03-31']);

    expect(hasSeqScanOn(plan, 'daily_reports')).toBe(false);
    expect(indexesUsed(plan)).toContain('idx_daily_reports_date_status');
    expect(plan.some((node) => node['Node Type'] === 'Sort')).toBe(false);
  });

  it('lọc thêm theo status vẫn đi qua cùng index', async () => {
    const plan = await explain(
      `select id from public.daily_reports
        where report_date between $1 and $2 and status = 'COMPLETED'
        order by report_date desc limit 20`,
      ['2019-03-01', '2019-03-31'],
    );

    expect(hasSeqScanOn(plan, 'daily_reports')).toBe(false);
    expect(indexesUsed(plan)).toContain('idx_daily_reports_date_status');
  });
});

describe('FR-028 / FR-037 · tổng hợp tháng và chuỗi theo ngày', () => {
  it('admin_monthly_summary quét đúng một tháng, không quét cả bảng', async () => {
    const plan = await explain(
      `select count(*), sum(actual_revenue)
         from public.daily_reports
        where report_date between $1 and $2 and status = 'COMPLETED'`,
      ['2019-05-01', '2019-05-31'],
    );

    expect(hasSeqScanOn(plan, 'daily_reports')).toBe(false);
    expect(indexesUsed(plan)).toContain('idx_daily_reports_date_status');
  });

  it('admin_daily_trend gom theo ngày trong đúng khoảng, không quét cả bảng', async () => {
    const plan = await explain(
      `select report_date, count(*), sum(actual_revenue)
         from public.daily_reports
        where report_date between $1 and $2 and status = 'COMPLETED'
        group by report_date
        order by report_date`,
      ['2019-05-01', '2019-05-31'],
    );

    expect(hasSeqScanOn(plan, 'daily_reports')).toBe(false);
  });
});

describe('idx_profiles_role_active — đếm Sales đang hoạt động', () => {
  it('không quét toàn bảng profiles', async () => {
    const plan = await explain(
      `select id from public.profiles where role = 'SALES' and is_active`,
    );

    /*
     * GHI NHẬN: bảng `profiles` của v1 chỉ có vài chục dòng, nên planner CÓ THỂ
     * chọn `Seq Scan` một cách hoàn toàn hợp lý. Bài này vì thế chỉ khẳng định
     * điều đo được: index TỒN TẠI và PHỦ ĐƯỢC truy vấn — kiểm bằng cách tắt
     * seqscan. Khẳng định "planner luôn chọn index" ở quy mô này là khẳng định sai.
     */
    const usable = await inRollbackTransaction(async (query) => {
      await query('set local enable_seqscan = off');
      const result = await query(
        `explain (format json) select id from public.profiles where role = 'SALES' and is_active`,
      );
      const rows = result.rows as Array<{ 'QUERY PLAN': [{ Plan: PlanNode }] }>;
      const root = rows[0]?.['QUERY PLAN']?.[0]?.Plan;
      return root ? indexesUsed(flattenPlan(root)) : [];
    });

    expect(usable).toContain('idx_profiles_role_active');
    expect(plan.length).toBeGreaterThan(0);
  });
});

describe('ISSUE-005 / DEC-006 — is_admin() phải được nâng thành InitPlan', () => {
  /**
   * Bài quan trọng nhất của bộ này.
   *
   * Policy `reports_select_own_or_admin` gọi `(select public.is_admin())`. Nếu
   * Postgres KHÔNG nâng được nó thành InitPlan thì hàm chạy **một lần cho mỗi
   * dòng** — với 2.700 dòng là 2.700 truy vấn phụ vào `profiles`, đúng rủi ro
   * mà ISSUE-005 ghi nhận.
   *
   * Phải đổi vai sang `authenticated` mới đo được: role `postgres` có
   * `rolbypassrls` nên policy không tham gia kế hoạch, và bài test sẽ "xanh"
   * một cách vô nghĩa (cùng lý do khiến test RLS phải nằm ở `tests/rls/`).
   */
  async function planAsAuthenticated(userId: string, text: string): Promise<PlanNode[]> {
    return inRollbackTransaction(async (query) => {
      await query('select set_config($1, $2, true)', [
        'request.jwt.claims',
        JSON.stringify({ sub: userId, role: 'authenticated' }),
      ]);
      await query('set local role authenticated');

      const result = await query(`explain (format json, analyze, buffers off) ${text}`);
      const rows = result.rows as Array<{ 'QUERY PLAN': [{ Plan: PlanNode }] }>;
      const root = rows[0]?.['QUERY PLAN']?.[0]?.Plan;
      if (!root) throw new Error('Không đọc được kế hoạch dưới vai authenticated.');

      return flattenPlan(root);
    });
  }

  it('Admin đọc danh sách: is_admin() nằm trong InitPlan, không phải mỗi dòng', async () => {
    const plan = await planAsAuthenticated(
      adminId,
      `select id from public.daily_reports where report_date between '2019-03-01' and '2019-03-31' limit 20`,
    );

    const initPlans = plan.filter((node) => node['Parent Relationship'] === 'InitPlan');

    expect(
      initPlans.length,
      `Kế hoạch không có InitPlan nào — is_admin() sẽ chạy mỗi dòng. Node types: ${plan
        .map((node) => node['Node Type'])
        .join(', ')}`,
    ).toBeGreaterThan(0);
  });

  it('Admin vẫn đi qua index dưới RLS, policy không phá kế hoạch', async () => {
    const plan = await planAsAuthenticated(
      adminId,
      `select id from public.daily_reports where report_date between '2019-03-01' and '2019-03-31' order by report_date desc limit 20`,
    );

    expect(hasSeqScanOn(plan, 'daily_reports')).toBe(false);
    expect(indexesUsed(plan)).toContain('idx_daily_reports_date_status');
  });

  it('Sales đọc lịch sử của chính mình dưới RLS vẫn đi qua index', async () => {
    const salesId = salesIds[0] ?? '';
    const plan = await planAsAuthenticated(
      salesId,
      `select id from public.daily_reports where report_date between '2019-01-01' and '2019-12-31' order by report_date desc limit 20`,
    );

    expect(hasSeqScanOn(plan, 'daily_reports')).toBe(false);
  });
});
