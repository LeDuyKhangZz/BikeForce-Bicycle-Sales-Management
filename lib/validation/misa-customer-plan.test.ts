import { describe, expect, it } from 'vitest';

import { misaCustomerPlanImportSchema, misaCustomerPlanSchema } from './misa-customer-plan';

const valid = { month: '2026-09', employeeId: '1', customerId: '2', monthlyFrequency: '4', committedSales: '150000000' };

describe('misaCustomerPlanSchema', () => {
  it('nhận kế hoạch hợp lệ và cho phép chưa cam kết', () => {
    expect(misaCustomerPlanSchema.safeParse(valid).success).toBe(true);
    expect(misaCustomerPlanSchema.safeParse({ ...valid, committedSales: '' }).success).toBe(true);
  });

  it('từ chối tần suất ngoài 0–31 và doanh số âm', () => {
    expect(misaCustomerPlanSchema.safeParse({ ...valid, monthlyFrequency: '32' }).success).toBe(false);
    expect(misaCustomerPlanSchema.safeParse({ ...valid, committedSales: '-1' }).success).toBe(false);
  });
});

describe('misaCustomerPlanImportSchema', () => {
  it('nhận danh sách kế hoạch hợp lệ', () => {
    expect(misaCustomerPlanImportSchema.safeParse({
      month: '2026-09', employeeId: 1,
      rows: [{ customerId: 2, monthlyFrequency: 4, committedSales: null }],
    }).success).toBe(true);
  });

  it('từ chối danh sách rỗng và giá trị ngoài giới hạn', () => {
    expect(misaCustomerPlanImportSchema.safeParse({ month: '2026-09', employeeId: 1, rows: [] }).success).toBe(false);
    expect(misaCustomerPlanImportSchema.safeParse({
      month: '2026-09', employeeId: 1,
      rows: [{ customerId: 2, monthlyFrequency: 32, committedSales: -1 }],
    }).success).toBe(false);
  });
});
