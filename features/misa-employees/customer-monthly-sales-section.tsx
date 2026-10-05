import Link from 'next/link';
import { BarChart3, ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatMisaAmount } from '@/lib/amis/customer-display';
import { formatVietnamMonth } from '@/lib/date';
import type { MisaCustomerMonthlySalesPage } from '@/services/misa-report44';

type Props = {
  directoryMonth: string;
  months: string[];
  selectedMonth: string | undefined;
  searchQuery: string;
  result: MisaCustomerMonthlySalesPage | null;
  error: string | null;
};

export function CustomerMonthlySalesSection({
  directoryMonth,
  months,
  selectedMonth,
  searchQuery,
  result,
  error,
}: Props) {
  const selectedIndex = selectedMonth ? months.indexOf(selectedMonth) : -1;
  const newerMonth = selectedIndex > 0 ? months[selectedIndex - 1] : undefined;
  const olderMonth = selectedIndex >= 0 ? months[selectedIndex + 1] : undefined;
  const href = (salesMonth: string, page = 1) => {
    const params = new URLSearchParams({ month: directoryMonth, salesMonth });
    if (searchQuery) params.set('salesQuery', searchQuery);
    if (page > 1) params.set('salesPage', String(page));
    return `/admin/misa-employees?${params.toString()}`;
  };
  const firstRow = result ? (result.page - 1) * result.pageSize + 1 : 0;
  const lastRow = result ? Math.min(firstRow + result.rows.length - 1, result.total) : 0;

  return (
    <section aria-labelledby="customer-monthly-sales-title" className="flex flex-col gap-3">
      <header className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-primary/5 via-background to-primary/5 p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BarChart3 aria-hidden="true" className="size-7" /></span>
        <div><h2 id="customer-monthly-sales-title" className="text-2xl font-bold tracking-tight text-heading">Doanh số đơn hàng theo khách hàng</h2><p className="mt-1 text-sm text-muted-foreground">AMIS CRM · Báo cáo 44/0 · Đã ghi · Đơn hàng và trả lại hàng bán</p></div>
      </header>

      <Card className="flex flex-wrap items-end gap-3 rounded-2xl">
        <form action="/admin/misa-employees" method="get" className="flex min-w-[min(100%,18rem)] flex-1 items-end gap-2">
          <input type="hidden" name="month" value={directoryMonth} />
          {selectedMonth && <input type="hidden" name="salesMonth" value={selectedMonth} />}
          <div className="min-w-0 flex-1"><label htmlFor="customer-sales-search" className="mb-1 block text-sm font-medium text-heading">Tìm khách hàng</label><input id="customer-sales-search" name="salesQuery" type="search" defaultValue={searchQuery} maxLength={120} placeholder="Mã hoặc tên khách hàng..." className="min-h-12 w-full rounded-xl border border-input-border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" /></div>
          <button type="submit" className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><Search aria-hidden="true" className="size-5" /> Tìm</button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {olderMonth && <Link href={href(olderMonth)} className={buttonClassName({ variant: 'secondary' })}><ChevronLeft aria-hidden="true" className="size-4" /> Tháng trước</Link>}
          <span className="flex min-h-12 items-center rounded-xl border border-input-border bg-primary/5 px-4 font-semibold text-heading">{selectedMonth ? formatVietnamMonth(selectedMonth) : 'Chưa có kỳ dữ liệu'}</span>
          {newerMonth && <Link href={href(newerMonth)} className={buttonClassName({ variant: 'secondary' })}>Tháng sau <ChevronRight aria-hidden="true" className="size-4" /></Link>}
        </div>
      </Card>

      {error ? <Card role="alert" className="rounded-2xl text-sm text-destructive">{error}</Card> : !selectedMonth ? <Card className="rounded-2xl text-sm text-muted-foreground">Chưa đồng bộ dữ liệu report 44.</Card> : result ? (
        <Card flush className="overflow-hidden rounded-2xl">
          <div className="hidden md:block"><table className="w-full table-fixed text-left"><caption className="sr-only">Doanh số khách hàng {formatVietnamMonth(selectedMonth)}</caption><colgroup><col className="w-[22%]" /><col /><col className="w-[24%]" /></colgroup><thead className="bg-primary/5 text-heading"><tr><th className="px-4 py-3">Mã khách hàng</th><th className="px-4 py-3">Tên khách hàng</th><th className="px-4 py-3 text-right">Doanh số đơn hàng</th></tr></thead><tbody>{result.rows.map((row, index) => <tr key={row.customerCode} className={index % 2 === 1 ? 'bg-primary/[0.035]' : 'bg-card'}><th scope="row" className="break-words px-4 py-3 font-semibold text-primary">{row.customerCode}</th><td className="break-words px-4 py-3">{row.customerName || '—'}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMisaAmount(row.orderSales)}</td></tr>)}</tbody></table></div>
          <ol className="divide-y divide-border md:hidden">{result.rows.map((row) => <li key={row.customerCode} className="p-4"><p className="text-sm font-semibold text-primary">{row.customerCode}</p><h3 className="mt-1 break-words text-lg font-bold text-heading">{row.customerName || '—'}</h3><p className="mt-3 text-sm text-muted-foreground">Doanh số đơn hàng</p><p className="mt-1 text-xl font-bold tabular-nums text-heading">{formatMisaAmount(row.orderSales)}</p></li>)}</ol>
          <nav aria-label="Phân trang doanh số khách hàng" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm"><p className="text-muted-foreground">{result.total === 0 ? 'Không có khách hàng phù hợp' : `Hiển thị ${firstRow}–${lastRow} trong ${result.total} khách hàng`}</p><div className="flex items-center gap-2">{result.page > 1 && <Link href={href(selectedMonth, result.page - 1)} className={buttonClassName({ variant: 'secondary' })}>Trước</Link>}<span className="tabular-nums text-muted-foreground">{result.page}/{result.totalPages}</span>{result.page < result.totalPages && <Link href={href(selectedMonth, result.page + 1)} className={buttonClassName({ variant: 'secondary' })}>Sau</Link>}</div></nav>
        </Card>
      ) : null}
    </section>
  );
}
