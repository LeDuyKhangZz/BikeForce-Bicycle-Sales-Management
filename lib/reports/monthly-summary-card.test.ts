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

  it('ghi rõ kỳ MISA khác với ngày đồng bộ để không bị hiểu là lấy chéo tháng', () => {
    const model = buildMonthlySummaryCardModel({
      month: '2026-08',
      salesName: 'Dương Văn Thịnh',
      employeeCode: 'KD-MTR3-003',
      performance: {
        amisTargetAmount: 550_000_000,
        amisSalesActual: 179_768_200,
        amisReceiveAmount: null,
        amisAccountInCharge: 0,
        amisAccountInteractive: 103,
        amisAccountSold: 18,
        amisOrderCount: 21,
        amisReturnAmount: 0,
        syncedAt: '2026-09-11T08:29:05.467857+00:00',
        monthlyTargetSalesAmount: 550_000_000,
        monthlyTargetRevenue: 440_000_000,
        targetRevenue: 0,
      },
      saleWork: null,
      travelExpense: null,
      salary: null,
    });

    expect(model.performance?.rangeText).toBe(
      'MISA tháng 08/2026 · đồng bộ 11/09/2026',
    );
  });
});

it('dựng URL ảnh theo nhân viên và tháng', () => {
  expect(monthlySummaryImagePath('sales-id', '2026-09')).toBe(
    '/api/admin/monthly-summaries/sales-id/image?month=2026-09',
  );
});
