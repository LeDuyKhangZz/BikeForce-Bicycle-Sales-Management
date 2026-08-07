/**
 * Chuỗi thông báo auth — MỘT nguồn duy nhất cho toàn hệ thống.
 *
 * `docs/06-auth-permissions.md §8.3` quy định: chỉ dùng ĐÚNG MỘT câu cho trạng
 * thái tài khoản bị vô hiệu hoá ở mọi nơi. Không tự chế biến thể, không kèm mã
 * lỗi kỹ thuật (NFR-014).
 *
 * `INVALID_CREDENTIALS` cố ý KHÔNG phân biệt "sai email" với "sai mật khẩu" —
 * chống user enumeration (`docs/06 §3.1` quy tắc 3).
 */
export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  ACCOUNT_DISABLED: 'Tài khoản của bạn đã bị vô hiệu hoá. Vui lòng liên hệ Admin.',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  PROFILE_MISSING: 'Không tìm thấy hồ sơ tài khoản. Vui lòng liên hệ Admin.',
  SIGN_IN_FAILED: 'Không đăng nhập được lúc này. Vui lòng thử lại.',
  SIGN_OUT_FAILED: 'Không đăng xuất được lúc này. Vui lòng thử lại.',
} as const;

/**
 * Lý do bị đưa về `/login`, truyền qua query param `?reason=`.
 * Middleware đặt giá trị này; trang `/login` đọc ra để hiện đúng banner.
 */
export const LOGIN_REASONS = {
  DEACTIVATED: 'deactivated',
  EXPIRED: 'expired',
} as const;

export type LoginReason = (typeof LOGIN_REASONS)[keyof typeof LOGIN_REASONS];

export function messageForLoginReason(reason: string | undefined): string | null {
  if (reason === LOGIN_REASONS.DEACTIVATED) return AUTH_MESSAGES.ACCOUNT_DISABLED;
  if (reason === LOGIN_REASONS.EXPIRED) return AUTH_MESSAGES.SESSION_EXPIRED;
  return null;
}
