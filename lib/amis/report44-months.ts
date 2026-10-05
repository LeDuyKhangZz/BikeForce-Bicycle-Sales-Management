import { getVietnamCurrentMonth, getVietnamMonthRange, shiftVietnamMonth } from '@/lib/date';

const FIRST_REPORT44_MONTH = '2025-08';

/** Cho phép chọn cả kỳ chưa đồng bộ, nhưng không có tháng tương lai. */
export function availableReport44Months(storedMonths: string[], currentMonth = getVietnamCurrentMonth()): string[] {
  if (!getVietnamMonthRange(currentMonth)) return [];
  const validStoredMonths = storedMonths.filter((month) => getVietnamMonthRange(month) && month <= currentMonth);
  const firstMonth = validStoredMonths.reduce((earliest, month) => month < earliest ? month : earliest, FIRST_REPORT44_MONTH);
  const result: string[] = [];
  let month: string | null = currentMonth;
  while (month !== null && month >= firstMonth) {
    result.push(month);
    month = shiftVietnamMonth(month, -1);
  }
  return result;
}
