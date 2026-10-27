import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  BASE_ROWS,
  drawHatdeBoardImage,
  getHatdeBoardImageHeight,
  HATDE_BOARD_IMAGE_HEIGHT,
  HATDE_BOARD_IMAGE_WIDTH,
  ROW_STEP,
  ROWS_TOP,
  TOTALS_BASE_Y,
} from '@/lib/hatde/board-image';
import type { HatdeSnapshotViewModel } from '@/lib/hatde/view-model';

describe('drawHatdeBoardImage', () => {
  it('render PNG đúng 1080x1450 với đủ sáu chi nhánh', async () => {
    GlobalFonts.registerFromPath(path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf'), 'HatdeFont');
    GlobalFonts.registerFromPath(path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf'), 'HatdeFont');
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
    expect(png.readUInt32BE(20)).toBe(1450);
  });

  it('tính chiều cao canvas động với getHatdeBoardImageHeight', () => {
    expect(getHatdeBoardImageHeight(0)).toBe(1450);
    expect(getHatdeBoardImageHeight(6)).toBe(1450);
    expect(getHatdeBoardImageHeight(7)).toBe(1450);
    expect(getHatdeBoardImageHeight(8)).toBe(1570);
  });

  it('render PNG 1080x1450 với đủ 7 chi nhánh và khung tổng nằm dưới hàng 7', async () => {
    GlobalFonts.registerFromPath(path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf'), 'HatdeFont');
    GlobalFonts.registerFromPath(path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf'), 'HatdeFont');
    const report: HatdeSnapshotViewModel = {
      id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3',
      reportDate: '2026-10-11',
      reportDateDisplay: '11/10/2026',
      reportTime: '14:35',
      totalRevenueDisplay: '20.000.000 VND',
      totalTransactionsDisplay: '25',
      branches: Array.from({ length: 7 }, (_, index) => ({
        rank: index + 1,
        code: index === 6 ? 'bep_trung_tam' : `branch-${index}`,
        name: index === 6 ? 'BẾP TRUNG TÂM' : `CHI NHÁNH ${index + 1}`,
        revenueDisplay: `${7 - index}.000.000 VND`,
        transactionsDisplay: String(7 - index),
        vsYesterday: { value: 5, display: '+5%', direction: 'UP' },
        vsLastWeek: { value: 10, display: '+10%', direction: 'UP' },
      })),
    };
    const background = await loadImage(path.join(process.cwd(), 'public/images/nenhatde.png'));
    const height = getHatdeBoardImageHeight(report.branches.length);
    expect(height).toBe(1450);

    const canvas = createCanvas(HATDE_BOARD_IMAGE_WIDTH, height);
    const ctx = canvas.getContext('2d');
    const fillTextSpy = vi.spyOn(ctx, 'fillText');
    const roundRectSpy = vi.spyOn(ctx, 'roundRect');

    drawHatdeBoardImage(ctx, report, background);
    const png = canvas.toBuffer('image/png');

    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1450);

    // Kiểm tra hàng 7 (BẾP TRUNG TÂM) được vẽ lên canvas
    expect(fillTextSpy).toHaveBeenCalledWith('BẾP TRUNG TÂM', expect.any(Number), expect.any(Number));

    // Vị trí y của hàng thứ 7 (index 6): ROWS_TOP + 6 * ROW_STEP = 320 + 6 * 130 = 1100, chiều cao card = 118
    const branch7Y = ROWS_TOP + 6 * ROW_STEP;
    expect(branch7Y).toBe(1115);
    const branch7Bottom = branch7Y + 108;

    // Khung tổng doanh thu nằm dưới hàng thứ bảy.
    const extra = Math.max(0, report.branches.length - BASE_ROWS) * ROW_STEP;
    const totalsY = TOTALS_BASE_Y + extra;
    expect(totalsY).toBe(1245);
    expect(totalsY).toBeGreaterThan(branch7Bottom);

    // Kiểm tra roundRect được gọi để vẽ khung tổng tại đúng vị trí totalsY = 1230
    expect(roundRectSpy).toHaveBeenCalledWith(26, totalsY, 1028, 98, 22);
  });

  it('dùng SVG Path2D thay vì glyph Unicode cho icon', () => {
    const source = readFileSync(path.join(process.cwd(), 'lib/hatde/board-image.ts'), 'utf8');
    expect(source).toContain('new Path2D(pathData)');
    expect(source).toContain('report.totalRevenueDisplay');
    expect(source).toContain('report.totalTransactionsDisplay');
    expect(source).not.toContain("'↑'");
    expect(source).not.toContain("'↓'");
  });
});
