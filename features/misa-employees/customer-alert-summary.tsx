import Link from 'next/link';
import { AlertTriangle, ArrowRight, Store, ShoppingCart } from 'lucide-react';

import { misaCustomerQuery } from '@/lib/amis/customer-filters';
import type { CustomerAlert, CustomerAlertCounts } from '@/lib/amis/customer-alerts';

type Props = { counts: CustomerAlertCounts; path: string; month: string; active?: CustomerAlert };

export function CustomerAlertSummary({ counts, path, month, active }: Props) {
  const items = [
    { key: 'purchase', label: 'Từ 30 ngày chưa mua hàng', count: counts.purchase, icon: ShoppingCart },
    { key: 'care', label: 'Từ 30 ngày chưa chăm sóc', count: counts.care, icon: Store },
  ] as const;
  return (
    <section aria-label="Cảnh báo khách hàng" className="min-w-0 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-heading"><AlertTriangle aria-hidden="true" className="size-5 text-destructive" />Khách hàng cần quan tâm</h2>
      <p className="mt-1 text-sm text-muted-foreground">Toàn bộ khách hàng trong tháng đang xem. Chăm sóc tính theo ngày ghé thăm, gồm khách chưa có ngày ghé thăm.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {items.map(({ key, label, count, icon: Icon }) => (
          <Link key={key} href={`${path}?${misaCustomerQuery(month, {}, 1, undefined, key)}`}
            aria-current={active === key ? 'true' : undefined}
            className={`flex min-h-24 min-w-0 items-center gap-3 rounded-xl border border-input-border p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active === key ? 'ring-2 ring-destructive' : ''} ${count > 0 ? 'bg-status-missed-bg text-status-missed-fg' : 'bg-primary/5 text-heading'}`}>
            <Icon aria-hidden="true" className="size-6 shrink-0" />
            <span className="min-w-0 flex-1"><span className="block text-2xl font-bold tabular-nums">{count} khách</span><span className="block text-sm">{label}</span><span className="mt-1 block text-xs underline">Xem danh sách</span></span>
            <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
          </Link>
        ))}
      </div>
      {active && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><p className="font-semibold text-destructive">Đang xem: {active === 'purchase' ? 'khách từ 30 ngày chưa mua hàng' : 'khách cần chăm sóc'}</p><Link href={`${path}?month=${month}`} className="inline-flex min-h-11 items-center rounded-lg px-3 text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Xem tất cả khách hàng</Link></div>}
    </section>
  );
}
