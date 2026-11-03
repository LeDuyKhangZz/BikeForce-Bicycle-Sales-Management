import {
  faBoxOpen,
  faBullhorn,
  faCartShopping,
  faChartColumn,
  faCircleXmark,
  faClock,
  faCoins,
  faHandHoldingDollar,
  faWallet,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { Path2D } from '@napi-rs/canvas';

import { formatCurrencyVND } from '@/lib/currency';
import { CANCELLED_ORDERS_SHOP_LOSS_VND, CANCELLED_ORDERS_VALUE_VND, type EcommerceReportViewModel } from '@/lib/reports/ecommerce-report';
import type { AdFinanceViewModel } from '@/lib/reports/ad-finance';

export interface EcommerceCanvas2DLike {
  fillStyle: string | CanvasGradient | CanvasPattern; strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number; font: string; textAlign: string; textBaseline: string;
  beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  closePath(): void; fill(path?: Path2D): void; stroke(): void; fillRect(x: number, y: number, width: number, height: number): void;
  save(): void; restore(): void; translate(x: number, y: number): void; scale(x: number, y: number): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
}

const WIDTH = 540, HEIGHT = 960;
const GREEN = '#063c35', GOLD = '#b47a0b', RED = '#ca1f2d', MUTED = '#64706f';

function roundedRect(ctx: EcommerceCanvas2DLike, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius); ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius); ctx.closePath();
}

function panel(ctx: EcommerceCanvas2DLike, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = '#ffffff'; roundedRect(ctx, x, y, width, height, 13); ctx.fill();
  ctx.strokeStyle = '#d5a13b'; ctx.lineWidth = 1; roundedRect(ctx, x + .5, y + .5, width - 1, height - 1, 13); ctx.stroke();
}

function sectionTitle(ctx: EcommerceCanvas2DLike, text: string, y: number) {
  ctx.fillStyle = '#d29a2d'; roundedRect(ctx, 31, y - 5, 31, 4, 2); ctx.fill();
  ctx.fillStyle = GREEN; ctx.font = '700 18px ReportFont-Bold'; ctx.fillText(text, 72, y + 4);
}

type MetricIcon = 'orders' | 'revenue' | 'cancelled' | 'returned' | 'late' | 'sales' | 'fees' | 'payout' | 'ads';

const METRIC_ICONS: Readonly<Record<MetricIcon, IconDefinition>> = {
  orders: faCartShopping,
  revenue: faCoins,
  cancelled: faCircleXmark,
  returned: faBoxOpen,
  late: faClock,
  sales: faChartColumn,
  fees: faWallet,
  payout: faHandHoldingDollar,
  ads: faBullhorn,
};

function drawMetricIcon(ctx: EcommerceCanvas2DLike, icon: MetricIcon, cx: number, cy: number, danger: boolean) {
  const definition = METRIC_ICONS[icon];
  const [width, height, , , pathData] = definition.icon;
  const size = 22;
  const ratio = Math.min(size / width, size / height);
  ctx.save();
  ctx.translate(cx - (width * ratio) / 2, cy - (height * ratio) / 2);
  ctx.scale(ratio, ratio);
  ctx.fillStyle = danger ? RED : GOLD;
  const paths = Array.isArray(pathData) ? pathData : [pathData];
  paths.forEach((path) => ctx.fill(new Path2D(path)));
  ctx.restore();
}

function metricCard(ctx: EcommerceCanvas2DLike, label: string, value: string, x: number, y: number, icon: MetricIcon, danger = false) {
  ctx.fillStyle = '#ffffff'; roundedRect(ctx, x, y, 232, 59, 10); ctx.fill();
  ctx.strokeStyle = '#e1ebe4'; ctx.lineWidth = 1;
  roundedRect(ctx, x + 0.5, y + 0.5, 231, 58, 10); ctx.stroke();
  ctx.fillStyle = danger ? 'rgba(252,233,229,0.92)' : 'rgba(220,238,219,0.92)';
  ctx.beginPath(); ctx.arc(x + 34, y + 29, 20, 0, Math.PI * 2); ctx.fill();
  drawMetricIcon(ctx, icon, x + 34, y + 29, danger); ctx.textAlign = 'left'; ctx.fillStyle = GREEN;
  ctx.font = '400 12px ReportFont'; ctx.fillText(label, x + 70, y + 21); ctx.fillStyle = danger ? RED : GREEN;
  ctx.font = value.length > 18 ? '700 12px ReportFont-Bold' : '700 20px ReportFont-Bold'; ctx.fillText(value, x + 70, y + 47);
}

function sourceLogo(ctx: EcommerceCanvas2DLike, sourceName: string, x: number, y: number) {
  const tikTok = sourceName.toLowerCase() === 'tiktok'; ctx.fillStyle = tikTok ? '#050505' : '#f4511e';
  roundedRect(ctx, x, y, 24, 24, 5); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 13px ReportFont-Bold';
  ctx.textAlign = 'center'; ctx.fillText(tikTok ? 'T' : 'S', x + 12, y + 17); ctx.textAlign = 'left';
}

export function drawEcommerceReportCard(ctx: EcommerceCanvas2DLike, report: EcommerceReportViewModel, backgroundImage?: CanvasImageSource, adFinance?: AdFinanceViewModel): void {
  if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0, WIDTH, HEIGHT);
  else { ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
  ctx.textBaseline = 'alphabetic'; ctx.fillStyle = GREEN; ctx.font = '700 27px ReportFont-Bold'; ctx.fillText('BIKEFORCE', 38, 50);
  ctx.fillStyle = '#8d5706'; ctx.font = '700 16px ReportFont-Bold'; ctx.fillText('Báo cáo Sàn TMĐT', 38, 76);
  ctx.fillStyle = '#c79228'; ctx.fillRect(198, 70, 45, 2); ctx.fillStyle = GREEN; ctx.font = '700 27px ReportFont-Bold';
  ctx.fillText(report.employeeName, 38, 116); ctx.fillStyle = MUTED; ctx.font = '400 13px ReportFont';
  ctx.fillText(`Dữ liệu ngày ${report.reportDate}`, 38, 141); ctx.fillStyle = '#d6a23b'; ctx.font = '700 17px ReportFont-Bold';
  ctx.textAlign = 'center'; ctx.fillText('20/11', 471, 55); ctx.font = '400 12px ReportFont'; ctx.fillText('Tri ân Thầy Cô', 471, 74); ctx.textAlign = 'left';

  panel(ctx, 17, 158, 506, 268); sectionTitle(ctx, 'Tổng quan báo cáo', 180);
  const overviewIcons: readonly MetricIcon[] = ['orders', 'revenue', 'cancelled', 'returned', 'late'];
  report.metrics.slice(0, 5).forEach((metric, index) => metricCard(ctx, metric.label, metric.display, 31 + (index % 2) * 247, 195 + Math.floor(index / 2) * 66, overviewIcons[index] ?? 'orders', index === 2));
  const cancelledMetric = report.metrics.find((metric) => metric.label === 'Đơn hủy');
  const defaultCancelledValue = cancelledMetric === undefined || cancelledMetric.display === '0' ? 0 : CANCELLED_ORDERS_VALUE_VND;
  const cancelledNote = report.cancelledNote ?? `Tổng giá trị đơn hàng bị hủy là ${formatCurrencyVND(defaultCancelledValue)} — số tiền shop bị mất/phải trả là ${formatCurrencyVND(CANCELLED_ORDERS_SHOP_LOSS_VND)}.`;
  ctx.fillStyle = 'rgba(238,246,237,0.9)'; roundedRect(ctx, 31, 393, 478, 22, 8); ctx.fill(); ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(48, 404, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 10px ReportFont-Bold';
  ctx.textAlign = 'center'; ctx.fillText('i', 48, 408); ctx.textAlign = 'left'; ctx.fillStyle = GREEN; ctx.font = '400 10px ReportFont'; ctx.fillText(cancelledNote, 65, 408);

  panel(ctx, 17, 438, 506, 187); sectionTitle(ctx, 'Tài chính theo sàn', 460);
  const financeIcons: readonly MetricIcon[] = ['ads', 'fees', 'ads', 'fees'];
  const financeMetrics = adFinance?.metrics ?? [
    { label: 'TikTok · Tiền nạp Ads', display: '—' }, { label: 'TikTok · Số dư Ads', display: '—' },
    { label: 'Shopee · Tiền nạp Ads', display: '—' }, { label: 'Shopee · Số dư Ads', display: '—' },
  ];
  financeMetrics.forEach((metric, index) => metricCard(ctx, metric.label, metric.display, 31 + (index % 2) * 247, 475 + Math.floor(index / 2) * 66, financeIcons[index] ?? 'ads'));

  panel(ctx, 17, 637, 506, 245); sectionTitle(ctx, 'Theo nguồn đơn', 659); let sourceY = 680;
  report.sourceGroups.forEach((group) => {
    ctx.fillStyle = 'rgba(226,240,225,0.88)'; roundedRect(ctx, 31, sourceY, 478, 24, 7); ctx.fill();
    ctx.fillStyle = '#d5222b'; roundedRect(ctx, 42, sourceY + 4, 25, 16, 2); ctx.fill(); ctx.fillStyle = '#ffef32';
    ctx.font = '700 8px ReportFont-Bold'; ctx.textAlign = 'center'; ctx.fillText(group.label.includes('Singapore') ? 'SG' : 'VN', 54.5, sourceY + 15);
    ctx.textAlign = 'left'; ctx.fillStyle = GREEN; ctx.font = '700 12px ReportFont-Bold'; ctx.fillText(group.label, 76, sourceY + 16); sourceY += 29;
    group.sources.forEach((source) => {
      sourceLogo(ctx, source.name, 42, sourceY); ctx.fillStyle = GREEN; ctx.font = '700 13px ReportFont-Bold'; ctx.fillText(source.name, 74, sourceY + 11);
      ctx.fillStyle = MUTED; ctx.font = '400 10px ReportFont'; ctx.fillText(`${source.orderCount} đơn không hủy`, 74, sourceY + 23);
      ctx.fillStyle = GREEN; ctx.font = '700 14px ReportFont-Bold'; ctx.textAlign = 'right'; ctx.fillText(source.revenueDisplay, 496, sourceY + 16); ctx.textAlign = 'left';
      ctx.strokeStyle = 'rgba(6,60,53,0.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(74, sourceY + 27); ctx.lineTo(496, sourceY + 27); ctx.stroke(); sourceY += 31;
    }); sourceY += 3;
  });

  ctx.textAlign = 'center'; ctx.fillStyle = GREEN; ctx.font = '700 22px ReportFont-Bold'; ctx.fillText('TRI ÂN THẦY CÔ', WIDTH / 2, 914);
  ctx.fillStyle = GOLD; ctx.fillRect(122, 924, 120, 1); ctx.fillRect(298, 924, 120, 1); ctx.font = '700 13px ReportFont-Bold'; ctx.fillText('•', WIDTH / 2, 929);
  ctx.fillStyle = '#8d5706'; ctx.font = '600 11px ReportFont-Bold'; ctx.fillText('CHÀO MỪNG NGÀY NHÀ GIÁO VIỆT NAM 20/11', WIDTH / 2, 946); ctx.textAlign = 'left';
}
