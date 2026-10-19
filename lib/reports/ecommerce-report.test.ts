import { describe, expect, it } from 'vitest';

import { buildEcommerceReportViewModel, type EcommerceReportData } from './ecommerce-report';

const REPORT: EcommerceReportData = {
  reports: [
    {
      daily: {
        report_date: '2026-10-19',
        shop_id: 1022081353,
        employee_name: 'Nguyễn Ngọc Triết',
        market_code: 'VN',
        currency_code: 'VND',
        order_count: 8,
        revenue: 1_834_650,
        cancelled_count: 0,
        returned_count: 0,
        late_count: 0,
        ads_order_count: 0,
        ads_gmv: 0,
        synced_at: '2026-10-19T02:00:00Z',
      },
      sources: [
        {
          report_date: '2026-10-19',
          shop_id: 1022081353,
          source_name: 'Tiktok',
          order_count: 6,
          revenue: 1_464_075,
          synced_at: '2026-10-19T02:00:00Z',
        },
      ],
    },
    {
      daily: {
        report_date: '2026-10-19',
        shop_id: 1943148428,
        employee_name: 'Nguyễn Ngọc Triết',
        market_code: 'SG',
        currency_code: 'SGD',
        order_count: 1,
        revenue: 349,
        cancelled_count: 0,
        returned_count: 0,
        late_count: 0,
        ads_order_count: 0,
        ads_gmv: 0,
        synced_at: '2026-10-19T02:00:00Z',
      },
      sources: [
        {
          report_date: '2026-10-19',
          shop_id: 1943148428,
          source_name: 'Tiktok',
          order_count: 1,
          revenue: 349,
          synced_at: '2026-10-19T02:00:00Z',
        },
        {
          report_date: '2026-10-19',
          shop_id: 1943148428,
          source_name: 'Shopee',
          order_count: 1,
          revenue: 100,
          synced_at: '2026-10-19T02:00:00Z',
        },
      ],
    },
  ],
};

describe('buildEcommerceReportViewModel', () => {
  it('giữ tổng quan Việt Nam và tách TikTok Singapore bằng SGD', () => {
    const result = buildEcommerceReportViewModel(REPORT);

    expect(result?.metrics[1]?.display).toBe('1.834.650 ₫');
    expect(result?.sourceGroups).toHaveLength(2);
    expect(result?.sourceGroups[1]?.label).toBe('Nguồn Singapore');
    expect(result?.sourceGroups[1]?.sources).toEqual([
      { name: 'Shopee', orderCount: 1, revenueDisplay: 'S$1.00' },
      { name: 'Tiktok', orderCount: 1, revenueDisplay: 'S$3.49' },
    ]);
  });

  it('không tạo báo cáo tổng quan khi chưa có snapshot Việt Nam', () => {
    const singaporeOnly = REPORT.reports.filter(({ daily }) => daily.market_code === 'SG');
    expect(buildEcommerceReportViewModel({ reports: singaporeOnly })).toBeNull();
  });

  it('vẫn hiện Shopee và TikTok Singapore bằng S$0.00 khi ngày đó chưa có đơn', () => {
    const reports = REPORT.reports.map((item) =>
      item.daily.market_code === 'SG' ? { ...item, sources: [] } : item,
    );
    const result = buildEcommerceReportViewModel({ reports });

    expect(result?.sourceGroups[1]?.sources).toEqual([
      { name: 'Shopee', orderCount: 0, revenueDisplay: 'S$0.00' },
      { name: 'Tiktok', orderCount: 0, revenueDisplay: 'S$0.00' },
    ]);
  });
});
