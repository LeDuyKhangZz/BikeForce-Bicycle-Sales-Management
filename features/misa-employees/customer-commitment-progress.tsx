import { CircleCheck, CircleDashed } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { misaCustomerQuery } from '@/lib/amis/customer-filters';

import { customerCommitmentPercent } from '@/lib/amis/customer-commitment-progress';
import type { MisaCustomerCommitmentStats } from '@/services/misa-report119-cache';

type Props = { stats: MisaCustomerCommitmentStats; path?: string; month?: string; salesMonth?: string };

function CommitmentItem({ href, children }: { href?: string; children: ReactNode }) {
  const className = 'flex min-h-11 flex-wrap items-center gap-2 rounded-lg text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
  return href ? <Link href={href} className={`${className} hover:bg-primary/5`}>{children}</Link> : <div className={className}>{children}</div>;
}

export function CustomerCommitmentProgress({ stats, path, month, salesMonth }: Props) {
  const percent = customerCommitmentPercent(stats.committed, stats.total);
  const href = (commitment: 'committed' | 'uncommitted') => {
    if (!path || !month) return undefined;
    const query = new URLSearchParams(misaCustomerQuery(month, {}, 1, undefined, undefined, undefined, commitment));
    if (salesMonth) query.set('salesMonth', salesMonth);
    return `${path}?${query}`;
  };
  return (
    <section aria-label="Tiến độ cam kết khách hàng" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CommitmentItem href={href('uncommitted')}><CircleDashed aria-hidden="true" className="size-5 text-warning" /><span className="font-semibold text-heading">Chưa cam kết</span><strong className="tabular-nums text-warning">{stats.uncommitted} KH</strong></CommitmentItem>
        <CommitmentItem href={href('committed')}><CircleCheck aria-hidden="true" className="size-5 text-success" /><span className="text-muted-foreground">Đã cam kết</span><strong className="tabular-nums text-heading">{stats.committed}/{stats.total} KH</strong><span className="text-muted-foreground">({percent}%)</span></CommitmentItem>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-pill bg-status-pending-bg" aria-hidden="true">
        <div className="h-full rounded-pill bg-success transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}
