'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authorizeSalesWrite } from '@/features/auth/queries';
import { REPORT_MESSAGES, SAVED_PARAM, type SavedParamValue } from '@/lib/reports/messages';
import {
  EVENING_REPORT_PATH,
  MORNING_REPORT_PATH,
  SALES_TODAY_PATH,
} from '@/lib/reports/today-cta';
import { getVietnamToday } from '@/lib/date';
import { morningReportSchema, reportDateSchema } from '@/lib/validation/report';
import {
  insertMorningReport,
  updateMorningReport as updateMorningReportRow,
  type MorningReportWrite,
} from '@/services/reports';
import type { ActionResult } from '@/types/action-result';

/**
 * Server Action của cam kết đầu ngày — UC-04 (tạo), UC-05 (sửa).
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
 * `notice` cho client biết phải hiện câu xác nhận nào ở `/sales/today`.
 * **Server quyết định**, client không suy ra — xem chú thích của `SavedParamValue`.
 */
export type MorningReportState =
  | ActionResult<{ reportId: string; notice: SavedParamValue }>
  | null;

/**
 * Server Action là ENDPOINT CÔNG KHAI — ai cũng gọi được bằng HTTP thủ công,
 * nên ba bước kiểm quyền ở `authorizeSalesWrite()` là bắt buộc, không phải
 * trang trí. Guard đó nằm ở `features/auth/queries.ts` và **dùng chung** với
 * báo cáo cuối ngày (DEC-036).
 */

/** Gom `fieldErrors` theo đúng tên field để UI gắn lỗi ngay dưới từng ô. */
function validationFailure(error: z.ZodError): Exclude<MorningReportState, null> {
  return {
    ok: false,
    code: 'VALIDATION',
    message: REPORT_MESSAGES.VALIDATION,
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

/** Đọc đúng 6 ô của form; mọi khoá khác trong FormData bị bỏ qua. */
function readMorningFormData(formData: FormData): Record<string, unknown> {
  return {
    planned_route: formData.get('planned_route'),
    visit_purpose: formData.get('visit_purpose'),
    target_visit_points: formData.get('target_visit_points'),
    target_sales_quantity: formData.get('target_sales_quantity'),
    target_revenue: formData.get('target_revenue'),
    target_customer_visits: formData.get('target_customer_visits'),
  };
}

function revalidateReportRoutes(): void {
  revalidatePath(SALES_TODAY_PATH);
  revalidatePath(MORNING_REPORT_PATH);
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

  // Cố ý KHÔNG redirect() ở đây: client cần nhận `ok: true` để xoá draft
  // localStorage và gỡ `beforeunload` guard TRƯỚC khi điều hướng
  // (`docs/03 §4.2` bước 21–22).
  return { ok: true, data: { reportId: result.reportId, notice: SAVED_PARAM.MORNING_CREATED } };
}

const reportIdSchema = z.uuid({ message: REPORT_MESSAGES.REPORT_NOT_FOUND });

/**
 * UC-05, FR-012, BR-019 — sửa cam kết đầu ngày khi còn `MORNING_SUBMITTED`.
 *
 * `reportId` đến từ client, nhưng điều đó **an toàn**: policy
 * `reports_update_own_open` chỉ khớp dòng của chính `auth.uid()` và chỉ khi
 * dòng đó chưa `COMPLETED`. Một `reportId` của người khác cho ra 0 dòng, và ta
 * cố ý trả cùng một thông báo với trường hợp báo cáo đã khoá — chống dò ID.
 */
export async function updateMorningReport(
  _prevState: MorningReportState,
  formData: FormData,
): Promise<MorningReportState> {
  const auth = await authorizeSalesWrite();
  if (!auth.ok) return auth;

  const reportId = reportIdSchema.safeParse(formData.get('report_id'));
  if (!reportId.success) {
    return { ok: false, code: 'NOT_FOUND', message: REPORT_MESSAGES.REPORT_NOT_FOUND };
  }

  const parsed = morningReportSchema.safeParse(readMorningFormData(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  const values: MorningReportWrite = parsed.data;
  const result = await updateMorningReportRow(
    auth.supabase,
    reportId.data,
    auth.profile.id,
    values,
  );

  if (!result.ok) {
    if (result.error === 'REJECTED') {
      return { ok: false, code: 'CONFLICT', message: REPORT_MESSAGES.REPORT_LOCKED };
    }
    return { ok: false, code: 'UNKNOWN', message: REPORT_MESSAGES.SAVE_FAILED };
  }

  revalidateReportRoutes();

  return { ok: true, data: { reportId: result.reportId, notice: SAVED_PARAM.MORNING_UPDATED } };
}
