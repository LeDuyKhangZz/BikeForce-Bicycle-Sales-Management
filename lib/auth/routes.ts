/**
 * Bản đồ route ↔ role, dưới dạng HÀM THUẦN (không I/O, không Supabase).
 *
 * Đặt ở `lib/` để `middleware.ts`, layout của route group và Server Action đều
 * dùng chung MỘT nguồn — không nơi nào tự viết lại `pathname.startsWith('/admin')`.
 * Vì thuần tuý nên unit test được không cần database (AGENTS.md §1.2: `lib/`
 * chỉ import `types/`).
 *
 * Nguồn: `docs/06-auth-permissions.md §5.2` (bảng route protection), DEC-017
 * (route là `/login`, KHÔNG phải `/auth/login`).
 */
import type { Database } from '@/types/database.types';

export type UserRole = Database['public']['Enums']['user_role'];

export const LOGIN_PATH = '/login';
export const SALES_HOME = '/sales/today';
export const ADMIN_HOME = '/admin';

const SALES_PREFIX = '/sales';
const ADMIN_PREFIX = '/admin';

/** Route vào được khi CHƯA đăng nhập. */
const PUBLIC_PATHS: readonly string[] = [LOGIN_PATH];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

const API_PREFIX = '/api';

/**
 * Route trả **dữ liệu**, không trả trang — hiện chỉ có
 * `GET /api/reports/[id]/share-image` (DEC-003).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO MIDDLEWARE PHẢI PHÂN BIỆT — ISSUE-015, phát hiện ở Phase 6
 * ─────────────────────────────────────────────────────────────────────────
 *  Với một trang, "chưa đăng nhập" → redirect `/login` là đúng. Với một route
 *  API thì SAI: `fetch()` **tự đi theo redirect**, nên client nhận HTML của
 *  trang đăng nhập kèm `status = 200` và `response.ok === true`. Nút "Xuất ảnh"
 *  sẽ vui vẻ lưu trang HTML đó thành một file `.png` hỏng.
 *
 *  Route API vì vậy phải nhận đúng mã trạng thái (`401`/`403`) như `docs/07 §4.1`
 *  quy định, để client phân nhánh được.
 */
export function isApiPath(pathname: string): boolean {
  return pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`);
}
const SELF_AUTHENTICATED_API_PATHS: readonly string[] = ['/api/salework/report-image'];

export function isSelfAuthenticatedApiPath(pathname: string): boolean {
  return SELF_AUTHENTICATED_API_PATHS.includes(pathname);
}
/** Sau khi đăng nhập, mỗi role về đúng dashboard của mình. */
export function dashboardPathFor(role: UserRole): string {
  return role === 'ADMIN' ? ADMIN_HOME : SALES_HOME;
}

/**
 * Role bắt buộc để vào một pathname, hoặc `null` nếu route chỉ cần "đã đăng
 * nhập" mà không phân biệt vai.
 *
 * `null` là câu trả lời ĐÚNG cho `/api/reports/[id]/share-image`: cả Sales chủ
 * báo cáo lẫn Admin đều được gọi (BR-022), và quyền trên từng `id` do **RLS**
 * quyết định chứ không phải middleware — middleware không biết báo cáo đó của ai
 * (`docs/06 §5.2`).
 */
export function requiredRoleForPath(pathname: string): UserRole | null {
  if (pathname === SALES_PREFIX || pathname.startsWith(`${SALES_PREFIX}/`)) return 'SALES';
  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) return 'ADMIN';
  return null;
}

/**
 * Ký tự điều khiển C0 (`U+0000`–`U+001F`) và DEL (`U+007F`) — nguyên liệu của
 * đòn chẻ header (CR/LF injection).
 *
 * Kiểm bằng mã ký tự thay vì regex có ký tự điều khiển viết thẳng trong nguồn:
 * ký tự vô hình trong file nguồn là thứ không ai đọc review được, và dễ bị công
 * cụ định dạng làm hỏng.
 */
function hasControlChar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Làm sạch tham số `?next=` trước khi redirect — chống **open redirect**
 * (`docs/06 §3.1` quy tắc 5).
 *
 * Chỉ chấp nhận đường dẫn NỘI BỘ: bắt đầu bằng đúng một dấu `/`, không phải
 * `//host` hay `/\host` (trình duyệt hiểu cả hai là URL tuyệt đối), không chứa
 * ký tự điều khiển. Trả `null` khi không hợp lệ ⇒ nơi gọi dùng dashboard mặc định.
 */
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (hasControlChar(raw)) return null;
  if (raw === LOGIN_PATH || raw.startsWith(`${LOGIN_PATH}?`)) return null;
  return raw;
}
