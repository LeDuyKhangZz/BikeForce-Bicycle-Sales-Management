import { describe, expect, it } from 'vitest';

import {
  mergeReceivableEmployeeSummaries,
  parseReceivableEmployeeTotal,
} from './receivable-employee-summary';

describe('parseReceivableEmployeeTotal', () => {
  it('đọc tên, mã và tổng tiền từ dòng tổng nhân viên', () => {
    expect(
      parseReceivableEmployeeTotal(
        'Tên nhân viên: Dương Văn Thịnh (21) 360.356.200',
      ),
    ).toEqual({
      tenNhanVien: 'Dương Văn Thịnh',
      maSo: '21',
      soTienThanhToan: 360_356_200,
    });
  });

  it('bỏ qua dòng chi tiết khách hàng', () => {
    expect(
      parseReceivableEmployeeTotal('Chú Thời - Phan Thiết - Bình Thuận 10.070.000'),
    ).toBeNull();
  });

  it('đọc được DOM MISA khi các ô không có khoảng trắng', () => {
    expect(
      parseReceivableEmployeeTotal('Tên nhân viên:Ngô Thế San(20)353.998.799'),
    ).toEqual({
      tenNhanVien: 'Ngô Thế San',
      maSo: '20',
      soTienThanhToan: 353_998_799,
    });
  });
});

describe('mergeReceivableEmployeeSummaries', () => {
  it('gộp các trang và không cộng trùng một dòng tổng', () => {
    const row = {
      tenNhanVien: 'Dương Văn Thịnh',
      maSo: '21',
      soTienThanhToan: 360_356_200,
    };

    expect(mergeReceivableEmployeeSummaries([[row], [row]])).toEqual([row]);
  });

  it('từ chối hai tổng tiền mâu thuẫn của cùng nhân viên', () => {
    expect(() =>
      mergeReceivableEmployeeSummaries([
        [{ tenNhanVien: 'Sales A', maSo: '1', soTienThanhToan: 100 }],
        [{ tenNhanVien: 'Sales A', maSo: '1', soTienThanhToan: 200 }],
      ]),
    ).toThrow(/hai tong tien khac nhau/u);
  });
});
