import Form from 'next/form';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoveRight,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { buttonClassName } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import { PendingSubmitButton } from '@/components/ui/pending-submit-button';
import {
  ADMIN_REPORT_PARAMS,
  ADMIN_REPORTS_PATH,
  adminReportsPath,
  buildAdminReportQuery,
  type AdminReportFilters,
} from '@/lib/reports/admin-filters';
import {
  buildPaginationItems,
  formatPageRangeLabel,
  type PageInfo,
} from '@/lib/reports/pagination';
import { cn } from '@/lib/utils';

type Props = {
  filters: AdminReportFilters;
  pageInfo: PageInfo;
};

/** Phân trang riêng của Admin: nhảy trực tiếp, không phải bấm tuần tự hàng trăm lần. */
export function AdminPaginationNav({ filters, pageInfo }: Props) {
  const items = buildPaginationItems(pageInfo);
  const preservedParams = Array.from(buildAdminReportQuery(filters).entries());

  return (
    <nav
      aria-label="Phân trang danh sách báo cáo"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="tabular text-sm font-semibold text-heading">
          {formatPageRangeLabel(pageInfo)}
        </p>
        <p className="tabular text-sm text-muted-foreground">
          Trang {pageInfo.page}/{pageInfo.pageCount}
        </p>
      </div>

      {pageInfo.pageCount > 1 && (
        <>
          <div className="flex items-center justify-between gap-3 md:hidden">
            <PageLink
              href={pageInfo.hasPrev ? adminReportsPath(filters, { page: pageInfo.page - 1 }) : null}
              label="Trang trước"
              icon={<ChevronLeft aria-hidden="true" className="size-4" />}
            />
            <PageLink
              href={pageInfo.hasNext ? adminReportsPath(filters, { page: pageInfo.page + 1 }) : null}
              label="Trang sau"
              icon={<ChevronRight aria-hidden="true" className="size-4" />}
              iconAfter
            />
          </div>

          <div className="hidden flex-wrap items-center justify-center gap-2 md:flex">
            <PageLink
              href={pageInfo.hasPrev ? adminReportsPath(filters, { page: 1 }) : null}
              label="Đầu"
              icon={<ChevronsLeft aria-hidden="true" className="size-4" />}
            />
            <PageLink
              href={pageInfo.hasPrev ? adminReportsPath(filters, { page: pageInfo.page - 1 }) : null}
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
                  href={adminReportsPath(filters, { page: item.page })}
                  aria-label={`Trang ${item.page}`}
                  className={buttonClassName({
                    variant: 'secondary',
                    className: 'tabular min-w-11 px-3',
                  })}
                >
                  {item.page}
                  <LinkPendingIcon label={`Đang mở trang ${item.page}…`} className="size-4">
                    <span aria-hidden="true" className="hidden" />
                  </LinkPendingIcon>
                </Link>
              );
            })}

            <PageLink
              href={pageInfo.hasNext ? adminReportsPath(filters, { page: pageInfo.page + 1 }) : null}
              label="Sau"
              icon={<ChevronRight aria-hidden="true" className="size-4" />}
              iconAfter
            />
            <PageLink
              href={pageInfo.hasNext ? adminReportsPath(filters, { page: pageInfo.pageCount }) : null}
              label="Cuối"
              icon={<ChevronsRight aria-hidden="true" className="size-4" />}
              iconAfter
            />
          </div>
        </>
      )}

      {pageInfo.pageCount > 1 && (
        <Form
          action={ADMIN_REPORTS_PATH}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 md:ml-auto md:w-full md:max-w-xs"
        >
          {preservedParams.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="admin-report-page">Đi tới trang</Label>
            <Input
              id="admin-report-page"
              name={ADMIN_REPORT_PARAMS.PAGE}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={String(pageInfo.pageCount).length}
              placeholder={`${pageInfo.page}`}
              aria-describedby="admin-report-page-help"
            />
          </div>
          <PendingSubmitButton pendingText="Đang mở…" className="min-w-13 px-3">
            <MoveRight aria-hidden="true" className="size-5" />
            <span className="sr-only">Mở trang đã nhập</span>
          </PendingSubmitButton>
          <p id="admin-report-page-help" className="sr-only">
            Nhập số từ 1 đến {pageInfo.pageCount}
          </p>
        </Form>
      )}
    </nav>
  );
}

type PageLinkProps = {
  href: string | null;
  label: string;
  icon: ReactNode;
  iconAfter?: boolean;
};

function PageLink({ href, label, icon, iconAfter = false }: PageLinkProps) {
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
