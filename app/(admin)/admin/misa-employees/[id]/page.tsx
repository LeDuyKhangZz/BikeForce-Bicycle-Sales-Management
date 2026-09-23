import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, UserRound, UsersRound } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { buttonClassName } from '@/components/ui/button';
import { requireRole } from '@/features/auth/queries';
import { CustomerFilterPanel } from '@/features/misa-employees/customer-filter-panel';
import { MisaCustomerTable } from '@/features/misa-employees/misa-customer-table';
import { MisaCustomerToolbar } from '@/features/misa-employees/misa-customer-toolbar';
import { CustomerGroupSummary } from '@/features/misa-employees/customer-group-summary';
import { CustomerCommitmentProgress } from '@/features/misa-employees/customer-commitment-progress';
import { misaCustomerQuery, parseMisaCustomerFilters } from '@/lib/amis/customer-filters';
import { formatVietnamMonth, resolveVietnamMonth } from '@/lib/date';
import { report119Period } from '@/lib/amis/report119-period';
import { createClient } from '@/lib/supabase/server';
import { getCachedMisaCustomerCommitmentStats, getCachedMisaCustomerGroupCounts, getCachedMisaEmployeeCustomers, type MisaCustomerCommitmentStats, type MisaCustomerGroupCounts } from '@/services/misa-report119-cache';
import type { MisaCustomerPage } from '@/services/misa-report119';

export const metadata: Metadata = { title: 'Khách hàng MISA · BikeForce' };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MisaEmployeeCustomersPage({ params, searchParams }: Props) {
  await requireRole('ADMIN');
  const [{ id }, rawSearch] = await Promise.all([params, searchParams]);
  const search: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawSearch)) {
    search[key] = typeof value === 'string' ? value : undefined;
  }
  const employeeId = Number(id);
  const page = search.page === undefined ? 1 : Number(search.page);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0 ||
      !Number.isSafeInteger(page) || page <= 0) notFound();
  const { month } = resolveVietnamMonth(search.month);
  const filters = parseMisaCustomerFilters(search);
  const searchQuery = search.q?.trim().slice(0, 120) ?? '';
  const period = report119Period(month);
  if (period === null) notFound();

  let result: MisaCustomerPage | null = null;
  let groupCounts: MisaCustomerGroupCounts = { A: 0, B: 0, C: 0, D: 0 };
  let commitmentStats: MisaCustomerCommitmentStats = { total: 0, committed: 0, uncommitted: 0 };
  let error = false;
  try {
    const supabase = await createClient();
    [result, groupCounts] = await Promise.all([
      getCachedMisaEmployeeCustomers(supabase, { month, employeeId, page, filters, searchQuery }),
      getCachedMisaCustomerGroupCounts(supabase, month, employeeId),
    ]);
    if (result) commitmentStats = await getCachedMisaCustomerCommitmentStats(supabase, month, employeeId, result.employee.customerCount);
  } catch (cause) {
    console.error('[MisaEmployeeCustomersPage]', cause);
    error = true;
  }
  if (!error && result === null) notFound();

  const path = `/admin/misa-employees/${employeeId}`;
  const pageHref = (target: number) => `${path}?${misaCustomerQuery(month, filters, target, searchQuery)}`;
  const firstRow = result ? (result.page - 1) * result.pageSize : 0;
  const lastRow = result ? Math.min(firstRow + result.rows.length, result.total) : 0;
  const pageStart = result ? Math.max(1, Math.min(result.page - 2, result.totalPages - 4)) : 1;
  const visiblePages = result ? Array.from({ length: Math.min(5, result.totalPages) }, (_, index) => pageStart + index) : [];

  return (
    <div className="flex flex-col gap-4 xl:relative xl:left-1/2 xl:w-[calc(100vw-18rem)] xl:max-w-[1500px] xl:-translate-x-1/2">
      <header className="grid gap-4 rounded-2xl bg-gradient-to-r from-primary/5 via-background to-primary/5 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <Link href={`/admin/misa-employees?month=${month}`} className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <ChevronLeft aria-hidden="true" className="size-4" /> Nhân viên
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">
            {result ? `Khách hàng của ${result.employee.name}` : 'Khách hàng MISA'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            SL KH phụ trách · {formatVietnamMonth(month)}
            {result ? ` · Tìm thấy ${result.total} / ${result.employee.customerCount} khách hàng` : ''}
          </p>
        </div>
        {result && (
          <Card className="flex flex-wrap items-center gap-3 rounded-2xl bg-card/90 px-4 py-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UserRound aria-hidden="true" className="size-7" /></span>
            <div className="min-w-28 flex-1">
              <p className="font-semibold text-heading">{result.employee.name}</p>
              <p className="text-xs text-muted-foreground">Nhân viên</p>
            </div>
            <div className="border-l border-border pl-4 text-center">
              <p className="text-xl font-bold tabular-nums text-primary">{result.employee.customerCount}</p>
              <p className="text-xs text-muted-foreground">Khách hàng</p>
            </div>
            <div className="border-l border-border pl-4 text-center">
              <p className="text-xl font-bold tabular-nums text-primary">{result.total}</p>
              <p className="text-xs text-muted-foreground">Tìm thấy</p>
            </div>
          </Card>
        )}
      </header>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="xl:col-span-2"><CustomerGroupSummary counts={groupCounts} /></div>
        <div className="xl:col-span-2"><CustomerCommitmentProgress stats={commitmentStats} /></div>
        <Card flush className="min-w-0 overflow-hidden rounded-2xl">
          {result && <MisaCustomerToolbar employeeId={employeeId} month={month} monthLabel={formatVietnamMonth(month)} filters={filters} searchQuery={searchQuery} rows={result.rows} />}
          {error ? (
            <div className="flex flex-col items-start gap-3 p-5">
              <p role="alert" className="text-sm text-destructive">Không tải được khách hàng đã đồng bộ. Hãy thử lại sau.</p>
              <Link href={pageHref(page)} className={buttonClassName({ variant: 'secondary' })}>Thử lại</Link>
            </div>
          ) : result && result.rows.length === 0 ? (
            <div className="flex flex-col items-start gap-3 p-5">
              <UsersRound aria-hidden="true" className="size-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Không có khách hàng phù hợp.</p>
              <Link href={`${path}?month=${month}`} className={buttonClassName({ variant: 'secondary' })}>Bỏ tìm kiếm và bộ lọc</Link>
            </div>
          ) : result ? (
            <>
              <MisaCustomerTable rows={result.rows} employeeName={result.employee.name} employeeId={employeeId} month={month} startIndex={firstRow} />
              <nav aria-label="Phân trang khách hàng MISA" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3 text-sm">
                <p className="text-muted-foreground">Hiển thị {firstRow + 1}–{lastRow} trong {result.total} khách hàng · {result.pageSize} / trang</p>
                <div className="flex items-center gap-1">
                  {result.page > 1 && <Link href={pageHref(1)} aria-label="Trang đầu" className="grid size-11 place-items-center rounded-lg text-heading hover:bg-primary/5"><ChevronsLeft aria-hidden="true" className="size-4" /></Link>}
                  {result.page > 1 && <Link href={pageHref(result.page - 1)} aria-label="Trang trước" className="grid size-11 place-items-center rounded-lg text-heading hover:bg-primary/5"><ChevronLeft aria-hidden="true" className="size-4" /></Link>}
                  <div className="hidden items-center gap-1 sm:flex">
                    {visiblePages.map((visiblePage) => (
                      <Link key={visiblePage} href={pageHref(visiblePage)} aria-current={visiblePage === result.page ? 'page' : undefined}
                        className={visiblePage === result.page ? 'grid size-11 place-items-center rounded-lg bg-primary font-semibold text-primary-foreground' : 'grid size-11 place-items-center rounded-lg text-heading hover:bg-primary/5'}>
                        {visiblePage}
                      </Link>
                    ))}
                  </div>
                  <span className="px-2 tabular-nums text-muted-foreground sm:hidden">{result.page}/{result.totalPages}</span>
                  {result.page < result.totalPages && <Link href={pageHref(result.page + 1)} aria-label="Trang sau" className="grid size-11 place-items-center rounded-lg text-heading hover:bg-primary/5"><ChevronRight aria-hidden="true" className="size-4" /></Link>}
                  {result.page < result.totalPages && <Link href={pageHref(result.totalPages)} aria-label="Trang cuối" className="grid size-11 place-items-center rounded-lg text-heading hover:bg-primary/5"><ChevronsRight aria-hidden="true" className="size-4" /></Link>}
                </div>
              </nav>
            </>
          ) : null}
        </Card>
        <CustomerFilterPanel key={misaCustomerQuery(month, filters)} employeeId={employeeId} month={month} filters={filters} searchQuery={searchQuery} />
      </div>
    </div>
  );
}
