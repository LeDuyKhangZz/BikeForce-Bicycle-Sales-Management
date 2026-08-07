import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { LOGIN_REASONS } from '@/lib/auth/messages';
import {
  LOGIN_PATH,
  dashboardPathFor,
  isPublicPath,
  requiredRoleForPath,
  sanitizeNextPath,
} from '@/lib/auth/routes';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import { getSessionProfile } from '@/services/profiles';
import type { Database } from '@/types/database.types';

/**
 * LỚP 1 của mô hình 4 lớp (`docs/06-auth-permissions.md §5.2`).
 *
 * ⚠ ĐÂY KHÔNG PHẢI BIÊN GIỚI BẢO MẬT (DEC-004). Bất kỳ ai cũng có thể bỏ qua
 * toàn bộ Next.js và gọi thẳng PostgREST bằng anon key từ DevTools — lúc đó
 * middleware không nằm trong đường đi. **Chỉ RLS còn đứng đó.** Middleware tồn
 * tại để (a) refresh cookie phiên, (b) trải nghiệm đúng, (c) phòng thủ nhiều lớp.
 *
 * VÌ SAO CLIENT SUPABASE ĐƯỢC TẠO NGAY TRONG FILE NÀY thay vì dùng
 * `lib/supabase/server.ts`: client của server dùng `cookies()` từ `next/headers`,
 * thứ KHÔNG tồn tại trong ngữ cảnh middleware. Middleware phải đọc cookie từ
 * `request` và ghi cookie mới vào `response` — hai đối tượng chỉ có ở đây.
 * Đây là ngoại lệ DUY NHẤT của quy tắc "chỉ 3 file tạo client" (AGENTS.md §6),
 * và nó vẫn dùng **anon key**, vẫn chịu RLS.
 */

/** Tài nguyên tĩnh — không cần phiên, không cần refresh cookie. */
const PUBLIC_FILE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|woff|woff2|ttf|otf|txt|xml|json)$/i;

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_FILE.test(pathname)) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // ⚠ TUYỆT ĐỐI KHÔNG CHÈN CODE VÀO GIỮA `createServerClient` VÀ `getUser()`.
  // Đây là lỗi kinh điển số 1 của `@supabase/ssr`: chèn vào giữa làm phiên bị
  // mất ngẫu nhiên và người dùng bị đăng xuất bất chợt, log không có lỗi gì
  // (`docs/06 §5.2`). Chính lời gọi `getUser()` này là cơ chế **silent refresh**.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---- Chưa đăng nhập -------------------------------------------------------
  if (!user) {
    if (isPublicPath(pathname)) return response;

    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = '';
    const nextPath = sanitizeNextPath(`${pathname}${search}`);
    if (nextPath) url.searchParams.set('next', nextPath);
    return redirectPreservingCookies(url, response);
  }

  // ---- Đã đăng nhập ---------------------------------------------------------
  const profile = await getSessionProfile(supabase, user.id);

  // Hồ sơ mất hoặc bị vô hiệu hoá (BR-009). `signOut()` ở đây thu hồi phiên
  // phía GoTrue; cookie bị xoá qua chính `setAll` ở trên.
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = '';
    url.searchParams.set('reason', LOGIN_REASONS.DEACTIVATED);
    return redirectPreservingCookies(url, response);
  }

  const home = dashboardPathFor(profile.role);

  // Đã có phiên hợp lệ mà vẫn vào /login hoặc / ⇒ về thẳng dashboard đúng vai.
  if (pathname === LOGIN_PATH || pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = '';
    return redirectPreservingCookies(url, response);
  }

  // Sai vai ⇒ đưa về dashboard của chính vai đó. KHÔNG trả 403 — 403 xác nhận
  // route kia có tồn tại (`docs/06 §5.2` mục 6).
  const requiredRole = requiredRoleForPath(pathname);
  if (requiredRole !== null && requiredRole !== profile.role) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = '';
    return redirectPreservingCookies(url, response);
  }

  // ⚠ Phải trả về ĐÚNG object `response` mà thư viện đã ghi cookie vào. Tạo một
  // `NextResponse` mới rồi trả về sẽ làm mất cookie vừa refresh ⇒ vòng lặp
  // refresh vô hạn (`docs/06 §5.2`).
  return response;
}

/**
 * Redirect mà **giữ nguyên cookie phiên vừa được refresh**. Bỏ bước copy này
 * là làm hỏng silent refresh đúng vào lúc người dùng bị điều hướng.
 */
function redirectPreservingCookies(url: URL, source: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

export const config = {
  /**
   * Bao phủ mọi route thật, kể cả `/api/*` — route handler xuất ảnh 9:16 cũng
   * cần được refresh cookie (`docs/06 §5.2`). Chỉ loại trừ asset build-time của
   * Next.js; asset tĩnh khác đã được `PUBLIC_FILE` lọc bên trong hàm.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
