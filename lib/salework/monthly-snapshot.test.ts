import { describe, expect, it } from 'vitest';

import {
  monthlySaleWorkAccountKey,
  monthlySaleWorkPrefix,
  saleWorkCalendarMonthValue,
} from './monthly-snapshot';

describe('khóa snapshot SaleWork tháng', () => {
  it('luôn có namespace tháng riêng, không trùng khóa báo cáo ngày', () => {
    expect(monthlySaleWorkPrefix('2026-09')).toBe('__SALEWORK_MONTH__:2026-09-01:');
    expect(monthlySaleWorkAccountKey('2026-09', 'Abraham HCM')).toBe(
      '__SALEWORK_MONTH__:2026-09-01:Abraham HCM',
    );
    expect(monthlySaleWorkAccountKey('2026-09', 'Abraham HCM')).not.toBe('Abraham HCM');
  });

  it('từ chối tháng sai định dạng', () => {
    expect(monthlySaleWorkPrefix('09-2026')).toBeNull();
    expect(monthlySaleWorkAccountKey('2026-13', 'Abraham HCM')).toBeNull();
  });

  it('dùng giá trị tháng 1-12 của lịch SaleWork, không chuyển sang chỉ số 0-11', () => {
    expect(saleWorkCalendarMonthValue('2026-01')).toBe('1');
    expect(saleWorkCalendarMonthValue('2026-09')).toBe('9');
    expect(saleWorkCalendarMonthValue('2026-12')).toBe('12');
    expect(saleWorkCalendarMonthValue('2026-13')).toBeNull();
  });
});
