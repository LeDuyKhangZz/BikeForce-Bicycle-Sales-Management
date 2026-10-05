'use client';

import { CalendarDays, ChevronDown, Download, FileSpreadsheet, Search } from 'lucide-react';
import Link from 'next/link';
import { CustomerMobileToolbar } from '@/features/misa-employees/customer-mobile-toolbar';

import { CustomerPlanImport } from '@/features/misa-employees/customer-plan-import';
import { MISA_CUSTOMER_FILTER_FIELDS, type MisaCustomerFilters } from '@/lib/amis/customer-filters';
import { buildMisaCustomerCsv } from '@/lib/amis/customer-export';
import { formatVietnamMonth } from '@/lib/date';
import type { MisaCustomer } from '@/types/misa-customer';
import type { CustomerRevenueGroup } from '@/lib/amis/customer-revenue-group';
import type { CustomerAlert } from '@/lib/amis/customer-alerts';
import type { CustomerCommitmentFilter } from '@/lib/amis/customer-commitment-filter';

type Props = {
  employeeId: number;
  path?: string;
  monthPickerPath?: string;
  month: string;
  monthLabel: string;
  filters: MisaCustomerFilters;
  searchQuery: string;
  rows: MisaCustomer[];
  showPlanImport?: boolean;
  alert?: CustomerAlert;
  group?: CustomerRevenueGroup;
  salesMonths?: string[];
  selectedSalesMonth?: string;
  compact?: boolean;
  salesMobile?: boolean;
  commitment?: CustomerCommitmentFilter;
};

export function MisaCustomerToolbar({ employeeId, path = `/admin/misa-employees/${employeeId}`, monthPickerPath = '/admin/misa-employees', month, monthLabel, filters, searchQuery, rows, showPlanImport = true, alert, group, salesMonths = [], selectedSalesMonth, compact = false, salesMobile = false, commitment }: Props) {
  function exportPage() {
    const content = buildMisaCustomerCsv(rows);
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `misa-khach-hang-${employeeId}-${month}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (compact) return (
    <div className="space-y-3 p-3 sm:p-4">
      <form action={path} method="get" className="space-y-3">
        <input type="hidden" name="month" value={month} />
        {commitment && <input type="hidden" name="commitment" value={commitment} />}
        {alert && <input type="hidden" name="alert" value={alert} />}
        {group && <input type="hidden" name="group" value={group} />}
        {MISA_CUSTOMER_FILTER_FIELDS.flatMap((field) => {
          const filter = filters[field.key];
          return filter ? [<input key={`${field.key}-use`} type="hidden" name={`use_${field.key}`} value="1" />, <input key={`${field.key}-op`} type="hidden" name={`op_${field.key}`} value={filter.operator} />, <input key={field.key} type="hidden" name={field.key} value={filter.value} />] : [];
        })}
        <div>
          <label htmlFor="popup-customer-search" className="mb-1 block text-xs font-medium text-muted-foreground">Tìm khách hàng</label>
          <div className="flex items-center gap-1 rounded-full border border-input-border bg-primary/5 pl-3 pr-1">
            <input id="popup-customer-search" name="q" type="search" defaultValue={searchQuery} maxLength={120} enterKeyHint="search" placeholder="Mã, tên khách hàng hoặc địa chỉ…" className="min-h-12 min-w-0 flex-1 rounded-full bg-transparent text-base focus-visible:outline-2 focus-visible:outline-ring" />
            <button type="submit" aria-label="Tìm khách hàng" className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"><Search aria-hidden="true" className="size-5" /></button>
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <div className="min-w-0">
            <label htmlFor="popup-sales-month" className="mb-1 block text-xs font-medium text-muted-foreground">Doanh số theo tháng</label>
            <div className="flex min-h-12 min-w-0 items-center gap-1 rounded-full border border-input-border bg-primary/5 px-2 text-primary focus-within:outline-2 focus-within:outline-ring">
              <CalendarDays aria-hidden="true" className="pointer-events-none size-4 shrink-0" />
              <select id="popup-sales-month" name="salesMonth" defaultValue={selectedSalesMonth} disabled={salesMonths.length === 0} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="min-h-12 min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-base font-semibold text-primary focus:outline-none">
                {salesMonths.length === 0 && <option value="">Chưa có dữ liệu</option>}
                {salesMonths.map((salesMonth) => <option key={salesMonth} value={salesMonth}>{formatVietnamMonth(salesMonth)}</option>)}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none size-3 shrink-0" />
            </div>
          </div>
          <button type="button" onClick={exportPage} title="Xuất trang hiện tại thành CSV mở bằng Excel" className="flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-brand-sm hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"><Download aria-hidden="true" className="size-4" />Xuất Excel</button>
        </div>
        <p className="text-xs text-muted-foreground">Danh sách khách hàng: {monthLabel}</p>
      </form>
    </div>
  );

  return (
    <>
    {salesMobile && <div className="md:hidden"><CustomerMobileToolbar path={path} month={month} monthLabel={monthLabel} filters={filters} searchQuery={searchQuery} salesMonths={salesMonths} selectedSalesMonth={selectedSalesMonth} onExport={exportPage} /></div>}
    <div className={`${salesMobile ? 'hidden md:flex' : 'flex'} flex-wrap items-end gap-3 border-b border-border p-3 sm:p-4`}>
      <h2 className="w-full text-lg font-bold text-heading xl:hidden">Tìm khách hàng</h2>
      <form action={path} method="get" className="flex min-w-[min(100%,18rem)] flex-1 items-end gap-2">
        <input type="hidden" name="month" value={month} />
        {alert && <input type="hidden" name="alert" value={alert} />}
        {group && <input type="hidden" name="group" value={group} />}
        {selectedSalesMonth && <input type="hidden" name="salesMonth" value={selectedSalesMonth} />}
        {MISA_CUSTOMER_FILTER_FIELDS.flatMap((field) => {
          const filter = filters[field.key];
          if (!filter) return [];
          return [
            <input key={`${field.key}-use`} type="hidden" name={`use_${field.key}`} value="1" />,
            <input key={`${field.key}-op`} type="hidden" name={`op_${field.key}`} value={filter.operator} />,
            <input key={`${field.key}-value`} type="hidden" name={field.key} value={filter.value} />,
          ];
        })}
        <div className="min-w-0 flex-1">
          <label htmlFor="misa-customer-search" className="mb-1 block text-xs font-medium text-muted-foreground">Tìm khách hàng</label>
          <input id="misa-customer-search" name="q" type="search" defaultValue={searchQuery} maxLength={120}
            placeholder="Mã, tên khách hàng hoặc địa chỉ..."
            className="min-h-12 w-full rounded-xl border border-input-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        </div>
        <button type="submit" aria-label="Tìm kiếm khách hàng" className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-brand-sm hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Search aria-hidden="true" className="size-5" />
          <span className="hidden sm:inline">Tìm</span>
        </button>
      </form>
      {salesMonths.length > 0 && <form action={path} method="get" className="flex items-end gap-2">
        <input type="hidden" name="month" value={month} />
        {searchQuery && <input type="hidden" name="q" value={searchQuery} />}
        {alert && <input type="hidden" name="alert" value={alert} />}
        {group && <input type="hidden" name="group" value={group} />}
        <div><label htmlFor="report44-sales-month" className="mb-1 block text-xs font-medium text-muted-foreground">Doanh số theo tháng</label>
          <select id="report44-sales-month" name="salesMonth" defaultValue={selectedSalesMonth} className="min-h-12 rounded-xl border border-input-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            {salesMonths.map((salesMonth) => <option key={salesMonth} value={salesMonth}>{formatVietnamMonth(salesMonth)}</option>)}
          </select></div>
        <button type="submit" className="min-h-12 rounded-xl border border-input-border bg-primary/5 px-4 font-semibold text-heading hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Xem</button>
      </form>}
      <Link href={`${monthPickerPath}?month=${month}`} title="Chọn tháng"
        className="flex min-h-12 items-center gap-2 rounded-xl border border-input-border bg-primary/5 px-3 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <CalendarDays aria-hidden="true" className="size-5" /> {monthLabel} <ChevronDown aria-hidden="true" className="size-4" />
      </Link>
      <button type="button" onClick={exportPage} title="Xuất các dòng của trang hiện tại thành CSV mở bằng Excel"
        className="flex min-h-12 items-center gap-2 rounded-xl border border-input-border bg-primary/5 px-4 font-semibold text-heading hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Download aria-hidden="true" className="size-5" /> Xuất Excel
      </button>
      {showPlanImport && <>
        <a href={`/api/admin/misa-employees/${employeeId}/plans/template?month=${month}`}
          className="flex min-h-12 items-center gap-2 rounded-xl border border-input-border bg-primary/5 px-4 font-semibold text-heading hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <FileSpreadsheet aria-hidden="true" className="size-5" /> Tải file Excel mẫu
        </a>
        <CustomerPlanImport employeeId={employeeId} month={month} />
      </>}
    </div>
    </>
  );
}
