import 'server-only';

import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { AUTH_MESSAGES, LOGIN_REASONS } from '@/lib/auth/messages';
import { LOGIN_PATH, dashboardPathFor, type UserRole } from '@/lib/auth/routes';
import { REPORT_MESSAGES } from '@/lib/reports/messages';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile, type SessionProfile } from '@/services/profiles';
import type { ActionErrorCode } from '@/types/action-result';
import type { Database } from '@/types/database.types';

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

/**
 * Hồ sơ của phiên hiện tại, hoặc `null` nếu chưa đăng nhập / hồ sơ đã mất.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ⛔ ĐÃ THỬ BỌC `cache()` CỦA REACT VÀ ĐÃ PHẢI GỠ RA — ISSUE-021
 * ─────────────────────────────────────────────────────────────────────────
 *  Hàm này tốn **hai lượt đi-về mạng** (`getUser()` xác minh chữ ký JWT ở máy
 *  chủ Auth, rồi `getSessionProfile()` truy vấn database), và mô hình 4 lớp gọi
 *  nó **hai lần mỗi trang** — một ở `layout.tsx`, một ở `page.tsx`. Bọc
 *  `cache()` để gộp bốn lượt còn hai là ý tưởng đúng về nguyên tắc.
 *
 *  **Nhưng nó làm ĐĂNG NHẬP TREO, không tất định.** Đo thật ngày 2026-08-10:
 *  bộ E2E rớt từ 111/111 xuống 109/111 rồi 105/111 qua các lượt chạy, luôn ở
 *  cùng một chỗ — `signIn` hết giờ 20 giây, form kẹt ở "Đang đăng nhập…" với
 *  các ô bị disabled, tức **Server Action không bao giờ trả về** (rate limit
 *  thì trả lỗi ngay chứ không treo).
 *
 *  Cơ chế: `signInAction` kết thúc bằng `redirect()`, nên Next **render trang
 *  đích ngay trong cùng request POST**. Trang đích gọi `requireRole()` →
 *  chính hàm này. `cache()` ghi nhớ **promise**, và khi promise ấy dính vào một
 *  render pass bị huỷ thì lần `await` sau không bao giờ settle.
 *
 *  **ĐỪNG THỬ LẠI** nếu chỉ có ý tưởng mà không có cách đo. Muốn gộp lượt gọi
 *  thì phải tránh đúng đường `action → redirect → render`: ví dụ chỉ memo hoá
 *  cho nhánh `requireProfile()` và để `/login` cùng `app/page.tsx` dùng bản
 *  không memo. Và bắt buộc chạy `npm run e2e` **nhiều lượt** — một lượt xanh
 *  không chứng minh được gì với lỗi không tất định.
 *
 *  Phần thắng lớn về hiệu năng nằm ở chỗ khác và đã lấy được: `preferredRegion`
 *  (ISSUE-019) giảm chi phí **mỗi** lượt từ ~230 ms xuống cùng vùng với database.
 */
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

/* ===========================================================================
 * Guard dành cho SERVER ACTION — không redirect, trả về kết quả
 * ========================================================================= */

export type SalesWriteAuthorization =
  | { ok: true; profile: SessionProfile; supabase: SupabaseClient<Database> }
  | { ok: false; code: ActionErrorCode; message: string };

/**
 * Ba bước đầu của `docs/07 §1.3` cho mọi Server Action GHI báo cáo:
 * auth → profile tồn tại → `is_active` + `role = 'SALES'`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO KHÔNG DÙNG `requireRole('SALES')` Ở TRÊN
 * ─────────────────────────────────────────────────────────────────────────
 *  `requireRole` **redirect** khi không đạt. Trong một Server Action gọi từ
 *  `useActionState`, redirect làm client không bao giờ nhận được `ActionResult`
 *  — form treo ở trạng thái "đang lưu" và người dùng không biết chuyện gì xảy
 *  ra. Guard của Server Action phải TRẢ VỀ lỗi, không throw
 *  (AGENTS.md §2: "không throw xuyên biên giới Server Action").
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO Ở `features/auth/` MÀ KHÔNG Ở `lib/` — DEC-036
 * ─────────────────────────────────────────────────────────────────────────
 *  Hàm này chạm `services/profiles`, mà AGENTS.md §1.2 cấm `lib/` import
 *  `services/`. Phase 3 đã để một bản trong `features/report-morning/actions.ts`;
 *  Phase 4 cần **đúng** nó cho form cuối ngày. Nhân bản 40 dòng kiểm quyền ra
 *  hai chỗ là cách chắc chắn nhất để một ngày nào đó chỉ một trong hai chỗ được
 *  vá. `features/auth/` là ngoại lệ được ghi nhận của luật "features/X không
 *  import features/Y" — xem DEC-036.
 *
 * Trả luôn cả `supabase` client để tầng gọi không phải tạo client lần thứ hai
 * cho cùng một request.
 */
export async function authorizeSalesWrite(): Promise<SalesWriteAuthorization> {
  const supabase = await createClient();

  // LUÔN getUser() ở server — getSession() chỉ đọc cookie mà không xác minh
  // chữ ký nên giả mạo được (`docs/06 §3.1`).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: 'UNAUTHORIZED', message: AUTH_MESSAGES.SESSION_EXPIRED };
  }

  const profile = await getSessionProfile(supabase, user.id);

  if (!profile) {
    return { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING };
  }

  // BR-009 — tài khoản bị vô hiệu hoá GIỮA PHIÊN vẫn còn cookie hợp lệ.
  if (!profile.is_active) {
    return { ok: false, code: 'ACCOUNT_DISABLED', message: AUTH_MESSAGES.ACCOUNT_DISABLED };
  }

  // DEC-030 — chỉ Sales tự cam kết KPI; Admin không tạo báo cáo hộ ai.
  if (profile.role !== 'SALES') {
    return { ok: false, code: 'FORBIDDEN', message: REPORT_MESSAGES.FORBIDDEN };
  }

  return { ok: true, profile, supabase };
}
