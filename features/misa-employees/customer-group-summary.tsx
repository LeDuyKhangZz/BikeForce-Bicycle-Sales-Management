import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { misaCustomerQuery } from '@/lib/amis/customer-filters';
import type { CustomerRevenueGroup } from '@/lib/amis/customer-revenue-group';
import type { MisaCustomerGroupCounts } from '@/services/misa-report119-cache';

type Props = { counts: MisaCustomerGroupCounts; path: string; month: string; active?: CustomerRevenueGroup };

const GROUPS = [
  { key: 'A', rule: '≥ 150 triệu', tone: 'success', surface: 'bg-status-exceeded-bg text-status-exceeded-fg' },
  { key: 'B', rule: '50 – < 150 triệu', tone: 'info', surface: 'bg-status-info-bg text-status-info-fg' },
  { key: 'C', rule: '> 0 – < 50 triệu', tone: 'warning', surface: 'bg-status-near-bg text-status-near-fg' },
  { key: 'D', rule: 'Chưa phát sinh', tone: 'neutral', surface: 'bg-status-pending-bg text-status-pending-fg' },
] as const;

export function CustomerGroupSummary({ counts, path, month, active }: Props) {
  return (
    <section aria-labelledby="customer-groups-title" className="rounded-xl border border-border bg-card p-2 shadow-sm md:rounded-2xl md:p-4">
      <h2 id="customer-groups-title" className="text-sm font-bold text-heading md:text-lg">Phân nhóm doanh số</h2>
      <div className="mt-1.5 grid grid-cols-4 gap-2 md:mt-3 md:gap-3">
        {GROUPS.map((group) => (
          <Link key={group.key} href={`${path}?${misaCustomerQuery(month, {}, 1, undefined, undefined, group.key)}`}
            aria-label={`Xem nhóm ${group.key}: ${counts[group.key]} khách hàng`} aria-current={active === group.key ? 'true' : undefined}
            className={`flex min-h-11 min-w-0 flex-col items-center justify-center rounded-lg border border-input-border px-0.5 py-0.5 text-center md:min-h-28 md:rounded-xl md:p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${group.surface} ${active === group.key ? 'ring-2 ring-primary' : ''}`}>
            <Badge tone={group.tone} className="size-4 justify-center rounded-full p-0 text-[8px] md:size-9 md:text-base">{group.key}</Badge>
            <p className="text-[8px] font-medium leading-none md:mt-2 md:text-xs md:leading-tight">{group.rule}</p>
            <p className="text-[10px] font-bold leading-none tabular-nums md:mt-1 md:text-base">{counts[group.key]} KH</p>
            <span className="mt-1 hidden text-xs underline md:block">Xem danh sách</span>
          </Link>
        ))}
      </div>
      {active && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><p className="font-semibold text-heading">Đang xem khách hàng nhóm {active}</p><Link href={`${path}?month=${month}`} className="inline-flex min-h-11 items-center rounded-lg px-3 text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Xem tất cả khách hàng</Link></div>}
    </section>
  );
}
