import { describe, expect, it } from 'vitest';

import { includeMonthlyAccountingParticipant, MONTHLY_ACCOUNTING_PARTICIPANT } from './monthly-summary-participants';

describe('includeMonthlyAccountingParticipant', () => {
  it('bổ sung kế toán kể cả khi không có profile Sales', () => {
    expect(includeMonthlyAccountingParticipant([])).toEqual([MONTHLY_ACCOUNTING_PARTICIPANT]);
  });

  it('giữ toàn bộ hồ sơ Sales và không thay đổi danh sách đầu vào', () => {
    const sales = [{ id: 'sales-id', full_name: 'Sales', employee_code: null, is_active: false }];
    const result = includeMonthlyAccountingParticipant(sales);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(sales[0]);
    expect(sales).toHaveLength(1);
    expect(result[0]?.id).toBe('salework-accounting-sales');
  });
});
