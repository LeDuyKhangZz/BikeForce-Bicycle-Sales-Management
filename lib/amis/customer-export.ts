import { formatMisaAmount, formatMisaDate } from '@/lib/amis/customer-display';
import type { MisaCustomer } from '@/types/misa-customer';

const HEADERS = [
  'Mã khách hàng', 'Tên khách hàng', 'Tỉnh/Thành phố (Hóa đơn)', 'Công nợ',
  'Doanh số đơn hàng', 'Ngày mua hàng gần nhất', 'Số ngày chưa mua hàng',
  'Ngày ghé thăm gần nhất', 'Chủ sở hữu',
];

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function buildMisaCustomerCsv(customers: MisaCustomer[]): string {
  const rows = customers.map((customer) => [
    customer.code, customer.name, customer.billingProvince,
    formatMisaAmount(customer.debt), formatMisaAmount(customer.orderSales),
    formatMisaDate(customer.recentPurchaseDate),
    customer.daysWithoutPurchase === null ? '' : String(customer.daysWithoutPurchase),
    formatMisaDate(customer.lastVisitDate), customer.owner,
  ]);
  return `\uFEFF${[HEADERS, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}
