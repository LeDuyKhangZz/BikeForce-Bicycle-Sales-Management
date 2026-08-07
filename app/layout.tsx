import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

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

export const metadata: Metadata = {
  title: 'BikeForce',
  description: 'Báo cáo hiệu suất bán hàng theo ngày cho đội Sales xe đạp.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // KHÔNG BAO GIỜ disable zoom (AGENTS.md §10 — a11y).
  // Không set maximumScale/userScalable để người dùng luôn phóng to được.
  themeColor: '#1e40af',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={inter.variable}>
      {/* min-h-dvh thay 100vh — thanh địa chỉ mobile làm 100vh sai (rule viewport-units). */}
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
