import { BarChart3, CalendarDays, Clock, Coins, FileText, MapPin, RefreshCw, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buttonClassName } from '@/components/ui/button';
import { CustomerCareStatus } from '@/features/misa-employees/customer-care-status';
import { CustomerCareReviewBadge } from '@/features/misa-employees/customer-care-review-badge';
import { MonthlySalesChange } from '@/features/misa-employees/monthly-sales-change';
import { formatMisaAmount, formatMisaDate } from '@/lib/amis/customer-display';
import { getCustomerDormancyLevel } from '@/lib/amis/customer-dormancy';
import { customerRevenueGroupLabel, defaultMonthlyFrequency, getCustomerRevenueGroup } from '@/lib/amis/customer-revenue-group';
import type { MisaCustomer } from '@/types/misa-customer';

type Props = { customer: MisaCustomer; index: number; report44Month?: string; alertCutoff: string; careHref?: string };
const GROUP_TONES = { A: 'success', B: 'info', C: 'warning', D: 'neutral' } as const;
const DORMANCY_TONES = { UNKNOWN: 'neutral', DANGER: 'danger', WARNING: 'warning', NORMAL: 'neutral' } as const;

export function CustomerMobileCard({ customer, index, report44Month, alertCutoff, careHref }: Props) {
  const group = getCustomerRevenueGroup(customer.orderSales);
  const level = getCustomerDormancyLevel(customer.daysWithoutPurchase);
  const metrics = [
    { label: 'Công nợ', value: formatMisaAmount(customer.debt), icon: Coins, surface: 'bg-status-exceeded-bg text-status-exceeded-fg' },
    { label: 'Doanh số', value: formatMisaAmount(customer.orderSales), icon: BarChart3, surface: 'bg-status-info-bg text-status-info-fg' },
    { label: report44Month ? `Tháng ${report44Month.slice(5, 7)}` : 'Theo tháng', value: formatMisaAmount(customer.report44OrderSales ?? null), icon: CalendarDays, surface: 'bg-status-info-bg text-status-info-fg', trend: true },
    { label: 'Mua gần nhất', value: formatMisaDate(customer.recentPurchaseDate), icon: ShoppingCart, surface: 'bg-primary/5 text-heading' },
  ];
  return (
    <article className="rounded-2xl border border-border bg-card p-3 shadow-brand-sm">
      <div className="flex items-start gap-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-bold tabular-nums text-primary">{index}</span>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-primary">{customer.code || '—'}</p><h2 className="break-words text-base font-bold leading-tight text-heading">{customer.name || '—'}</h2><div className="mt-1"><CustomerCareReviewBadge review={customer.careReview} /></div><p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin aria-hidden="true" className="size-4 shrink-0 text-primary" />{customer.billingProvince || '—'}</p></div>
        <Badge tone={GROUP_TONES[group]} className="grid size-8 shrink-0 place-items-center rounded-full p-0 text-sm" aria-label={customerRevenueGroupLabel(group)}>{group}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-1.5">
        {metrics.map(({ label, value, icon: Icon, surface, trend }) => <div key={label} className={`min-w-0 rounded-xl px-1.5 py-2 ${surface}`}><dt className="text-[10px] leading-tight"><Icon aria-hidden="true" className="mb-1 size-4" />{label}</dt><dd className="mt-2 break-words text-[10px] font-bold tabular-nums">{value}</dd>{trend && <dd className="mt-1 text-[8px] font-semibold leading-tight"><MonthlySalesChange current={customer.report44OrderSales ?? null} previous={customer.previousReport44OrderSales} /></dd>}</div>)}
      </dl>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 rounded-xl border border-border p-2.5 text-xs">
        <div className="min-w-0"><dt className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock aria-hidden="true" className="size-4 shrink-0" />Số ngày chưa mua hàng</dt><dd className="mt-1"><Badge tone={DORMANCY_TONES[level]}>{customer.daysWithoutPurchase ?? '—'}</Badge></dd></div>
        <div className="min-w-0"><dt className="flex items-center gap-1 text-[10px] text-muted-foreground"><CalendarDays aria-hidden="true" className="size-4 shrink-0" />Ghé thăm gần nhất</dt><dd className="mt-1 font-semibold"><CustomerCareStatus lastVisitDate={customer.lastVisitDate} cutoff={alertCutoff} /></dd></div>
        <div className="min-w-0 border-t border-border pt-2"><dt className="flex items-center gap-1 text-[10px] text-muted-foreground"><RefreshCw aria-hidden="true" className="size-4 shrink-0" />Tần suất/tháng</dt><dd className="mt-1 font-semibold text-primary">{customer.monthlyFrequency ?? defaultMonthlyFrequency(group)} lần</dd></div>
        <div className="min-w-0 border-t border-border pt-2"><dt className="flex items-center gap-1 text-[10px] text-muted-foreground"><FileText aria-hidden="true" className="size-4 shrink-0" />Doanh số cam kết</dt><dd className="mt-1 break-words font-semibold text-primary">{customer.committedSales == null ? 'Chưa nhập' : formatMisaAmount(customer.committedSales)}</dd></div>
      </dl>
      {careHref && <Link href={careHref} className={buttonClassName({ className: 'mt-3 w-full' })}>Gửi minh chứng chăm sóc</Link>}
    </article>
  );
}
