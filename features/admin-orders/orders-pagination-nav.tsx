import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { buttonClassName } from '@/components/ui/button';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import { ordersPath, type OrderFilters } from '@/lib/operations/filters';
import { buildPaginationItems, type PageInfo } from '@/lib/reports/pagination';
import { cn } from '@/lib/utils';

type Props = {
  filters: OrderFilters;
  pageInfo: PageInfo;
  rangeLabel: string;
};

export function OrdersPaginationNav({ filters, pageInfo, rangeLabel }: Props) {
  const items = buildPaginationItems(pageInfo);

  return (
    <nav
      aria-label="Phân trang danh sách đơn hàng"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="tabular text-sm font-semibold text-heading">
          {rangeLabel}
        </p>
        <p className="tabular text-sm text-muted-foreground">
          Trang {pageInfo.page}/{pageInfo.pageCount}
        </p>
      </div>

      {pageInfo.pageCount > 1 && (
        <>
          <div className="flex items-center justify-between gap-3 md:hidden">
            <PageLink
              href={pageInfo.hasPrev ? ordersPath(filters, { page: pageInfo.page - 1 }) : null}
              label="Trang trước"
              icon={<ChevronLeft aria-hidden="true" className="size-4" />}
            />
            <PageLink
              href={pageInfo.hasNext ? ordersPath(filters, { page: pageInfo.page + 1 }) : null}
              label="Trang sau"
              icon={<ChevronRight aria-hidden="true" className="size-4" />}
              iconAfter
            />
          </div>

          <div className="hidden flex-wrap items-center justify-center gap-2 md:flex">
            <PageLink
              href={pageInfo.hasPrev ? ordersPath(filters, { page: 1 }) : null}
              label="Đầu"
              icon={<ChevronsLeft aria-hidden="true" className="size-4" />}
            />
            <PageLink
              href={pageInfo.hasPrev ? ordersPath(filters, { page: pageInfo.page - 1 }) : null}
              label="Trước"
              icon={<ChevronLeft aria-hidden="true" className="size-4" />}
            />

            {items.map((item) => {
              if (item.type === 'ELLIPSIS') {
                return (
                  <span
                    key={item.position}
                    aria-hidden="true"
                    className="grid min-h-11 min-w-11 place-items-center text-muted-foreground"
                  >
                    …
                  </span>
                );
              }
              if (item.page === pageInfo.page) {
                return (
                  <span
                    key={item.page}
                    aria-current="page"
                    className="tabular grid min-h-11 min-w-11 place-items-center rounded-md bg-primary px-3 text-sm font-semibold text-white shadow-brand-sm"
                  >
                    {item.page}
                  </span>
                );
              }
              return (
                <Link
                  key={item.page}
                  href={ordersPath(filters, { page: item.page })}
                  aria-label={`Trang ${item.page}`}
                  className={buttonClassName({
                    variant: 'secondary',
                    className: 'tabular min-w-11 px-3',
                  })}
                >
                  {item.page}
                </Link>
              );
            })}

            <PageLink
              href={pageInfo.hasNext ? ordersPath(filters, { page: pageInfo.page + 1 }) : null}
              label="Sau"
              icon={<ChevronRight aria-hidden="true" className="size-4" />}
              iconAfter
            />
            <PageLink
              href={pageInfo.hasNext ? ordersPath(filters, { page: pageInfo.pageCount }) : null}
              label="Cuối"
              icon={<ChevronsRight aria-hidden="true" className="size-4" />}
              iconAfter
            />
          </div>
        </>
      )}
    </nav>
  );
}

function PageLink({
  href,
  label,
  icon,
  iconAfter = false,
}: {
  href: string | null;
  label: string;
  icon: ReactNode;
  iconAfter?: boolean;
}) {
  const className = buttonClassName({ variant: 'secondary', className: 'px-3' });
  if (href === null) {
    return (
      <span aria-disabled="true" className={cn(className, 'cursor-not-allowed opacity-45')}>
        {!iconAfter && icon}
        {label}
        {iconAfter && icon}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {!iconAfter && (
        <LinkPendingIcon label={`Đang mở ${label.toLocaleLowerCase('vi-VN')}…`} className="size-4">
          {icon}
        </LinkPendingIcon>
      )}
      {label}
      {iconAfter && (
        <LinkPendingIcon label={`Đang mở ${label.toLocaleLowerCase('vi-VN')}…`} className="size-4">
          {icon}
        </LinkPendingIcon>
      )}
    </Link>
  );
}

