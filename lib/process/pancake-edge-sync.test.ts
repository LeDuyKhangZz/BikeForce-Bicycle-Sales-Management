import { describe, expect, it } from 'vitest';
import {
  buildPancakeSnapshot,
  getVietnamDayUnixRange,
  isOrderOnVietnamDate,
} from '../../supabase/functions/_shared/pancake';

describe('Pancake Edge Function', () => {
  it('tính biên Unix đúng', () => {
    expect(getVietnamDayUnixRange('2026-10-10')).toEqual({ start: 1791565200, end: 1791651599 });
  });

  it('lọc timestamp theo ngày Việt Nam', () => {
    expect(isOrderOnVietnamDate({ inserted_at: '2026-10-09T17:00:00Z' }, '2026-10-10')).toBe(true);
    expect(isOrderOnVietnamDate({ inserted_at: '2026-10-09T16:59:59Z' }, '2026-10-10')).toBe(false);
  });

  it('tổng hợp đơn, nguồn, hủy, hoàn, trễ và Ads', () => {
    const snapshot = buildPancakeSnapshot(
      '2026-10-10',
      [
        { status: 6, total_price: 100, order_sources_name: 'Shopee' },
        { status: 4, total_price: 200, order_sources_name: 'Shopee' },
        {
          status: 1,
          total_price: 300,
          order_sources_name: 'Tiktok',
          ads_source: 'x',
          additional_info: { delivery_deadline: '2026-10-09T00:00:00Z' },
        },
      ],
      new Date('2026-10-10T00:00:00Z'),
    );
    expect(snapshot).toMatchObject({
      orderCount: 3,
      revenue: 500,
      cancelledCount: 1,
      returnedCount: 1,
      lateCount: 1,
      adsOrderCount: 1,
      adsGmv: 300,
    });
    expect(snapshot.sources).toEqual([
      { source_name: 'Shopee', order_count: 1, revenue: 200 },
      { source_name: 'Tiktok', order_count: 1, revenue: 300 },
    ]);
  });

  it('ghi snapshot 0 thay vì thành công giả khi ngày chưa có đơn', () => {
    expect(buildPancakeSnapshot('2026-10-10', [])).toMatchObject({ orderCount: 0, revenue: 0, sources: [] });
  });
});
