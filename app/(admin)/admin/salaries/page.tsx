import type { Metadata } from 'next';
import Link from 'next/link';
import { Banknote, ChevronLeft, ChevronRight, UsersRound } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import {
  MonthlySalariesForm,
  type SalarySalesRow,
} from '@/features/admin-salaries/monthly-salaries-form';
import { requireRole } from '@/features/auth/queries';
import { formatVietnamMonth, resolveVietnamMonth, shiftVietnamMonth } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { periodMonthOf } from '@/lib/validation/monthly-targets';
import { listSalesOptions } from '@/services/profiles';
import { listMonthlySalaries } from '@/services/salaries';

export const metadata: Metadata = { title: 'Lương · BikeForce' };
const PAGE_PATH = '/admin/salaries';

type Props = { searchParams: Promise<{ month?: string }> };

export default async function AdminSalariesPage({ searchParams }: Props) {
  await requireRole('ADMIN');
  const { month } = resolveVietnamMonth((await searchParams).month);
  const previousMonth = shiftVietnamMonth(month, -1);
  const nextMonth = shiftVietnamMonth(month, 1);
  const supabase = await createClient();
  const [salesList, salaries] = await Promise.all([
    listSalesOptions(supabase),
    listMonthlySalaries(supabase, periodMonthOf(month)),
  ]);

  const salesRows: SalarySalesRow[] = salesList.map((sales) => ({
    id: sales.id,
    full_name: sales.full_name,
    employee_code: sales.employee_code,
    is_active: sales.is_active,
  }));
  const currentAmounts = Object.fromEntries(salaries.map((row) => [row.sales_id, row.amount]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-heading">
          <Banknote aria-hidden="true" className="size-6" />
          Lương
        </h1>
        <p className="text-sm text-muted-foreground">
          Nhập số tiền lương theo từng nhân viên và từng tháng.
        </p>
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

      {salesRows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <UsersRound aria-hidden="true" className="size-12 text-muted-foreground" />
          <p className="font-medium text-foreground">Chưa có nhân viên Sales</p>
          <Link href="/admin/sales/new" className={buttonClassName()}>Tạo tài khoản Sales</Link>
        </Card>
      ) : (
        <MonthlySalariesForm
          key={month}
          month={month}
          monthLabel={formatVietnamMonth(month)}
          salesList={salesRows}
          currentAmounts={currentAmounts}
        />
      )}
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
