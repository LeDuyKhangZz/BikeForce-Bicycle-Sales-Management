import { describe, expect, it } from 'vitest';

import { mergeSaleWorkReports, type SaleWorkReport } from '@/services/salework';

function report(accountName: string, value: number, callDuration: string): SaleWorkReport {
  return {
    accountName,
    conversations: value,
    sentMessages: value,
    receivedMessages: value,
    incomingCalls: value,
    outgoingCalls: value,
    missedCalls: value,
    callDuration,
    amis: null,
  };
}

describe('mergeSaleWorkReports', () => {
  it('cộng toàn bộ số liệu Khải MT và Abraham Nhân Đồng Nai', () => {
    expect(
      mergeSaleWorkReports('Abraham Khải Khánh Hoà', [
        report('Abraham Khải Khánh Hoà', 2, '1.30 phút'),
        report('Abraham Nhân Đồng Nai', 3, '45.00 giây'),
      ]),
    ).toMatchObject({
      accountName: 'Abraham Khải Khánh Hoà',
      conversations: 5,
      sentMessages: 5,
      receivedMessages: 5,
      incomingCalls: 5,
      outgoingCalls: 5,
      missedCalls: 5,
      callDuration: '2.15 phút',
    });
  });

  it('trả null khi cả hai tài khoản chưa có snapshot', () => {
    expect(mergeSaleWorkReports('Abraham Khải Khánh Hoà', [])).toBeNull();
  });
});
