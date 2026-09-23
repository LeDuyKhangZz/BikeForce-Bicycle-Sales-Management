import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, UsersRound } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { buttonClassName } from '@/components/ui/button';
import { requireRole } from '@/features/auth/queries';
import { MisaEmployeeDirectory } from '@/features/misa-employees/misa-employee-directory';
import { formatVietnamMonth, getVietnamCurrentMonth, resolveVietnamMonth, shiftVietnamMonth } from '@/lib/date';
import { report119Period } from '@/lib/amis/report119-period';
import { createClient } from '@/lib/supabase/server';
import { listCachedMisaEmployees } from '@/services/misa-report119-cache';

export const metadata: Metadata = { title: 'Nhân viên · BikeForce' };

type Props = { searchParams: Promise<{ month?: string }> };

export default async function MisaEmployeesPage({ searchParams }: Props) {
  await requireRole('ADMIN');
  const { month } = resolveVietnamMonth((await searchParams).month);
  const period = report119Period(month);
  const previousMonth = shiftVietnamMonth(month, -1);
  const nextMonth = shiftVietnamMonth(month, 1);
  const availableNextMonth = nextMonth !== null && nextMonth <= getVietnamCurrentMonth() ? nextMonth : null;

  let employees: Awaited<ReturnType<typeof listCachedMisaEmployees>> = [];
  let error: string | null = null;
  try {
    if (period !== null) employees = await listCachedMisaEmployees(await createClient(), month);
    else error = 'Tháng báo cáo không hợp lệ.';
  } catch (cause) {
    console.error('[MisaEmployeesPage]', cause);
    error = 'Không tải được danh sách nhân viên đã đồng bộ. Hãy thử lại sau.';
  }

  return (
    <div className="flex flex-col gap-4 xl:relative xl:left-1/2 xl:w-[calc(100vw-18rem)] xl:max-w-[1500px] xl:-translate-x-1/2">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/5 via-background to-primary/5 p-5 sm:p-7">
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-heading sm:text-4xl">Nhân viên</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Cột “Nhân viên” trong báo cáo Thống kê khách hàng theo đơn vị/NVKD của THỐNG ĐẠT GROUP.
          </p>
        </div>
        <div aria-hidden="true" className="absolute bottom-0 right-6 hidden items-end gap-3 text-primary/35 xl:flex">
          <UsersRound className="size-28" strokeWidth={1.25} />
          <BadgeCheck className="mb-2 size-12 text-success" strokeWidth={1.5} />
          <span className="mb-7 max-w-32 text-center text-lg font-semibold italic leading-snug text-primary">Con người là sức mạnh</span>
        </div>
      </section>

      {error ? (
        <Card className="flex flex-col items-start gap-3 rounded-2xl p-5" role="alert">
          <p className="text-sm text-destructive">{error}</p>
          <Link href={`/admin/misa-employees?month=${month}`} className={buttonClassName({ variant: 'secondary' })}>Thử lại</Link>
        </Card>
      ) : employees.length === 0 ? (
        <Card className="flex flex-col items-start gap-3 rounded-2xl p-5">
          <UsersRound aria-hidden="true" className="size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Tháng này chưa có nhân viên trong báo cáo MISA.</p>
          <Link href="/admin" className={buttonClassName({ variant: 'secondary' })}>Về tổng quan</Link>
        </Card>
      ) : (
        <MisaEmployeeDirectory
          employees={employees}
          month={month}
          monthLabel={formatVietnamMonth(month)}
          previousMonth={previousMonth}
          nextMonth={availableNextMonth}
        />
      )}
    </div>
  );
}
