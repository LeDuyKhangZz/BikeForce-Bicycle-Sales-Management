export type CustomerRevenueGroup = 'A' | 'B' | 'C' | 'D';

export const CUSTOMER_REVENUE_GROUP_RULE_TEXT =
  'A ≥ 150 triệu · B từ 50 đến dưới 150 triệu · C trên 0 đến dưới 50 triệu · D chưa phát sinh doanh số';

const GROUP_A_MIN = 150_000_000;
const GROUP_B_MIN = 50_000_000;

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
