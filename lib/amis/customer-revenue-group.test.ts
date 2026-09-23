import { describe, expect, it } from 'vitest';

import { getCustomerRevenueGroup } from './customer-revenue-group';

describe('getCustomerRevenueGroup', () => {
  it.each([
    [150_000_000, 'A'],
    [149_999_999, 'B'],
    [50_000_000, 'B'],
    [49_999_999, 'C'],
    [1, 'C'],
    [0, 'D'],
    [null, 'D'],
  ] as const)('phân loại doanh số %s thành nhóm %s', (value, expected) => {
    expect(getCustomerRevenueGroup(value)).toBe(expected);
  });
});
