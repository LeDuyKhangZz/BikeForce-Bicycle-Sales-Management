export type PancakeOrder = Record<string, unknown>;

export type PancakeSource = {
  source_name: string;
  order_count: number;
  revenue: number;
};

export type PancakeDailySnapshot = {
  reportDate: string;
  orderCount: number;
  revenue: number;
  cancelledCount: number;
  cancelledRevenue: number;
  returnedCount: number;
  lateCount: number;
  adsOrderCount: number;
  adsGmv: number;
  sources: PancakeSource[];
};

export type PancakeMarketplaceFinancial = {
  marketplace_code: 'SHOPEE' | 'TIKTOK';
  delivered_count: number;
  gross_sales: number;
  shop_discount: number;
  marketplace_voucher: number;
  marketplace_fee: number;
  platform_receivable: number;
  cod: number;
  prepaid: number;
  capital: number;
  payment_fee: number;
  seller_transaction_fee: number;
  service_fee: number;
  sfp_service_fee: number;
  affiliate_commission: number;
  platform_commission: number;
  platform_shipping_fee: number;
  diff_shipping_fee: number;
  marketplace_tax: number;
  marketing_fee: number;
  ads_top_up: number;
};

const HOUR_MILLISECONDS = 60 * 60 * 1000;

function recordValue(value: unknown, field: string): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return Reflect.get(value, field);
}

function integerMoney(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isSafeInteger(parsed)) {
    throw new Error('Pancake trả total_price không hợp lệ.');
  }
  return parsed;
}

function signedInteger(value: unknown, field: string): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Pancake trả ${field} không hợp lệ.`);
  return parsed;
}

function nonnegativeInteger(value: unknown, field: string): number {
  const parsed = signedInteger(value, field);
  if (parsed < 0) throw new Error(`Pancake trả ${field} âm.`);
  return parsed;
}

function marketplaceCode(value: unknown): 'SHOPEE' | 'TIKTOK' | null {
  if (value === '-3') return 'SHOPEE';
  if (value === '-9') return 'TIKTOK';
  return null;
}

export function readMarketplaceFinancials(payload: unknown): PancakeMarketplaceFinancial[] {
  const data = recordValue(payload, 'data');
  if (!Array.isArray(data)) throw new Error('Pancake analytics không trả mảng data hợp lệ.');

  return data.flatMap((item) => {
    const code = marketplaceCode(recordValue(item, 'Order.marketplace_id'));
    if (code === null) return [];
    const result = recordValue(item, 'result');
    const grossSales = nonnegativeInteger(recordValue(result, 'price'), 'price');
    const shopDiscount = nonnegativeInteger(recordValue(result, 'discount'), 'discount');
    const marketplaceVoucher = nonnegativeInteger(
      recordValue(result, 'marketplace_voucher'),
      'marketplace_voucher',
    );
    const marketplaceFee = nonnegativeInteger(
      recordValue(result, 'fee_marketplace'),
      'fee_marketplace',
    );
    const platformReceivable = grossSales - shopDiscount + marketplaceVoucher - marketplaceFee;
    if (platformReceivable < 0) throw new Error('Pancake trả tiền sàn trả âm.');

    return [{
      marketplace_code: code,
      delivered_count: nonnegativeInteger(recordValue(result, 'delivered_count'), 'delivered_count'),
      gross_sales: grossSales,
      shop_discount: shopDiscount,
      marketplace_voucher: marketplaceVoucher,
      marketplace_fee: marketplaceFee,
      platform_receivable: platformReceivable,
      cod: nonnegativeInteger(recordValue(result, 'cod'), 'cod'),
      prepaid: signedInteger(recordValue(result, 'prepaid'), 'prepaid'),
      capital: nonnegativeInteger(recordValue(result, 'capital'), 'capital'),
      payment_fee: nonnegativeInteger(recordValue(result, 'payment_fee'), 'payment_fee'),
      seller_transaction_fee: nonnegativeInteger(
        recordValue(result, 'seller_transaction_fee'),
        'seller_transaction_fee',
      ),
      service_fee: nonnegativeInteger(recordValue(result, 'service_fee'), 'service_fee'),
      sfp_service_fee: nonnegativeInteger(recordValue(result, 'sfp_service_fee'), 'sfp_service_fee'),
      affiliate_commission: nonnegativeInteger(
        recordValue(result, 'affiliate_commission'),
        'affiliate_commission',
      ),
      platform_commission: nonnegativeInteger(
        recordValue(result, 'platform_commission'),
        'platform_commission',
      ),
      platform_shipping_fee: nonnegativeInteger(
        recordValue(result, 'platform_shipping_fee'),
        'platform_shipping_fee',
      ),
      diff_shipping_fee: signedInteger(recordValue(result, 'diff_shipping_fee'), 'diff_shipping_fee'),
      marketplace_tax: nonnegativeInteger(recordValue(result, 'marketplace_tax'), 'marketplace_tax'),
      marketing_fee: nonnegativeInteger(recordValue(result, 'marketing_fee'), 'marketing_fee'),
      ads_top_up: nonnegativeInteger(recordValue(result, 'ads_top_up'), 'ads_top_up'),
    }];
  });
}

function statusNumber(order: PancakeOrder): number {
  const parsed = Number(recordValue(order, 'status'));
  if (!Number.isInteger(parsed)) {
    throw new Error('Pancake trả status không hợp lệ.');
  }
  return parsed;
}

export function getDayUnixRange(
  reportDate: string,
  utcOffsetHours: 7 | 8,
): { start: number; end: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
    throw new Error('Ngày báo cáo phải có định dạng YYYY-MM-DD.');
  }
  const offset = String(utcOffsetHours).padStart(2, '0');
  const startMilliseconds = Date.parse(`${reportDate}T00:00:00+${offset}:00`);
  if (!Number.isFinite(startMilliseconds)) {
    throw new Error('Ngày báo cáo không hợp lệ.');
  }
  return {
    start: Math.floor(startMilliseconds / 1000),
    end: Math.floor((startMilliseconds + 24 * 60 * 60 * 1000 - 1000) / 1000),
  };
}

export function isOrderOnDate(
  order: PancakeOrder,
  reportDate: string,
  utcOffsetHours: 7 | 8,
): boolean {
  const raw = recordValue(order, 'inserted_at');
  if (raw === undefined || raw === null || raw === '') {
    return false;
  }
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  const milliseconds = Number.isFinite(numeric)
    ? Math.abs(numeric) >= 100_000_000_000 ? numeric : numeric * 1000
    : Date.parse(String(raw));
  if (!Number.isFinite(milliseconds)) {
    throw new Error('Pancake trả inserted_at không hợp lệ.');
  }
  const localIso = new Date(milliseconds + utcOffsetHours * HOUR_MILLISECONDS).toISOString();
  return localIso.slice(0, 10) === reportDate;
}

export function getVietnamDayUnixRange(reportDate: string): { start: number; end: number } {
  return getDayUnixRange(reportDate, 7);
}

export function isOrderOnVietnamDate(order: PancakeOrder, reportDate: string): boolean {
  return isOrderOnDate(order, reportDate, 7);
}

export function isSingaporeMarketplaceOrder(order: PancakeOrder): boolean {
  const sourceName = String(recordValue(order, 'order_sources_name') ?? '').trim().toLowerCase();
  return sourceName === 'shopee' || sourceName === 'tiktok';
}

function isLate(order: PancakeOrder, now: Date): boolean {
  const additionalInfo = recordValue(order, 'additional_info');
  const deadline = recordValue(additionalInfo, 'delivery_deadline');
  if (deadline === undefined || deadline === null || deadline === '') {
    return false;
  }
  const milliseconds = Date.parse(String(deadline));
  if (!Number.isFinite(milliseconds)) {
    throw new Error('Pancake trả delivery_deadline không hợp lệ.');
  }
  return milliseconds < now.getTime();
}

function hasAdsSignal(order: PancakeOrder): boolean {
  return ['ads_source', 'ad_id', 'p_utm_campaign'].some((field) => {
    const value = recordValue(order, field);
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
}

export function buildPancakeSnapshot(
  reportDate: string,
  orders: PancakeOrder[],
  now = new Date(),
): PancakeDailySnapshot {
  let revenue = 0;
  let cancelledCount = 0;
  let cancelledRevenue = 0;
  let returnedCount = 0;
  let lateCount = 0;
  let adsOrderCount = 0;
  let adsGmv = 0;
  const sourceBuckets = new Map<string, { orderCount: number; revenue: number }>();

  for (const order of orders) {
    const status = statusNumber(order);
    const price = integerMoney(recordValue(order, 'total_price'));
    if (status === 6) {
      cancelledCount += 1;
      cancelledRevenue += price;
      continue;
    }
    revenue += price;
    if (status === 4 || status === 5) returnedCount += 1;
    if ((status === 1 || status === 2) && isLate(order, now)) lateCount += 1;
    if (hasAdsSignal(order)) {
      adsOrderCount += 1;
      adsGmv += price;
    }
    const rawSource = recordValue(order, 'order_sources_name');
    const sourceName = String(rawSource ?? '').trim() || 'Không xác định';
    const current = sourceBuckets.get(sourceName) ?? { orderCount: 0, revenue: 0 };
    sourceBuckets.set(sourceName, {
      orderCount: current.orderCount + 1,
      revenue: current.revenue + price,
    });
  }

  return {
    reportDate,
    orderCount: orders.length,
    revenue,
    cancelledCount,
    cancelledRevenue,
    returnedCount,
    lateCount,
    adsOrderCount,
    adsGmv,
    sources: [...sourceBuckets.entries()]
      .sort(([left], [right]) => left.localeCompare(right, 'vi'))
      .map(([sourceName, value]) => ({
        source_name: sourceName,
        order_count: value.orderCount,
        revenue: value.revenue,
      })),
  };
}

export function readOrderPage(payload: unknown): PancakeOrder[] {
  const data = recordValue(payload, 'data');
  if (!Array.isArray(data)) {
    throw new Error('Pancake không trả mảng data hợp lệ.');
  }
  return data.filter((item): item is PancakeOrder => typeof item === 'object' && item !== null && !Array.isArray(item));
}
