/**
 * Unit test cho `lib/reports/history-row.ts` — PHASE 7.
 *
 * Bất biến quan trọng nhất: một báo cáo **chưa hoàn tất** không bao giờ bị kết
 * luận là "chưa đạt KPI". Đó là hai chuyện khác nhau (BR-024 vs BR-008), và
 * trộn chúng lại là nói sai sự thật với người dùng ngay trên danh sách.
 */
import { describe, expect, it } from 'vitest';

import { achievedCountLabel, toHistoryRow, type HistoryRowSource } from './history-row';

/** Cam kết sáng dùng chung: 5 điểm · 10 xe · 100tr · 20 khách. */
const TARGETS = {
  target_visit_points: 5,
  target_sales_amount: 10,
  target_revenue: 100_000_000,
  target_customer_visits: 20,
} as const;

const PENDING_ACTUALS = {
  actual_visit_points: null,
  actual_sales_amount: null,
  actual_revenue: null,
  actual_customer_visits: null,
} as const;

function makeSource(overrides: Partial<HistoryRowSource> = {}): HistoryRowSource {
  return {
    id: '8f1c0000-0000-4000-8000-000000000001',
    report_date: '2026-08-07',
    status: 'MORNING_SUBMITTED',
    ...TARGETS,
    ...PENDING_ACTUALS,
    ...overrides,
  };
}

describe('toHistoryRow — trạng thái MORNING_SUBMITTED', () => {
  const row = toHistoryRow(makeSource());

  it('nhãn trạng thái lấy từ nguồn chung, không viết lại', () => {
    expect(row.statusLabel).toBe('Đã cam kết');
    expect(row.statusTone).toBe('info');
    expect(row.isCompleted).toBe(false);
  });

  it('kpiAchieved là null — "chưa kết luận được", KHÔNG phải false', () => {
    expect(row.kpiAchieved).toBeNull();
    expect(row.kpiAchieved).not.toBe(false);
  });

  it('achievedCount là null chứ không phải 0', () => {
    expect(row.achievedCount).toBeNull();
  });

  it('bốn kết quả đều PENDING và hiển thị "—"', () => {
    expect(row.results).toHaveLength(4);
    for (const result of row.results) {
      expect(result.status).toBe('PENDING');
      expect(result.display).toBe('—');
    }
  });
});

describe('toHistoryRow — trạng thái COMPLETED', () => {
  it('đạt cả 4 chỉ tiêu → kpiAchieved true, 4/4 (BR-024)', () => {
    const row = toHistoryRow(
      makeSource({
        status: 'COMPLETED',
        actual_visit_points: 5,
        actual_sales_amount: 12,
        actual_revenue: 100_000_000,
        actual_customer_visits: 25,
      }),
    );

    expect(row.kpiAchieved).toBe(true);
    expect(row.achievedCount).toBe(4);
    expect(row.isCompleted).toBe(true);
    expect(row.statusLabel).toBe('Đã hoàn thành');
    expect(row.statusTone).toBe('success');
  });

  it('thiếu ĐÚNG MỘT chỉ tiêu → kpiAchieved false, 3/4', () => {
    const row = toHistoryRow(
      makeSource({
        status: 'COMPLETED',
        actual_visit_points: 5,
        actual_sales_amount: 10,
        actual_revenue: 99_000_000, // 99% — NEAR, không phải EXCEEDED
        actual_customer_visits: 20,
      }),
    );

    expect(row.kpiAchieved).toBe(false);
    expect(row.achievedCount).toBe(3);
  });

  it('trượt toàn bộ → 0/4', () => {
    const row = toHistoryRow(
      makeSource({
        status: 'COMPLETED',
        actual_visit_points: 0,
        actual_sales_amount: 0,
        actual_revenue: 0,
        actual_customer_visits: 0,
      }),
    );

    expect(row.kpiAchieved).toBe(false);
    expect(row.achievedCount).toBe(0);
  });

  /** BR-015 — `target = 0 && actual > 0` là "vượt kế hoạch", vẫn tính là đạt. */
  it('target = 0 và actual > 0 vẫn được tính là đạt (BR-015 × BR-024)', () => {
    const row = toHistoryRow(
      makeSource({
        status: 'COMPLETED',
        target_visit_points: 0,
        actual_visit_points: 3,
        actual_sales_amount: 10,
        actual_revenue: 100_000_000,
        actual_customer_visits: 20,
      }),
    );

    expect(row.achievedCount).toBe(4);
    expect(row.kpiAchieved).toBe(true);
    expect(row.results[0]?.display).toBe('+3 điểm');
  });

  it('target = 0 và actual = 0 → 100,0%, vẫn là đạt', () => {
    const row = toHistoryRow(
      makeSource({
        status: 'COMPLETED',
        target_visit_points: 0,
        actual_visit_points: 0,
        actual_sales_amount: 10,
        actual_revenue: 100_000_000,
        actual_customer_visits: 20,
      }),
    );

    expect(row.results[0]?.display).toBe('100,0%');
    expect(row.kpiAchieved).toBe(true);
  });

  it('không có display nào chứa NaN / Infinity / ∞ (BR-015)', () => {
    for (const target of [0, 1, 5]) {
      for (const actual of [0, 1, 5, 10_000]) {
        const row = toHistoryRow(
          makeSource({
            status: 'COMPLETED',
            target_visit_points: target,
            actual_visit_points: actual,
            actual_sales_amount: actual,
            actual_revenue: actual,
            actual_customer_visits: actual,
          }),
        );

        for (const result of row.results) {
          expect(result.display).not.toMatch(/NaN|Infinity|∞/);
        }
      }
    }
  });
});

describe('toHistoryRow — trường hiển thị', () => {
  it('ngày được format qua lib/date, không tự ghép chuỗi', () => {
    expect(toHistoryRow(makeSource({ report_date: '2026-08-07' })).dateLabel).toBe(
      'Thứ Sáu, 07/08/2026',
    );
  });

  it('ngày rác trong DB không làm sập dòng — trả "—" (DEC-033)', () => {
    const row = toHistoryRow(makeSource({ report_date: 'not-a-date' }));
    expect(row.dateLabel).toBe('—');
    expect(row.reportDate).toBe('not-a-date');
  });

  it('href trỏ đúng màn hình chi tiết FR-022', () => {
    const row = toHistoryRow(makeSource({ id: 'abc-123' }));
    expect(row.href).toBe('/sales/reports/abc-123');
  });
});

describe('achievedCountLabel', () => {
  it.each([
    [4, '4/4 chỉ tiêu'],
    [3, '3/4 chỉ tiêu'],
    [0, '0/4 chỉ tiêu'],
    [null, '—'],
  ])('%s → %s', (input, expected) => {
    expect(achievedCountLabel(input)).toBe(expected);
  });
});
