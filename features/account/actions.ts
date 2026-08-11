'use server';

import { revalidatePath } from 'next/cache';

import { CHANGE_PASSWORD_MESSAGES, OWN_PROFILE_MESSAGES } from '@/lib/account/messages';
import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { createClient } from '@/lib/supabase/server';
import { changePasswordSchema, updateOwnProfileSchema } from '@/lib/validation/account';
import { getSessionProfile, updateOwnProfile } from '@/services/profiles';
import type { ActionResult } from '@/types/action-result';

/**
 * Đổi mật khẩu — UC-11, FR-023.
 *
 * Thứ tự bắt buộc của mọi Server Action (AGENTS.md §8): **validate Zod → auth →
 * role/trạng thái → ghi → map lỗi an toàn**. Ở đây không có bước ownership vì
 * hành động này chỉ tác động lên chính user của phiên — `auth.updateUser()`
 * không nhận `userId`, nó luôn sửa người đang đăng nhập. Đó cũng là lý do
 * **không** dùng `lib/supabase/admin.ts` ở đây (DEC-005): service role chỉ dành
 * cho UC-17/18/19, và dùng nó ở đây sẽ mở ra khả năng đổi mật khẩu người khác.
 */

/*
 * ⚠ `CHANGE_PASSWORD_MESSAGES` **cố ý nằm ở `lib/account/messages.ts`**, không
 * phải ở đây. Một file `'use server'` chỉ được export async function — export
 * một object làm module ném lỗi lúc chạy trong khi build/typecheck/lint vẫn
 * xanh (ISSUE-016). Đừng chuyển ngược lại vào file này.
 */

/** Mã lỗi của GoTrue — `docs/07 §6`. Dịch sang tiếng Việt, không hiện thô. */
const GOTRUE_SAME_PASSWORD = 'same_password';
const GOTRUE_WEAK_PASSWORD = 'weak_password';
const GOTRUE_REAUTH_NEEDED = 'reauthentication_needed';

export type ChangePasswordState = ActionResult<{ notice: string }> | null;

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  // 1) VALIDATE — luôn validate lại phía server (NFR-006).
  const parsed = changePasswordSchema.safeParse({
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: CHANGE_PASSWORD_MESSAGES.VALIDATION,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();

  // 2) AUTH. LUÔN `getUser()` ở server — `getSession()` chỉ đọc cookie mà không
  //    xác minh chữ ký nên giả mạo được (`docs/06 §3.1` quy tắc 2).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: 'UNAUTHORIZED', message: AUTH_MESSAGES.SESSION_EXPIRED };
  }

  // 3) BR-009 — tài khoản bị vô hiệu hoá GIỮA PHIÊN vẫn còn cookie hợp lệ, và
  //    người đã bị Admin khoá thì không được đổi mật khẩu để giành lại quyền.
  const profile = await getSessionProfile(supabase, user.id);

  if (!profile) {
    return { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING };
  }

  if (!profile.is_active) {
    return { ok: false, code: 'ACCOUNT_DISABLED', message: AUTH_MESSAGES.ACCOUNT_DISABLED };
  }

  // 4) GHI. GoTrue hash mật khẩu — ứng dụng KHÔNG BAO GIỜ tự hash, tự lưu, tự
  //    so sánh (`docs/06 §11.1`). Không có cột mật khẩu nào trong `profiles`.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    // NFR-014: chi tiết kỹ thuật chỉ ở log server.
    console.error('[changePasswordAction]', error.code ?? '', error.message);

    if (error.code === GOTRUE_SAME_PASSWORD) {
      return {
        ok: false,
        code: 'VALIDATION',
        message: CHANGE_PASSWORD_MESSAGES.SAME_PASSWORD,
        fieldErrors: { password: [CHANGE_PASSWORD_MESSAGES.SAME_PASSWORD] },
      };
    }

    if (error.code === GOTRUE_WEAK_PASSWORD) {
      return {
        ok: false,
        code: 'VALIDATION',
        message: CHANGE_PASSWORD_MESSAGES.WEAK_PASSWORD,
        fieldErrors: { password: [CHANGE_PASSWORD_MESSAGES.WEAK_PASSWORD] },
      };
    }

    // Bật "Secure password change" trên Dashboard thì GoTrue đòi phiên đăng
    // nhập gần đây (`docs/09 §11`). Nói ra việc phải làm, không hiện mã lỗi.
    if (error.code === GOTRUE_REAUTH_NEEDED) {
      return { ok: false, code: 'FORBIDDEN', message: CHANGE_PASSWORD_MESSAGES.REAUTH_REQUIRED };
    }

    return { ok: false, code: 'UNKNOWN', message: CHANGE_PASSWORD_MESSAGES.FAILED };
  }

  /*
   * DEC-034 — câu xác nhận do **server** quyết định, client không tự suy ra từ
   * trạng thái form. Và cố ý KHÔNG `redirect()` như `saveEveningReport`
   * (DEC-037): ở đây không có dữ liệu RSC nào đổi, người dùng ở lại đúng chỗ và
   * chỉ cần một banner. Cũng KHÔNG `revalidatePath` — không có gì để làm mới.
   */
  return { ok: true, data: { notice: CHANGE_PASSWORD_MESSAGES.SUCCESS } };
}

/* ---------------------------------------------------------------------------
 * Sửa hồ sơ của chính mình — PHASE 14, DEC-063
 * ------------------------------------------------------------------------- */

export type UpdateOwnProfileState = ActionResult<{ notice: string }> | null;

/**
 * Admin tự sửa **họ tên, số điện thoại, mã nhân viên** của mình.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO CHỈ ADMIN, DÙ POLICY `profiles_update_self` KHÔNG PHÂN BIỆT VAI
 * ─────────────────────────────────────────────────────────────────────────
 *  Đây là một luật **nghiệp vụ**, không phải giới hạn kỹ thuật. Hồ sơ của Sales
 *  do Admin quản lý (UC-18, FR-031): mã nhân viên và họ tên là dữ liệu đi vào
 *  báo cáo gửi khách, nên đội bán hàng không tự đổi. Admin thì không có ai ở
 *  trên để nhờ — màn hình cũ bảo họ "hãy liên hệ Admin", tức là tự nói với
 *  chính mình. Đó là chỗ DEC-063 sửa.
 *
 *  Ràng buộc "chỉ ADMIN" vì vậy phải ép **ở đây**, ở tầng Server Action, chứ
 *  không thể trông vào RLS: policy `profiles_update_self` cho mọi vai sửa dòng
 *  của mình, và nới nó ra thì không còn đường nào cấm Sales nữa.
 *
 *  Thứ tự bắt buộc (AGENTS.md §8): **validate Zod → auth → role/trạng thái →
 *  ghi → map lỗi an toàn**.
 */
export async function updateOwnProfileAction(
  _prevState: UpdateOwnProfileState,
  formData: FormData,
): Promise<UpdateOwnProfileState> {
  // 1) VALIDATE — luôn validate lại phía server (NFR-006).
  const parsed = updateOwnProfileSchema.safeParse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone'),
    employee_code: formData.get('employee_code'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: OWN_PROFILE_MESSAGES.VALIDATION,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();

  // 2) AUTH — `getUser()` chứ không `getSession()` (`docs/06 §3.1` quy tắc 2).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: 'UNAUTHORIZED', message: AUTH_MESSAGES.SESSION_EXPIRED };
  }

  // 3) ROLE + TRẠNG THÁI. `is_active` phải kiểm vì tài khoản bị khoá GIỮA PHIÊN
  //    vẫn còn cookie hợp lệ (BR-009).
  const profile = await getSessionProfile(supabase, user.id);

  if (!profile) {
    return { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING };
  }

  if (!profile.is_active) {
    return { ok: false, code: 'ACCOUNT_DISABLED', message: AUTH_MESSAGES.ACCOUNT_DISABLED };
  }

  if (profile.role !== 'ADMIN') {
    return { ok: false, code: 'FORBIDDEN', message: OWN_PROFILE_MESSAGES.FORBIDDEN };
  }

  // 4) GHI — `user.id` từ phiên đã xác minh, KHÔNG bao giờ từ `FormData`.
  const result = await updateOwnProfile(supabase, user.id, parsed.data);

  if (!result.ok) {
    if (result.error === 'DUPLICATE_CODE') {
      return {
        ok: false,
        code: 'CONFLICT',
        message: OWN_PROFILE_MESSAGES.DUPLICATE_CODE,
        fieldErrors: { employee_code: [OWN_PROFILE_MESSAGES.DUPLICATE_CODE] },
      };
    }

    if (result.error === 'REJECTED') {
      return { ok: false, code: 'VALIDATION', message: OWN_PROFILE_MESSAGES.REJECTED };
    }

    if (result.error === 'NOT_FOUND') {
      return { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING };
    }

    return { ok: false, code: 'UNKNOWN', message: OWN_PROFILE_MESSAGES.FAILED };
  }

  /*
   * Khác `changePasswordAction`: ở đây CÓ dữ liệu RSC đổi thật — tên hiển thị
   * trên header nằm trong layout và đọc từ cùng bảng `profiles`. Không
   * `revalidatePath` thì người dùng lưu xong vẫn thấy tên cũ ở góc trên, đúng
   * kiểu lỗi mà DEC-034 cảnh báo: giao diện tự kể một câu chuyện khác với server.
   *
   * `layout` chứ không phải `page`: tên hiển thị ở header, mà header thuộc
   * layout của cả khu vực `/admin`.
   */
  revalidatePath('/admin', 'layout');

  return { ok: true, data: { notice: OWN_PROFILE_MESSAGES.SUCCESS } };
}
