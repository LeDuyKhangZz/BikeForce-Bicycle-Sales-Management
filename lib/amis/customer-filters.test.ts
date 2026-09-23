import { describe, expect, it } from 'vitest';

import { buildMisaCustomerApiFilters, misaCustomerQuery, parseMisaCustomerFilters } from './customer-filters';

describe('MISA customer filters', () => {
  it('accepts only selected, valid fields from the URL', () => {
    expect(parseMisaCustomerFilters({
      use_code: '1', code: ' BDI0005 ',
      name: 'Ignored without checkbox',
      use_debt: '1', debt: 'not-a-number',
      use_recentPurchase: '1', recentPurchase: '2026-02-30',
      use_province: '1', province: 'Bình Định',
    })).toEqual({ code: { operator: 1, value: 'BDI0005' }, province: { operator: 1, value: 'Bình Định' } });
  });

  it('uses the MISA operators and Vietnam midnight for exact filters', () => {
    expect(buildMisaCustomerApiFilters({
      code: { operator: 1, value: 'BDI0005' },
      debt: { operator: 0, value: '154797600' },
      recentPurchase: { operator: 11, value: '2026-09-19' },
    })).toMatchObject([
      { Property: 'AccountNumber', Operator: 1, InputType: 10, Value: 'BDI0005' },
      { Property: 'Debt', Operator: 0, InputType: 11, Value: 154797600 },
      { Property: 'PurchaseDateRecent', Operator: 11, InputType: 7, Value: '2026-09-18T17:00:00.000Z' },
    ]);
  });

  it('keeps active filters when changing pages', () => {
    expect(misaCustomerQuery('2026-09', { province: { operator: 1, value: 'Bình Định' } }, 5))
      .toBe('month=2026-09&use_province=1&op_province=1&province=B%C3%ACnh+%C4%90%E1%BB%8Bnh&page=5');
    expect(misaCustomerQuery('2026-09', {}, 2, 'BDI0005')).toBe('month=2026-09&page=2&q=BDI0005');
  });

  it('supports the MISA text operators and empty values', () => {
    const filters = parseMisaCustomerFilters({
      use_code: '1', op_code: '8', code: 'BDI',
      use_name: '1', op_name: '13',
      use_owner: '1', op_owner: '14',
    });
    expect(filters).toEqual({
      code: { operator: 8, value: 'BDI' },
      name: { operator: 13, value: '' },
      owner: { operator: 14, value: '' },
    });
    expect(buildMisaCustomerApiFilters(filters)).toMatchObject([
      { Property: 'AccountNumber', Operator: 8, Value: 'BDI' },
      { Property: 'AccountName', Operator: 13, Value: '' },
      { Property: 'OwnerIDText', Operator: 14, Value: '' },
    ]);
  });

  it('keeps comparison operators for numbers and relative date operators', () => {
    const filters = parseMisaCustomerFilters({
      use_debt: '1', op_debt: '2', debt: '1000000',
      use_recentPurchase: '1', op_recentPurchase: '20',
    });
    expect(buildMisaCustomerApiFilters(filters)).toMatchObject([
      { Property: 'Debt', Operator: 2, Value: 1000000 },
      { Property: 'PurchaseDateRecent', Operator: 20, Value: '' },
    ]);
  });
});
