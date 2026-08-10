'use server';

import { CHANGE_PASSWORD_MESSAGES } from '@/lib/account/messages';
import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { createClient } from '@/lib/supabase/server';
import { changePasswordSchema } from '@/lib/validation/account';
import { getSessionProfile } from '@/services/profiles';
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
