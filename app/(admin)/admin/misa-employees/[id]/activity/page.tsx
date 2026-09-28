import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, UsersRound } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { buttonClassName } from '@/components/ui/button';
import { requireRole } from '@/features/auth/queries';
import { EmployeeActivitySummary } from '@/features/misa-employees/employee-activity-summary';
import { getMisaEmployeeActivity } from '@/features/misa-employees/queries';
import { formatVietnamMonth, resolveVietnamMonth } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { getCachedMisaEmployeeById } from '@/services/misa-report119-cache';

export const metadata: Metadata = { title: 'Chi tiết nhân viên MISA · BikeForce' };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
};

export default async function MisaEmployeeActivityPage({ params, searchParams }: Props) {
  await requireRole('ADMIN');
  const [{ id }, rawSearch] = await Promise.all([params, searchParams]);
  const employeeId = Number(id);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) notFound();
  const { month } = resolveVietnamMonth(rawSearch.month);

  const supabase = await createClient();
  const employee = await getCachedMisaEmployeeById(supabase, month, employeeId);
  if (employee === null) notFound();
  const activity = await getMisaEmployeeActivity(supabase, employee.name, month);

  return (
    <div className="flex flex-col gap-4 xl:relative xl:left-1/2 xl:w-[calc(100vw-18rem)] xl:max-w-[1500px] xl:-translate-x-1/2">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-gradient-to-r from-primary/5 via-background to-primary/5 p-5 sm:p-7">
        <div>
          <Link href={`/admin/misa-employees?month=${month}`} className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <ChevronLeft aria-hidden="true" className="size-4" /> Danh sách nhân viên
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">Chi tiết hoạt động của {employee.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{formatVietnamMonth(month)} · {employee.customerCount} khách hàng phụ trách</p>
        </div>
        <Link href={`/admin/misa-employees/${employee.id}?month=${month}`} className={buttonClassName({ variant: 'secondary' })}>
          <UsersRound aria-hidden="true" className="size-4" /> Xem khách hàng
        </Link>
      </header>

      <EmployeeActivitySummary activity={activity} />

      {activity.performance === null && activity.saleWorkMetrics === null && (
        <Card className="rounded-2xl">
          <p className="text-sm text-muted-foreground">Nhân viên này chưa có dữ liệu hoạt động được đồng bộ trong tháng đã chọn.</p>
        </Card>
      )}
    </div>
  );
}
