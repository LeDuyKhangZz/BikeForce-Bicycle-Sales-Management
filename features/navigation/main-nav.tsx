'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  History,
  Home,
  LayoutDashboard,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { activeNavKey, type NavItem, type NavKey } from '@/lib/navigation/nav-items';

/**
 * Điều hướng chính — DEC-018, `docs/05 §10`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  MỘT COMPONENT, HAI HÌNH DẠNG, KHÔNG BAO GIỜ HIỆN CÙNG LÚC
 * ─────────────────────────────────────────────────────────────────────────
 *  < 1024px → bottom tab bar cố định. ≥ 1024px → sidebar trái cố định.
 *  Chuyển đổi bằng `lg:` của Tailwind chứ không bằng JavaScript đo bề rộng:
 *  đo ở client gây nhảy layout ở lần render đầu, và server không biết bề rộng
 *  màn hình nên sẽ luôn đoán sai một nửa số lần.
 *
 *  Cùng một danh sách mục được render **hai lần** với hai bộ class. Đó là chủ
 *  ý: hai `<nav>` với `aria-label` khác nhau, mỗi cái ẩn ở bề rộng còn lại, đọc
 *  rõ ràng hơn hẳn một cây DOM tự bẻ mình bằng CSS phức tạp.
 *
 * `'use client'` chỉ vì `usePathname()` — không có state, không có effect. Toàn
 * bộ quyết định "tab nào sáng" nằm ở `lib/navigation/nav-items.ts` và có unit
 * test riêng (AGENTS.md §1.3).
 */

/**
 * Ánh xạ `NavKey` → icon Lucide. Ở TẦNG COMPONENT chứ không ở `lib/`: icon là
 * trình bày, và `lib/` không được biết gì về React (AGENTS.md §1.2).
 * Emoji bị cấm làm icon (rule `no-emoji-icons`).
 */
const NAV_ICON: Record<NavKey, LucideIcon> = {
  SALES_TODAY: Home,
  SALES_HISTORY: History,
  SALES_ACCOUNT: User,
  ADMIN_OVERVIEW: LayoutDashboard,
  ADMIN_REPORTS: FileText,
  ADMIN_SALES: Users,
  ADMIN_ACCOUNT: User,
};

type Props = {
  items: readonly NavItem[];
  /** Nhãn cho screen reader — "Điều hướng Sales" / "Điều hướng Admin". */
  label: string;
};

export function MainNav({ items, label }: Props) {
  const pathname = usePathname();
  const activeKey = activeNavKey(items, pathname);

  return (
    <>
      {/* ── < 1024px: bottom tab bar ─────────────────────────────────────── */}
      <nav
        aria-label={label}
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card lg:hidden',
          // Vùng cử chỉ của iOS/Android nằm dưới đáy màn hình thật — không trừ
          // ra thì mục cuối bị hệ điều hành nuốt mất phần chạm.
          'pb-[env(safe-area-inset-bottom)]',
        )}
      >
        <ul className="mx-auto flex w-full max-w-3xl">
          {items.map((item) => (
            <li key={item.key} className="flex-1">
              <NavLink item={item} isActive={item.key === activeKey} layout="tab" />
            </li>
          ))}
        </ul>
      </nav>

      {/* ── ≥ 1024px: sidebar trái cố định ───────────────────────────────── */}
      <nav
        aria-label={label}
        className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-border bg-card px-3 py-6 lg:block"
      >
        <p className="px-3 pb-4 text-sm font-semibold tracking-tight text-heading">BikeForce</p>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.key}>
              <NavLink item={item} isActive={item.key === activeKey} layout="sidebar" />
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

type NavLinkProps = {
  item: NavItem;
  isActive: boolean;
  layout: 'tab' | 'sidebar';
};

/**
 * Một mục điều hướng. Không export — chỉ dùng nội bộ file này (AGENTS.md §4).
 *
 * Trạng thái active **không bao giờ chỉ bằng màu** (rule `color-not-only`):
 * ngoài màu còn có `aria-current="page"` cho screen reader, chữ đậm hơn, và ở
 * sidebar là cả một mảng nền. Icon luôn đi kèm chữ (DEC-018).
 */
function NavLink({ item, isActive, layout }: NavLinkProps) {
  const Icon = NAV_ICON[item.key];

  return (
    <Link
      href={item.href}
      // Chỉ đặt khi thật sự đang ở trang đó — `aria-current="false"` là một
      // giá trị hợp lệ nhưng nhiều screen reader vẫn đọc thành "current".
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2 rounded-lg font-medium transition-colors duration-150',
        // 44px là sàn tuyệt đối của vùng chạm (rule touch-target-size).
        layout === 'tab'
          ? 'min-h-14 flex-col justify-center gap-1 px-2 py-2 text-xs'
          : 'min-h-11 px-3 py-2 text-sm',
        isActive ? 'text-primary' : 'text-muted-foreground',
        layout === 'sidebar' && isActive && 'bg-status-info-bg',
        layout === 'sidebar' && !isActive && 'hover:bg-background',
      )}
    >
      <Icon aria-hidden="true" className={layout === 'tab' ? 'size-5' : 'size-4'} />
      <span className={cn(isActive && 'font-semibold')}>{item.label}</span>
    </Link>
  );
}
