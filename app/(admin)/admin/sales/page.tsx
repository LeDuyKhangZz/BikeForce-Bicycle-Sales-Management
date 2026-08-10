import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, UserPlus, Users } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { SalesPerformanceTable } from '@/features/admin-sales-management/sales-performance-table';
import {
  formatVietnamMonth,
  getVietnamCurrentMonth,
  resolveVietnamMonth,
  shiftVietnamMonth,
} from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { getSalesPerformance } from '@/services/admin';

export const metadata: Metadata = {
  title: 'Nhân viên · BikeForce',
};

const SALES_PATH = '/admin/sales';

/**
 * `/admin/sales` — UC-16, FR-029, AF-06.
 *
 * Bảng hiệu suất theo từng Sales trong một tháng: tổng doanh số, doanh thu,
 * viếng thăm, và **số ngày đạt KPI** theo BR-024.
 *
 * Toàn bộ phép cộng và phép đếm nằm trong `admin_sales_performance` (migration
 * 0006) — một lượt quét SQL, không kéo báo cáo của cả đội về Node
 * (AGENTS.md §5, NFR-002).
 *
 * Danh sách trả về **cả Sales chưa có báo cáo nào** và cả người đã bị vô hiệu
 * hoá: một người vắng mặt cả tháng là thông tin quan trọng nhất của bảng này.
 */

type Props = {
  searchParams: Promise<{ month?: string }>;
};

export default async function AdminSalesPage({ searchParams }: Props) {
  await requireRole('ADMIN');

  const params = await searchParams;
  const currentMonth = getVietnamCurrentMonth();
  const { month, from, to } = resolveVietnamMonth(params.month);

  const supabase = await createClient();
  const rows = await getSalesPerformance(supabase, { from, to });

  const previousMonth = shiftVietnamMonth(month, -1);
  const nextMonth = shiftVietnamMonth(month, 1);
  const canGoNext = nextMonth !== null && nextMonth <= currentMonth;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-heading">Nhân viên</h1>
          <p className="text-sm text-muted-foreground">
            Hiệu suất theo tháng. Số ngày đạt KPI tính theo cả bốn chỉ tiêu.
          </p>
        </div>

        <Link href="/admin/sales/new" className={buttonClassName()}>
          <UserPlus aria-hidden="true" className="size-4" />
          Tạo tài khoản
        </Link>
      </div>

      <Card className="flex items-center justify-between gap-2 py-2">
        <MonthLink
          href={previousMonth === null ? null : `${SALES_PATH}?month=${previousMonth}`}
          label="Tháng trước"
          icon={<ChevronLeft aria-hidden="true" className="size-5" />}
        />
        <p aria-live="polite" className="tabular text-base font-semibold text-heading">
          {formatVietnamMonth(month)}
        </p>
        <MonthLink
          href={canGoNext && nextMonth !== null ? `${SALES_PATH}?month=${nextMonth}` : null}
          label="Tháng sau"
          icon={<ChevronRight aria-hidden="true" className="size-5" />}
        />
      </Card>

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <Users aria-hidden="true" className="size-12 text-muted-foreground" />
          <p className="text-base font-medium text-foreground">Chưa có nhân viên nào</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Tạo tài khoản Sales đầu tiên, bàn giao mật khẩu tạm, rồi họ có thể bắt đầu báo cáo ngay
            trong ngày.
          </p>
          <Link href="/admin/sales/new" className={buttonClassName()}>
            <UserPlus aria-hidden="true" className="size-4" />
            Tạo tài khoản Sales
          </Link>
        </Card>
      ) : (
        <SalesPerformanceTable rows={rows} />
      )}
    </div>
  );
}

/** Không export — cùng quy ước với `MonthFilter` của Phase 7. */
function MonthLink({
  href,
  label,
  icon,
}: {
  href: string | null;
  label: string;
  icon: React.ReactNode;
}) {
  const className = cn(buttonClassName({ variant: 'ghost' }), 'min-w-11');

  if (href === null) {
    return (
      <span aria-disabled="true" className={cn(className, 'cursor-not-allowed opacity-45')}>
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {icon}
      <span className="sr-only">{label}</span>
    </Link>
  );
}
