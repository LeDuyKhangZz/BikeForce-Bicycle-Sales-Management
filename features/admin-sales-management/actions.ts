'use server';

import { revalidatePath } from 'next/cache';

import { SALES_ADMIN_MESSAGES } from '@/lib/admin/messages';
import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  createSalesSchema,
  toggleSalesActiveSchema,
  updateSalesSchema,
} from '@/lib/validation/sales-account';
import { getSessionProfile, setSalesActive, updateSalesProfile } from '@/services/profiles';
import type { ActionResult } from '@/types/action-result';

/**
 * Server Action quản lý tài khoản Sales — UC-17, UC-18, UC-19; FR-030…FR-032.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ĐÂY LÀ FEATURE DUY NHẤT ĐƯỢC IMPORT `lib/supabase/admin.ts`
 * ─────────────────────────────────────────────────────────────────────────
 *  Và chỉ ở đúng **một** hàm (`createSalesAccount`), cho đúng **một** lời gọi
 *  (`auth.admin.createUser`). DEC-005: service role bypass toàn bộ RLS, nên mỗi
 *  chỗ dùng nó là một chỗ mô hình bảo mật bị tắt.
 *
 *  Hai hành động còn lại — sửa hồ sơ và bật/tắt `is_active` — cố ý dùng client
 *  **anon chịu RLS**, vì policy `profiles_update_admin` đã cho phép Admin làm
 *  đúng hai việc đó. Dùng service role ở đó là "cho tiện" và làm mất một lớp
 *  phòng thủ thật.
 *
 *  Thêm một chốt do database ép (DEC-031): `service_role` **không có DML** trên
 *  `profiles` và `daily_reports`. Nếu ai đó lỡ tay dùng admin client để ghi hồ
 *  sơ, câu lệnh sẽ hỏng bằng `42501` chứ không âm thầm chạy được.
 */

/*
 * ⚠ `SALES_ADMIN_MESSAGES` **cố ý nằm ở `lib/admin/messages.ts`**, không phải ở
 * đây. Một file `'use server'` chỉ được export async function — export một
 * object làm module ném lỗi lúc chạy (`/admin/sales/new` hiện "Đã có lỗi xảy
 * ra") trong khi build/typecheck/lint vẫn xanh. Chi tiết: ISSUE-016.
 */

type AdminAuthorization =
  | { ok: true; adminId: string }
  | { ok: false; result: Exclude<ActionResult<never>, { ok: true }> };

/**
 * Guard 3 bước dùng chung cho mọi action ở file này — auth → hồ sơ tồn tại →
 * `is_active` + `role = 'ADMIN'`.
 *
 * Cùng lý do với `authorizeSalesWrite()` (DEC-036): **không** dùng
 * `requireAdmin()` vì hàm đó `redirect()`, mà redirect trong một Server Action
 * gọi từ `useActionState` khiến client không bao giờ nhận `ActionResult` — form
 * treo ở trạng thái "đang lưu".
 *
 * Không nâng lên `features/auth/` như `authorizeSalesWrite`: hàm kia phục vụ
 * ba feature ghi báo cáo, còn hàm này chỉ có một chỗ dùng. Nếu Phase sau cần
 * lần thứ hai thì mới gom.
 */
async function authorizeAdminWrite(): Promise<AdminAuthorization> {
  const supabase = await createClient();

  // LUÔN `getUser()` ở server — `getSession()` chỉ đọc cookie mà không xác minh
  // chữ ký (`docs/06 §3.1` quy tắc 2).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      result: { ok: false, code: 'UNAUTHORIZED', message: AUTH_MESSAGES.SESSION_EXPIRED },
    };
  }

  const profile = await getSessionProfile(supabase, user.id);

  if (!profile) {
    return {
      ok: false,
      result: { ok: false, code: 'NOT_FOUND', message: AUTH_MESSAGES.PROFILE_MISSING },
    };
  }

  // BR-009 — Admin bị vô hiệu hoá giữa phiên vẫn còn cookie hợp lệ.
  if (!profile.is_active) {
    return {
      ok: false,
      result: { ok: false, code: 'ACCOUNT_DISABLED', message: AUTH_MESSAGES.ACCOUNT_DISABLED },
    };
  }

  if (profile.role !== 'ADMIN') {
    return {
      ok: false,
      result: { ok: false, code: 'FORBIDDEN', message: SALES_ADMIN_MESSAGES.FORBIDDEN },
    };
  }

  return { ok: true, adminId: profile.id };
}

/* ===========================================================================
 * UC-17 — TẠO TÀI KHOẢN SALES (FR-030)
 * ========================================================================= */

export type CreateSalesState = ActionResult<{ notice: string; email: string }> | null;

/** Mã lỗi của GoTrue — dịch sang tiếng Việt, không hiện thô (NFR-014). */
const GOTRUE_EMAIL_EXISTS = new Set(['email_exists', 'user_already_exists']);
const GOTRUE_WEAK_PASSWORD = 'weak_password';

export async function createSalesAccount(
  _prevState: CreateSalesState,
  formData: FormData,
): Promise<CreateSalesState> {
  // 1) VALIDATE trước mọi thứ khác (AGENTS.md §8).
  const parsed = createSalesSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
    phone: formData.get('phone') ?? '',
    employee_code: formData.get('employee_code') ?? '',
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: SALES_ADMIN_MESSAGES.VALIDATION,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // 2) AUTH + ROLE.
  const auth = await authorizeAdminWrite();
  if (!auth.ok) return auth.result;

  /*
   * 3) TẠO USER. Đây là chỗ DUY NHẤT trong toàn dự án dùng service role.
   *
   *    `email_confirm: true` — tài khoản do Admin tạo, không có luồng xác nhận
   *    email nào ở v1 (không có self-registration — BR-012, FR-006). Không đặt
   *    cờ này thì Sales không đăng nhập được cho tới khi bấm link trong email
   *    mà hệ thống chưa từng gửi.
   *
   *    `role` KHÔNG được truyền qua metadata: `handle_new_user()` cố ý bỏ qua
   *    nó và luôn tạo `SALES` — đọc role từ `user_metadata` là mở đường tự nâng
   *    quyền, vì client sửa được metadata bằng `auth.updateUser()`.
   */
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      employee_code: parsed.data.employee_code,
    },
  });

  if (error || !data.user) {
    console.error('[createSalesAccount]', error?.code ?? 'no-user', error?.message ?? '');

    if (error?.code && GOTRUE_EMAIL_EXISTS.has(error.code)) {
      return {
        ok: false,
        code: 'CONFLICT',
        message: SALES_ADMIN_MESSAGES.DUPLICATE_EMAIL,
        fieldErrors: { email: [SALES_ADMIN_MESSAGES.DUPLICATE_EMAIL] },
      };
    }

    if (error?.code === GOTRUE_WEAK_PASSWORD) {
      return {
        ok: false,
        code: 'VALIDATION',
        message: SALES_ADMIN_MESSAGES.WEAK_PASSWORD,
        fieldErrors: { password: [SALES_ADMIN_MESSAGES.WEAK_PASSWORD] },
      };
    }

    /*
     * `handle_new_user()` ném `23514` khi thiếu `full_name`, và
     * `uq_profiles_employee_code` ném `23505` khi mã NV trùng. Cả hai xảy ra
     * BÊN TRONG trigger của `auth.users`, nên GoTrue trả về một lỗi 500 chung
     * — không có mã riêng để phân biệt. Đoán nghĩa từ nội dung là mong manh,
     * nên nói câu chung và ghi log đầy đủ ở server (NFR-014).
     */
    if (error?.message?.includes('employee_code') === true) {
      return {
        ok: false,
        code: 'CONFLICT',
        message: SALES_ADMIN_MESSAGES.DUPLICATE_CODE,
        fieldErrors: { employee_code: [SALES_ADMIN_MESSAGES.DUPLICATE_CODE] },
      };
    }

    return { ok: false, code: 'UNKNOWN', message: SALES_ADMIN_MESSAGES.FAILED };
  }

  // Danh sách Sales và mọi bộ lọc theo Sales vừa có thêm một người.
  revalidatePath('/admin/sales');
  revalidatePath('/admin/reports');

  /*
   * DEC-034 — câu xác nhận do **server** quyết định. Và cố ý KHÔNG `redirect()`:
   * mật khẩu tạm chỉ hiện **đúng một lần** (`docs/01 §12.3` bước 6), nên Admin
   * phải ở lại trang để chép nó trước khi đi tiếp.
   */
  return {
    ok: true,
    data: { notice: SALES_ADMIN_MESSAGES.CREATED, email: parsed.data.email },
  };
}

/* ===========================================================================
 * UC-18 — SỬA HỒ SƠ SALES (FR-031)
 * ========================================================================= */

export type UpdateSalesState = ActionResult<{ notice: string }> | null;

export async function updateSalesAccount(
  _prevState: UpdateSalesState,
  formData: FormData,
): Promise<UpdateSalesState> {
  const salesId = formData.get('sales_id');

  if (typeof salesId !== 'string' || salesId === '') {
    return { ok: false, code: 'VALIDATION', message: SALES_ADMIN_MESSAGES.NOT_FOUND };
  }

  const parsed = updateSalesSchema.safeParse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone') ?? '',
    employee_code: formData.get('employee_code') ?? '',
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: SALES_ADMIN_MESSAGES.VALIDATION,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const auth = await authorizeAdminWrite();
  if (!auth.ok) return auth.result;

  // Client anon chịu RLS — `profiles_update_admin` là thứ cho phép, không phải
  // service role (DEC-005).
  const supabase = await createClient();
  const result = await updateSalesProfile(supabase, salesId, parsed.data);

  if (!result.ok) {
    if (result.error === 'DUPLICATE_CODE') {
      return {
        ok: false,
        code: 'CONFLICT',
        message: SALES_ADMIN_MESSAGES.DUPLICATE_CODE,
        fieldErrors: { employee_code: [SALES_ADMIN_MESSAGES.DUPLICATE_CODE] },
      };
    }
    if (result.error === 'NOT_FOUND') {
      return { ok: false, code: 'NOT_FOUND', message: SALES_ADMIN_MESSAGES.NOT_FOUND };
    }
    return { ok: false, code: 'UNKNOWN', message: SALES_ADMIN_MESSAGES.FAILED };
  }

  revalidatePath('/admin/sales');
  revalidatePath(`/admin/sales/${salesId}`);

  return { ok: true, data: { notice: SALES_ADMIN_MESSAGES.UPDATED } };
}

/* ===========================================================================
 * UC-19 — BẬT / TẮT is_active (FR-032, BR-009)
 * ========================================================================= */

export type ToggleSalesActiveState = ActionResult<{ notice: string }> | null;

export async function toggleSalesActive(
  _prevState: ToggleSalesActiveState,
  formData: FormData,
): Promise<ToggleSalesActiveState> {
  const parsed = toggleSalesActiveSchema.safeParse({
    sales_id: formData.get('sales_id'),
    is_active: formData.get('is_active'),
  });

  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION', message: SALES_ADMIN_MESSAGES.NOT_FOUND };
  }

  const auth = await authorizeAdminWrite();
  if (!auth.ok) return auth.result;

  // Admin không tự khoá chính mình: làm vậy là mất luôn đường vào hệ thống nếu
  // đó là Admin duy nhất. `setSalesActive` chỉ khớp `role = 'SALES'` nên tình
  // huống này đã bị chặn ở tầng dưới — kiểm ở đây để câu thông báo rõ ràng.
  if (parsed.data.sales_id === auth.adminId) {
    return { ok: false, code: 'FORBIDDEN', message: SALES_ADMIN_MESSAGES.FORBIDDEN };
  }

  const supabase = await createClient();
  const result = await setSalesActive(supabase, parsed.data.sales_id, parsed.data.is_active);

  if (!result.ok) {
    if (result.error === 'NOT_FOUND') {
      return { ok: false, code: 'NOT_FOUND', message: SALES_ADMIN_MESSAGES.NOT_FOUND };
    }
    return { ok: false, code: 'UNKNOWN', message: SALES_ADMIN_MESSAGES.FAILED };
  }

  revalidatePath('/admin/sales');
  revalidatePath(`/admin/sales/${parsed.data.sales_id}`);

  return {
    ok: true,
    data: {
      notice: parsed.data.is_active
        ? SALES_ADMIN_MESSAGES.ACTIVATED
        : SALES_ADMIN_MESSAGES.DEACTIVATED,
    },
  };
}
