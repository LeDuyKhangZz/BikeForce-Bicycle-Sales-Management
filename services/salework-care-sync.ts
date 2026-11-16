import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import type { SaleWorkCareEvent } from '@/lib/salework/care-events';
import type { Database } from '@/types/database.types';

const syncResultSchema = z.object({
  received: z.number().int().nonnegative(), written: z.number().int().nonnegative(),
  unmatched_sales: z.number().int().nonnegative(), unmatched_customers: z.number().int().nonnegative(),
  unlinked: z.number().int().nonnegative(),
});
export type SaleWorkCareSyncResult = z.infer<typeof syncResultSchema>;

export async function syncSaleWorkCareEvents(
  supabase: SupabaseClient<Database>,
  events: readonly SaleWorkCareEvent[],
): Promise<SaleWorkCareSyncResult> {
  const totals: SaleWorkCareSyncResult = {
    received: 0, written: 0, unmatched_sales: 0, unmatched_customers: 0, unlinked: 0,
  };
  for (let offset = 0; offset < events.length; offset += 500) {
    const { data, error } = await supabase.rpc('sync_salework_care_logs', {
      p_events: events.slice(offset, offset + 500),
    });
    if (error) throw new Error(`Không ghi được sự kiện chăm sóc SaleWork (${error.code}).`);
    const result = syncResultSchema.parse(data);
    for (const key of ['received', 'written', 'unmatched_sales', 'unmatched_customers', 'unlinked'] as const) {
      totals[key] += result[key];
    }
  }
  return totals;
}
