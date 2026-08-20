import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getReportForShare, listMonthToDateMetrics } from '@/services/reports';
import { shareMonthRange } from '@/lib/reports/share-card';

import { closePool } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

/**
 * TẦNG 3 — `services/reports.getReportForShare()` chạy dưới JWT THẬT.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO BỘ NÀY BẮT BUỘC PHẢI CÓ
 * ─────────────────────────────────────────────────────────────────────────
 *  `GET /api/reports/[id]/share-image` là **bề mặt IDOR rõ ràng nhất của hệ
 *  thống** (`docs/07 §4.1`): một `id` trong URL, không có form, không có CSRF
 *  token, gọi được bằng một dòng `curl`. Bài bắt buộc của `AGENTS.md §11` cho
 *  Phase 6 là: *salesA gọi share-image với id của salesB → 403/404*.
 *
 *  Nó phải nằm ở `tests/rls/` chứ không phải `tests/integration/`: tầng
 *  integration nối Postgres bằng role `postgres`, mà role đó có `rolbypassrls`
 *  (DEC-031) nên sẽ "xanh" kể cả khi policy sai hoàn toàn.
 *
 *  Bộ này còn khoá lại một thứ nữa mà unit test không với tới: cú pháp embedded
 *  resource `sales:profiles!inner(...)`. Nếu tên quan hệ sai, `data` trả về
 *  `null` và thẻ ảnh mất tên Sales — mà route vẫn trả 404 nên trông hệt như
 *  "không có quyền".
 */

let fx: RlsFixture;

beforeAll(async () => {
  fx = await setUpRlsFixture();
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

describe('getReportForShare() — UC-08, FR-018', () => {
  it('Sales đọc được báo cáo của CHÍNH MÌNH, kèm tên và mã nhân viên', async () => {
    const report = await getReportForShare(fx.clients.salesA, fx.reports.salesA);

    expect(report).not.toBeNull();
    expect(report?.id).toBe(fx.reports.salesA);
    // Chứng minh embedded resource `sales:profiles!inner(...)` đúng tên quan hệ.
    // `amis_employee_name` vào truy vấn từ PHASE 19 (DEC-070) — fixture chưa map
    // tên AMIS nên là `null`, và `toEqual` đòi khớp ĐỦ khoá nên phải kể ra đây.
    expect(report?.sales).toEqual({
      full_name: 'RLS Sales A',
      employee_code: 'RLS-A',
      amis_employee_name: null,
    });
  });

  it('trả về `status` để route handler chọn BIẾN THỂ ảnh — fixture đang MORNING_SUBMITTED', async () => {
    const report = await getReportForShare(fx.clients.salesA, fx.reports.salesA);

    // PHASE 14 (DEC-058): giá trị này cho ra thẻ bản `MORNING` (bảng 2 cột) chứ
    // không còn cho ra 403 `NOT_COMPLETED` như trước. Service KHÔNG tự lọc theo
    // status: quyết định nghiệp vụ thuộc về tầng gọi (AGENTS.md §5).
    expect(report?.status).toBe('MORNING_SUBMITTED');
  });

  it('BR-003 — salesA KHÔNG đọc được báo cáo của salesB dù biết chính xác id', async () => {
    const stolen = await getReportForShare(fx.clients.salesA, fx.reports.salesB);

    // RLS `reports_select_own_or_admin` trả 0 dòng ⇒ `null` ⇒ route trả 404,
    // giống hệt trường hợp id không tồn tại. Đó là điều kiện chống dò ID.
    expect(stolen).toBeNull();
  });

  it('BR-022 — Admin đọc được báo cáo của Sales bất kỳ qua đúng route đó', async () => {
    const report = await getReportForShare(fx.clients.admin, fx.reports.salesA);

    expect(report).not.toBeNull();
    expect(report?.sales.full_name).toBe('RLS Sales A');
  });

  it('chưa đăng nhập thì không đọc được gì — deny-by-default (NFR-004)', async () => {
    expect(await getReportForShare(fx.anon, fx.reports.salesA)).toBeNull();
  });

  it('id không tồn tại trả `null` giống hệt id không có quyền', async () => {
    const missing = await getReportForShare(
      fx.clients.salesA,
      '11111111-2222-3333-4444-555555555555',
    );

    expect(missing).toBeNull();
  });

  it('trả `sales_id` để cộng lũy kế tháng — DEC-068', async () => {
    const report = await getReportForShare(fx.clients.salesA, fx.reports.salesA);

    expect(report?.sales_id).toBe(fx.ids.salesA);
  });
});

describe('listMonthToDateMetrics() — lũy kế tháng của thẻ ảnh (PHASE 17, DEC-068)', () => {
  /** Khoảng của tấm ảnh CHIỀU hôm nay: từ đầu tháng đến hết hôm nay. */
  function rangeOfToday() {
    const range = shareMonthRange(fx.today, 'EVENING');
    expect(range).not.toBeNull();
    return range!;
  }

  it('Sales đọc được các ngày của CHÍNH MÌNH trong khoảng', async () => {
    const rows = await listMonthToDateMetrics(fx.clients.salesA, fx.ids.salesA, rangeOfToday());

    expect(rows).not.toBeNull();
    expect(rows?.length).toBeGreaterThanOrEqual(1);
    // Đúng tập cột `summarizeMonthToDate()` cần — không kéo thừa cột nào.
    expect(Object.keys(rows![0]!).sort()).toEqual([
      'actual_customer_visits',
      'actual_revenue',
      'actual_sales_amount',
      'actual_visit_points',
      'target_customer_visits',
      'target_revenue',
      'target_sales_amount',
      'target_visit_points',
    ]);
  });

  /**
   * Bài quan trọng nhất của hàm này. `salesId` là một THAM SỐ, nên kẻ tấn công
   * truyền id của người khác vào là chuyện tầm thường — thứ chặn nó phải là RLS
   * (`reports_select_own_or_admin`), không phải một dòng if ở tầng ứng dụng.
   * Nếu bài này đỏ thì cụm lũy kế đang rò dữ liệu doanh số của Sales khác.
   */
  it('BR-003 — salesA truyền id của salesB vẫn nhận MẢNG RỖNG, không phải dữ liệu', async () => {
    const stolen = await listMonthToDateMetrics(fx.clients.salesA, fx.ids.salesB, rangeOfToday());

    expect(stolen).toEqual([]);
  });

  it('BR-022 — Admin cộng được lũy kế của Sales bất kỳ (xuất ảnh hộ)', async () => {
    const rows = await listMonthToDateMetrics(fx.clients.admin, fx.ids.salesA, rangeOfToday());

    expect(rows?.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * ⚠ Anon nhận **`null`** chứ không phải `[]`, và khác biệt đó có ý nghĩa: vai
   * `anon` **không hề có `GRANT SELECT`** trên `daily_reports` (DEC-031), nên
   * PostgREST từ chối ngay ở tầng quyền (`42501`) thay vì chạy truy vấn rồi lọc
   * bằng RLS. Hàm dịch mọi lỗi thành `null`. Cả hai đường đều là "không đọc được
   * gì" — bài này khoá lại điều quan trọng nhất: **không có dòng dữ liệu nào**.
   */
  it('chưa đăng nhập thì không đọc được gì — deny-by-default (NFR-004)', async () => {
    const rows = await listMonthToDateMetrics(fx.anon, fx.ids.salesA, rangeOfToday());

    expect(rows).toBeNull();
    expect(rows ?? []).toHaveLength(0);
  });

  it('khoảng không chứa ngày nào trả mảng rỗng, KHÔNG lỗi', async () => {
    const rows = await listMonthToDateMetrics(fx.clients.salesA, fx.ids.salesA, {
      from: '1999-01-01',
      to: '1999-01-31',
    });

    expect(rows).toEqual([]);
  });
});
