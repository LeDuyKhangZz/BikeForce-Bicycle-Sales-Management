import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

type TikTokAdBalanceSnapshotRow =
  Database['public']['Tables']['tiktok_ad_balance_snapshots']['Row'];

export async function getLatestTikTokAdBalance(
  supabase: SupabaseClient<Database>,
): Promise<TikTokAdBalanceSnapshotRow | null> {
  const { data, error } = await supabase
    .from('tiktok_ad_balance_snapshots')
    .select(
      'id,payment_portfolio_id,available_cash_balance,currency_code,captured_at,synced_at',
    )
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getLatestTikTokAdBalance]', error.code, error.message);
    return null;
  }

  return data;
}
