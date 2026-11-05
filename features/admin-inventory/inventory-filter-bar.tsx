'use client';

import Form from 'next/form';
import Link from 'next/link';
import { Boxes, RotateCcw, Search } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkSpinner } from '@/components/ui/link-spinner';
import { PendingSubmitButton } from '@/components/ui/pending-submit-button';
import {
  ADMIN_INVENTORY_PATH,
  hasActiveInventoryFilters,
  MAX_OPERATIONS_SEARCH_LENGTH,
  OPERATIONS_PARAMS,
  type InventoryFilters,
} from '@/lib/operations/filters';
import type { WarehouseCardViewModel } from '@/lib/operations/view-models';

const SELECT_CLASS =
  'min-h-13 w-full rounded-md border border-input-border/70 bg-background px-3.5 text-base text-foreground transition-[background-color,border-color,box-shadow] duration-200 focus:bg-card focus:shadow-brand-sm';

type Props = {
  filters: InventoryFilters;
  warehouses: readonly WarehouseCardViewModel[];
};

export function InventoryFilterBar({ filters, warehouses }: Props) {
  const hasFilters = hasActiveInventoryFilters(filters);

  return (
    <Card className="flex flex-col gap-5 md:p-5">
      <div className="flex items-start gap-3 md:items-center">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-md bg-status-info-bg text-status-info-fg"
        >
          <Boxes className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-heading">Tìm và lọc tồn kho MISA</h2>
          <p className="text-sm text-muted-foreground">
            Tra cứu theo mã hàng, tên sản phẩm, mã kho hoặc trạng thái còn hàng.
          </p>
        </div>
      </div>

      <Form action={ADMIN_INVENTORY_PATH} className="flex flex-col gap-4 md:gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="inventory-search">Mã hoặc tên sản phẩm</Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="inventory-search"
                name={OPERATIONS_PARAMS.SEARCH}
                type="search"
                defaultValue={filters.search ?? ''}
                maxLength={MAX_OPERATIONS_SEARCH_LENGTH}
                placeholder="Ví dụ: XE-26..."
                enterKeyHint="search"
                autoCapitalize="none"
                className="pl-11"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="inventory-warehouse">Kho hàng MISA</Label>
            <select
              key={`warehouse-${filters.warehouse ?? 'all'}`}
              id="inventory-warehouse"
              name={OPERATIONS_PARAMS.WAREHOUSE}
              defaultValue={filters.warehouse ?? ''}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className={SELECT_CLASS}
            >
              <option value="">Tất cả các kho ({warehouses.length})</option>
              {warehouses.map((w) => (
                <option key={w.warehouseCode} value={w.warehouseCode}>
                  {w.warehouseCode} ({w.inStockCountDisplay})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="inventory-stock">Trạng thái tồn</Label>
            <select
              key={`stock-${filters.stock}`}
              id="inventory-stock"
              name={OPERATIONS_PARAMS.STOCK}
              defaultValue={filters.stock}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className={SELECT_CLASS}
            >
              <option value="all">Tất cả mặt hàng</option>
              <option value="in">Chỉ mặt hàng còn tồn (&gt; 0)</option>
              <option value="out">Mặt hàng hết tồn (= 0)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:justify-end md:border-t md:border-border/70 md:pt-4">
          {hasFilters && (
            <Link
              href={ADMIN_INVENTORY_PATH}
              className={buttonClassName({ variant: 'secondary', size: 'lg', className: 'md:w-auto' })}
            >
              <RotateCcw aria-hidden="true" className="size-5" />
              Đặt lại bộ lọc
              <LinkSpinner label="Đang đặt lại bộ lọc tồn kho…" />
            </Link>
          )}
          <PendingSubmitButton pendingText="Đang lọc tồn kho…" className="md:w-auto md:min-w-48">
            <Search aria-hidden="true" className="size-5" />
            Áp dụng bộ lọc
          </PendingSubmitButton>
        </div>
      </Form>
    </Card>
  );
}

