import { describe, expect, it, vi } from 'vitest';

import { misaRelativeDateRange } from './customer-filter-date-range';

describe('misaRelativeDateRange', () => {
  it('tạo đúng ngày và các kỳ tương đối theo giờ Việt Nam', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T03:00:00Z'));
    expect(misaRelativeDateRange(20)).toEqual({ from: '2026-09-23', to: '2026-09-23' });
    expect(misaRelativeDateRange(26)).toEqual({ from: '2026-09-14', to: '2026-09-20' });
    expect(misaRelativeDateRange(27)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(misaRelativeDateRange(33)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    vi.useRealTimers();
  });
});
