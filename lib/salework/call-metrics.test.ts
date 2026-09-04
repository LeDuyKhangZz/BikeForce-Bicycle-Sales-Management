import { describe, expect, it } from 'vitest';

import {
  combineCallMetrics,
  formatCallDuration,
  parseSaleWorkDurationSeconds,
} from './call-metrics';

describe('parseSaleWorkDurationSeconds', () => {
  it.each([
    ['25.17 phút', 1_517],
    ['7 phút', 420],
    ['1 phút 05 giây', 65],
    ['01:02:03', 3_723],
    ['07:22', 442],
    ['0.00 giây', 0],
  ])('đổi %s thành giây', (input, expected) => {
    expect(parseSaleWorkDurationSeconds(input)).toBe(expected);
  });
});

describe('combineCallMetrics', () => {
  it('cộng CRM vào SaleWork theo đúng ánh xạ báo cáo', () => {
    expect(
      combineCallMetrics(
        { conversations: 13, outgoingCalls: 0, incomingCalls: 2, callDuration: '25.17 phút' },
        {
          totalQuantity: 12,
          calledQuantity: 12,
          incomingSuccessful: 3,
          outgoingDurationSeconds: 694,
        },
      ),
    ).toEqual({
      conversations: 25,
      outgoingCalls: 12,
      incomingCalls: 5,
      callDuration: '36.51 phút',
    });
  });

  it('giữ nguyên SaleWork khi chưa có snapshot CRM', () => {
    const salework = {
      conversations: 13,
      outgoingCalls: 2,
      incomingCalls: 1,
      callDuration: '7 phút',
    };
    expect(combineCallMetrics(salework, null)).toEqual(salework);
  });
});

describe('formatCallDuration', () => {
  it('không để NaN hoặc số âm lọt ra giao diện', () => {
    expect(formatCallDuration(Number.NaN)).toBe('0.00 giây');
    expect(formatCallDuration(-10)).toBe('0.00 giây');
  });
});
