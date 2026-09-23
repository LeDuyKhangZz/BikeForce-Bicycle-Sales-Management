import { getVietnamToday } from '@/lib/date';

type DateRange = { from: string; to: string };

function dateFromIso(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shifted(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function monthRange(date: Date, offset: number): DateRange {
  const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
  const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0));
  return { from: iso(from), to: iso(to) };
}

function yearRange(date: Date, offset: number): DateRange {
  const year = date.getUTCFullYear() + offset;
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function misaRelativeDateRange(operator: number): DateRange | null {
  const today = dateFromIso(getVietnamToday());
  if (operator === 20) return { from: iso(today), to: iso(today) };
  if (operator === 21) { const date = shifted(today, -1); return { from: iso(date), to: iso(date) }; }
  if (operator === 22) { const date = shifted(today, 1); return { from: iso(date), to: iso(date) }; }
  if (operator === 23 || operator === 26 || operator === 32) {
    const mondayOffset = (today.getUTCDay() + 6) % 7;
    const weekOffset = operator === 26 ? -7 : operator === 32 ? 7 : 0;
    const from = shifted(today, -mondayOffset + weekOffset);
    return { from: iso(from), to: iso(shifted(from, 6)) };
  }
  if (operator === 24) return monthRange(today, 0);
  if (operator === 27) return monthRange(today, -1);
  if (operator === 33) return monthRange(today, 1);
  if (operator === 25) return yearRange(today, 0);
  if (operator === 28) return yearRange(today, -1);
  if (operator === 34) return yearRange(today, 1);
  return null;
}
