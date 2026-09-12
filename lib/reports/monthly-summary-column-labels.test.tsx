import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MonthlySummaryCard } from '@/features/report-share/monthly-summary-card';
import { buildMonthlySummaryCardModel } from '@/lib/reports/monthly-summary-card';

const model = buildMonthlySummaryCardModel({
  month: '2026-08', salesName: 'Nguyễn Thị Kim Hương', employeeCode: null,
  performance: {
    amisTargetAmount: null, amisSalesActual: 168805000, amisReceiveAmount: 163821200,
    amisAccountInCharge: 2, amisAccountInteractive: 8, amisAccountSold: 7,
    amisOrderCount: 10, amisReturnAmount: 369000, syncedAt: '2026-09-12T00:00:00Z',
    monthlyTargetSalesAmount: null, monthlyTargetRevenue: null, targetRevenue: 0,
  },
  saleWork: null, travelExpense: null, salary: null,
});

describe('nhãn cột Tình trạng thực hiện trên ảnh tháng', () => {
  it('cột tên không nhãn, thứ tự Chỉ tiêu / Thực đạt / % hoàn thành trước các số liệu', () => {
    const html = renderToStaticMarkup(<MonthlySummaryCard model={model} />);
    const labels = ['Chỉ tiêu', 'Thực đạt', '% hoàn thành', 'Doanh số đã ghi'];
    const indices = labels.map(label => html.indexOf(label));
    expect(indices.every(index => index >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((first, second) => first - second));
    expect(html).toContain('width:35%"></div>');
    expect(html).toContain('width:22%;justify-content:flex-end">Chỉ tiêu');
    expect(html).toContain('width:22%;justify-content:flex-end">Thực đạt');
    expect(html).toContain('width:21%;justify-content:flex-end">% hoàn thành');
    expect(html).toContain('369k');
  });

  it('không vẽ nhãn bảng nếu chưa có AMIS', () => {
    const html = renderToStaticMarkup(<MonthlySummaryCard model={{ ...model, performance: null }} />);
    expect(html).toContain('Chưa có dữ liệu AMIS');
    expect(html).not.toContain('% hoàn thành');
  });
});
