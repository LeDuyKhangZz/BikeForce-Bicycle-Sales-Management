import fs from 'node:fs';
import path from 'node:path';

import { isValidVietnamDate } from '@/lib/date';

const DEFAULT_AMIS_API_BASE = 'https://crmconnect.misa.vn/api/v2';
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 45_000;
const WAREHOUSE_CONCURRENCY = 6;

export type MisaNormalizedOrderLine = {
  sourceLineId: string;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
};

export type MisaNormalizedOrder = {
  sourceId: string;
  orderCode: string;
  orderDate: string;
  customerCode: string;
  employeeCode: string;
  employeeName: string;
  status: string;
  currencyCode: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  outstandingAmount: number;
  dueDate: string | null;
  sourceUpdatedAt: string | null;
  lines: MisaNormalizedOrderLine[];
};

export type MisaWarehouseLedgerItem = {
  productCode: string;
  productName: string;
  unit: string;
  quantityOnHand: number;
};

export type MisaWarehouseLedger = {
  warehouseCode: string;
  items: MisaWarehouseLedgerItem[];
};

type MisaPublicCredentials = {
  apiBase: string;
  clientId: string;
  clientSecret: string;
  defaultStockCode: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readEnvFileFallbacks(): Record<string, string> {
  const result: Record<string, string> = {};
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'scripts', 'amis-sync', '.env'),
  ];

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex <= 0) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const rawVal = trimmed
          .slice(eqIndex + 1)
          .trim()
          .replace(/^['"]|['"]$/g, '');
        if (key !== '' && result[key] === undefined && rawVal !== '') {
          result[key] = rawVal;
        }
      }
    } catch {
      // Bỏ qua nếu môi trường serverless không có file .env cục bộ.
    }
  }

  return result;
}

export function resolveMisaPublicCredentials(): MisaPublicCredentials | null {
  const fallback = readEnvFileFallbacks();
  const apiBase = (
    process.env.AMIS_API_BASE ??
    fallback['AMIS_API_BASE'] ??
    DEFAULT_AMIS_API_BASE
  )
    .trim()
    .replace(/\/+$/, '');
  const clientId = (process.env.AMIS_CLIENT_ID ?? fallback['AMIS_CLIENT_ID'] ?? '').trim();
  const clientSecret = (
    process.env.AMIS_CLIENT_SECRET ??
    fallback['AMIS_CLIENT_SECRET'] ??
    ''
  ).trim();

  const defaultStockCode = (
    process.env.AMIS_STOCK_CODE ??
    fallback['AMIS_STOCK_CODE'] ??
    ''
  ).trim();

  if (clientId === '' || clientSecret === '') {
    return null;
  }

  return {
    apiBase,
    clientId,
    clientSecret,
    defaultStockCode: defaultStockCode === '' ? null : defaultStockCode,
  };
}

export function findMisaAccessToken(value: unknown): string | null {
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      const normalized = key.toLowerCase().replace(/[_-]/g, '');
      if (
        normalized === 'accesstoken' ||
        normalized === 'token' ||
        normalized === 'bearertoken' ||
        normalized === 'authorizationtoken'
      ) {
        if (typeof child === 'string' && child.trim() !== '') {
          return child.trim();
        }
      }
    }
    for (const child of Object.values(value)) {
      const found = findMisaAccessToken(child);
      if (found !== null) return found;
    }
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMisaAccessToken(item);
      if (found !== null) return found;
    }
    return null;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        return findMisaAccessToken(JSON.parse(text) as unknown);
      } catch {
        return null;
      }
    }
    if (text.length >= 40 && !text.includes(' ')) {
      return text;
    }
  }

  return null;
}

function extractMisaDataRows(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) return [];
  let rawRows: unknown = payload['data'] ?? payload['Data'];
  if (typeof rawRows === 'string') {
    try {
      rawRows = JSON.parse(rawRows) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(rawRows)) return [];
  return rawRows.filter(isRecord);
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 10) return null;
  const candidate = value.slice(0, 10);
  return isValidVietnamDate(candidate) ? candidate : null;
}

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function toNonNegativeNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

function cleanEmployeeName(value: unknown): string {
  const text = String(value ?? '').trim();
  const parenIndex = text.lastIndexOf(' (');
  if (parenIndex > 0 && text.endsWith(')')) {
    return text.slice(0, parenIndex).trim();
  }
  return text;
}

export function normalizeMisaOrderRow(row: Record<string, unknown>): MisaNormalizedOrder | null {
  const rawId = row['id'];
  const sourceId = rawId === undefined || rawId === null ? '' : String(rawId).trim();
  const orderCode = String(row['sale_order_no'] ?? '').trim();
  const orderDate = toIsoDate(row['sale_order_date'] ?? row['book_date']);

  if (sourceId === '' || orderCode === '' || orderDate === null) {
    return null;
  }

  const rawLines = row['sale_order_product_mappings'];
  const lines: MisaNormalizedOrderLine[] = [];

  if (Array.isArray(rawLines)) {
    for (const rawLine of rawLines) {
      if (!isRecord(rawLine) || rawLine['id'] === undefined || rawLine['id'] === null) {
        continue;
      }
      const productCode = String(rawLine['product_code'] ?? '').trim();
      if (productCode === '' || rawLine['is_note_row'] === true) {
        continue;
      }
      const productName = String(
        rawLine['description_product'] ?? rawLine['description'] ?? productCode,
      ).trim();
      const unit = String(rawLine['usage_unit'] ?? rawLine['unit'] ?? 'Cái').trim();
      const quantity = Math.max(
        toNonNegativeNumber(rawLine['usage_unit_amount'] ?? rawLine['amount']),
        0.001,
      );

      lines.push({
        sourceLineId: String(rawLine['id']).trim(),
        productCode,
        productName: productName === '' ? productCode : productName,
        unit: unit === '' ? 'Cái' : unit,
        quantity,
        unitPrice: toNonNegativeNumber(rawLine['usage_unit_price'] ?? rawLine['price']),
        discountAmount: toNonNegativeNumber(rawLine['discount']),
        lineTotal: toNonNegativeNumber(
          rawLine['to_currency_after_discount'] ?? rawLine['total'],
        ),
      });
    }
  }

  const totalAmount = toNonNegativeNumber(
    row['sale_order_amount'] ?? row['to_currency_summary'],
  );
  const subtotal = toNonNegativeNumber(
    row['to_currency_summary'] ?? row['sale_order_amount'] ?? totalAmount,
  );
  const status = String(row['revenue_status'] ?? row['status'] ?? 'UNKNOWN').trim();
  const currencyCode = String(row['currency_type'] ?? 'VND').trim();

  return {
    sourceId,
    orderCode,
    orderDate,
    customerCode: String(row['account_code'] ?? '').trim(),
    employeeCode: String(row['employee_code'] ?? '').trim(),
    employeeName: cleanEmployeeName(row['owner_name'] ?? row['recorded_sale_users_name']),
    status: status === '' ? 'UNKNOWN' : status,
    currencyCode: currencyCode === '' ? 'VND' : currencyCode,
    subtotal,
    discountAmount: toNonNegativeNumber(row['discount_summary']),
    totalAmount,
    outstandingAmount: toNonNegativeNumber(row['balance_receipt_amount']),
    dueDate: toIsoDate(row['due_date']),
    sourceUpdatedAt: toIsoTimestamp(row['modified_date']),
    lines,
  };
}

export async function fetchMisaAccessToken(
  credentials: MisaPublicCredentials,
): Promise<string> {
  const response = await fetch(`${credentials.apiBase}/Account`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`MISA /Account trả HTTP ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const token = findMisaAccessToken(payload);
  if (token === null) {
    throw new Error('Không tìm thấy access token từ MISA /Account');
  }

  return token;
}

export async function fetchMisaRecentSaleOrders(options: {
  fromDate?: string | null;
  maxPages?: number;
}): Promise<MisaNormalizedOrder[]> {
  const credentials = resolveMisaPublicCredentials();
  if (credentials === null) {
    throw new Error('MISSING_MISA_CREDENTIALS');
  }

  const token = await fetchMisaAccessToken(credentials);
  const headers = {
    Authorization: `Bearer ${token}`,
    Clientid: credentials.clientId,
    Accept: 'application/json',
  };

  const maxPages = options.maxPages ?? 5;
  const fromDate = options.fromDate ?? null;
  const seenIds = new Set<string>();
  const orders: MisaNormalizedOrder[] = [];

  const pages = Array.from({ length: maxPages }, (_, idx) => idx + 1);
  const pageResults = await Promise.all(
    pages.map((page) => fetchMisaPage(credentials.apiBase, '/SaleOrders', headers, page)),
  );

  for (const rows of pageResults) {
    for (const row of rows) {
      const sourceId = String(row['id'] ?? '').trim();
      if (sourceId === '' || seenIds.has(sourceId)) continue;
      seenIds.add(sourceId);

      const normalized = normalizeMisaOrderRow(row);
      if (normalized === null) continue;
      if (fromDate !== null && normalized.orderDate < fromDate) continue;

      orders.push(normalized);
    }
  }

  return orders;
}

async function fetchMisaPage(
  apiBase: string,
  pathName: string,
  headers: Record<string, string>,
  page: number,
  extraParams?: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  const url = new URL(`${apiBase}${pathName}`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('pageSize', String(PAGE_SIZE));
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`MISA ${pathName} trả HTTP ${response.status}`);
  }

  return extractMisaDataRows((await response.json()) as unknown);
}

async function fetchAllMisaPages(
  apiBase: string,
  pathName: string,
  headers: Record<string, string>,
  extraParams?: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  const result: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const batchPages = 6;

  for (let startPage = 1; startPage <= 24; startPage += batchPages) {
    const pages = Array.from({ length: batchPages }, (_, idx) => startPage + idx);
    const pageResponses = await Promise.all(
      pages.map((page) => fetchMisaPage(apiBase, pathName, headers, page, extraParams)),
    );

    let shouldStop = false;
    for (const rows of pageResponses) {
      let newCount = 0;
      for (const row of rows) {
        const identity = String(
          row['async_id'] ?? row['product_code'] ?? row['stock_code'] ?? '',
        ).trim();
        if (identity === '' || seen.has(identity)) continue;
        seen.add(identity);
        result.push(row);
        newCount += 1;
      }
      if (rows.length < PAGE_SIZE || newCount === 0) {
        shouldStop = true;
      }
    }

    if (shouldStop) break;
  }

  return result;
}

export async function fetchMisaInventoryLedgers(options: {
  warehouseCode?: string | null;
}): Promise<MisaWarehouseLedger[]> {
  const credentials = resolveMisaPublicCredentials();
  if (credentials === null) {
    throw new Error('MISSING_MISA_CREDENTIALS');
  }

  const token = await fetchMisaAccessToken(credentials);
  const headers = {
    Authorization: `Bearer ${token}`,
    Clientid: credentials.clientId,
    Accept: 'application/json',
  };

  const targetWarehouse = options.warehouseCode?.trim() || null;

  const activeStockCodes: string[] = [];
  if (targetWarehouse !== null) {
    activeStockCodes.push(targetWarehouse);
  } else {
    const stocks = await fetchMisaPage(credentials.apiBase, '/Stocks', headers, 1);
    for (const stock of stocks) {
      if (stock['inactive'] === true) continue;
      const stockCode = String(stock['stock_code'] ?? '').trim();
      if (stockCode === '') continue;
      activeStockCodes.push(stockCode);
    }
  }

  const ledgers: MisaWarehouseLedger[] = [];

  for (let i = 0; i < activeStockCodes.length; i += WAREHOUSE_CONCURRENCY) {
    const chunk = activeStockCodes.slice(i, i + WAREHOUSE_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (warehouseCode): Promise<MisaWarehouseLedger> => {
        const rawItems = await fetchAllMisaPages(
          credentials.apiBase,
          '/Stocks/product_ledger',
          headers,
          { stock_code: warehouseCode },
        );

        const items: MisaWarehouseLedgerItem[] = [];
        for (const item of rawItems) {
          const productCode = String(item['product_code'] ?? '').trim();
          if (productCode === '') continue;
          const quantityOnHand = toNonNegativeNumber(item['main_stock_quantity']);
          if (quantityOnHand <= 0) continue;

          const productName = String(
            item['product_name'] ?? item['description'] ?? productCode,
          ).trim();
          const unit = String(item['unit'] ?? item['usage_unit'] ?? 'Cái').trim();
          items.push({
            productCode,
            productName: productName === '' ? productCode : productName,
            unit: unit === '' ? 'Cái' : unit,
            quantityOnHand,
          });
        }

        return { warehouseCode, items };
      }),
    );

    for (const ledger of chunkResults) {
      if (ledger.items.length > 0) {
        ledgers.push(ledger);
      }
    }
  }

  return ledgers;
}

