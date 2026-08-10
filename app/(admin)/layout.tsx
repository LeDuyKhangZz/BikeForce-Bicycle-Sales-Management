import type { ReactNode } from 'react';

import { BrandMark } from '@/components/ui/brand-mark';
import { MainNav } from '@/features/navigation/main-nav';
import { requireRole } from '@/features/auth/queries';
import { ADMIN_NAV_ITEMS } from '@/lib/navigation/nav-items';

/**
 * LỚP 2 — guard server-side cho toàn bộ route group `(admin)` (FR-004, DEC-004).
 * Xem giải thích đầy đủ ở `app/(sales)/layout.tsx`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 8 — điều hướng chính (DEC-018)
 * ─────────────────────────────────────────────────────────────────────────
 *  Bottom nav **4 mục** ở < 1024px, sidebar trái từ 1024px, không bao giờ hiện
 *  cả hai. Cùng một `MainNav` với group `(sales)` — chỉ khác danh sách mục.
 *
 *  Nút Đăng xuất đã chuyển sang `/admin/account` (UC-11), giống hệt cách
 *  `/sales/account` làm ở Phase 7: có tab Tài khoản rồi thì một nút đăng xuất
 *  thứ hai ở header chỉ chiếm chỗ.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole('ADMIN');

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:pl-56">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          {/* Xem ghi chú ở `app/(sales)/layout.tsx` — ẩn từ 1024px vì sidebar
              đã mang logo đầy đủ. */}
          <BrandMark decorative className="w-9 text-accent lg:hidden" />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">BikeForce · Quản trị</p>
            <p className="truncate text-base font-semibold text-heading">{profile.full_name}</p>
          </div>
        </div>
      </header>

      {/* `pb-24` chừa chỗ cho bottom nav (rule fixed-element-offset). */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24">{children}</main>

      <MainNav items={ADMIN_NAV_ITEMS} label="Điều hướng Quản trị" />
    </div>
  );
}
