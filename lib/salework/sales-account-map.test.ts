import { describe, expect, it } from 'vitest';

import {
  getSaleWorkAccountName,
  getSaleWorkAccountSelectionName,
  getSaleWorkDisplayName,
  isSaleWorkOnlyReportAccount,
  MONTHLY_TELESALE_SALEWORK_ACCOUNT_NAMES,
  MONTHLY_SALEWORK_ACCOUNT_NAMES,
  normalizeSaleWorkAccountName,
  SALES_SALEWORK_ACCOUNT_NAMES,
  TELESALE_SALEWORK_ACCOUNT_NAMES,
} from '@/lib/salework/sales-account-map';
import { getCrmCallEmployeeCode } from '@/lib/salework/crm-employee-map';
import { AMIS_EMPLOYEE_MAP } from '@/services/salework';

describe('getSaleWorkAccountName', () => {
  it.each([
    ['Ngô Thế San', 'Abraham San Miền Trung'],
    ['Nguyễn Minh Khải', 'Abraham Khải Hcm'],
    ['Nguyễn Trần Đăng Khoa', 'Tàu - MT'],
    ['Nguyễn Trần Hoàn Thiện', 'Abraham Nguyễn Thiện'],
    ['Phan Thành Khải', 'Abraham Khải Khánh Hoà'],
    ['Tô Kim Sang', 'Abraham Sang Miền Tây'],
    ['Võ Thanh Nhâm', 'Abraham Nhâm Miền Trung'],
    ['Võ Trí Tính', 'Abraham Bà Rịa - Vũng Tàu'],
    ['Dương Văn Thịnh', 'Abraham Thịnh Miền Trung'],
  ])('ánh xạ %s sang %s', (salesName, accountName) => {
    expect(getSaleWorkAccountName(salesName)).toBe(accountName);
  });

  it('chấp nhận khoảng trắng thừa quanh tên hồ sơ', () => {
    expect(getSaleWorkAccountName('  Ngô Thế San  ')).toBe('Abraham San Miền Trung');
  });

  it('trả null khi Sales chưa được ánh xạ', () => {
    expect(getSaleWorkAccountName('Nhân viên chưa ánh xạ')).toBeNull();
  });

  it('đưa tài khoản của Nguyễn Minh Khải và Võ Thanh Nhâm vào tập đồng bộ ngày', () => {
    expect(SALES_SALEWORK_ACCOUNT_NAMES).toHaveLength(7);
    expect(SALES_SALEWORK_ACCOUNT_NAMES).toContain('Abraham Khải Hcm');
    expect(SALES_SALEWORK_ACCOUNT_NAMES).toContain('Abraham Nhâm Miền Trung');
  });

  it('chỉ thêm Dương Văn Thịnh và Nguyễn Trần Đăng Khoa vào tập tháng, không đổi tập ngày', () => {
    expect(SALES_SALEWORK_ACCOUNT_NAMES).not.toContain('Abraham Thịnh Miền Trung');
    expect(SALES_SALEWORK_ACCOUNT_NAMES).not.toContain('Tàu - MT');
    expect(MONTHLY_SALEWORK_ACCOUNT_NAMES).toHaveLength(9);
    expect(MONTHLY_SALEWORK_ACCOUNT_NAMES).toContain('Abraham Thịnh Miền Trung');
    expect(MONTHLY_SALEWORK_ACCOUNT_NAMES).toContain('Tàu - MT');
    expect(MONTHLY_SALEWORK_ACCOUNT_NAMES).toContain('Abraham Nhâm Miền Trung');
  });
});

describe('normalizeSaleWorkAccountName', () => {
  it.each([
    ['Hải TeleSale', 'Hải TeleSale'],
    ['(OFF)Hải TeleSale', 'Hải TeleSale'],
    ['(off) Abraham San Miền Trung ', 'Abraham San Miền Trung'],
    ['  (OFF)   Abraham Khải Hcm  ', 'Abraham Khải Hcm'],
    ['Abraham Khải Miền Trung', 'Abraham Khải Khánh Hoà'],
    ['(OFF) Abraham Khải Miền Trung', 'Abraham Khải Khánh Hoà'],
  ])('chuẩn hoá %s thành %s', (source, expected) => {
    expect(normalizeSaleWorkAccountName(source)).toBe(expected);
  });
});

describe('getSaleWorkAccountSelectionName', () => {
  it('chọn nhãn mới của tài khoản Phan Thành Khải', () => {
    expect(getSaleWorkAccountSelectionName('Abraham Khải Khánh Hoà')).toBe(
      'Abraham Khải Miền Trung',
    );
  });

  it('giữ nguyên tài khoản không đổi nhãn', () => {
    expect(getSaleWorkAccountSelectionName('Abraham San Miền Trung')).toBe(
      'Abraham San Miền Trung',
    );
  });
});

describe('getSaleWorkDisplayName', () => {
  it('đổi nhãn kế toán nhưng giữ nguyên tài khoản khác', () => {
    expect(getSaleWorkDisplayName('Abraham Kế Toán Bánhàng')).toBe('Nguyễn Thị Như Quỳnh');
    expect(getSaleWorkDisplayName('Abraham Khải Hcm')).toBe('Abraham Khải Hcm');
  });
});

describe('tài khoản báo cáo TeleSale', () => {
  it('đồng bộ Cô Thy cùng Hải và Nguyễn Thị Như Quỳnh', () => {
    expect(TELESALE_SALEWORK_ACCOUNT_NAMES).toEqual([
      'Abraham Kế Toán Bánhàng',
      'Hải TeleSale',
      'Cô Thy',
    ]);
  });

  it('chỉ đánh dấu Cô Thy là báo cáo SaleWork-only', () => {
    expect(isSaleWorkOnlyReportAccount('Cô Thy')).toBe(true);
    expect(isSaleWorkOnlyReportAccount('Hải TeleSale')).toBe(false);
    expect(isSaleWorkOnlyReportAccount('Abraham Kế Toán Bánhàng')).toBe(false);
  });

  it('không đưa Cô Thy vào snapshot tháng', () => {
    expect(MONTHLY_TELESALE_SALEWORK_ACCOUNT_NAMES).toEqual([
      'Abraham Kế Toán Bánhàng',
      'Hải TeleSale',
    ]);
    expect(MONTHLY_TELESALE_SALEWORK_ACCOUNT_NAMES).not.toContain('Cô Thy');
  });

  it('không ánh xạ Cô Thy sang dữ liệu AMIS hoặc CRM', () => {
    expect(AMIS_EMPLOYEE_MAP['Cô Thy']).toBeUndefined();
    expect(getCrmCallEmployeeCode('Cô Thy')).toBeNull();
  });
});

describe('AMIS_EMPLOYEE_MAP', () => {
  it('ghép Hải TeleSale với đúng nhân viên AMIS mới và bỏ nhân viên đã nghỉ', () => {
    expect(AMIS_EMPLOYEE_MAP['Hải TeleSale']).toBe('Đặng Thanh Hải');
    expect(AMIS_EMPLOYEE_MAP['Giao - Kế Toán bán hàng']).toBeUndefined();
  });

  it('ghép tài khoản SaleWork của Võ Thanh Nhâm với đúng tên AMIS', () => {
    expect(AMIS_EMPLOYEE_MAP['Abraham Nhâm Miền Trung']).toBe('Võ Thanh Nhâm');
  });
});
