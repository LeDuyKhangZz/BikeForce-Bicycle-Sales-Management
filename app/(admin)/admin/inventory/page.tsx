import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Boxes,
  Clock,
  DatabaseZap,
  Layers,
  Package,
  SearchX,
} from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkSpinner } from '@/components/ui/link-spinner';
import { InventoryFilterBar } from '@/features/admin-inventory/inventory-filter-bar';
import { InventoryPaginationNav } from '@/features/admin-inventory/inventory-pagination-nav';
import { InventoryTable } from '@/features/admin-inventory/inventory-table';
import { SyncInventoryButton } from '@/features/admin-inventory/sync-inventory-button';
import { WarehouseQuickGrid } from '@/features/admin-inventory/warehouse-quick-grid';
import { requireRole } from '@/features/auth/queries';
import {
  ADMIN_INVENTORY_PATH,
  firstParam,
  hasActiveInventoryFilters,
  parseInventoryFilters,
  type InventorySearchParams,
} from '@/lib/operations/filters';
import { buildInventoryDashboardViewModel } from '@/lib/operations/view-models';
import { parsePageParam } from '@/lib/reports/pagination';
import { createClient } from '@/lib/supabase/server';
import { getAdminInventoryWarehouses, listAdminInventory } from '@/services/inventory';

export const metadata: Metadata = {
  title: 'Tồn kho MISA · BikeForce',
};

type Props = {
  searchParams: Promise<InventorySearchParams>;
};

export default async function AdminInventoryPage({ searchParams }: Props) {
  await requireRole('ADMIN');

  const params = await searchParams;
  const filters = parseInventoryFilters(params);
  const page = parsePageParam(firstParam(params.page));

  const supabase = await createClient();
  const [warehouses, { rows, pageInfo }] = await Promise.all([
    getAdminInventoryWarehouses(supabase),
    listAdminInventory(supabase, filters, page),
  ]);

  const viewModel = buildInventoryDashboardViewModel(
    warehouses,
    rows,
    pageInfo,
    filters.warehouse,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-xl bg-status-info-bg text-primary shadow-xs"
            >
              <Boxes className="size-6" />
            </span>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-heading">
                Tồn kho theo kho hàng
              </h1>
              <p className="text-sm text-muted-foreground">
                Số lượng tồn thực tế và khả dụng của từng kho đã đồng bộ từ sổ
                kho MISA.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center rounded-full bg-status-near-bg px-3 py-1 text-xs font-bold tracking-wide text-status-near-fg uppercase">
            Đồng bộ MISA AMIS
          </span>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <SyncInventoryButton warehouse={filters.warehouse} />
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {viewModel.syncedAtDisplay === null ? (
              <DatabaseZap aria-hidden="true" className="size-3.5" />
            ) : (
              <Clock aria-hidden="true" className="size-3.5" />
            )}
            {viewModel.syncedAtDisplay === null
              ? 'Chưa có dữ liệu tồn kho'
              : `Đồng bộ lúc ${viewModel.syncedAtDisplay}`}
          </span>
        </div>
      </div>

      <section
        aria-label="Tổng hợp tồn kho toàn hệ thống"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <Card className="flex items-center gap-4 p-5">
          <span
            aria-hidden="true"
            className="grid size-13 shrink-0 place-items-center rounded-xl bg-status-info-bg text-primary"
          >
            <Layers className="size-6" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-xs font-medium text-muted-foreground">
              Tổng số kho MISA
            </p>
            <p className="tabular text-2xl font-bold text-heading">
              {viewModel.totalWarehousesDisplay}
            </p>
            <p className="text-xs text-muted-foreground">
              Đang hoạt động và đã đồng bộ
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <span
            aria-hidden="true"
            className="grid size-13 shrink-0 place-items-center rounded-xl bg-status-pending-bg text-heading"
          >
            <Package className="size-6" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-xs font-medium text-muted-foreground">
              Tổng bản ghi kho - sản phẩm
            </p>
            <p className="tabular text-2xl font-bold text-heading">
              {viewModel.totalSkusDisplay}
            </p>
            <p className="text-xs text-muted-foreground">
              Tổng số mã theo từng kho
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <span
            aria-hidden="true"
            className="grid size-13 shrink-0 place-items-center rounded-xl bg-status-exceeded-bg text-status-exceeded-fg"
          >
            <Boxes className="size-6" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-xs font-medium text-muted-foreground">
              Tổng số lượng tồn thực tế
            </p>
            <p className="tabular text-2xl font-bold text-heading">
              {viewModel.totalQuantityDisplay}
            </p>
            <p className="text-xs text-muted-foreground">
              Cộng dồn tất cả kho hàng
            </p>
          </div>
        </Card>
      </section>

      {viewModel.warehouses.length > 0 && (
        <WarehouseQuickGrid
          warehouses={viewModel.warehouses}
          filters={filters}
        />
      )}

      <div id="inventory-detail" className="flex scroll-mt-20 flex-col gap-4">
        <InventoryFilterBar
          filters={filters}
          warehouses={viewModel.warehouses}
        />

        {viewModel.rows.length === 0 ? (
          <EmptyInventoryState
            hasFilters={hasActiveInventoryFilters(filters)}
          />
        ) : (
          <>
            <InventoryTable rows={viewModel.rows} />
            <InventoryPaginationNav
              filters={filters}
              pageInfo={pageInfo}
              rangeLabel={viewModel.rangeLabel}
            />
          </>
        )}
      </div>
    </div>
  );
}

function EmptyInventoryState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-8 text-center">
      {hasFilters ? (
        <SearchX aria-hidden="true" className="size-12 text-muted-foreground" />
      ) : (
        <Boxes aria-hidden="true" className="size-12 text-muted-foreground" />
      )}
      <p className="text-base font-medium text-foreground">
        {hasFilters
          ? 'Không có mặt hàng tồn kho nào khớp bộ lọc'
          : 'Chưa có dữ liệu tồn kho từ MISA'}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        {hasFilters
          ? 'Thử chọn kho khác, đổi trạng thái tồn hoặc xoá từ khoá tìm kiếm.'
          : 'Khi chạy đồng bộ tồn kho MISA, số lượng tồn của từng kho sẽ xuất hiện tại đây.'}
      </p>
      {hasFilters && (
        <Link
          href={ADMIN_INVENTORY_PATH}
          className={buttonClassName({ variant: 'secondary' })}
        >
          Xoá bộ lọc
          <LinkSpinner label="Đang xoá bộ lọc tồn kho…" />
        </Link>
      )}
    </Card>
  );
}
