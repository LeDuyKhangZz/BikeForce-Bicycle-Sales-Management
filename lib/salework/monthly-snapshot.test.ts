import { describe, expect, it } from 'vitest';

import { monthlySaleWorkAccountKey, monthlySaleWorkPrefix } from './monthly-snapshot';

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
});
