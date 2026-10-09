'use server';

import { revalidatePath } from 'next/cache';
import type { UploadApiResponse } from 'cloudinary';

import { authorizeSalesWrite } from '@/features/auth/queries';
import { getCloudinary } from '@/lib/cloudinary';
import { getVietnamToday } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { customerCareReviewSchema, customerCareSubmissionSchema } from '@/lib/validation/customer-care';
import { getSessionProfile } from '@/services/profiles';
import { addCareEvidence, createCareSubmission, getOwnedCareCustomer, reviewCareSubmission } from '@/services/customer-care';
import type { ActionResult } from '@/types/action-result';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type CareActionState = ActionResult<{ notice: string }> | null;

function uploadEvidence(file: File, salesId: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      { resource_type: 'image', type: 'authenticated', folder: `bikeforce/customer-care/${salesId}` },
      (error, result) => {
        if (error || !result) reject(error ?? new Error('Cloudinary không trả kết quả.'));
        else resolve(result);
      },
    );
    file.arrayBuffer().then((buffer) => stream.end(Buffer.from(buffer))).catch(reject);
  });
}

export async function submitCustomerCare(
  _previous: CareActionState,
  formData: FormData,
): Promise<CareActionState> {
  const parsed = customerCareSubmissionSchema.safeParse({
    periodMonth: formData.get('period_month'),
    misaEmployeeId: formData.get('misa_employee_id'),
    misaCustomerId: formData.get('misa_customer_id'),
    careDate: formData.get('care_date'),
    note: formData.get('note') ?? undefined,
  });
  const files = formData.getAll('evidence').filter((value): value is File => value instanceof File && value.size > 0);
  if (!parsed.success || files.length < 1 || files.length > MAX_FILES || files.some((file) => file.size > MAX_FILE_BYTES || !IMAGE_TYPES.has(file.type))) {
    return { ok: false, code: 'VALIDATION', message: 'Vui lòng chọn 1–5 ảnh JPG, PNG hoặc WebP; mỗi ảnh tối đa 10 MB.' };
  }
  if (parsed.data.careDate > getVietnamToday()) {
    return { ok: false, code: 'VALIDATION', message: 'Ngày chăm sóc không được là ngày tương lai.' };
  }

  const auth = await authorizeSalesWrite();
  if (!auth.ok) return auth;
  const customer = await getOwnedCareCustomer(auth.supabase, {
    periodMonth: parsed.data.periodMonth,
    employeeId: parsed.data.misaEmployeeId,
    customerId: parsed.data.misaCustomerId,
  });
  if (!customer) return { ok: false, code: 'FORBIDDEN', message: 'Khách hàng không còn thuộc phạm vi của bạn.' };

  try {
    const submission = await createCareSubmission(auth.supabase, {
      misa_customer_id: customer.misa_customer_id,
      period_month: customer.period_month,
      misa_employee_id: customer.misa_employee_id,
      customer_code: customer.customer_code,
      customer_name: customer.customer_name,
      submitted_by: auth.profile.id,
      care_date: parsed.data.careDate,
      note: parsed.data.note || null,
    });
    const uploads = await Promise.all(files.map((file) => uploadEvidence(file, auth.profile.id)));
    await addCareEvidence(auth.supabase, uploads.map((upload) => ({
      submission_id: submission.id,
      cloudinary_asset_id: upload.asset_id,
      cloudinary_public_id: upload.public_id,
      secure_url: upload.secure_url,
      resource_type: upload.resource_type,
      delivery_type: upload.type,
      format: upload.format,
      bytes: upload.bytes,
      width: upload.width,
      height: upload.height,
    })));
    revalidatePath('/sales/customers');
    revalidatePath('/admin/customer-care');
    return { ok: true, data: { notice: 'Gửi ảnh đã chăm sóc thành công. Yêu cầu đang chờ Admin phê duyệt.' } };
  } catch (error) {
    console.error('[submitCustomerCare]', error);
    return { ok: false, code: 'UNKNOWN', message: 'Không gửi được minh chứng. Vui lòng thử lại.' };
  }
}

export async function reviewCustomerCare(
  _previous: CareActionState,
  formData: FormData,
): Promise<CareActionState> {
  const parsed = customerCareReviewSchema.safeParse({
    submissionId: formData.get('submission_id'),
    decision: formData.get('decision'),
    rejectionReason: formData.get('rejection_reason') ?? undefined,
  });
  if (!parsed.success) return { ok: false, code: 'VALIDATION', message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'UNAUTHORIZED', message: 'Phiên đăng nhập đã hết hạn.' };
  const profile = await getSessionProfile(supabase, user.id);
  if (!profile || !profile.is_active || profile.role !== 'ADMIN') return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền phê duyệt.' };

  try {
    const updated = await reviewCareSubmission(supabase, {
      id: parsed.data.submissionId,
      adminId: profile.id,
      status: parsed.data.decision,
      rejectionReason: parsed.data.decision === 'REJECTED' ? parsed.data.rejectionReason ?? null : null,
    });
    if (!updated) return { ok: false, code: 'CONFLICT', message: 'Yêu cầu đã được xử lý trước đó.' };
    revalidatePath('/admin/customer-care');
    revalidatePath('/sales/customers');
    return { ok: true, data: { notice: parsed.data.decision === 'APPROVED' ? 'Đã phê duyệt.' : 'Đã từ chối.' } };
  } catch (error) {
    console.error('[reviewCustomerCare]', error);
    return { ok: false, code: 'UNKNOWN', message: 'Không cập nhật được yêu cầu.' };
  }
}
