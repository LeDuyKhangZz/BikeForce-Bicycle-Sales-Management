/**
 * Chuỗi thông báo của màn hình tài khoản — UC-11, FR-023.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO Ở `lib/` CHỨ KHÔNG NẰM CẠNH SERVER ACTION — ISSUE-016
 * ─────────────────────────────────────────────────────────────────────────
 *  Next.js quy định một file `'use server'` **chỉ được export async function**.
 *  Một `export const … = { … }` trong đó làm module ném lỗi **lúc chạy**:
 *
 *      Error: A "use server" file can only export async functions, found object.
 *
 *  Điều nguy hiểm là `next build`, `tsc --noEmit` và `eslint` đều **xanh** —
 *  lỗi chỉ lộ ra khi người dùng mở đúng trang đó. Ở đây nó đã làm
 *  `/admin/sales/new` và `/admin/account` hiện "Đã có lỗi xảy ra", và chỉ bộ
 *  E2E của Phase 11 mới bắt được.
 *
 *  Quy tắc rút ra: **mọi hằng số dùng chung phải nằm ở `lib/`**, giống
 *  `lib/auth/messages.ts` và `lib/reports/messages.ts` đã làm từ Phase 2/3.
 *  File `actions.ts` chỉ chứa hành động.
 *
 *  Một nguồn duy nhất cho câu chữ cũng là yêu cầu của DEC-034: **server** quyết
 *  định câu xác nhận, client không tự suy ra từ trạng thái form.
 */
export const CHANGE_PASSWORD_MESSAGES = {
  SUCCESS: 'Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới.',
  VALIDATION: 'Vui lòng kiểm tra lại mật khẩu mới.',
  SAME_PASSWORD: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  WEAK_PASSWORD: 'Mật khẩu mới chưa đủ mạnh. Hãy chọn mật khẩu dài hơn.',
  REAUTH_REQUIRED: 'Vì lý do bảo mật, hãy đăng xuất và đăng nhập lại rồi đổi mật khẩu.',
  FAILED: 'Không đổi được mật khẩu lúc này. Vui lòng thử lại.',
} as const;
