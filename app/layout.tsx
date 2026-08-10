import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { APP_DESCRIPTION, APP_SHORT_NAME, THEME_COLOR } from '@/lib/pwa/manifest';

import './globals.css';

/**
 * DEC-013 — chỉ MỘT họ font.
 * `subsets: ['latin', 'vietnamese']` là BẮT BUỘC: toàn bộ giao diện là tiếng
 * Việt, thiếu subset `vietnamese` thì chữ có dấu rơi về font fallback.
 * `display: 'swap'` để tránh FOIT trên mạng 4G ngoài thị trường.
 */
const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Tên và mô tả đọc từ `lib/pwa/manifest.ts` để tab trình duyệt, hộp thoại cài
 * đặt PWA và icon màn hình chính không bao giờ nói ba cái tên khác nhau (FR-036).
 *
 * Icon lấy theo quy ước file của Next, không khai trong `metadata.icons`:
 *   app/favicon.ico   → <link rel="icon" sizes="32x32">
 *   app/icon.svg      → <link rel="icon" type="image/svg+xml">  (nguồn vector)
 *   app/apple-icon.png→ <link rel="apple-touch-icon">           (iOS BỎ QUA
 *                        manifest khi Add to Home Screen — thiếu file này thì
 *                        iOS tự chụp màn hình trang làm icon)
 * Bốn icon còn lại của manifest nằm ở `public/icons/`.
 */
export const metadata: Metadata = {
  title: APP_SHORT_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_SHORT_NAME,
  appleWebApp: {
    // Tương đương `display: 'standalone'` của manifest, dành riêng cho iOS
    // Safari — nó không đọc manifest (DEC-024, `docs/05 §15`).
    capable: true,
    title: APP_SHORT_NAME,
    statusBarStyle: 'default',
  },
};

/**
 * ⚡ VÙNG CHẠY CỦA SERVERLESS FUNCTION — ISSUE-019, đo thật trên production.
 *
 * Database Supabase nằm ở `ap-southeast-1` (Singapore). Mặc định Vercel chạy
 * function ở `iad1` (Washington DC), nên **mỗi** lượt gọi database phải đi vòng
 * nửa vòng trái đất. Đo được ngày 2026-08-10: request không chạm DB mất ~0,23s,
 * `/login` với ĐÚNG MỘT lần `getUser()` mất ~0,46s ⇒ **~230 ms cho mỗi lượt**.
 *
 * Đặt ở đây thay vì bấm trên Vercel Dashboard vì: cấu hình đi theo repo, mọi
 * môi trường (production/preview) đều giống nhau, và người sau đọc code là biết
 * — chứ không phải một ô chọn giấu trong Settings mà không ai nhớ đã đổi.
 *
 * ⚠ Route segment config **không lan xuống Route Handler**, nên hai file
 * `route.ts` / `route.tsx` dưới `app/api/` phải tự khai lại dòng này.
 *
 * Kiểm chứng: `curl -sD - -o /dev/null <url>/login | grep -i x-vercel-id` —
 * header có dạng `<edge>::<function>::<id>`, phần **giữa** phải là `sin1`.
 */
export const preferredRegion = 'sin1';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // KHÔNG BAO GIỜ disable zoom (AGENTS.md §10 — a11y).
  // Không set maximumScale/userScalable để người dùng luôn phóng to được.
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={inter.variable}>
      {/* min-h-dvh thay 100vh — thanh địa chỉ mobile làm 100vh sai (rule viewport-units). */}
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
