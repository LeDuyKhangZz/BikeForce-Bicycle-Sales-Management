import Link from 'next/link';
import { CalendarDays, ChevronDown, Download, Search } from 'lucide-react';
import { MISA_CUSTOMER_FILTER_FIELDS, type MisaCustomerFilters } from '@/lib/amis/customer-filters';
import { formatVietnamMonth } from '@/lib/date';

type Props = { path: string; month: string; monthLabel: string; filters: MisaCustomerFilters; searchQuery: string; salesMonths: string[]; selectedSalesMonth?: string; onExport: () => void };
const CONTROL = 'flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-input-border bg-primary/5 px-2 text-xs font-semibold text-primary focus-visible:outline-2 focus-visible:outline-ring';

export function CustomerMobileToolbar({ path, month, monthLabel, filters, searchQuery, salesMonths, selectedSalesMonth, onExport }: Props) {
  return (
    <div className="space-y-3 p-3">
      <h2 className="text-lg font-bold text-heading">Tìm khách hàng</h2>
      <form action={path} method="get" className="space-y-3">
        <input type="hidden" name="month" value={month} />
        {MISA_CUSTOMER_FILTER_FIELDS.flatMap((field) => {
          const filter = filters[field.key];
          return filter ? [<input key={`${field.key}-use`} type="hidden" name={`use_${field.key}`} value="1" />, <input key={`${field.key}-op`} type="hidden" name={`op_${field.key}`} value={filter.operator} />, <input key={field.key} type="hidden" name={field.key} value={filter.value} />] : [];
        })}
        <div>
          <label htmlFor="mobile-customer-search" className="mb-1 block text-xs text-muted-foreground">Mã, tên khách hàng hoặc địa chỉ</label>
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-input-border bg-primary/[0.025] px-2">
              <Search aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <input id="mobile-customer-search" type="search" name="q" defaultValue={searchQuery} maxLength={120} enterKeyHint="search" placeholder="Nhập điều kiện tìm kiếm" className="min-h-12 min-w-0 flex-1 bg-transparent text-base focus-visible:outline-2 focus-visible:outline-ring" />
            </div>
            <button type="submit" className="min-h-12 shrink-0 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring">Tìm</button>
          </div>
        </div>
        <div>
          <label htmlFor="mobile-sales-month" className="mb-1 block text-xs font-medium text-muted-foreground">Doanh số theo tháng</label>
          <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
            <div className="flex min-w-0 items-center gap-1 rounded-xl border border-input-border bg-primary/5 px-2 text-primary focus-within:outline-2 focus-within:outline-ring">
              <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
              <select id="mobile-sales-month" name="salesMonth" defaultValue={selectedSalesMonth} disabled={!salesMonths.length} className="min-h-12 min-w-0 flex-1 appearance-none bg-transparent p-0 text-base font-semibold focus:outline-none">
                {!salesMonths.length && <option value="">Chưa có dữ liệu</option>}
                {salesMonths.map((value) => <option key={value} value={value}>{formatVietnamMonth(value)}</option>)}
              </select>
              <ChevronDown aria-hidden="true" className="size-3 shrink-0" />
            </div>
            <button type="submit" className={CONTROL}>Xem</button>
          </div>
        </div>
      </form>
      <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
        <Link href={`${path}?month=${month}`} title="Tháng danh sách khách hàng" className={CONTROL}><CalendarDays aria-hidden="true" className="size-4 shrink-0" /><span className="min-w-0">{monthLabel}</span><ChevronDown aria-hidden="true" className="size-3 shrink-0" /></Link>
        <button type="button" onClick={onExport} title="Xuất CSV của trang hiện tại, mở bằng Excel" className={CONTROL}><Download aria-hidden="true" className="size-4 shrink-0" />Xuất Excel</button>
      </div>
    </div>
  );
}
