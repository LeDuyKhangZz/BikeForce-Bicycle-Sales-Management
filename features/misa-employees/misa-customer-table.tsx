import { Badge } from '@/components/ui/badge';
import { formatMisaAmount, formatMisaDate } from '@/lib/amis/customer-display';
import { CUSTOMER_REVENUE_GROUP_RULE_TEXT, customerRevenueGroupLabel, getCustomerRevenueGroup, type CustomerRevenueGroup } from '@/lib/amis/customer-revenue-group';
import type { MisaCustomer } from '@/types/misa-customer';

type Props = {
  rows: MisaCustomer[];
  employeeName: string;
  startIndex: number;
};

export function MisaCustomerTable({ rows, employeeName, startIndex }: Props) {
  const groupTone: Record<CustomerRevenueGroup, 'success' | 'info' | 'warning' | 'neutral'> = {
    A: 'success', B: 'info', C: 'warning', D: 'neutral',
  };
  return (
    <>
      <p className="border-b border-border bg-primary/[0.025] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Quy tắc nhóm: {CUSTOMER_REVENUE_GROUP_RULE_TEXT}.
      </p>
      <table className="hidden w-full table-fixed text-left text-xs xl:table">
        <caption className="sr-only">Khách hàng phụ trách của {employeeName}</caption>
        <colgroup>
          <col className="w-[3%]" /><col className="w-[7%]" /><col className="w-[13%]" />
          <col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[10%]" />
          <col className="w-[6%]" /><col className="w-[9%]" /><col className="w-[8%]" />
          <col className="w-[9%]" /><col className="w-[17%]" />
        </colgroup>
        <thead className="bg-primary/5 text-heading">
          <tr>
            <th scope="col" className="px-2 py-3 font-semibold">#</th>
            <th scope="col" className="px-2 py-3 font-semibold">Mã khách hàng</th>
            <th scope="col" className="px-2 py-3 font-semibold">Tên khách hàng</th>
            <th scope="col" className="px-2 py-3 font-semibold">Tỉnh/Thành phố (Hóa đơn)</th>
            <th scope="col" className="px-2 py-3 text-right font-semibold">Công nợ</th>
            <th scope="col" className="px-2 py-3 text-right font-semibold">Doanh số đơn hàng</th>
            <th scope="col" className="px-2 py-3 text-center font-semibold">Nhóm</th>
            <th scope="col" className="px-2 py-3 font-semibold">Ngày mua hàng gần nhất</th>
            <th scope="col" className="px-2 py-3 text-center font-semibold">Số ngày chưa mua hàng</th>
            <th scope="col" className="px-2 py-3 font-semibold">Ngày ghé thăm gần nhất</th>
            <th scope="col" className="px-2 py-3 font-semibold">Chủ sở hữu</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((customer, index) => {
            const group = getCustomerRevenueGroup(customer.orderSales);
            return (
            <tr key={customer.id} className={index % 2 === 1 ? 'bg-primary/[0.035]' : 'bg-card'}>
              <td className="px-2 py-2 align-top tabular-nums">{startIndex + index + 1}</td>
              <th scope="row" className="break-words px-2 py-2 align-top font-semibold text-primary">{customer.code || '—'}</th>
              <td className="break-words px-2 py-2 align-top">{customer.name || '—'}</td>
              <td className="break-words px-2 py-2 align-top">{customer.billingProvince || '—'}</td>
              <td className="break-words px-2 py-2 text-right align-top tabular-nums">{formatMisaAmount(customer.debt)}</td>
              <td className="break-words px-2 py-2 text-right align-top tabular-nums">{formatMisaAmount(customer.orderSales)}</td>
              <td className="px-2 py-2 text-center align-top"><Badge tone={groupTone[group]} className="text-xs">{customerRevenueGroupLabel(group)}</Badge></td>
              <td className="break-words px-2 py-2 align-top tabular-nums">{formatMisaDate(customer.recentPurchaseDate)}</td>
              <td className="px-2 py-2 text-center align-top tabular-nums">
                <span className="inline-block min-w-8 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">{customer.daysWithoutPurchase ?? '—'}</span>
              </td>
              <td className="break-words px-2 py-2 align-top tabular-nums">{formatMisaDate(customer.lastVisitDate)}</td>
              <td className="break-words px-2 py-2 align-top">{customer.owner || '—'}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
      <ol className="divide-y divide-border xl:hidden">
        {rows.map((customer, index) => {
          const group = getCustomerRevenueGroup(customer.orderSales);
          return (
          <li key={customer.id} className="min-w-0 px-4 py-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-primary">{startIndex + index + 1}. {customer.code || '—'}</p>
              <Badge tone={groupTone[group]} className="text-xs">{customerRevenueGroupLabel(group)}</Badge>
            </div>
            <h2 className="mt-1 break-words text-base font-semibold text-heading">{customer.name || '—'}</h2>
            <dl className="mt-2 grid gap-1.5">
              <div><dt className="text-muted-foreground">Tỉnh/Thành phố (Hóa đơn)</dt><dd>{customer.billingProvince || '—'}</dd></div>
              <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">Công nợ:</dt><dd className="tabular-nums">{formatMisaAmount(customer.debt)}</dd></div>
              <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">Doanh số đơn hàng:</dt><dd className="tabular-nums">{formatMisaAmount(customer.orderSales)}</dd></div>
              <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">Ngày mua hàng gần nhất:</dt><dd className="tabular-nums">{formatMisaDate(customer.recentPurchaseDate)}</dd></div>
              <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">Số ngày chưa mua hàng:</dt><dd className="tabular-nums">{customer.daysWithoutPurchase ?? '—'}</dd></div>
              <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">Ngày ghé thăm gần nhất:</dt><dd className="tabular-nums">{formatMisaDate(customer.lastVisitDate)}</dd></div>
              <div><dt className="text-muted-foreground">Chủ sở hữu</dt><dd className="break-words">{customer.owner || '—'}</dd></div>
            </dl>
          </li>
          );
        })}
      </ol>
    </>
  );
}
