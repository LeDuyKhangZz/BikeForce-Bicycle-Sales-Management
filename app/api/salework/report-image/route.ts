import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'node:path';
import { NextResponse } from 'next/server';

import { getSaleWorkReport } from '@/services/salework';
import { CARD_HEIGHT, CARD_WIDTH, drawReportCard, slugifyFilename, type Canvas2DLike } from '../../../(admin)/admin/salework/salework-report-card';

// Đăng ký font — chỉ nằm trong route.ts (server-only), không được đưa vào
// salework-report-card.ts vì file đó còn được Client Component import,
// và @napi-rs/canvas là native module không thể bundle cho trình duyệt.
let fontsRegistered = false;
function ensureFontsRegistered() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(
    path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf'),
    'ReportFont'
  );
  GlobalFonts.registerFromPath(
    path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf'),
    'ReportFont-Bold'
  );
  fontsRegistered = true;
}

// API key đơn giản để n8n xác thực khi gọi vào — KHÔNG dùng session/cookie admin
// vì n8n không đăng nhập qua trình duyệt được. Đặt biến môi trường:
// SALEWORK_REPORT_API_KEY=xxxxxxxx trong .env.local (và trên server production).
const API_KEY = process.env.SALEWORK_REPORT_API_KEY;

function isAuthorized(request: Request): boolean {
  if (!API_KEY) return false; // bắt buộc phải cấu hình key, không cho phép bỏ trống
  const url = new URL(request.url);
  const keyFromQuery = url.searchParams.get('key');
  const keyFromHeader = request.headers.get('x-api-key');
  return keyFromQuery === API_KEY || keyFromHeader === API_KEY;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reports = await getSaleWorkReport();
  const url = new URL(request.url);
  const accountName = url.searchParams.get('account');

  // Không truyền ?account= → trả về danh sách tài khoản hiện có để n8n biết cần gọi những gì
  if (!accountName) {
    return NextResponse.json({
      accounts: reports.map((r) => ({
        accountName: r.accountName,
        imageUrl: `/api/salework/report-image?account=${encodeURIComponent(r.accountName)}&key=${API_KEY}`,
      })),
    });
  }

  const report = reports.find((r) => r.accountName === accountName);
  if (!report) {
    return NextResponse.json({ error: `Không tìm thấy tài khoản: ${accountName}` }, { status: 404 });
  }

  ensureFontsRegistered();

  const scale = 2;
  const canvas = createCanvas(CARD_WIDTH * scale, CARD_HEIGHT * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  drawReportCard(ctx as unknown as Canvas2DLike, report);

  const buffer = canvas.toBuffer('image/png');

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="bao-cao-${slugifyFilename(accountName)}.png"`,
      'Cache-Control': 'no-store',
    },
  });
}