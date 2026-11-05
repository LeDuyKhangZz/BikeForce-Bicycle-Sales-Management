/**
 * View model thuần cho hai màn Admin "Đơn hàng" và "Tồn kho" (dữ liệu đồng bộ MISA).
 *
 * Tuân thủ AGENTS.md §1.3 & §9: mọi phép định dạng tiền, ngày, số lượng và
 * ánh xạ trạng thái nằm ở `lib/`, component chỉ nhận chuỗi đã chuẩn bị sẵn.
 */

import { formatCurrencyVND, formatThousands } from '@/lib/currency';
import { formatVietnamDate, formatVietnamDateTime } from '@/lib/date';
import type { PageInfo } from '@/lib/reports/pagination';

export type OrderStatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export type OrderSummaryRaw = {
  orderCount: number;
  totalAmount: number;
  outstandingAmount: number;
  customerCount: number;
  latestSyncedAt: string | null;
};

export type OrderLineRaw = {
  id: string;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
};

export type OrderRowRaw = {
  id: string;
  orderCode: string;
  orderDate: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  outstandingAmount: number;
  syncedAt: string;
  customerCode: string | null;
  customerName: string | null;
  salesName: string | null;
  employeeCode: string | null;
  lines: readonly OrderLineRaw[];
};

export type OrderLineViewModel = {
  id: string;
  productCode: string;
  productName: string;
  unit: string;
  quantityDisplay: string;
  unitPriceDisplay: string;
  lineTotalDisplay: string;
};

export type OrderRowViewModel = {
  id: string;
  orderCode: string;
  orderDateDisplay: string;
  statusLabel: string;
  statusTone: OrderStatusTone;
  paymentLabel: string;
  paymentTone: OrderStatusTone;
  customerDisplay: string;
  customerCodeDisplay: string | null;
  salesDisplay: string;
  employeeCodeDisplay: string | null;
  lineSummaryDisplay: string;
  subtotalDisplay: string;
  discountDisplay: string;
  totalAmountDisplay: string;
  outstandingDisplay: string;
  hasOutstanding: boolean;
  syncedAtDisplay: string;
  lines: readonly OrderLineViewModel[];
};

export type OrderSummaryCardViewModel = {
  label: string;
  valueDisplay: string;
  hintDisplay: string;
};

export type OrdersDashboardViewModel = {
  syncedAtDisplay: string | null;
  rangeLabel: string;
  summaryCards: readonly OrderSummaryCardViewModel[];
  rows: readonly OrderRowViewModel[];
};

export type WarehouseSummaryRaw = {
  warehouseCode: string;
  productCount: number;
  inStockCount: number;
  quantityOnHand: number;
  latestSyncedAt: string | null;
};

export type InventoryRowRaw = {
  id: string;
  warehouseCode: string;
  productCode: string;
  productName: string;
  unit: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  syncedAt: string;
};

export type WarehouseCardViewModel = {
  warehouseCode: string;
  productCountDisplay: string;
  inStockCountDisplay: string;
  quantityOnHandDisplay: string;
  syncedAtDisplay: string | null;
  isSelected: boolean;
};

export type InventoryRowViewModel = {
  id: string;
  warehouseCode: string;
  productCode: string;
  productName: string;
  unit: string;
  quantityOnHandDisplay: string;
  quantityReservedDisplay: string;
  quantityAvailableDisplay: string;
  stockStatusLabel: string;
  stockStatusTone: OrderStatusTone;
  syncedAtDisplay: string;
};

export type InventoryDashboardViewModel = {
  syncedAtDisplay: string | null;
  rangeLabel: string;
  totalWarehousesDisplay: string;
  totalSkusDisplay: string;
  totalQuantityDisplay: string;
  warehouses: readonly WarehouseCardViewModel[];
  rows: readonly InventoryRowViewModel[];
};

const quantityFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 3,
});

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return quantityFormatter.format(value);
}

export function resolveOrderStatusBadge(rawStatus: string): {
  label: string;
  tone: OrderStatusTone;
} {
  const normalized = rawStatus.trim().toLowerCase();
  if (
    normalized.includes('hủy') ||
    normalized.includes('huỷ') ||
    normalized.includes('cancel') ||
    normalized.includes('từ chối')
  ) {
    return { label: rawStatus.trim() || 'Đã hủy', tone: 'danger' };
  }
  if (
    normalized.includes('đã thực hiện') ||
    normalized.includes('hoàn thành') ||
    normalized.includes('đã ghi nhận') ||
    normalized.includes('done') ||
    normalized.includes('completed')
  ) {
    return { label: rawStatus.trim() || 'Đã thực hiện', tone: 'success' };
  }
  if (
    normalized.includes('đang') ||
    normalized.includes('chờ') ||
    normalized.includes('chưa')
  ) {
    return { label: rawStatus.trim() || 'Đang xử lý', tone: 'warning' };
  }
  if (normalized === '' || normalized === 'unknown') {
    return { label: 'Đã đồng bộ MISA', tone: 'info' };
  }
  return { label: rawStatus.trim(), tone: 'info' };
}

export function formatOrderRangeLabel(pageInfo: PageInfo): string {
  if (pageInfo.total === 0) return 'Không có đơn hàng';
  return `Đơn hàng ${formatThousands(pageInfo.rangeStart)}–${formatThousands(pageInfo.rangeEnd)} trên ${formatThousands(pageInfo.total)}`;
}

export function formatInventoryRangeLabel(pageInfo: PageInfo): string {
  if (pageInfo.total === 0) return 'Không có mặt hàng tồn kho';
  return `Mặt hàng ${formatThousands(pageInfo.rangeStart)}–${formatThousands(pageInfo.rangeEnd)} trên ${formatThousands(pageInfo.total)}`;
}

export function buildOrdersDashboardViewModel(
  summary: OrderSummaryRaw,
  rows: readonly OrderRowRaw[],
  pageInfo: PageInfo,
): OrdersDashboardViewModel {
  const collectedAmount = Math.max(0, summary.totalAmount - summary.outstandingAmount);
  return {
    syncedAtDisplay:
      summary.latestSyncedAt !== null ? formatVietnamDateTime(summary.latestSyncedAt) : null,
    rangeLabel: formatOrderRangeLabel(pageInfo),
    summaryCards: [
      {
        label: 'Tổng đơn hàng trong kỳ',
        valueDisplay: `${formatThousands(summary.orderCount)} đơn`,
        hintDisplay: `${formatThousands(summary.customerCount)} khách hàng phát sinh đơn`,
      },
      {
        label: 'Tổng doanh số đơn hàng',
        valueDisplay: formatCurrencyVND(Math.round(summary.totalAmount)),
        hintDisplay: 'Theo giá trị đơn bán MISA',
      },
      {
        label: 'Đã thu / thanh toán',
        valueDisplay: formatCurrencyVND(Math.round(collectedAmount)),
        hintDisplay: 'Tổng giá trị đơn trừ dư nợ còn phải thu',
      },
      {
        label: 'Còn phải thu (công nợ đơn)',
        valueDisplay: formatCurrencyVND(Math.round(summary.outstandingAmount)),
        hintDisplay:
          summary.outstandingAmount > 0 ? 'Có đơn còn dư nợ phải thu' : 'Không còn dư nợ đơn',
      },
    ],
    rows: rows.map((row) => {
      const statusBadge = resolveOrderStatusBadge(row.status);
      const hasOutstanding = row.outstandingAmount > 0;
      const totalQty = row.lines.reduce((sum, item) => sum + item.quantity, 0);
      return {
        id: row.id,
        orderCode: row.orderCode,
        orderDateDisplay: formatVietnamDate(row.orderDate),
        statusLabel: statusBadge.label,
        statusTone: statusBadge.tone,
        paymentLabel: hasOutstanding ? 'Còn phải thu' : 'Đã tất toán',
        paymentTone: hasOutstanding ? 'warning' : 'success',
        customerDisplay: row.customerName ?? 'Khách hàng chưa ánh xạ danh mục',
        customerCodeDisplay: row.customerCode,
        salesDisplay: row.salesName ?? 'Chưa gán Sales',
        employeeCodeDisplay: row.employeeCode,
        lineSummaryDisplay: `${formatThousands(row.lines.length)} mã · SL ${formatQuantity(totalQty)}`,
        subtotalDisplay: formatCurrencyVND(Math.round(row.subtotal)),
        discountDisplay: formatCurrencyVND(Math.round(row.discountAmount)),
        totalAmountDisplay: formatCurrencyVND(Math.round(row.totalAmount)),
        outstandingDisplay: formatCurrencyVND(Math.round(row.outstandingAmount)),
        hasOutstanding,
        syncedAtDisplay: formatVietnamDateTime(row.syncedAt),
        lines: row.lines.map((line) => ({
          id: line.id,
          productCode: line.productCode,
          productName: line.productName,
          unit: line.unit,
          quantityDisplay: formatQuantity(line.quantity),
          unitPriceDisplay: formatCurrencyVND(Math.round(line.unitPrice)),
          lineTotalDisplay: formatCurrencyVND(Math.round(line.lineTotal)),
        })),
      };
    }),
  };
}

export function buildInventoryDashboardViewModel(
  warehouses: readonly WarehouseSummaryRaw[],
  rows: readonly InventoryRowRaw[],
  pageInfo: PageInfo,
  selectedWarehouse: string | null,
): InventoryDashboardViewModel {
  const totalSkus = warehouses.reduce((sum, w) => sum + w.productCount, 0);
  const totalQuantity = warehouses.reduce((sum, w) => sum + w.quantityOnHand, 0);
  const latestSyncedAt = warehouses.reduce<string | null>((latest, w) => {
    if (w.latestSyncedAt === null) return latest;
    if (latest === null || w.latestSyncedAt > latest) return w.latestSyncedAt;
    return latest;
  }, null);

  return {
    syncedAtDisplay: latestSyncedAt !== null ? formatVietnamDateTime(latestSyncedAt) : null,
    rangeLabel: formatInventoryRangeLabel(pageInfo),
    totalWarehousesDisplay: `${formatThousands(warehouses.length)} kho`,
    totalSkusDisplay: `${formatThousands(totalSkus)} dòng kho - mặt hàng`,
    totalQuantityDisplay: formatQuantity(totalQuantity),
    warehouses: warehouses.map((w) => ({
      warehouseCode: w.warehouseCode,
      productCountDisplay: `${formatThousands(w.productCount)} mã`,
      inStockCountDisplay: `${formatThousands(w.inStockCount)} mã còn hàng`,
      quantityOnHandDisplay: formatQuantity(w.quantityOnHand),
      syncedAtDisplay: w.latestSyncedAt !== null ? formatVietnamDateTime(w.latestSyncedAt) : null,
      isSelected: selectedWarehouse === w.warehouseCode,
    })),
    rows: rows.map((row) => {
      const hasStock = row.quantityAvailable > 0;
      return {
        id: row.id,
        warehouseCode: row.warehouseCode,
        productCode: row.productCode,
        productName: row.productName,
        unit: row.unit,
        quantityOnHandDisplay: formatQuantity(row.quantityOnHand),
        quantityReservedDisplay: formatQuantity(row.quantityReserved),
        quantityAvailableDisplay: formatQuantity(row.quantityAvailable),
        stockStatusLabel: hasStock ? 'Còn hàng' : 'Hết hàng',
        stockStatusTone: hasStock ? 'success' : 'neutral',
        syncedAtDisplay: formatVietnamDateTime(row.syncedAt),
      };
    }),
  };
}

