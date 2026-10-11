const INTEGER_FORMATTER = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const PERCENT_FORMATTER = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatHatdeRevenue(value: number): string {
  return `${INTEGER_FORMATTER.format(value)} VND`;
}

export function formatHatdeTransactions(value: number): string {
  return INTEGER_FORMATTER.format(value);
}

export function formatHatdeComparison(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${PERCENT_FORMATTER.format(value)}%`;
}
