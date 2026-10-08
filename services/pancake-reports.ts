import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';
import { pancakeReportImageSchema } from '@/lib/validation/pancake-report';

type PancakeDailyReportRow = Database['public']['Tables']['pancake_daily_reports']['Row'];
type PancakeSourceReportRow =
  Database['public']['Tables']['pancake_daily_source_reports']['Row'];

export type PancakeDailyReport = {
  daily: PancakeDailyReportRow;
  sources: PancakeSourceReportRow[];
};

const SOURCE_PAGE_SIZE = 50;

export async function getLatestPancakeDailyReport(
  supabase: SupabaseClient<Database>,
): Promise<PancakeDailyReport | null> {
  const { data: daily, error: dailyError } = await supabase
    .from('pancake_daily_reports')
    .select(
      'report_date,shop_id,employee_name,order_count,revenue,cancelled_count,returned_count,late_count,ads_order_count,ads_gmv,synced_at',
    )
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dailyError) {
    console.error('[getLatestPancakeDailyReport]', dailyError.code, dailyError.message);
    return null;
  }
  if (daily === null) return null;

  const { data: sources, error: sourcesError } = await supabase
    .from('pancake_daily_source_reports')
    .select('report_date,shop_id,source_name,order_count,revenue,synced_at', { count: 'exact' })
    .eq('report_date', daily.report_date)
    .eq('shop_id', daily.shop_id)
    .order('source_name', { ascending: true })
    .range(0, SOURCE_PAGE_SIZE - 1);

  if (sourcesError) {
    console.error('[getLatestPancakeDailyReport:sources]', sourcesError.code, sourcesError.message);
    return null;
  }

  return { daily, sources: sources ?? [] };
}

export async function getLatestPancakeReportForImage(
  supabase: SupabaseClient<Database>,
): Promise<PancakeDailyReport | null> {
  const { data, error } = await supabase.rpc('get_latest_pancake_report_image');
  if (error) {
    console.error('[getLatestPancakeReportForImage]', error.code, error.message);
    return null;
  }
  if (data === null) return null;

  const parsed = pancakeReportImageSchema.safeParse(data);
  if (!parsed.success) {
    console.error('[getLatestPancakeReportForImage] Invalid RPC response');
    return null;
  }

  return parsed.data;
}
