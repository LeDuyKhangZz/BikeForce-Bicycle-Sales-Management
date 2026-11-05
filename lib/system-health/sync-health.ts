import { getVietnamDateFromTimestamp } from '@/lib/date';

export type SyncCadence = 'DAILY' | 'MONTHLY' | 'ON_DEMAND';

export type SyncSourceSnapshot = {
  key: string;
  label: string;
  description: string;
  cadence: SyncCadence;
  latestSyncedAt: string | null;
  dataPeriod: string | null;
  href: string;
  queryFailed?: boolean;
  runStatus?: string | null;
  runError?: string | null;
};

export type SyncHealthStatus = 'HEALTHY' | 'WARNING' | 'STALE' | 'EMPTY' | 'FAILED' | 'RUNNING';

export type SyncHealthItem = SyncSourceSnapshot & {
  status: SyncHealthStatus;
  statusLabel: string;
  ageHours: number | null;
  syncedToday: boolean;
};

export type SyncHealthSummary = {
  items: SyncHealthItem[];
  healthyCount: number;
  attentionCount: number;
  totalCount: number;
  checkedAt: string;
};

const STATUS_LABEL: Record<SyncHealthStatus, string> = {
  HEALTHY: 'Hoạt động tốt',
  WARNING: 'Sắp quá hạn',
  STALE: 'Quá hạn',
  EMPTY: 'Chưa có dữ liệu',
  FAILED: 'Đồng bộ lỗi',
  RUNNING: 'Đang đồng bộ',
};

const FRESHNESS_HOURS: Record<SyncCadence, { healthy: number; warning: number }> = {
  DAILY: { healthy: 30, warning: 54 },
  MONTHLY: { healthy: 35 * 24, warning: 45 * 24 },
  ON_DEMAND: { healthy: 36, warning: 72 },
};

function resolveStatus(source: SyncSourceSnapshot, ageHours: number | null): SyncHealthStatus {
  if (source.queryFailed) return 'FAILED';
  if (source.runStatus === 'FAILED') return 'FAILED';
  if (source.runStatus === 'PENDING' || source.runStatus === 'RUNNING') return 'RUNNING';
  if (ageHours === null) return 'EMPTY';

  const threshold = FRESHNESS_HOURS[source.cadence];
  if (ageHours <= threshold.healthy) return 'HEALTHY';
  if (ageHours <= threshold.warning) return 'WARNING';
  return 'STALE';
}
export function buildSyncHealthSummary(
  sources: readonly SyncSourceSnapshot[],
  checkedAt: string,
): SyncHealthSummary {
  const checkedTimestamp = Date.parse(checkedAt);
  const safeCheckedTimestamp = Number.isNaN(checkedTimestamp) ? Date.now() : checkedTimestamp;
  const today = getVietnamDateFromTimestamp(checkedAt);

  const items = sources.map((source): SyncHealthItem => {
    const syncedTimestamp = source.latestSyncedAt === null ? Number.NaN : Date.parse(source.latestSyncedAt);
    const ageHours = Number.isNaN(syncedTimestamp)
      ? null
      : Math.max(0, (safeCheckedTimestamp - syncedTimestamp) / 3_600_000);
    const status = resolveStatus(source, ageHours);

    const syncedDate = source.latestSyncedAt === null
      ? null
      : getVietnamDateFromTimestamp(source.latestSyncedAt);

    return {
      ...source,
      status,
      statusLabel: STATUS_LABEL[status],
      ageHours,
      syncedToday: today !== null && syncedDate === today,
    };
  });

  const healthyCount = items.filter((item) => item.status === 'HEALTHY').length;

  return {
    items,
    healthyCount,
    attentionCount: items.length - healthyCount,
    totalCount: items.length,
    checkedAt,
  };
}
