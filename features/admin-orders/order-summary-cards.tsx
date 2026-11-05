'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import type {
  OrderRowViewModel,
  OrderSummaryCardViewModel,
} from '@/lib/operations/view-models';

type Props = {
  cards: readonly OrderSummaryCardViewModel[];
  rows: readonly OrderRowViewModel[];
};

export function OrderSummaryCards({ cards, rows }: Props) {
  const [selectedCard, setSelectedCard] = useState<OrderSummaryCardViewModel | null>(null);

  useEffect(() => {
    if (!selectedCard) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedCard(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedCard]);

  const selectedRows = useMemo(() => {
    if (selectedCard?.label.includes('Đã thu')) return rows.filter((row) => !row.hasOutstanding);
    if (selectedCard?.label.includes('Còn phải thu')) return rows.filter((row) => row.hasOutstanding);
    return rows;
  }, [rows, selectedCard]);

  return (
    <>
      <section aria-label="Tổng hợp đơn hàng trong tháng" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.label}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setSelectedCard(card)}
            className="flex min-h-28 flex-col justify-between gap-2 rounded-lg border border-border/70 bg-card p-4 text-left shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-0"
          >
            <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
            <span className="tabular text-2xl font-bold text-heading">{card.valueDisplay}</span>
            <span className="text-xs text-muted-foreground">{card.hintDisplay}</span>
          </button>
        ))}
      </section>

      {selectedCard && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 sm:p-6"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedCard(null);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="order-summary-dialog-title"
                className="flex h-[min(92vh,60rem)] w-full max-w-[min(96vw,90rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              >
                <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5 sm:px-8">
                  <div>
                    <h2 id="order-summary-dialog-title" className="text-xl font-bold text-heading sm:text-2xl">
                      {selectedCard.label}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                      Danh sách đơn hàng đang hiển thị theo bộ lọc và trang hiện tại.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Đóng danh sách"
                    onClick={() => setSelectedCard(null)}
                    className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
                  {selectedRows.length === 0 ? (
                    <p className="rounded-lg bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                      Không có đơn hàng phù hợp trong trang hiện tại.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {selectedRows.map((row) => (
                        <li key={row.id} className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-heading sm:text-lg">{row.orderCode}</p>
                            <p className="truncate text-base text-foreground">{row.customerDisplay}</p>
                            <p className="text-sm text-muted-foreground">
                              {row.orderDateDisplay} · {row.salesDisplay}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="tabular text-base font-bold text-heading sm:text-lg">{row.totalAmountDisplay}</p>
                            <p className="tabular text-sm text-muted-foreground">Còn thu: {row.outstandingDisplay}</p>
                            <p className="text-sm text-muted-foreground">{row.paymentLabel}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
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
