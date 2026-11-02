export const ECOMMERCE_REPORT_ACCOUNT = 'Nguyễn Ngọc Triết';

export const DEFAULT_REPORT_BACKGROUND_PATH = '/images/background2010.png';
export const HALLOWEEN_REPORT_BACKGROUND_PATH = '/images/halloween-report-background.png';
export const NOVEMBER_REPORT_BACKGROUND_PATH = '/images/anhnen2011.png';

const NOVEMBER_REPORT_ACCOUNTS: ReadonlySet<string> = new Set([
  ECOMMERCE_REPORT_ACCOUNT,
  'Abraham Kế Toán Bánhàng',
]);

export function isNovemberReportAccount(accountName: string): boolean {
  return NOVEMBER_REPORT_ACCOUNTS.has(accountName);
}

const HALLOWEEN_REPORT_ACCOUNTS: ReadonlySet<string> = new Set([
  'Hải TeleSale',
]);

export function isHalloweenReportAccount(accountName: string): boolean {
  return HALLOWEEN_REPORT_ACCOUNTS.has(accountName);
}

export function getSaleWorkReportBackgroundPath(accountName: string): string {
  if (isNovemberReportAccount(accountName)) {
    return NOVEMBER_REPORT_BACKGROUND_PATH;
  }
  return isHalloweenReportAccount(accountName)
    ? HALLOWEEN_REPORT_BACKGROUND_PATH
    : DEFAULT_REPORT_BACKGROUND_PATH;
}

export function buildSaleWorkReportImageUrl(accountName: string, apiKey?: string): string {
  const baseUrl = `/api/salework/report-image?account=${encodeURIComponent(accountName)}`;
  return apiKey ? `${baseUrl}&key=${encodeURIComponent(apiKey)}` : baseUrl;
}
