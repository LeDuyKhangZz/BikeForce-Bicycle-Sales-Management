'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  Warehouse,
  X,
} from 'lucide-react';

import {
  inventoryPath,
  type InventoryFilters,
} from '@/lib/operations/filters';
import type { WarehouseCardViewModel } from '@/lib/operations/view-models';
import { cn } from '@/lib/utils';

type Props = {
  warehouses: readonly WarehouseCardViewModel[];
  filters: InventoryFilters;
};

export function WarehouseQuickGrid({ warehouses, filters }: Props) {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const normalizedQuery = query.trim().toLowerCase();
  const visibleWarehouses =
    normalizedQuery === ''
      ? warehouses
      : warehouses.filter((w) =>
          w.warehouseCode.toLowerCase().includes(normalizedQuery),
        );

  return (
    <section
      aria-label="Chọn nhanh theo kho hàng"
      className="flex flex-col gap-3.5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-status-info-bg text-primary"
          >
            <Warehouse className="size-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-heading">
                Chọn nhanh theo kho
              </h2>
              {filters.warehouse !== null && (
                <Link
                  href={inventoryPath({ ...filters, warehouse: null })}
                  className="inline-flex min-h-7 items-center gap-1 rounded-full bg-status-info-bg px-2.5 py-0.5 text-xs font-semibold text-status-info-fg hover:bg-primary hover:text-card"
                >
                  Đang lọc: {filters.warehouse}
                  <X aria-hidden="true" className="size-3.5" />
                </Link>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Nhấp vào một kho để xem chi tiết tồn kho, danh sách hàng hóa và số
              lượng theo kho.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64 md:flex-none">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm kho..."
              aria-label="Tìm kiếm kho hàng"
              className="min-h-11 w-full rounded-lg border border-input-border bg-card py-2 pr-3 pl-9 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:text-sm"
            />
          </div>

          <div
            role="group"
            aria-label="Chế độ hiển thị danh sách kho"
            className="inline-flex items-center rounded-lg border border-border bg-card p-1"
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label="Hiển thị dạng lưới"
              title="Hiển thị dạng lưới"
              className={cn(
                'grid size-9 touch-manipulation place-items-center rounded-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                viewMode === 'grid'
                  ? 'bg-primary text-card shadow-xs'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )}
            >
              <LayoutGrid aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="Hiển thị dạng danh sách"
              title="Hiển thị dạng danh sách"
              className={cn(
                'grid size-9 touch-manipulation place-items-center rounded-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                viewMode === 'list'
                  ? 'bg-primary text-card shadow-xs'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )}
            >
              <List aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {visibleWarehouses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Không tìm thấy kho nào khớp với từ khoá &ldquo;{query.trim()}&rdquo;.
        </div>
      ) : (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
              : 'grid grid-cols-1 gap-2 md:grid-cols-2',
          )}
        >
          {visibleWarehouses.map((w) => {
            const nextWarehouse = w.isSelected ? null : w.warehouseCode;
            const href = `${inventoryPath({ ...filters, warehouse: nextWarehouse })}#inventory-detail`;
            return (
              <Link
                key={w.warehouseCode}
                href={href}
                className={cn(
                  'group flex min-h-18 items-center gap-3 rounded-xl border p-3.5 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  w.isSelected
                    ? 'border-primary bg-status-info-bg text-status-info-fg ring-2 ring-primary/20 shadow-xs'
                    : 'border-border bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-primary/50 hover:bg-background',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-lg transition-colors duration-150',
                    w.isSelected
                      ? 'bg-primary text-card'
                      : 'bg-status-info-bg text-primary group-hover:bg-primary group-hover:text-card',
                  )}
                >
                  <Warehouse className="size-5" />
                </span>

                <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold text-heading">
                      {w.warehouseCode}
                    </span>
                    <span className="tabular shrink-0 text-xs font-semibold text-foreground">
                      SL: {w.quantityOnHandDisplay}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular truncate text-xs text-muted-foreground">
                      {w.inStockCountDisplay}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

