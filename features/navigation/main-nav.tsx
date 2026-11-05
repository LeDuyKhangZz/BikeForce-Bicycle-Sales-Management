'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Banknote,
  Boxes,
  CalendarRange,
  ClipboardList,
  ContactRound,
  FileText,
  History,
  Home,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  ReceiptText,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Store,
  Target,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { BrandLockup } from '@/components/ui/brand-mark';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import {
  activeNavKey,
  ADMIN_SIDEBAR_SECTIONS,
  type NavItem,
  type NavKey,
} from '@/lib/navigation/nav-items';
import { cn } from '@/lib/utils';

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
  ADMIN_HATDE: Store,
  ADMIN_ORDERS: ClipboardList,
  ADMIN_INVENTORY: Boxes,
  ADMIN_MISA_EMPLOYEES: Users,
  ADMIN_CUSTOMER_CARE: ShieldCheck,
  ADMIN_ACCOUNT: User,
};

type Props = {
  items: readonly NavItem[];
  sidebarItems?: readonly NavItem[];
  label: string;
};

export function MainNav({ items, sidebarItems = [], label }: Props) {
  const pathname = usePathname();
  const allItems = [...items, ...sidebarItems];
  const activeKey = activeNavKey(allItems, pathname);
  const isAdmin = items.some((item) => item.key === 'ADMIN_OVERVIEW');
  const mobileItems = isAdmin
    ? items.filter((item) => item.key !== 'ADMIN_RECONCILIATION' && item.key !== 'ADMIN_ACCOUNT')
    : items;
  const moreItems = isAdmin
    ? [
        ...items.filter((item) => item.key === 'ADMIN_RECONCILIATION'),
        ...sidebarItems,
        ...items.filter((item) => item.key === 'ADMIN_ACCOUNT'),
      ]
    : [];
  const itemByKey = new Map<NavKey, NavItem>(allItems.map((item) => [item.key, item]));

  return (
    <>
      <nav
        aria-label={label}
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-border/70 lg:hidden',
          'bg-card/85 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] supports-backdrop-filter:backdrop-blur-lg',
          'pb-[env(safe-area-inset-bottom)]',
        )}
      >
        <ul className="mx-auto flex w-full max-w-3xl">
          {mobileItems.map((item) => (
            <li key={item.key} className="min-w-0 flex-1">
              <NavLink item={item} isActive={item.key === activeKey} layout="tab" />
            </li>
          ))}
          {moreItems.length > 0 && (
            <li className="min-w-0 flex-1">
              <AdminMoreMenu items={moreItems} activeKey={activeKey} />
            </li>
          )}
        </ul>
      </nav>

      <nav
        aria-label={label}
        className="fixed inset-y-0 left-0 z-40 hidden w-56 overflow-y-auto border-r border-border bg-card px-3 py-5 lg:block"
      >
        <BrandLockup className="px-3 pb-4" />
        {isAdmin ? (
          <div className="flex flex-col gap-4">
            {ADMIN_SIDEBAR_SECTIONS.map((section) => {
              const sectionItems = section.keys
                .map((key) => itemByKey.get(key))
                .filter((item): item is NavItem => item !== undefined);
              if (sectionItems.length === 0) return null;
              return (
                <div key={section.title} className="flex flex-col gap-1">
                  <p className="px-3 pb-0.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {section.title}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {sectionItems.map((item) => (
                      <li key={item.key}>
                        <NavLink item={item} isActive={item.key === activeKey} layout="sidebar" />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
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
        className={cn(
          'relative flex min-h-14 w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          active && 'font-semibold text-primary',
        )}
      >
        {active && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-1 rounded-b-pill bg-primary" />}
        <Menu aria-hidden="true" className="size-5" />
        <span>Thêm</span>
      </button>
      {open && (
        <div
          id="admin-more-navigation"
          className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 max-h-[60dvh] overflow-y-auto rounded-xl border border-input-border bg-card p-2 shadow-lg"
          role="group"
          aria-label="Các mục quản trị khác"
        >
          <p className="px-3 py-2 text-sm font-semibold text-heading">Các mục quản trị</p>
          <ul className="grid grid-cols-2 gap-1">
            {items.map((item) => {
              const Icon = NAV_ICON[item.key];
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={item.key === activeKey ? 'page' : undefined}
                    className={cn(
                      'flex min-h-12 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      item.key === activeKey
                        ? 'bg-status-info-bg text-status-info-fg'
                        : 'text-foreground hover:bg-background',
                    )}
                  >
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

function NavLink({ item, isActive, layout }: NavLinkProps) {
  const Icon = NAV_ICON[item.key];

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-2.5 rounded-lg font-medium',
        'transition-[color,background-color,transform] duration-200 ease-out-soft',
        'active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none',
        layout === 'tab'
          ? 'min-h-14 w-full flex-col justify-center gap-1 px-1 py-2 text-center text-xs'
          : 'min-h-10 px-3 py-2 text-sm',
        isActive && layout === 'sidebar' && 'bg-primary text-card shadow-xs',
        isActive && layout === 'tab' && 'text-primary',
        !isActive && 'text-muted-foreground',
        layout === 'sidebar' && !isActive && 'hover:bg-background hover:text-foreground',
      )}
    >
      {isActive && layout === 'tab' && (
        <span aria-hidden="true" className="absolute inset-x-4 top-0 h-1 rounded-b-pill bg-primary" />
      )}
      <LinkPendingIcon
        label={`Đang mở ${item.label}…`}
        className={layout === 'tab' ? 'size-5' : 'size-4'}
      >
        <Icon
          aria-hidden="true"
          className={cn(layout === 'tab' ? 'size-5' : 'size-4', isActive && 'scale-105')}
        />
      </LinkPendingIcon>
      <span className={cn(isActive && 'font-semibold')}>{item.label}</span>
    </Link>
  );
}
