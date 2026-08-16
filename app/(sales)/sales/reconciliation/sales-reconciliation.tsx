import {
  formatPeriod,
  variancePercent,
  varianceLevel,
  type ReconciliationRow,
} from "@/lib/reports/amis-reconciliation";
import { formatCurrencyVND } from "@/lib/currency";

function Row({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-medium tabular-nums text-slate-900">
        {value === null ? (
          <span className="text-slate-400">—</span>
        ) : (
          formatCurrencyVND(value)
        )}
      </span>
    </div>
  );
}

function PeriodCard({ row }: { row: ReconciliationRow }) {
  const percent = variancePercent(row);
  const level = varianceLevel(row);

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-card p-4">
      <header className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">{formatPeriod(row.period_month)}</h2>
        <span className="text-xs text-slate-500">{row.completed_days} ngày hoàn thành</span>
      </header>

     <div className="space-y-2">
        <Row label="Bạn tự nhập" value={row.reported_revenue} />
        <Row label="AMIS ghi nhận" value={row.amis_revenue} />
        <Row label="AMIS dashboard" value={row.amis_current} />
        <Row label="Mục tiêu tháng" value={row.amis_target} />
        <Row label="Công nợ đã thu" value={row.amis_receivable} />
      </div>

      <footer className="border-t border-slate-100 pt-3">
        {row.revenue_diff === null ? (
          <p className="text-sm text-slate-500">
            Chưa đủ dữ liệu hai phía để đối chiếu tháng này.
          </p>
        ) : (
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-slate-600">Chênh lệch</span>
            <span
              className={
                level === "warning"
                  ? "text-sm font-semibold tabular-nums text-red-600"
                  : "text-sm font-medium tabular-nums text-emerald-700"
              }
            >
              {row.revenue_diff > 0 ? "+" : ""}
              {formatCurrencyVND(row.revenue_diff)}
              {percent !== null && (
                <span className="ml-1 text-xs font-normal">
                  ({percent > 0 ? "+" : ""}
                  {(percent * 100).toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        )}

        {level === "warning" && (
          <p className="mt-2 text-xs text-red-600">
            Lệch trên 10%. Kiểm tra lại số đã nhập hoặc trao đổi với quản lý.
          </p>
        )}
      </footer>
    </section>
  );
}

export function SalesReconciliation({ rows }: { rows: ReconciliationRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Chưa có dữ liệu đối chiếu. Số liệu AMIS được quản trị đồng bộ định kỳ.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <PeriodCard key={row.period_month} row={row} />
      ))}
    </div>
  );
}