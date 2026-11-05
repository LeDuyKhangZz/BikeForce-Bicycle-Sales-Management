import { CheckCircle2, Clock, Info, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import type { OrderRowViewModel, OrderStatusTone } from '@/lib/operations/view-models';

type Props = {
  rows: readonly OrderRowViewModel[];
};

export function OrdersTable({ rows }: Props) {
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-base">Danh sách đơn bán hàng MISA</CardTitle>

      {/* ── < 768px: card xếp dọc (cấm cuộn ngang — DEC-019) ───────────── */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-border p-3.5">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="tabular text-base font-bold text-heading">{row.orderCode}</p>
                  <p className="tabular text-xs text-muted-foreground">Ngày đơn: {row.orderDateDisplay}</p>
                </div>
                <StatusBadge tone={row.statusTone} label={row.statusLabel} />
              </div>

              <div className="flex flex-col gap-1 text-sm">
                <p className="font-medium break-words text-foreground">{row.customerDisplay}</p>
                <p className="text-xs text-muted-foreground">
                  {row.customerCodeDisplay ? `Mã KH: ${row.customerCodeDisplay} · ` : ''}
                  Sales: {row.salesDisplay}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-md bg-background p-2.5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Tổng giá trị đơn</p>
                  <p className="tabular font-bold text-heading">{row.totalAmountDisplay}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Còn phải thu</p>
                  <p className="tabular font-semibold text-foreground">{row.outstandingDisplay}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{row.lineSummaryDisplay}</span>
                <StatusBadge tone={row.paymentTone} label={row.paymentLabel} />
              </div>

              {row.lines.length > 0 && (
                <details className="mt-1 rounded-md border border-border/80 bg-background px-3 py-2 text-xs">
                  <summary className="min-h-11 cursor-pointer py-2 font-semibold text-primary">
                    Xem chi tiết {row.lines.length} dòng sản phẩm
                  </summary>
                  <ul className="mt-1 flex flex-col gap-2 border-t border-border pt-2">
                    {row.lines.map((line) => (
                      <li key={line.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium break-words text-foreground">{line.productName}</p>
                          <p className="tabular text-muted-foreground">
                            {line.productCode} · {line.quantityDisplay} {line.unit} × {line.unitPriceDisplay}
                          </p>
                        </div>
                        <span className="tabular shrink-0 font-semibold text-heading">
                          {line.lineTotalDisplay}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* ── ≥ 768px: bảng thật ──────────────────────────────────────────── */}
      <table className="hidden w-full border-collapse text-sm md:table">
        <caption className="sr-only">
          Danh sách đơn bán hàng đồng bộ từ MISA, sắp xếp theo ngày đơn mới nhất
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" aria-sort="descending" className="py-2 text-left font-medium text-muted-foreground">
              Mã đơn / Ngày
            </th>
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              Khách hàng
            </th>
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              Nhân viên Sales
            </th>
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              Mặt hàng
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Tổng tiền / Công nợ
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border align-top last:border-b-0">
              <th scope="row" className="py-3 pr-3 text-left font-semibold text-heading">
                <span className="tabular block">{row.orderCode}</span>
                <span className="tabular block text-xs font-normal text-muted-foreground">
                  {row.orderDateDisplay}
                </span>
              </th>
              <td className="py-3 px-3 text-foreground">
                <span className="block font-medium break-words">{row.customerDisplay}</span>
                {row.customerCodeDisplay && (
                  <span className="tabular block text-xs text-muted-foreground">
                    Mã KH: {row.customerCodeDisplay}
                  </span>
                )}
              </td>
              <td className="py-3 px-3 text-foreground">
                <span className="block font-medium">{row.salesDisplay}</span>
                {row.employeeCodeDisplay && (
                  <span className="tabular block text-xs text-muted-foreground">
                    {row.employeeCodeDisplay}
                  </span>
                )}
              </td>
              <td className="py-3 px-3 text-foreground">
                <span className="tabular block font-medium">{row.lineSummaryDisplay}</span>
                {row.lines.length > 0 && (
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer font-semibold text-primary hover:underline">
                      Chi tiết ({row.lines.length})
                    </summary>
                    <ul className="mt-1.5 flex flex-col gap-1.5 rounded-md border border-border bg-background p-2">
                      {row.lines.map((line) => (
                        <li key={line.id} className="flex items-start justify-between gap-3">
                          <span className="break-words text-foreground">
                            <strong className="tabular">{line.productCode}</strong> — {line.productName} ({line.quantityDisplay} {line.unit})
                          </span>
                          <span className="tabular shrink-0 font-semibold text-heading">
                            {line.lineTotalDisplay}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </td>
              <td className="tabular py-3 px-3 text-right">
                <span className="block font-bold text-heading">{row.totalAmountDisplay}</span>
                <span className="block text-xs text-muted-foreground">
                  Còn thu: {row.outstandingDisplay}
                </span>
              </td>
              <td className="py-3 pl-3 text-right">
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge tone={row.statusTone} label={row.statusLabel} />
                  <StatusBadge tone={row.paymentTone} label={row.paymentLabel} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function StatusBadge({ tone, label }: { tone: OrderStatusTone; label: string }) {
  const icon =
    tone === 'success' ? (
      <CheckCircle2 aria-hidden="true" className="size-3.5" />
    ) : tone === 'warning' ? (
      <Clock aria-hidden="true" className="size-3.5" />
    ) : tone === 'danger' ? (
      <XCircle aria-hidden="true" className="size-3.5" />
    ) : (
      <Info aria-hidden="true" className="size-3.5" />
    );

  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  );
}

