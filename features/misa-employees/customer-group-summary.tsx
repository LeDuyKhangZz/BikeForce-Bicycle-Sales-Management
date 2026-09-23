import { Badge } from '@/components/ui/badge';
import type { MisaCustomerGroupCounts } from '@/services/misa-report119-cache';

type Props = { counts: MisaCustomerGroupCounts };

const GROUPS = [
  { key: 'A', rule: '≥ 150 triệu', tone: 'success', surface: 'bg-status-exceeded-bg text-status-exceeded-fg' },
  { key: 'B', rule: '50 – < 150 triệu', tone: 'info', surface: 'bg-status-info-bg text-status-info-fg' },
  { key: 'C', rule: '> 0 – < 50 triệu', tone: 'warning', surface: 'bg-status-near-bg text-status-near-fg' },
  { key: 'D', rule: 'Chưa phát sinh', tone: 'neutral', surface: 'bg-status-pending-bg text-status-pending-fg' },
] as const;

export function CustomerGroupSummary({ counts }: Props) {
  return (
    <section aria-labelledby="customer-groups-title" className="rounded-2xl border border-border bg-card p-4 shadow-sm xl:hidden">
      <h2 id="customer-groups-title" className="text-lg font-bold text-heading">Phân nhóm doanh số</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GROUPS.map((group) => (
          <div key={group.key} className={`flex min-h-28 flex-col items-center justify-center rounded-xl p-3 text-center ${group.surface}`}>
            <Badge tone={group.tone} className="size-9 justify-center rounded-full p-0 text-base">{group.key}</Badge>
            <p className="mt-2 text-xs font-medium">{group.rule}</p>
            <p className="mt-1 font-bold tabular-nums">{counts[group.key]} KH</p>
          </div>
        ))}
      </div>
    </section>
  );
}
