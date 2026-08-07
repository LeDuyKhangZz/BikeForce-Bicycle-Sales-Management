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
