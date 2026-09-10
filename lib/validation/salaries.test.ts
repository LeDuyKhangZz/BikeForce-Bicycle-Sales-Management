import { describe, expect, it } from 'vitest';

import { salaryFieldName, salaryInputSchema, salaryMonthSchema } from './salaries';

describe('salaryInputSchema', () => {
  it('nhận ô trống, số 0 và số VND đã phân nhóm', () => {
    expect(salaryInputSchema.safeParse('').data).toBeNull();
    expect(salaryInputSchema.safeParse('0').data).toBe(0);
    expect(salaryInputSchema.safeParse('15.000.000').data).toBe(15_000_000);
  });

  it('từ chối chữ, số âm, số lẻ và Infinity', () => {
    for (const raw of ['abc', '-1', '1,5', 'Infinity']) {
      expect(salaryInputSchema.safeParse(raw).success, raw).toBe(false);
    }
  });
});

describe('salaryMonthSchema', () => {
  it('chỉ nhận tháng YYYY-MM hợp lệ', () => {
    expect(salaryMonthSchema.safeParse('2026-09').success).toBe(true);
    expect(salaryMonthSchema.safeParse('2026-13').success).toBe(false);
  });
});

it('tên field gắn với đúng nhân viên', () => {
  expect(salaryFieldName('sales-id')).toBe('amount__sales-id');
});
