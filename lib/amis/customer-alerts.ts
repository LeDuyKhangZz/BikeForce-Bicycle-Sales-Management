import { getVietnamMonthRange, getVietnamToday, isValidVietnamDate } from '@/lib/date';

export type CustomerAlert = 'purchase' | 'care';
export type CustomerAlertCounts = { purchase: number; care: number };
export const CUSTOMER_ALERT_DAYS = 30;

export function parseCustomerAlert(value: string | undefined): CustomerAlert | undefined {
  return value === 'purchase' || value === 'care' ? value : undefined;
}

/** Tháng lịch sử tính đến cuối tháng; tháng hiện tại tính theo ngày Việt Nam. */
export function customerAlertCutoff(month: string, today = getVietnamToday()): string {
  const range = getVietnamMonthRange(month);
  if (!range || !isValidVietnamDate(today)) throw new Error('Ngày cảnh báo không hợp lệ.');
  const reference = range.to < today ? range.to : today;
  return new Date(Date.parse(`${reference}T00:00:00Z`) - CUSTOMER_ALERT_DAYS * 86_400_000).toISOString().slice(0, 10);
}

export function needsCustomerCare(lastVisitDate: string | null, cutoff: string): boolean {
  return lastVisitDate === null || (isValidVietnamDate(lastVisitDate) && lastVisitDate <= cutoff);
}

/** Cùng điều kiện cho số đếm và danh sách; các giá trị đều do server tạo. */
export function customerAlertCondition(alert: CustomerAlert, cutoff: string): string {
  return alert === 'purchase'
    ? `days_without_purchase.gte.${CUSTOMER_ALERT_DAYS}`
    : `last_visit_date.is.null,last_visit_date.lte.${cutoff}`;
}
