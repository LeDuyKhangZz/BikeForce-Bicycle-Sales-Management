import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getVietnamMonthRange } from '@/lib/date';
import {
  getAdminDailyTrend,
  getAdminMonthlySummary,
  getAdminTodayOverview,
  getMissingReportAlerts,
  getSalesPerformance,
} from '@/services/admin';

import { closePool, sql } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

/**
 * TẦNG 3 — bốn hàm RPC của `0006_admin_aggregates.sql` dưới JWT THẬT.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO BỘ NÀY BẮT BUỘC PHẢI CÓ
 * ─────────────────────────────────────────────────────────────────────────
 *  Mỗi hàm SQL mới là một **bề mặt tấn công mới**: nó gọi được bằng một dòng
 *  `supabase.rpc(...)` từ DevTools của bất kỳ ai đã đăng nhập, không đi qua
 *  middleware, không đi qua layout guard. Một hàm tổng hợp viết nhầm thành
 *  `security definer` sẽ phát số liệu doanh thu toàn đội cho mọi Sales.
 *
 *  Hai lớp phải cùng đúng, và bộ này đo cả hai:
 *    1. `security invoker` ⇒ mọi `select` bên trong vẫn qua RLS;
 *    2. guard `(select public.is_admin())` ⇒ non-admin nhận 0 dòng.
 *
 *  Phải ở `tests/rls/`: tầng integration nối bằng role `postgres` có
 *  `rolbypassrls` (DEC-031) nên sẽ "xanh" kể cả khi hàm là `security definer`.
 */

let fx: RlsFixture;
let month: { from: string; to: string };

beforeAll(async () => {
  fx = await setUpRlsFixture();

  const range = getVietnamMonthRange(fx.today.slice(0, 7));
  if (range === null) throw new Error(`Tháng fixture không hợp lệ: ${fx.today}`);
  month = range;

  // Hoàn tất báo cáo của salesA để có số liệu `actual_*` thật trong tháng.
  // Ghi bằng SQL trực tiếp: bài test đo quyền ĐỌC, không đo quyền ghi.
  await sql(
    `update public.daily_reports
        set status = 'COMPLETED',
            actual_route = 'Tuyen thuc te',
            actual_visit_points = 14,
            actual_sales_amount = 90000000,
            actual_revenue = 150000000,
            actual_customer_visits = 15,
            evening_submitted_at = now()
      where id = $1`,
    [fx.reports.salesA],
  );
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

describe('admin_today_overview — UC-12, FR-024, AF-01', () => {
  it('Admin nhận đủ 12 chỉ số với số liệu thật', async () => {
    const overview = await getAdminTodayOverview(fx.clients.admin, fx.today);

    // Fixture có salesA và salesB active (inactive đã bị tắt, admin không phải SALES).
    expect(overview.active_sales_count).toBeGreaterThanOrEqual(2);
    expect(overview.morning_submitted_count).toBeGreaterThanOrEqual(2);
    expect(overview.completed_count).toBeGreaterThanOrEqual(1);
    expect(overview.actual_sales_amount).toBeGreaterThanOrEqual(12);
    expect(overview.actual_revenue).toBeGreaterThanOrEqual(150_000_000);
  });

  it('bốn con số đếm nhất quán: chưa báo cáo = active − đã cam kết sáng', async () => {
    const overview = await getAdminTodayOverview(fx.clients.admin, fx.today);

    expect(overview.no_report_count).toBe(
      overview.active_sales_count - overview.morning_submitted_count,
    );
    // Đã hoàn tất là tập CON của đã cam kết sáng (BR-008 — không nhảy bước).
    expect(overview.completed_count).toBeLessThanOrEqual(overview.morning_submitted_count);
  });

  it('không chỉ số nào là null hay NaN', async () => {
    const overview = await getAdminTodayOverview(fx.clients.admin, fx.today);

    for (const [key, value] of Object.entries(overview)) {
      expect(typeof value, key).toBe('number');
      expect(Number.isFinite(value), key).toBe(true);
      expect(value, key).toBeGreaterThanOrEqual(0);
    }
  });

  /** ⚠ Bài quan trọng nhất: hàm KHÔNG được trở thành cửa hậu đọc số toàn đội. */
  it('Sales gọi thẳng RPC → toàn số 0, KHÔNG thấy số liệu đội', async () => {
    const asSales = await getAdminTodayOverview(fx.clients.salesA, fx.today);

    expect(asSales.active_sales_count).toBe(0);
    expect(asSales.morning_submitted_count).toBe(0);
    expect(asSales.completed_count).toBe(0);
    expect(asSales.actual_revenue).toBe(0);
    expect(asSales.target_revenue).toBe(0);
  });

  it('tài khoản bị vô hiệu hoá giữa phiên → toàn số 0 (BR-009)', async () => {
    const asInactive = await getAdminTodayOverview(fx.clients.inactive, fx.today);
    expect(asInactive.active_sales_count).toBe(0);
    expect(asInactive.actual_revenue).toBe(0);
  });

  it('anon → toàn số 0, deny-by-default (NFR-004)', async () => {
    const asAnon = await getAdminTodayOverview(fx.anon, fx.today);
    expect(asAnon.active_sales_count).toBe(0);
    expect(asAnon.actual_revenue).toBe(0);
  });
});

describe('admin_missing_report_alerts — UC-20, FR-033, AF-02', () => {
  it('Admin thấy salesB (đã cam kết sáng, chưa hoàn tất) trong nhóm NOT_COMPLETED', async () => {
    const alerts = await getMissingReportAlerts(fx.clients.admin, fx.today);
    const salesB = alerts.find((alert) => alert.id === fx.ids.salesB);

    expect(salesB).toBeDefined();
    expect(salesB?.alert_kind).toBe('NOT_COMPLETED');
  });

  it('salesA đã hoàn tất nên KHÔNG nằm trong danh sách cảnh báo', async () => {
    const alerts = await getMissingReportAlerts(fx.clients.admin, fx.today);
    expect(alerts.some((alert) => alert.id === fx.ids.salesA)).toBe(false);
  });

  it('tài khoản inactive KHÔNG bị cảnh báo — đã nghỉ thì không phải nhắc', async () => {
    const alerts = await getMissingReportAlerts(fx.clients.admin, fx.today);
    expect(alerts.some((alert) => alert.id === fx.ids.inactive)).toBe(false);
  });

  it('nhóm NO_REPORT đứng TRƯỚC nhóm NOT_COMPLETED', async () => {
    // Một ngày trong quá khứ mà không ai có báo cáo ⇒ mọi Sales active đều NO_REPORT.
    const alerts = await getMissingReportAlerts(fx.clients.admin, '2020-01-15');
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.every((alert) => alert.alert_kind === 'NO_REPORT')).toBe(true);

    const mixed = await getMissingReportAlerts(fx.clients.admin, fx.today);
    const kinds = mixed.map((alert) => alert.alert_kind);
    const lastNoReport = kinds.lastIndexOf('NO_REPORT');
    const firstNotCompleted = kinds.indexOf('NOT_COMPLETED');

    if (lastNoReport !== -1 && firstNotCompleted !== -1) {
      expect(lastNoReport).toBeLessThan(firstNotCompleted);
    }
  });

  it('Sales gọi thẳng RPC → danh sách RỖNG, không lộ tên đồng nghiệp', async () => {
    expect(await getMissingReportAlerts(fx.clients.salesA, fx.today)).toHaveLength(0);
  });

  it('anon → danh sách rỗng', async () => {
    expect(await getMissingReportAlerts(fx.anon, fx.today)).toHaveLength(0);
  });
});

describe('admin_monthly_summary — UC-15, FR-028, AF-05', () => {
  it('Admin nhận tổng của các báo cáo ĐÃ HOÀN TẤT trong tháng', async () => {
    const summary = await getAdminMonthlySummary(fx.clients.admin, month);

    expect(summary.report_count).toBeGreaterThanOrEqual(1);
    expect(summary.sales_count).toBeGreaterThanOrEqual(1);
    expect(summary.actual_revenue).toBeGreaterThanOrEqual(150_000_000);
  });

  it('báo cáo CHƯA hoàn tất không được cộng vào cột thực đạt', async () => {
    const summary = await getAdminMonthlySummary(fx.clients.admin, month);

    // Chỉ salesA đã COMPLETED; salesB vẫn MORNING_SUBMITTED nên không được đếm.
    const completedCount = await sql<{ n: string }>(
      `select count(*)::text as n from public.daily_reports
        where report_date between $1 and $2 and status = 'COMPLETED'`,
      [month.from, month.to],
    );

    expect(summary.report_count).toBe(Number(completedCount.rows[0]?.n ?? '0'));
  });

  it('khoảng ngày không có dữ liệu → toàn 0, KHÔNG null', async () => {
    const summary = await getAdminMonthlySummary(fx.clients.admin, {
      from: '2020-01-01',
      to: '2020-01-31',
    });

    for (const [key, value] of Object.entries(summary)) {
      expect(value, key).toBe(0);
    }
  });

  it('Sales gọi thẳng RPC → toàn số 0', async () => {
    const asSales = await getAdminMonthlySummary(fx.clients.salesA, month);
    expect(asSales.report_count).toBe(0);
    expect(asSales.actual_revenue).toBe(0);
  });
});

describe('admin_sales_performance — UC-16, FR-029, AF-06', () => {
  it('Admin thấy MỌI Sales, gồm cả người chưa có báo cáo nào', async () => {
    const rows = await getSalesPerformance(fx.clients.admin, month);
    const ids = rows.map((row) => row.sales_id);

    expect(ids).toContain(fx.ids.salesA);
    expect(ids).toContain(fx.ids.salesB);
    // Người đã bị vô hiệu hoá vẫn phải xuất hiện — lịch sử của họ không biến mất.
    expect(ids).toContain(fx.ids.inactive);
  });

  it('Admin KHÔNG xuất hiện trong bảng — bảng này chỉ dành cho Sales', async () => {
    const rows = await getSalesPerformance(fx.clients.admin, month);
    expect(rows.map((row) => row.sales_id)).not.toContain(fx.ids.admin);
  });

  it('BR-024 — số ngày đạt KPI đếm đúng ngày đạt CẢ BỐN chỉ tiêu', async () => {
    const rows = await getSalesPerformance(fx.clients.admin, month);
    const salesA = rows.find((row) => row.sales_id === fx.ids.salesA);

    expect(salesA).toBeDefined();
    expect(salesA?.report_count).toBe(1);
    // Fixture (PHASE 13): target 12 điểm / 80tr / 100tr / 8 khách ·
    // actual 14 điểm / 90tr / 150tr / 15 khách ⇒ vượt cả bốn.
    expect(salesA?.kpi_achieved_days).toBe(1);
  });

  it('Sales chưa có báo cáo nào → toàn 0, KHÔNG null (an toàn cho lib/kpi)', async () => {
    const rows = await getSalesPerformance(fx.clients.admin, month);
    const inactive = rows.find((row) => row.sales_id === fx.ids.inactive);

    expect(inactive).toBeDefined();
    expect(inactive?.report_count).toBe(0);
    expect(inactive?.kpi_achieved_days).toBe(0);
    expect(inactive?.target_revenue).toBe(0);
    expect(inactive?.actual_revenue).toBe(0);
  });

  it('cờ is_active được trả về để giao diện phân biệt người đã nghỉ', async () => {
    const rows = await getSalesPerformance(fx.clients.admin, month);

    expect(rows.find((row) => row.sales_id === fx.ids.salesA)?.is_active).toBe(true);
    expect(rows.find((row) => row.sales_id === fx.ids.inactive)?.is_active).toBe(false);
  });

  it('Sales gọi thẳng RPC → danh sách RỖNG, không lộ hiệu suất đồng nghiệp', async () => {
    expect(await getSalesPerformance(fx.clients.salesA, month)).toHaveLength(0);
  });

  it('anon → danh sách rỗng', async () => {
    expect(await getSalesPerformance(fx.anon, month)).toHaveLength(0);
  });
});

describe('admin_daily_trend — UC-15, FR-037, AF-08 (migration 0007)', () => {
  it('Admin nhận một dòng cho mỗi NGÀY có báo cáo đã hoàn tất', async () => {
    const trend = await getAdminDailyTrend(fx.clients.admin, month);

    expect(trend.length).toBeGreaterThanOrEqual(1);

    const today = trend.find((day) => day.report_date === fx.today);
    expect(today).toBeDefined();
    expect(today?.report_count).toBeGreaterThanOrEqual(1);
    expect(today?.actual_revenue).toBeGreaterThanOrEqual(150_000_000);
  });

  it('ngày CHƯA có báo cáo hoàn tất không xuất hiện — không bịa cột 0', async () => {
    /*
     * Đây là bất biến quan trọng nhất của hàm này: v1 không có khái niệm ngày
     * nghỉ (DEC-030), nên một cột 0 cho Chủ nhật là số liệu bịa. Xem chú thích
     * đầu `0007_admin_daily_trend.sql`.
     */
    const trend = await getAdminDailyTrend(fx.clients.admin, month);
    const daysWithCompleted = await sql<{ report_date: Date }>(
      `select distinct report_date from public.daily_reports
        where report_date between $1 and $2 and status = 'COMPLETED'`,
      [month.from, month.to],
    );

    expect(trend).toHaveLength(daysWithCompleted.rowCount ?? 0);
  });

  it('trả về theo thứ tự ngày tăng dần — trục thời gian đọc trái sang phải', async () => {
    const trend = await getAdminDailyTrend(fx.clients.admin, month);
    const dates = trend.map((day) => day.report_date);

    expect([...dates].sort()).toEqual(dates);
  });

  it('không ô số nào là null hay NaN — biểu đồ không bao giờ nhận NaN', async () => {
    const trend = await getAdminDailyTrend(fx.clients.admin, month);

    for (const day of trend) {
      for (const [key, value] of Object.entries(day)) {
        if (key === 'report_date') continue;
        expect(typeof value, key).toBe('number');
        expect(Number.isFinite(value), key).toBe(true);
        expect(value, key).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('khoảng ngày không có dữ liệu → mảng rỗng, không ném lỗi', async () => {
    const trend = await getAdminDailyTrend(fx.clients.admin, {
      from: '2020-01-01',
      to: '2020-01-31',
    });

    expect(trend).toEqual([]);
  });

  it('Sales gọi thẳng RPC → RỖNG, không lộ doanh thu theo ngày của đội', async () => {
    expect(await getAdminDailyTrend(fx.clients.salesA, month)).toHaveLength(0);
  });

  it('tài khoản inactive giữa phiên → rỗng (BR-009)', async () => {
    expect(await getAdminDailyTrend(fx.clients.inactive, month)).toHaveLength(0);
  });

  it('anon → rỗng, deny-by-default (NFR-004)', async () => {
    expect(await getAdminDailyTrend(fx.anon, month)).toHaveLength(0);
  });
});
