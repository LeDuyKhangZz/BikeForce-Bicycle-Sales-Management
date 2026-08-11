'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { authorizeSalesWrite } from '@/features/auth/queries';
import { REPORT_MESSAGES, SAVED_PARAM } from '@/lib/reports/messages';
import { EVENING_REPORT_PATH, SALES_TODAY_PATH } from '@/lib/reports/today-cta';
import { getVietnamToday } from '@/lib/date';
import { morningReportSchema, reportDateSchema } from '@/lib/validation/report';
import { insertMorningReport } from '@/services/reports';
import type { ActionResult } from '@/types/action-result';

/**
 * Server Action của cam kết đầu ngày — UC-04 (tạo). **Chỉ còn một action**
 * từ PHASE 14: UC-05 (sửa) đã bị gỡ khỏi v1 (DEC-055).
 *
 * Bảy bước bắt buộc, đúng thứ tự của `docs/07 §1.3`:
 *   auth → profile (role + is_active) → Zod → dữ liệu do server quyết định →
 *   ghi dưới RLS → revalidate → ActionResult.
 *
 * Bước 1–3 là **thừa về lý thuyết** vì RLS đã chặn ở database. Chúng vẫn tồn tại
 * để (a) cho thông báo tử tế thay vì "0 rows affected", (b) là lớp phòng thủ nếu
 * một policy bị viết sai, (c) tránh một round-trip vô ích (NFR-006).
 */

/**
 * Action này chỉ trả về khi **THẤT BẠI**.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 14 — ĐỔI SANG KHUÔN CỦA DEC-037, VÀ ĐÂY LÀ LÝ DO ĐO ĐƯỢC
 * ─────────────────────────────────────────────────────────────────────────
 *  Tới hết PHASE 13, action này trả `ok: true` rồi form tự `router.replace()`.
 *  **DEC-055 làm cách đó vỡ**, và bộ E2E bắt được ngay ở lượt chạy đầu (3/3
 *  project đỏ cùng một chỗ): sau mỗi Server Action, Next render lại RSC của route
 *  hiện tại. Lần render lại đó của `/sales/today/morning` thấy hôm nay **đã có**
 *  báo cáo nên chạy `redirect(SALES_TODAY_PATH)` — điều hướng phía server, **không
 *  mang theo `?saved=`**. Nó thắng trước `useEffect` của form, nên banner "Đã lưu
 *  báo cáo đầu ngày" biến mất và draft còn sót trong localStorage.
 *
 *  Đây đúng là ISSUE-014 lặp lại ở luồng sáng, và DEC-037 đã ghi sẵn quy tắc:
 *  **route hiện tại có thể tự `redirect()` sau khi dữ liệu đổi ⇒ để Server Action
 *  tự `redirect()`.** Bỏ `revalidatePath` của chính route đó **không** cứu được —
 *  Next re-render route hiện tại dù có revalidate hay không (đã đo ở Phase 4).
 *
 *  Việc dọn draft vì vậy chuyển sang `DiscardMorningDraft` trên `/sales/today`,
 *  cùng cách `DiscardEveningDraft` đã làm từ Phase 4.
 */
export type MorningReportState = Exclude<ActionResult<never>, { ok: true }> | null;

/**
 * Server Action là ENDPOINT CÔNG KHAI — ai cũng gọi được bằng HTTP thủ công,
 * nên ba bước kiểm quyền ở `authorizeSalesWrite()` là bắt buộc, không phải
 * trang trí. Guard đó nằm ở `features/auth/queries.ts` và **dùng chung** với
 * báo cáo cuối ngày (DEC-036).
 */

/** Gom `fieldErrors` theo đúng tên field để UI gắn lỗi ngay dưới từng ô. */
function validationFailure(error: z.ZodError): NonNullable<MorningReportState> {
  return {
    ok: false,
    code: 'VALIDATION',
    message: REPORT_MESSAGES.VALIDATION,
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

/**
 * Đọc đúng 5 ô của form; mọi khoá khác trong FormData bị bỏ qua.
 *
 * PHASE 13 — `visit_purpose` đã bị gỡ (DEC-048). Hai lớp chặn chồng nhau: hàm
 * này không đọc nó, và `morningReportSchema` cũng strip nó nếu ai đó gửi tay.
 */
function readMorningFormData(formData: FormData): Record<string, unknown> {
  return {
    planned_route: formData.get('planned_route'),
    target_visit_points: formData.get('target_visit_points'),
    target_sales_amount: formData.get('target_sales_amount'),
    target_revenue: formData.get('target_revenue'),
    target_customer_visits: formData.get('target_customer_visits'),
  };
}

/**
 * ⚠ CỐ Ý **KHÔNG** revalidate `MORNING_REPORT_PATH` — đây là chính trang đang mở.
 *
 * Không phải vì nó gây ra lỗi mất banner (bỏ nó **không** cứu được, xem chú thích
 * của `MorningReportState`), mà vì nó vô nghĩa: từ DEC-055, trang đó chỉ có hai
 * kết cục — form rỗng khi chưa có báo cáo, hoặc `redirect()` khi đã có. Không có
 * nội dung nào để làm mới.
 */
function revalidateReportRoutes(): void {
  revalidatePath(SALES_TODAY_PATH);
  revalidatePath(EVENING_REPORT_PATH);
}

/**
 * UC-04, FR-008, FR-011 — tạo cam kết đầu ngày.
 *
 * KHÔNG nhận `sales_id`, `report_date`, `status` từ client (docs/07 QUY TẮC 2,
 * 3): schema đã strip chúng, và ba giá trị đó được đặt ngay dưới đây.
 */
export async function saveMorningReport(
  _prevState: MorningReportState,
  formData: FormData,
): Promise<MorningReportState> {
  const auth = await authorizeSalesWrite();
  if (!auth.ok) return auth;

  const parsed = morningReportSchema.safeParse(readMorningFormData(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  // Ngày nghiệp vụ do SERVER tính. Đồng hồ máy client có thể sai hoặc bị cố ý
  // đổi (BR-005, DEC-009). `reportDateSchema` kiểm lại chính giá trị này —
  // chốt chặn phía ứng dụng cho BR-016 và BR-021.
  const today = getVietnamToday();
  if (!reportDateSchema.safeParse(today).success) {
    console.error('[saveMorningReport] getVietnamToday() cho giá trị không hợp lệ:', today);
    return { ok: false, code: 'VALIDATION', message: REPORT_MESSAGES.WRONG_BUSINESS_DATE };
  }

  const result = await insertMorningReport(auth.supabase, auth.profile.id, today, parsed.data);

  if (!result.ok) {
    // BR-001. Đây là đường phòng thủ THẬT cho tình huống hai tab bấm Lưu cùng
    // lúc — không thể chặn ở tầng ứng dụng (docs/07 §3.5).
    if (result.error === 'DUPLICATE') {
      return { ok: false, code: 'CONFLICT', message: REPORT_MESSAGES.DUPLICATE_REPORT };
    }
    if (result.error === 'REJECTED') {
      return { ok: false, code: 'FORBIDDEN', message: REPORT_MESSAGES.SAVE_FAILED };
    }
    return { ok: false, code: 'UNKNOWN', message: REPORT_MESSAGES.SAVE_FAILED };
  }

  revalidateReportRoutes();

  // PHASE 14 — server tự điều hướng, kèm `?saved=` để `/sales/today` biết hiện
  // câu xác nhận nào (DEC-034: server quyết định, client không suy ra). Deterministic,
  // không có cuộc đua với `useEffect` của form. `redirect()` ném ra một exception
  // đặc biệt của Next nên không có dòng nào chạy sau nó.
  redirect(`${SALES_TODAY_PATH}?saved=${SAVED_PARAM.MORNING_CREATED}`);
}

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 14 — `updateMorningReport()` ĐÃ BỊ XOÁ (DEC-055)
 * ─────────────────────────────────────────────────────────────────────────
 *  File này từng có Server Action thứ hai cho UC-05 / FR-012 ("sửa cam kết
 *  sáng"). Người dùng yêu cầu gỡ hẳn khả năng sửa, nên cả action, hàm service
 *  `updateMorningReport()` lẫn nút bấm đều đã bị xoá — không để lại code chết.
 *
 *  ⚠ Policy `reports_update_own_open` trong database **KHÔNG bị đụng tới**: nó
 *  vẫn là đường ghi hợp lệ DUY NHẤT của báo cáo cuối ngày (`completeEveningReport`,
 *  UC-06). Bỏ policy đó là làm sập luồng cuối ngày.
 */
