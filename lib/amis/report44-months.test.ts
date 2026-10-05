import { describe, expect, it } from 'vitest';
import { availableReport44Months } from './report44-months';

describe('availableReport44Months', () => {
  it('cho chọn tháng 9 và 10 dù snapshot mới tới tháng 8', () => {
    const months = availableReport44Months(['2026-08', '2025-08'], '2026-10');
    expect(months.slice(0, 3)).toEqual(['2026-10', '2026-09', '2026-08']);
    expect(months.at(-1)).toBe('2025-08');
    expect(months).toHaveLength(15);
  });
  it('không cần dữ liệu để mở bộ chọn tháng', () => {
    expect(availableReport44Months([], '2026-10')[0]).toBe('2026-10');
  });
  it('không cho chọn tương lai và giữ kỳ cũ hơn nếu đã có dữ liệu', () => {
    const months = availableReport44Months(['2024-12', '2026-11'], '2026-10');
    expect(months).not.toContain('2026-11');
    expect(months.at(-1)).toBe('2024-12');
  });
  it('tự chuyển qua năm mới', () => {
    expect(availableReport44Months([], '2027-01').slice(0, 2)).toEqual(['2027-01', '2026-12']);
  });
});
