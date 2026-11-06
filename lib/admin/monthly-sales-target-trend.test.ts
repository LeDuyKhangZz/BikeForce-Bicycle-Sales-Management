import { describe, expect, it } from 'vitest';

import { buildMonthlySalesTargetTrend, getMonthlyTrendNearestIndex } from './monthly-sales-target-trend';

describe('buildMonthlySalesTargetTrend', () => {
  it('luôn dựng đủ 12 tháng, kể cả khi tháng chưa có dữ liệu', () => {
    const model = buildMonthlySalesTargetTrend(
      [{ periodMonth: '2026-02-01', targetSalesAmount: 200_000_000, actualSalesAmount: 150_000_000 }],
      '2026-02',
    );

    expect(model.points).toHaveLength(12);
    expect(model.points[0]).toMatchObject({ label: 'T1', targetSalesAmount: 0, actualSalesAmount: 0 });
    expect(model.points[1]).toMatchObject({ label: 'T2', targetSalesAmount: 200_000_000, actualSalesAmount: 150_000_000 });
  });

  it('không cho NaN, Infinity hoặc số âm đi vào toạ độ SVG', () => {
    const model = buildMonthlySalesTargetTrend(
      [{ periodMonth: '2026-01-01', targetSalesAmount: Number.POSITIVE_INFINITY, actualSalesAmount: -1 }],
      '2026-01',
    );

    expect(model.maxValue).toBe(1);
    expect(model.points.every((point) => Number.isFinite(point.targetY) && Number.isFinite(point.actualY))).toBe(true);
  });

  it('chọn tháng gần nhất ở mọi vị trí ngang, kể cả khi con trỏ vượt biên', () => {
    expect(getMonthlyTrendNearestIndex(0, 12)).toBe(0);
    expect(getMonthlyTrendNearestIndex(0.51, 12)).toBe(6);
    expect(getMonthlyTrendNearestIndex(1, 12)).toBe(11);
    expect(getMonthlyTrendNearestIndex(-1, 12)).toBe(0);
    expect(getMonthlyTrendNearestIndex(2, 12)).toBe(11);
  });
});
