import Link from 'next/link';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import { LinkSpinner } from '@/components/ui/link-spinner';
import type { AdminReportMonthNavigation } from '@/lib/reports/admin-filters';
import {
  CALENDAR_WEEKDAY_HEADERS,
  type EmployeeCalendarDay,
  type EmployeeMonthOverview,
} from '@/lib/reports/employee-month-overview';
import { cn } from '@/lib/utils';

type Props = {
  employeeName: string;
  overview: EmployeeMonthOverview;
  monthNavigation: AdminReportMonthNavigation;
  allEmployeesHref: string;
};

const DONUT_RADIUS = 52;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

export function EmployeeReportOverview({
  employeeName,
  overview,
  monthNavigation,
  allEmployeesHref,
}: Props) {
  const dashOffset = DONUT_CIRCUMFERENCE * (1 - overview.completedRatio);

  return (
    <Card className="flex flex-col gap-5 md:p-5">
      <div className="flex flex-col gap-4 border-b border-border pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-md bg-status-exceeded-bg text-status-exceeded-fg"
          >
            <ClipboardCheck className="size-6" />
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-heading">Báo cáo nhân viên</h1>
            <Badge tone="info">{employeeName}</Badge>
          </div>
          <Link
            href={allEmployeesHref}
            className={buttonClassName({ variant: 'secondary', className: 'sm:ml-1' })}
          >
            <Users aria-hidden="true" className="size-4" />
            Toàn đội
            <LinkSpinner label="Đang mở danh sách báo cáo toàn đội…" />
          </Link>
        </div>

        <div
          role="group"
          aria-label="Chọn tháng báo cáo nhân viên"
          className="inline-grid min-h-11 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center self-start overflow-hidden rounded-md border border-input-border/70 bg-background shadow-xs xl:self-auto"
        >
          <MonthStepLink
            href={monthNavigation.previousHref}
            label="Tháng trước"
            icon={<ChevronLeft aria-hidden="true" className="size-5" />}
            className="border-r border-border/80"
          />
          <span className="tabular inline-flex items-center justify-center gap-2 px-3 text-sm font-semibold text-heading">
            <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-primary" />
            {overview.monthTitleLabel}
          </span>
          <MonthStepLink
            href={monthNavigation.nextHref}
            label="Tháng sau"
            icon={<ChevronRight aria-hidden="true" className="size-5" />}
            className="border-l border-border/80"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <LegendItem
            icon={
              <span className="grid size-5 shrink-0 place-items-center rounded-pill bg-success text-white">
                <Check aria-hidden="true" className="size-3.5 stroke-[3]" />
              </span>
            }
            title="Đủ báo cáo"
            subtitle="(Đầu ngày + Cuối ngày)"
          />
          <LegendItem
            icon={
              <span className="grid size-5 shrink-0 place-items-center rounded-pill bg-warning text-white">
                <Clock aria-hidden="true" className="size-3.5 stroke-[2.5]" />
              </span>
            }
            title="Đã cam kết"
            subtitle="(Chỉ có đầu ngày)"
          />
          <LegendItem
            icon={
              <span
                aria-hidden="true"
                className="size-5 shrink-0 rounded-pill border border-input-border/40 bg-status-pending-bg"
              />
            }
            title="Chưa báo cáo"
            subtitle="(Chưa có báo cáo)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(19rem,23rem)_minmax(0,1fr)]">
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-surface-mint-border bg-surface-mint p-4">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {overview.overviewHeading}
          </h2>

          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="relative grid size-36 shrink-0 place-items-center">
              <svg viewBox="0 0 128 128" className="size-36 -rotate-90" aria-hidden="true">
                <circle
                  cx="64"
                  cy="64"
                  r={DONUT_RADIUS}
                  fill="none"
                  strokeWidth="12"
                  className="stroke-surface-mint-border"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={DONUT_RADIUS}
                  fill="none"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={DONUT_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  className="stroke-success transition-opacity duration-200"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="tabular text-xl font-bold text-foreground">
                  {overview.completedDays}/{overview.totalDays}
                </span>
                <span className="text-xs text-muted-foreground">ngày</span>
                <span className="text-xs text-muted-foreground">đủ báo cáo</span>
              </div>
            </div>

            <ul className="flex w-full flex-1 flex-col divide-y divide-surface-mint-border/80 text-sm">
              <SummaryStatRow
                icon={
                  <span className="grid size-5 shrink-0 place-items-center rounded-pill bg-success text-white">
                    <Check aria-hidden="true" className="size-3.5 stroke-[3]" />
                  </span>
                }
                count={overview.completedDays}
                label="Đủ báo cáo"
              />
              <SummaryStatRow
                icon={
                  <span className="grid size-5 shrink-0 place-items-center rounded-pill bg-warning text-white">
                    <Clock aria-hidden="true" className="size-3.5 stroke-[2.5]" />
                  </span>
                }
                count={overview.committedDays}
                label="Đã cam kết"
              />
              <SummaryStatRow
                icon={
                  <span
                    aria-hidden="true"
                    className="size-5 shrink-0 rounded-pill border border-input-border/40 bg-status-pending-bg"
                  />
                }
                count={overview.unreportedDays}
                label="Chưa báo cáo"
              />
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2">
            {CALENDAR_WEEKDAY_HEADERS.map((weekday) => (
              <span key={weekday} className="py-1 text-xs font-semibold text-muted-foreground">
                {weekday}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: overview.leadingEmptyDays }, (_, index) => (
              <div
                key={`empty-${overview.month}-${index}`}
                aria-hidden="true"
                className="min-h-9"
              />
            ))}
            {overview.days.map((item) => (
              <CalendarDayCell key={item.date} item={item} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function LegendItem({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
    </div>
  );
}

function SummaryStatRow({
  icon,
  count,
  label,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
      {icon}
      <span className="tabular font-bold text-foreground">{count} ngày</span>
      <span className="text-muted-foreground">{label}</span>
    </li>
  );
}

function CalendarDayCell({ item }: { item: EmployeeCalendarDay }) {
  if (item.status === 'COMPLETED') {
    return (
      <div className="flex min-h-9 items-center justify-between gap-1 rounded-sm bg-status-exceeded-bg px-1.5 py-1.5 text-status-exceeded-fg sm:px-2.5">
        <span className="tabular text-xs font-bold sm:text-sm">{item.day}</span>
        <span className="grid size-4 shrink-0 place-items-center rounded-pill bg-success text-white">
          <Check aria-hidden="true" className="size-2.5 stroke-[3]" />
        </span>
      </div>
    );
  }

  if (item.status === 'MORNING_SUBMITTED') {
    return (
      <div className="flex min-h-9 items-center justify-between gap-1 rounded-sm bg-status-near-bg px-1.5 py-1.5 text-status-near-fg sm:px-2.5">
        <span className="tabular text-xs font-bold sm:text-sm">{item.day}</span>
        <span className="grid size-4 shrink-0 place-items-center rounded-pill bg-warning text-white">
          <Clock aria-hidden="true" className="size-2.5 stroke-[2.5]" />
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-9 items-center justify-center rounded-sm bg-status-pending-bg px-1.5 py-1.5 text-status-pending-fg sm:px-2.5">
      <span className="tabular text-xs font-bold sm:text-sm">{item.day}</span>
    </div>
  );
}

function MonthStepLink({
  href,
  label,
  icon,
  className,
}: {
  href: string | null;
  label: string;
  icon: React.ReactNode;
  className?: string;
}) {
  const baseClass = cn(
    'grid min-h-11 min-w-11 place-items-center text-primary transition-colors duration-150 hover:bg-status-info-bg',
    className,
  );

  if (href === null) {
    return (
      <span aria-disabled="true" className={cn(baseClass, 'cursor-not-allowed opacity-45')}>
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={baseClass}>
      <LinkPendingIcon label={`Đang mở ${label.toLocaleLowerCase('vi-VN')}…`} className="size-5">
        {icon}
      </LinkPendingIcon>
    </Link>
  );
}
