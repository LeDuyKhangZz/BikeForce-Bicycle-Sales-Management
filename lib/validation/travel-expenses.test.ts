import { describe, expect, it } from 'vitest';

import {
  travelExpenseFieldName,
  travelExpenseInputSchema,
  travelExpenseMonthSchema,
} from './travel-expenses';

describe('travelExpenseInputSchema', () => {
  it('nhận ô trống, số 0 và số VND đã phân nhóm', () => {
    expect(travelExpenseInputSchema.safeParse('').data).toBeNull();
    expect(travelExpenseInputSchema.safeParse('0').data).toBe(0);
    expect(travelExpenseInputSchema.safeParse('3.500.000').data).toBe(3_500_000);
  });

  it('từ chối chữ, số âm, số lẻ và Infinity', () => {
    for (const raw of ['abc', '-1', '1,5', 'Infinity']) {
      expect(travelExpenseInputSchema.safeParse(raw).success, raw).toBe(false);
    }
  });
});

describe('travelExpenseMonthSchema', () => {
  it('chỉ nhận tháng YYYY-MM hợp lệ', () => {
    expect(travelExpenseMonthSchema.safeParse('2026-09').success).toBe(true);
    expect(travelExpenseMonthSchema.safeParse('2026-13').success).toBe(false);
  });
});

it('tên field gắn với đúng nhân viên', () => {
  expect(travelExpenseFieldName('sales-id')).toBe('amount__sales-id');
});
