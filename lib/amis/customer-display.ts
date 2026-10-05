import { formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDateTime } from '@/lib/date';

export function formatMisaAmount(value: number | null): string {
  return value === null ? '—' : formatCurrencyVND(value);
}

export function formatMisaCompactAmount(value: number | null): string {
  if (value === null) return '—';
  if (Math.abs(value) < 1_000_000) return formatMisaAmount(value);
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000)} tr`;
}

export function formatMisaDate(value: string | null): string {
  if (!value) return '—';
  return formatVietnamDateTime(value).split(' ')[0] ?? '—';
}
