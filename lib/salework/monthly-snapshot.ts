import { getVietnamMonthRange } from '@/lib/date';

const MONTHLY_SALEWORK_ROW_PREFIX = '__SALEWORK_MONTH__:';

export function monthlySaleWorkPrefix(month: string): string | null {
  return getVietnamMonthRange(month) === null
    ? null
    : `${MONTHLY_SALEWORK_ROW_PREFIX}${month}-01:`;
}

export function monthlySaleWorkAccountKey(month: string, accountName: string): string | null {
  const prefix = monthlySaleWorkPrefix(month);
  return prefix === null ? null : `${prefix}${accountName}`;
}

export function saleWorkCalendarMonthValue(month: string): string | null {
  if (getVietnamMonthRange(month) === null) return null;
  const monthPart = month.split('-')[1];
  return monthPart === undefined ? null : String(Number(monthPart));
}
