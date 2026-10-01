import { BarChart3 } from 'lucide-react';
import { formatMisaAmount } from '@/lib/amis/customer-display';
import { customerSalesMonthLabels, formatPreviousCustomerSales } from '@/lib/amis/customer-sales-comparison';

type Props = { month: string; current: number | null; previous: number | null | undefined };

export function CustomerSalesComparison({ month, current, previous }: Props) {
  const labels = customerSalesMonthLabels(month);
  return (
    <div className="mt-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-heading"><BarChart3 aria-hidden="true" className="size-4" />Doanh số đơn hàng</h3>
      <dl className="mt-2 grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-xl bg-status-info-bg p-3 text-status-info-fg"><dt className="text-xs">{labels.current}</dt><dd className="mt-1 break-words text-base font-bold tabular-nums">{formatMisaAmount(current)}</dd></div>
        <div className="min-w-0 rounded-xl border border-border bg-primary/5 p-3 text-heading"><dt className="text-xs">{labels.previous}</dt><dd className="mt-1 break-words text-base font-bold tabular-nums">{formatPreviousCustomerSales(previous)}</dd></div>
      </dl>
    </div>
  );
}
