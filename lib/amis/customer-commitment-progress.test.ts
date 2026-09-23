import { describe, expect, it } from 'vitest';

import { customerCommitmentPercent } from './customer-commitment-progress';

describe('customerCommitmentPercent', () => {
  it.each([[0, 0, 0], [0, 400, 0], [100, 400, 25], [400, 400, 100], [500, 400, 100]] as const)(
    '%s/%s trả %s%%', (committed, total, expected) => {
      expect(customerCommitmentPercent(committed, total)).toBe(expected);
    },
  );
});
