import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import path from 'node:path';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createReportAutomationClient } from '@/lib/supabase/admin';
import { buildEcommerceReportViewModel } from '@/lib/reports/ecommerce-report';
import {
  drawEcommerceReportCard,
  type EcommerceCanvas2DLike,
} from '@/lib/reports/ecommerce-report-card';
import {
  buildSaleWorkReportImageUrl,
  ECOMMERCE_REPORT_ACCOUNT,
} from '@/lib/reports/salework-image-accounts';
import { getLatestPancakeReportForImage } from '@/services/pancake-reports';
import { getSessionProfile } from '@/services/profiles';
import { getSaleWorkReport } from '@/services/salework';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  drawReportCard,
  REPORT_BACKGROUND_PATH,
  slugifyFilename,
  type Canvas2DLike,
} from '../../../(admin)/admin/salework/salework-report-card';

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

function hasApiKey(request: Request): boolean {
  if (!API_KEY) return false;
  const url = new URL(request.url);
  const keyFromQuery = url.searchParams.get('key');
  const keyFromHeader = request.headers.get('x-api-key');
  return keyFromQuery === API_KEY || keyFromHeader === API_KEY;
}

async function isAdminSession(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const profile = await getSessionProfile(supabase, user.id);
  return profile?.role === 'ADMIN' && profile.is_active;
}

export async function GET(request: Request) {
  const authorizedByKey = hasApiKey(request);
  if (!authorizedByKey && !(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const accountName = url.searchParams.get('account');

  // Không truyền ?account= → trả về danh sách tài khoản hiện có để n8n biết cần gọi những gì
  if (!accountName) {
    const reports = await getSaleWorkReport();
    return NextResponse.json({
      accounts: [...reports.map((report) => report.accountName), ECOMMERCE_REPORT_ACCOUNT].map(
        (name) => ({
          accountName: name,
          imageUrl: buildSaleWorkReportImageUrl(
            name,
            authorizedByKey ? API_KEY : undefined,
          ),
        }),
      ),
    });
  }

  ensureFontsRegistered();
  const background = await loadImage(
    path.join(process.cwd(), 'public', REPORT_BACKGROUND_PATH.slice(1)),
  );

  const scale = 2;
  const canvas = createCanvas(CARD_WIDTH * scale, CARD_HEIGHT * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  if (accountName === ECOMMERCE_REPORT_ACCOUNT) {
    const report = await getLatestPancakeReportForImage(createReportAutomationClient());
    if (report === null) {
      return NextResponse.json({ error: 'Chưa có dữ liệu Pancake' }, { status: 404 });
    }
    drawEcommerceReportCard(
      ctx as unknown as EcommerceCanvas2DLike,
      buildEcommerceReportViewModel(report),
      background as unknown as CanvasImageSource,
    );
  } else {
    const reports = await getSaleWorkReport();
    const report = reports.find((item) => item.accountName === accountName);
    if (!report) {
      return NextResponse.json({ error: `Không tìm thấy tài khoản: ${accountName}` }, { status: 404 });
    }
    drawReportCard(
      ctx as unknown as Canvas2DLike,
      report,
      background as unknown as CanvasImageSource,
    );
  }

  const buffer = canvas.toBuffer('image/png');

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="bao-cao-${slugifyFilename(accountName)}.png"`,
      'Cache-Control': 'no-store',
    },
  });
}
