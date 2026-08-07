import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { completeEveningReport, getTodayReport } from '@/services/reports';

import { closePool, insertMorningReport, sql } from '../integration/setup';
import { clearReportsOf, setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

/**
 * TẦNG 3 — `services/reports.completeEveningReport()` chạy dưới JWT THẬT.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO FILE NÀY Ở `tests/rls/` CHỨ KHÔNG Ở `tests/integration/`
 * ─────────────────────────────────────────────────────────────────────────
 *  Tầng integration kết nối Postgres trực tiếp bằng role `postgres` (DEC-031),
 *  mà role đó có `rolbypassrls` — chạy service function ở đó sẽ "xanh" kể cả khi
 *  policy sai hoàn toàn. Hàm này chỉ được kiểm chứng thật khi nó chạy qua đúng
 *  đường dữ liệu của ứng dụng: `SupabaseClient` mang JWT của một Sales cụ thể,
 *  đi qua PostgREST, và bị `reports_update_own_open` gác.
 *
 *  Ba bài dưới đây kiểm ĐÚNG phần mà unit test không với tới được: việc dịch
 *  "0 dòng khớp" thành `REJECTED`, và việc bốn cột `actual_*` + `status` +
 *  `evening_submitted_at` phải đi chung MỘT câu lệnh để
 *  `ck_completed_requires_actuals` không bao giờ thấy trạng thái nửa vời.
 */

let fx: RlsFixture;

/** Thực đạt hợp lệ — đúng tập cột mà `EveningReportWrite` cho phép ghi. */
const ACTUALS = {
  actual_route: 'Quận 1 → Quận 3 → Quận 5',
  actual_visit_points: 4,
  actual_sales_quantity: 6,
  actual_revenue: 120_000_000,
  actual_customer_visits: 9,
  evening_note: 'Chốt thêm một đơn ngoài kế hoạch.',
};

beforeAll(async () => {
  fx = await setUpRlsFixture();
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

/** Mỗi bài bắt đầu từ đúng một báo cáo `MORNING_SUBMITTED` của salesA. */
beforeEach(async () => {
  await clearReportsOf(fx.ids.salesA);
  fx.reports.salesA = await insertMorningReport(fx.ids.salesA, fx.today);
});

describe('completeEveningReport() — UC-06, FR-015', () => {
  it('BR-008 — chuyển MORNING_SUBMITTED → COMPLETED và ghi đủ 6 cột trong MỘT câu lệnh', async () => {
    const submittedAt = new Date().toISOString();

    const result = await completeEveningReport(
      fx.clients.salesA,
      fx.reports.salesA,
      fx.ids.salesA,
      submittedAt,
      ACTUALS,
    );

    expect(result).toEqual({ ok: true, reportId: fx.reports.salesA });

    const saved = await getTodayReport(fx.clients.salesA, fx.ids.salesA, fx.today);

    expect(saved).toMatchObject({ status: 'COMPLETED', ...ACTUALS });
    expect(saved?.evening_submitted_at).not.toBeNull();

    // Các cột cam kết sáng KHÔNG bị đụng tới (docs/03 §11.3 kịch bản 1).
    expect(saved).toMatchObject({ target_sales_quantity: 5, target_revenue: 100_000_000 });
  });

  it('BR-019 — lần hoàn tất THỨ HAI bị từ chối, báo cáo đã tự khoá', async () => {
    const first = await completeEveningReport(
      fx.clients.salesA,
      fx.reports.salesA,
      fx.ids.salesA,
      new Date().toISOString(),
      ACTUALS,
    );
    expect(first.ok).toBe(true);

    const second = await completeEveningReport(
      fx.clients.salesA,
      fx.reports.salesA,
      fx.ids.salesA,
      new Date().toISOString(),
      { ...ACTUALS, actual_revenue: 999_000_000 },
    );

    // 0 dòng khớp vì USING đánh giá trên dòng CŨ, mà dòng cũ đã COMPLETED.
    expect(second).toEqual({ ok: false, error: 'REJECTED' });

    // Và quan trọng hơn: dữ liệu KHÔNG bị ghi đè.
    const saved = await getTodayReport(fx.clients.salesA, fx.ids.salesA, fx.today);
    expect(saved?.actual_revenue).toBe(ACTUALS.actual_revenue);
  });

  it('BR-003 — salesB không hoàn tất được báo cáo của salesA, dù đoán đúng cả hai id', async () => {
    const result = await completeEveningReport(
      fx.clients.salesB,
      fx.reports.salesA,
      // Kẻ tấn công gửi luôn `sales_id` của nạn nhân để qua mặt `.eq('sales_id')`.
      // RLS mới là thứ chặn thật: `auth.uid()` của JWT vẫn là salesB.
      fx.ids.salesA,
      new Date().toISOString(),
      ACTUALS,
    );

    expect(result).toEqual({ ok: false, error: 'REJECTED' });

    const untouched = await sql<{ status: string }>(
      'select status from public.daily_reports where id = $1',
      [fx.reports.salesA],
    );
    expect(untouched.rows[0]?.status).toBe('MORNING_SUBMITTED');
  });

  it('BR-009 — tài khoản bị vô hiệu hoá giữa phiên không hoàn tất được, dù JWT còn hạn', async () => {
    const reportId = await insertMorningReport(fx.ids.inactive, fx.today);

    const result = await completeEveningReport(
      fx.clients.inactive,
      reportId,
      fx.ids.inactive,
      new Date().toISOString(),
      ACTUALS,
    );

    // `is_active_sales()` trong USING trả về false ⇒ 0 dòng khớp.
    expect(result).toEqual({ ok: false, error: 'REJECTED' });
  });

  it('BR-020 — Admin cũng không hoàn tất hộ báo cáo của Sales', async () => {
    const result = await completeEveningReport(
      fx.clients.admin,
      fx.reports.salesA,
      fx.ids.salesA,
      new Date().toISOString(),
      ACTUALS,
    );

    // Không tồn tại UPDATE policy nào cho Admin trên `daily_reports` (DEC-026).
    expect(result).toEqual({ ok: false, error: 'REJECTED' });
  });

  it('BR-007 — thiếu một chỉ số actual thì CHECK chặn, và lỗi được dịch thành REJECTED', async () => {
    // Bỏ qua tầng Zod để chứng minh database vẫn tự đứng được một mình: đây đúng
    // là kịch bản một payload bị sửa tay gửi thẳng vào PostgREST.
    const result = await completeEveningReport(
      fx.clients.salesA,
      fx.reports.salesA,
      fx.ids.salesA,
      new Date().toISOString(),
      { ...ACTUALS, actual_revenue: null },
    );

    // `23514` trên `ck_completed_requires_actuals` → REJECTED, không phải UNKNOWN.
    expect(result).toEqual({ ok: false, error: 'REJECTED' });

    const saved = await getTodayReport(fx.clients.salesA, fx.ids.salesA, fx.today);
    expect(saved?.status).toBe('MORNING_SUBMITTED');
  });

  it('BR-021 — báo cáo của NGÀY CŨ vẫn đang mở cũng không hoàn tất được', async () => {
    // Lớp chặn ở đây là `reports_update_own_open`? KHÔNG — policy đó không nhắc
    // gì tới `report_date`, nên nó CHO PHÉP. Thứ chặn thật là Server Action:
    // nó chỉ chấp nhận `report_id` trùng với báo cáo của `vn_today()`.
    // Bài này khoá lại đúng sự thật đó để không ai tưởng nhầm RLS đã lo hộ.
    await clearReportsOf(fx.ids.salesA);
    const yesterday = await sql<{ d: string }>(
      "select to_char(public.vn_today() - 1, 'YYYY-MM-DD') as d",
    );
    const oldReportId = await insertMorningReport(fx.ids.salesA, yesterday.rows[0]!.d);

    const result = await completeEveningReport(
      fx.clients.salesA,
      oldReportId,
      fx.ids.salesA,
      new Date().toISOString(),
      ACTUALS,
    );

    expect(result.ok).toBe(true);

    // Bằng chứng cho câu trên: nếu ngày nào đó RLS được siết thêm điều kiện
    // `report_date = vn_today()` thì bài này sẽ đỏ và buộc phải đọc lại chú
    // thích — đúng thứ ta muốn.
  });
});
