import { z } from 'zod';

const pancakeDailyReportSchema = z.object({
  report_date: z.string(),
  shop_id: z.number(),
  employee_name: z.string(),
  order_count: z.number().int().nonnegative(),
  revenue: z.number().int().nonnegative(),
  cancelled_count: z.number().int().nonnegative(),
  returned_count: z.number().int().nonnegative(),
  late_count: z.number().int().nonnegative(),
  ads_order_count: z.number().int().nonnegative(),
  ads_gmv: z.number().int().nonnegative(),
  synced_at: z.string(),
});

const pancakeSourceReportSchema = z.object({
  report_date: z.string(),
  shop_id: z.number(),
  source_name: z.string(),
  order_count: z.number().int().nonnegative(),
  revenue: z.number().int().nonnegative(),
  synced_at: z.string(),
});

export const pancakeReportImageSchema = z.object({
  daily: pancakeDailyReportSchema,
  sources: z.array(pancakeSourceReportSchema),
});
