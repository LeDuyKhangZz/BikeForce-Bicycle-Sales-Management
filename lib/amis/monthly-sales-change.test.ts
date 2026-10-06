import { describe, expect, it } from 'vitest';
import { calculateMonthlySalesChange } from './monthly-sales-change';

describe('calculateMonthlySalesChange', () => {
  it('tính tăng và giảm so với tháng trước', () => {
    expect(calculateMonthlySalesChange(120, 100)).toMatchObject({ kind: 'UP', display: 'Tăng 20,0%' });
    expect(calculateMonthlySalesChange(75, 100)).toMatchObject({ kind: 'DOWN', display: 'Giảm 25,0%' });
  });
  it('không sinh Infinity khi tháng trước bằng 0', () => {
    expect(calculateMonthlySalesChange(10, 0)).toEqual({ kind: 'NEW', percent: null, display: 'Mới phát sinh' });
    expect(calculateMonthlySalesChange(0, 0)).toEqual({ kind: 'SAME', percent: 0, display: 'Không đổi' });
  });
  it('báo thiếu dữ liệu khi một trong hai tháng trống', () => {
    expect(calculateMonthlySalesChange(null, 100).kind).toBe('UNKNOWN');
    expect(calculateMonthlySalesChange(100, null).kind).toBe('UNKNOWN');
  });
});
