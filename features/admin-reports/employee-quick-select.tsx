import Link from 'next/link';
import { UserRound } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { LinkSpinner } from '@/components/ui/link-spinner';
import {
  adminReportsEmployeePath,
  adminReportsPathWithoutFilter,
  type AdminReportFilters,
} from '@/lib/reports/admin-filters';
import { cn } from '@/lib/utils';
import type { SalesOption } from '@/services/profiles';

type Props = {
  filters: AdminReportFilters;
  salesOptions: readonly SalesOption[];
};

export function EmployeeQuickSelect({ filters, salesOptions }: Props) {
  const activeSales = salesOptions.filter((option) => option.is_active);
  if (activeSales.length === 0) return null;

  const allHref = adminReportsPathWithoutFilter(filters, 'SALES');

  return (
    <Card className="flex flex-col gap-2.5 md:px-5 md:py-3.5">
      <div className="flex items-center gap-2 text-sm font-semibold text-heading">
        <UserRound aria-hidden="true" className="size-4 text-primary" />
        <span>Xem báo cáo theo nhân viên</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={allHref}
          aria-current={filters.salesId === null ? 'page' : undefined}
          className={cn(
            'inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3.5 text-sm font-medium transition-colors duration-150',
            filters.salesId === null
              ? 'border-primary bg-primary text-white shadow-xs'
              : 'border-input-border/60 bg-background text-foreground hover:bg-status-info-bg',
          )}
        >
          Tất cả nhân viên
          <LinkSpinner label="Đang mở báo cáo toàn đội…" />
        </Link>
        {activeSales.map((option) => {
          const isSelected = filters.salesId === option.id;
          return (
            <Link
              key={option.id}
              href={adminReportsEmployeePath(filters, option.id)}
              aria-current={isSelected ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3.5 text-sm font-medium transition-colors duration-150',
                isSelected
                  ? 'border-primary bg-primary text-white shadow-xs'
                  : 'border-input-border/60 bg-background text-foreground hover:bg-status-info-bg',
              )}
            >
              <span>{option.full_name}</span>
              <LinkSpinner label={`Đang mở báo cáo của ${option.full_name}…`} />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
