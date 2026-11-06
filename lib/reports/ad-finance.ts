import { formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDateTime } from '@/lib/date';

export type AdFinanceRow = { marketplace_code: string; ads_top_up: number; available_balance: number | null; balance_captured_at: string | null };
export type AdTopUpHistoryItem = { previousAmount: number; depositAmount: number; newAmount: number; createdAt: string; isOpeningBalance: boolean };
export type AdFinanceViewModel = { tikTokTopUp: number; shopeeTopUp: number; tikTokTopUpDisplay: string; shopeeTopUpDisplay: string; metrics: readonly { label: string; display: string }[]; tikTokUpdatedAt: string | null; tikTokHistory: AdTopUpHistoryItem[]; shopeeHistory: AdTopUpHistoryItem[] };

export function buildAdFinanceViewModel(rows: AdFinanceRow[]): AdFinanceViewModel {
  const tikTok = rows.find((row) => row.marketplace_code === 'TIKTOK');
  const shopee = rows.find((row) => row.marketplace_code === 'SHOPEE');
  const historyFor = (marketplace: 'TIKTOK' | 'SHOPEE'): AdTopUpHistoryItem[] => rows
    .filter((row) => row.marketplace_code === `${marketplace}_HISTORY`)
    .sort((left, right) => (right.balance_captured_at ?? '').localeCompare(left.balance_captured_at ?? ''))
    .map((row) => {
      const newAmount = row.available_balance ?? 0;
      const depositAmount = row.ads_top_up;
      return {
        previousAmount: newAmount - depositAmount,
        depositAmount,
        newAmount,
        createdAt: row.balance_captured_at ?? '',
        isOpeningBalance: depositAmount === 0,
      };
    });
  const tikTokTopUp = tikTok?.ads_top_up ?? 0;
  const shopeeTopUp = shopee?.ads_top_up ?? 0;
  return {
    tikTokTopUp, shopeeTopUp,
    tikTokTopUpDisplay: formatCurrencyVND(tikTokTopUp),
    shopeeTopUpDisplay: formatCurrencyVND(shopeeTopUp),
    metrics: [
      { label: 'TikTok · Tiền nạp Ads', display: formatCurrencyVND(tikTokTopUp) },
      { label: 'TikTok · Số dư Ads', display: tikTok?.available_balance == null ? '—' : formatCurrencyVND(tikTok.available_balance) },
      { label: 'Shopee · Tiền nạp Ads', display: formatCurrencyVND(shopeeTopUp) },
      { label: 'Shopee · Số dư Ads', display: shopee?.available_balance == null ? '—' : formatCurrencyVND(shopee.available_balance) },
    ],
    tikTokUpdatedAt: tikTok?.balance_captured_at ? formatVietnamDateTime(tikTok.balance_captured_at) : null,
    tikTokHistory: historyFor('TIKTOK'),
    shopeeHistory: historyFor('SHOPEE'),
  };
}
