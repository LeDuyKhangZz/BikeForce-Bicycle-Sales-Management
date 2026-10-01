import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MisaEmployeeMonthNavigation } from '@/features/misa-employees/misa-employee-month-navigation';

describe('MisaEmployeeMonthNavigation', () => {
  it('cho phép quay về tháng cũ khi tháng hiện tại chưa có dữ liệu', () => {
    const markup = renderToStaticMarkup(
      <MisaEmployeeMonthNavigation
        monthLabel="Tháng 10/2026"
        previousMonth="2026-09"
        nextMonth={null}
      />,
    );

    expect(markup).toContain('/admin/misa-employees?month=2026-09');
    expect(markup).toContain('Tháng 10/2026');
    expect(markup).toContain('aria-label="Tháng trước"');
    expect(markup).not.toContain('aria-label="Tháng sau"');
  });

  it('hiển thị cả hai chiều khi đang xem tháng lịch sử', () => {
    const markup = renderToStaticMarkup(
      <MisaEmployeeMonthNavigation
        monthLabel="Tháng 09/2026"
        previousMonth="2026-08"
        nextMonth="2026-10"
      />,
    );

    expect(markup).toContain('/admin/misa-employees?month=2026-08');
    expect(markup).toContain('/admin/misa-employees?month=2026-10');
  });
});
