import { describe, expect, it } from 'vitest';
import {
  buildPancakeSnapshot,
  getDayUnixRange,
  getVietnamDayUnixRange,
  isOrderOnVietnamDate,
  isOrderOnDate,
  isSingaporeMarketplaceOrder,
  readMarketplaceFinancials,
} from '../../supabase/functions/_shared/pancake';

describe('Pancake Edge Function', () => {
  it('tính biên Unix đúng', () => {
    expect(getVietnamDayUnixRange('2026-10-10')).toEqual({ start: 1791565200, end: 1791651599 });
  });

  it('lọc timestamp theo ngày Việt Nam', () => {
    expect(isOrderOnVietnamDate({ inserted_at: '2026-10-09T17:00:00Z' }, '2026-10-10')).toBe(true);
    expect(isOrderOnVietnamDate({ inserted_at: '2026-10-09T16:59:59Z' }, '2026-10-10')).toBe(false);
  });

  it('tính và lọc đúng ngày Singapore UTC+8', () => {
    expect(getDayUnixRange('2026-10-10', 8)).toEqual({ start: 1791561600, end: 1791647999 });
    expect(isOrderOnDate({ inserted_at: '2026-10-09T16:00:00Z' }, '2026-10-10', 8)).toBe(true);
    expect(isOrderOnDate({ inserted_at: '2026-10-09T15:59:59Z' }, '2026-10-10', 8)).toBe(false);
  });

  it('Singapore chỉ nhận nguồn TikTok', () => {
    expect(isSingaporeMarketplaceOrder({ order_sources_name: 'Tiktok' })).toBe(true);
    expect(isSingaporeMarketplaceOrder({ order_sources_name: 'Shopee' })).toBe(true);
    expect(isSingaporeMarketplaceOrder({ order_sources_name: 'Website' })).toBe(false);
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

  it('đọc tài chính Shopee/TikTok và tính tiền sàn trả giống giao diện Pancake', () => {
    const rows = readMarketplaceFinancials({ data: [
      {
        'Order.marketplace_id': '-3',
        result: {
          delivered_count: 133, price: 20_439_825, discount: 7_085_450,
          marketplace_voucher: 0, fee_marketplace: 3_927_338, cod: 9_427_037,
          prepaid: 0, capital: 0, payment_fee: 1_985_551,
          seller_transaction_fee: 813_010, service_fee: 1_128_777,
          sfp_service_fee: 0, affiliate_commission: 0, platform_commission: 0,
          platform_shipping_fee: 0, diff_shipping_fee: 0, marketplace_tax: 0,
          marketing_fee: 0, ads_top_up: 144_219,
        },
      },
      {
        'Order.marketplace_id': '-9',
        result: {
          delivered_count: 1257, price: 165_174_750, discount: 89_342_330,
          marketplace_voucher: 5_909_442, fee_marketplace: 5_455_293,
          cod: 76_288_259, prepaid: -1690, capital: 0, payment_fee: 0,
          seller_transaction_fee: 0, service_fee: 1_101_597,
          sfp_service_fee: 0, affiliate_commission: 62_957,
          platform_commission: 817_340, platform_shipping_fee: 0,
          diff_shipping_fee: 0, marketplace_tax: 0, marketing_fee: 0, ads_top_up: 0,
        },
      },
    ] });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      marketplace_code: 'SHOPEE', platform_receivable: 9_427_037, ads_top_up: 144_219,
    });
    expect(rows[1]).toMatchObject({
      marketplace_code: 'TIKTOK', platform_receivable: 76_286_569, cod: 76_288_259,
      prepaid: -1690,
    });
  });

  it('bỏ marketplace không hỗ trợ và từ chối số tiền sai', () => {
    expect(readMarketplaceFinancials({ data: [{ 'Order.marketplace_id': '-1', result: {} }] }))
      .toEqual([]);
    expect(() => readMarketplaceFinancials({
      data: [{ 'Order.marketplace_id': '-3', result: { price: -1 } }],
    })).toThrow('price âm');
  });
});
