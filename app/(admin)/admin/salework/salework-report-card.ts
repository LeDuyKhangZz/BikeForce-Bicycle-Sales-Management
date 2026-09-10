import type { SaleWorkReport } from '@/services/salework';

export const CARD_WIDTH = 540;
export const CARD_HEIGHT = 960;
export const PAD = 30;
export const REPORT_BACKGROUND_PATH = '/images/salework-mid-autumn-background.png';

export const COLORS = {
  background: '#0b315b',
  cream: 'rgba(255, 249, 235, 0.97)',
  creamStrong: '#fff7e3',
  border: '#efbd68',
  brand: '#ffffff',
  accent: '#ffc75a',
  accentStrong: '#d74324',
  rule: '#9ee6b4',
  textDark: '#3b1b16',
  textMuted: '#657080',
  tableHeaderBg: '#f9ead9',
  tableBorder: '#ead7c6',
  orangeBoxBg: '#f15a35',
  orangeBoxText: '#ffffff',
  bottomBoxBg: '#fff9ec',
  bottomBoxText: '#3b1b16',
  placeholder: '#8a8178',
} as const;

export const PLACEHOLDER = '—';

// Dữ liệu SaleWork chưa có trường "mã telesale" nên khai báo thủ công tại đây.
// Thêm dòng mới khi có tài khoản mới cần gán mã.
export const TELESALE_CODES: Record<string, string> = {
  'Abraham Kế Toán Bánhàng': 'VP-KTBH-001',
  'Giao - Kế Toán bán hàng': 'VP-TLS-003',
  'Kế Toán Bánhàng Xe Đạp Abraham': 'VP-TLS-003',
};

export function getTelesaleCode(accountName: string): string {
  return TELESALE_CODES[accountName] ?? PLACEHOLDER;
}

export function getVietnameseDateLabel(date: Date): string {
  const formatted = date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function slugifyFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/** Định dạng số tiền kiểu Việt Nam: 1.234.567 (chấm ngăn nghìn, không thập phân). */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
}

/** Định dạng phần trăm hoàn thành mục tiêu: current/target * 100. */
export function formatPercent(current: number, target: number): string {
  if (!target) return PLACEHOLDER;
  return `${((current / target) * 100).toFixed(1)}%`;
}

/**
 * Interface tối giản cho 2D context — tương thích với cả:
 * - CanvasRenderingContext2D (trình duyệt)
 * - SKRSContext2D của @napi-rs/canvas (server, dùng trong route xuất ảnh cho n8n)
 */
export interface Canvas2DLike {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  scale(x: number, y: number): void;
}

function roundRect(ctx: Canvas2DLike, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillRoundedBox(
  ctx: Canvas2DLike,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string,
): void {
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, radius);
    ctx.stroke();
  }
}

/** Vẽ toàn bộ thẻ báo cáo "Báo cáo cuối ngày" cho 1 tài khoản lên context đã cho. */
export function drawReportCard(
  ctx: Canvas2DLike,
  report: SaleWorkReport,
  backgroundImage?: CanvasImageSource,
): void {
  const w = CARD_WIDTH;
  const h = CARD_HEIGHT;
  const amis = report.amis;

  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, w, h);
  } else {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.brand;
  ctx.font = '700 29px ReportFont-Bold';
  ctx.fillText('BIKEFORCE', PAD, 50);
  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 17px ReportFont-Bold';
  ctx.fillText('Báo cáo cuối ngày', PAD, 75);

  const maxNameWidth = 335;
  let nameFontSize = 30;
  ctx.font = `700 ${nameFontSize}px ReportFont-Bold`;
  while (ctx.measureText(report.accountName).width > maxNameWidth && nameFontSize > 18) {
    nameFontSize -= 1;
    ctx.font = `700 ${nameFontSize}px ReportFont-Bold`;
  }
  ctx.fillText(report.accountName, PAD, 126);

  ctx.fillStyle = COLORS.brand;
  ctx.font = '400 14px ReportFont';
  ctx.fillText(`Mã telesale: ${getTelesaleCode(report.accountName)}`, PAD, 155);

  ctx.strokeStyle = COLORS.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, 174);
  ctx.lineTo(360, 174);
  ctx.stroke();

  fillRoundedBox(ctx, 414, 32, 96, 116, 12, 'rgba(255, 247, 227, 0.93)', COLORS.border);
  const dateParts = getVietnameseDateLabel(new Date()).split(', ');
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.textDark;
  ctx.font = '600 12px ReportFont-Bold';
  ctx.fillText(dateParts[0] ?? '', 462, 60);
  ctx.fillStyle = COLORS.accentStrong;
  ctx.font = '700 20px ReportFont-Bold';
  ctx.fillText((dateParts[1] ?? '').replace(/\/\d{4}$/, ''), 462, 92);
  ctx.fillStyle = COLORS.textDark;
  ctx.font = '700 15px ReportFont-Bold';
  ctx.fillText((dateParts[1] ?? '').slice(-4), 462, 120);
  ctx.textAlign = 'left';

  // --- Tình trạng thực hiện trong tháng ---
  const tableX = 20;
  const tableW = 500;
  const tableTop = 235;
  const rowH = 44;
  const headerH = 38;
  const tableH = headerH + rowH * 2;

  fillRoundedBox(ctx, 20, 205, 500, 190, 16, COLORS.cream, COLORS.border);
  fillRoundedBox(ctx, 34, 190, 330, 36, 18, COLORS.orangeBoxBg);
  ctx.fillStyle = COLORS.orangeBoxText;
  ctx.font = '700 16px ReportFont-Bold';
  ctx.fillText('Tình trạng thực hiện trong tháng', 54, 214);
  fillRoundedBox(ctx, tableX + 14, tableTop, tableW - 28, tableH, 10, COLORS.creamStrong, COLORS.tableBorder);

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '400 10px ReportFont';
  const syncedLabel = amis
    ? new Date(amis.syncedAt).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : PLACEHOLDER;
  ctx.fillText(`Số liệu MISA tính đến ${syncedLabel}`, tableX + 28, tableTop - 8);

  const contentX = tableX + 28;
  const targetRightX = tableX + tableW * 0.56;
  const actualRightX = tableX + tableW * 0.78;
  const percentRightX = tableX + tableW - 24;

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '600 10px ReportFont-Bold';
  ctx.textAlign = 'left';
  ctx.fillText('NỘI DUNG', contentX, tableTop + 24);
  ctx.textAlign = 'right';
  ctx.fillText('CHỈ TIÊU', targetRightX, tableTop + 24);
  ctx.fillText('THỰC ĐẠT', actualRightX, tableTop + 24);
  ctx.fillText('% HOÀN THÀNH', percentRightX, tableTop + 24);

  const monthRows: Array<{ label: string; target: string; value: string; percent: string }> = [
    {
      label: 'Doanh số đã ghi',
      target:
        amis?.targetAmount !== null && amis?.targetAmount !== undefined && amis.targetAmount > 0
          ? formatCurrency(amis.targetAmount)
          : PLACEHOLDER,
      value: amis ? formatCurrency(amis.currentAmount) : PLACEHOLDER,
      percent:
        amis?.targetAmount !== null && amis?.targetAmount !== undefined && amis.targetAmount > 0
          ? formatPercent(amis.currentAmount, amis.targetAmount)
          : PLACEHOLDER,
    },
    {
      label: 'Doanh thu đã ghi',
      // SaleWork chưa có trường chỉ tiêu doanh thu tháng tương ứng với `netSales`.
      // Không lấy một số thực đạt khác làm chỉ tiêu chỉ để lấp đầy ô.
      target: PLACEHOLDER,
      value: amis ? formatCurrency(amis.netSales) : PLACEHOLDER,
      percent: PLACEHOLDER,
    },
  ];

  monthRows.forEach((row, index) => {
    const rowY = tableTop + headerH + rowH * index;
    const textY = rowY + rowH / 2 + 5;

    if (index > 0) {
      ctx.strokeStyle = COLORS.tableBorder;
      ctx.beginPath();
      ctx.moveTo(tableX + 8, rowY);
      ctx.lineTo(tableX + tableW - 8, rowY);
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.textDark;
    ctx.font = '600 13px ReportFont-Bold';
    ctx.textAlign = 'left';
    ctx.fillText(row.label, contentX, textY);

    ctx.fillStyle = amis ? COLORS.accentStrong : COLORS.placeholder;
    ctx.font = '700 11px ReportFont-Bold';
    ctx.textAlign = 'right';
    ctx.fillText(row.target, targetRightX, textY);
    ctx.fillText(row.value, actualRightX, textY);
    ctx.fillText(row.percent, percentRightX, textY);
  });
  ctx.textAlign = 'left';

  // --- Tình trạng thực hiện trong ngày ---
  const boxX = 20;
  const boxW = 500;
  const boxTop = 435;
  const lineItems: Array<{ label: string; value: string }> = [
    { label: 'Số lượng hội thoại tương tác', value: String(report.conversations) },
    { label: 'Số lượng tin nhắn đã gửi', value: String(report.sentMessages) },
    { label: 'Số lượng tin nhắn đã nhận', value: String(report.receivedMessages) },
    { label: 'Số lượng cuộc gọi đã gọi', value: String(report.outgoingCalls) },
    { label: 'Số lượng cuộc gọi đến đã nghe', value: String(report.incomingCalls) },
    { label: 'Tổng thời gian đã nghe máy', value: report.callDuration },
  ];
  const lineH = 34;
  const bottomBoxH = 82;

  fillRoundedBox(ctx, boxX, boxTop, boxW, 344, 16, COLORS.cream, COLORS.border);
  fillRoundedBox(ctx, 58, boxTop - 18, 350, 40, 20, COLORS.orangeBoxBg);
  ctx.fillStyle = COLORS.orangeBoxText;
  ctx.font = '700 17px ReportFont-Bold';
  ctx.fillText('Tình trạng thực hiện trong ngày', 84, boxTop + 8);

  let itemY = boxTop + 48;
  lineItems.forEach((item, index) => {
    if (index % 2 === 0) {
      ctx.fillStyle = 'rgba(249, 234, 217, 0.78)';
      ctx.fillRect(boxX + 18, itemY - 22, boxW - 36, lineH);
    }
    ctx.fillStyle = COLORS.accentStrong;
    ctx.fillRect(boxX + 29, itemY - 8, 7, 7);
    ctx.fillStyle = COLORS.textDark;
    ctx.font = '400 13px ReportFont';
    ctx.fillText(item.label, boxX + 52, itemY);

    ctx.fillStyle = COLORS.accentStrong;
    ctx.font = '700 14px ReportFont-Bold';
    ctx.textAlign = 'right';
    ctx.fillText(item.value, boxX + boxW - 30, itemY);
    ctx.textAlign = 'left';
    itemY += lineH;
  });

  const innerBoxY = itemY + 2;
  const innerBoxX = boxX + 24;
  const innerBoxW = boxW - 48;
  fillRoundedBox(ctx, innerBoxX, innerBoxY, innerBoxW, bottomBoxH, 12, COLORS.bottomBoxBg, COLORS.border);

  const orderRows: Array<{ label: string; value: string }> = [
    {
      label: 'SL ĐH đã ghi',
      value: amis ? formatCurrency(amis.noOfOrders) : PLACEHOLDER,
    },
    {
      label: 'Giá trị trung bình 1 đơn',
      value: amis && amis.noOfOrders > 0 ? formatCurrency(amis.netSales / amis.noOfOrders) : PLACEHOLDER,
    },
    {
      label: 'Giá trị hàng hóa trả hàng',
      value: amis ? formatCurrency(amis.returnSales) : PLACEHOLDER,
    },
  ];
  ctx.textAlign = 'center';
  orderRows.forEach((row, index) => {
    const rowY = innerBoxY + 20 + index * 20;
    ctx.fillStyle = COLORS.bottomBoxText;
    ctx.font = index === 0 ? '700 12px ReportFont-Bold' : '400 11px ReportFont';
    ctx.fillText(`${row.label}  ${row.value}`, innerBoxX + innerBoxW / 2, rowY);
  });
  ctx.textAlign = 'left';

  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 20px ReportFont-Bold';
  ctx.fillText('Kết nối hôm nay · Tăng trưởng ngày mai', PAD, 835);
  ctx.fillStyle = COLORS.brand;
  ctx.font = '600 12px ReportFont-Bold';
  ctx.fillText('BIKEFORCE · BÁO CÁO HOẠT ĐỘNG TELESALE', PAD, 866);
}
