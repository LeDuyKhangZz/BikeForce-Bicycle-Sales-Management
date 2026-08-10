import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getVietnamMonthRange, shiftVietnamMonth } from '@/lib/date';
import { REPORTS_PAGE_SIZE } from '@/lib/reports/pagination';
import { getReportById, listReportsByMonth } from '@/services/reports';

import { closePool, insertMorningReport, sql } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

/**
 * TẦNG 3 — `listReportsByMonth()` và `getReportById()` chạy dưới JWT THẬT.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO BỘ NÀY BẮT BUỘC PHẢI CÓ VÀ PHẢI Ở `tests/rls/`
 * ─────────────────────────────────────────────────────────────────────────
 *  `/sales/reports/[id]` là bề mặt IDOR thứ hai của hệ thống (bề mặt thứ nhất
 *  là route ảnh của Phase 6): một `id` trong URL, gõ tay được. Bài bắt buộc của
 *  `PROJECT_CHECKLIST.md § Phase 7` là *"RLS chặn Sales đọc báo cáo của Sales
 *  khác — BR-003"*.
 *
 *  Đặt ở `tests/integration/` là **làm chúng vô nghĩa**: tầng đó nối Postgres
 *  bằng role `postgres`, mà role đó có `rolbypassrls` (DEC-031) nên mọi bài sẽ
 *  "xanh" kể cả khi không có một policy nào.
 *
 *  Bộ này còn khoá lại hai thứ mà unit test không với tới:
 *    • `listReportsByMonth` lọc theo `sales_id` **và** vẫn phải chịu RLS — nếu
 *      ai đó bỏ `.eq('sales_id')` đi thì Sales sẽ thấy báo cáo người khác nếu
 *      policy hỏng;
 *    • `count: 'exact'` đếm **sau** RLS, không phải trước.
 */

let fx: RlsFixture;

/** Tháng nghiệp vụ của fixture — mọi báo cáo dựng thêm đều nằm trong tháng này. */
let month: { from: string; to: string };
let monthKey: string;

/** Số báo cáo dựng thêm cho salesA để có nhiều hơn một trang. */
const EXTRA_REPORTS = REPORTS_PAGE_SIZE + 3;

beforeAll(async () => {
  fx = await setUpRlsFixture();

  /*
   * ─────────────────────────────────────────────────────────────────────────
   *  FIXTURE DÙNG **THÁNG TRƯỚC**, KHÔNG PHẢI THÁNG HIỆN TẠI
   * ─────────────────────────────────────────────────────────────────────────
   *  Bộ này cần > 20 báo cáo trong **một** tháng để chứng minh phân trang. Tháng
   *  hiện tại không đủ ngày nếu hôm nay là đầu tháng — và `ck_report_not_future`
   *  cấm bù bằng ngày tương lai. Lần chạy đầu tiên đã đỏ đúng vì lý do này
   *  (hôm nay là ngày 10 nên tháng hiện tại chỉ có 10 ngày dùng được).
   *
   *  Tháng trước thì luôn có ≥ 28 ngày và toàn bộ đều là quá khứ. Bài test vì
   *  vậy cho kết quả giống nhau ở mọi ngày trong năm — không có test nào được
   *  phép chỉ xanh vào nửa cuối tháng.
   */
  const previousMonth = shiftVietnamMonth(fx.today.slice(0, 7), -1);
  if (previousMonth === null) throw new Error(`Không lùi được tháng từ ${fx.today}`);
  monthKey = previousMonth;

  const range = getVietnamMonthRange(monthKey);
  if (range === null) throw new Error(`Tháng fixture không hợp lệ: ${monthKey}`);
  month = range;

  /*
   * Dựng báo cáo bằng SQL trực tiếp (kênh chỉ có ở local): bài test đo quyền
   * ĐỌC, không đo quyền tạo fixture. Mỗi ngày một dòng để không đụng
   * `UNIQUE(sales_id, report_date)`.
   */
  for (let day = 1; day <= EXTRA_REPORTS; day += 1) {
    await insertMorningReport(fx.ids.salesA, `${monthKey}-${String(day).padStart(2, '0')}`);
  }

  // Một báo cáo của salesB trong CÙNG tháng — để chắc chắn salesA không nhìn
  // thấy nó qua bất kỳ trang nào.
  await insertMorningReport(fx.ids.salesB, `${monthKey}-01`);
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

/** Đếm báo cáo THẬT trong tháng của một user, đo bằng SQL bỏ qua RLS. */
async function countInMonth(salesId: string): Promise<number> {
  const result = await sql<{ n: string }>(
    `select count(*)::text as n from public.daily_reports
      where sales_id = $1 and report_date between $2 and $3`,
    [salesId, month.from, month.to],
  );
  return Number(result.rows[0]?.n ?? '0');
}

describe('listReportsByMonth() — UC-09, FR-021', () => {
  it('Sales thấy đúng báo cáo của CHÍNH MÌNH trong tháng', async () => {
    const expected = await countInMonth(fx.ids.salesA);
    const { rows, pageInfo } = await listReportsByMonth(fx.clients.salesA, fx.ids.salesA, month, 1);

    expect(pageInfo.total).toBe(expected);
    expect(rows.length).toBe(Math.min(expected, REPORTS_PAGE_SIZE));
    expect(rows.length).toBeGreaterThan(0);
  });

  it('sắp xếp mới nhất trước — bám idx_daily_reports_sales_date_desc', async () => {
    const { rows } = await listReportsByMonth(fx.clients.salesA, fx.ids.salesA, month, 1);
    const dates = rows.map((row) => row.report_date);

    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('phân trang chạy ở SERVER — trang 1 và trang 2 không chồng nhau (NFR-002)', async () => {
    const first = await listReportsByMonth(fx.clients.salesA, fx.ids.salesA, month, 1);
    const second = await listReportsByMonth(fx.clients.salesA, fx.ids.salesA, month, 2);

    expect(first.rows).toHaveLength(REPORTS_PAGE_SIZE);
    expect(second.rows.length).toBeGreaterThan(0);

    const firstIds = new Set(first.rows.map((row) => row.id));
    for (const row of second.rows) {
      expect(firstIds.has(row.id), `id ${row.id} xuất hiện ở cả hai trang`).toBe(false);
    }

    // Không hở: dòng đầu trang 2 phải cũ hơn hoặc bằng dòng cuối trang 1.
    const lastOfFirst = first.rows.at(-1)?.report_date;
    const firstOfSecond = second.rows[0]?.report_date;
    expect(lastOfFirst).toBeDefined();
    expect(firstOfSecond).toBeDefined();
    expect(String(firstOfSecond) <= String(lastOfFirst)).toBe(true);
  });

  it('tổng số trang khớp tổng số dòng thật', async () => {
    const expected = await countInMonth(fx.ids.salesA);
    const { pageInfo } = await listReportsByMonth(fx.clients.salesA, fx.ids.salesA, month, 1);

    expect(pageInfo.total).toBe(expected);
    expect(pageInfo.pageCount).toBe(Math.max(1, Math.ceil(expected / REPORTS_PAGE_SIZE)));
  });

  /** ⚠ Bài quan trọng nhất của file — BR-003. */
  it('BR-003 — salesA truyền salesId của salesB vào thì RLS trả 0 dòng', async () => {
    const { rows, pageInfo } = await listReportsByMonth(
      fx.clients.salesA,
      fx.ids.salesB,
      month,
      1,
    );

    expect(rows).toHaveLength(0);
    // `count: 'exact'` phải đếm SAU khi RLS lọc, không phải trước.
    expect(pageInfo.total).toBe(0);
  });

  it('BR-003 — không dòng nào của salesB lọt vào danh sách của salesA', async () => {
    const salesBIds = new Set(
      (
        await sql<{ id: string }>('select id from public.daily_reports where sales_id = $1', [
          fx.ids.salesB,
        ])
      ).rows.map((row) => row.id),
    );

    expect(salesBIds.size).toBeGreaterThan(0);

    for (let page = 1; page <= 3; page += 1) {
      const { rows } = await listReportsByMonth(fx.clients.salesA, fx.ids.salesA, month, page);
      for (const row of rows) {
        expect(salesBIds.has(row.id), `báo cáo của salesB lọt vào trang ${page}`).toBe(false);
      }
    }
  });

  it('BR-022 — Admin đọc được lịch sử của một Sales bất kỳ', async () => {
    const expected = await countInMonth(fx.ids.salesA);
    const { rows, pageInfo } = await listReportsByMonth(fx.clients.admin, fx.ids.salesA, month, 1);

    expect(pageInfo.total).toBe(expected);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('BR-009 — tài khoản bị vô hiệu hoá giữa phiên không đọc được gì', async () => {
    const { rows, pageInfo } = await listReportsByMonth(
      fx.clients.inactive,
      fx.ids.inactive,
      month,
      1,
    );

    expect(rows).toHaveLength(0);
    expect(pageInfo.total).toBe(0);
  });

  it('anon KHÔNG đọc được gì — deny-by-default (NFR-004)', async () => {
    const { rows, pageInfo } = await listReportsByMonth(fx.anon, fx.ids.salesA, month, 1);

    expect(rows).toHaveLength(0);
    expect(pageInfo.total).toBe(0);
  });

  it('không lẫn báo cáo của tháng khác — khoảng lọc inclusive hai đầu', async () => {
    const { rows } = await listReportsByMonth(fx.clients.salesA, fx.ids.salesA, month, 1);

    for (const row of rows) {
      expect(row.report_date >= month.from, `${row.report_date} < ${month.from}`).toBe(true);
      expect(row.report_date <= month.to, `${row.report_date} > ${month.to}`).toBe(true);
    }
  });

  /**
   * ⚠ Bài này ghi lại một BUG THẬT đã xảy ra trong chính lần chạy đầu của bộ
   * test này (2026-08-10).
   *
   * PostgREST trả `416 PGRST103` cho một `range` nằm ngoài tập kết quả, **không**
   * trả mảng rỗng — và lúc đó nó cũng không kèm `count`. Bản `listReportsByMonth`
   * đầu tiên nuốt mọi lỗi thành "trang rỗng, total = 0", nên một tháng CÓ dữ
   * liệu lại hiện empty state "tháng này chưa có báo cáo" chỉ vì `?page=` còn
   * sót lại từ tháng trước. Cách sửa: đếm bằng truy vấn `head` rồi kẹp trang
   * bằng `buildPageInfo()`.
   */
  it('?page= vượt quá số trang → lùi về trang CUỐI CÙNG CÓ DỮ LIỆU, không phải empty state', async () => {
    const expected = await countInMonth(fx.ids.salesA);
    const lastPage = Math.ceil(expected / REPORTS_PAGE_SIZE);

    const { rows, pageInfo } = await listReportsByMonth(fx.clients.salesA, fx.ids.salesA, month, 99);

    expect(pageInfo.total).toBe(expected);
    expect(pageInfo.page).toBe(lastPage);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('?page= vượt quá số trang của một tháng THẬT SỰ rỗng vẫn trả rỗng', async () => {
    const emptyMonth = getVietnamMonthRange('2020-01');
    expect(emptyMonth).not.toBeNull();

    const { rows, pageInfo } = await listReportsByMonth(
      fx.clients.salesA,
      fx.ids.salesA,
      emptyMonth ?? month,
      99,
    );

    expect(rows).toHaveLength(0);
    expect(pageInfo.total).toBe(0);
  });

  it('không kéo cột text dài về — danh sách chỉ có 11 cột (NFR-002)', async () => {
    const { rows } = await listReportsByMonth(fx.clients.salesA, fx.ids.salesA, month, 1);
    const row = rows[0];

    expect(row).toBeDefined();
    expect(Object.keys(row ?? {}).sort()).toEqual(
      [
        'actual_customer_visits',
        'actual_revenue',
        'actual_sales_amount',
        'actual_visit_points',
        'id',
        'report_date',
        'status',
        'target_customer_visits',
        'target_revenue',
        'target_sales_amount',
        'target_visit_points',
      ].sort(),
    );
    expect(row).not.toHaveProperty('planned_route');
    expect(row).not.toHaveProperty('evening_note');
  });
});

describe('getReportById() — UC-10, FR-022', () => {
  it('Sales đọc được báo cáo của CHÍNH MÌNH, đủ cột nghiệp vụ', async () => {
    const report = await getReportById(fx.clients.salesA, fx.reports.salesA);

    expect(report).not.toBeNull();
    expect(report?.id).toBe(fx.reports.salesA);
    // Màn hình chi tiết cần `planned_route` cho `ReportNotes` — cột này KHÔNG
    // có ở `listReportsByMonth`, nên bài này chứng minh hai tập cột khác nhau.
    expect(report?.planned_route).toBeTruthy();
    expect(report?.sales_id).toBe(fx.ids.salesA);
  });

  /** ⚠ Bài IDOR — `PROJECT_CHECKLIST.md § Phase 7` mục cuối. */
  it('BR-003 — salesA KHÔNG đọc được báo cáo của salesB dù biết chính xác id', async () => {
    const stolen = await getReportById(fx.clients.salesA, fx.reports.salesB);

    // `null` ⇒ trang gọi `notFound()`. **Cố ý không phân biệt** với "id không
    // tồn tại": phân biệt hai ca là biến 404 thành kênh dò ID.
    expect(stolen).toBeNull();
  });

  it('id không tồn tại cũng trả null — KHÔNG phân biệt với "không có quyền"', async () => {
    const missing = await getReportById(
      fx.clients.salesA,
      '00000000-0000-4000-8000-000000000000',
    );

    expect(missing).toBeNull();
  });

  it('BR-022 — Admin đọc được báo cáo của Sales bất kỳ', async () => {
    const asAdmin = await getReportById(fx.clients.admin, fx.reports.salesB);

    expect(asAdmin).not.toBeNull();
    expect(asAdmin?.id).toBe(fx.reports.salesB);
  });

  it('BR-009 — tài khoản bị vô hiệu hoá giữa phiên nhận null', async () => {
    expect(await getReportById(fx.clients.inactive, fx.reports.salesA)).toBeNull();
  });

  it('anon nhận null — deny-by-default (NFR-004)', async () => {
    expect(await getReportById(fx.anon, fx.reports.salesA)).toBeNull();
  });
});
