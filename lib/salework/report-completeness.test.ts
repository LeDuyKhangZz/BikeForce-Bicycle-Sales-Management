import { describe, expect, it } from 'vitest';

import { requireCompleteSaleWorkReports } from './report-completeness';

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
