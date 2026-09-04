import { describe, expect, it } from 'vitest';

import { groupSalesPreviewsByToday } from './preview-order';

describe('groupSalesPreviewsByToday', () => {
  it('đưa Sales báo cáo hôm nay vào nhóm ưu tiên và giữ thứ tự trong từng nhóm', () => {
    const sales = [
      { id: 'a', daily_reports: [{ report_date: '2026-09-04' }] },
      { id: 'b', daily_reports: [{ report_date: '2026-09-03' }] },
      { id: 'c', daily_reports: [{ report_date: '2026-09-04' }] },
      { id: 'd', daily_reports: [] },
    ];

    const groups = groupSalesPreviewsByToday(sales, '2026-09-04');

    expect(groups.reportedToday.map((employee) => employee.id)).toEqual(['a', 'c']);
    expect(groups.others.map((employee) => employee.id)).toEqual(['b', 'd']);
  });

  it('không coi ngày tương lai hoặc chuỗi ngày khác là hôm nay', () => {
    const sales = [
      { id: 'future', daily_reports: [{ report_date: '2026-09-05' }] },
      { id: 'empty', daily_reports: [] },
    ];

    expect(groupSalesPreviewsByToday(sales, '2026-09-04').reportedToday).toEqual([]);
  });
});
