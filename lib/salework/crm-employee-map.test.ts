import { describe, expect, it } from 'vitest';

import { getCrmCallEmployeeCode } from './crm-employee-map';

describe('getCrmCallEmployeeCode', () => {
  it('nối Abraham Kế Toán Bánhàng với đúng nhân viên AMIS Kế Toán Bán Hàng', () => {
    expect(getCrmCallEmployeeCode('Abraham Kế Toán Bánhàng')).toBe('VP-SA-001');
  });

  it('nối Hải TeleSale với đúng mã nhân viên mới, không nhập nhằng với kế toán tổng', () => {
    expect(getCrmCallEmployeeCode('Hải TeleSale')).toBe('VP-TLS-004');
    expect(getCrmCallEmployeeCode('Giao - Kế Toán bán hàng')).toBeNull();
  });

  it('không đoán gần đúng tài khoản chưa khai báo', () => {
    expect(getCrmCallEmployeeCode('Kế toán bán hàng')).toBeNull();
  });
});
