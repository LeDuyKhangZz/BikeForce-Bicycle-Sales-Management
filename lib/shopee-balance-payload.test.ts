import { describe, expect, it } from 'vitest';

import { parseShopeeBalancePayload } from '@/supabase/functions/_shared/shopee-balance-payload';

const CAPTURED_AT = '2026-11-03T08:15:00.000Z';

describe('parseShopeeBalancePayload', () => {
  it('nhận số dư nguyên VND ở dạng chuỗi từ Power Automate', () => {
    expect(parseShopeeBalancePayload({
      available_cash_balance: '4748231',
      currency_code: 'VND',
    }, CAPTURED_AT)).toEqual({
      available_cash_balance: 4_748_231,
      currency_code: 'VND',
      captured_at: CAPTURED_AT,
    });
  });

  it.each([
    { available_cash_balance: '-1', currency_code: 'VND' },
    { available_cash_balance: '4.748.231', currency_code: 'VND' },
    { available_cash_balance: 'NaN', currency_code: 'VND' },
    { available_cash_balance: 1.5, currency_code: 'VND' },
    { available_cash_balance: 1000, currency_code: 'USD' },
    { available_cash_balance: 1000, currency_code: 'VND', captured_at: 'invalid' },
  ])('từ chối payload không hợp lệ: %o', (payload) => {
    expect(parseShopeeBalancePayload(payload, CAPTURED_AT)).toBeNull();
  });
});
