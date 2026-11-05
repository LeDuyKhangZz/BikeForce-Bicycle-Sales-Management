import type { SupabaseClient } from '@supabase/supabase-js';

import {
  OPERATIONS_PAGE_SIZE,
  type InventoryFilters,
} from '@/lib/operations/filters';
import { fetchMisaInventoryLedgers } from '@/lib/operations/misa-public-api';
import type {
  InventoryRowRaw,
  WarehouseSummaryRaw,
} from '@/lib/operations/view-models';
import { buildPageInfo, pageRange, type PageInfo } from '@/lib/reports/pagination';
import type { Database } from '@/types/database.types';

const WAREHOUSE_PAGE_LIMIT = 1000;
const MAX_WAREHOUSE_SCAN_PAGES = 40;
const UPSERT_CHUNK_SIZE = 200;

export type SyncMisaInventorySummary = {
  warehouseCount: number;
  itemCount: number;
};

export async function getAdminInventoryWarehouses(
  supabase: SupabaseClient<Database>,
): Promise<WarehouseSummaryRaw[]> {
  const { data, error } = await supabase.rpc('get_admin_inventory_warehouses');

  if (!error && Array.isArray(data)) {
    return data.map((row) => ({
      warehouseCode: row.warehouse_code,
      productCount: Number(row.product_count ?? 0),
      inStockCount: Number(row.in_stock_count ?? 0),
      quantityOnHand: Number(row.quantity_on_hand ?? 0),
      latestSyncedAt: row.latest_synced_at ?? null,
    }));
  }

  // Dự phòng khi migration RPC chưa được push lên cloud:
  // Tải song song toàn bộ các dòng còn tồn (quantity_on_hand > 0) trên tất cả các kho
  // để lấy đủ toàn bộ danh sách kho thay vì bị cắt cụt ở 1.000 dòng đầu tiên của kho CEO.
  const firstPage = await supabase
    .from('inventory')
    .select('warehouse_code,quantity_on_hand,synced_at', { count: 'exact' })
    .gt('quantity_on_hand', 0)
    .order('warehouse_code', { ascending: true })
    .range(0, WAREHOUSE_PAGE_LIMIT - 1);

  const allRows = [...(firstPage.data ?? [])];
  const totalInStock = firstPage.count ?? allRows.length;
  const totalPages = Math.min(
    Math.ceil(totalInStock / WAREHOUSE_PAGE_LIMIT),
    MAX_WAREHOUSE_SCAN_PAGES,
  );

  if (totalPages > 1) {
    const pagePromises = Array.from({ length: totalPages - 1 }, (_, idx) => {
      const pageIndex = idx + 1;
      const from = pageIndex * WAREHOUSE_PAGE_LIMIT;
      const to = from + WAREHOUSE_PAGE_LIMIT - 1;
      return supabase
        .from('inventory')
        .select('warehouse_code,quantity_on_hand,synced_at')
        .gt('quantity_on_hand', 0)
        .order('warehouse_code', { ascending: true })
        .range(from, to);
    });

    const extraPages = await Promise.all(pagePromises);
    for (const page of extraPages) {
      if (page.data) {
        allRows.push(...page.data);
      }
    }
  }

  const buckets = new Map<string, WarehouseSummaryRaw>();
  for (const row of allRows) {
    const qty = Number(row.quantity_on_hand ?? 0);
    const existing = buckets.get(row.warehouse_code) ?? {
      warehouseCode: row.warehouse_code,
      productCount: 0,
      inStockCount: 0,
      quantityOnHand: 0,
      latestSyncedAt: null,
    };
    existing.productCount += 1;
    if (qty > 0) existing.inStockCount += 1;
    existing.quantityOnHand += qty;
    if (existing.latestSyncedAt === null || row.synced_at > existing.latestSyncedAt) {
      existing.latestSyncedAt = row.synced_at;
    }
    buckets.set(row.warehouse_code, existing);
  }

  return [...buckets.values()].sort((a, b) => a.warehouseCode.localeCompare(b.warehouseCode, 'vi'));
}

export async function listAdminInventory(
  supabase: SupabaseClient<Database>,
  filters: InventoryFilters,
  requestedPage: number,
): Promise<{ rows: InventoryRowRaw[]; pageInfo: PageInfo }> {
  const { from, to } = pageRange(requestedPage, OPERATIONS_PAGE_SIZE);

  let query = supabase
    .from('inventory')
    .select(
      `
      id,
      warehouse_code,
      quantity_on_hand,
      quantity_reserved,
      quantity_available,
      synced_at,
      products:product_id!inner (
        product_code,
        product_name,
        unit
      )
    `,
      { count: 'exact' },
    )
    .order('quantity_on_hand', { ascending: false })
    .order('warehouse_code', { ascending: true });

  if (filters.warehouse !== null) {
    query = query.eq('warehouse_code', filters.warehouse);
  }
  if (filters.stock === 'in') {
    query = query.gt('quantity_on_hand', 0);
  } else if (filters.stock === 'out') {
    query = query.eq('quantity_on_hand', 0);
  }
  if (filters.search !== null) {
    query = query.or(
      `product_code.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%`,
      { referencedTable: 'products' },
    );
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error('[listAdminInventory]', error.code, error.message);
    return {
      rows: [],
      pageInfo: buildPageInfo(0, requestedPage, OPERATIONS_PAGE_SIZE),
    };
  }

  const rows: InventoryRowRaw[] = (data ?? []).map((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const onHand = Number(row.quantity_on_hand ?? 0);
    const reserved = Number(row.quantity_reserved ?? 0);
    const available =
      row.quantity_available !== null && row.quantity_available !== undefined
        ? Number(row.quantity_available)
        : Math.max(0, onHand - reserved);

    return {
      id: row.id,
      warehouseCode: row.warehouse_code,
      productCode: product?.product_code ?? '—',
      productName: product?.product_name ?? product?.product_code ?? 'Sản phẩm MISA',
      unit: product?.unit ?? 'Cái',
      quantityOnHand: onHand,
      quantityReserved: reserved,
      quantityAvailable: available,
      syncedAt: row.synced_at,
    };
  });

  return {
    rows,
    pageInfo: buildPageInfo(count ?? rows.length, requestedPage, OPERATIONS_PAGE_SIZE),
  };
}

export async function syncMisaInventoryFromApi(
  supabase: SupabaseClient<Database>,
  options: { warehouseCode?: string | null } = {},
): Promise<SyncMisaInventorySummary> {
  const ledgers = await fetchMisaInventoryLedgers({
    warehouseCode: options.warehouseCode ?? null,
  });

  if (ledgers.length === 0) {
    return { warehouseCount: 0, itemCount: 0 };
  }

  const nowIso = new Date().toISOString();
  const productMetaByCode = new Map<
    string,
    { productCode: string; productName: string; unit: string }
  >();

  for (const ledger of ledgers) {
    for (const item of ledger.items) {
      if (!productMetaByCode.has(item.productCode)) {
        productMetaByCode.set(item.productCode, {
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
        });
      }
    }
  }

  const allProductCodes = [...productMetaByCode.keys()];
  const productIdByCode = new Map<string, string>();

  // 1. Tra cứu sản phẩm đã có trong bảng products để giữ nguyên tên đầy đủ từ đơn hàng
  for (let i = 0; i < allProductCodes.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = allProductCodes.slice(i, i + UPSERT_CHUNK_SIZE);
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id,product_code')
      .eq('source_system', 'MISA')
      .in('product_code', chunk);

    for (const p of existingProducts ?? []) {
      productIdByCode.set(p.product_code, p.id);
    }
  }

  // 2. Chỉ thêm mới các mã sản phẩm chưa tồn tại trong bảng products
  const missingPayloads: Database['public']['Tables']['products']['Insert'][] = [];
  for (const [code, meta] of productMetaByCode.entries()) {
    if (!productIdByCode.has(code)) {
      missingPayloads.push({
        source_system: 'MISA',
        source_id: code,
        product_code: code,
        product_name: meta.productName,
        unit: meta.unit,
        source_updated_at: nowIso,
        synced_at: nowIso,
      });
    }
  }

  for (let i = 0; i < missingPayloads.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = missingPayloads.slice(i, i + UPSERT_CHUNK_SIZE);
    const { data: insertedProducts, error: productErr } = await supabase
      .from('products')
      .upsert(chunk, { onConflict: 'source_system,source_id' })
      .select('id,product_code');

    if (productErr) {
      throw new Error(`Upsert products cho tồn kho lỗi: ${productErr.message}`);
    }
    for (const p of insertedProducts ?? []) {
      productIdByCode.set(p.product_code, p.id);
    }
  }

  // 3. Upsert tồn kho theo từng cặp (warehouse_code, product_id)
  const inventoryMap = new Map<
    string,
    Database['public']['Tables']['inventory']['Insert']
  >();

  for (const ledger of ledgers) {
    for (const item of ledger.items) {
      const productId = productIdByCode.get(item.productCode);
      if (!productId) continue;

      inventoryMap.set(`${ledger.warehouseCode}:${productId}`, {
        source_system: 'MISA',
        warehouse_code: ledger.warehouseCode,
        product_id: productId,
        quantity_on_hand: item.quantityOnHand,
        quantity_reserved: 0,
        source_updated_at: nowIso,
        synced_at: nowIso,
      });
    }
  }

  const inventoryPayloads = [...inventoryMap.values()];
  for (let i = 0; i < inventoryPayloads.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = inventoryPayloads.slice(i, i + UPSERT_CHUNK_SIZE);
    const { error: invErr } = await supabase
      .from('inventory')
      .upsert(chunk, { onConflict: 'source_system,warehouse_code,product_id' });

    if (invErr) {
      throw new Error(`Upsert inventory lỗi: ${invErr.message}`);
    }
  }

  return {
    warehouseCount: ledgers.length,
    itemCount: inventoryPayloads.length,
  };
}

