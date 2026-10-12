import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import { getTravelExpensePageData } from '@/features/admin-travel-expenses/queries';
import { TravelExpenseDashboard } from '@/features/admin-travel-expenses/travel-expense-dashboard';
import { requireRole } from '@/features/auth/queries';
import { buildTravelExpenseDashboard } from '@/lib/admin/travel-expense-dashboard';
import { formatVietnamMonth, resolveVietnamMonth, shiftVietnamMonth } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { periodMonthOf } from '@/lib/validation/monthly-targets';

export const metadata: Metadata = { title: 'Dashboard công tác phí · BikeForce' };
const PAGE_PATH = '/admin/travel-expenses';

type Props = { searchParams: Promise<{ month?: string }> };

export default async function AdminTravelExpensesDashboardPage({ searchParams }: Props) {
  await requireRole('ADMIN');
  const { month } = resolveVietnamMonth((await searchParams).month);
  const previousMonth = shiftVietnamMonth(month, -1);
  const nextMonth = shiftVietnamMonth(month, 1);
  const supabase = await createClient();
  const data = await getTravelExpensePageData(supabase, periodMonthOf(month));
  const dashboard = buildTravelExpenseDashboard(data.salesRows, data.currentAmounts);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-heading">
            <ReceiptText aria-hidden="true" className="size-6" />
            Dashboard công tác phí
          </h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi tình hình nhập công tác phí theo từng tháng.
          </p>
        </div>
        <Link
          href={`${PAGE_PATH}/entries?month=${month}`}
          className={buttonClassName({ className: 'w-full sm:w-auto' })}
        >
          <LinkPendingIcon label="Đang mở trang công tác phí…">
            <ReceiptText aria-hidden="true" className="size-4" />
          </LinkPendingIcon>
          Công tác phí
        </Link>
      </div>

      <Card className="flex items-center justify-between gap-2 py-2">
        <MonthLink
          href={previousMonth === null ? null : `${PAGE_PATH}?month=${previousMonth}`}
          label="Tháng trước"
          icon={<ChevronLeft aria-hidden="true" className="size-5" />}
        />
        <p aria-live="polite" className="tabular text-base font-semibold text-heading">
          {formatVietnamMonth(month)}
        </p>
        <MonthLink
          href={nextMonth === null ? null : `${PAGE_PATH}?month=${nextMonth}`}
          label="Tháng sau"
          icon={<ChevronRight aria-hidden="true" className="size-5" />}
        />
      </Card>

      <TravelExpenseDashboard dashboard={dashboard} />
    </div>
  );
}

function MonthLink({ href, label, icon }: { href: string | null; label: string; icon: React.ReactNode }) {
  const className = cn(buttonClassName({ variant: 'ghost' }), 'min-w-11');
  if (href === null) {
    return <span aria-disabled="true" className={cn(className, 'cursor-not-allowed opacity-45')}>{icon}<span className="sr-only">{label}</span></span>;
  }
  return <Link href={href} className={className}><LinkPendingIcon label={`Đang mở ${label.toLocaleLowerCase('vi-VN')}…`}>{icon}</LinkPendingIcon><span className="sr-only">{label}</span></Link>;
}
