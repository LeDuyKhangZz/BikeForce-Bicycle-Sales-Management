import {
  buildEcommerceReportViewModel,
  type EcommerceReportViewModel,
} from '@/lib/reports/ecommerce-report';
import { createClient } from '@/lib/supabase/server';
import { getLatestPancakeDailyReports } from '@/services/pancake-reports';

export type { EcommerceReportViewModel } from '@/lib/reports/ecommerce-report';

export async function getLatestEcommerceReportViewModel(): Promise<EcommerceReportViewModel | null> {
  const supabase = await createClient();
  const report = await getLatestPancakeDailyReports(supabase);
  if (report === null) return null;

  return buildEcommerceReportViewModel(report);
}
