import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  RefreshCw,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { formatVietnamDateTime } from '@/lib/date';
import type { SyncHealthItem, SyncHealthSummary } from '@/lib/system-health/sync-health';

type Props = { summary: SyncHealthSummary };
type DisplayStatus = 'SYNCED' | 'NOT_SYNCED' | 'MONTHLY' | 'RUNNING' | 'FAILED' | 'EMPTY';

function getDisplayStatus(item: SyncHealthItem): DisplayStatus {
  if (item.status === 'FAILED' || item.runStatus === 'FAILED') return 'FAILED';
  if (item.status === 'RUNNING') return 'RUNNING';
  if (item.cadence === 'MONTHLY') return 'MONTHLY';
  if (item.latestSyncedAt === null) return 'EMPTY';
  return item.syncedToday ? 'SYNCED' : 'NOT_SYNCED';
}

const STATUS_STYLES: Record<DisplayStatus, string> = {
  SYNCED: 'bg-status-success-bg text-status-success-fg',
  NOT_SYNCED: 'bg-status-warning-bg text-status-warning-fg',
  MONTHLY: 'bg-status-info-bg text-status-info-fg',
  RUNNING: 'bg-status-info-bg text-status-info-fg',
  FAILED: 'bg-status-missed-bg text-status-missed-fg',
  EMPTY: 'bg-status-pending-bg text-muted-foreground',
};

function StatusIcon({ status }: { status: DisplayStatus }) {
  const className = 'size-4 shrink-0';
  if (status === 'SYNCED') return <CheckCircle2 aria-hidden="true" className={className} />;
  if (status === 'NOT_SYNCED') return <Clock3 aria-hidden="true" className={className} />;
  if (status === 'MONTHLY') return <CalendarClock aria-hidden="true" className={className} />;
  if (status === 'RUNNING') return <RefreshCw aria-hidden="true" className={className} />;
  if (status === 'FAILED') return <AlertCircle aria-hidden="true" className={className} />;
  return <DatabaseZap aria-hidden="true" className={className} />;
}

function getStatusLabel(status: DisplayStatus): string {
  if (status === 'SYNCED') return 'Đã đồng bộ hôm nay';
  if (status === 'NOT_SYNCED') return 'Chưa đồng bộ hôm nay';
  if (status === 'MONTHLY') return 'Theo lịch hằng tháng';
  if (status === 'RUNNING') return 'Đang chạy';
  if (status === 'FAILED') return 'Đồng bộ lỗi';
  return 'Chưa có dữ liệu';
}

function getTimingDescription(item: SyncHealthItem, status: DisplayStatus): string {
  if (status === 'FAILED' && item.runError) return item.runError;
  if (item.latestSyncedAt !== null) {
    return `Lần gần nhất: ${formatVietnamDateTime(item.latestSyncedAt)}`;
  }
  if (status === 'FAILED') return item.runError ?? 'Lần chạy gần nhất thất bại.';
  if (item.queryFailed) return 'Không đọc được trạng thái đồng bộ.';
  return item.cadence === 'MONTHLY' ? 'Chưa ghi nhận lần đồng bộ nào.' : 'Chưa có bản ghi đồng bộ.';
}

export function SyncTodayOverview({ summary }: Props) {
  const tracked = summary.items.filter((item) => item.cadence !== 'MONTHLY');
  const syncedCount = tracked.filter((item) => item.syncedToday && item.status !== 'FAILED' && item.status !== 'RUNNING').length;
  const pendingCount = tracked.length - syncedCount;

  return (
    <section aria-labelledby="sync-today-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="sync-today-title" className="text-lg font-semibold text-heading">Tình trạng đồng bộ hôm nay</h2>
          <p className="text-sm text-muted-foreground">Tính theo thời điểm đồng bộ, giờ Việt Nam.</p>
        </div>
        <p className="text-sm font-medium text-muted-foreground"><span className="font-bold text-status-exceeded-fg">{syncedCount} đã đồng bộ</span><span aria-hidden="true"> · </span><span className="font-bold text-status-near-fg">{pendingCount} cần kiểm tra</span></p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {summary.items.map((item) => {
          const status = getDisplayStatus(item);
          return (
            <Card key={item.key} className="flex min-w-0 flex-col gap-3 bg-white/90 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="font-semibold text-heading">{item.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p></div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}><StatusIcon status={status} />{getStatusLabel(status)}</span>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-2 border-t border-border/70 pt-2">
                <div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{getTimingDescription(item, status)}</p>{item.dataPeriod && <p className="mt-1 truncate text-xs text-muted-foreground">Kỳ dữ liệu: {item.dataPeriod}</p>}</div>
                <Link href={item.href} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold text-primary hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  Mở nguồn <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
