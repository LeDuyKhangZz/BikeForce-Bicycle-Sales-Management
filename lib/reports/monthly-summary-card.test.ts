import { describe, expect, it } from 'vitest';

import { buildMonthlySummaryCardModel, monthlySummaryImagePath } from './monthly-summary-card';

describe('buildMonthlySummaryCardModel', () => {
  it('không chứa dữ liệu tự nhập và format các khoản tháng', () => {
    const model = buildMonthlySummaryCardModel({
      month: '2026-09', salesName: 'Ngô Thế San', employeeCode: 'KD-1',
      performance: null, saleWork: null, travelExpense: 3_500_000, salary: 15_000_000,
    });
    expect(model).toMatchObject({
      monthText: 'Tháng 09/2026', salesName: 'NGÔ THẾ SAN',
      travelExpenseText: '3.500.000 ₫', salaryText: '15.000.000 ₫',
    });
    expect(model).not.toHaveProperty('metrics');
    expect(model).not.toHaveProperty('routeText');
  });

  it('hiện gạch ngang khi chưa có công tác phí hoặc lương', () => {
    const model = buildMonthlySummaryCardModel({
      month: '2026-09', salesName: 'A', employeeCode: null,
      performance: null, saleWork: null, travelExpense: null, salary: null,
    });
    expect(model.travelExpenseText).toBe('-');
    expect(model.salaryText).toBe('-');
  });
});

it('dựng URL ảnh theo nhân viên và tháng', () => {
  expect(monthlySummaryImagePath('sales-id', '2026-09')).toBe(
    '/api/admin/monthly-summaries/sales-id/image?month=2026-09',
  );
});
