import Link from 'next/link';
import { CalendarDays, X } from 'lucide-react';

import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import {
  adminReportsPathWithoutFilter,
  type AdminReportFilters,
  type AdminReportFilterSummary,
} from '@/lib/reports/admin-filters';

type Props = {
  filters: AdminReportFilters;
  summaries: readonly AdminReportFilterSummary[];
};

/** Các điều kiện vẫn đọc được ngay cả khi khối nâng cao đang đóng. */
export function ActiveReportFilters({ filters, summaries }: Props) {
  return (
    <div aria-label="Bộ lọc đang áp dụng" className="flex flex-wrap items-center gap-2">
      {summaries.map((summary) => {
        if (!summary.removable) {
          return (
            <span
              key={summary.key}
              className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-status-info-bg px-3 text-sm font-medium text-status-info-fg"
            >
              <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
              {summary.label}
            </span>
          );
        }

        return (
          <Link
            key={summary.key}
            href={adminReportsPathWithoutFilter(filters, summary.key)}
            aria-label={`Bỏ lọc: ${summary.label}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-input-border/60 bg-card px-3 text-sm font-medium text-foreground shadow-xs transition-[background-color,box-shadow] duration-200 hover:bg-background hover:shadow-sm"
          >
            <span className="break-words">{summary.label}</span>
            <LinkPendingIcon label={`Đang bỏ lọc ${summary.label}…`} className="size-4">
              <X aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </LinkPendingIcon>
          </Link>
        );
      })}
    </div>
  );
}
