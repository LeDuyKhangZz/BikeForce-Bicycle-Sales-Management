import Form from 'next/form';
import Link from 'next/link';
import { CalendarClock, ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import { LinkSpinner } from '@/components/ui/link-spinner';
import { PendingSubmitButton } from '@/components/ui/pending-submit-button';
import { ActiveReportFilters } from '@/features/admin-reports/active-report-filters';
import { AdvancedReportFilters } from '@/features/admin-reports/advanced-report-filters';
import {
  ADMIN_REPORT_PARAMS,
  ADMIN_REPORTS_PATH,
  buildAdminReportFilterSummaries,
  buildAdminReportMonthNavigation,
  hasActiveFilters,
  MAX_SEARCH_LENGTH,
  type AdminReportFilters,
} from '@/lib/reports/admin-filters';
import { cn } from '@/lib/utils';
import type { SalesOption } from '@/services/profiles';

type Props = {
  filters: AdminReportFilters;
  salesOptions: readonly SalesOption[];
};

export function ReportFilterBar({ filters, salesOptions }: Props) {
  const selectedSales = salesOptions.find((option) => option.id === filters.salesId) ?? null;
  const summaries = buildAdminReportFilterSummaries(filters, selectedSales?.full_name ?? null);
  const monthNavigation = buildAdminReportMonthNavigation(filters);

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
          <h2 className="text-lg font-bold text-heading">Tìm và lọc báo cáo</h2>
          <p className="text-sm text-muted-foreground">
            Mặc định là tháng hiện tại; dữ liệu mới nhất luôn ở trên cùng.
          </p>
        </div>
      </div>

      <ActiveReportFilters filters={filters} summaries={summaries} />

      <Form action={ADMIN_REPORTS_PATH} className="flex flex-col gap-4 md:gap-5">
        {filters.raw.period === 'all' && (
          <input type="hidden" name={ADMIN_REPORT_PARAMS.PERIOD} value="all" />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)] md:items-end md:gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="q">Tìm theo tên Sales</Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="q"
                name={ADMIN_REPORT_PARAMS.SEARCH}
                type="search"
                defaultValue={filters.search ?? ''}
                maxLength={MAX_SEARCH_LENGTH}
                placeholder="Ví dụ: Khang"
                enterKeyHint="search"
                autoCapitalize="none"
                className="pl-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
            <span id="report-month-navigation-label" className="text-sm font-medium text-foreground">
              Duyệt nhanh theo tháng
            </span>
            <div className="col-span-2 row-start-3 justify-self-start text-sm font-semibold md:col-span-1 md:col-start-2 md:row-start-1 md:justify-self-end">
              {monthNavigation.isCurrentMonth ? (
                <span aria-current="date" className="text-muted-foreground">
                  Tháng này
                </span>
              ) : (
                <Link
                  href={monthNavigation.currentHref}
                  className="text-primary hover:underline"
                >
                  Về tháng này
                  <LinkSpinner label="Đang mở tháng hiện tại…" />
                </Link>
              )}
            </div>
            <div
              role="group"
              aria-labelledby="report-month-navigation-label"
              className="col-span-2 row-start-2 grid min-h-13 grid-cols-[3.25rem_minmax(0,1fr)_3.25rem] items-center overflow-hidden rounded-md border border-input-border/70 bg-background shadow-xs"
            >
              <MonthLink
                href={monthNavigation.previousHref}
                label="Tháng trước"
                icon={<ChevronLeft aria-hidden="true" className="size-5" />}
                className="border-r border-border/80"
              />
              <span className="tabular px-2 text-center text-sm font-semibold text-heading">
                {monthNavigation.label}
              </span>
              <MonthLink
                href={monthNavigation.nextHref}
                label="Tháng sau"
                icon={<ChevronRight aria-hidden="true" className="size-5" />}
                className="border-l border-border/80"
              />
            </div>
          </div>
        </div>

        <AdvancedReportFilters filters={filters} salesOptions={salesOptions} />

        <div className="flex flex-col gap-2 md:flex-row md:justify-end md:border-t md:border-border/70 md:pt-4">
          {hasActiveFilters(filters) && (
            <Link
              href={ADMIN_REPORTS_PATH}
              className={buttonClassName({ variant: 'secondary', size: 'lg', className: 'md:w-auto' })}
            >
              <RotateCcw aria-hidden="true" className="size-5" />
              Đặt lại về tháng này
              <LinkSpinner label="Đang đặt lại bộ lọc…" />
            </Link>
          )}
          <PendingSubmitButton
            pendingText="Đang lọc báo cáo…"
            className="md:w-auto md:min-w-52"
          >
            <Search aria-hidden="true" className="size-5" />
            Áp dụng bộ lọc
          </PendingSubmitButton>
        </div>
      </Form>
    </Card>
  );
}

type MonthLinkProps = {
  href: string | null;
  label: string;
  icon: React.ReactNode;
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
