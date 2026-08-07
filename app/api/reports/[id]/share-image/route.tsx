import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';
import { z } from 'zod';

import { DailyReportShareCard } from '@/features/report-share/daily-report-share-card';
import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { REPORT_MESSAGES } from '@/lib/reports/messages';
import { buildShareCardModel, shareImageFileName } from '@/lib/reports/share-card';
import { createClient } from '@/lib/supabase/server';
import { getReportForShare } from '@/services/reports';

/**
 * `GET /api/reports/[id]/share-image` — UC-08, FR-018, FR-019.
 *
 * **Route Handler DUY NHẤT của dự án** (DEC-003). Mọi thao tác đọc/ghi khác đi
 * qua Server Component và Server Action; chỉ tấm ảnh này cần một URL thật vì
 * client phải `fetch` nó ra `Blob` để đưa vào Web Share API (DEC-011).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ĐÂY LÀ BỀ MẶT IDOR RÕ RÀNG NHẤT CỦA HỆ THỐNG (`docs/07 §4.1`)
 * ─────────────────────────────────────────────────────────────────────────
 *  Một `id` đoán được là đủ để thử. Nó được bảo vệ bằng HAI lớp:
 *    1. **RLS** `reports_select_own_or_admin` — biên giới thật (DEC-004).
 *       Route dùng `lib/supabase/server.ts` (anon key + cookie phiên), **không**
 *       bao giờ dùng `lib/supabase/admin.ts` (DEC-005).
 *    2. Kiểm tra tường minh `status === 'COMPLETED'` trong handler (BR-002).
 *
 *  Không tồn tại và không có quyền đều trả **404 giống hệt nhau**: phân biệt hai
 *  ca là tự xác nhận rằng một `id` có thật, tức là biến 404 thành một kênh dò.
 *
 * Admin gọi được đúng route này cho báo cáo của Sales (BR-022) — không cần một
 * route riêng, vì RLS đã phân quyền sẵn ở tầng dưới.
 */

/** Satori phải đọc file font bằng `fs` ⇒ không chạy được ở Edge (DEC-010). */
export const runtime = 'nodejs';

/** Nội dung phụ thuộc cookie phiên và dữ liệu sống ⇒ không được prerender. */
export const dynamic = 'force-dynamic';

const SHARE_IMAGE_WIDTH = 1080;
const SHARE_IMAGE_HEIGHT = 1920;

/**
 * `id` phải là uuid TRƯỚC khi chạm database (`docs/07 §4.1`): một `id` sai định
 * dạng làm PostgREST trả lỗi `22P02` — vẫn an toàn, nhưng đó là một truy vấn
 * thừa cho mỗi lần ai đó nghịch URL.
 */
const reportIdSchema = z.uuid();

/**
 * Ba file font, đọc từ đĩa ở Node runtime. **Không tải qua mạng lúc render**
 * (ISSUE-002): một request tới Google Fonts mà hỏng nghĩa là ảnh mất dấu tiếng
 * Việt, và lỗi đó chỉ lộ ra trên tấm ảnh đã gửi cho khách.
 *
 * `public/fonts/` được ghim vào bundle của route này bằng `outputFileTracingIncludes`
 * trong `next.config.ts` — nếu không, Vercel không đóng gói file mà `fs` cần.
 */
const FONT_FILES = [
  { file: 'Inter-Regular.ttf', weight: 400 },
  { file: 'Inter-SemiBold.ttf', weight: 600 },
  { file: 'Inter-Bold.ttf', weight: 700 },
] as const;

type ShareFont = {
  name: 'Inter';
  data: Buffer;
  weight: (typeof FONT_FILES)[number]['weight'];
  style: 'normal';
};

/**
 * Đọc font MỘT lần cho mỗi tiến trình. Ba file ≈ 1MB; đọc lại ở từng request là
 * lãng phí I/O trên một hàm serverless vốn đã bị tính theo thời gian chạy.
 * Giữ `Promise` (không phải kết quả) để hai request đồng thời của lần khởi động
 * nguội cùng chờ một lượt đọc.
 */
let fontsPromise: Promise<ShareFont[]> | null = null;

function loadShareFonts(): Promise<ShareFont[]> {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ({ file, weight }): Promise<ShareFont> => {
      const data = await readFile(join(process.cwd(), 'public', 'fonts', file));
      return { name: 'Inter', data, weight, style: 'normal' };
    }),
  );

  return fontsPromise;
}

/** Lỗi trả về dạng JSON `{ code, message }` — `docs/07 §4.1`. */
function errorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { code, message },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/** Next 16 truyền `params` dưới dạng Promise cho cả page lẫn route handler. */
type ShareImageContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: ShareImageContext): Promise<Response> {
  const { id } = await context.params;

  const parsedId = reportIdSchema.safeParse(id);
  if (!parsedId.success) {
    return errorResponse(404, 'REPORT_NOT_FOUND', REPORT_MESSAGES.REPORT_NOT_FOUND);
  }

  const supabase = await createClient();

  // LUÔN `getUser()` ở server: `getSession()` chỉ đọc cookie mà không xác minh
  // chữ ký nên giả mạo được (`docs/06 §3.1` quy tắc 2).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse(401, 'UNAUTHENTICATED', AUTH_MESSAGES.SESSION_EXPIRED);
  }

  // Không lọc `sales_id` ở đây — RLS quyết định, và Admin phải xuất được ảnh cho
  // Sales (BR-022). Xem chú thích của `getReportForShare`.
  const report = await getReportForShare(supabase, parsedId.data);

  if (report === null) {
    return errorResponse(404, 'REPORT_NOT_FOUND', REPORT_MESSAGES.REPORT_NOT_FOUND);
  }

  // BR-002 — điều kiện được kiểm trên dữ liệu ĐÃ PERSIST, không bao giờ trên
  // trạng thái form phía client.
  if (report.status !== 'COMPLETED') {
    return errorResponse(403, 'NOT_COMPLETED', REPORT_MESSAGES.NOT_COMPLETED);
  }

  const model = buildShareCardModel(report);
  const fileName = shareImageFileName(report.sales.full_name, report.report_date);

  try {
    return new ImageResponse(<DailyReportShareCard model={model} />, {
      width: SHARE_IMAGE_WIDTH,
      height: SHARE_IMAGE_HEIGHT,
      fonts: await loadShareFonts(),
      headers: {
        // FR-019 — tên file đã bỏ dấu, khoảng trắng thành `-`.
        'Content-Disposition': `attachment; filename="${fileName}"`,
        // DEC-021 — ảnh không lưu ở đâu cả, và là dữ liệu riêng của một người.
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    // Satori ném lỗi khi gặp CSS nó không dựng được (ISSUE-002). Chi tiết ở log
    // server; client chỉ nhận một câu an toàn (NFR-014).
    console.error('[share-image]', error);
    return errorResponse(500, 'UNKNOWN', REPORT_MESSAGES.IMAGE_FAILED);
  }
}
