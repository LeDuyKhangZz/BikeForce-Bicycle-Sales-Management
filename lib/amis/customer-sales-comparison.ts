import { formatVietnamMonth, shiftVietnamMonth } from '@/lib/date';
import { formatMisaAmount } from '@/lib/amis/customer-display';

export function customerSalesMonthLabels(month: string) {
  const previous = shiftVietnamMonth(month, -1);
  return { current: formatVietnamMonth(month), previous: previous ? formatVietnamMonth(previous) : 'Tháng trước' };
}

export function formatPreviousCustomerSales(value: number | null | undefined): string {
  return value === undefined || value === null ? 'Chưa có dữ liệu' : formatMisaAmount(value);
}
