/**
 * Zod schema cho màn hình tài khoản — FR-023, UC-11.
 *
 * MỘT nguồn duy nhất, dùng chung cho form phía client và Server Action phía
 * server (AGENTS.md §9). Server **luôn** validate lại, không tin client
 * (NFR-006).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  CHÍNH SÁCH MẬT KHẨU — ĐÃ CHỐT 2026-08-10, xem DEC-041
 * ─────────────────────────────────────────────────────────────────────────
 *  `docs/06 §11.1` để bảng này ở trạng thái ĐỀ XUẤT từ Phase 0. Người dùng đã
 *  chốt đúng phương án đề xuất:
 *    • tối thiểu **8** ký tự;
 *    • **không** bắt buộc chữ hoa / chữ số / ký tự đặc biệt — Sales gõ trên bàn
 *      phím điện thoại ngoài trời, quy tắc phức tạp đẩy họ tới chỗ ghi mật khẩu
 *      ra giấy, tức là làm hệ thống kém an toàn hơn chứ không hơn;
 *    • trần **72** ký tự — giới hạn THẬT của bcrypt mà GoTrue dùng;
 *    • bắt **nhập lại lần 2** để không tự khoá mình ra ngoài vì gõ nhầm.
 *
 *  ⚠ Con số 8 phải khớp cả ở **Supabase Dashboard → Authentication → Password**.
 *  Chỉ đặt ở Zod thì đổi mật khẩu qua API vẫn lọt; chỉ đặt ở Supabase thì người
 *  dùng nhận thông báo lỗi tiếng Anh thô (`docs/09 §11`).
 */
import { z } from 'zod';

import { PASSWORD_MAX_LENGTH } from '@/lib/validation/auth';

/** DEC-041 — phải khớp Supabase Dashboard. */
export const PASSWORD_MIN_LENGTH = 8;

const newPasswordField = z
  .string({ message: 'Vui lòng nhập mật khẩu mới.' })
  .min(PASSWORD_MIN_LENGTH, {
    message: `Mật khẩu mới phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`,
  })
  .max(PASSWORD_MAX_LENGTH, {
    message: `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`,
  });

/**
 * `superRefine` thay vì `.refine()` để gắn lỗi **vào đúng ô nhập lại** — lỗi
 * đặt ở cấp form thì người dùng không biết phải sửa ô nào (rule
 * `error-placement`).
 *
 * Cố ý KHÔNG có trường "mật khẩu hiện tại": `docs/06 §11.1` không yêu cầu, và
 * lớp bảo vệ tương ứng nằm ở tầng nền tảng — bật **Secure password change**
 * trên Supabase Dashboard để GoTrue tự đòi phiên đăng nhập gần đây
 * (`docs/09 §11`). Đặt thêm một ô ở form không thay thế được lớp đó.
 */
export const changePasswordSchema = z
  .object({
    password: newPasswordField,
    confirm_password: z
      .string({ message: 'Vui lòng nhập lại mật khẩu mới.' })
      .min(1, { message: 'Vui lòng nhập lại mật khẩu mới.' }),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirm_password) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirm_password'],
        message: 'Hai lần nhập mật khẩu chưa khớp nhau.',
      });
    }
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
