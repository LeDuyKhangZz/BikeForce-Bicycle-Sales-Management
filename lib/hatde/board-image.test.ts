import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { drawHatdeBoardImage, HATDE_BOARD_IMAGE_HEIGHT, HATDE_BOARD_IMAGE_WIDTH } from '@/lib/hatde/board-image';
import type { HatdeSnapshotViewModel } from '@/lib/hatde/view-model';

describe('drawHatdeBoardImage', () => {
  it('render PNG đúng 1080x1320 với đủ sáu chi nhánh', async () => {
    const report: HatdeSnapshotViewModel = {
      id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3',
      reportDate: '2026-10-11',
      reportDateDisplay: '11/10/2026',
      reportTime: '14:35',
      totalRevenueDisplay: '15.000.000 VND',
      totalTransactionsDisplay: '15',
      branches: Array.from({ length: 6 }, (_, index) => ({
        rank: index + 1,
        code: `branch-${index}`,
        name: index === 5 ? 'PASSIO PHỔ QUANG' : `CHI NHÁNH ${index + 1}`,
        revenueDisplay: index === 5 ? '0 VND' : `${5 - index}.000.000 VND`,
        transactionsDisplay: index === 5 ? '0' : String(5 - index),
        vsYesterday: { value: -10, display: '-10%', direction: 'DOWN' },
        vsLastWeek: { value: 20, display: '+20%', direction: 'UP' },
      })),
    };
    const background = await loadImage(path.join(process.cwd(), 'public/images/nenhatde.png'));
    const canvas = createCanvas(HATDE_BOARD_IMAGE_WIDTH, HATDE_BOARD_IMAGE_HEIGHT);
    drawHatdeBoardImage(canvas.getContext('2d'), report, background);
    const png = canvas.toBuffer('image/png');

    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1320);
  });
});
