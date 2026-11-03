import { formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDateTime } from '@/lib/date';

export type AdFinanceRow = { marketplace_code: string; ads_top_up: number; available_balance: number | null; balance_captured_at: string | null };
export type AdFinanceViewModel = { tikTokTopUp: number; shopeeTopUp: number; metrics: readonly { label: string; display: string }[]; tikTokUpdatedAt: string | null };

export function buildAdFinanceViewModel(rows: AdFinanceRow[]): AdFinanceViewModel {
  const tikTok = rows.find((row) => row.marketplace_code === 'TIKTOK');
  const shopee = rows.find((row) => row.marketplace_code === 'SHOPEE');
  const tikTokTopUp = tikTok?.ads_top_up ?? 0;
  const shopeeTopUp = shopee?.ads_top_up ?? 0;
  return {
    tikTokTopUp, shopeeTopUp,
    metrics: [
      { label: 'TikTok · Tiền nạp Ads', display: formatCurrencyVND(tikTokTopUp) },
      { label: 'TikTok · Số dư Ads', display: tikTok?.available_balance == null ? '—' : formatCurrencyVND(tikTok.available_balance) },
      { label: 'Shopee · Tiền nạp Ads', display: formatCurrencyVND(shopeeTopUp) },
      { label: 'Shopee · Số dư Ads', display: shopee?.available_balance == null ? '—' : formatCurrencyVND(shopee.available_balance) },
    ],
    tikTokUpdatedAt: tikTok?.balance_captured_at ? formatVietnamDateTime(tikTok.balance_captured_at) : null,
  };
}
