'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, LoaderCircle, Store, ShoppingCart, X } from 'lucide-react';

import { loadMisaCustomerAlertList } from '@/features/misa-employees/actions';
import { misaCustomerQuery } from '@/lib/amis/customer-filters';
import type { CustomerAlert, CustomerAlertCounts } from '@/lib/amis/customer-alerts';
import type { MisaCustomerAlertRow } from '@/services/misa-customer-alerts';
import { formatCurrencyVND } from '@/lib/currency';
import { formatVietnamDate } from '@/lib/date';

type Props = {
  counts: CustomerAlertCounts;
  path: string;
  month: string;
  employeeId?: number;
  active?: CustomerAlert;
};

const ALERT_LABEL: Record<CustomerAlert, string> = {
  purchase: 'Từ 30 ngày chưa mua hàng',
  care: 'Từ 30 ngày chưa chăm sóc',
};

export function CustomerAlertSummary({ counts, path, month, employeeId, active }: Props) {
  const [selectedAlert, setSelectedAlert] = useState<CustomerAlert | null>(null);
  const [rows, setRows] = useState<MisaCustomerAlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const items = [
    { key: 'purchase', count: counts.purchase, icon: ShoppingCart },
    { key: 'care', count: counts.care, icon: Store },
  ] as const;

  useEffect(() => {
    if (!selectedAlert) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedAlert(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedAlert]);

  async function openAlert(alert: CustomerAlert) {
    setSelectedAlert(alert);
    setRows([]);
    setError('');
    setLoading(true);
    if (employeeId === undefined) {
      setError('Không xác định được nhân viên MISA để tải danh sách.');
      setLoading(false);
      return;
    }
    const result = await loadMisaCustomerAlertList({ month, employeeId, alert });
    if (result.ok) setRows(result.rows);
    else setError(result.message);
    setLoading(false);
  }

  return (
    <>
      <section aria-label="Cảnh báo khách hàng" className="min-w-0 rounded-xl border border-border bg-card p-2 md:rounded-2xl md:p-4">
        <h2 className="flex items-center gap-1 text-sm font-bold text-heading md:gap-2 md:text-lg">
          <AlertTriangle aria-hidden="true" className="size-3.5 text-destructive md:size-5" />
          Khách hàng cần quan tâm
        </h2>
        <p className="mt-1 hidden text-sm text-muted-foreground md:block">
          Toàn bộ khách hàng trong tháng đang xem. Chăm sóc tính theo ngày ghé thăm, gồm khách chưa có ngày ghé thăm.
        </p>
        <div className="mt-1 grid grid-cols-2 gap-2 md:mt-3 md:gap-3">
          {items.map(({ key, count, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-haspopup="dialog"
              aria-label={`${count} khách: ${ALERT_LABEL[key]}`}
              aria-current={active === key ? 'true' : undefined}
              onClick={() => void openAlert(key)}
              className={`flex min-h-11 min-w-0 items-center rounded-lg border border-input-border px-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:min-h-24 md:gap-3 md:rounded-xl md:p-4 ${active === key ? 'ring-2 ring-destructive' : ''} ${count > 0 ? 'bg-status-missed-bg text-status-missed-fg' : 'bg-primary/5 text-heading'}`}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded bg-card/60 md:contents">
                <Icon aria-hidden="true" className="size-3 md:size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block whitespace-nowrap text-[10px] font-bold leading-3 tabular-nums md:whitespace-normal md:text-2xl md:leading-tight">{count} khách</span>
                <span className="block whitespace-nowrap text-[8px] leading-[10px] md:hidden">{key === 'purchase' ? '30 ngày chưa mua hàng' : '30 ngày chưa chăm sóc'}</span>
                <span className="mt-0.5 hidden text-sm leading-tight md:block">{ALERT_LABEL[key]}</span>
                <span className="mt-1 hidden text-xs underline md:block">Xem danh sách</span>
              </span>
            </button>
          ))}
        </div>
        {active && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="font-semibold text-destructive">Đang xem: khách {active === 'purchase' ? 'từ 30 ngày chưa mua hàng' : 'cần chăm sóc'}</p>
            <Link href={`${path}?month=${month}`} className="inline-flex min-h-11 items-center rounded-lg px-3 text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Xem tất cả khách hàng
            </Link>
          </div>
        )}
      </section>

      {selectedAlert && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 sm:p-6"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedAlert(null);
              }}
            >
              <section role="dialog" aria-modal="true" aria-labelledby="customer-alert-dialog-title" className="flex h-[min(92vh,60rem)] w-full max-w-[min(96vw,90rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5 sm:px-8">
                  <div>
                    <h2 id="customer-alert-dialog-title" className="text-xl font-bold text-heading sm:text-2xl">Khách hàng {ALERT_LABEL[selectedAlert].toLowerCase()}</h2>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">{loading ? 'Đang tải danh sách…' : `${rows.length} khách hàng · Tháng ${month.slice(5)}/${month.slice(0, 4)}`}</p>
                  </div>
                  <button type="button" aria-label="Đóng danh sách" onClick={() => setSelectedAlert(null)} className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </header>

                <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-7">
                  {loading ? (
                    <div className="flex min-h-48 items-center justify-center gap-3 text-muted-foreground">
                      <LoaderCircle aria-hidden="true" className="size-6 animate-spin" /> Đang tải danh sách khách hàng…
                    </div>
                  ) : error ? (
                    <div role="alert" className="rounded-lg bg-status-missed-bg p-5 text-center text-status-missed-fg">{error}</div>
                  ) : rows.length === 0 ? (
                    <p className="rounded-lg bg-background px-4 py-10 text-center text-muted-foreground">Không có khách hàng trong danh sách này.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/70">
                      <table className="w-full min-w-[44rem] border-collapse text-sm">
                        <thead className="sticky top-0 bg-background text-left text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Mã khách hàng</th>
                            <th className="px-4 py-3 font-semibold">Tên khách hàng</th>
                            <th className="px-4 py-3 font-semibold">Tỉnh/thành</th>
                            <th className="px-4 py-3 text-right font-semibold">Công nợ</th>
                            <th className="px-4 py-3 text-right font-semibold">{selectedAlert === 'purchase' ? 'Ngày chưa mua' : 'Ghé thăm gần nhất'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.customerId} className="border-t border-border/70 hover:bg-background/70">
                              <td className="px-4 py-3 font-medium text-primary">{row.code}</td>
                              <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{row.province || '—'}</td>
                              <td className="tabular px-4 py-3 text-right text-foreground">{row.debt === null ? '—' : formatCurrencyVND(row.debt)}</td>
                              <td className="tabular px-4 py-3 text-right text-foreground">{selectedAlert === 'purchase' ? `${row.daysWithoutPurchase ?? '—'} ngày` : row.lastVisitDate ? formatVietnamDate(row.lastVisitDate) : 'Chưa có lần ghé thăm'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
