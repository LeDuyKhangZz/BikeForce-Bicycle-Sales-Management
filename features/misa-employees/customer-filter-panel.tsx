'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Filter, RotateCcw, Search } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { MISA_CUSTOMER_FILTER_FIELDS, MISA_FILTER_OPERATORS, type MisaCustomerFilterKey, type MisaCustomerFilters } from '@/lib/amis/customer-filters';

type Props = {
  employeeId: number;
  path?: string;
  month: string;
  filters: MisaCustomerFilters;
  searchQuery: string;
};

export function CustomerFilterPanel({ employeeId, path = `/admin/misa-employees/${employeeId}`, month, filters, searchQuery }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Set<MisaCustomerFilterKey>>(
    () => new Set(MISA_CUSTOMER_FILTER_FIELDS.filter((field) => filters[field.key] !== undefined).map((field) => field.key)),
  );
  const [operators, setOperators] = useState<Partial<Record<MisaCustomerFilterKey, number>>>(() =>
    Object.fromEntries(MISA_CUSTOMER_FILTER_FIELDS.flatMap((field) => {
      const filter = filters[field.key];
      return filter ? [[field.key, filter.operator]] : [];
    })),
  );
  const resetQuery = new URLSearchParams({ month });
  if (searchQuery) resetQuery.set('q', searchQuery);
  const activeCount = Object.keys(filters).length;

  function toggle(key: MisaCustomerFilterKey) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <aside aria-label="Tiêu chí lọc khách hàng" className="order-1 min-w-0 overflow-hidden rounded-2xl border border-input-border bg-card shadow-sm">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="misa-customer-filter-form"
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-16 w-full items-center justify-between gap-3 bg-primary/5 px-4 py-3 text-left hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Filter aria-hidden="true" className="size-5" /></span>
          <span><span className="block font-bold text-heading">Bộ lọc khách hàng</span><span className="block text-xs font-normal text-muted-foreground">{activeCount > 0 ? `Đang áp dụng ${activeCount} điều kiện` : 'Lọc theo mã, tên, khu vực, công nợ và ngày mua'}</span></span>
        </span>
        <span className="flex shrink-0 items-center gap-2 font-semibold text-primary"><span className="hidden sm:inline">{expanded ? 'Thu gọn' : 'Mở bộ lọc'}</span><ChevronDown aria-hidden="true" className={`size-5 transition-transform ${expanded ? 'rotate-180' : ''}`} /></span>
      </button>
      <div id="misa-customer-filter-form" className={expanded ? 'border-t border-border p-4' : 'hidden'}>
        <form action={path} method="get" className="flex flex-col gap-3">
          <input type="hidden" name="month" value={month} />
          {searchQuery && <input type="hidden" name="q" value={searchQuery} />}
          <div role="group" aria-label="Các tiêu chí lọc" className="grid max-h-[min(42dvh,16rem)] grid-cols-1 gap-2 overflow-y-auto overscroll-contain pr-1 md:grid-cols-2 xl:grid-cols-3">
          {MISA_CUSTOMER_FILTER_FIELDS.map((field) => {
            const checked = selected.has(field.key);
            const inputId = `misa-filter-${field.key}`;
            const operatorOptions = MISA_FILTER_OPERATORS[field.kind];
            const operator = operatorOptions.find((option) => option.code === operators[field.key]) ?? operatorOptions[0];
            const valueLabel = field.kind === 'text' ? 'Giá trị'
              : field.kind === 'date' ? 'Ngày'
              : field.key === 'daysWithoutPurchase' ? 'Số ngày' : 'Số tiền (VND)';
            return (
              <div key={field.key} className={`rounded-xl border p-2 ${checked ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-heading">
                  <input
                    type="checkbox"
                    name={`use_${field.key}`}
                    value="1"
                    checked={checked}
                    onChange={() => toggle(field.key)}
                    className="size-5 shrink-0 accent-primary"
                  />
                  <span>{field.label}</span>
                </label>
                {checked && operator && (
                  <div className="pb-1 pl-8 pr-1">
                    <label htmlFor={`${inputId}-operator`} className="mb-1 block text-sm text-muted-foreground">Điều kiện</label>
                    <select
                      id={`${inputId}-operator`}
                      name={`op_${field.key}`}
                      value={operator.code}
                      onChange={(event) => setOperators((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
                      className="min-h-12 w-full rounded-lg border border-input-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {operatorOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
                    </select>
                    {operator.needsValue && (
                      <div className="mt-2">
                        <label htmlFor={inputId} className="mb-1 block text-sm text-muted-foreground">{valueLabel}</label>
                        <input
                          id={inputId}
                          name={field.key}
                          type={field.kind === 'date' ? 'date' : field.kind === 'number' ? 'number' : 'text'}
                          inputMode={field.kind === 'number' ? 'numeric' : undefined}
                          step={field.kind === 'number' ? '1' : undefined}
                          defaultValue={filters[field.key]?.value ?? ''}
                          required
                          className="min-h-12 w-full rounded-lg border border-input-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <Link href={`${path}?${resetQuery}`} className={buttonClassName({ variant: 'secondary' })}><RotateCcw aria-hidden="true" className="size-4" /> Đặt lại</Link>
            <button type="submit" className={buttonClassName()}>
              <Search aria-hidden="true" className="size-4" /> Áp dụng bộ lọc
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
