'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  History,
  Home,
  LayoutDashboard,
  Scale,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { BrandLockup } from '@/components/ui/brand-mark';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
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
  SALES_RECONCILIATION: Scale,
  SALES_ACCOUNT: User,
  ADMIN_OVERVIEW: LayoutDashboard,
  ADMIN_REPORTS: FileText,
  ADMIN_RECONCILIATION: Scale,
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
          'fixed inset-x-0 bottom-0 z-40 border-t border-border/70 lg:hidden',
          // PHASE 13 (DEC-053) — kính mờ + bóng hắt LÊN. Thanh nav đục hoàn toàn
          // cắt trang thành hai mảnh rời; nền mờ giữ cảm giác nội dung chạy tiếp
          // xuống dưới nó. `supports-` để trình duyệt không hỗ trợ vẫn có nền đặc
          // — KHÔNG bao giờ để chữ nằm trên nền trong suốt.
          'bg-card/85 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] supports-backdrop-filter:backdrop-blur-lg',
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
        <BrandLockup className="px-3 pb-4" />
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
        'relative flex items-center gap-2 rounded-md font-medium',
        'transition-[color,background-color,transform] duration-200 ease-out-soft',
        'active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none',
        // 44px là sàn tuyệt đối của vùng chạm (rule touch-target-size).
        layout === 'tab'
          ? 'min-h-14 flex-col justify-center gap-1 px-2 py-2 text-xs'
          : 'min-h-11 px-3 py-2 text-sm',
        /*
         * ⚠ Mục đang sáng ở SIDEBAR phải dùng ĐÚNG CẶP `status-info-bg` +
         * `status-info-fg` (7,99:1), KHÔNG được ghép `text-primary` lên
         * `bg-status-info-bg`.
         *
         * Đó là hai token thuộc hai cặp khác nhau, và phép ghép chéo ấy chỉ
         * "may mà đạt" với bảng màu chàm cũ. Sau DEC-046 nó đo được **4,32:1**
         * — thiếu 0,18 so với AA — và làm đỏ 9 lượt quét axe ở `desktop-1440`
         * (bottom tab của mobile không dính vì nó không có nền).
         *
         * Ở dạng tab (không có nền) thì `text-primary` trên card là 5,04:1, đạt.
         */
        isActive && layout === 'sidebar' && 'bg-status-info-bg text-status-info-fg',
        isActive && layout === 'tab' && 'text-primary',
        !isActive && 'text-muted-foreground',
        layout === 'sidebar' && !isActive && 'hover:bg-background',
      )}
    >
      {/*
        PHASE 13 (DEC-053) — GẠCH CHỈ BÁO ở cạnh trên của tab đang mở.

        Trạng thái active của bottom nav trước đây chỉ đổi màu chữ; ở bề rộng
        375px với ba mục màu xám giống nhau, mắt phải dừng lại mới nhận ra mình
        đang ở đâu. Một gạch ngắn phía trên là chỉ báo mà mọi app điện thoại đều
        dùng, và nó thoả `nav-state-active` bằng HÌNH DẠNG chứ không thêm một
        cách hiểu-bằng-màu nào nữa (rule `color-not-only`).
      */}
      {isActive && layout === 'tab' && (
        <span
          aria-hidden="true"
          className="absolute inset-x-4 top-0 h-1 rounded-b-pill bg-primary"
        />
      )}
      <LinkPendingIcon
        label={`Đang mở ${item.label}…`}
        className={layout === 'tab' ? 'size-5' : 'size-4'}
      >
        <Icon
          aria-hidden="true"
          className={cn(layout === 'tab' ? 'size-5' : 'size-4', isActive && 'scale-110')}
        />
      </LinkPendingIcon>
      <span className={cn(isActive && 'font-semibold')}>{item.label}</span>
    </Link>
  );
}
