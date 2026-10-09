'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Banknote,
  CalendarRange,
  FileText,
  History,
  Home,
  LayoutDashboard,
  MessagesSquare,
  Menu,
  ShieldCheck,
  ShoppingBag,
  ReceiptText,
  Scale,
  Target,
  User,
  Users,
  ContactRound,
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
 *  Danh sách chính được render **hai lần** với hai bộ class. Sidebar có thể nhận
 *  thêm module desktop qua `sidebarItems`; các mục này không chen vào bottom
 *  nav vốn đã chạm trần bề rộng 375px.
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
  SALES_CUSTOMERS: ContactRound,
  SALES_ACCOUNT: User,
  ADMIN_OVERVIEW: LayoutDashboard,
  ADMIN_REPORTS: FileText,
  ADMIN_RECONCILIATION: Scale,
  ADMIN_SALES: Users,
  ADMIN_TARGETS: Target,
  ADMIN_TRAVEL_EXPENSES: ReceiptText,
  ADMIN_SALARIES: Banknote,
  ADMIN_MONTHLY_SUMMARIES: CalendarRange,
  ADMIN_SALEWORK: MessagesSquare,
  ADMIN_ECOMMERCE: ShoppingBag,
  ADMIN_MISA_EMPLOYEES: Users,
  ADMIN_CUSTOMER_CARE: ShieldCheck,
  ADMIN_ACCOUNT: User,
};

type Props = {
  items: readonly NavItem[];
  /** Module bổ sung chỉ hiện trong sidebar desktop. */
  sidebarItems?: readonly NavItem[];
  /** Nhãn cho screen reader — "Điều hướng Sales" / "Điều hướng Admin". */
  label: string;
};

export function MainNav({ items, sidebarItems = [], label }: Props) {
  const pathname = usePathname();
  const activeKey = activeNavKey([...items, ...sidebarItems], pathname);
  const isAdmin = items.some((item) => item.key === 'ADMIN_OVERVIEW');
  const mobileItems = isAdmin
    ? items.filter((item) => item.key !== 'ADMIN_RECONCILIATION' && item.key !== 'ADMIN_ACCOUNT')
    : items;
  const moreItems = isAdmin
    ? [...items.filter((item) => item.key === 'ADMIN_RECONCILIATION'), ...sidebarItems, ...items.filter((item) => item.key === 'ADMIN_ACCOUNT')]
    : [];

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
          {mobileItems.map((item) => (
            <li key={item.key} className="flex-1">
              <NavLink item={item} isActive={item.key === activeKey} layout="tab" />
            </li>
          ))}
          {moreItems.length > 0 && <li className="flex-1"><AdminMoreMenu items={moreItems} activeKey={activeKey} /></li>}
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
        {sidebarItems.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
            {sidebarItems.map((item) => (
              <li key={item.key}>
                <NavLink item={item} isActive={item.key === activeKey} layout="sidebar" />
              </li>
            ))}
          </ul>
        )}
      </nav>
    </>
  );
}

function AdminMoreMenu({ items, activeKey }: { items: readonly NavItem[]; activeKey: NavKey | null }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const active = items.some((item) => item.key === activeKey);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="admin-more-navigation"
        aria-label="Thêm mục quản trị"
        onClick={() => setOpen((value) => !value)}
        className={cn('relative flex min-h-14 w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', active && 'font-semibold text-primary')}
      >
        {active && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-1 rounded-b-pill bg-primary" />}
        <Menu aria-hidden="true" className="size-5" />
        <span>Thêm</span>
      </button>
      {open && (
        <div id="admin-more-navigation" className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 max-h-[60dvh] overflow-y-auto rounded-xl border border-input-border bg-card p-2 shadow-lg" role="group" aria-label="Các mục quản trị khác">
          <p className="px-3 py-2 text-sm font-semibold text-heading">Các mục quản trị</p>
          <ul className="grid grid-cols-2 gap-1">
            {items.map((item) => {
              const Icon = NAV_ICON[item.key];
              return (
                <li key={item.key}>
                  <Link href={item.href} onClick={() => setOpen(false)} aria-current={item.key === activeKey ? 'page' : undefined} className={cn('flex min-h-12 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', item.key === activeKey ? 'bg-status-info-bg text-status-info-fg' : 'text-foreground hover:bg-background')}>
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
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
