export type CustomerCommitmentFilter = 'committed' | 'uncommitted';

export function parseCustomerCommitmentFilter(value: string | undefined): CustomerCommitmentFilter | undefined {
  return value === 'committed' || value === 'uncommitted' ? value : undefined;
}
