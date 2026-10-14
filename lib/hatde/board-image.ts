import { Path2D, type Image, type SKRSContext2D } from '@napi-rs/canvas';

import type { HatdeBranchViewModel, HatdeSnapshotViewModel } from '@/lib/hatde/view-model';

export const HATDE_BOARD_IMAGE_WIDTH = 1080;
export const HATDE_BOARD_IMAGE_HEIGHT = 1320;
export const BASE_ROWS = 6;
export const ROWS_TOP = 320;
export const ROW_STEP = 130;
export const TOTALS_BASE_Y = 1100;

export function getHatdeBoardImageHeight(rowCount: number): number {
  return HATDE_BOARD_IMAGE_HEIGHT + Math.max(0, rowCount - BASE_ROWS) * ROW_STEP;
}

type Palette = {
  background: string;
  border: string;
  darkGreen: string;
  deepInk: string;
  gold: string;
  paleGreen: string;
  red: string;
  softRed: string;
  softGreen: string;
  white: string;
};

const COLORS: Palette = {
  background: 'rgba(255,255,255,0.93)',
  border: '#b9d9b1',
  darkGreen: '#07552f',
  deepInk: '#083f48',
  gold: '#d99b00',
  paleGreen: '#d8f4ca',
  red: '#b91c1c',
  softRed: '#fee2e2',
  softGreen: '#dcfce7',
  white: '#ffffff',
};

const SVG_PATHS = {
  arrowDown: 'M5 12L12 19L19 12M12 5V19',
  arrowUp: 'M5 12L12 5L19 12M12 19V5',
  crown: 'M2 6L6 9L10 3L14 9L18 3L22 6L19 17H5ZM5 21H19',
  medal: 'M8 2H16L18 8L12 12L6 8ZM12 12A5 5 0 1 0 12 22A5 5 0 1 0 12 12',
  minus: 'M5 12H19',
  receipt: 'M4 2V22L6 20L8 22L10 20L12 22L14 20L16 22L18 20L20 22V2L18 4L16 2L14 4L12 2L10 4L8 2L6 4ZM8 8H16M8 12H16M8 16H13',
  wallet: 'M5 4H19A2 2 0 0 1 21 6V18A2 2 0 0 1 19 20H5A2 2 0 0 1 3 18V6A2 2 0 0 1 5 4ZM3 9H21M16 15H18',
} as const;

function roundedRect(ctx: SKRSContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.closePath();
}

function fitText(ctx: SKRSContext2D, text: string, maxWidth: number, initialSize: number, minimumSize: number, font: string) {
  let size = initialSize;
  while (size > minimumSize) {
    ctx.font = `700 ${size}px ${font}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

function drawSvgIcon(ctx: SKRSContext2D, pathData: string, x: number, y: number, size: number, color: string, fill = false) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 24;
  ctx.scale(scale, scale);
  const path = new Path2D(pathData);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.25;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (fill) ctx.fill(path);
  ctx.stroke(path);
  ctx.restore();
}

function drawTrendArrow(ctx: SKRSContext2D, x: number, y: number, direction: 'UP' | 'DOWN' | 'UNCHANGED') {
  const path = direction === 'UP' ? SVG_PATHS.arrowUp : direction === 'DOWN' ? SVG_PATHS.arrowDown : SVG_PATHS.minus;
  const color = direction === 'UP' ? COLORS.darkGreen : direction === 'DOWN' ? COLORS.red : COLORS.deepInk;
  drawSvgIcon(ctx, path, x, y, 28, color);
}

function drawComparison(ctx: SKRSContext2D, x: number, y: number, width: number, branch: HatdeBranchViewModel, key: 'vsYesterday' | 'vsLastWeek', label: string) {
  const comparison = branch[key];
  const isUp = comparison.direction === 'UP';
  const isDown = comparison.direction === 'DOWN';
  ctx.fillStyle = isUp ? COLORS.softGreen : isDown ? COLORS.softRed : COLORS.paleGreen;
  ctx.strokeStyle = isUp ? '#4ade80' : isDown ? '#fca5a5' : COLORS.border;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x, y, width, 70, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isUp ? COLORS.darkGreen : isDown ? COLORS.red : COLORS.deepInk;
  ctx.font = '700 16px HatdeFont';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + width / 2, y + 25);
  drawTrendArrow(ctx, x + 28, y + 35, comparison.direction);
  ctx.font = '700 24px HatdeFont';
  ctx.fillText(comparison.display, x + width / 2 + 10, y + 54);
}

function drawBranch(ctx: SKRSContext2D, branch: HatdeBranchViewModel, index: number) {
  const x = 28;
  const y = ROWS_TOP + index * ROW_STEP;
  const width = 1024;
  const height = 118;

  ctx.shadowColor = 'rgba(7,85,47,0.15)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = COLORS.background;
  ctx.strokeStyle = branch.rank === 1 ? COLORS.gold : COLORS.border;
  ctx.lineWidth = branch.rank === 1 ? 3 : 1.5;
  roundedRect(ctx, x, y, width, height, 22);
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = branch.rank <= 3 ? (branch.rank === 2 ? '#bcc5ce' : branch.rank === 3 ? '#a95c1b' : COLORS.gold) : COLORS.paleGreen;
  ctx.beginPath();
  ctx.arc(92, y + height / 2, 42, 0, Math.PI * 2);
  ctx.fill();
  if (branch.rank === 1) drawSvgIcon(ctx, SVG_PATHS.crown, 72, y + 2, 40, COLORS.gold, true);
  if (branch.rank === 2 || branch.rank === 3) {
    drawSvgIcon(ctx, SVG_PATHS.medal, 77, y + 4, 30, branch.rank === 2 ? '#7c8794' : '#8b4513');
  }
  ctx.fillStyle = branch.rank === 2 || branch.rank >= 4 ? COLORS.darkGreen : COLORS.white;
  ctx.font = '700 42px HatdeFont';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(branch.rank), 92, y + height / 2 + 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.deepInk;
  const nameSize = fitText(ctx, branch.name, 390, 26, 19, 'HatdeFont');
  ctx.font = `700 ${nameSize}px HatdeFont`;
  ctx.fillText(branch.name.toUpperCase(), 155, y + 40);
  ctx.fillStyle = COLORS.darkGreen;
  ctx.font = '700 29px HatdeFont';
  drawSvgIcon(ctx, SVG_PATHS.wallet, 155, y + 60, 31, '#15803d');
  ctx.fillText(branch.revenueDisplay, 198, y + 85);

  ctx.fillStyle = COLORS.deepInk;
  ctx.font = '700 25px HatdeFont';
  drawSvgIcon(ctx, SVG_PATHS.receipt, 474, y + 43, 32, COLORS.deepInk);
  ctx.fillText(branch.transactionsDisplay, 520, y + 69);
  ctx.font = '400 15px HatdeFont';
  ctx.fillText('giao dịch', 550, y + 69);

  drawComparison(ctx, 650, y + 24, 178, branch, 'vsYesterday', 'Hôm qua');
  drawComparison(ctx, 846, y + 24, 178, branch, 'vsLastWeek', 'Tuần trước');
}

function drawTotals(ctx: SKRSContext2D, report: HatdeSnapshotViewModel, y: number = TOTALS_BASE_Y) {
  const x = 120;
  const width = 840;
  const height = 82;

  ctx.shadowColor = 'rgba(7,85,47,0.18)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 3;
  roundedRect(ctx, x, y, width, height, 24);
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = 'transparent';

  drawSvgIcon(ctx, SVG_PATHS.wallet, x + 30, y + 25, 34, COLORS.darkGreen);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.deepInk;
  ctx.font = '700 15px HatdeFont';
  ctx.fillText('TỔNG DOANH THU', x + 78, y + 28);
  ctx.fillStyle = COLORS.darkGreen;
  ctx.font = '700 27px HatdeFont';
  ctx.fillText(report.totalRevenueDisplay, x + 78, y + 60);

  drawSvgIcon(ctx, SVG_PATHS.receipt, x + 540, y + 25, 34, COLORS.darkGreen);
  ctx.fillStyle = COLORS.deepInk;
  ctx.font = '700 15px HatdeFont';
  ctx.fillText('TỔNG GIAO DỊCH', x + 588, y + 28);
  ctx.fillStyle = COLORS.darkGreen;
  ctx.font = '700 27px HatdeFont';
  ctx.fillText(`${report.totalTransactionsDisplay} giao dịch`, x + 588, y + 60);
}

export function drawHatdeBoardImage(ctx: SKRSContext2D, report: HatdeSnapshotViewModel, background: Image) {
  const extra = Math.max(0, report.branches.length - BASE_ROWS) * ROW_STEP;
  if (extra > 0) {
    const scaleY = background.height / HATDE_BOARD_IMAGE_HEIGHT;
    ctx.drawImage(
      background,
      0,
      0,
      background.width,
      1090 * scaleY,
      0,
      0,
      HATDE_BOARD_IMAGE_WIDTH,
      1090,
    );
    ctx.drawImage(
      background,
      0,
      1050 * scaleY,
      background.width,
      40 * scaleY,
      0,
      1090,
      HATDE_BOARD_IMAGE_WIDTH,
      extra,
    );
    ctx.drawImage(
      background,
      0,
      1090 * scaleY,
      background.width,
      background.height - 1090 * scaleY,
      0,
      1090 + extra,
      HATDE_BOARD_IMAGE_WIDTH,
      HATDE_BOARD_IMAGE_HEIGHT - 1090,
    );
  } else {
    ctx.drawImage(background, 0, 0, HATDE_BOARD_IMAGE_WIDTH, HATDE_BOARD_IMAGE_HEIGHT);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  roundedRect(ctx, 420, 286, 240, 30, 15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.darkGreen;
  ctx.font = '700 15px HatdeFont';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Cập nhật ${report.reportTime} · ${report.reportDateDisplay}`, 540, 301);

  report.branches.forEach((branch, index) => drawBranch(ctx, branch, index));
  drawTotals(ctx, report, TOTALS_BASE_Y + extra);
}
