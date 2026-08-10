/**
 * Zod schema cho quản lý tài khoản Sales — UC-17, UC-18, FR-030, FR-031.
 *
 * MỘT nguồn duy nhất, dùng chung cho form phía client và Server Action phía
 * server (AGENTS.md §9). Server **luôn** validate lại (NFR-006).
 *
 * ⚠ Ràng buộc ở đây phải khớp **CHECK constraint** trong
 * `0001_init_enums_profiles.sql`, nếu không người dùng sẽ gõ xong form rồi mới
 * nhận một lỗi database khó hiểu:
 *   • `ck_profiles_full_name_len`  — 1…100 ký tự sau khi trim;
 *   • `ck_profiles_phone_format`   — `^[0-9+ ]{8,15}$`;
 *   • `uq_profiles_email`          — email duy nhất (BR-025);
 *   • `uq_profiles_employee_code`  — mã NV duy nhất khi khác NULL.
 *
 * ⚠ Cố ý KHÔNG có trường `role` và `is_active` ở schema tạo tài khoản:
 *   • `role` — `handle_new_user()` luôn đặt `SALES`, và cố ý không đọc từ
 *     metadata (đó là đường tự nâng quyền). Admin đầu tiên nâng quyền một lần
 *     bằng SQL theo runbook `docs/09 §10`.
 *   • `is_active` — mặc định `true`; bật/tắt là UC-19, một hành động riêng.
 */
import { z } from 'zod';

import { PASSWORD_MAX_LENGTH } from '@/lib/validation/auth';
import { PASSWORD_MIN_LENGTH } from '@/lib/validation/account';

/** Khớp `ck_profiles_full_name_len`. */
export const FULL_NAME_MAX_LENGTH = 100;
/** Khớp `ck_profiles_phone_format` — chỉ số, dấu cộng và khoảng trắng. */
export const PHONE_PATTERN = /^[0-9+ ]{8,15}$/;
/** Không có CHECK riêng ở DB; trần này chỉ để form không nhận một chuỗi vô hạn. */
export const EMPLOYEE_CODE_MAX_LENGTH = 32;

const fullNameField = z
  .string({ message: 'Vui lòng nhập họ và tên.' })
  .trim()
  .min(1, { message: 'Vui lòng nhập họ và tên.' })
  .max(FULL_NAME_MAX_LENGTH, {
    message: `Họ và tên tối đa ${FULL_NAME_MAX_LENGTH} ký tự.`,
  });

/**
 * Trường TUỲ CHỌN nhưng đến từ `FormData`, nên giá trị "không nhập" là chuỗi
 * rỗng chứ không phải `undefined`. Quy về `null` ở đây để service không phải
 * phân biệt hai thứ đó — và để `uq_profiles_employee_code` (unique WHERE not
 * null) không coi nhiều chuỗi rỗng là trùng nhau.
 */
function optionalField(schema: z.ZodType<string>) {
  return z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .superRefine((value, ctx) => {
      if (value === null) return;
      const result = schema.safeParse(value);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ code: 'custom', message: issue.message });
        }
      }
    });
}

const phoneField = optionalField(
  z.string().regex(PHONE_PATTERN, {
    message: 'Số điện thoại chỉ gồm chữ số, dấu cộng và khoảng trắng, dài 8–15 ký tự.',
  }),
);

const employeeCodeField = optionalField(
  z.string().max(EMPLOYEE_CODE_MAX_LENGTH, {
    message: `Mã nhân viên tối đa ${EMPLOYEE_CODE_MAX_LENGTH} ký tự.`,
  }),
);

const emailField = z
  .string({ message: 'Vui lòng nhập email.' })
  .trim()
  .toLowerCase()
  .min(1, { message: 'Vui lòng nhập email.' })
  .max(254, { message: 'Email quá dài.' })
  .pipe(z.email({ message: 'Email không đúng định dạng.' }));

/**
 * UC-17 — tạo tài khoản Sales (FR-030).
 *
 * Mật khẩu tạm dùng **cùng chính sách** với đổi mật khẩu (DEC-041): tối thiểu 8
 * ký tự. Không đặt quy tắc lỏng hơn cho mật khẩu tạm — nó là mật khẩu thật cho
 * tới khi Sales tự đổi, và v1 **không** ép đổi ở lần đăng nhập đầu (DEC-041).
 */
export const createSalesSchema = z.object({
  email: emailField,
  password: z
    .string({ message: 'Vui lòng nhập mật khẩu tạm.' })
    .min(PASSWORD_MIN_LENGTH, {
      message: `Mật khẩu tạm phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`,
    })
    .max(PASSWORD_MAX_LENGTH, {
      message: `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`,
    }),
  full_name: fullNameField,
  phone: phoneField,
  employee_code: employeeCodeField,
});

export type CreateSalesInput = z.infer<typeof createSalesSchema>;

/**
 * UC-18 — sửa hồ sơ Sales (FR-031).
 *
 * **Không có `email`**: đổi email là đổi định danh đăng nhập, phải đi qua
 * `auth.admin.updateUserById` **và** giữ `profiles.email` khớp `auth.users.email`
 * (BR-025). Ràng buộc đó chưa có FR nào yêu cầu ở v1, nên cố ý để ngoài phạm vi
 * thay vì cài một nửa.
 */
export const updateSalesSchema = z.object({
  full_name: fullNameField,
  phone: phoneField,
  employee_code: employeeCodeField,
});

export type UpdateSalesInput = z.infer<typeof updateSalesSchema>;

/** UC-19 — bật/tắt `is_active` (FR-032, BR-009). */
export const toggleSalesActiveSchema = z.object({
  sales_id: z.uuid({ message: 'Thiếu định danh nhân viên.' }),
  is_active: z.enum(['true', 'false']).transform((value) => value === 'true'),
});
