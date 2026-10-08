export const ECOMMERCE_REPORT_ACCOUNT = 'Nguyễn Ngọc Triết';

export function buildSaleWorkReportImageUrl(accountName: string, apiKey?: string): string {
  const baseUrl = `/api/salework/report-image?account=${encodeURIComponent(accountName)}`;
  return apiKey ? `${baseUrl}&key=${encodeURIComponent(apiKey)}` : baseUrl;
}
