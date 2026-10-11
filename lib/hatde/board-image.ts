import type { Image, SKRSContext2D } from '@napi-rs/canvas';

import type { HatdeBranchViewModel, HatdeSnapshotViewModel } from '@/lib/hatde/view-model';

export const HATDE_BOARD_IMAGE_WIDTH = 1080;
export const HATDE_BOARD_IMAGE_HEIGHT = 1320;

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

function drawTrendArrow(ctx: SKRSContext2D, x: number, y: number, direction: 'UP' | 'DOWN' | 'UNCHANGED') {
  ctx.save();
  ctx.strokeStyle = direction === 'UP' ? COLORS.darkGreen : direction === 'DOWN' ? COLORS.red : COLORS.deepInk;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (direction === 'UNCHANGED') {
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + 8, y);
  } else {
    const tipY = direction === 'UP' ? y - 10 : y + 10;
    const tailY = direction === 'UP' ? y + 10 : y - 10;
    ctx.moveTo(x, tailY);
    ctx.lineTo(x, tipY);
    ctx.moveTo(x - 7, direction === 'UP' ? y - 3 : y + 3);
    ctx.lineTo(x, tipY);
    ctx.lineTo(x + 7, direction === 'UP' ? y - 3 : y + 3);
  }
  ctx.stroke();
  ctx.restore();
}

function drawMoneyIcon(ctx: SKRSContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#15803d';
  for (let index = 0; index < 3; index += 1) {
    const offset = index * 4;
    roundedRect(ctx, x + offset, y - offset, 29, 17, 3);
    ctx.fill();
  }
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + 22, y + 4, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCartIcon(ctx: SKRSContext2D, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = COLORS.deepInk;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 7, y);
  ctx.lineTo(x + 12, y + 24);
  ctx.lineTo(x + 35, y + 24);
  ctx.lineTo(x + 40, y + 7);
  ctx.lineTo(x + 9, y + 7);
  ctx.stroke();
  ctx.fillStyle = COLORS.deepInk;
  ctx.beginPath();
  ctx.arc(x + 16, y + 33, 4, 0, Math.PI * 2);
  ctx.arc(x + 34, y + 33, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
  drawTrendArrow(ctx, x + 42, y + 49, comparison.direction);
  ctx.font = '700 24px HatdeFont';
  ctx.fillText(comparison.display, x + width / 2 + 10, y + 54);
}

function drawBranch(ctx: SKRSContext2D, branch: HatdeBranchViewModel, index: number) {
  const x = 28;
  const y = 320 + index * 130;
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
  drawMoneyIcon(ctx, 155, y + 70);
  ctx.fillText(branch.revenueDisplay, 198, y + 85);

  ctx.fillStyle = COLORS.deepInk;
  ctx.font = '700 25px HatdeFont';
  drawCartIcon(ctx, 472, y + 43);
  ctx.fillText(branch.transactionsDisplay, 520, y + 69);
  ctx.font = '400 15px HatdeFont';
  ctx.fillText('giao dịch', 550, y + 69);

  drawComparison(ctx, 650, y + 24, 178, branch, 'vsYesterday', 'Hôm qua');
  drawComparison(ctx, 846, y + 24, 178, branch, 'vsLastWeek', 'Tuần trước');
}

export function drawHatdeBoardImage(ctx: SKRSContext2D, report: HatdeSnapshotViewModel, background: Image) {
  ctx.drawImage(background, 0, 0, HATDE_BOARD_IMAGE_WIDTH, HATDE_BOARD_IMAGE_HEIGHT);

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

  report.branches.slice(0, 6).forEach((branch, index) => drawBranch(ctx, branch, index));
}
