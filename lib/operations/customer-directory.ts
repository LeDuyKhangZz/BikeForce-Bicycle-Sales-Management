const countFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export function formatCustomerCount(value: number): string {
  return countFormatter.format(value);
}
