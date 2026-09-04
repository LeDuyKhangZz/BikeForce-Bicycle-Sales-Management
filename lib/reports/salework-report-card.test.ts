import { describe, expect, it } from 'vitest';

import {
  drawReportCard,
  getTelesaleCode,
  type Canvas2DLike,
} from '../../app/(admin)/admin/salework/salework-report-card';

type TextCall = {
  readonly text: string;
  readonly x: number;
};

function recordingContext(): { context: Canvas2DLike; texts: TextCall[] } {
  const texts: TextCall[] = [];
  const context: Canvas2DLike = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    beginPath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    arcTo: () => undefined,
    closePath: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
    fillRect: () => undefined,
    fillText: (text, x) => texts.push({ text, x }),
    measureText: (text) => ({ width: text.length * 8 }),
    scale: () => undefined,
  };

  return { context, texts };
}

describe('drawReportCard — bảng tình trạng tháng của SaleWork', () => {
  it('hiển thị đúng mã telesale của tài khoản Giao', () => {
    expect(getTelesaleCode('Giao - Kế Toán bán hàng')).toBe('VP-TLS-003');
  });

  it('tách tên nội dung khỏi cột chỉ tiêu và vẽ targetAmount ở đúng cột', () => {
    const { context, texts } = recordingContext();

    drawReportCard(context, {
      accountName: 'Tài khoản kiểm thử',
      conversations: 1,
      sentMessages: 2,
      receivedMessages: 3,
      incomingCalls: 4,
      outgoingCalls: 5,
      missedCalls: 6,
      callDuration: '7 phút',
      amis: {
        netSales: 320_000_000,
        sales: 350_000_000,
        returnSales: 30_000_000,
        noOfOrders: 8,
        targetAmount: 500_000_000,
        currentAmount: 420_000_000,
        syncedAt: '2026-09-03T02:15:00Z',
      },
    });

    const contentHeader = texts.find((call) => call.text === 'NỘI DUNG');
    const targetHeader = texts.find((call) => call.text === 'CHỈ TIÊU');
    const actualHeader = texts.find((call) => call.text === 'THỰC ĐẠT');
    const percentHeader = texts.find((call) => call.text === '% HOÀN THÀNH');
    const targetValue = texts.find((call) => call.text === '500.000.000');
    const actualValue = texts.find((call) => call.text === '420.000.000');

    expect([contentHeader?.text, targetHeader?.text, actualHeader?.text, percentHeader?.text]).toEqual([
      'NỘI DUNG',
      'CHỈ TIÊU',
      'THỰC ĐẠT',
      '% HOÀN THÀNH',
    ]);
    expect(contentHeader?.x).toBeLessThan(targetHeader?.x ?? 0);
    expect(targetHeader?.x).toBeLessThan(actualHeader?.x ?? 0);
    expect(actualHeader?.x).toBeLessThan(percentHeader?.x ?? 0);
    expect(targetValue?.x).toBe(targetHeader?.x);
    expect(actualValue?.x).toBe(actualHeader?.x);
  });

  it('giữ dấu gạch khi AMIS không giao chỉ tiêu doanh số', () => {
    const { context, texts } = recordingContext();

    drawReportCard(context, {
      accountName: 'Abraham Kế Toán Bánhàng',
      conversations: 1,
      sentMessages: 2,
      receivedMessages: 3,
      incomingCalls: 4,
      outgoingCalls: 5,
      missedCalls: 6,
      callDuration: '7 phút',
      amis: {
        netSales: 320_000_000,
        sales: 350_000_000,
        returnSales: 30_000_000,
        noOfOrders: 8,
        targetAmount: null,
        currentAmount: 458_661_000,
        syncedAt: '2026-09-03T02:15:00Z',
      },
    });

    expect(texts.some((call) => call.text === '458.661.000')).toBe(true);
    expect(texts.some((call) => call.text === '0')).toBe(false);
  });
});
