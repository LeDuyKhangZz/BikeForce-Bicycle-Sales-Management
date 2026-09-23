import { CircleCheck, CircleDashed } from 'lucide-react';

import { customerCommitmentPercent } from '@/lib/amis/customer-commitment-progress';
import type { MisaCustomerCommitmentStats } from '@/services/misa-report119-cache';

type Props = { stats: MisaCustomerCommitmentStats };

export function CustomerCommitmentProgress({ stats }: Props) {
  const percent = customerCommitmentPercent(stats.committed, stats.total);
  return (
    <section aria-label="Tiến độ cam kết khách hàng" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-heading"><CircleDashed aria-hidden="true" className="size-5 text-warning" /><span className="font-semibold">Chưa cam kết</span><strong className="tabular-nums text-warning">{stats.uncommitted} KH</strong></div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><CircleCheck aria-hidden="true" className="size-5 text-success" /><span>Đã cam kết</span><strong className="tabular-nums text-heading">{stats.committed}/{stats.total} KH</strong><span>({percent}%)</span></div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-pill bg-status-pending-bg" aria-hidden="true">
        <div className="h-full rounded-pill bg-success transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}
