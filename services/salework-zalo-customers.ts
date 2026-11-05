import type { SupabaseClient } from '@supabase/supabase-js';

import { buildPageInfo, pageRange, type PageInfo } from '@/lib/reports/pagination';
import { getVietnamDateFromTimestamp, getVietnamMonthRange, getVietnamToday } from '@/lib/date';
import type { Database } from '@/types/database.types';

export type SaleWorkZaloCustomer = {
  id: string;
  sourceId: string;
  name: string;
  phone: string | null;
  category: 'Bạn bè' | 'Danh bạ Salework' | 'Lời mời kết bạn';
  source: 'Zalo' | 'SaleWork' | 'Lời mời kết bạn';
  syncedAt: string;
};

export type SaleWorkZaloDailySyncCount = {
  date: string;
  label: string;
  friends: number;
  directory: number;
  requests: number;
  total: number;
};

export type SaleWorkZaloCustomerPage = {
  rows: SaleWorkZaloCustomer[];
  pageInfo: PageInfo;
  counts: { total: number; friends: number; directory: number; requests: number };
  latestSync: string | null;
  dailySyncCounts: SaleWorkZaloDailySyncCount[];
};

export type SaleWorkZaloCustomerCategoryFilter = 'all' | 'friends' | 'directory' | 'requests';

export type SaleWorkZaloCustomerDialogPage = {
  rows: SaleWorkZaloCustomer[];
  pageInfo: PageInfo;
};

function contactCategory(sourceId: string): SaleWorkZaloCustomer['category'] {
  if (sourceId.startsWith('FRIEND:')) return 'Bạn bè';
  if (sourceId.startsWith('REQUEST:')) return 'Lời mời kết bạn';
  return 'Danh bạ Salework';
}

function contactSource(sourceId: string): SaleWorkZaloCustomer['source'] {
  if (sourceId.startsWith('FRIEND:')) return 'Zalo';
  if (sourceId.startsWith('REQUEST:')) return 'Lời mời kết bạn';
  return 'SaleWork';
}

function recentVietnamDays(): string[] {
  const today = new Date(`${getVietnamToday()}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
}

function emptyDailySyncCounts(): SaleWorkZaloDailySyncCount[] {
  return recentVietnamDays().map((date) => ({
    date,
    label: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
    friends: 0,
    directory: 0,
    requests: 0,
    total: 0,
  }));
}

async function getDailySyncCounts(supabase: SupabaseClient<Database>): Promise<SaleWorkZaloDailySyncCount[]> {
  const dates = recentVietnamDays();
  const firstDate = dates[0];
  const today = dates.at(-1);
  if (!firstDate || !today) return [];
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const nextDate = tomorrow.toISOString().slice(0, 10);
  const dayMap = new Map(dates.map((date) => [date, { date, label: `${date.slice(8, 10)}/${date.slice(5, 7)}`, friends: 0, directory: 0, requests: 0, total: 0 }]));

  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('customers')
      .select('source_id,synced_at')
      .eq('source_system', 'SALEWORK_ZALO')
      .gte('synced_at', `${firstDate}T00:00:00+07:00`)
      .lt('synced_at', `${nextDate}T00:00:00+07:00`)
      .range(offset, offset + 499);
    if (error) throw new Error('Không tải được hoạt động đồng bộ SaleWork trong 7 ngày gần nhất.');
    for (const row of data ?? []) {
      const localDate = getVietnamDateFromTimestamp(row.synced_at);
      const day = localDate ? dayMap.get(localDate) : undefined;
      if (!day) continue;
      if (row.source_id.startsWith('FRIEND:')) day.friends += 1;
      else if (row.source_id.startsWith('REQUEST:')) day.requests += 1;
      else day.directory += 1;
      day.total += 1;
    }
    if (!data || data.length < 500) break;
  }

  return [...dayMap.values()];
}

export async function listSaleWorkZaloCustomers(
  supabase: SupabaseClient<Database>,
  requestedPage: number,
  search: string,
  filters: { category?: 'all' | 'friends' | 'directory' | 'requests'; month?: string } = {},
): Promise<SaleWorkZaloCustomerPage> {
  const pageSize = 8;
  const { from } = pageRange(requestedPage, pageSize);
  const normalizedSearch = search.replace(/[^\p{L}\p{N}\s+-]/gu, ' ').replace(/\s+/g, ' ').trim();

  let query = supabase
    .from('customers')
    .select('id,source_id,customer_name,phone,synced_at', { count: 'exact' })
    .eq('source_system', 'SALEWORK_ZALO')
    .order('customer_name', { ascending: true })
    .range(from, from + pageSize - 1);
  if (normalizedSearch) {
    query = query.or(`customer_name.ilike.%${normalizedSearch}%,phone.ilike.%${normalizedSearch}%`);
  }
  if (filters.category === 'friends') query = query.like('source_id', 'FRIEND:%');
  if (filters.category === 'directory') query = query.like('source_id', 'CONTACT:%');
  if (filters.category === 'requests') query = query.like('source_id', 'REQUEST:%');
  const monthRange = filters.month ? getVietnamMonthRange(filters.month) : null;
  if (monthRange) query = query.gte('synced_at', `${monthRange.from}T00:00:00+07:00`).lte('synced_at', `${monthRange.to}T23:59:59.999+07:00`);

  const countByPrefix = async (prefix: string) => {
    const { count, error } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('source_system', 'SALEWORK_ZALO')
      .like('source_id', `${prefix}:%`);
    if (error) throw new Error(`Không tải được tổng số liên hệ SaleWork (${prefix}).`);
    return count ?? 0;
  };

  const [result, friends, directory, requests, latest, dailySyncCounts] = await Promise.all([
    query,
    countByPrefix('FRIEND'),
    countByPrefix('CONTACT'),
    countByPrefix('REQUEST'),
    supabase
      .from('customers')
      .select('synced_at')
      .eq('source_system', 'SALEWORK_ZALO')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getDailySyncCounts(supabase).catch((error: unknown) => {
      console.error('[listSaleWorkZaloCustomers] daily chart unavailable', error);
      return emptyDailySyncCounts();
    }),
  ]);

  if (result.error) throw new Error('Không tải được danh sách liên hệ SaleWork.');
  if (latest.error) throw new Error('Không tải được thời điểm đồng bộ SaleWork.');

  const rows = (result.data ?? []).map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    name: row.customer_name,
    phone: row.phone,
    category: contactCategory(row.source_id),
    source: contactSource(row.source_id),
    syncedAt: row.synced_at,
  }));
  const total = result.count ?? rows.length;

  return {
    rows,
    pageInfo: buildPageInfo(total, requestedPage, pageSize),
    counts: { total: friends + directory + requests, friends, directory, requests },
    latestSync: latest.data?.synced_at ?? null,
    dailySyncCounts,
  };
}

export async function searchSaleWorkZaloCustomerDialog(
  supabase: SupabaseClient<Database>,
  requestedPage: number,
  search: string,
  category: SaleWorkZaloCustomerCategoryFilter,
): Promise<SaleWorkZaloCustomerDialogPage> {
  const pageSize = 10;
  const { from, to } = pageRange(requestedPage, pageSize);
  const normalizedSearch = search.replace(/[,()%*\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  let query = supabase
    .from('customers')
    .select('id,source_id,customer_name,phone,synced_at', { count: 'exact' })
    .eq('source_system', 'SALEWORK_ZALO')
    .order('customer_name', { ascending: true })
    .range(from, to);

  if (category === 'friends') query = query.like('source_id', 'FRIEND:%');
  if (category === 'directory') query = query.like('source_id', 'CONTACT:%');
  if (category === 'requests') query = query.like('source_id', 'REQUEST:%');
  if (normalizedSearch) query = query.or(`customer_name.ilike.%${normalizedSearch}%,phone.ilike.%${normalizedSearch}%`);

  const { data, count, error } = await query;
  if (error) {
    console.error('[searchSaleWorkZaloCustomerDialog]', error.code, error.message);
    throw new Error('Không tải được danh sách liên hệ.');
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    name: row.customer_name,
    phone: row.phone,
    category: contactCategory(row.source_id),
    source: contactSource(row.source_id),
    syncedAt: row.synced_at,
  }));
  return { rows, pageInfo: buildPageInfo(count ?? rows.length, requestedPage, pageSize) };
}
