import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Supabase client SỐ 3 — service role key, **BYPASS TOÀN BỘ RLS**.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ĐỌC KỸ TRƯỚC KHI DÙNG — DEC-005, docs/04 §4.1
 * ─────────────────────────────────────────────────────────────────────────
 * Client này CHỈ để gọi `auth.admin.*`:
 *   • `auth.admin.createUser`       — UC-17 tạo tài khoản Sales (FR-030)
 *   • `auth.admin.updateUserById`   — UC-18 đổi email / reset mật khẩu
 *
 * Nó **KHÔNG BAO GIỜ** chạm vào `daily_reports` — không đọc, không ghi, không
 * đếm, không aggregate, không export, không render ảnh. Không có ngoại lệ ở v1.
 *
 * Lý do: service role key bypass hoàn toàn RLS. Mỗi lần nó chạm vào bảng
 * nghiệp vụ là một lần nguyên tắc "RLS là biên giới bảo mật thật" (DEC-004)
 * bị vô hiệu hoá, và mọi bug logic quyền lập tức thành lỗ rò dữ liệu toàn
 * hệ thống.
 *
 * Những việc TƯỞNG là cần client này nhưng KHÔNG phải — tất cả dùng client
 * số 2 (`lib/supabase/server.ts`) dưới policy `profiles_update_admin` /
 * `reports_select_own_or_admin`:
 *   • UC-18 sửa `full_name` / `phone` / `employee_code`
 *   • UC-19 bật/tắt `is_active`
 *   • Toàn bộ Admin dashboard, danh sách báo cáo, analytics (FR-024→FR-029)
 *
 * `import 'server-only'` ở dòng đầu khiến build FAIL nếu file này bị kéo vào
 * client bundle — chốt chặn compile-time của NFR-005, không phải chờ runtime.
 *
 * Code review phải FAIL nếu thấy import file này ngoài
 * `features/admin-sales-management/`.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      // Client này không có người dùng và không có cookie — không tự refresh,
      // không lưu session vào bất kỳ storage nào.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
