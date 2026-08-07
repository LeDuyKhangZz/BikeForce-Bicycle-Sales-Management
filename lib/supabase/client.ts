import { createBrowserClient } from '@supabase/ssr';

import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Supabase client SỐ 1 — trình duyệt, anon key, CHỊU RLS.
 *
 * Chỉ dùng cho thao tác auth phía client theo mô hình `@supabase/ssr`
 * (đồng bộ trạng thái phiên sau khi session đổi). Realtime KHÔNG dùng ở v1.
 *
 * CẤM (docs/04 §4): mọi truy vấn `daily_reports`, mọi truy vấn danh sách,
 * mọi tính toán KPI, mọi thao tác quản trị. Đường dữ liệu chính của hệ thống
 * là `lib/supabase/server.ts`.
 */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
