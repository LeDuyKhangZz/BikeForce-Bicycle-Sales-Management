import { describe, expect, it } from 'vitest';

import { getCrmCallEmployeeCode } from './crm-employee-map';

describe('getCrmCallEmployeeCode', () => {
  it('nối Abraham Kế Toán Bánhàng với đúng nhân viên AMIS Kế Toán Bán Hàng', () => {
    expect(getCrmCallEmployeeCode('Abraham Kế Toán Bánhàng')).toBe('VP-SA-001');
  });

  it('giữ Giao ở đúng mã nhân viên riêng, không nhập nhằng với kế toán tổng', () => {
    expect(getCrmCallEmployeeCode('Giao - Kế Toán bán hàng')).toBe('VP-TLS-003');
  });

  it('không đoán gần đúng tài khoản chưa khai báo', () => {
    expect(getCrmCallEmployeeCode('Kế toán bán hàng')).toBeNull();
  });
});
