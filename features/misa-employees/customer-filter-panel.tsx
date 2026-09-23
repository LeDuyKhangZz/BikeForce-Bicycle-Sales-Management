'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Filter, RotateCcw, Search } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { MISA_CUSTOMER_FILTER_FIELDS, MISA_FILTER_OPERATORS, type MisaCustomerFilterKey, type MisaCustomerFilters } from '@/lib/amis/customer-filters';

type Props = {
  employeeId: number;
  month: string;
  filters: MisaCustomerFilters;
  searchQuery: string;
};

export function CustomerFilterPanel({ employeeId, month, filters, searchQuery }: Props) {
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
  const path = `/admin/misa-employees/${employeeId}`;
  const resetQuery = new URLSearchParams({ month });
  if (searchQuery) resetQuery.set('q', searchQuery);

  function toggle(key: MisaCustomerFilterKey) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <aside aria-label="Tiêu chí lọc khách hàng" className="order-first min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm xl:order-last xl:sticky xl:top-20 xl:self-start">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="misa-customer-filter-form"
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-11 w-full items-center gap-2 text-left font-semibold text-heading xl:hidden"
      >
        <Filter aria-hidden="true" className="size-5" /> Tiêu chí lọc
      </button>
      <div id="misa-customer-filter-form" className={expanded ? 'block' : 'hidden xl:block'}>
        <div className="mb-3 hidden items-center justify-between gap-2 xl:flex">
          <h2 className="flex items-center gap-2 font-semibold text-heading"><Filter aria-hidden="true" className="size-5 text-primary" /> Bộ lọc</h2>
          <Link href={`${path}?${resetQuery}`} className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-primary hover:underline"><RotateCcw aria-hidden="true" className="size-4" /> Đặt lại</Link>
        </div>
        <p className="mb-2 text-xs font-semibold text-heading">TIÊU CHÍ LỌC</p>
        <form action={path} method="get" className="flex flex-col gap-2">
          <input type="hidden" name="month" value={month} />
          {searchQuery && <input type="hidden" name="q" value={searchQuery} />}
          <div role="group" aria-label="Các tiêu chí lọc" className="max-h-[min(45dvh,20rem)] overflow-y-auto overscroll-contain pr-1">
          {MISA_CUSTOMER_FILTER_FIELDS.map((field) => {
            const checked = selected.has(field.key);
            const inputId = `misa-filter-${field.key}`;
            const operatorOptions = MISA_FILTER_OPERATORS[field.kind];
            const operator = operatorOptions.find((option) => option.code === operators[field.key]) ?? operatorOptions[0];
            const valueLabel = field.kind === 'text' ? 'Giá trị'
              : field.kind === 'date' ? 'Ngày'
              : field.key === 'daysWithoutPurchase' ? 'Số ngày' : 'Số tiền (VND)';
            return (
              <div key={field.key} className="border-b border-border/60 pb-2 last:border-b-0">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-heading">
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
                  <div className="pb-2 pl-8">
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
          <div className="mt-2 flex flex-col gap-2">
            <button type="submit" className={buttonClassName({ className: 'w-full' })}>
              <Search aria-hidden="true" className="size-4" /> Áp dụng bộ lọc
            </button>
            <Link href={`${path}?${resetQuery}`} className={buttonClassName({ variant: 'secondary', className: 'w-full xl:hidden' })}>Đặt lại</Link>
          </div>
        </form>
      </div>
    </aside>
  );
}
