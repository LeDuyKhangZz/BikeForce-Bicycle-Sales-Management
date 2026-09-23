'use client';

import { CalendarDays, ChevronDown, Download, Search } from 'lucide-react';
import Link from 'next/link';

import { MISA_CUSTOMER_FILTER_FIELDS, type MisaCustomerFilters } from '@/lib/amis/customer-filters';
import { buildMisaCustomerCsv } from '@/lib/amis/customer-export';
import type { MisaCustomer } from '@/types/misa-customer';

type Props = {
  employeeId: number;
  month: string;
  monthLabel: string;
  filters: MisaCustomerFilters;
  searchQuery: string;
  rows: MisaCustomer[];
};

export function MisaCustomerToolbar({ employeeId, month, monthLabel, filters, searchQuery, rows }: Props) {
  function exportPage() {
    const content = buildMisaCustomerCsv(rows);
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `misa-khach-hang-${employeeId}-${month}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border p-3 sm:p-4">
      <form action={`/admin/misa-employees/${employeeId}`} method="get" className="flex min-w-[min(100%,18rem)] flex-1 items-end gap-2">
        <input type="hidden" name="month" value={month} />
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
        <button type="submit" aria-label="Tìm kiếm khách hàng" className="grid size-12 shrink-0 place-items-center rounded-xl border border-input-border text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Search aria-hidden="true" className="size-5" />
        </button>
      </form>
      <Link href={`/admin/misa-employees?month=${month}`} title="Chọn tháng ở danh sách nhân viên"
        className="flex min-h-12 items-center gap-2 rounded-xl border border-input-border bg-primary/5 px-3 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <CalendarDays aria-hidden="true" className="size-5" /> {monthLabel} <ChevronDown aria-hidden="true" className="size-4" />
      </Link>
      <button type="button" onClick={exportPage} title="Xuất các dòng của trang hiện tại thành CSV mở bằng Excel"
        className="flex min-h-12 items-center gap-2 rounded-xl border border-input-border bg-primary/5 px-4 font-semibold text-heading hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Download aria-hidden="true" className="size-5" /> Xuất Excel
      </button>
    </div>
  );
}
