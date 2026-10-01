import { describe, expect, it } from 'vitest';

import { customerAlertCutoff, needsCustomerCare, parseCustomerAlert } from './customer-alerts';
import { misaCustomerQuery } from './customer-filters';

describe('cảnh báo khách hàng', () => {
  it('tính đủ 30 ngày theo ngày Việt Nam, qua ranh giới tháng và năm nhuận', () => {
    expect(customerAlertCutoff('2026-10', '2026-10-01')).toBe('2026-09-01');
    expect(customerAlertCutoff('2024-03', '2024-03-01')).toBe('2024-01-31');
    expect(customerAlertCutoff('2026-01', '2026-01-01')).toBe('2025-12-02');
  });

  it('tháng lịch sử dừng tại cuối tháng, không tăng cảnh báo theo thời gian hiện tại', () => {
    expect(customerAlertCutoff('2026-08', '2026-10-01')).toBe('2026-08-01');
    expect(() => customerAlertCutoff('invalid', '2026-10-01')).toThrow();
  });

  it('chăm sóc: bao gồm ngày trống và đúng 30 ngày, loại 29 ngày và ngày tương lai', () => {
    const cutoff = customerAlertCutoff('2026-10', '2026-10-01');
    expect(needsCustomerCare(null, cutoff)).toBe(true);
    expect(needsCustomerCare('2026-08-31', cutoff)).toBe(true);
    expect(needsCustomerCare('2026-09-01', cutoff)).toBe(true);
    expect(needsCustomerCare('2026-09-02', cutoff)).toBe(false);
    expect(needsCustomerCare('2026-10-02', cutoff)).toBe(false);
    expect(needsCustomerCare('invalid', cutoff)).toBe(false);
  });

  it('chỉ nhận hai loại cảnh báo hợp lệ, giữ cảnh báo khi phân trang/tìm kiếm', () => {
    expect(parseCustomerAlert('care')).toBe('care');
    expect(parseCustomerAlert('purchase')).toBe('purchase');
    expect(parseCustomerAlert('care,other')).toBeUndefined();
    const params = new URLSearchParams(misaCustomerQuery('2026-10', {}, 2, 'Khách A', 'care'));
    expect(Object.fromEntries(params)).toEqual({ month: '2026-10', page: '2', q: 'Khách A', alert: 'care' });
  });
});
