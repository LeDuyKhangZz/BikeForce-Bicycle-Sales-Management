import type { SupabaseClient } from '@supabase/supabase-js';

import {
  OPERATIONS_PAGE_SIZE,
  type OrderFilters,
} from '@/lib/operations/filters';
import { fetchMisaRecentSaleOrders } from '@/lib/operations/misa-public-api';
import type {
  OrderLineRaw,
  OrderRowRaw,
  OrderSummaryRaw,
} from '@/lib/operations/view-models';
import { buildPageInfo, pageRange, type PageInfo } from '@/lib/reports/pagination';
import type { Database } from '@/types/database.types';

const SUMMARY_FALLBACK_LIMIT = 500;
const DEBT_LOOKUP_LIMIT = 100;
const UPSERT_CHUNK_SIZE = 300;

export type SyncMisaOrdersSummary = {
  orderCount: number;
  lineCount: number;
  productCount: number;
  debtCount: number;
};

export async function getAdminOrderSummary(
  supabase: SupabaseClient<Database>,
  filters: OrderFilters,
): Promise<OrderSummaryRaw> {
  if (filters.from !== null && filters.to !== null) {
    const { data, error } = await supabase.rpc('get_admin_order_summary', {
      p_from: filters.from,
      p_to: filters.to,
    });

    if (!error && Array.isArray(data) && data[0] !== undefined) {
      const row = data[0];
      return {
        orderCount: Number(row.order_count ?? 0),
        totalAmount: Number(row.total_amount ?? 0),
        outstandingAmount: Number(row.outstanding_amount ?? 0),
        customerCount: Number(row.customer_count ?? 0),
        latestSyncedAt: row.latest_synced_at ?? null,
      };
    }
  }

  // Dự phòng hoặc khi xem toàn bộ các tháng: gom trên tối đa 500 đơn gần nhất.
  let ordersQuery = supabase
    .from('orders')
    .select('source_id,customer_id,total_amount,synced_at', { count: 'exact' })
    .order('order_date', { ascending: false });

  if (filters.from !== null && filters.to !== null) {
    ordersQuery = ordersQuery.gte('order_date', filters.from).lte('order_date', filters.to);
  }

  const { data: rows, count } = await ordersQuery.range(0, SUMMARY_FALLBACK_LIMIT - 1);

  const safeRows = rows ?? [];
  const customerIds = new Set(
    safeRows
      .map((item) => item.customer_id)
      .filter((id): id is string => typeof id === 'string' && id !== ''),
  );
  const totalAmount = safeRows.reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0);
  const latestSyncedAt = safeRows.reduce<string | null>((latest, item) => {
    if (latest === null || item.synced_at > latest) return item.synced_at;
    return latest;
  }, null);

  let outstandingAmount = 0;
  const sourceIds = safeRows.map((item) => `SALE_ORDER:${item.source_id}`);
  if (sourceIds.length > 0) {
    const { data: debtRows } = await supabase
      .from('debts')
      .select('outstanding_amount')
      .eq('source_system', 'MISA')
      .in('source_id', sourceIds)
      .range(0, SUMMARY_FALLBACK_LIMIT - 1);

    outstandingAmount = (debtRows ?? []).reduce(
      (sum, item) => sum + Number(item.outstanding_amount ?? 0),
      0,
    );
  }

  return {
    orderCount: count ?? safeRows.length,
    totalAmount,
    outstandingAmount,
    customerCount: customerIds.size,
    latestSyncedAt,
  };
}

export async function listAdminOrders(
  supabase: SupabaseClient<Database>,
  filters: OrderFilters,
  requestedPage: number,
): Promise<{ rows: OrderRowRaw[]; pageInfo: PageInfo }> {
  const { from, to } = pageRange(requestedPage, OPERATIONS_PAGE_SIZE);

  let query = supabase
    .from('orders')
    .select(
      `
      id,
      source_id,
      order_code,
      order_date,
      status,
      subtotal,
      discount_amount,
      total_amount,
      synced_at,
      customers:customer_id (
        customer_code,
        customer_name
      ),
      sales:assigned_sales_id (
        full_name,
        employee_code
      ),
      order_lines (
        id,
        quantity,
        unit_price,
        discount_amount,
        line_total,
        products:product_id (
          product_code,
          product_name,
          unit
        )
      )
    `,
      { count: 'exact' },
    )
    .order('order_date', { ascending: false })
    .order('order_code', { ascending: false });

  if (filters.from !== null && filters.to !== null) {
    query = query.gte('order_date', filters.from).lte('order_date', filters.to);
  }

  if (filters.search !== null) {
    query = query.ilike('order_code', `%${filters.search}%`);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error('[listAdminOrders]', error.code, error.message);
    return {
      rows: [],
      pageInfo: buildPageInfo(0, requestedPage, OPERATIONS_PAGE_SIZE),
    };
  }

  const rawRows = data ?? [];
  const debtSourceIds = rawRows.map((row) => `SALE_ORDER:${row.source_id}`);
  const debtBySourceId = new Map<string, number>();

  if (debtSourceIds.length > 0) {
    const { data: debtRows } = await supabase
      .from('debts')
      .select('source_id,outstanding_amount')
      .eq('source_system', 'MISA')
      .in('source_id', debtSourceIds)
      .range(0, DEBT_LOOKUP_LIMIT - 1);

    for (const debt of debtRows ?? []) {
      debtBySourceId.set(debt.source_id, Number(debt.outstanding_amount ?? 0));
    }
  }

  const rows: OrderRowRaw[] = rawRows.map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const sales = Array.isArray(row.sales) ? row.sales[0] : row.sales;
    const rawLines = Array.isArray(row.order_lines) ? row.order_lines : [];

    const lines: OrderLineRaw[] = rawLines.map((line) => {
      const product = Array.isArray(line.products) ? line.products[0] : line.products;
      return {
        id: line.id,
        productCode: product?.product_code ?? '—',
        productName: product?.product_name ?? 'Sản phẩm MISA',
        unit: product?.unit ?? 'Cái',
        quantity: Number(line.quantity ?? 0),
        unitPrice: Number(line.unit_price ?? 0),
        discountAmount: Number(line.discount_amount ?? 0),
        lineTotal: Number(line.line_total ?? 0),
      };
    });

    return {
      id: row.id,
      orderCode: row.order_code,
      orderDate: row.order_date,
      status: row.status,
      subtotal: Number(row.subtotal ?? 0),
      discountAmount: Number(row.discount_amount ?? 0),
      totalAmount: Number(row.total_amount ?? 0),
      outstandingAmount: debtBySourceId.get(`SALE_ORDER:${row.source_id}`) ?? 0,
      syncedAt: row.synced_at,
      customerCode: customer?.customer_code ?? null,
      customerName: customer?.customer_name ?? null,
      salesName: sales?.full_name ?? null,
      employeeCode: sales?.employee_code ?? null,
      lines,
    };
  });

  return {
    rows,
    pageInfo: buildPageInfo(count ?? rows.length, requestedPage, OPERATIONS_PAGE_SIZE),
  };
}

export async function syncMisaOrdersFromApi(
  supabase: SupabaseClient<Database>,
  options: { fromDate?: string | null } = {},
): Promise<SyncMisaOrdersSummary> {
  const orders = await fetchMisaRecentSaleOrders({
    fromDate: options.fromDate ?? null,
    maxPages: 5,
  });

  if (orders.length === 0) {
    return { orderCount: 0, lineCount: 0, productCount: 0, debtCount: 0 };
  }

  const nowIso = new Date().toISOString();

  // 1. Ánh xạ khách hàng theo customer_code
  const customerCodes = [
    ...new Set(orders.map((o) => o.customerCode).filter((code) => code !== '')),
  ];
  const customerIdByCode = new Map<string, string>();

  for (let i = 0; i < customerCodes.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = customerCodes.slice(i, i + UPSERT_CHUNK_SIZE);
    const { data: customerRows } = await supabase
      .from('customers')
      .select('id,customer_code')
      .in('customer_code', chunk);

    for (const c of customerRows ?? []) {
      if (c.customer_code) {
        customerIdByCode.set(c.customer_code, c.id);
      }
    }
  }

  // 2. Ánh xạ nhân viên Sales đang hoạt động theo employee_code hoặc amis_employee_name
  const { data: salesProfiles } = await supabase
    .from('profiles')
    .select('id,employee_code,amis_employee_name')
    .eq('role', 'SALES')
    .eq('is_active', true)
    .range(0, 199);

  const salesIdByCode = new Map<string, string>();
  const salesIdByAmisName = new Map<string, string>();
  for (const profile of salesProfiles ?? []) {
    if (profile.employee_code) salesIdByCode.set(profile.employee_code.trim(), profile.id);
    if (profile.amis_employee_name) {
      salesIdByAmisName.set(profile.amis_employee_name.trim(), profile.id);
    }
  }

  // 3. Upsert danh mục sản phẩm xuất hiện trong các dòng đơn hàng
  const uniqueProducts = new Map<
    string,
    Database['public']['Tables']['products']['Insert']
  >();
  for (const order of orders) {
    for (const line of order.lines) {
      uniqueProducts.set(line.productCode, {
        source_system: 'MISA',
        source_id: line.productCode,
        product_code: line.productCode,
        product_name: line.productName,
        unit: line.unit,
        source_updated_at: order.sourceUpdatedAt,
        synced_at: nowIso,
      });
    }
  }

  const productPayloads = [...uniqueProducts.values()];
  const productIdByCode = new Map<string, string>();

  for (let i = 0; i < productPayloads.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = productPayloads.slice(i, i + UPSERT_CHUNK_SIZE);
    const { data: upsertedProducts, error: productErr } = await supabase
      .from('products')
      .upsert(chunk, { onConflict: 'source_system,source_id' })
      .select('id,product_code');

    if (productErr) {
      throw new Error(`Upsert products lỗi: ${productErr.message}`);
    }
    for (const p of upsertedProducts ?? []) {
      productIdByCode.set(p.product_code, p.id);
    }
  }

  // 4. Upsert đơn bán hàng
  const orderPayloads: Database['public']['Tables']['orders']['Insert'][] = orders.map(
    (order) => {
      const customerId =
        order.customerCode !== '' ? (customerIdByCode.get(order.customerCode) ?? null) : null;
      const salesId =
        (order.employeeCode !== '' ? salesIdByCode.get(order.employeeCode) : undefined) ??
        (order.employeeName !== '' ? salesIdByAmisName.get(order.employeeName) : undefined) ??
        null;

      return {
        source_system: 'MISA',
        source_id: order.sourceId,
        order_code: order.orderCode,
        customer_id: customerId,
        assigned_sales_id: salesId,
        order_date: order.orderDate,
        status: order.status,
        currency_code: order.currencyCode,
        subtotal: order.subtotal,
        discount_amount: order.discountAmount,
        total_amount: order.totalAmount,
        source_updated_at: order.sourceUpdatedAt,
        synced_at: nowIso,
      };
    },
  );

  const orderIdBySourceId = new Map<string, string>();
  for (let i = 0; i < orderPayloads.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = orderPayloads.slice(i, i + UPSERT_CHUNK_SIZE);
    const { data: upsertedOrders, error: orderErr } = await supabase
      .from('orders')
      .upsert(chunk, { onConflict: 'source_system,source_id' })
      .select('id,source_id');

    if (orderErr) {
      throw new Error(`Upsert orders lỗi: ${orderErr.message}`);
    }
    for (const o of upsertedOrders ?? []) {
      orderIdBySourceId.set(o.source_id, o.id);
    }
  }

  // 5. Upsert chi tiết dòng đơn hàng
  const lineMap = new Map<
    string,
    Database['public']['Tables']['order_lines']['Insert']
  >();
  for (const order of orders) {
    const orderId = orderIdBySourceId.get(order.sourceId);
    if (!orderId) continue;

    for (const line of order.lines) {
      const productId = productIdByCode.get(line.productCode) ?? null;
      lineMap.set(`${orderId}:${line.sourceLineId}`, {
        order_id: orderId,
        source_line_id: line.sourceLineId,
        product_id: productId,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        discount_amount: line.discountAmount,
        line_total: line.lineTotal,
      });
    }
  }

  const linePayloads = [...lineMap.values()];
  for (let i = 0; i < linePayloads.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = linePayloads.slice(i, i + UPSERT_CHUNK_SIZE);
    const { error: lineErr } = await supabase
      .from('order_lines')
      .upsert(chunk, { onConflict: 'order_id,source_line_id' });

    if (lineErr) {
      throw new Error(`Upsert order_lines lỗi: ${lineErr.message}`);
    }
  }

  // 6. Upsert công nợ theo đơn (cho các đơn có gắn khách hàng)
  const debtPayloads: Database['public']['Tables']['debts']['Insert'][] = [];
  for (const order of orders) {
    const customerId =
      order.customerCode !== '' ? (customerIdByCode.get(order.customerCode) ?? null) : null;
    if (!customerId) continue;

    const outstanding = Math.min(order.outstandingAmount, order.totalAmount);
    debtPayloads.push({
      source_system: 'MISA',
      source_id: `SALE_ORDER:${order.sourceId}`,
      customer_id: customerId,
      document_code: order.orderCode,
      document_date: order.orderDate,
      due_date: order.dueDate,
      original_amount: order.totalAmount,
      outstanding_amount: outstanding,
      status: outstanding > 0 ? 'OPEN' : 'PAID',
      source_updated_at: order.sourceUpdatedAt,
      synced_at: nowIso,
    });
  }

  for (let i = 0; i < debtPayloads.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = debtPayloads.slice(i, i + UPSERT_CHUNK_SIZE);
    const { error: debtErr } = await supabase
      .from('debts')
      .upsert(chunk, { onConflict: 'source_system,source_id' });

    if (debtErr) {
      throw new Error(`Upsert debts lỗi: ${debtErr.message}`);
    }
  }

  return {
    orderCount: orderPayloads.length,
    lineCount: linePayloads.length,
    productCount: productPayloads.length,
    debtCount: debtPayloads.length,
  };
}

