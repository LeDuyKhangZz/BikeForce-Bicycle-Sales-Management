import { describe, expect, it } from 'vitest';

import { getSaleWorkAccountName } from '@/lib/salework/sales-account-map';

describe('getSaleWorkAccountName', () => {
  it.each([
    ['Ngô Thế San', 'Abraham San Miền Trung'],
    ['Nguyễn Trần Hoàn Thiện', 'Abraham Nguyễn Thiện'],
    ['Phan Thành Khải', 'Abraham Khải Khánh Hoà'],
    ['Tô Kim Sang', 'Abraham Sang Miền Tây'],
    ['Võ Trí Tính', 'Abraham Bà Rịa - Vũng Tàu'],
  ])('ánh xạ %s sang %s', (salesName, accountName) => {
    expect(getSaleWorkAccountName(salesName)).toBe(accountName);
  });

  it('chấp nhận khoảng trắng thừa quanh tên hồ sơ', () => {
    expect(getSaleWorkAccountName('  Ngô Thế San  ')).toBe('Abraham San Miền Trung');
  });

  it('trả null khi Sales chưa được ánh xạ', () => {
    expect(getSaleWorkAccountName('Nhân viên chưa ánh xạ')).toBeNull();
  });
});
