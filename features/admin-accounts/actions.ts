'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile, setSystemAccountActive } from '@/services/profiles';
import type { ActionResult } from '@/types/action-result';

import type { SetSystemAccountActiveState } from './types';

const inputSchema = z.object({
  account_id: z.uuid(),
  is_active: z.enum(['true', 'false']).transform((value) => value === 'true'),
});

export async function setSystemAccountActiveAction(
  _previous: SetSystemAccountActiveState,
  formData: FormData,
): Promise<SetSystemAccountActiveState> {
  const parsed = inputSchema.safeParse({
    account_id: formData.get('account_id'),
    is_active: formData.get('is_active'),
  });
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION', message: 'Thông tin tài khoản không hợp lệ.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'UNAUTHORIZED', message: AUTH_MESSAGES.SESSION_EXPIRED };

  const actor = await getSessionProfile(supabase, user.id);
  if (!actor) return { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING };
  if (!actor.is_active) return { ok: false, code: 'ACCOUNT_DISABLED', message: AUTH_MESSAGES.ACCOUNT_DISABLED };
  if (actor.role !== 'ADMIN') return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền quản lý tài khoản.' };
  if (parsed.data.account_id === actor.id && !parsed.data.is_active) {
    return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thể vô hiệu hóa tài khoản đang đăng nhập.' };
  }

  const result = await setSystemAccountActive(supabase, parsed.data.account_id, parsed.data.is_active);
  if (!result.ok) {
    if (result.error === 'NOT_FOUND') return { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy tài khoản này.' };
    return { ok: false, code: 'UNKNOWN', message: 'Không cập nhật được trạng thái tài khoản. Vui lòng thử lại.' };
  }

  revalidatePath('/admin/accounts');
  const notice = parsed.data.is_active ? 'Đã mở lại tài khoản.' : 'Đã vô hiệu hóa tài khoản. Phiên đăng nhập sẽ bị chặn ở lần kiểm tra tiếp theo.';
  return { ok: true, data: { notice } } satisfies ActionResult<{ notice: string }>;
}
