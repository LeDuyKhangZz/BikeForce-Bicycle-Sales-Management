import type { ReactNode } from 'react';

import { BrandMark } from '@/components/ui/brand-mark';
import { MainNav } from '@/features/navigation/main-nav';
import { HeaderSignOut } from '@/features/auth/header-sign-out';
import { requireRole } from '@/features/auth/queries';
import { SALES_NAV_ITEMS } from '@/lib/navigation/nav-items';

/**
 * LỚP 2 — guard server-side cho toàn bộ route group `(sales)` (FR-004, DEC-004).
 *
 * Không tin middleware đã chặn: layout là nơi ĐỌC dữ liệu cho cả group, nên nếu
 * role sai mà layout vẫn render thì dữ liệu đã lộ trước khi RLS kịp chặn ở query
 * con (`docs/06 §5.3`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 7 — điều hướng chính (DEC-018)
 * ─────────────────────────────────────────────────────────────────────────
 *  `MainNav` là bottom tab 3 mục ở < 1024px và sidebar trái từ 1024px, không
 *  bao giờ hiện cả hai. Vì vậy phần thân phải chừa chỗ theo đúng hai chiều:
 *    • `pb-24` — bottom nav cao ~56px cộng `safe-area-inset-bottom`, không chừa
 *      thì dòng cuối của danh sách bị che (rule `fixed-element-offset`).
 *    • `lg:pl-56` — đúng bề rộng sidebar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 13 — Đăng xuất quay lại header (nhóm A)
 * ─────────────────────────────────────────────────────────────────────────
 *  Trước đây nút này CỐ Ý chỉ nằm ở `/sales/account`. Người dùng yêu cầu có nó ở
 *  góc trên bên phải, nên ghi chú cũ đã được gỡ để tài liệu không mâu thuẫn code.
 *  Vấn đề bề rộng 375px nêu trong ghi chú cũ vẫn được giải quyết tử tế — cách
 *  giải nằm ở `features/auth/header-sign-out.tsx`. Bản ở `/sales/account` GIỮ
 *  NGUYÊN: đó là nơi người dùng đã quen tìm, và nó không tốn gì.
 *
 *  `relative` trên `<header>` là bắt buộc: panel xác nhận định vị `absolute
 *  top-full` theo chính thanh header này.
 */
export default async function SalesLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole('SALES');

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:pl-56">
      <header className="relative border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          {/* Chỉ hiện dưới 1024px: từ 1024px trở lên sidebar đã mang logo đầy đủ,
              để cả hai là gắn thương hiệu hai lần trên cùng một khung nhìn. */}
          <BrandMark decorative className="w-9 shrink-0 text-accent lg:hidden" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">BikeForce · Sales</p>
            <p className="truncate text-base font-semibold text-heading">{profile.full_name}</p>
          </div>
          <HeaderSignOut />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24">{children}</main>

      <MainNav items={SALES_NAV_ITEMS} label="Điều hướng Sales" />
    </div>
  );
}
