import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { AdFinanceRow } from '@/lib/reports/ad-finance';

export async function getAdFinanceRows(supabase: SupabaseClient<Database>): Promise<AdFinanceRow[]> {
  const { data, error } = await supabase.rpc('get_marketplace_ad_finance_summary');
  if (error) { console.error('[getAdFinanceRows]', error.code, error.message); return []; }
  return data;
}
