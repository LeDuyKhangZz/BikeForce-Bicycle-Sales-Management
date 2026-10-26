import { z } from 'zod';

const pancakeDailyReportSchema = z.object({
  report_date: z.string(),
  shop_id: z.number(),
  employee_name: z.string(),
  market_code: z.enum(['VN', 'SG']),
  currency_code: z.enum(['VND', 'SGD']),
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

const pancakeMarketplaceFinancialSchema = z.object({
  report_date: z.string(),
  shop_id: z.number(),
  marketplace_code: z.enum(['SHOPEE', 'TIKTOK']),
  currency_code: z.literal('VND'),
  delivered_count: z.number().int().nonnegative(),
  gross_sales: z.number().int().nonnegative(),
  shop_discount: z.number().int().nonnegative(),
  marketplace_voucher: z.number().int().nonnegative(),
  marketplace_fee: z.number().int().nonnegative(),
  platform_receivable: z.number().int().nonnegative(),
  cod: z.number().int().nonnegative(),
  prepaid: z.number().int(),
  capital: z.number().int().nonnegative(),
  payment_fee: z.number().int().nonnegative(),
  seller_transaction_fee: z.number().int().nonnegative(),
  service_fee: z.number().int().nonnegative(),
  sfp_service_fee: z.number().int().nonnegative(),
  affiliate_commission: z.number().int().nonnegative(),
  platform_commission: z.number().int().nonnegative(),
  platform_shipping_fee: z.number().int().nonnegative(),
  diff_shipping_fee: z.number().int(),
  marketplace_tax: z.number().int().nonnegative(),
  marketing_fee: z.number().int().nonnegative(),
  ads_top_up: z.number().int().nonnegative(),
  synced_at: z.string(),
});

export const pancakeReportImageSchema = z.object({
  reports: z.array(z.object({
    daily: pancakeDailyReportSchema,
    sources: z.array(pancakeSourceReportSchema),
    financials: z.array(pancakeMarketplaceFinancialSchema),
  })),
});
