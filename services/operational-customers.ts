import type { SupabaseClient } from '@supabase/supabase-js';

import { buildPageInfo, pageRange, type PageInfo } from '@/lib/reports/pagination';
import { sanitizeOperationsSearch } from '@/lib/operations/filters';
import type { Database } from '@/types/database.types';

export const OPERATIONAL_CUSTOMERS_PAGE_SIZE = 50;

type CustomerRow = Pick<
  Database['public']['Tables']['customers']['Row'],
  'id' | 'source_id' | 'customer_code' | 'customer_name' | 'phone' | 'source_system' | 'synced_at'
> & { phone_raw: string | null };

export type OperationalCustomerPage = {
  rows: CustomerRow[];
  pageInfo: PageInfo;
};

export async function listOperationalCustomers(
  supabase: SupabaseClient<Database>,
  options: { page: number; search: string | null },
): Promise<OperationalCustomerPage> {
  const safePage = Number.isSafeInteger(options.page) && options.page > 0 ? options.page : 1;
  const search = sanitizeOperationsSearch(options.search ?? undefined);
  const { from, to } = pageRange(safePage, OPERATIONAL_CUSTOMERS_PAGE_SIZE);

  let query = supabase
    .from('customers')
    .select('id,source_id,customer_code,customer_name,phone,phone_raw,source_system,synced_at', { count: 'exact' })
    .eq('source_system', 'MISA')
    .order('customer_name', { ascending: true })
    .order('source_id', { ascending: true });

  if (search !== null) {
    query = query.or(`customer_code.ilike.%${search}%,customer_name.ilike.%${search}%`);
  }

  const { data, count, error } = await query.range(from, to).returns<CustomerRow[]>();
  if (error) throw new Error(`Không tải được danh bạ CRM: ${error.message}`);

  const total = count ?? 0;
  const pageInfo = buildPageInfo(total, safePage, OPERATIONAL_CUSTOMERS_PAGE_SIZE);
  if (pageInfo.page !== safePage && total > 0) {
    return listOperationalCustomers(supabase, { page: pageInfo.page, search });
  }

  return { rows: data ?? [], pageInfo };
}
