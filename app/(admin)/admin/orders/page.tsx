import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ClipboardList, DatabaseZap, SearchX } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkSpinner } from '@/components/ui/link-spinner';
import { OrdersFilterBar } from '@/features/admin-orders/orders-filter-bar';
import { OrdersPaginationNav } from '@/features/admin-orders/orders-pagination-nav';
import { OrdersTable } from '@/features/admin-orders/orders-table';
import { SyncOrdersButton } from '@/features/admin-orders/sync-orders-button';
import { requireRole } from '@/features/auth/queries';
import {
  ADMIN_ORDERS_PATH,
  firstParam,
  parseOrderFilters,
  type OrderSearchParams,
} from '@/lib/operations/filters';
import { buildOrdersDashboardViewModel } from '@/lib/operations/view-models';
import { parsePageParam } from '@/lib/reports/pagination';
import { createClient } from '@/lib/supabase/server';
import { getAdminOrderSummary, listAdminOrders } from '@/services/orders';

export const metadata: Metadata = {
  title: 'Đơn hàng MISA · BikeForce',
};

type Props = {
  searchParams: Promise<OrderSearchParams>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireRole('ADMIN');

  const params = await searchParams;
  const filters = parseOrderFilters(params);
  const page = parsePageParam(firstParam(params.page));

  const supabase = await createClient();
  const [summary, { rows, pageInfo }] = await Promise.all([
    getAdminOrderSummary(supabase, filters),
    listAdminOrders(supabase, filters, page),
  ]);

  const viewModel = buildOrdersDashboardViewModel(summary, rows, pageInfo);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold tracking-wide text-accent-text uppercase">
            Đồng bộ MISA AMIS
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Đơn bán hàng</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi đơn bán hàng, chi tiết sản phẩm và dư nợ phải thu đã đồng bộ từ MISA.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <SyncOrdersButton month={filters.month} />
          <span
            className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-xs font-semibold ${
              viewModel.syncedAtDisplay === null
                ? 'bg-status-near-bg text-status-near-fg'
                : 'bg-status-exceeded-bg text-status-exceeded-fg'
            }`}
          >
            {viewModel.syncedAtDisplay === null ? (
              <DatabaseZap aria-hidden="true" className="size-4" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            )}
            {viewModel.syncedAtDisplay === null
              ? 'Chưa có lượt đồng bộ'
              : `Đồng bộ lúc ${viewModel.syncedAtDisplay}`}
          </span>
        </div>
      </div>

      <section aria-label="Tổng hợp đơn hàng trong tháng" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {viewModel.summaryCards.map((card) => (
          <Card key={card.label} className="flex flex-col justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className="tabular text-2xl font-bold text-heading">{card.valueDisplay}</p>
            <p className="text-xs text-muted-foreground">{card.hintDisplay}</p>
          </Card>
        ))}
      </section>

      <OrdersFilterBar filters={filters} />

      {viewModel.rows.length === 0 ? (
        <EmptyOrdersState hasSearch={filters.search !== null} />
      ) : (
        <>
          <OrdersTable rows={viewModel.rows} />
          <OrdersPaginationNav
            filters={filters}
            pageInfo={pageInfo}
            rangeLabel={viewModel.rangeLabel}
          />
        </>
      )}
    </div>
  );
}

function EmptyOrdersState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-8 text-center">
      {hasSearch ? (
        <SearchX aria-hidden="true" className="size-12 text-muted-foreground" />
      ) : (
        <ClipboardList aria-hidden="true" className="size-12 text-muted-foreground" />
      )}
      <p className="text-base font-medium text-foreground">
        {hasSearch ? 'Không tìm thấy đơn hàng khớp mã đã nhập' : 'Chưa có đơn hàng nào trong tháng này'}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        {hasSearch
          ? 'Thử kiểm tra lại mã đơn hàng hoặc xoá bộ lọc tìm kiếm để xem toàn bộ đơn trong tháng.'
          : 'Khi chạy script đồng bộ đơn bán hàng MISA (sync_sale_orders.py), dữ liệu đơn hàng và chi tiết mặt hàng sẽ hiển thị tại đây.'}
      </p>
      {hasSearch && (
        <Link href={ADMIN_ORDERS_PATH} className={buttonClassName({ variant: 'secondary' })}>
          Xem tất cả đơn tháng này
          <LinkSpinner label="Đang tải lại danh sách đơn hàng…" />
        </Link>
      )}
    </Card>
  );
}

