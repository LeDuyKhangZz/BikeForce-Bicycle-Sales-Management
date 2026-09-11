import { describe, expect, it } from 'vitest';

import {
  findStableCompleteSaleWorkReports,
  requireCompleteSaleWorkReports,
} from './report-completeness';

describe('requireCompleteSaleWorkReports', () => {
  it('trả đủ dữ liệu theo đúng thứ tự tài khoản cấu hình', () => {
    const result = requireCompleteSaleWorkReports(
      ['A', 'B'],
      [
        { accountName: 'B', conversations: 20 },
        { accountName: 'A', conversations: 18 },
      ],
    );

    expect(result).toEqual([
      { accountName: 'A', conversations: 18 },
      { accountName: 'B', conversations: 20 },
    ]);
  });

  it('dừng cả mẻ khi DOM cuộn ảo chưa cho thấy một tài khoản', () => {
    expect(() =>
      requireCompleteSaleWorkReports(
        ['A', 'B'],
        [{ accountName: 'A', conversations: 18 }],
      ),
    ).toThrow('Thiếu dữ liệu SaleWork: B');
  });

  it('không tự tạo dòng số 0 cho tài khoản chưa đọc được', () => {
    expect(() => requireCompleteSaleWorkReports(['A'], [])).toThrow();
  });
});

describe('findStableCompleteSaleWorkReports', () => {
  const targets = ['A', 'B'];

  it('không ghép dữ liệu của hai lượt đọc thiếu khác nhau', () => {
    expect(
      findStableCompleteSaleWorkReports(targets, [
        [{ accountName: 'A', value: 1 }],
        [{ accountName: 'B', value: 2 }],
      ]),
    ).toBeNull();
  });

  it('chỉ nhận hai lượt đầy đủ liên tiếp có số liệu giống hệt nhau', () => {
    const stable = [
      { accountName: 'A', value: 10 },
      { accountName: 'B', value: 20 },
    ];
    expect(
      findStableCompleteSaleWorkReports(targets, [
        [
          { accountName: 'A', value: 1 },
          { accountName: 'B', value: 2 },
        ],
        stable,
        stable,
      ]),
    ).toEqual(stable);
  });
});
