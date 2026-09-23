export function customerCommitmentPercent(committed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((committed / total) * 100)));
}
