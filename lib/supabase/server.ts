import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Supabase client SỐ 2 — server, anon key + cookies(), CHỊU RLS.
 *
 * **Đây là đường dữ liệu chính của toàn hệ thống** (docs/04 §4): đọc trong
 * React Server Component, ghi trong Server Action, đọc báo cáo trong Route
 * Handler render ảnh 9:16.
 *
 * Vì client này mang cookie phiên của user nên `auth.uid()` có giá trị đúng
 * và mọi câu lệnh đều bị RLS lọc — DEC-004 (RLS là biên giới bảo mật thật).
 *
 * CẤM: import vào Client Component; dùng service role key; bỏ `cookies()`
 * (mất ngữ cảnh user, RLS sẽ chạy như `anon`).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Được gọi từ Server Component — Next.js không cho ghi cookie ở đó.
          // Bỏ qua an toàn: `middleware.ts` mới là nơi refresh session cookie.
        }
      },
    },
  });
}
