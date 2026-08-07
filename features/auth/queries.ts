import 'server-only';

import { redirect } from 'next/navigation';

import { LOGIN_PATH, dashboardPathFor, type UserRole } from '@/lib/auth/routes';
import { LOGIN_REASONS } from '@/lib/auth/messages';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile, type SessionProfile } from '@/services/profiles';

/**
 * LỚP 2 của mô hình 4 lớp (`docs/06-auth-permissions.md §5.3`) — guard chạy
 * trong Server Component / Server Action.
 *
 * Vì sao phải kiểm tra lại dù `middleware.ts` đã chặn: middleware chạy ở edge
 * và có thể bị bỏ sót nếu `matcher` bị sửa nhầm; layout lại là nơi ĐỌC dữ liệu
 * cho cả route group, nên role sai mà layout vẫn render là đã lộ dữ liệu trước
 * khi RLS kịp chặn ở query con. Defense in depth là bắt buộc, không tuỳ chọn
 * (NFR-006).
 *
 * Đặt ở `features/auth/` chứ không phải `lib/auth/` vì các hàm này CHẠM
 * DATABASE qua `services/` — mà AGENTS.md §1.2 cấm `lib/` import `services/`.
 * `lib/auth/` chỉ giữ phần thuần tuý (`routes.ts`, `messages.ts`).
 */

/** Hồ sơ của phiên hiện tại, hoặc `null` nếu chưa đăng nhập / hồ sơ đã mất. */
export async function getCurrentProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();

  // LUÔN dùng getUser() ở server, KHÔNG dùng getSession():
  // getSession() chỉ đọc cookie mà không xác minh chữ ký ⇒ giả mạo được
  // (`docs/06 §3.1` quy tắc 2).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return getSessionProfile(supabase, user.id);
}

/**
 * Bắt buộc có phiên hợp lệ + tài khoản còn hoạt động.
 * Không đạt ⇒ `redirect()` (throw NEXT_REDIRECT, hàm không trả về).
 */
export async function requireProfile(): Promise<SessionProfile> {
  const profile = await getCurrentProfile();

  if (!profile) redirect(LOGIN_PATH);

  // BR-009. Middleware đã đá về /login ở request kế tiếp, nhưng lớp này phải tự
  // đứng được một mình.
  if (!profile.is_active) {
    redirect(`${LOGIN_PATH}?reason=${LOGIN_REASONS.DEACTIVATED}`);
  }

  return profile;
}

/**
 * Bắt buộc đúng vai. Sai vai ⇒ đưa về dashboard của chính vai đó — **không**
 * hiện 403, để không tiết lộ cấu trúc route (`docs/06 §5.2` mục 6).
 */
export async function requireRole(role: UserRole): Promise<SessionProfile> {
  const profile = await requireProfile();

  if (profile.role !== role) {
    redirect(dashboardPathFor(profile.role));
  }

  return profile;
}

/** Đường tắt cho UC-17/18/19 (Phase 10). */
export async function requireAdmin(): Promise<SessionProfile> {
  return requireRole('ADMIN');
}
