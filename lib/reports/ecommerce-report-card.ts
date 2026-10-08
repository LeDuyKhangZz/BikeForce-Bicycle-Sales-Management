import type { EcommerceReportViewModel } from '@/lib/reports/ecommerce-report';

export interface EcommerceCanvas2DLike {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
}

const WIDTH = 540;
const HEIGHT = 960;
const PAD = 30;

function roundedRect(
  ctx: EcommerceCanvas2DLike,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function box(
  ctx: EcommerceCanvas2DLike,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  ctx.fillStyle = 'rgba(255, 252, 251, 0.94)';
  roundedRect(ctx, x, y, width, height, 16);
  ctx.fill();
  ctx.strokeStyle = '#f3bdc9';
  ctx.lineWidth = 1;
  roundedRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 16);
  ctx.stroke();
}

export function drawEcommerceReportCard(
  ctx: EcommerceCanvas2DLike,
  report: EcommerceReportViewModel,
  backgroundImage?: CanvasImageSource,
): void {
  if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0, WIDTH, HEIGHT);
  else {
    ctx.fillStyle = '#fff6f7';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#171d2a';
  ctx.font = '700 29px ReportFont-Bold';
  ctx.fillText('BIKEFORCE', PAD, 50);
  ctx.fillStyle = '#e61d5d';
  ctx.font = '700 17px ReportFont-Bold';
  ctx.fillText('Báo cáo Sàn TMĐT', PAD, 75);
  ctx.fillStyle = '#171d2a';
  ctx.font = '700 28px ReportFont-Bold';
  ctx.fillText(report.employeeName, PAD, 122);
  ctx.fillStyle = '#636976';
  ctx.font = '400 13px ReportFont';
  ctx.fillText(`Dữ liệu ngày ${report.reportDate} · đồng bộ ${report.syncedAt}`, PAD, 150);

  box(ctx, 20, 185, 500, 425);
  ctx.fillStyle = '#e92f67';
  roundedRect(ctx, 48, 167, 285, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 17px ReportFont-Bold';
  ctx.fillText('Tổng quan báo cáo', 74, 193);

  report.metrics.forEach((metric, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 42 + column * 242;
    const y = 225 + row * 88;
    ctx.fillStyle = 'rgba(255, 238, 243, 0.72)';
    roundedRect(ctx, x, y, 214, 70, 10);
    ctx.fill();
    ctx.fillStyle = '#636976';
    ctx.font = '400 12px ReportFont';
    ctx.fillText(metric.label, x + 14, y + 23);
    ctx.fillStyle = '#dc1554';
    ctx.font = '700 18px ReportFont-Bold';
    ctx.fillText(metric.display, x + 14, y + 52);
  });

  box(ctx, 20, 650, 500, 190);
  ctx.fillStyle = '#e92f67';
  roundedRect(ctx, 48, 632, 250, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 17px ReportFont-Bold';
  ctx.fillText('Theo nguồn đơn', 74, 658);

  report.sources.forEach((source, index) => {
    const y = 710 + index * 55;
    ctx.fillStyle = '#30343f';
    ctx.font = '700 15px ReportFont-Bold';
    ctx.fillText(source.name, 48, y);
    ctx.fillStyle = '#636976';
    ctx.font = '400 12px ReportFont';
    ctx.fillText(`${source.orderCount} đơn không hủy`, 48, y + 22);
    ctx.fillStyle = '#dc1554';
    ctx.font = '700 15px ReportFont-Bold';
    ctx.textAlign = 'right';
    ctx.fillText(source.revenueDisplay, 492, y + 10);
    ctx.textAlign = 'left';
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#636976';
  ctx.font = '600 11px ReportFont-Bold';
  ctx.fillText('BIKEFORCE · BÁO CÁO SÀN THƯƠNG MẠI ĐIỆN TỬ', WIDTH / 2, 920);
  ctx.textAlign = 'left';
}
