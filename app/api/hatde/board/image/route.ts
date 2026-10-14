import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import path from 'node:path';
import { NextResponse } from 'next/server';

import { drawHatdeBoardImage, getHatdeBoardImageHeight, HATDE_BOARD_IMAGE_WIDTH } from '@/lib/hatde/board-image';
import { buildHatdeSnapshotViewModel } from '@/lib/hatde/view-model';
import { hasValidWebhookToken } from '@/lib/security/webhook-token';
import { createReportAutomationClient } from '@/lib/supabase/admin';
import { getLatestHatdeSnapshot } from '@/services/hatde';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let fontsRegistered = false;

function ensureFontsRegistered() {
  if (fontsRegistered) return;
  const regularRegistered = GlobalFonts.registerFromPath(
    path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf'),
    'HatdeFont',
  );
  const boldRegistered = GlobalFonts.registerFromPath(
    path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf'),
    'HatdeFont',
  );
  if (!regularRegistered || !boldRegistered) {
    throw new Error('Không thể đăng ký font tiếng Việt cho ảnh Hạt Dẻ.');
  }
  fontsRegistered = true;
}

export async function GET(request: Request) {
  const expectedApiKey = process.env.HATDE_BOARD_IMAGE_API_KEY;
  if (expectedApiKey === undefined || expectedApiKey.trim() === '') {
    return NextResponse.json({ error: 'Dịch vụ xuất ảnh Hạt Dẻ chưa được cấu hình.' }, { status: 503 });
  }

  if (!hasValidWebhookToken(request.headers.get('x-api-key'), expectedApiKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const report = await getLatestHatdeSnapshot(createReportAutomationClient());
  if (report === null) {
    return NextResponse.json({ error: 'Chưa có dữ liệu Hạt Dẻ để xuất ảnh.' }, { status: 404 });
  }

  ensureFontsRegistered();
  const background = await loadImage(path.join(process.cwd(), 'public/images/nenhatde.png'));
  const viewModel = buildHatdeSnapshotViewModel(report);
  const canvas = createCanvas(HATDE_BOARD_IMAGE_WIDTH, getHatdeBoardImageHeight(viewModel.branches.length));
  const context = canvas.getContext('2d');
  drawHatdeBoardImage(context, viewModel, background);
  const buffer = canvas.toBuffer('image/png');

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'inline; filename="bang-thi-dua-hat-de.png"',
      'Cache-Control': 'private, no-store',
    },
  });
}
