import Form from 'next/form';
import Link from 'next/link';
import { CalendarClock, ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';
import type { ReactNode } from 'react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import { LinkSpinner } from '@/components/ui/link-spinner';
import { PendingSubmitButton } from '@/components/ui/pending-submit-button';
import {
  ADMIN_ORDERS_PATH,
  buildOrderMonthNavigation,
  MAX_OPERATIONS_SEARCH_LENGTH,
  OPERATIONS_PARAMS,
  ordersPath,
  type OrderFilters,
} from '@/lib/operations/filters';
import { cn } from '@/lib/utils';

type Props = {
  filters: OrderFilters;
};

export function OrdersFilterBar({ filters }: Props) {
  const monthNav = buildOrderMonthNavigation(filters);
  const hasFilters = filters.search !== null || filters.month !== null;

  return (
    <Card className="flex flex-col gap-5 md:p-5">
      <div className="flex items-start gap-3 md:items-center">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-md bg-status-info-bg text-status-info-fg"
        >
          <CalendarClock className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-heading">Tìm và lọc đơn hàng MISA</h2>
          <p className="text-sm text-muted-foreground">
            Duyệt theo tháng hoặc tra cứu nhanh theo số đơn bán hàng.
          </p>
        </div>
      </div>

      <Form action={ADMIN_ORDERS_PATH} className="flex flex-col gap-4 md:gap-5">
        {filters.month !== null && (
          <input type="hidden" name={OPERATIONS_PARAMS.MONTH} value={filters.month} />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)] md:items-end md:gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="order-search">Tìm theo mã đơn hàng</Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="order-search"
                name={OPERATIONS_PARAMS.SEARCH}
                type="search"
                defaultValue={filters.search ?? ''}
                maxLength={MAX_OPERATIONS_SEARCH_LENGTH}
                placeholder="Ví dụ: DH2026..."
                enterKeyHint="search"
                autoCapitalize="none"
                className="pl-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
            <span id="orders-month-nav-label" className="text-sm font-medium text-foreground">
              Tháng phát sinh đơn
            </span>
            <div className="col-span-2 row-start-3 justify-self-start text-sm font-semibold md:col-span-1 md:col-start-2 md:row-start-1 md:justify-self-end">
              {monthNav.isAllMonths ? (
                <Link href={monthNav.currentHref} className="text-primary hover:underline">
                  Lọc tháng này
                  <LinkSpinner label="Đang mở tháng hiện tại…" />
                </Link>
              ) : (
                <Link href={monthNav.allMonthsHref} className="text-primary hover:underline">
                  Tất cả các tháng
                  <LinkSpinner label="Đang mở tất cả các tháng…" />
                </Link>
              )}
            </div>
            <div
              role="group"
              aria-labelledby="orders-month-nav-label"
              className="col-span-2 row-start-2 grid min-h-13 grid-cols-[3.25rem_minmax(0,1fr)_3.25rem] items-center overflow-hidden rounded-md border border-input-border/70 bg-background shadow-xs"
            >
              <MonthLink
                href={monthNav.previousHref}
                label="Tháng trước"
                icon={<ChevronLeft aria-hidden="true" className="size-5" />}
                className="border-r border-border/80"
              />
              <span className="tabular px-2 text-center text-sm font-semibold text-heading">
                {monthNav.label}
              </span>
              <MonthLink
                href={monthNav.nextHref}
                label="Tháng sau"
                icon={<ChevronRight aria-hidden="true" className="size-5" />}
                className="border-l border-border/80"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:justify-end md:border-t md:border-border/70 md:pt-4">
          {hasFilters && (
            <Link
              href={ADMIN_ORDERS_PATH}
              className={buttonClassName({ variant: 'secondary', size: 'lg', className: 'md:w-auto' })}
            >
              <RotateCcw aria-hidden="true" className="size-5" />
              Đặt lại bộ lọc
              <LinkSpinner label="Đang đặt lại bộ lọc…" />
            </Link>
          )}
          <PendingSubmitButton pendingText="Đang lọc đơn hàng…" className="md:w-auto md:min-w-48">
            <Search aria-hidden="true" className="size-5" />
            Tìm đơn hàng
          </PendingSubmitButton>
        </div>
      </Form>
    </Card>
  );
}

type MonthLinkProps = {
  href: string | null;
  label: string;
  icon: ReactNode;
  className?: string;
};

function MonthLink({ href, label, icon, className }: MonthLinkProps) {
  const linkClassName = cn(
    'grid min-h-11 min-w-11 place-items-center text-primary transition-colors duration-150 hover:bg-status-info-bg',
    className,
  );

  if (href === null) {
    return (
      <span aria-disabled="true" className={cn(linkClassName, 'cursor-not-allowed opacity-45')}>
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={linkClassName}>
      <LinkPendingIcon label={`Đang mở ${label.toLocaleLowerCase('vi-VN')}…`} className="size-5">
        {icon}
      </LinkPendingIcon>
    </Link>
  );
}

