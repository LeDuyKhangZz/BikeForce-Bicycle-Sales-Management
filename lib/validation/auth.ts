/**
 * Zod schema cho luồng xác thực.
 *
 * MỘT nguồn duy nhất, dùng chung cho form phía client và Server Action phía
 * server (AGENTS.md §9). Server **luôn** validate lại, không tin client
 * (NFR-006).
 */
import { z } from 'zod';

/**
 * Trần 72 ký tự là giới hạn THẬT của bcrypt mà GoTrue dùng — quá 72 byte thì
 * phần dư bị cắt âm thầm. Chặn ở đây để người dùng biết ngay thay vì đặt một
 * mật khẩu dài mà thực chất chỉ 72 ký tự đầu có tác dụng (`docs/06 §11.1`).
 */
export const PASSWORD_MAX_LENGTH = 72;

export const signInSchema = z.object({
  email: z
    .string({ message: 'Vui lòng nhập email.' })
    .trim()
    .toLowerCase()
    .min(1, { message: 'Vui lòng nhập email.' })
    .max(254, { message: 'Email quá dài.' })
    .pipe(z.email({ message: 'Email không đúng định dạng.' })),
  password: z
    .string({ message: 'Vui lòng nhập mật khẩu.' })
    .min(1, { message: 'Vui lòng nhập mật khẩu.' })
    .max(PASSWORD_MAX_LENGTH, {
      message: `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`,
    }),
});

export type SignInInput = z.infer<typeof signInSchema>;
