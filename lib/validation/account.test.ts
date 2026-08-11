import { describe, expect, it } from 'vitest';

import { updateOwnProfileSchema } from './account';
import { EMPLOYEE_CODE_MAX_LENGTH, FULL_NAME_MAX_LENGTH } from './profile-fields';

/**
 * `updateOwnProfileSchema` — PHASE 14, DEC-063.
 *
 * Ràng buộc ở đây phải khớp CHECK constraint của `0001_init_enums_profiles.sql`.
 * Test này là chốt chặn cho việc đó: nếu ai sửa schema lỏng hơn database thì
 * người dùng sẽ gõ xong form mới nhận một lỗi Postgres khó hiểu — đúng thứ mà
 * `lib/validation/profile-fields.ts` sinh ra để tránh.
 */
describe('updateOwnProfileSchema — họ và tên', () => {
  it('cắt khoảng trắng thừa hai đầu', () => {
    const result = updateOwnProfileSchema.safeParse({
      full_name: '  Lê Duy Khang  ',
      phone: '',
      employee_code: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.full_name).toBe('Lê Duy Khang');
  });

  it('từ chối tên rỗng — đây là trường bắt buộc duy nhất của form', () => {
    const result = updateOwnProfileSchema.safeParse({
      full_name: '   ',
      phone: '',
      employee_code: '',
    });

    expect(result.success).toBe(false);
  });

  it(`từ chối tên dài quá ${FULL_NAME_MAX_LENGTH} ký tự (ck_profiles_full_name_len)`, () => {
    const result = updateOwnProfileSchema.safeParse({
      full_name: 'a'.repeat(FULL_NAME_MAX_LENGTH + 1),
      phone: '',
      employee_code: '',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateOwnProfileSchema — hai trường tuỳ chọn', () => {
  it('chuỗi rỗng thành `null`, KHÔNG phải chuỗi rỗng', () => {
    // Quan trọng với `uq_profiles_employee_code` (unique WHERE not null): nhiều
    // hồ sơ cùng để trống mã NV thì phải là nhiều `null`, không phải nhiều `''`
    // — nếu không, người thứ hai bỏ trống sẽ dính lỗi trùng mã.
    const result = updateOwnProfileSchema.safeParse({
      full_name: 'Lê Duy Khang',
      phone: '',
      employee_code: '   ',
    });

    expect(result.success).toBe(true);
    expect(result.data?.phone).toBeNull();
    expect(result.data?.employee_code).toBeNull();
  });

  it.each(['0901234567', '+84 901 234 567', '0901 234 567'])(
    'nhận số điện thoại hợp lệ: %s',
    (phone) => {
      const result = updateOwnProfileSchema.safeParse({
        full_name: 'Lê Duy Khang',
        phone,
        employee_code: '',
      });

      expect(result.success).toBe(true);
    },
  );

  it.each(['090-123-4567', 'abc12345', '0901', '0901234567890123456'])(
    'từ chối số điện thoại sai `ck_profiles_phone_format`: %s',
    (phone) => {
      const result = updateOwnProfileSchema.safeParse({
        full_name: 'Lê Duy Khang',
        phone,
        employee_code: '',
      });

      expect(result.success).toBe(false);
    },
  );

  it(`từ chối mã nhân viên dài quá ${EMPLOYEE_CODE_MAX_LENGTH} ký tự`, () => {
    const result = updateOwnProfileSchema.safeParse({
      full_name: 'Lê Duy Khang',
      phone: '',
      employee_code: 'A'.repeat(EMPLOYEE_CODE_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe('updateOwnProfileSchema — những trường CỐ Ý không có', () => {
  /**
   * Đây là phép kiểm về **bề mặt tấn công**, không phải về tiện ích.
   *
   * Server Action ghi thẳng `parsed.data` xuống `profiles`. Nếu schema lỡ nhận
   * thêm `role`, `is_active` hay `email` thì một request tự dựng sẽ đổi được
   * chúng — và với Admin thì trigger `guard_profile_self_update()` **không**
   * chặn (nó `return new` ngay khi `is_admin()`). Nói cách khác, schema này
   * chính là lớp bảo vệ duy nhất ở chỗ đó.
   */
  it('bỏ qua role / is_active / email dù client có gửi lên', () => {
    const result = updateOwnProfileSchema.safeParse({
      full_name: 'Lê Duy Khang',
      phone: '',
      employee_code: '',
      role: 'ADMIN',
      is_active: 'false',
      email: 'ke-gia-mao@bikeforce.test',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      full_name: 'Lê Duy Khang',
      phone: null,
      employee_code: null,
    });
  });
});
