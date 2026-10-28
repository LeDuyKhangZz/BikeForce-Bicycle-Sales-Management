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
      financials: [
        {
          report_date: '2026-10-19', shop_id: 1022081353, marketplace_code: 'SHOPEE',
          currency_code: 'VND', delivered_count: 133, gross_sales: 20_439_825,
          shop_discount: 7_085_450, marketplace_voucher: 0, marketplace_fee: 3_927_338,
          platform_receivable: 9_427_037, cod: 9_427_037, prepaid: 0, capital: 0,
          payment_fee: 1_985_551, seller_transaction_fee: 813_010,
          service_fee: 1_128_777, sfp_service_fee: 0, affiliate_commission: 0,
          platform_commission: 0, platform_shipping_fee: 0, diff_shipping_fee: 0,
          marketplace_tax: 0, marketing_fee: 0, ads_top_up: 144_219,
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
      financials: [],
    },
  ],
};

describe('buildEcommerceReportViewModel', () => {
  it('giữ tổng quan Việt Nam và tách TikTok Singapore bằng SGD', () => {
    const result = buildEcommerceReportViewModel(REPORT);

    expect(result?.metrics[1]?.display).toBe('1.834.650 ₫');
    expect(result?.metrics[2]).toEqual({ label: 'Đơn hủy', display: '0' });
    expect(result?.cancelledNote).toBe(
      'Tổng giá trị đơn hàng bị hủy là 0\u00a0₫ — số tiền shop bị mất/phải trả là 0\u00a0₫.',
    );
    expect(result?.sourceGroups).toHaveLength(2);
    expect(result?.sourceGroups[1]?.label).toBe('Nguồn Singapore');
    expect(result?.sourceGroups[1]?.sources).toEqual([
      { name: 'Shopee', orderCount: 1, revenueDisplay: 'S$1.00' },
      { name: 'Tiktok', orderCount: 1, revenueDisplay: 'S$3.49' },
    ]);
    expect(result?.financialSummary).toEqual([
      { label: 'Doanh số thành công', display: '20.439.825 ₫' },
      { label: 'Tổng phí sàn', display: '3.927.338 ₫' },
      { label: 'Tiền sàn trả', display: '9.427.037 ₫' },
      { label: 'Tiền nạp quảng cáo', display: '144.219 ₫' },
    ]);
    expect(result?.marketplaceFinancials[0]).toMatchObject({
      name: 'Shopee', deliveredCount: 133, platformReceivableDisplay: '9.427.037 ₫',
    });
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

  it('hiển thị tổng giá trị đơn hàng bị hủy theo đúng số tiền của từng ngày', () => {
    const reports2710 = REPORT.reports.map((item) =>
      item.daily.market_code === 'VN'
        ? { ...item, daily: { ...item.daily, report_date: '2026-10-27', cancelled_count: 16 } }
        : item,
    );
    const result2710 = buildEcommerceReportViewModel({ reports: reports2710 });

    expect(result2710?.metrics[2]).toEqual({
      label: 'Đơn hủy',
      display: '16 (4.715.625\u00a0₫ · mất 0\u00a0₫)',
    });
    expect(result2710?.cancelledNote).toBe(
      'Tổng giá trị đơn hàng bị hủy là 4.715.625\u00a0₫ — số tiền shop bị mất/phải trả là 0\u00a0₫.',
    );

    const reports2810 = REPORT.reports.map((item) =>
      item.daily.market_code === 'VN'
        ? {
            ...item,
            daily: {
              ...item.daily,
              report_date: '2026-10-28',
              cancelled_count: 3,
              cancelled_revenue: 980_000,
            },
          }
        : item,
    );
    const result2810 = buildEcommerceReportViewModel({ reports: reports2810 });

    expect(result2810?.metrics[2]).toEqual({
      label: 'Đơn hủy',
      display: '3 (980.000\u00a0₫ · mất 0\u00a0₫)',
    });
    expect(result2810?.cancelledNote).toBe(
      'Tổng giá trị đơn hàng bị hủy là 980.000\u00a0₫ — số tiền shop bị mất/phải trả là 0\u00a0₫.',
    );
  });
});
