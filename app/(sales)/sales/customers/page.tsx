import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, UsersRound } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { buttonClassName } from '@/components/ui/button';
import { requireRole } from '@/features/auth/queries';
import { CustomerFilterPanel } from '@/features/misa-employees/customer-filter-panel';
import { MisaCustomerTable } from '@/features/misa-employees/misa-customer-table';
import { MisaCustomerToolbar } from '@/features/misa-employees/misa-customer-toolbar';
import { CustomerGroupSummary } from '@/features/misa-employees/customer-group-summary';
import { CustomerCommitmentProgress } from '@/features/misa-employees/customer-commitment-progress';
import { misaCustomerQuery, parseMisaCustomerFilters } from '@/lib/amis/customer-filters';
import { report119Period } from '@/lib/amis/report119-period';
import { formatVietnamMonth, getVietnamCurrentMonth, resolveVietnamMonth, shiftVietnamMonth } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { getCachedMisaCustomerCommitmentStats, getCachedMisaCustomerGroupCounts, getCachedMisaEmployeeByName, getCachedMisaEmployeeCustomers, type MisaCustomerCommitmentStats, type MisaCustomerGroupCounts } from '@/services/misa-report119-cache';
import type { MisaCustomerPage } from '@/services/misa-report119';

export const metadata: Metadata = { title: 'Khách hàng của tôi · BikeForce' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SalesCustomersPage({ searchParams }: Props) {
  const profile = await requireRole('SALES');
  const rawSearch = await searchParams;
  const search: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawSearch)) search[key] = typeof value === 'string' ? value : undefined;

  const { month } = resolveVietnamMonth(search.month);
  const page = search.page === undefined ? 1 : Number(search.page);
  const filters = parseMisaCustomerFilters(search);
  const searchQuery = search.q?.trim().slice(0, 120) ?? '';
  const previousMonth = shiftVietnamMonth(month, -1);
  const candidateNextMonth = shiftVietnamMonth(month, 1);
  const nextMonth = candidateNextMonth !== null && candidateNextMonth <= getVietnamCurrentMonth() ? candidateNextMonth : null;
  const path = '/sales/customers';

  let result: MisaCustomerPage | null = null;
  let groupCounts: MisaCustomerGroupCounts = { A: 0, B: 0, C: 0, D: 0 };
  let commitmentStats: MisaCustomerCommitmentStats = { total: 0, committed: 0, uncommitted: 0 };
  let error: string | null = null;
  if (report119Period(month) === null || !Number.isSafeInteger(page) || page <= 0) {
    error = 'Tháng hoặc trang không hợp lệ.';
  } else if (!profile.amis_employee_name) {
    error = 'Tài khoản chưa được liên kết với tên nhân viên MISA. Hãy liên hệ quản trị viên.';
  } else {
    try {
      const supabase = await createClient();
      const employee = await getCachedMisaEmployeeByName(supabase, month, profile.amis_employee_name);
      if (employee === null) {
        error = `Chưa có dữ liệu MISA của ${profile.amis_employee_name} trong ${formatVietnamMonth(month)}.`;
      } else {
        [result, groupCounts, commitmentStats] = await Promise.all([
          getCachedMisaEmployeeCustomers(supabase, { month, employeeId: employee.id, page, filters, searchQuery }),
          getCachedMisaCustomerGroupCounts(supabase, month, employee.id),
          getCachedMisaCustomerCommitmentStats(supabase, month, employee.id, employee.customerCount),
        ]);
      }
    } catch (cause) {
      console.error('[SalesCustomersPage]', cause);
      error = 'Không tải được danh sách khách hàng đã đồng bộ. Hãy thử lại sau.';
    }
  }

  const employeeId = result?.employee.id ?? 0;
  const pageHref = (target: number) => `${path}?${misaCustomerQuery(month, filters, target, searchQuery)}`;
  const firstRow = result ? (result.page - 1) * result.pageSize : 0;
  const lastRow = result ? Math.min(firstRow + result.rows.length, result.total) : 0;

  return (
    <div className="flex flex-col gap-4 xl:relative xl:left-1/2 xl:w-[calc(100vw-18rem)] xl:max-w-[1600px] xl:-translate-x-1/2">
      <header className="rounded-2xl bg-gradient-to-r from-primary/5 via-background to-primary/5 p-5">
        <h1 className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">Khách hàng của tôi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile.amis_employee_name ?? profile.full_name} · {formatVietnamMonth(month)}
        </p>
        <div className="mt-4 flex gap-2">
          {previousMonth && <Link href={`${path}?month=${previousMonth}`} className={buttonClassName({ variant: 'secondary' })}><ChevronLeft aria-hidden="true" className="size-4" /> Tháng trước</Link>}
          {nextMonth && <Link href={`${path}?month=${nextMonth}`} className={buttonClassName({ variant: 'secondary' })}>Tháng sau <ChevronRight aria-hidden="true" className="size-4" /></Link>}
        </div>
      </header>

      {error ? (
        <Card className="flex flex-col items-start gap-3 rounded-2xl p-5" role="alert">
          <UsersRound aria-hidden="true" className="size-7 text-muted-foreground" />
          <p className="text-sm text-destructive">{error}</p>
          <Link href={`${path}?month=${month}`} className={buttonClassName({ variant: 'secondary' })}>Thử lại</Link>
        </Card>
      ) : result ? (
        <><CustomerGroupSummary counts={groupCounts} /><CustomerCommitmentProgress stats={commitmentStats} /><div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Card flush className="min-w-0 overflow-hidden rounded-2xl">
            <MisaCustomerToolbar employeeId={employeeId} path={path} monthPickerPath={path} month={month} monthLabel={formatVietnamMonth(month)} filters={filters} searchQuery={searchQuery} rows={result.rows} />
            {result.rows.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">Không có khách hàng phù hợp.</div>
            ) : (
              <>
                <MisaCustomerTable rows={result.rows} employeeName={result.employee.name} employeeId={employeeId} month={month} startIndex={firstRow} canEditPlans />
                <nav aria-label="Phân trang khách hàng" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3 text-sm">
                  <p className="text-muted-foreground">Hiển thị {firstRow + 1}–{lastRow} trong {result.total} khách hàng</p>
                  <div className="flex items-center gap-2">
                    {result.page > 1 && <Link href={pageHref(result.page - 1)} className={buttonClassName({ variant: 'secondary' })}>Trước</Link>}
                    <span className="tabular-nums text-muted-foreground">{result.page}/{result.totalPages}</span>
                    {result.page < result.totalPages && <Link href={pageHref(result.page + 1)} className={buttonClassName({ variant: 'secondary' })}>Sau</Link>}
                  </div>
                </nav>
              </>
            )}
          </Card>
          <CustomerFilterPanel employeeId={employeeId} path={path} month={month} filters={filters} searchQuery={searchQuery} />
        </div></>
      ) : null}
    </div>
  );
}
