import { formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDateTime } from '@/lib/date';

export function formatMisaAmount(value: number | null): string {
  return value === null ? '—' : formatCurrencyVND(value);
}

export function formatMisaDate(value: string | null): string {
  if (!value) return '—';
  return formatVietnamDateTime(value).split(' ')[0] ?? '—';
}
