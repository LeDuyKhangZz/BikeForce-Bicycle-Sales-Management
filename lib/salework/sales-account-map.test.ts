import { describe, expect, it } from 'vitest';

import {
  getSaleWorkAccountName,
  MONTHLY_SALEWORK_ACCOUNT_NAMES,
  normalizeSaleWorkAccountName,
  SALES_SALEWORK_ACCOUNT_NAMES,
} from '@/lib/salework/sales-account-map';

describe('getSaleWorkAccountName', () => {
  it.each([
    ['Ngô Thế San', 'Abraham San Miền Trung'],
    ['Nguyễn Minh Khải', 'Abraham Khải Hcm'],
    ['Nguyễn Trần Đăng Khoa', 'Tàu - MT'],
    ['Nguyễn Trần Hoàn Thiện', 'Abraham Nguyễn Thiện'],
    ['Phan Thành Khải', 'Abraham Khải Khánh Hoà'],
    ['Tô Kim Sang', 'Abraham Sang Miền Tây'],
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

  it('đưa Abraham Khải Hcm vào danh sách tài khoản cần đồng bộ', () => {
    expect(SALES_SALEWORK_ACCOUNT_NAMES).toHaveLength(6);
    expect(SALES_SALEWORK_ACCOUNT_NAMES).toContain('Abraham Khải Hcm');
  });

  it('chỉ thêm Dương Văn Thịnh và Nguyễn Trần Đăng Khoa vào tập tháng, không đổi tập ngày', () => {
    expect(SALES_SALEWORK_ACCOUNT_NAMES).not.toContain('Abraham Thịnh Miền Trung');
    expect(SALES_SALEWORK_ACCOUNT_NAMES).not.toContain('Tàu - MT');
    expect(MONTHLY_SALEWORK_ACCOUNT_NAMES).toHaveLength(8);
    expect(MONTHLY_SALEWORK_ACCOUNT_NAMES).toContain('Abraham Thịnh Miền Trung');
    expect(MONTHLY_SALEWORK_ACCOUNT_NAMES).toContain('Tàu - MT');
  });
});

describe('normalizeSaleWorkAccountName', () => {
  it.each([
    ['Giao - Kế Toán bán hàng', 'Giao - Kế Toán bán hàng'],
    ['(OFF)Giao - Kế Toán bán hàng', 'Giao - Kế Toán bán hàng'],
    ['(off) Abraham San Miền Trung ', 'Abraham San Miền Trung'],
    ['  (OFF)   Abraham Khải Hcm  ', 'Abraham Khải Hcm'],
  ])('chuẩn hoá %s thành %s', (source, expected) => {
    expect(normalizeSaleWorkAccountName(source)).toBe(expected);
  });
});
