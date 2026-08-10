import Link from 'next/link';
import { CheckCircle2, ChevronRight, Clock, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { achievedCountLabel, toHistoryRow, type HistoryRow } from '@/lib/reports/history-row';
import type { ReportListItem } from '@/services/reports';

/**
 * Danh sách lịch sử báo cáo — FR-021, UC-09, DEC-019.
 *
 * Hai chế độ hiển thị, **cấm cuộn ngang** ở cả hai (DEC-019):
 *   • < 768px  → card xếp dọc, cả card là một vùng chạm.
 *   • ≥ 768px  → `<table>` THẬT có `<caption>` — screen reader cần quan hệ
 *                hàng/cột thật, không phải một lưới `div` giả dạng bảng.
 *
 * Component KHÔNG tính gì: `toHistoryRow()` ở `lib/reports/history-row.ts` lo
 * toàn bộ phần trăm, nhãn trạng thái và kết luận "đạt KPI ngày" (BR-024), và có
 * unit test riêng (AGENTS.md §1.3).
 */

type Props = {
  reports: readonly ReportListItem[];
};

export function ReportHistoryList({ reports }: Props) {
  const rows = reports.map(toHistoryRow);

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-base">Báo cáo trong tháng</CardTitle>

      {/* ── < 768px: card xếp dọc ───────────────────────────────────────── */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={row.href}
              className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-150 active:bg-background"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="tabular text-base font-semibold break-words text-heading">
                  {row.dateLabel}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={row.statusTone}>{row.statusLabel}</Badge>
                  <KpiBadge row={row} />
                </div>
              </div>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {/* ── ≥ 768px: bảng thật ──────────────────────────────────────────── */}
      <table className="hidden w-full border-collapse text-sm md:table">
        <caption className="sr-only">
          Danh sách báo cáo ngày của bạn trong tháng đang chọn, mới nhất trước
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              Ngày
            </th>
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              Trạng thái
            </th>
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              Kết quả
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Chi tiết
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="tabular py-3 pr-3 text-left font-medium break-words text-foreground"
              >
                {row.dateLabel}
              </th>
              <td className="py-3 pl-3">
                <Badge tone={row.statusTone}>{row.statusLabel}</Badge>
              </td>
              <td className="py-3 pl-3">
                <KpiBadge row={row} />
              </td>
              <td className="py-3 pl-3 text-right">
                <Link
                  href={row.href}
                  className="inline-flex min-h-11 items-center gap-1 font-medium text-primary"
                >
                  Xem
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/**
 * Huy hiệu "ngày đạt KPI" — BR-024.
 *
 * Ba trạng thái, và **cả ba đều có chữ**, không bao giờ chỉ có màu
 * (rule `color-not-only`). Ngưỡng và phép đếm nằm ở `lib/`, ở đây chỉ ánh xạ
 * kết quả sang tone + icon.
 */
function KpiBadge({ row }: { row: HistoryRow }) {
  if (row.kpiAchieved === null) {
    return (
      <Badge tone="neutral" icon={<Clock aria-hidden="true" className="size-4" />}>
        Chờ số liệu
      </Badge>
    );
  }

  if (row.kpiAchieved) {
    return (
      <Badge tone="success" icon={<CheckCircle2 aria-hidden="true" className="size-4" />}>
        Đạt KPI
      </Badge>
    );
  }

  return (
    <Badge tone="danger" icon={<XCircle aria-hidden="true" className="size-4" />}>
      {achievedCountLabel(row.achievedCount)}
    </Badge>
  );
}
