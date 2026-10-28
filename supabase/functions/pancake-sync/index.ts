import {
  PANCAKE_SINGAPORE_SHOP_ID,
  PANCAKE_VIETNAM_SHOP_ID,
} from '../../../lib/pancake/shops.ts';
import {
  buildPancakeSnapshot,
  getDayUnixRange,
  isOrderOnDate,
  isSingaporeMarketplaceOrder,
  readMarketplaceFinancials,
  readOrderPage,
  type PancakeOrder,
} from '../_shared/pancake.ts';

const PAGE_SIZE = 100;
const MAX_PAGES = 100;
const MAX_RETRIES = 3;
const FINANCIAL_FIELDS = [
  'delivered_count', 'price', 'discount', 'capital', 'fee_marketplace', 'surcharge',
  'affiliate_commission', 'platform_shipping_fee', 'sfp_service_fee', 'payment_fee',
  'seller_transaction_fee', 'service_fee', 'marketplace_voucher', 'diff_shipping_fee',
  'marketing_fee', 'platform_commission', 'marketplace_tax', 'ads_top_up',
] as const;

type ShopConfig = {
  readonly shopId: number;
  readonly apiKeySecret: 'PANCAKE_API_KEY' | 'PANCAKE_SG_API_KEY';
  readonly timeZone: 'Asia/Ho_Chi_Minh' | 'Asia/Singapore';
  readonly utcOffsetHours: 7 | 8;
  readonly sourceFilter: ((order: PancakeOrder) => boolean) | null;
};

const SHOP_CONFIGS: readonly ShopConfig[] = [
  {
    shopId: PANCAKE_VIETNAM_SHOP_ID,
    apiKeySecret: 'PANCAKE_API_KEY',
    timeZone: 'Asia/Ho_Chi_Minh',
    utcOffsetHours: 7,
    sourceFilter: null,
  },
  {
    shopId: PANCAKE_SINGAPORE_SHOP_ID,
    apiKeySecret: 'PANCAKE_SG_API_KEY',
    timeZone: 'Asia/Singapore',
    utcOffsetHours: 8,
    sourceFilter: isSingaporeMarketplaceOrder,
  },
];

function requiredSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Thiếu secret ${name}.`);
  return value;
}

function todayInTimeZone(timeZone: ShopConfig['timeZone']): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function fetchPage(
  config: ShopConfig,
  apiKey: string,
  reportDate: string,
  pageNumber: number,
): Promise<PancakeOrder[]> {
  const range = getDayUnixRange(reportDate, config.utcOffsetHours);
  const url = new URL(`https://pos.pages.fm/api/v1/shops/${config.shopId}/orders`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('startDateTime', String(range.start));
  url.searchParams.set('endDateTime', String(range.end));
  url.searchParams.set('page_size', String(PAGE_SIZE));
  url.searchParams.set('page_number', String(pageNumber));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (response.status === 401 || response.status === 403) throw new Error('Pancake từ chối API key.');
      if (!response.ok) throw new Error(`Pancake HTTP ${response.status}.`);
      return readOrderPage(await response.json());
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
    }
  }
  throw new Error('Không lấy được dữ liệu Pancake.');
}

async function fetchOrders(
  config: ShopConfig,
  apiKey: string,
  reportDate: string,
): Promise<PancakeOrder[]> {
  const orders: PancakeOrder[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const rows = await fetchPage(config, apiKey, reportDate, page);
    if (rows.length === 0) return orders;
    orders.push(...rows.filter((order) =>
      isOrderOnDate(order, reportDate, config.utcOffsetHours)
      && (config.sourceFilter === null || config.sourceFilter(order)),
    ));
  }
  throw new Error(`Pancake vượt giới hạn an toàn ${MAX_PAGES} trang.`);
}

async function fetchMarketplaceFinancials(
  config: ShopConfig,
  apiKey: string,
  reportDate: string,
) {
  const range = getDayUnixRange(reportDate, config.utcOffsetHours);
  const url = new URL(`https://pos.pages.fm/api/v1/shops/${config.shopId}/analytics/sale`);
  url.searchParams.set('api_key', apiKey);
  const body = JSON.stringify({
    params: {
      success_status: 0,
      success_record: 'inserted_at',
      returned_record: 'inserted_at',
      split_by: ['Order.marketplace_id'],
      select_fields: FINANCIAL_FIELDS,
      filter: { 'Order.status': ['3', '16'] },
      since: new Date(range.start * 1000).toISOString(),
      until: new Date(range.end * 1000 + 999).toISOString(),
    },
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error('Pancake từ chối API key cho analytics.');
      }
      if (!response.ok) throw new Error(`Pancake analytics HTTP ${response.status}.`);
      return readMarketplaceFinancials(await response.json());
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
    }
  }
  throw new Error('Không lấy được tài chính Pancake.');
}

async function syncShop(config: ShopConfig, serviceRoleKey: string): Promise<number> {
  const reportDate = todayInTimeZone(config.timeZone);
  const apiKey = requiredSecret(config.apiKeySecret);
  const orders = await fetchOrders(config, apiKey, reportDate);
  const snapshot = buildPancakeSnapshot(reportDate, orders);
  const response = await fetch(`${requiredSecret('SUPABASE_URL')}/rest/v1/rpc/upsert_pancake_daily_report`, {
    method: 'POST',
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_report_date: snapshot.reportDate,
      p_shop_id: config.shopId,
      p_order_count: snapshot.orderCount,
      p_revenue: snapshot.revenue,
      p_cancelled_count: snapshot.cancelledCount,
      p_cancelled_revenue: snapshot.cancelledRevenue,
      p_returned_count: snapshot.returnedCount,
      p_late_count: snapshot.lateCount,
      p_ads_order_count: snapshot.adsOrderCount,
      p_ads_gmv: snapshot.adsGmv,
      p_sources: snapshot.sources,
    }),
  });
  if (!response.ok) throw new Error(`RPC shop ${config.shopId} thất bại (HTTP ${response.status}).`);

  if (config.shopId === PANCAKE_VIETNAM_SHOP_ID) {
    const marketplaces = await fetchMarketplaceFinancials(config, apiKey, reportDate);
    const financialResponse = await fetch(
      `${requiredSecret('SUPABASE_URL')}/rest/v1/rpc/upsert_pancake_marketplace_financials`,
      {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_report_date: reportDate,
          p_shop_id: config.shopId,
          p_currency_code: 'VND',
          p_marketplaces: marketplaces,
        }),
      },
    );
    if (!financialResponse.ok) {
      throw new Error(`RPC tài chính shop ${config.shopId} thất bại (HTTP ${financialResponse.status}).`);
    }
  }
  console.log(JSON.stringify({ event: 'pancake_sync_completed', shopId: config.shopId, reportDate, orderCount: snapshot.orderCount }));
  return snapshot.orderCount;
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ ok: false, message: 'Method not allowed' }, { status: 405 });
  const serviceRoleKey = requiredSecret('SUPABASE_SERVICE_ROLE_KEY');
  const suppliedKey = request.headers.get('apikey');
  if (suppliedKey !== serviceRoleKey) return Response.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  const results = await Promise.allSettled(
    SHOP_CONFIGS.map(async (config) => ({
      shopId: config.shopId,
      orderCount: await syncShop(config, serviceRoleKey),
    })),
  );
  const failures = results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [];
    const config = SHOP_CONFIGS[index];
    const message = result.reason instanceof Error ? result.reason.message : 'Lỗi không xác định.';
    console.error(JSON.stringify({ event: 'pancake_sync_failed', shopId: config?.shopId, message }));
    return [{ shopId: config?.shopId ?? null, message }];
  });
  const successes = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  return Response.json(
    { ok: failures.length === 0, successes, failures },
    { status: failures.length === 0 ? 200 : 500 },
  );
}

Deno.serve(handler);
