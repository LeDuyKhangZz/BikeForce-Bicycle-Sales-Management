/**
 * Bộ lọc cho hai màn Admin đọc dữ liệu MISA đã đồng bộ: Đơn hàng và Tồn kho.
 *
 * Mọi giá trị đến từ URL (`searchParams`) nên phải chịu được chuỗi rác mà
 * không ném lỗi — URL sửa tay chỉ đưa về mặc định, không làm chết trang.
 * Từ khoá tìm kiếm bị loại các ký tự có nghĩa trong cú pháp filter PostgREST
 * (`,` `(` `)` `%` `*` `\`) để không thể chèn thêm điều kiện vào `.or(...)`.
 */

import {
  formatVietnamMonth,
  getVietnamCurrentMonth,
  getVietnamMonthRange,
  shiftVietnamMonth,
} from '@/lib/date';

export const OPERATIONS_PAGE_SIZE = 20;
export const MAX_OPERATIONS_SEARCH_LENGTH = 60;
const MAX_WAREHOUSE_CODE_LENGTH = 40;

export const ADMIN_ORDERS_PATH = '/admin/orders';
export const ADMIN_INVENTORY_PATH = '/admin/inventory';

export const OPERATIONS_PARAMS = {
  MONTH: 'month',
  SEARCH: 'q',
  WAREHOUSE: 'warehouse',
  STOCK: 'stock',
  PAGE: 'page',
} as const;

type RawParam = string | string[] | undefined;

export type OrderSearchParams = {
  month?: RawParam;
  q?: RawParam;
  page?: RawParam;
};

export type InventorySearchParams = {
  q?: RawParam;
  warehouse?: RawParam;
  stock?: RawParam;
  page?: RawParam;
};

export type OrderFilters = {
  /** `YYYY-MM` khi lọc theo tháng; `null` khi xem toàn bộ đơn đã đồng bộ. */
  month: string | null;
  from: string | null;
  to: string | null;
  search: string | null;
};

export type InventoryStockFilter = 'all' | 'in' | 'out';

export type InventoryFilters = {
  search: string | null;
  warehouse: string | null;
  stock: InventoryStockFilter;
};

/** Lấy giá trị đầu tiên khi một tham số lặp lại trên URL (`?q=a&q=b`). */
export function firstParam(raw: RawParam): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export function sanitizeOperationsSearch(raw: RawParam): string | null {
  const value = firstParam(raw);
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/[,()%*\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_OPERATIONS_SEARCH_LENGTH)
    .trim();
  return cleaned === '' ? null : cleaned;
}

export function parseOrderFilters(params: OrderSearchParams): OrderFilters {
  const rawMonth = firstParam(params.month);
  const range = typeof rawMonth === 'string' ? getVietnamMonthRange(rawMonth) : null;
  return {
    month: range !== null && typeof rawMonth === 'string' ? rawMonth : null,
    from: range?.from ?? null,
    to: range?.to ?? null,
    search: sanitizeOperationsSearch(params.q),
  };
}

function parseWarehouse(raw: RawParam): string | null {
  const value = firstParam(raw);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > MAX_WAREHOUSE_CODE_LENGTH) return null;
  return trimmed;
}

function parseStock(raw: RawParam): InventoryStockFilter {
  const value = firstParam(raw);
  return value === 'in' || value === 'out' ? value : 'all';
}

export function parseInventoryFilters(params: InventorySearchParams): InventoryFilters {
  return {
    search: sanitizeOperationsSearch(params.q),
    warehouse: parseWarehouse(params.warehouse),
    stock: parseStock(params.stock),
  };
}

function withQuery(path: string, query: URLSearchParams): string {
  const text = query.toString();
  return text === '' ? path : `${path}?${text}`;
}

export function buildOrdersQuery(filters: OrderFilters): URLSearchParams {
  const query = new URLSearchParams();
  if (filters.month !== null) query.set(OPERATIONS_PARAMS.MONTH, filters.month);
  if (filters.search !== null) query.set(OPERATIONS_PARAMS.SEARCH, filters.search);
  return query;
}

export function ordersPath(
  filters: OrderFilters,
  overrides: { month?: string | null; page?: number } = {},
): string {
  const nextMonth = overrides.month === undefined ? filters.month : overrides.month;
  const query = buildOrdersQuery({ ...filters, month: nextMonth });
  if (overrides.page !== undefined && overrides.page > 1) {
    query.set(OPERATIONS_PARAMS.PAGE, String(overrides.page));
  }
  return withQuery(ADMIN_ORDERS_PATH, query);
}

export function buildInventoryQuery(filters: InventoryFilters): URLSearchParams {
  const query = new URLSearchParams();
  if (filters.search !== null) query.set(OPERATIONS_PARAMS.SEARCH, filters.search);
  if (filters.warehouse !== null) query.set(OPERATIONS_PARAMS.WAREHOUSE, filters.warehouse);
  if (filters.stock !== 'all') query.set(OPERATIONS_PARAMS.STOCK, filters.stock);
  return query;
}

export function inventoryPath(filters: InventoryFilters, overrides: { page?: number } = {}): string {
  const query = buildInventoryQuery(filters);
  if (overrides.page !== undefined && overrides.page > 1) {
    query.set(OPERATIONS_PARAMS.PAGE, String(overrides.page));
  }
  return withQuery(ADMIN_INVENTORY_PATH, query);
}

export function hasActiveInventoryFilters(filters: InventoryFilters): boolean {
  return filters.search !== null || filters.warehouse !== null || filters.stock !== 'all';
}

export type OrderMonthNavigation = {
  label: string;
  isAllMonths: boolean;
  isCurrentMonth: boolean;
  previousHref: string | null;
  /** `null` khi đang ở tháng hiện tại — không có đơn ở tương lai để xem. */
  nextHref: string | null;
  currentHref: string;
  allMonthsHref: string;
};

export function buildOrderMonthNavigation(filters: OrderFilters): OrderMonthNavigation {
  const currentMonth = getVietnamCurrentMonth();

  if (filters.month === null) {
    const previousMonth = shiftVietnamMonth(currentMonth, -1);
    return {
      label: 'Tất cả các tháng',
      isAllMonths: true,
      isCurrentMonth: false,
      previousHref:
        previousMonth === null ? null : ordersPath(filters, { month: previousMonth }),
      nextHref: ordersPath(filters, { month: currentMonth }),
      currentHref: ordersPath(filters, { month: currentMonth }),
      allMonthsHref: ordersPath(filters, { month: null }),
    };
  }

  const previousMonth = shiftVietnamMonth(filters.month, -1);
  const nextMonth = shiftVietnamMonth(filters.month, 1);
  const isCurrentMonth = filters.month === currentMonth;

  return {
    label: formatVietnamMonth(filters.month),
    isAllMonths: false,
    isCurrentMonth,
    previousHref: previousMonth === null ? null : ordersPath(filters, { month: previousMonth }),
    nextHref:
      nextMonth === null || isCurrentMonth || nextMonth > currentMonth
        ? null
        : ordersPath(filters, { month: nextMonth }),
    currentHref: ordersPath(filters, { month: currentMonth }),
    allMonthsHref: ordersPath(filters, { month: null }),
  };
}

