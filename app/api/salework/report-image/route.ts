import { createCanvas } from '@napi-rs/canvas';
import { NextResponse } from 'next/server';

import { getSaleWorkReport } from '@/services/salework';

// ✅ Đã sửa: bớt 1 cấp "../" — từ route.ts (app/api/salework/report-image/route.ts)
// chỉ cần lên 3 cấp là tới app/, sau đó vào (admin)/admin/salework/...
import { CARD_HEIGHT, CARD_WIDTH, drawReportCard, slugifyFilename, type Canvas2DLike } from '../../../(admin)/admin/salework/salework-report-card';

// Gợi ý: nếu dự án đã cấu hình path alias "@/*" trỏ tới thư mục gốc,
// dùng cách sau sẽ an toàn hơn (không phụ thuộc số cấp thư mục):
// import { CARD_HEIGHT, CARD_WIDTH, drawReportCard, type Canvas2DLike } from '@/app/(admin)/admin/salework/salework-report-card';

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

  // ✅ Đã sửa: getSaleWorkReport() giờ là async (đọc từ Supabase) nên cần await.
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

  const scale = 2;
  const canvas = createCanvas(CARD_WIDTH * scale, CARD_HEIGHT * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  drawReportCard(ctx as unknown as Canvas2DLike, report);

  const buffer = canvas.toBuffer('image/png');

  // ✅ Đã sửa: bọc Buffer bằng Uint8Array vì kiểu BodyInit của Response/NextResponse
  // không nhận trực tiếp Buffer<ArrayBufferLike> (thiếu các thuộc tính của URLSearchParams
  // theo thông báo lỗi ts(2345), do TypeScript đang hiểu nhầm sang overload khác).
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      // ✅ Đã sửa: dùng slugifyFilename() thay vì accountName thô.
      // HTTP header chỉ chấp nhận ký tự Latin-1 (mã <= 255); accountName có dấu
      // tiếng Việt (vd "Kế", "Bánhàng") gây lỗi "Cannot convert argument to a
      // ByteString" ngay khi set header, dù response ảnh vẫn dựng xong bình thường.
      'Content-Disposition': `inline; filename="bao-cao-${slugifyFilename(accountName)}.png"`,
      'Cache-Control': 'no-store',
    },
  });
}