import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';
import { z } from 'zod';

import { DailyReportShareCard } from '@/features/report-share/daily-report-share-card';
import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { REPORT_MESSAGES } from '@/lib/reports/messages';
import { summarizeMonthToDate } from '@/lib/reports/month-summary';
import {
  SHARE_IMAGE_VIEW_PARAM,
  SHARE_IMAGE_VIEW_VALUE,
  buildShareCardModel,
  shareCardVariantForStatus,
  shareImageFileName,
  shareMonthRange,
} from '@/lib/reports/share-card';
import { createClient } from '@/lib/supabase/server';
import { getReportForShare, listMonthToDateMetrics } from '@/services/reports';

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
 *  Một `id` đoán được là đủ để thử. Nó được bảo vệ bằng **RLS**
 *  `reports_select_own_or_admin` — biên giới thật (DEC-004). Route dùng
 *  `lib/supabase/server.ts` (anon key + cookie phiên), **không** bao giờ dùng
 *  `lib/supabase/admin.ts` (DEC-005).
 *
 *  ⚠ PHASE 14 — lớp thứ hai cũ ("phải `status = 'COMPLETED'`") đã được **DEC-058**
 *  thay bằng việc chọn BIẾN THỂ ảnh theo `status`. Xem chú thích tại chỗ trong
 *  `GET` bên dưới.
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
/**
 * Cùng vùng với database Singapore — ISSUE-019.
 *
 * ⚠ **KHÔNG ĐỦ MỘT MÌNH** — đã đo trên production: khai `preferredRegion` ở cả
 * ba nơi mà `x-vercel-id` vẫn trả `iad1`. Route này chạy Node runtime nên vùng
 * do **Settings → Functions → Region** trên Vercel quyết định. Xem ghi chú đầy
 * đủ ở `app/layout.tsx` và `docs/12 § ISSUE-019`.
 */
export const preferredRegion = 'sin1';


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

/**
 * Dải lửa của thanh tiến độ — PHASE 18, DEC-069.
 *
 * Đọc từ đĩa rồi mã hoá **data URI**: Satori không tải ảnh qua mạng lúc render,
 * và kể cả tải được thì cũng không nên — cùng lý do với font ở ISSUE-002, một
 * request hỏng là hỏng tấm ảnh đã gửi cho khách.
 *
 * Trả `null` khi thiếu file thay vì ném: thẻ vẫn dựng được, chỉ mất hiệu ứng
 * lửa. Một tấm ảnh thiếu trang trí vẫn dùng được, một tấm ảnh 500 thì không.
 * `public/images/**` đã được ghim vào bundle qua `outputFileTracingIncludes`.
 */
let flamePromise: Promise<string | null> | null = null;

function loadFlameStrip(): Promise<string | null> {
  flamePromise ??= readFile(join(process.cwd(), 'public', 'images', 'flame-strip.png'))
    .then((data) => `data:image/png;base64,${data.toString('base64')}`)
    .catch((error: unknown) => {
      console.error('[share-image] flame-strip', error);
      return null;
    });

  return flamePromise;
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

export async function GET(request: Request, context: ShareImageContext): Promise<Response> {
  const { id } = await context.params;

  /*
   * `?view=1` → HIỆN ảnh thay vì TẢI ảnh — PHASE 14, **DEC-061** (ISSUE-029).
   *
   * Tham số này KHÔNG chạm tới quyền, không chọn dữ liệu, không chọn biến thể:
   * nó chỉ đổi đúng một chữ trong `Content-Disposition`. Mọi lớp kiểm tra bên
   * dưới chạy y hệt hai chế độ, nên không có bề mặt tấn công mới ở đây.
   *
   * Lý do nghiệp vụ: `attachment` tải file vào thư mục Tải xuống của điện thoại,
   * mà **Thư viện ảnh thì trang web không ghi vào được** — không có API nào cả.
   * Đường duy nhất còn lại là để người dùng nhấn giữ vào ảnh đang hiển thị rồi
   * chọn "Lưu ảnh", và muốn vậy thì ảnh phải được hiển thị. Xem chú thích đầy đủ
   * ở `lib/reports/share-card.ts § SHARE_IMAGE_VIEW_PARAM`.
   */
  const wantsInlineView =
    new URL(request.url).searchParams.get(SHARE_IMAGE_VIEW_PARAM) === SHARE_IMAGE_VIEW_VALUE;

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

  /*
   * BR-002 sau khi **DEC-058** nới nó — đọc kỹ trước khi "sửa lại cho chặt".
   *
   * Trước PHASE 14, chỗ này trả 403 `NOT_COMPLETED` cho mọi báo cáo chưa hoàn
   * tất. Người dùng yêu cầu gửi Zalo HAI lần mỗi ngày (sáng: cam kết, chiều: kết
   * quả), nên điều kiện đổi từ "phải `COMPLETED`" thành "phải TỒN TẠI và người
   * gọi phải có quyền đọc" — hai vế đó đã được `getReportForShare()` + RLS trả
   * lời ngay bên trên.
   *
   * Phần CỐT LÕI của BR-002 không đổi và vẫn được ép ở đây: ảnh dựng từ **một
   * dòng đã persist trong database**, không bao giờ từ dữ liệu client gửi lên.
   * Client cũng KHÔNG chọn được biến thể — `status` quyết định.
   */
  /*
   * Cụm lũy kế tháng — PHASE 17, **DEC-068**.
   *
   * Một truy vấn THỨ HAI, cố ý tách khỏi `getReportForShare()`: nó đọc nhiều
   * dòng (tối đa 31) và chỉ lấy 8 cột số, còn truy vấn trên đọc đúng một dòng
   * đầy đủ. Gộp lại bằng embedded resource sẽ kéo cả tháng dữ liệu chi tiết về
   * cho một tấm ảnh chỉ cần hai tổng và một phép đếm (NFR-002).
   *
   * Cả hai đi qua CÙNG một client chịu RLS, nên Sales không thể mượn `sales_id`
   * của người khác: policy `reports_select_own_or_admin` trả 0 dòng (BR-003), và
   * Admin xuất ảnh hộ Sales vẫn cộng đúng (BR-022).
   *
   * Mốc dừng do `shareMonthRange()` chọn theo biến thể — bản sáng dừng ở HÔM
   * QUA vì hôm nay chưa có thực đạt (người dùng chốt 2026-08-14).
   */
  const variant = shareCardVariantForStatus(report.status);
  const monthRange = shareMonthRange(report.report_date, variant);

  // Khoảng rỗng (ảnh sáng của ngày 01) vẫn hiện cụm với ba số 0 — đó là sự thật.
  // Chỉ khi truy vấn HỎNG mới bỏ cụm: in `0 ₫` cho một tháng có số liệu là nói
  // sai trên tấm ảnh gửi cấp trên.
  const monthRows =
    monthRange === null || monthRange.isEmpty
      ? []
      : await listMonthToDateMetrics(supabase, report.sales_id, monthRange);

  const monthly =
    monthRange === null || monthRows === null
      ? null
      : { range: monthRange, summary: summarizeMonthToDate(monthRows) };

  const model = buildShareCardModel(report, monthly);
  const fileName = shareImageFileName(
    report.sales.full_name,
    report.report_date,
    model.variant,
  );

  try {
    const [fonts, flameSrc] = await Promise.all([loadShareFonts(), loadFlameStrip()]);

    return new ImageResponse(<DailyReportShareCard model={model} flameSrc={flameSrc} />, {
      width: SHARE_IMAGE_WIDTH,
      height: SHARE_IMAGE_HEIGHT,
      fonts,
      headers: {
        // FR-019 — tên file đã bỏ dấu, khoảng trắng thành `-`. Tên file được
        // giữ ở CẢ HAI chế độ: `inline` vẫn đặt tên cho lần "Lưu ảnh" sau đó.
        'Content-Disposition': `${wantsInlineView ? 'inline' : 'attachment'}; filename="${fileName}"`,
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
