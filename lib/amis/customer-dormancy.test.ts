import { describe, expect, it } from 'vitest';

import { getCustomerDormancyLevel } from './customer-dormancy';

describe('getCustomerDormancyLevel', () => {
  it.each([
    [null, 'UNKNOWN'],
    [0, 'NORMAL'],
    [1, 'NORMAL'],
    [15, 'NORMAL'],
    [16, 'WARNING'],
    [30, 'WARNING'],
    [31, 'DANGER'],
  ] as const)('phân loại %s ngày thành %s', (days, expected) => {
    expect(getCustomerDormancyLevel(days)).toBe(expected);
  });
});
