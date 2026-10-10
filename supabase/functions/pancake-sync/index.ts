import { getVietnamToday } from '../../../lib/date.ts';
import { buildPancakeSnapshot, getVietnamDayUnixRange, isOrderOnVietnamDate, readOrderPage, type PancakeOrder } from '../_shared/pancake.ts';

const SHOP_ID = 1022081353;
const PAGE_SIZE = 100;
const MAX_PAGES = 100;
const MAX_RETRIES = 3;

function requiredSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Thiếu secret ${name}.`);
  return value;
}

async function fetchPage(apiKey: string, reportDate: string, pageNumber: number): Promise<PancakeOrder[]> {
  const range = getVietnamDayUnixRange(reportDate);
  const url = new URL(`https://pos.pages.fm/api/v1/shops/${SHOP_ID}/orders`);
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

async function fetchOrders(apiKey: string, reportDate: string): Promise<PancakeOrder[]> {
  const orders: PancakeOrder[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const rows = await fetchPage(apiKey, reportDate, page);
    if (rows.length === 0) return orders;
    orders.push(...rows.filter((order) => isOrderOnVietnamDate(order, reportDate)));
  }
  throw new Error(`Pancake vượt giới hạn an toàn ${MAX_PAGES} trang.`);
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ ok: false, message: 'Method not allowed' }, { status: 405 });
  const serviceRoleKey = requiredSecret('SUPABASE_SERVICE_ROLE_KEY');
  const suppliedKey = request.headers.get('apikey');
  if (suppliedKey !== serviceRoleKey) return Response.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const reportDate = getVietnamToday();
    const orders = await fetchOrders(requiredSecret('PANCAKE_API_KEY'), reportDate);
    const snapshot = buildPancakeSnapshot(reportDate, orders);
    const response = await fetch(`${requiredSecret('SUPABASE_URL')}/rest/v1/rpc/upsert_pancake_daily_report`, {
      method: 'POST',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_report_date: snapshot.reportDate,
        p_shop_id: SHOP_ID,
        p_order_count: snapshot.orderCount,
        p_revenue: snapshot.revenue,
        p_cancelled_count: snapshot.cancelledCount,
        p_returned_count: snapshot.returnedCount,
        p_late_count: snapshot.lateCount,
        p_ads_order_count: snapshot.adsOrderCount,
        p_ads_gmv: snapshot.adsGmv,
        p_sources: snapshot.sources,
      }),
    });
    if (!response.ok) throw new Error(`RPC đồng bộ thất bại (HTTP ${response.status}).`);
    console.log(JSON.stringify({ event: 'pancake_sync_completed', reportDate, orderCount: snapshot.orderCount }));
    return Response.json({ ok: true, reportDate, orderCount: snapshot.orderCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
    console.error(JSON.stringify({ event: 'pancake_sync_failed', message }));
    return Response.json({ ok: false, message }, { status: 500 });
  }
}

Deno.serve(handler);
