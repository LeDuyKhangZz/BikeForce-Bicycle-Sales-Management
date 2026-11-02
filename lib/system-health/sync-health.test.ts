import { describe, expect, it } from 'vitest';

import { buildSyncHealthSummary, type SyncSourceSnapshot } from './sync-health';

const BASE_SOURCE: SyncSourceSnapshot = {
  key: 'source',
  label: 'Nguồn thử nghiệm',
  description: 'Dữ liệu thử nghiệm',
  cadence: 'DAILY',
  latestSyncedAt: '2026-10-27T00:00:00.000Z',
  dataPeriod: '2026-10-27',
  href: '/admin',
};

describe('buildSyncHealthSummary', () => {
  it('phân loại nguồn hằng ngày theo tuổi dữ liệu', () => {
    const summary = buildSyncHealthSummary(
      [
        BASE_SOURCE,
        { ...BASE_SOURCE, key: 'warning', latestSyncedAt: '2026-10-25T18:00:00.000Z' },
        { ...BASE_SOURCE, key: 'stale', latestSyncedAt: '2026-10-24T00:00:00.000Z' },
      ],
      '2026-10-27T06:00:00.000Z',
    );

    expect(summary.items.map((item) => item.status)).toEqual(['HEALTHY', 'WARNING', 'STALE']);
    expect(summary.healthyCount).toBe(1);
    expect(summary.attentionCount).toBe(2);
  });

  it('ưu tiên trạng thái lỗi và đang chạy của worker', () => {
    const summary = buildSyncHealthSummary(
      [
        { ...BASE_SOURCE, key: 'failed', runStatus: 'FAILED' },
        { ...BASE_SOURCE, key: 'running', runStatus: 'RUNNING' },
        { ...BASE_SOURCE, key: 'empty', latestSyncedAt: null },
      ],
      '2026-10-27T06:00:00.000Z',
    );

    expect(summary.items.map((item) => item.status)).toEqual(['FAILED', 'RUNNING', 'EMPTY']);
  });

  it('đánh dấu lỗi truy vấn mà không làm hỏng toàn bộ bảng điều khiển', () => {
    const summary = buildSyncHealthSummary(
      [{ ...BASE_SOURCE, queryFailed: true }],
      '2026-10-27T06:00:00.000Z',
    );

    expect(summary.items[0]?.status).toBe('FAILED');
  });
});
