import { describe, expect, it } from 'vitest';

import { buildTravelExpenseDashboard } from './travel-expense-dashboard';

const PEOPLE = [
  { id: 'sales-a', full_name: 'Nguyễn Văn A', employee_code: 'NV-01' },
  { id: 'sales-b', full_name: 'Nguyễn Văn B', employee_code: null },
] as const;

describe('buildTravelExpenseDashboard', () => {
  it('tổng hợp số người, số tiền và danh sách chưa nhập', () => {
    expect(buildTravelExpenseDashboard(PEOPLE, { 'sales-a': 1_500_000, 'sales-b': null })).toEqual({
      totalPeople: 2,
      enteredCount: 1,
      missingCount: 1,
      completionText: '50%',
      totalAmountText: '1.500.000\u00a0₫',
      missingPeople: [
        { id: 'sales-b', fullName: 'Nguyễn Văn B', employeeCode: 'Chưa có mã nhân viên' },
      ],
    });
  });

  it('coi số tiền 0 là đã nhập và xử lý danh sách rỗng', () => {
    expect(buildTravelExpenseDashboard(PEOPLE, { 'sales-a': 0, 'sales-b': 250_000 }).enteredCount).toBe(2);
    expect(buildTravelExpenseDashboard([], {})).toMatchObject({
      totalPeople: 0,
      enteredCount: 0,
      missingCount: 0,
      completionText: '0%',
      totalAmountText: '0\u00a0₫',
    });
  });
});
