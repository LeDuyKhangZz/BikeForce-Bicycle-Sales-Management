/**
 * Ba trường hồ sơ dùng chung — `full_name`, `phone`, `employee_code`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO CÓ FILE NÀY (PHASE 14 — DEC-063)
 * ─────────────────────────────────────────────────────────────────────────
 *  Ba trường này nay có **hai** chỗ nhập, hai chủ thể khác nhau:
 *
 *    • Admin sửa hồ sơ của **một Sales**   — UC-18, `lib/validation/sales-account.ts`
 *    • Admin sửa hồ sơ của **chính mình**  — DEC-063, `lib/validation/account.ts`
 *
 *  Ràng buộc thì y hệt nhau, vì nó không đến từ nghiệp vụ mà đến từ **CHECK
 *  constraint trong `0001_init_enums_profiles.sql`**. Chép ra hai bản là mở
 *  đường cho hai bản trôi khỏi nhau, rồi một form nào đó nhận lỗi database thô.
 *  AGENTS.md §9 cấm đúng chuyện này.
 *
 *  Đặt ở một file riêng chứ không để `account.ts` import `sales-account.ts`:
 *  `sales-account.ts` đã import `PASSWORD_MIN_LENGTH` từ `account.ts`, nên chiều
 *  ngược lại sẽ tạo **vòng import**.
 *
 *  ⚠ Sửa ràng buộc ở đây thì phải sửa CHECK constraint tương ứng, và ngược lại.
 */
import { z } from 'zod';

/** Khớp `ck_profiles_full_name_len`. */
export const FULL_NAME_MAX_LENGTH = 100;
/** Khớp `ck_profiles_phone_format` — chỉ số, dấu cộng và khoảng trắng. */
export const PHONE_PATTERN = /^[0-9+ ]{8,15}$/;
/** Không có CHECK riêng ở DB; trần này chỉ để form không nhận một chuỗi vô hạn. */
export const EMPLOYEE_CODE_MAX_LENGTH = 32;

export const fullNameField = z
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

export const phoneField = optionalField(
  z.string().regex(PHONE_PATTERN, {
    message: 'Số điện thoại chỉ gồm chữ số, dấu cộng và khoảng trắng, dài 8–15 ký tự.',
  }),
);

export const employeeCodeField = optionalField(
  z.string().max(EMPLOYEE_CODE_MAX_LENGTH, {
    message: `Mã nhân viên tối đa ${EMPLOYEE_CODE_MAX_LENGTH} ký tự.`,
  }),
);
