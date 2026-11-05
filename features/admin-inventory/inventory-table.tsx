import { CheckCircle2, Minus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import type { InventoryRowViewModel } from '@/lib/operations/view-models';

type Props = {
  rows: readonly InventoryRowViewModel[];
};

export function InventoryTable({ rows }: Props) {
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-base">Chi tiết tồn kho theo sản phẩm</CardTitle>

      {/* ── < 768px: card xếp dọc (cấm cuộn ngang — DEC-019) ───────────── */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-border p-3.5">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="tabular text-base font-bold text-heading">{row.productCode}</p>
                  <p className="text-sm font-medium break-words text-foreground">
                    {row.productName}
                  </p>
                </div>
                <StockBadge tone={row.stockStatusTone} label={row.stockStatusLabel} />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Kho: <strong className="text-foreground">{row.warehouseCode}</strong>
                </span>
                <span>ĐVT: {row.unit}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-md bg-background p-2.5 text-center text-xs">
                <div>
                  <p className="text-muted-foreground">Tồn thực tế</p>
                  <p className="tabular text-sm font-bold text-heading">
                    {row.quantityOnHandDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Đặt giữ</p>
                  <p className="tabular text-sm font-semibold text-foreground">
                    {row.quantityReservedDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Khả dụng</p>
                  <p className="tabular text-sm font-bold text-primary">
                    {row.quantityAvailableDisplay}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* ── ≥ 768px: bảng thật ──────────────────────────────────────────── */}
      <table className="hidden w-full border-collapse text-sm md:table">
        <caption className="sr-only">
          Danh sách tồn kho theo kho và mã sản phẩm đồng bộ từ MISA, sắp xếp theo số lượng tồn giảm dần
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              Mã kho
            </th>
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              Mã SP / Tên mặt hàng
            </th>
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              ĐVT
            </th>
            <th
              scope="col"
              aria-sort="descending"
              className="py-2 text-right font-medium text-muted-foreground"
            >
              Tồn thực tế
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Khả dụng
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-b-0">
              <td className="tabular py-3 pr-3 font-semibold text-heading">{row.warehouseCode}</td>
              <th scope="row" className="py-3 px-3 text-left font-medium text-foreground">
                <span className="tabular block font-bold text-heading">{row.productCode}</span>
                <span className="block text-xs font-normal break-words text-muted-foreground">
                  {row.productName}
                </span>
              </th>
              <td className="py-3 px-3 text-muted-foreground">{row.unit}</td>
              <td className="tabular py-3 px-3 text-right font-bold text-heading">
                {row.quantityOnHandDisplay}
              </td>
              <td className="tabular py-3 px-3 text-right font-semibold text-primary">
                {row.quantityAvailableDisplay}
              </td>
              <td className="py-3 pl-3 text-right">
                <StockBadge tone={row.stockStatusTone} label={row.stockStatusLabel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function StockBadge({
  tone,
  label,
}: {
  tone: InventoryRowViewModel['stockStatusTone'];
  label: string;
}) {
  return (
    <Badge
      tone={tone}
      icon={
        tone === 'success' ? (
          <CheckCircle2 aria-hidden="true" className="size-3.5" />
        ) : (
          <Minus aria-hidden="true" className="size-3.5" />
        )
      }
    >
      {label}
    </Badge>
  );
}

