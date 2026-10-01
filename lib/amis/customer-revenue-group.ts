export type CustomerRevenueGroup = 'A' | 'B' | 'C' | 'D';

export const CUSTOMER_REVENUE_GROUP_RULE_TEXT =
  'A ≥ 150 triệu · B từ 50 đến dưới 150 triệu · C trên 0 đến dưới 50 triệu · D chưa phát sinh doanh số';

const GROUP_A_MIN = 150_000_000;
const GROUP_B_MIN = 50_000_000;

export function parseCustomerRevenueGroup(value: string | undefined): CustomerRevenueGroup | undefined {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D' ? value : undefined;
}

/** Cùng điều kiện cho số đếm và danh sách khách hàng. */
export function customerRevenueGroupCondition(group: CustomerRevenueGroup): string {
  if (group === 'A') return `order_sales.gte.${GROUP_A_MIN}`;
  if (group === 'B') return `and(order_sales.gte.${GROUP_B_MIN},order_sales.lt.${GROUP_A_MIN})`;
  if (group === 'C') return `and(order_sales.gt.0,order_sales.lt.${GROUP_B_MIN})`;
  return 'order_sales.is.null,order_sales.lte.0';
}

/** Phân nhóm khách hàng theo doanh số đơn hàng của kỳ snapshot MISA. */
export function getCustomerRevenueGroup(orderSales: number | null): CustomerRevenueGroup {
  if (orderSales === null || orderSales <= 0) return 'D';
  if (orderSales >= GROUP_A_MIN) return 'A';
  if (orderSales >= GROUP_B_MIN) return 'B';
  return 'C';
}

export function customerRevenueGroupLabel(group: CustomerRevenueGroup): string {
  return `Nhóm ${group}`;
}

export function defaultMonthlyFrequency(group: CustomerRevenueGroup): number {
  if (group === 'A') return 4;
  if (group === 'B') return 2;
  return 1;
}
