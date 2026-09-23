import { describe, expect, it } from 'vitest';

import { defaultMonthlyFrequency, getCustomerRevenueGroup } from './customer-revenue-group';

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

describe('defaultMonthlyFrequency', () => {
  it.each([['A', 4], ['B', 2], ['C', 1], ['D', 1]] as const)('nhóm %s mặc định %s lần/tháng', (group, expected) => {
    expect(defaultMonthlyFrequency(group)).toBe(expected);
  });
});
