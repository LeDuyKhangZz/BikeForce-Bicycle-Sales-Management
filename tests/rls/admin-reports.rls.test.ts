import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getVietnamMonthRange, shiftVietnamMonth } from '@/lib/date';
import { REPORTS_PAGE_SIZE } from '@/lib/reports/pagination';
import { listSalesOptions } from '@/services/profiles';
import {
  CSV_EXPORT_MAX_ROWS,
  getAdminReports,
  getAdminReportsForExport,
  type AdminReportQuery,
} from '@/services/reports';

import { closePool, insertMorningReport, sql } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

/**
 * TẦNG 3 — `getAdminReports()`, `getAdminReportsForExport()` và
 * `listSalesOptions()` dưới JWT THẬT.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO BỘ NÀY BẮT BUỘC PHẢI CÓ
 * ─────────────────────────────────────────────────────────────────────────
 *  Ba hàm này trả về **dữ liệu của toàn đội**. Chúng không tự kiểm vai — cố ý,
 *  vì quyền là việc của RLS (AGENTS.md §8). Nghĩa là nếu policy
 *  `reports_select_own_or_admin` bị viết sai, một Sales gọi thẳng
 *  `getAdminReports()` từ DevTools sẽ đọc được doanh thu của cả đội **mà không
 *  đi qua một dòng code guard nào**.
 *
 *  Bộ này cũng khoá lại một chi tiết dễ hỏng âm thầm: `sales:profiles!inner(...)`.
 *  Thiếu `!inner`, PostgREST bỏ qua bộ lọc `ilike('sales.full_name', …)` **mà
 *  không báo lỗi** — ô tìm kiếm trở thành trang trí, và không test nào ngoài
 *  tầng này phát hiện được.
 */

let fx: RlsFixture;
let month: { from: string; to: string };
let monthKey: string;

/** Bộ lọc rỗng — dùng lại nhiều lần bên dưới. */
const NO_FILTERS: AdminReportQuery = {
  range: null,
  salesId: null,
  status: null,
  search: null,
};

beforeAll(async () => {
  fx = await setUpRlsFixture();

  // Tháng trước: luôn ≥ 28 ngày và toàn quá khứ (`ck_report_not_future`), nên
  // bài phân trang cho kết quả giống nhau ở mọi ngày trong năm.
  const previousMonth = shiftVietnamMonth(fx.today.slice(0, 7), -1);
  if (previousMonth === null) throw new Error(`Không lùi được tháng từ ${fx.today}`);
  monthKey = previousMonth;

  const range = getVietnamMonthRange(monthKey);
  if (range === null) throw new Error(`Tháng fixture không hợp lệ: ${monthKey}`);
  month = range;

  for (let day = 1; day <= REPORTS_PAGE_SIZE + 3; day += 1) {
    await insertMorningReport(fx.ids.salesA, `${monthKey}-${String(day).padStart(2, '0')}`);
  }
  for (let day = 1; day <= 5; day += 1) {
    await insertMorningReport(fx.ids.salesB, `${monthKey}-${String(day).padStart(2, '0')}`);
  }

  // Một báo cáo đã hoàn tất để lọc theo trạng thái có ý nghĩa.
  await sql(
    `update public.daily_reports
        set status = 'COMPLETED', actual_route = 'X',
            actual_visit_points = 6, actual_sales_amount = 12,
            actual_revenue = 150000000, actual_customer_visits = 15,
            evening_submitted_at = now()
      where sales_id = $1 and report_date = $2`,
    [fx.ids.salesA, `${monthKey}-01`],
  );
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

describe('getAdminReports — UC-13, FR-025, FR-026', () => {
  /**
   * ⚠ Đo trên TOÀN tập, không trên trang 1.
   *
   * Database local còn dữ liệu seed của những Sales khác (`supabase/seed.sql`),
   * nên 20 dòng mới nhất của tháng không nhất thiết chứa cả salesA lẫn salesB.
   * Lần chạy đầu của bài này đã đỏ đúng vì lý do đó — assertion sai, không phải
   * code sai.
   */
  it('Admin thấy báo cáo của MỌI Sales', async () => {
    const { rows } = await getAdminReportsForExport(fx.clients.admin, {
      ...NO_FILTERS,
      range: month,
    });
    const owners = new Set(rows.map((row) => row.sales_id));

    expect(owners.has(fx.ids.salesA)).toBe(true);
    expect(owners.has(fx.ids.salesB)).toBe(true);
    // Có nhiều hơn hai người ⇒ chứng minh Admin không bị giới hạn ở fixture.
    expect(owners.size).toBeGreaterThanOrEqual(2);
  });

  it('kèm tên Sales qua embedded resource — sai tên quan hệ là hỏng ở đây', async () => {
    const { rows } = await getAdminReports(
      fx.clients.admin,
      { ...NO_FILTERS, range: month, salesId: fx.ids.salesB },
      1,
    );

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.sales.full_name).toBe('RLS Sales B');
    expect(rows[0]?.sales.employee_code).toBe('RLS-B');
  });

  it('sắp mới nhất trước, và thứ tự ỔN ĐỊNH giữa hai lần chạy', async () => {
    const first = await getAdminReports(fx.clients.admin, { ...NO_FILTERS, range: month }, 1);
    const second = await getAdminReports(fx.clients.admin, { ...NO_FILTERS, range: month }, 1);

    const dates = first.rows.map((row) => row.report_date);
    expect(dates).toEqual([...dates].sort().reverse());
    // Nhiều báo cáo cùng ngày ⇒ không có khoá phụ thì Postgres được phép đổi
    // thứ tự, và một dòng có thể lọt vào cả hai trang.
    expect(second.rows.map((row) => row.id)).toEqual(first.rows.map((row) => row.id));
  });

  it('phân trang server-side: trang 1 và 2 không chồng nhau', async () => {
    const first = await getAdminReports(fx.clients.admin, { ...NO_FILTERS, range: month }, 1);
    const second = await getAdminReports(fx.clients.admin, { ...NO_FILTERS, range: month }, 2);

    expect(first.rows).toHaveLength(REPORTS_PAGE_SIZE);
    const firstIds = new Set(first.rows.map((row) => row.id));
    for (const row of second.rows) {
      expect(firstIds.has(row.id)).toBe(false);
    }
  });

  it('lọc theo Sales', async () => {
    const { rows, pageInfo } = await getAdminReports(
      fx.clients.admin,
      { ...NO_FILTERS, range: month, salesId: fx.ids.salesB },
      1,
    );

    expect(pageInfo.total).toBe(5);
    expect(rows.every((row) => row.sales_id === fx.ids.salesB)).toBe(true);
  });

  it('lọc theo trạng thái — mọi dòng trả về đều đúng trạng thái', async () => {
    const { rows, pageInfo } = await getAdminReports(
      fx.clients.admin,
      { ...NO_FILTERS, range: month, status: 'COMPLETED' },
      1,
    );

    expect(pageInfo.total).toBeGreaterThanOrEqual(1);
    expect(rows.every((row) => row.status === 'COMPLETED')).toBe(true);

    // Con số phải khớp SỰ THẬT trong bảng, không phải một hằng số viết tay —
    // database local còn dữ liệu seed nên hằng số sẽ lỗi thời.
    const truth = await sql<{ n: string }>(
      `select count(*)::text as n from public.daily_reports
        where report_date between $1 and $2 and status = 'COMPLETED'`,
      [month.from, month.to],
    );
    expect(pageInfo.total).toBe(Number(truth.rows[0]?.n ?? '0'));
  });

  it('lọc theo trạng thái MORNING_SUBMITTED loại hết dòng đã hoàn tất', async () => {
    const { rows } = await getAdminReports(
      fx.clients.admin,
      { ...NO_FILTERS, range: month, status: 'MORNING_SUBMITTED' },
      1,
    );

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.status === 'MORNING_SUBMITTED')).toBe(true);
  });

  /** ⚠ Bài khoá `!inner`: thiếu nó thì bộ lọc này bị bỏ qua âm thầm. */
  it('tìm theo TÊN Sales thật sự lọc, không phải trang trí', async () => {
    const matching = await getAdminReports(
      fx.clients.admin,
      { ...NO_FILTERS, range: month, search: 'Sales B' },
      1,
    );
    expect(matching.pageInfo.total).toBe(5);
    expect(matching.rows.every((row) => row.sales_id === fx.ids.salesB)).toBe(true);

    const noMatch = await getAdminReports(
      fx.clients.admin,
      { ...NO_FILTERS, range: month, search: 'Khong Ton Tai' },
      1,
    );
    expect(noMatch.pageInfo.total).toBe(0);
  });

  it('tìm kiếm không phân biệt hoa thường', async () => {
    const lower = await getAdminReports(
      fx.clients.admin,
      { ...NO_FILTERS, range: month, search: 'rls sales b' },
      1,
    );
    expect(lower.pageInfo.total).toBe(5);
  });

  it('ký tự đại diện % trong ô tìm kiếm được thoát, không khớp mọi thứ', async () => {
    const { pageInfo } = await getAdminReports(
      fx.clients.admin,
      { ...NO_FILTERS, range: month, search: '%' },
      1,
    );

    expect(pageInfo.total).toBe(0);
  });

  it('?page= vượt quá số trang → lùi về trang cuối có dữ liệu', async () => {
    const { rows, pageInfo } = await getAdminReports(
      fx.clients.admin,
      { ...NO_FILTERS, range: month },
      99,
    );

    expect(pageInfo.total).toBeGreaterThan(0);
    expect(rows.length).toBeGreaterThan(0);
    expect(pageInfo.page).toBe(pageInfo.pageCount);
  });

  /** ⚠ Bài quan trọng nhất: RLS là thứ chặn, không phải guard trong code. */
  it('BR-003 — Sales gọi thẳng hàm này chỉ thấy báo cáo của CHÍNH MÌNH', async () => {
    const { rows } = await getAdminReports(fx.clients.salesA, { ...NO_FILTERS, range: month }, 1);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.sales_id === fx.ids.salesA)).toBe(true);
  });

  it('BR-003 — Sales lọc theo salesId của người khác vẫn nhận 0 dòng', async () => {
    const { rows, pageInfo } = await getAdminReports(
      fx.clients.salesA,
      { ...NO_FILTERS, range: month, salesId: fx.ids.salesB },
      1,
    );

    expect(rows).toHaveLength(0);
    expect(pageInfo.total).toBe(0);
  });

  it('anon nhận 0 dòng — deny-by-default (NFR-004)', async () => {
    const { rows, pageInfo } = await getAdminReports(fx.anon, { ...NO_FILTERS, range: month }, 1);

    expect(rows).toHaveLength(0);
    expect(pageInfo.total).toBe(0);
  });
});

describe('getAdminReportsForExport — FR-034, UC-21', () => {
  it('trả về TOÀN BỘ tập đang lọc, không phải một trang', async () => {
    const { rows, truncated } = await getAdminReportsForExport(fx.clients.admin, {
      ...NO_FILTERS,
      range: month,
    });

    // 23 của salesA + 5 của salesB = 28 > 20 dòng của một trang.
    expect(rows.length).toBeGreaterThan(REPORTS_PAGE_SIZE);
    expect(truncated).toBe(false);
  });

  it('tôn trọng đúng bộ lọc đang bật — file CSV khớp bảng đang xem', async () => {
    const { rows } = await getAdminReportsForExport(fx.clients.admin, {
      ...NO_FILTERS,
      range: month,
      salesId: fx.ids.salesB,
    });

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.sales_id === fx.ids.salesB)).toBe(true);
  });

  it('không bao giờ vượt trần CSV_EXPORT_MAX_ROWS', async () => {
    const { rows } = await getAdminReportsForExport(fx.clients.admin, NO_FILTERS);
    expect(rows.length).toBeLessThanOrEqual(CSV_EXPORT_MAX_ROWS);
  });

  it('BR-003 — Sales xuất CSV chỉ ra báo cáo của chính mình', async () => {
    const { rows } = await getAdminReportsForExport(fx.clients.salesA, {
      ...NO_FILTERS,
      range: month,
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.sales_id === fx.ids.salesA)).toBe(true);
  });

  it('anon xuất CSV ra rỗng', async () => {
    const { rows } = await getAdminReportsForExport(fx.anon, { ...NO_FILTERS, range: month });
    expect(rows).toHaveLength(0);
  });
});

describe('listSalesOptions — dropdown lọc, FR-025', () => {
  it('Admin thấy mọi Sales, kể cả người đã bị vô hiệu hoá', async () => {
    const options = await listSalesOptions(fx.clients.admin);
    const ids = options.map((option) => option.id);

    expect(ids).toContain(fx.ids.salesA);
    expect(ids).toContain(fx.ids.salesB);
    expect(ids).toContain(fx.ids.inactive);
  });

  it('Admin KHÔNG nằm trong danh sách — đây là bộ lọc theo Sales', async () => {
    const options = await listSalesOptions(fx.clients.admin);
    expect(options.map((option) => option.id)).not.toContain(fx.ids.admin);
  });

  it('người đang hoạt động xếp trước', async () => {
    const options = await listSalesOptions(fx.clients.admin);
    const firstInactive = options.findIndex((option) => !option.is_active);
    const lastActive = options.map((option) => option.is_active).lastIndexOf(true);

    if (firstInactive !== -1 && lastActive !== -1) {
      expect(lastActive).toBeLessThan(firstInactive);
    }
  });

  it('BR-003 — Sales chỉ thấy hồ sơ của chính mình, không lộ danh sách đồng nghiệp', async () => {
    const options = await listSalesOptions(fx.clients.salesA);

    expect(options).toHaveLength(1);
    expect(options[0]?.id).toBe(fx.ids.salesA);
  });

  it('anon nhận danh sách rỗng', async () => {
    expect(await listSalesOptions(fx.anon)).toHaveLength(0);
  });
});
