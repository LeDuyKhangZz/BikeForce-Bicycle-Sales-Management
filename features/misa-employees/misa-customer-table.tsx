import { AlertTriangle, BarChart3, CalendarDays, ChevronRight, CircleAlert, Coins, MapPin, ShoppingCart, Store } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { getCustomerDormancyLevel } from '@/lib/amis/customer-dormancy';
import { formatMisaAmount, formatMisaDate } from '@/lib/amis/customer-display';
import { CUSTOMER_REVENUE_GROUP_RULE_TEXT, customerRevenueGroupLabel, defaultMonthlyFrequency, getCustomerRevenueGroup, type CustomerRevenueGroup } from '@/lib/amis/customer-revenue-group';
import type { MisaCustomer } from '@/types/misa-customer';

type Props = {
  rows: MisaCustomer[];
  employeeName: string;
  startIndex: number;
  employeeId: number;
  month: string;
  salesMobileCards?: boolean;
};

function CustomerDormancyBadge({ days }: { days: number | null }) {
  const level = getCustomerDormancyLevel(days);
  if (level === 'UNKNOWN') return <span className="text-muted-foreground">—</span>;
  if (level === 'DANGER') {
    return (
      <Badge tone="danger" icon={<CircleAlert aria-hidden="true" className="size-3" />} className="whitespace-nowrap px-2 py-0.5 text-xs">
        {days}<span className="sr-only"> ngày, cảnh báo đỏ</span>
      </Badge>
    );
  }
  if (level === 'WARNING') {
    return (
      <Badge tone="warning" icon={<AlertTriangle aria-hidden="true" className="size-3" />} className="whitespace-nowrap px-2 py-0.5 text-xs">
        {days}<span className="sr-only"> ngày, cảnh báo vàng</span>
      </Badge>
    );
  }
  return <span className="inline-flex min-w-8 items-center justify-center whitespace-nowrap rounded-pill border border-border bg-card px-2 py-0.5 tabular-nums text-heading">{days}<span className="sr-only"> ngày</span></span>;
}

export function MisaCustomerTable({ rows, employeeName, startIndex, salesMobileCards = false }: Props) {
  const groupTone: Record<CustomerRevenueGroup, 'success' | 'info' | 'warning' | 'neutral'> = {
    A: 'success', B: 'info', C: 'warning', D: 'neutral',
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-primary/[0.025] px-4 py-2.5 text-xs text-muted-foreground">
        <span className="font-semibold text-heading">Phân nhóm doanh số</span>
        <span>{CUSTOMER_REVENUE_GROUP_RULE_TEXT}</span>
      </div>
      <table className="hidden w-full table-fixed text-left text-xs xl:table">
        <caption className="sr-only">Khách hàng phụ trách của {employeeName}</caption>
        <colgroup>
          <col className="w-[3%]" /><col className="w-[7%]" /><col className="w-[11%]" />
          <col className="w-[8%]" /><col className="w-[10%]" /><col className="w-[11%]" />
          <col className="w-[5%]" /><col className="w-[7%]" /><col className="w-[12%]" />
          <col className="w-[9%]" /><col className="w-[8%]" /><col className="w-[9%]" />
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
            <th scope="col" className="px-2 py-3 text-center font-semibold">Tần suất/tháng</th>
            <th scope="col" className="px-2 py-3 text-right font-semibold">Doanh số cam kết</th>
            <th scope="col" className="px-2 py-3 font-semibold">Ngày mua hàng gần nhất</th>
            <th scope="col" className="px-2 py-3 text-center font-semibold">Số ngày chưa mua hàng</th>
            <th scope="col" className="px-2 py-3 font-semibold">Ngày ghé thăm gần nhất</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((customer, index) => {
            const group = getCustomerRevenueGroup(customer.orderSales);
            const frequency = customer.monthlyFrequency ?? defaultMonthlyFrequency(group);
            return (
            <tr key={customer.id} className={index % 2 === 1 ? 'bg-primary/[0.035]' : 'bg-card'}>
              <td className="px-2 py-2 align-top tabular-nums">{startIndex + index + 1}</td>
              <th scope="row" className="break-words px-2 py-2 align-top font-semibold text-primary">{customer.code || '—'}</th>
              <td className="break-words px-2 py-2 align-top">{customer.name || '—'}</td>
              <td className="break-words px-2 py-2 align-top">{customer.billingProvince || '—'}</td>
              <td className="break-words px-2 py-2 text-right align-top tabular-nums">{formatMisaAmount(customer.debt)}</td>
              <td className="break-words px-2 py-2 text-right align-top tabular-nums">{formatMisaAmount(customer.orderSales)}</td>
              <td className="px-2 py-2 text-center align-top"><Badge tone={groupTone[group]} className="min-w-8 justify-center whitespace-nowrap px-2 py-0.5 text-xs" aria-label={customerRevenueGroupLabel(group)}>{group}</Badge></td>
              <td className="px-2 py-2 text-center align-top tabular-nums">{frequency} lần</td><td className="px-2 py-2 text-right align-top tabular-nums">{customer.committedSales === undefined || customer.committedSales === null ? 'Chưa cam kết' : formatMisaAmount(customer.committedSales)}</td>
              <td className="whitespace-nowrap px-2 py-2 align-top tabular-nums">{formatMisaDate(customer.recentPurchaseDate)}</td>
              <td className="px-2 py-2 text-center align-top tabular-nums">
                <CustomerDormancyBadge days={customer.daysWithoutPurchase} />
              </td>
              <td className="whitespace-nowrap px-2 py-2 align-top tabular-nums">{formatMisaDate(customer.lastVisitDate)}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
      <ol className="divide-y divide-border xl:hidden">
        {rows.map((customer, index) => {
          const group = getCustomerRevenueGroup(customer.orderSales);
          const frequency = customer.monthlyFrequency ?? defaultMonthlyFrequency(group);
          if (salesMobileCards) {
            return (
              <li key={customer.id} className="min-w-0 bg-primary/[0.025] px-3 py-2 text-sm">
                <article className="rounded-2xl border border-border bg-card p-4 shadow-brand-sm">
                  <div className="grid grid-cols-[3rem_minmax(0,1fr)_2.75rem] items-start gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-base font-bold tabular-nums text-primary">{startIndex + index + 1}</span>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-primary">{customer.code || '—'}</p>
                      <h2 className="break-words text-xl font-bold leading-tight text-heading">{customer.name || '—'}</h2>
                      <p className="mt-2 flex items-center gap-1.5 text-muted-foreground"><MapPin aria-hidden="true" className="size-4 shrink-0 text-primary" />{customer.billingProvince || '—'}</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Badge tone={groupTone[group]} className="grid size-11 place-items-center rounded-full p-0 text-lg" aria-label={customerRevenueGroupLabel(group)}>{group}</Badge>
                      <ChevronRight aria-hidden="true" className="size-6 text-muted-foreground" />
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-2">
                    <div className="min-w-0 rounded-xl bg-status-exceeded-bg p-2.5 text-status-exceeded-fg"><dt className="flex items-center gap-1 text-[11px]"><Coins aria-hidden="true" className="size-4 shrink-0" />Công nợ</dt><dd className="mt-1 break-words text-sm font-bold tabular-nums">{formatMisaAmount(customer.debt)}</dd></div>
                    <div className="min-w-0 rounded-xl bg-status-info-bg p-2.5 text-status-info-fg"><dt className="flex items-center gap-1 text-[11px]"><BarChart3 aria-hidden="true" className="size-4 shrink-0" />Doanh số</dt><dd className="mt-1 break-words text-sm font-bold tabular-nums">{formatMisaAmount(customer.orderSales)}</dd></div>
                    <div className="min-w-0 rounded-xl bg-primary/5 p-2.5 text-heading"><dt className="flex items-center gap-1 text-[11px] text-muted-foreground"><ShoppingCart aria-hidden="true" className="size-4 shrink-0 text-primary" />Mua gần nhất</dt><dd className="mt-1 break-words text-sm font-bold tabular-nums">{formatMisaDate(customer.recentPurchaseDate)}</dd></div>
                  </dl>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-muted-foreground">Tần suất/tháng</p><p className="mt-1 flex min-h-12 items-center rounded-xl border border-border bg-primary/[0.025] px-3 font-semibold text-heading">{frequency} lần</p></div>
                    <div><p className="text-xs text-muted-foreground">Doanh số cam kết</p><p className="mt-1 flex min-h-12 items-center rounded-xl border border-border bg-primary/[0.025] px-3 font-semibold tabular-nums text-heading"><span className="break-all">{customer.committedSales === undefined || customer.committedSales === null ? 'Chưa nhập' : formatMisaAmount(customer.committedSales)}</span></p></div>
                  </div>
                </article>
              </li>
            );
          }
          return (
          <li key={customer.id} className="min-w-0 px-4 py-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-primary">{startIndex + index + 1}. {customer.code || '—'}</p>
              <Badge tone={groupTone[group]} className="min-w-8 justify-center whitespace-nowrap px-2 py-0.5 text-xs" aria-label={customerRevenueGroupLabel(group)}>{group}</Badge>
            </div>
            <h2 className="mt-2 break-words text-xl font-bold leading-tight text-heading">{customer.name || '—'}</h2>
            <p className="mt-2 flex items-center gap-2 text-muted-foreground"><MapPin aria-hidden="true" className="size-4 shrink-0 text-primary" />{customer.billingProvince || '—'}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2">
              <div className="flex min-h-20 items-center gap-3 rounded-xl bg-status-exceeded-bg p-3 text-status-exceeded-fg"><Coins aria-hidden="true" className="size-7 shrink-0" /><div><dt className="text-xs">Công nợ</dt><dd className="mt-1 text-base font-bold tabular-nums">{formatMisaAmount(customer.debt)}</dd></div></div>
              <div className="flex min-h-20 items-center gap-3 rounded-xl bg-status-info-bg p-3 text-status-info-fg"><BarChart3 aria-hidden="true" className="size-7 shrink-0" /><div><dt className="text-xs">Doanh số đơn hàng</dt><dd className="mt-1 text-base font-bold tabular-nums">{formatMisaAmount(customer.orderSales)}</dd></div></div>
              <div className="flex min-h-20 items-center gap-3 rounded-xl bg-primary/5 p-3 text-heading"><ShoppingCart aria-hidden="true" className="size-7 shrink-0 text-primary" /><div><dt className="text-xs text-muted-foreground">Ngày mua gần nhất</dt><dd className="mt-1 text-base font-bold tabular-nums">{formatMisaDate(customer.recentPurchaseDate)}</dd></div></div>
              <div className="flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-3 text-heading"><CalendarDays aria-hidden="true" className="size-7 shrink-0 text-primary" /><div><dt className="text-xs text-muted-foreground">Số ngày chưa mua hàng</dt><dd className="mt-1"><CustomerDormancyBadge days={customer.daysWithoutPurchase} /></dd></div></div>
              <div className="flex min-h-20 items-center gap-3 rounded-xl bg-status-missed-bg p-3 text-status-missed-fg sm:col-span-2"><Store aria-hidden="true" className="size-7 shrink-0" /><div><dt className="text-xs">Ngày ghé thăm gần nhất</dt><dd className="mt-1 text-base font-bold tabular-nums">{formatMisaDate(customer.lastVisitDate)}</dd></div></div>
            </dl>
            <div className="mt-3 border-t border-border pt-3">
              <dl className="grid grid-cols-2 gap-3"><div><dt className="text-muted-foreground">Tần suất/tháng</dt><dd className="font-semibold">{frequency} lần</dd></div><div><dt className="text-muted-foreground">Doanh số cam kết</dt><dd className="font-semibold tabular-nums">{customer.committedSales === undefined || customer.committedSales === null ? 'Chưa cam kết' : formatMisaAmount(customer.committedSales)}</dd></div></dl>
            </div>
          </li>
          );
        })}
      </ol>
    </>
  );
}
