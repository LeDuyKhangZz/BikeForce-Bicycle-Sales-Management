import Link from 'next/link';
import { CheckCircle2, ChevronRight, Clock, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { achievedCountLabel, toHistoryRow } from '@/lib/reports/history-row';
import type { AdminReportListItem } from '@/services/reports';

/**
 * Bảng báo cáo toàn đội — FR-025, UC-13, AF-03, DEC-019.
 *
 * Hai chế độ hiển thị, **cấm cuộn ngang** ở cả hai:
 *   • < 768px  → card xếp dọc, cả card là một vùng chạm.
 *   • ≥ 768px  → `<table>` THẬT có `<caption>`.
 *
 * Dùng lại `toHistoryRow()` của Phase 7 cho phần ngày / trạng thái / kết luận
 * "đạt KPI ngày" (BR-024) — bảng của Admin và danh sách của Sales vì vậy **không
 * thể** cho ra hai kết luận khác nhau về cùng một báo cáo. Chỉ thêm đúng một
 * cột mà Sales không cần: tên nhân viên.
 *
 * `docs/05 §11` yêu cầu `aria-sort` cho bảng Admin. Ở đây bảng luôn sắp theo
 * ngày giảm dần và **chưa cho đổi chiều sắp xếp** (không có FR nào yêu cầu), nên
 * `aria-sort="descending"` đặt cố định trên đúng cột đó — nói đúng sự thật cho
 * screen reader thay vì bịa ra các control sắp xếp không tồn tại.
 */

type Props = {
  reports: readonly AdminReportListItem[];
  /** Đường dẫn chi tiết, do trang truyền vào (Admin đi `/admin/reports/[id]`). */
  buildHref: (reportId: string) => string;
};

export function AdminReportTable({ reports, buildHref }: Props) {
  const rows = reports.map((report) => ({
    ...toHistoryRow(report),
    salesName: report.sales.full_name,
    employeeCode: report.sales.employee_code,
    href: buildHref(report.id),
  }));

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-base">Báo cáo</CardTitle>

      {/* ── < 768px: card xếp dọc ───────────────────────────────────────── */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={row.href}
              className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-150 active:bg-background"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-base font-semibold break-words text-heading">{row.salesName}</p>
                <p className="tabular text-sm text-muted-foreground">{row.dateLabel}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={row.statusTone}>{row.statusLabel}</Badge>
                  <KpiBadge kpiAchieved={row.kpiAchieved} achievedCount={row.achievedCount} />
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
          Danh sách báo cáo ngày của toàn đội theo bộ lọc đang chọn, mới nhất trước
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              Nhân viên
            </th>
            <th
              scope="col"
              aria-sort="descending"
              className="py-2 text-left font-medium text-muted-foreground"
            >
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
              <th scope="row" className="py-3 pr-3 text-left font-medium break-words text-foreground">
                {row.salesName}
                {row.employeeCode !== null && (
                  <span className="tabular block text-xs font-normal text-muted-foreground">
                    {row.employeeCode}
                  </span>
                )}
              </th>
              <td className="tabular py-3 pl-3 break-words text-foreground">{row.dateLabel}</td>
              <td className="py-3 pl-3">
                <Badge tone={row.statusTone}>{row.statusLabel}</Badge>
              </td>
              <td className="py-3 pl-3">
                <KpiBadge kpiAchieved={row.kpiAchieved} achievedCount={row.achievedCount} />
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
 * Huy hiệu "ngày đạt KPI" — BR-024. Cùng ba trạng thái và cùng câu chữ với
 * `features/sales-history/report-history-list.tsx`.
 *
 * Không export chung một component giữa hai feature: AGENTS.md §1.2 cấm
 * `features/X` import `features/Y`. Phần **nghiệp vụ** (đếm chỉ tiêu đạt, quyết
 * định `null` khi chưa hoàn tất) đã nằm chung ở `lib/reports/history-row.ts`, ở
 * đây chỉ còn ánh xạ sang tone + icon.
 */
function KpiBadge({
  kpiAchieved,
  achievedCount,
}: {
  kpiAchieved: boolean | null;
  achievedCount: number | null;
}) {
  if (kpiAchieved === null) {
    return (
      <Badge tone="neutral" icon={<Clock aria-hidden="true" className="size-4" />}>
        Chờ số liệu
      </Badge>
    );
  }

  if (kpiAchieved) {
    return (
      <Badge tone="success" icon={<CheckCircle2 aria-hidden="true" className="size-4" />}>
        Đạt KPI
      </Badge>
    );
  }

  return (
    <Badge tone="danger" icon={<XCircle aria-hidden="true" className="size-4" />}>
      {achievedCountLabel(achievedCount)}
    </Badge>
  );
}
