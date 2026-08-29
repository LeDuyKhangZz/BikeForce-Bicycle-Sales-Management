'use client';

import { Download, ImageIcon } from 'lucide-react';

import type { SaleWorkReport } from '@/services/salework';

import { CARD_HEIGHT, CARD_WIDTH, drawReportCard, slugifyFilename } from './salework-report-card';

const BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-medium text-heading transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50';

function buildReportCanvas(report: SaleWorkReport): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const scale = 2; // xuất nét gấp đôi (retina)
  canvas.width = CARD_WIDTH * scale;
  canvas.height = CARD_HEIGHT * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể khởi tạo canvas 2D context.');
  ctx.scale(scale, scale);
  drawReportCard(ctx, report);
  return canvas;
}

function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function exportReportImage(report: SaleWorkReport): void {
  const canvas = buildReportCanvas(report);
  const date = new Date().toISOString().slice(0, 10);
  downloadCanvasAsPng(canvas, `bao-cao-${slugifyFilename(report.accountName)}-${date}.png`);
}

/** Nút xuất ảnh báo cáo cho từng tài khoản riêng lẻ */
export function AccountExportButton({ report }: { report: SaleWorkReport }) {
  return (
    <button
      type="button"
      className={BUTTON_CLASS}
      onClick={() => exportReportImage(report)}
      aria-label={`Xuất ảnh báo cáo cho ${report.accountName}`}
    >
      <ImageIcon className="h-4 w-4" aria-hidden="true" />
      Xuất báo cáo
    </button>
  );
}

/** Nút xuất ảnh báo cáo cho tất cả tài khoản (tải lần lượt) */
export function ExportReportButton({ reports }: { reports: SaleWorkReport[] }) {
  const handleExportAll = () => {
    reports.forEach((report, index) => {
      setTimeout(() => exportReportImage(report), index * 350);
    });
  };

  return (
    <button type="button" className={BUTTON_CLASS} onClick={handleExportAll} disabled={reports.length === 0}>
      <Download className="h-4 w-4" aria-hidden="true" />
      Xuất tất cả (ảnh)
    </button>
  );
}