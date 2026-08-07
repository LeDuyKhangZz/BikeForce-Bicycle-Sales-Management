/**
 * Đọc biến môi trường một cách an toàn về kiểu.
 *
 * Vì sao là HÀM chứ không phải hằng số ở module scope: nếu validate ngay khi
 * import, `next build` sẽ vỡ trên máy/CI chưa có `.env.local`. Validate lúc
 * GỌI nghĩa là build luôn chạy được, còn lỗi thiếu config thì nổ ngay lần đầu
 * tạo Supabase client kèm thông báo rõ ràng.
 *
 * Lưu ý kỹ thuật: chuỗi `process.env.NEXT_PUBLIC_*` phải được viết TƯỜNG MINH
 * (không truy cập động bằng `process.env[name]`) thì Next.js mới thay thế được
 * giá trị lúc build cho client bundle.
 *
 * AGENTS.md §8: chỉ 3 biến `NEXT_PUBLIC_*` là public-safe. `SUPABASE_SERVICE_ROLE_KEY`
 * KHÔNG BAO GIỜ mang prefix `NEXT_PUBLIC_`.
 */

function required(value: string | undefined, name: string): string {
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Thiếu biến môi trường "${name}". Sao chép ".env.example" thành ".env.local" và điền giá trị thật.`,
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseAnonKey(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * CHỈ được gọi từ `lib/supabase/admin.ts` (file đó có `import 'server-only'`).
 * Không bao giờ gọi từ code chạy phía client — DEC-005.
 */
export function getSupabaseServiceRoleKey(): string {
  return required(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}
