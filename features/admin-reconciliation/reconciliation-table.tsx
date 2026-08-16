import {
  formatPeriod,
  rowKind,
  variancePercent,
  varianceLevel,
  type ReconciliationRow,
} from "@/lib/reports/amis-reconciliation";
import { formatCurrencyVND } from "@/lib/currency";

function Money({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  return <>{formatCurrencyVND(value)}</>;
}

function StatusBadge({ row }: { row: ReconciliationRow }) {
  const kind = rowKind(row);

  if (kind === "amis_only") {
    return (
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
        Chưa có tài khoản
      </span>
    );
  }

  if (kind === "bikeforce_only") {
    return (
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
        Chưa map AMIS
      </span>
    );
  }

  return null;
}

function DiffCell({ row }: { row: ReconciliationRow }) {
  if (row.revenue_diff === null) {
    return <span className="text-slate-400">Không so được</span>;
  }

  const percent = variancePercent(row);
  const level = varianceLevel(row);

  return (
    <span className={level === "warning" ? "font-medium text-red-600" : "text-slate-700"}>
      {row.revenue_diff > 0 ? "+" : ""}
      {formatCurrencyVND(row.revenue_diff)}
      {percent !== null && (
        <span className="ml-1 text-xs text-slate-500">
          ({percent > 0 ? "+" : ""}
          {(percent * 100).toFixed(1)}%)
        </span>
      )}
    </span>
  );
}

export function ReconciliationTable({ rows }: { rows: ReconciliationRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Chưa có dữ liệu đối chiếu. Chạy <code>scripts/amis-sync/push_amis.py</code> để
        đồng bộ số liệu từ AMIS, rồi điền cột <code>amis_employee_name</code> trong bảng{" "}
        <code>profiles</code>.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">Nhân viên</th>
            <th className="px-4 py-3 font-medium">Kỳ</th>
            <th className="px-4 py-3 text-right font-medium">Ngày hoàn thành</th>
            <th className="px-4 py-3 text-right font-medium">Sales tự nhập</th>
            <th className="px-4 py-3 text-right font-medium">AMIS ghi nhận</th>
            <th className="px-4 py-3 text-right font-medium">Chênh lệch</th>
            <th className="px-4 py-3 text-right font-medium">Công nợ đã thu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={`${row.sales_id ?? row.full_name}-${row.period_month}`}
              className={
                rowKind(row) === "amis_only" ? "bg-amber-50/50" : "hover:bg-slate-50"
              }
            >
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{row.full_name ?? "—"}</div>
                <div className="mt-0.5 flex items-center gap-2">
                  {row.employee_code && (
                    <span className="text-xs text-slate-500">{row.employee_code}</span>
                  )}
                  <StatusBadge row={row} />
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">{formatPeriod(row.period_month)}</td>
              <td className="px-4 py-3 text-right text-slate-600">{row.completed_days}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                <Money value={row.reported_revenue} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <Money value={row.amis_revenue} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <DiffCell row={row} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <Money value={row.amis_receivable} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}