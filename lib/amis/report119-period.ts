import { getVietnamCurrentMonth, getVietnamMonthRange, shiftVietnamMonth } from '@/lib/date';

export function report119Period(month: string): { fromDate: string; toDate: string; period: number } | null {
  const range = getVietnamMonthRange(month);
  if (range === null) return null;
  const nextMonth = shiftVietnamMonth(month, 1);
  if (nextMonth === null) return null;
  const nextRange = getVietnamMonthRange(nextMonth);
  if (nextRange === null) return null;

  const start = Date.parse(`${range.from}T00:00:00+07:00`);
  const end = Date.parse(`${nextRange.from}T00:00:00+07:00`) - 1;
  const current = getVietnamCurrentMonth();
  const previous = shiftVietnamMonth(current, -1);
  return {
    fromDate: new Date(start).toISOString(),
    toDate: new Date(end).toISOString(),
    period: month === current ? 13 : month === previous ? 14 : 0,
  };
}
