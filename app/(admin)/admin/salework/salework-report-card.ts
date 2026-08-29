import type { SaleWorkReport } from '@/services/salework';

export const CARD_WIDTH = 480;
export const CARD_HEIGHT = 780;
export const PAD = 26;

export const COLORS = {
  background: '#ffffff',
  border: '#e2e2e2',
  brand: '#6C5CE7',
  accent: '#F2994A',
  rule: '#2BB3A3',
  textDark: '#1f2430',
  textMuted: '#6b7280',
  tableHeaderBg: '#f4f5f7',
  tableBorder: '#e5e7eb',
  orangeBoxBg: '#c1730f',
  orangeBoxText: '#ffffff',
  bottomBoxBg: '#fdf6ec',
  bottomBoxText: '#3b2a12',
  placeholder: '#9ca3af',
} as const;

export const PLACEHOLDER = '—';

// Dữ liệu SaleWork chưa có trường "mã telesale" nên khai báo thủ công tại đây.
// Thêm dòng mới khi có tài khoản mới cần gán mã.
export const TELESALE_CODES: Record<string, string> = {
  'Abraham Kế Toán Bánhàng': 'VP-KTBH-001',
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

/** Vẽ toàn bộ thẻ báo cáo "Báo cáo cuối ngày" cho 1 tài khoản lên context đã cho. */
export function drawReportCard(ctx: Canvas2DLike, report: SaleWorkReport): void {
  const w = CARD_WIDTH;
  const h = CARD_HEIGHT;
  const amis = report.amis;

  ctx.fillStyle = COLORS.background;
  roundRect(ctx, 0, 0, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, w - 1, h - 1, 16);
  ctx.stroke();

  let y = 46;

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.brand;
  ctx.font = '700 26px ReportFont-Bold';
  ctx.fillText('BIKEFORCE', PAD, y);

  y += 24;
  ctx.fillStyle = COLORS.accent;
  ctx.font = '600 14px ReportFont-Bold';
  ctx.fillText('Báo cáo cuối ngày', PAD, y);

  y += 16;
  ctx.strokeStyle = COLORS.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(w - PAD, y);
  ctx.stroke();

  y += 28;
  ctx.fillStyle = COLORS.textDark;
  ctx.font = '400 13px ReportFont';
  ctx.fillText(getVietnameseDateLabel(new Date()), PAD, y);

  // Tên telesale = tên tài khoản (tự giảm cỡ chữ nếu tên quá dài)
  y += 34;
  ctx.fillStyle = COLORS.brand;
  const maxNameWidth = w - PAD * 2;
  let nameFontSize = 26;
  ctx.font = `700 ${nameFontSize}px ReportFont-Bold`;
  while (ctx.measureText(report.accountName).width > maxNameWidth && nameFontSize > 15) {
    nameFontSize -= 1;
    ctx.font = `700 ${nameFontSize}px ReportFont-Bold`;
  }
  ctx.fillText(report.accountName, PAD, y);

  // Mã telesale
  y += 22;
  ctx.fillStyle = COLORS.placeholder;
  ctx.font = '400 13px ReportFont';
  ctx.fillText(`Mã telesale: ${getTelesaleCode(report.accountName)}`, PAD, y);

  // --- Tình trạng thực hiện trong tháng ---
  y += 34;
  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 15px ReportFont-Bold';
  ctx.fillText('Tình trạng thực hiện trong tháng', PAD, y);

  y += 22;
  const tableX = PAD;
  const tableW = w - PAD * 2;
  const tableTop = y;
  const rowH = 40;
  const headerH = 34;
  const tableH = headerH + rowH * 2;

  ctx.fillStyle = COLORS.tableHeaderBg;
  roundRect(ctx, tableX, tableTop, tableW, tableH, 8);
  ctx.fill();
  ctx.strokeStyle = COLORS.tableBorder;
  ctx.lineWidth = 1;
  roundRect(ctx, tableX + 0.5, tableTop + 0.5, tableW - 1, tableH - 1, 8);
  ctx.stroke();

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
  ctx.fillText(`Số liệu MISA tính đến ${syncedLabel}`, tableX + 12, tableTop - 6);

  const col1X = tableX + 12;
  const col2X = tableX + tableW * 0.52;
  const col3X = tableX + tableW * 0.76;

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '600 11px ReportFont-Bold';
  ctx.fillText('CHỈ TIÊU', col1X, tableTop + 21);
  ctx.fillText('THỰC ĐẠT', col2X, tableTop + 21);
  ctx.fillText('% HOÀN THÀNH', col3X, tableTop + 21);

  const monthRows: Array<{ label: string; value: string; percent: string }> = [
    {
      label: 'Doanh số đã ghi',
      value: amis ? formatCurrency(amis.currentAmount) : PLACEHOLDER,
      percent: amis ? formatPercent(amis.currentAmount, amis.targetAmount) : PLACEHOLDER,
    },
    {
      label: 'Doanh thu đã ghi',
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
    ctx.fillText(row.label, col1X, textY);

    ctx.fillStyle = amis ? COLORS.textDark : COLORS.placeholder;
    ctx.font = '700 13px ReportFont-Bold';
    ctx.fillText(row.value, col2X, textY);
    ctx.fillText(row.percent, col3X, textY);
  });

  // --- Tình trạng thực hiện trong ngày ---
  y = tableTop + tableH + 32;
  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 15px ReportFont-Bold';
  ctx.fillText('Tình trạng thực hiện trong ngày', PAD, y);

  y += 12;
  const boxX = PAD;
  const boxW = w - PAD * 2;
  const boxTop = y;
  const lineItems: Array<{ label: string; value: string }> = [
    { label: 'Số lượng hội thoại tương tác', value: String(report.conversations) },
    { label: 'Số lượng tin nhắn đã gửi', value: String(report.sentMessages) },
    { label: 'Số lượng tin nhắn đã nhận', value: String(report.receivedMessages) },
    { label: 'Số lượng cuộc gọi đã gọi', value: String(report.outgoingCalls) },
    { label: 'Số lượng cuộc gọi đến đã nghe', value: String(report.incomingCalls) },
    { label: 'Tổng thời gian đã nghe máy', value: report.callDuration },
  ];
  const lineH = 34;
  const listTopPad = 22;
  const bottomBoxH = 78;
  const boxH = listTopPad + lineItems.length * lineH + 16 + bottomBoxH + 16;

  ctx.fillStyle = COLORS.orangeBoxBg;
  roundRect(ctx, boxX, boxTop, boxW, boxH, 14);
  ctx.fill();

  let itemY = boxTop + listTopPad;
  lineItems.forEach((item) => {
    ctx.fillStyle = COLORS.orangeBoxText;
    ctx.font = '400 14px ReportFont';
    ctx.fillText(item.label, boxX + 18, itemY);

    ctx.font = '700 14px ReportFont-Bold';
    const valueWidth = ctx.measureText(item.value).width;
    ctx.fillText(item.value, boxX + boxW - 18 - valueWidth, itemY);

    itemY += lineH;
  });

  const innerBoxY = itemY + 6;
  const innerBoxX = boxX + 16;
  const innerBoxW = boxW - 32;
  ctx.fillStyle = COLORS.bottomBoxBg;
  roundRect(ctx, innerBoxX, innerBoxY, innerBoxW, bottomBoxH, 10);
  ctx.fill();

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
}