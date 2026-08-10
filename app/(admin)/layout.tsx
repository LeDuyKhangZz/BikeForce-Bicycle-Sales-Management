import type { ReactNode } from 'react';

import { BrandMark } from '@/components/ui/brand-mark';
import { MainNav } from '@/features/navigation/main-nav';
import { HeaderSignOut } from '@/features/auth/header-sign-out';
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
 *  PHASE 13 — nút Đăng xuất quay lại header, cùng lý do và cùng cách giải bề
 *  rộng 375px như group `(sales)`; xem `features/auth/header-sign-out.tsx`.
 *  Bản ở `/admin/account` giữ nguyên.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole('ADMIN');

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:pl-56">
      {/* Header dính trên + kính mờ — xem giải thích ở `app/(sales)/layout.tsx`. */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/85 shadow-xs supports-backdrop-filter:backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5">
          {/* Xem ghi chú ở `app/(sales)/layout.tsx` — ẩn từ 1024px vì sidebar
              đã mang logo đầy đủ. */}
          <BrandMark decorative className="w-10 shrink-0 text-accent lg:hidden" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              BikeForce · Quản trị
            </p>
            <p className="truncate text-base font-semibold tracking-tight text-heading">
              {profile.full_name}
            </p>
          </div>
          <HeaderSignOut />
        </div>
      </header>

      {/* `pb-28` chừa chỗ cho bottom nav (rule fixed-element-offset). */}
      <main className="mx-auto w-full max-w-5xl flex-1 animate-rise-in px-4 py-5 pb-28">
        {children}
      </main>

      <MainNav items={ADMIN_NAV_ITEMS} label="Điều hướng Quản trị" />
    </div>
  );
}
