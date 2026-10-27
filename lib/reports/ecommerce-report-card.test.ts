import { describe, expect, it } from 'vitest';

import {
  drawEcommerceReportCard,
  type EcommerceCanvas2DLike,
} from '@/lib/reports/ecommerce-report-card';
import {
  buildSaleWorkReportImageUrl,
  ECOMMERCE_REPORT_ACCOUNT,
} from '@/lib/reports/salework-image-accounts';

function recordingContext(): { context: EcommerceCanvas2DLike; texts: string[] } {
  const texts: string[] = [];
  return {
    texts,
    context: {
      fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, font: '',
      textAlign: 'left', textBaseline: 'alphabetic',
      beginPath: () => undefined, moveTo: () => undefined, arcTo: () => undefined,
      closePath: () => undefined, fill: () => undefined, stroke: () => undefined,
      fillRect: () => undefined, drawImage: () => undefined,
      fillText: (text) => texts.push(text),
    },
  };
}

describe('ảnh báo cáo Sàn TMĐT', () => {
  it('sinh URL n8n cho Nguyễn Ngọc Triết bằng cùng API key', () => {
    expect(ECOMMERCE_REPORT_ACCOUNT).toBe('Nguyễn Ngọc Triết');
    expect(buildSaleWorkReportImageUrl(ECOMMERCE_REPORT_ACCOUNT, 'key test')).toBe(
      '/api/salework/report-image?account=Nguy%E1%BB%85n%20Ng%E1%BB%8Dc%20Tri%E1%BA%BFt&key=key%20test',
    );
  });

  it('render đủ bảy chỉ số và các nguồn đơn Pancake', () => {
    const { context, texts } = recordingContext();
    drawEcommerceReportCard(context, {
      employeeName: ECOMMERCE_REPORT_ACCOUNT,
      reportDate: '08/10/2026',
      syncedAt: '08/10/2026, 23:50',
      metrics: [
        { label: 'Đơn hàng', display: '10' },
        { label: 'Doanh thu', display: '1.662.750 ₫' },
        { label: 'Đơn hủy', display: '0' },
        { label: 'Đơn hoàn', display: '0' },
        { label: 'Đơn trễ', display: '0' },
        { label: 'Đơn từ Ads', display: '2' },
        { label: 'GMV Ads', display: '300.000 ₫' },
      ],
      sourceGroups: [
        {
          label: 'Nguồn Việt Nam', reportDate: '08/10/2026', syncedAt: '08/10/2026 23:50',
          sources: [
            { name: 'Shopee', orderCount: 5, revenueDisplay: '1.144.875 ₫' },
            { name: 'Tiktok', orderCount: 5, revenueDisplay: '517.875 ₫' },
          ],
        },
        {
          label: 'Nguồn Singapore', reportDate: '08/10/2026', syncedAt: '08/10/2026 23:50',
          sources: [{ name: 'Tiktok', orderCount: 1, revenueDisplay: 'S$3.49' }],
        },
      ],
      financialSummary: [
        { label: 'Doanh số thành công', display: '1.900.000 ₫' },
        { label: 'Tổng phí sàn', display: '300.000 ₫' },
        { label: 'Tiền sàn trả', display: '1.600.000 ₫' },
        { label: 'Tiền nạp quảng cáo', display: '50.000 ₫' },
      ],
      marketplaceFinancials: [],
    });

    expect(texts).toEqual(expect.arrayContaining([
      'Báo cáo Sàn TMĐT', ECOMMERCE_REPORT_ACCOUNT, 'Đơn hàng', 'Doanh thu',
      'Đơn hủy', 'Đơn hoàn', 'Đơn trễ', 'Tài chính theo sàn',
      'Doanh số thành công', 'Tổng phí sàn', 'Tiền sàn trả', 'Tiền nạp quảng cáo',
      'Nguồn Việt Nam', 'Nguồn Singapore', 'Shopee', 'Tiktok', 'S$3.49',
    ]));
    expect(texts).not.toContain('Đơn từ Ads');
    expect(texts).not.toContain('GMV Ads');
    expect(texts).toContain('HAPPY HALLOWEEN · 31/10');
    expect(texts).not.toContain('PHỤ NỮ VIỆT NAM');
  });
});
