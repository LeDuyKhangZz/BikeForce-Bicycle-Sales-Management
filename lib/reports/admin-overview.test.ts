/**
 * Unit test cho `lib/reports/admin-overview.ts` — PHASE 8.
 *
 * Hai bất biến bắt buộc:
 *   • **Không bao giờ** `NaN` / `Infinity` / `∞` lọt ra 12 ô số, kể cả khi cả
 *     đội đặt target = 0 hoặc chưa có Sales nào (BR-015, Master Spec §9).
 *   • Bốn dòng target vs actual phải đi qua `lib/kpi.ts`, không tính lại — bài
 *     "so với calculateAchievement" bên dưới khoá điều đó.
 */
import { describe, expect, it } from 'vitest';

import { formatCurrencyVND } from '@/lib/currency';
import { calculateAchievement } from '@/lib/kpi';

import { percentDisplay, toAdminOverview, type AdminOverviewSource } from './admin-overview';

function makeSource(overrides: Partial<AdminOverviewSource> = {}): AdminOverviewSource {
  return {
    active_sales_count: 5,
    morning_submitted_count: 4,
    completed_count: 3,
    no_report_count: 1,
    target_visit_points: 25,
    actual_visit_points: 20,
    target_sales_amount: 50,
    actual_sales_amount: 55,
    target_revenue: 500_000_000,
    actual_revenue: 400_000_000,
    target_customer_visits: 100,
    actual_customer_visits: 100,
    ...overrides,
  };
}

describe('toAdminOverview — 4 ô đếm người (chỉ số 1…4)', () => {
  const view = toAdminOverview(makeSource());

  it('có đúng 4 ô, theo đúng thứ tự của docs/01 §12.1', () => {
    expect(view.headcountTiles.map((tile) => tile.key)).toEqual([
      'ACTIVE_SALES',
      'MORNING_SUBMITTED',
      'COMPLETED',
      'NO_REPORT',
    ]);
  });

  it('giá trị khớp số liệu thô', () => {
    expect(view.headcountTiles.map((tile) => tile.value)).toEqual(['5', '4', '3', '1']);
  });

  it('số người đã cam kết sáng nhưng chưa hoàn tất = morning − completed', () => {
    expect(view.notCompletedCount).toBe(1);
    expect(view.headcountTiles[1]?.hint).toBe('1 người chưa hoàn tất cuối ngày');
  });

  it('tỷ lệ hoàn tất tính trên số Sales ĐANG HOẠT ĐỘNG', () => {
    expect(view.completionPercent).toBeCloseTo(60);
    expect(view.headcountTiles[2]?.hint).toBe('60,0% toàn đội');
  });

  it('ô "Chưa báo cáo" đảo chiều — 0 người mới là tốt', () => {
    expect(toAdminOverview(makeSource({ no_report_count: 0 })).headcountTiles[3]?.tone).toBe(
      'success',
    );
    expect(toAdminOverview(makeSource({ no_report_count: 2 })).headcountTiles[3]?.tone).toBe(
      'danger',
    );
  });

  it.each([
    ['cả đội đã xong', 5, 5, 'success'],
    ['quá nửa', 5, 3, 'warning'],
    ['dưới ngưỡng', 5, 1, 'danger'],
  ])('traffic-light: %s', (_label, active, completed, expectedTone) => {
    const view2 = toAdminOverview(
      makeSource({ active_sales_count: active, completed_count: completed }),
    );
    expect(view2.headcountTiles[2]?.tone).toBe(expectedTone);
  });

  /** Mẫu số 0 — "không có ai để tính" khác hẳn "không ai làm được gì". */
  it('chưa có Sales active nào → completionPercent null, tone trung tính, KHÔNG NaN', () => {
    const empty = toAdminOverview(
      makeSource({
        active_sales_count: 0,
        morning_submitted_count: 0,
        completed_count: 0,
        no_report_count: 0,
      }),
    );

    expect(empty.completionPercent).toBeNull();
    expect(empty.headcountTiles[2]?.tone).toBe('neutral');
    expect(empty.headcountTiles[2]?.hint).toBeNull();

    for (const tile of empty.headcountTiles) {
      expect(tile.value).not.toMatch(/NaN|Infinity|∞/);
    }
  });

  it('số liệu rác (âm) không sinh giá trị âm trên giao diện', () => {
    const view2 = toAdminOverview(
      makeSource({ active_sales_count: -3, morning_submitted_count: -1, completed_count: -1 }),
    );

    for (const tile of view2.headcountTiles) {
      expect(Number(tile.value)).toBeGreaterThanOrEqual(0);
    }
    expect(view2.notCompletedCount).toBeGreaterThanOrEqual(0);
  });
});

describe('toAdminOverview — 4 dòng target vs actual (chỉ số 5…12)', () => {
  it('có đúng 4 dòng, đúng thứ tự KPI_METRIC_ROWS', () => {
    const view = toAdminOverview(makeSource());
    expect(view.metricRows.map((row) => row.metric)).toEqual([
      'VISIT_POINTS',
      'SALES_AMOUNT',
      'REVENUE',
      'CUSTOMER_VISITS',
    ]);
  });

  /** ⚠ Khoá lại NFR-012: không có công thức `%` thứ hai trong dự án. */
  it('kết quả GIỐNG HỆT calculateAchievement — không tính lại công thức', () => {
    const source = makeSource();
    const view = toAdminOverview(source);

    expect(view.metricRows[1]?.result).toEqual(
      calculateAchievement(
        source.target_sales_amount,
        source.actual_sales_amount,
        'SALES_AMOUNT',
      ),
    );
    expect(view.metricRows[2]?.result).toEqual(
      calculateAchievement(source.target_revenue, source.actual_revenue, 'REVENUE'),
    );
  });

  it('đơn vị lấy từ formatMetricValue, không tự ghép chuỗi', () => {
    const view = toAdminOverview(makeSource());
    expect(view.metricRows[0]?.targetText).toBe('25 điểm');
    expect(view.metricRows[1]?.actualText).toBe('55 ₫');
    // So với chính `formatCurrencyVND` chứ không với chuỗi viết tay: `Intl` dùng
    // khoảng trắng KHÔNG NGẮT (U+00A0) trước `₫`, gõ tay là ra một ký tự khác.
    expect(view.metricRows[2]?.targetText).toBe(formatCurrencyVND(500_000_000));
    expect(view.metricRows[3]?.actualText).toBe('100 khách');
  });

  it('vượt chỉ tiêu KHÔNG bị cắt về 100% (BR-004)', () => {
    const view = toAdminOverview(
      makeSource({ target_sales_amount: 10, actual_sales_amount: 125 }),
    );
    expect(view.metricRows[1]?.result.display).toBe('1.250,0%');
  });

  it('BR-015 — cả đội target = 0 và actual = 0 → 100,0%, không chia cho 0', () => {
    const view = toAdminOverview(makeSource({ target_revenue: 0, actual_revenue: 0 }));
    expect(view.metricRows[2]?.result.display).toBe('100,0%');
  });

  it('BR-015 — cả đội target = 0 nhưng actual > 0 → số vượt tuyệt đối', () => {
    const view = toAdminOverview(
      makeSource({ target_sales_amount: 0, actual_sales_amount: 7 }),
    );
    expect(view.metricRows[1]?.result.display).toBe('+7 ₫');
    expect(view.metricRows[1]?.result.percent).toBeNull();
  });

  it('không tổ hợp nào sinh NaN / Infinity / ∞ (Master Spec §9)', () => {
    for (const target of [0, 1, 100]) {
      for (const actual of [0, 1, 100, 99_999_999_999]) {
        const view = toAdminOverview(
          makeSource({
            target_visit_points: target,
            actual_visit_points: actual,
            target_sales_amount: target,
            actual_sales_amount: actual,
            target_revenue: target,
            actual_revenue: actual,
            target_customer_visits: target,
            actual_customer_visits: actual,
          }),
        );

        for (const row of view.metricRows) {
          expect(row.result.display).not.toMatch(/NaN|Infinity|∞/);
          expect(row.targetText).not.toMatch(/NaN|Infinity|∞/);
          expect(row.actualText).not.toMatch(/NaN|Infinity|∞/);
        }
      }
    }
  });
});

describe('percentDisplay', () => {
  it.each([
    [100, '100,0%'],
    [66.666, '66,7%'],
    [0, '0,0%'],
    [null, '—'],
    [Number.NaN, '—'],
    [Number.POSITIVE_INFINITY, '—'],
  ])('%s → %s', (input, expected) => {
    expect(percentDisplay(input)).toBe(expected);
  });
});
