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
