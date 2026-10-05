import { BarChart3, CalendarDays, ChevronRight, Coins, MapPin, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CustomerCareStatus } from '@/features/misa-employees/customer-care-status';
import { formatMisaAmount, formatMisaCompactAmount, formatMisaDate } from '@/lib/amis/customer-display';
import { customerRevenueGroupLabel, defaultMonthlyFrequency, getCustomerRevenueGroup } from '@/lib/amis/customer-revenue-group';
import type { MisaCustomer } from '@/types/misa-customer';

type Props = { customer: MisaCustomer; index: number; report44Month?: string; alertCutoff: string };
const GROUP_TONES = { A: 'success', B: 'info', C: 'warning', D: 'neutral' } as const;

export function CustomerPopupCard({ customer, index, report44Month, alertCutoff }: Props) {
  const group = getCustomerRevenueGroup(customer.orderSales);
  const metrics = [
    { label: 'Công nợ', value: formatMisaCompactAmount(customer.debt), icon: Coins, surface: 'bg-status-exceeded-bg text-status-exceeded-fg' },
    { label: 'Doanh số', value: formatMisaCompactAmount(customer.orderSales), icon: BarChart3, surface: 'bg-status-info-bg text-status-info-fg' },
    { label: report44Month ? `Tháng ${report44Month.slice(5, 7)}` : 'Theo tháng', value: formatMisaCompactAmount(customer.report44OrderSales ?? null), icon: CalendarDays, surface: 'bg-status-info-bg text-status-info-fg' },
    { label: 'Mua gần nhất', value: formatMisaDate(customer.recentPurchaseDate), icon: ShoppingCart, surface: 'bg-primary/5 text-heading' },
  ];
  return (
    <article className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-brand-sm">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold tabular-nums text-primary">{index}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">{customer.code || '—'}</span>
            <span className="block break-words text-sm font-bold leading-snug text-heading sm:text-base">{customer.name || '—'}</span>
            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin aria-hidden="true" className="size-3.5 shrink-0 text-primary" />{customer.billingProvince || '—'}</span>
          </span>
          <Badge tone={GROUP_TONES[group]} className="grid size-8 shrink-0 place-items-center rounded-full p-0 text-sm" aria-label={customerRevenueGroupLabel(group)}>{group}</Badge>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-open:rotate-90" />
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
          <div><dt className="text-muted-foreground">Số ngày chưa mua</dt><dd>{customer.daysWithoutPurchase ?? '—'}</dd></div>
          <div><dt className="text-muted-foreground">Ghé thăm gần nhất</dt><dd><CustomerCareStatus lastVisitDate={customer.lastVisitDate} cutoff={alertCutoff} /></dd></div>
          <div><dt className="text-muted-foreground">Tần suất/tháng</dt><dd>{customer.monthlyFrequency ?? defaultMonthlyFrequency(group)} lần</dd></div>
          <div><dt className="text-muted-foreground">Doanh số cam kết</dt><dd>{formatMisaAmount(customer.committedSales ?? null)}</dd></div>
        </dl>
      </details>
      <dl className="mt-3 grid grid-cols-4 gap-1.5">
        {metrics.map(({ label, value, icon: Icon, surface }) => <div key={label} className={`min-w-0 rounded-xl px-1.5 py-2 ${surface}`}>
          <dt className="flex flex-wrap items-center gap-1 text-[9px] leading-tight sm:text-xs"><Icon aria-hidden="true" className="size-3 shrink-0" />{label}</dt>
          <dd className="mt-1 break-words text-[11px] font-bold leading-tight tabular-nums sm:text-sm">{value}</dd>
        </div>)}
      </dl>
    </article>
  );
}
