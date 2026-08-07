'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { LOGIN_PATH, dashboardPathFor, sanitizeNextPath } from '@/lib/auth/routes';
import { createClient } from '@/lib/supabase/server';
import { signInSchema } from '@/lib/validation/auth';
import { getSessionProfile } from '@/services/profiles';
import type { ActionResult } from '@/types/action-result';

/**
 * LỚP 3 của mô hình 4 lớp (`docs/06-auth-permissions.md §5.4`).
 *
 * Thứ tự bắt buộc trong mọi Server Action: **validate Zod → auth → role →
 * ownership → ghi → map lỗi an toàn**. Ở đây chưa có ownership vì hành động này
 * chính là bước tạo phiên.
 */

export type SignInState = ActionResult<never> | null;

/** UC-01, FR-001, FR-002, FR-005. */
export async function signInAction(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  // 1) VALIDATE — luôn validate lại phía server (NFR-006).
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'Vui lòng kiểm tra lại thông tin đăng nhập.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();

  // 2) XÁC THỰC. `@supabase/ssr` tự ghi cookie httpOnly qua cookies API —
  //    Server Action là ngữ cảnh Next.js CHO PHÉP ghi cookie, khác Server Component.
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError || !signInData.user) {
    // NFR-014 + chống user enumeration: MỘT câu duy nhất cho cả sai email lẫn
    // sai mật khẩu; chi tiết chỉ ghi log server.
    console.error('[signInAction]', signInError?.code ?? 'no-user', signInError?.message ?? '');
    return { ok: false, code: 'UNAUTHORIZED', message: AUTH_MESSAGES.INVALID_CREDENTIALS };
  }

  // 3) HỒ SƠ + BR-009. Supabase Auth KHÔNG biết `is_active` — cờ đó là khái
  //    niệm của ứng dụng, nằm ở public.profiles (`docs/06 §8.2`).
  const profile = await getSessionProfile(supabase, signInData.user.id);

  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING };
  }

  if (!profile.is_active) {
    // Thu hồi phiên vừa cấp ngay lập tức, không cho đi tiếp vào app.
    await supabase.auth.signOut();
    return { ok: false, code: 'ACCOUNT_DISABLED', message: AUTH_MESSAGES.ACCOUNT_DISABLED };
  }

  // Xoá cache RSC của người dùng trước đó trên cùng trình duyệt.
  revalidatePath('/', 'layout');

  // 4) ĐIỀU HƯỚNG. `?next=` đã được làm sạch để chống open redirect.
  const nextPath = sanitizeNextPath(formData.get('next')?.toString());

  // redirect() ném NEXT_REDIRECT — phải gọi NGOÀI try/catch, và là lệnh cuối.
  redirect(nextPath ?? dashboardPathFor(profile.role));
}

/** UC-02, FR-003. */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[signOutAction]', error.code ?? '', error.message);
  }

  // Bắt buộc: xoá cache RSC để không còn dữ liệu của người vừa đăng xuất
  // (`docs/06 §3.2`).
  revalidatePath('/', 'layout');

  // Đăng xuất chủ động thì KHÔNG kèm `?reason=` — người dùng tự bấm, không
  // phải bị hệ thống đá ra. Dùng `reason=expired` ở đây sẽ là thông báo sai.
  redirect(LOGIN_PATH);
}
