import { Path2D, type Image, type SKRSContext2D } from '@napi-rs/canvas';

import type { HatdeBranchViewModel, HatdeSnapshotViewModel } from '@/lib/hatde/view-model';

export const HATDE_BOARD_IMAGE_WIDTH = 1080;
export const HATDE_BOARD_IMAGE_HEIGHT = 1450;
export const BASE_ROWS = 7;
export const ROWS_TOP = 395;
export const ROW_STEP = 120;
export const TOTALS_BASE_Y = 1245;

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

function drawComparison(ctx: SKRSContext2D, x: number, y: number, width: number, branch: HatdeBranchViewModel, key: 'vsYesterday' | 'vsLastWeek') {
  const comparison = branch[key];
  const isUp = comparison.direction === 'UP';
  const isDown = comparison.direction === 'DOWN';
  ctx.fillStyle = isUp ? COLORS.softGreen : isDown ? COLORS.softRed : COLORS.paleGreen;
  ctx.strokeStyle = isUp ? '#4ade80' : isDown ? '#fca5a5' : COLORS.border;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x, y, width, 62, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isUp ? COLORS.darkGreen : isDown ? COLORS.red : COLORS.deepInk;
  drawTrendArrow(ctx, x + 17, y + 17, comparison.direction);
  ctx.font = '700 23px HatdeFont';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(comparison.display, x + width / 2 + 14, y + 31);
}

function drawTableHeader(ctx: SKRSContext2D) {
  ctx.fillStyle = 'rgba(230,242,225,0.92)';
  roundedRect(ctx, 26, 325, 1028, 58, 18);
  ctx.fill();
  ctx.fillStyle = COLORS.darkGreen;
  ctx.font = '700 16px HatdeFont';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('#', 78, 354);
  ctx.fillText('CHI NHÁNH', 190, 354);
  ctx.fillText('DOANH THU', 455, 354);
  ctx.fillText('SỐ GIAO DỊCH', 610, 354);
  ctx.fillText('SO VỚI HÔM QUA', 770, 354);
  ctx.fillText('SO VỚI TUẦN TRƯỚC', 950, 354);
}

function drawBranch(ctx: SKRSContext2D, branch: HatdeBranchViewModel, index: number) {
  const x = 28;
  const y = ROWS_TOP + index * ROW_STEP;
  const width = 1024;
  const height = 108;

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
  ctx.arc(88, y + height / 2, 38, 0, Math.PI * 2);
  ctx.fill();
  if (branch.rank === 1) drawSvgIcon(ctx, SVG_PATHS.crown, 69, y - 3, 38, COLORS.gold, true);
  ctx.fillStyle = branch.rank === 2 || branch.rank >= 4 ? COLORS.darkGreen : COLORS.white;
  ctx.font = '700 38px HatdeFont';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(branch.rank), 88, y + height / 2 + 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.deepInk;
  const nameSize = fitText(ctx, branch.name, 365, 24, 18, 'HatdeFont');
  ctx.font = `700 ${nameSize}px HatdeFont`;
  ctx.fillText(branch.name.toUpperCase(), 145, y + 40);
  ctx.fillStyle = COLORS.darkGreen;
  ctx.font = '700 28px HatdeFont';
  ctx.fillText(branch.revenueDisplay, 145, y + 79);

  ctx.fillStyle = COLORS.deepInk;
  ctx.font = '700 25px HatdeFont';
  ctx.textAlign = 'center';
  ctx.fillText(branch.transactionsDisplay, 610, y + 53);
  ctx.font = '400 15px HatdeFont';
  ctx.fillStyle = '#64748b';
  ctx.fillText('giao dịch', 610, y + 78);

  drawComparison(ctx, 690, y + 23, 158, branch, 'vsYesterday');
  drawComparison(ctx, 872, y + 23, 158, branch, 'vsLastWeek');
}

function drawTotals(ctx: SKRSContext2D, report: HatdeSnapshotViewModel, y: number = TOTALS_BASE_Y) {
  const x = 26;
  const width = 1028;
  const height = 98;

  ctx.shadowColor = 'rgba(7,85,47,0.18)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeStyle = '#84cc16';
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, width, height, 22);
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = 'transparent';

  drawSvgIcon(ctx, SVG_PATHS.wallet, x + 78, y + 31, 38, COLORS.darkGreen);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.deepInk;
  ctx.font = '700 15px HatdeFont';
  ctx.fillText('TỔNG DOANH THU CHUỖI', x + 145, y + 31);
  ctx.fillStyle = COLORS.darkGreen;
  ctx.font = '700 27px HatdeFont';
  ctx.fillText(report.totalRevenueDisplay, x + 145, y + 68);

  ctx.strokeStyle = COLORS.border;
  ctx.beginPath();
  ctx.moveTo(x + 515, y + 20);
  ctx.lineTo(x + 515, y + 78);
  ctx.stroke();
  drawSvgIcon(ctx, SVG_PATHS.receipt, x + 625, y + 31, 38, COLORS.darkGreen);
  ctx.fillStyle = COLORS.deepInk;
  ctx.font = '700 15px HatdeFont';
  ctx.fillText('TỔNG GIAO DỊCH', x + 690, y + 31);
  ctx.fillStyle = COLORS.darkGreen;
  ctx.font = '700 27px HatdeFont';
  ctx.fillText(`${report.totalTransactionsDisplay} giao dịch`, x + 690, y + 68);
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
      1235 * scaleY,
      0,
      0,
      HATDE_BOARD_IMAGE_WIDTH,
      1235,
    );
    ctx.drawImage(
      background,
      0,
      1195 * scaleY,
      background.width,
      40 * scaleY,
      0,
      1235,
      HATDE_BOARD_IMAGE_WIDTH,
      extra,
    );
    ctx.drawImage(
      background,
      0,
      1235 * scaleY,
      background.width,
      background.height - 1235 * scaleY,
      0,
      1235 + extra,
      HATDE_BOARD_IMAGE_WIDTH,
      HATDE_BOARD_IMAGE_HEIGHT - 1235,
    );
  } else {
    ctx.drawImage(background, 0, 0, HATDE_BOARD_IMAGE_WIDTH, HATDE_BOARD_IMAGE_HEIGHT);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  roundedRect(ctx, 728, 24, 326, 70, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.darkGreen;
  ctx.font = '700 17px HatdeFont';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Cập nhật', 805, 49);
  ctx.font = '700 18px HatdeFont';
  ctx.fillText(`${report.reportTime} · ${report.reportDateDisplay}`, 805, 75);

  drawTableHeader(ctx);
  report.branches.forEach((branch, index) => drawBranch(ctx, branch, index));
  drawTotals(ctx, report, TOTALS_BASE_Y + extra);
}
