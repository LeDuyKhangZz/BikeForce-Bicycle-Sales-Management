import Link from 'next/link';
import { AlertTriangle, Store, ShoppingCart } from 'lucide-react';

import { misaCustomerQuery } from '@/lib/amis/customer-filters';
import type { CustomerAlert, CustomerAlertCounts } from '@/lib/amis/customer-alerts';

type Props = { counts: CustomerAlertCounts; path: string; month: string; active?: CustomerAlert };

export function CustomerAlertSummary({ counts, path, month, active }: Props) {
  const items = [
    { key: 'purchase', label: 'Từ 30 ngày chưa mua hàng', count: counts.purchase, icon: ShoppingCart },
    { key: 'care', label: 'Từ 30 ngày chưa chăm sóc', count: counts.care, icon: Store },
  ] as const;
  return (
    <section aria-label="Cảnh báo khách hàng" className="min-w-0 rounded-xl border border-border bg-card p-2 sm:rounded-2xl sm:p-4">
      <h2 className="flex items-center gap-1 text-sm font-bold text-heading sm:gap-2 sm:text-lg"><AlertTriangle aria-hidden="true" className="size-3.5 text-destructive sm:size-5" />Khách hàng cần quan tâm</h2>
      <p className="mt-1 hidden text-sm text-muted-foreground sm:block">Toàn bộ khách hàng trong tháng đang xem. Chăm sóc tính theo ngày ghé thăm, gồm khách chưa có ngày ghé thăm.</p>
      <div className="mt-1 grid grid-cols-2 gap-2 sm:mt-3 sm:gap-3">
        {items.map(({ key, label, count, icon: Icon }) => (
          <Link key={key} href={`${path}?${misaCustomerQuery(month, {}, 1, undefined, key)}`}
            aria-current={active === key ? 'true' : undefined}
            className="flex h-[30px] min-w-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-auto sm:min-h-24">
            <span className={`flex h-[30px] w-full min-w-0 items-center gap-1 rounded-md border border-input-border px-1 sm:min-h-24 sm:gap-3 sm:rounded-xl sm:p-4 ${active === key ? 'ring-2 ring-destructive' : ''} ${count > 0 ? 'bg-status-missed-bg text-status-missed-fg' : 'bg-primary/5 text-heading'}`}>
              <span className="grid size-5 shrink-0 place-items-center rounded bg-card/60 sm:contents"><Icon aria-hidden="true" className="size-3 sm:size-6" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold leading-none tabular-nums sm:text-2xl">{count} khách</span><span className="block text-[8px] leading-none sm:mt-0.5 sm:text-sm sm:leading-tight">{label}</span><span className="mt-1 hidden text-xs underline sm:block">Xem danh sách</span></span>
            </span>
          </Link>
        ))}
      </div>
      {active && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><p className="font-semibold text-destructive">Đang xem: {active === 'purchase' ? 'khách từ 30 ngày chưa mua hàng' : 'khách cần chăm sóc'}</p><Link href={`${path}?month=${month}`} className="inline-flex min-h-11 items-center rounded-lg px-3 text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Xem tất cả khách hàng</Link></div>}
    </section>
  );
}
