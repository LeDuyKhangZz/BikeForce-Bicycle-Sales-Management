/**
 * Data access cho `public.profiles`.
 *
 * AGENTS.md §5: mỗi hàm NHẬN supabase client làm tham số, không bao giờ tự tạo
 * client bên trong. Nhờ vậy chính hàm này chạy được dưới client của user thật
 * trong bộ test RLS, dưới client của RSC trong layout, và dưới client
 * request-scoped của `middleware.ts` — cùng một truy vấn, ba ngữ cảnh.
 *
 * KHÔNG `select('*')`: liệt kê tường minh cột cần dùng (NFR-002).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

export type UserRole = Database['public']['Enums']['user_role'];

/** Tập cột tối thiểu mà tầng auth cần. Không kéo `phone`, `created_at`… */
export type SessionProfile = {
  id: string;
  full_name: string;
  email: string;
  employee_code: string | null;
  role: UserRole;
  is_active: boolean;
};

const SESSION_PROFILE_COLUMNS = 'id, full_name, email, employee_code, role, is_active';

/**
 * Hồ sơ của một user. Trả `null` khi không có dòng nào — bao gồm cả trường hợp
 * **RLS chặn**: `profiles_select_self_or_admin` cho 0 rows khi user hỏi hồ sơ
 * của người khác. Đó là hành vi mong muốn, không phải lỗi.
 */
export async function getSessionProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<SessionProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(SESSION_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    // NFR-014: chi tiết kỹ thuật chỉ ở log server.
    console.error('[getSessionProfile]', error.code, error.message);
    return null;
  }

  return data;
}

/* ===========================================================================
 * QUẢN LÝ TÀI KHOẢN SALES — UC-16, UC-18, UC-19 (PHASE 10)
 * ========================================================================= */

/** Hồ sơ Sales đầy đủ cho màn hình `/admin/sales/[id]` — FR-031. */
export type SalesProfile = AccountProfile;

const SALES_PROFILE_COLUMNS = 'id, full_name, email, phone, employee_code, role, is_active';

/**
 * Một hồ sơ Sales theo `id` — UC-18, FR-031.
 *
 * Không nhận vai của người gọi: policy `profiles_select_self_or_admin` quyết
 * định (Admin thấy tất cả, Sales chỉ thấy mình). `null` = không tồn tại **hoặc**
 * không có quyền, và tầng gọi phải `notFound()` cho cả hai (chống dò ID).
 */
export async function getSalesProfileById(
  supabase: SupabaseClient<Database>,
  salesId: string,
): Promise<SalesProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(SALES_PROFILE_COLUMNS)
    .eq('id', salesId)
    .eq('role', 'SALES')
    .maybeSingle<SalesProfile>();

  if (error) {
    console.error('[getSalesProfileById]', error.code, error.message);
    return null;
  }

  return data;
}

/** Đúng tập cột mà Admin được phép sửa trên hồ sơ Sales — UC-18, FR-031. */
export type SalesProfileWrite = {
  full_name: string;
  phone: string | null;
  employee_code: string | null;
};

export type ProfileWriteError = 'DUPLICATE_CODE' | 'REJECTED' | 'NOT_FOUND' | 'UNKNOWN';
export type ProfileWriteResult = { ok: true } | { ok: false; error: ProfileWriteError };

/** `23505` trên `uq_profiles_employee_code`. */
const PG_UNIQUE_VIOLATION = '23505';
/** `23514 check_violation` · `42501 insufficient_privilege`. */
const PG_REJECTED_CODES = new Set(['23514', '42501']);

/**
 * Sửa hồ sơ Sales — UC-18, FR-031.
 *
 * Dùng client **anon chịu RLS** (`lib/supabase/server.ts`), KHÔNG dùng service
 * role: policy `profiles_update_admin` mới là thứ cho phép, và trigger
 * `guard_profile_self_update()` là chốt chặn thứ hai chống tự nâng quyền
 * (DEC-005 — service role chỉ cho `auth.admin.*`).
 *
 * `role`, `is_active`, `email`, `id` **không** nằm trong payload nên không có
 * đường nào đổi chúng qua hàm này.
 */
export async function updateSalesProfile(
  supabase: SupabaseClient<Database>,
  salesId: string,
  values: SalesProfileWrite,
): Promise<ProfileWriteResult> {
  const { data, error } = await supabase
    .from('profiles')
    .update(values)
    .eq('id', salesId)
    .eq('role', 'SALES')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[updateSalesProfile]', error.code, error.message);

    if (error.code === PG_UNIQUE_VIOLATION) return { ok: false, error: 'DUPLICATE_CODE' };
    if (error.code && PG_REJECTED_CODES.has(error.code)) return { ok: false, error: 'REJECTED' };
    return { ok: false, error: 'UNKNOWN' };
  }

  // 0 dòng khớp: không phải Admin (RLS chặn), hoặc `id` không tồn tại.
  if (data === null) return { ok: false, error: 'NOT_FOUND' };

  return { ok: true };
}

/**
 * Bật/tắt `is_active` — UC-19, FR-032, BR-009.
 *
 * Tách khỏi `updateSalesProfile` vì đây là **hành động khác về nghiệp vụ**: nó
 * thu hồi quyền truy cập ngay lập tức, và gộp chung vào form sửa hồ sơ sẽ khiến
 * một cú bấm Lưu vô tình khoá tài khoản người khác.
 */
export async function setSalesActive(
  supabase: SupabaseClient<Database>,
  salesId: string,
  isActive: boolean,
): Promise<ProfileWriteResult> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', salesId)
    .eq('role', 'SALES')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[setSalesActive]', error.code, error.message);

    if (error.code && PG_REJECTED_CODES.has(error.code)) return { ok: false, error: 'REJECTED' };
    return { ok: false, error: 'UNKNOWN' };
  }

  if (data === null) return { ok: false, error: 'NOT_FOUND' };

  return { ok: true };
}

/** Một mục trong dropdown lọc theo Sales — FR-025 (Phase 9). */
export type SalesOption = {
  id: string;
  full_name: string;
  employee_code: string | null;
  is_active: boolean;
};

/**
 * Danh sách Sales cho bộ lọc của Admin — UC-13, FR-025.
 *
 * Trả về **cả người đã bị vô hiệu hoá**: Admin vẫn cần xem lại báo cáo cũ của
 * người đã nghỉ. Cờ `is_active` đi kèm để giao diện ghi chú, không phải để lọc
 * bỏ.
 *
 * Truy vấn bám `idx_profiles_role_active` (`role, is_active` where role='SALES').
 * Cố ý KHÔNG phân trang: số Sales của một đội nội bộ là hàng chục, và một
 * dropdown phân trang thì không dùng được. Nếu vượt 200 người thì phải đổi sang
 * ô tìm kiếm — ghi trong `docs/10-future-roadmap.md`.
 *
 * Rỗng khi người gọi không phải Admin: `profiles_select_self_or_admin` chỉ cho
 * Sales thấy hồ sơ của chính mình, mà chính mình thì không lọt bộ lọc `role`
 * nếu là Admin — và nếu là Sales thì họ chỉ thấy đúng một dòng của mình. RLS là
 * hàng rào, hàm này không tự kiểm vai.
 */
export async function listSalesOptions(
  supabase: SupabaseClient<Database>,
): Promise<SalesOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, employee_code, is_active')
    .eq('role', 'SALES')
    .order('is_active', { ascending: false })
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[listSalesOptions]', error.code, error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Hồ sơ ĐẦY ĐỦ cho màn hình tài khoản — FR-023, UC-11 (Phase 7).
 *
 * Rộng hơn `SessionProfile` đúng một cột (`phone`). Vì sao không gộp làm một:
 * `getSessionProfile()` chạy ở **mọi** request qua `requireProfile()`, còn cột
 * này chỉ hiện ở một màn hình. Giữ tập cột của đường nóng hẹp nhất có thể là
 * đúng tinh thần NFR-002.
 */
export type AccountProfile = SessionProfile & {
  phone: string | null;
};

const ACCOUNT_PROFILE_COLUMNS = `${SESSION_PROFILE_COLUMNS}, phone`;

/**
 * `null` khi không có dòng nào — gồm cả trường hợp RLS chặn. Với màn hình tài
 * khoản thì điều đó không xảy ra được (`profiles_select_self_or_admin` luôn cho
 * đọc hồ sơ của chính mình), nhưng tầng gọi vẫn phải xử lý.
 */
export async function getAccountProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AccountProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(ACCOUNT_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle<AccountProfile>();

  if (error) {
    console.error('[getAccountProfile]', error.code, error.message);
    return null;
  }

  return data;
}
