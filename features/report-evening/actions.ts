'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { authorizeSalesWrite } from '@/features/auth/queries';
import { getVietnamToday } from '@/lib/date';
import { REPORT_MESSAGES, SAVED_PARAM } from '@/lib/reports/messages';
import { MORNING_REPORT_PATH, SALES_TODAY_PATH } from '@/lib/reports/today-cta';
import { eveningReportSchema } from '@/lib/validation/report';
import {
  completeEveningReport,
  getTodayReport,
  type EveningReportWrite,
} from '@/services/reports';
import type { ActionResult } from '@/types/action-result';

/**
 * Server Action của báo cáo cuối ngày — UC-06, FR-014, FR-015.
 *
 * Bảy bước bắt buộc, đúng thứ tự của `docs/07 §1.3`:
 *   auth → profile (role + is_active) → Zod → dữ liệu do server quyết định →
 *   ghi dưới RLS → revalidate → ActionResult.
 *
 * Khác `saveMorningReport` ở đúng một chỗ: đây là thao tác **chuyển trạng thái**
 * chứ không phải tạo mới, nên trước khi ghi phải biết báo cáo sáng có tồn tại
 * hay không (BR-007) và đã bị khoá chưa (BR-019).
 */

/**
 * Action này chỉ trả về khi **THẤT BẠI**.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO ĐIỀU HƯỚNG DO SERVER LÀM, KHÁC `saveMorningReport` — DEC-037
 * ─────────────────────────────────────────────────────────────────────────
 *  Form đầu ngày nhận `ok: true` rồi tự `router.replace()`. Cách đó **không chạy
 *  được** ở đây, và lý do đã đo thật trên Chromium ở Phase 4:
 *
 *  Sau mỗi Server Action, Next render lại RSC của route hiện tại. Lần render lại
 *  đó của `/sales/today/evening` thấy `status` vừa thành `'COMPLETED'` nên chạy
 *  `redirect(SALES_TODAY_PATH)` — một điều hướng phía server. Nó làm form unmount
 *  **trước khi** `useEffect` bắt `state.ok` kịp commit, nên `router.replace()` và
 *  `clearDraft()` không bao giờ chạy. Hậu quả đo được: mất banner xác nhận, và
 *  draft còn sót lại trong localStorage. Bỏ `revalidatePath` của chính route đó
 *  **không** cứu được — Next re-render route hiện tại dù có revalidate hay không.
 *
 *  Nên: server tự `redirect()` kèm `?saved=`. Deterministic, không có cuộc đua.
 *  Việc dọn draft chuyển sang `DiscardEveningDraft` trên `/sales/today` — nơi
 *  chắc chắn chạy được.
 *
 *  ⚠ Hệ quả cho BR-002: `docs/07 §3.7` viết rằng UI bật nút "Xuất ảnh" khi nhận
 *  `status: 'COMPLETED'` **từ action này**. Bản triển khai đi xa hơn một bậc chứ
 *  không lỏng hơn — nút Xuất ảnh nằm ở `/sales/today` và điều kiện bật của nó là
 *  `getTodayView(report).canExportImage`, tức đọc `status` **đã persist** từ
 *  database. Không có đường nào cho trạng thái form phía client tham gia.
 */
export type EveningReportState = Exclude<ActionResult<never>, { ok: true }> | null;

const reportIdSchema = z.uuid({ message: REPORT_MESSAGES.REPORT_NOT_FOUND });

/** Gom `fieldErrors` theo đúng tên field để UI gắn lỗi ngay dưới từng ô. */
function validationFailure(error: z.ZodError): NonNullable<EveningReportState> {
  return {
    ok: false,
    code: 'VALIDATION',
    message: REPORT_MESSAGES.VALIDATION,
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

/** Đọc đúng 6 ô của form; mọi khoá khác trong FormData bị bỏ qua. */
function readEveningFormData(formData: FormData): Record<string, unknown> {
  return {
    actual_route: formData.get('actual_route'),
    actual_visit_points: formData.get('actual_visit_points'),
    actual_sales_quantity: formData.get('actual_sales_quantity'),
    actual_revenue: formData.get('actual_revenue'),
    actual_customer_visits: formData.get('actual_customer_visits'),
    evening_note: formData.get('evening_note'),
  };
}

/**
 * ⚠ CỐ Ý **KHÔNG** revalidate `EVENING_REPORT_PATH` — đây là chính trang đang mở.
 *
 * Đã gặp lỗi thật khi kiểm chứng Phase 4 trên Chromium (cùng họ với DEC-034):
 * `revalidatePath` lên route hiện tại khiến Next render lại RSC của route đó
 * ngay trong phản hồi của Server Action. Lần render lại đó thấy `status` vừa
 * thành `'COMPLETED'` nên chạy `redirect(SALES_TODAY_PATH)` — một điều hướng
 * **phía server**, không mang theo `?saved=`. Nó thắng trước `useEffect` của
 * form, nên form bị unmount trước khi kịp `clearDraft()` và `router.replace()`.
 * Hậu quả đo được: mất banner xác nhận và draft localStorage còn sót lại.
 *
 * Bỏ dòng revalidate đó là đủ: `/sales/today/evening` là route động (`ƒ`) nên
 * lần vào sau luôn truy vấn lại, và bản thân Server Action đã xoá client router
 * cache. Hai route còn lại vẫn phải revalidate — cả hai đều đổi nội dung thật.
 */
function revalidateReportRoutes(): void {
  revalidatePath(SALES_TODAY_PATH);
  // Cam kết sáng nay bị khoá vĩnh viễn (BR-019) — trang sửa phải biết điều đó.
  revalidatePath(MORNING_REPORT_PATH);
}

/**
 * UC-06, FR-014, FR-015 — hoàn tất báo cáo ngày.
 *
 * KHÔNG nhận `status`, `evening_submitted_at`, `sales_id` từ client: schema đã
 * strip chúng (có test khoá lại), và cả ba được đặt ở phía server.
 */
export async function saveEveningReport(
  _prevState: EveningReportState,
  formData: FormData,
): Promise<EveningReportState> {
  const auth = await authorizeSalesWrite();
  if (!auth.ok) return auth;

  const reportId = reportIdSchema.safeParse(formData.get('report_id'));
  if (!reportId.success) {
    return { ok: false, code: 'NOT_FOUND', message: REPORT_MESSAGES.REPORT_NOT_FOUND };
  }

  const parsed = eveningReportSchema.safeParse(readEveningFormData(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  /*
   * BR-007 — phải có cam kết sáng của ĐÚNG ngày hôm nay thì mới hoàn tất được.
   *
   * Truy vấn này không thừa dù RLS đã gác: `reports_update_own_open` chỉ trả về
   * "0 dòng khớp", mà 0 dòng có ba nguyên nhân rất khác nhau (chưa có báo cáo /
   * đã COMPLETED / không phải của mình). Người dùng xứng đáng nhận đúng câu giải
   * thích cho hai nguyên nhân đầu — nguyên nhân thứ ba cố ý dùng chung câu với
   * nguyên nhân thứ hai để chống dò ID (docs/07 §3.6).
   */
  const today = getVietnamToday();
  const report = await getTodayReport(auth.supabase, auth.profile.id, today);

  if (report === null) {
    return { ok: false, code: 'NOT_FOUND', message: REPORT_MESSAGES.NO_MORNING_REPORT };
  }

  // BR-008 — không nhảy bước, không quay lui. `COMPLETED` là trạng thái cuối.
  if (report.status === 'COMPLETED') {
    return { ok: false, code: 'CONFLICT', message: REPORT_MESSAGES.ALREADY_COMPLETED };
  }

  /*
   * `report_id` do client gửi phải là báo cáo HÔM NAY của chính người này.
   *
   * `.eq('sales_id')` trong service và RLS đã chặn báo cáo của người khác, nhưng
   * cả hai đều KHÔNG chặn được một `report_id` hợp lệ của chính mình thuộc một
   * ngày CŨ đang ở trạng thái MORNING_SUBMITTED — đó sẽ là một đường nhập bù
   * ngày cũ đi vòng qua BR-021.
   */
  if (report.id !== reportId.data) {
    return { ok: false, code: 'NOT_FOUND', message: REPORT_MESSAGES.REPORT_NOT_FOUND };
  }

  const values: EveningReportWrite = parsed.data;

  // FR-015 — dấu thời gian do SERVER đặt. Trigger cố ý không tự đóng dấu cột
  // này (ghi chú cuối `0003_functions_triggers.sql`): chỉ một nơi ghi một cột.
  const submittedAt = new Date().toISOString();

  const result = await completeEveningReport(
    auth.supabase,
    report.id,
    auth.profile.id,
    submittedAt,
    values,
  );

  if (!result.ok) {
    // Tới đây mà vẫn REJECTED nghĩa là có ai đó vừa hoàn tất báo cáo này giữa
    // lúc ta đọc và lúc ta ghi — hai tab cùng bấm Lưu (docs/07 §7). RLS là thứ
    // chặn thật, không phải câu `if` phía trên.
    if (result.error === 'REJECTED') {
      return { ok: false, code: 'CONFLICT', message: REPORT_MESSAGES.ALREADY_COMPLETED };
    }
    return { ok: false, code: 'UNKNOWN', message: REPORT_MESSAGES.SAVE_FAILED };
  }

  revalidateReportRoutes();

  // `redirect()` ném NEXT_REDIRECT nên mọi dòng sau đây không chạy — đó là lý do
  // `revalidateReportRoutes()` phải đứng TRƯỚC. Xem khối chú thích của
  // `EveningReportState` để biết vì sao điều hướng nằm ở server chứ không ở
  // client như luồng đầu ngày (DEC-037).
  redirect(`${SALES_TODAY_PATH}?saved=${SAVED_PARAM.EVENING_COMPLETED}`);
}
