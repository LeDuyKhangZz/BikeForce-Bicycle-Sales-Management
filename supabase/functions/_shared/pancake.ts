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
  returnedCount: number;
  lateCount: number;
  adsOrderCount: number;
  adsGmv: number;
  sources: PancakeSource[];
};

const VIETNAM_OFFSET_MILLISECONDS = 7 * 60 * 60 * 1000;

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

function statusNumber(order: PancakeOrder): number {
  const parsed = Number(recordValue(order, 'status'));
  if (!Number.isInteger(parsed)) {
    throw new Error('Pancake trả status không hợp lệ.');
  }
  return parsed;
}

export function getVietnamDayUnixRange(reportDate: string): { start: number; end: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
    throw new Error('Ngày báo cáo phải có định dạng YYYY-MM-DD.');
  }
  const startMilliseconds = Date.parse(`${reportDate}T00:00:00+07:00`);
  if (!Number.isFinite(startMilliseconds)) {
    throw new Error('Ngày báo cáo không hợp lệ.');
  }
  return {
    start: Math.floor(startMilliseconds / 1000),
    end: Math.floor((startMilliseconds + 24 * 60 * 60 * 1000 - 1000) / 1000),
  };
}

export function isOrderOnVietnamDate(order: PancakeOrder, reportDate: string): boolean {
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
  const vietnamIso = new Date(milliseconds + VIETNAM_OFFSET_MILLISECONDS).toISOString();
  return vietnamIso.slice(0, 10) === reportDate;
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
