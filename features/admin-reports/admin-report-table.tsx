import type { ReactNode } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import { toHistoryRow } from '@/lib/reports/history-row';
import type { AdminReportListItem } from '@/services/reports';

/**
 * Bảng báo cáo toàn đội / chi tiết báo cáo nhân viên — FR-025, UC-13, AF-03, DEC-019.
 *
 * Hai chế độ hiển thị, **cấm cuộn ngang** ở cả hai:
 *   • < 768px  → card xếp dọc.
 *   • ≥ 768px  → `<table>` THẬT có `<caption>`.
 *
 * Khi bấm vào tên nhân viên ở cột "Nhân viên", trang chuyển sang chế độ xem
 * tổng quan + lịch tháng của nhân viên đó (`buildEmployeeHref`). Khi bấm vào
 * cột "Ghi chú", trang mở chi tiết báo cáo ngày (`/admin/reports/[id]`).
 */

type Props = {
  reports: readonly AdminReportListItem[];
  /** Đường dẫn chi tiết báo cáo (`/admin/reports/[id]`). */
  buildHref: (reportId: string) => string;
  /** Đường dẫn xem tổng quan tháng của nhân viên (`/admin/reports?salesId=...`). */
  buildEmployeeHref?: (salesId: string) => string;
  /** Bộ lọc nhanh đặt cùng hàng với tiêu đề "Chi tiết báo cáo". */
  headerControls?: ReactNode;
};

export function AdminReportTable({
  reports,
  buildHref,
  buildEmployeeHref = (salesId) => `/admin/reports?salesId=${encodeURIComponent(salesId)}`,
  headerControls,
}: Props) {
  const rows = reports.map((report) => ({
    ...toHistoryRow(report),
    salesId: report.sales_id,
    salesName: report.sales.full_name,
    employeeCode: report.sales.employee_code,
    href: buildHref(report.id),
    employeeHref: buildEmployeeHref(report.sales_id),
  }));

  return (
    <Card className="flex flex-col gap-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-bold">Chi tiết báo cáo</CardTitle>
        {headerControls}
      </div>

      {/* ── < 768px: card xếp dọc ───────────────────────────────────────── */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={row.employeeHref}
                  className="inline-flex min-h-11 items-center text-base font-bold break-words text-heading hover:text-primary hover:underline"
                >
                  {row.salesName}
                </Link>
                <StatusBadge isCompleted={row.isCompleted} label={row.statusLabel} tone={row.statusTone} />
              </div>

              <p className="tabular text-sm text-muted-foreground">{row.dateLabel}</p>

              <div className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Đầu ngày:</span>
                  <SubmissionCell
                    submitted={row.hasMorningSubmission}
                    label={row.morningSubmittedLabel}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Cuối ngày:</span>
                  <SubmissionCell
                    submitted={row.hasEveningSubmission}
                    label={row.eveningSubmittedLabel}
                  />
                </div>
              </div>

              <Link
                href={row.href}
                className="flex min-h-11 items-center justify-between gap-2 border-t border-border pt-2 text-sm font-medium text-primary"
              >
                <span className="text-foreground">{row.summaryNote}</span>
                <span className="inline-flex items-center gap-1">
                  Xem
                  <LinkPendingIcon label="Đang mở chi tiết báo cáo…" className="size-4">
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
                  </LinkPendingIcon>
                </span>
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {/* ── ≥ 768px: bảng thật ──────────────────────────────────────────── */}
      <table className="hidden w-full border-collapse text-sm md:table">
        <caption className="sr-only">
          Danh sách báo cáo ngày của đội ngũ kinh doanh theo bộ lọc đang chọn, mới nhất trước
        </caption>
        <thead>
          <tr className="border-b border-border bg-background/60">
            <th scope="col" className="py-3 pr-3 pl-3 text-left font-semibold text-muted-foreground">
              Nhân viên
            </th>
            <th
              scope="col"
              aria-sort="descending"
              className="py-3 px-3 text-left font-semibold text-muted-foreground"
            >
              Ngày
            </th>
            <th scope="col" className="py-3 px-3 text-left font-semibold text-muted-foreground">
              Báo cáo đầu ngày
            </th>
            <th scope="col" className="py-3 px-3 text-left font-semibold text-muted-foreground">
              Báo cáo cuối ngày
            </th>
            <th scope="col" className="py-3 px-3 text-left font-semibold text-muted-foreground">
              Trạng thái
            </th>
            <th scope="col" className="py-3 pr-3 pl-3 text-left font-semibold text-muted-foreground">
              Ghi chú
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border transition-colors duration-150 last:border-b-0 hover:bg-background/50"
            >
              <th scope="row" className="py-2.5 pr-3 pl-3 text-left font-bold break-words text-foreground">
                <Link
                  href={row.employeeHref}
                  className="inline-flex min-h-11 flex-col justify-center text-left font-bold text-foreground transition-colors duration-150 hover:text-primary hover:underline"
                >
                  <span>{row.salesName}</span>
                  {row.employeeCode !== null && (
                    <span className="tabular text-xs font-normal text-muted-foreground">
                      {row.employeeCode}
                    </span>
                  )}
                </Link>
              </th>
              <td className="tabular py-2.5 px-3 break-words text-foreground">{row.dateLabel}</td>
              <td className="tabular py-2.5 px-3 text-foreground">
                <SubmissionCell
                  submitted={row.hasMorningSubmission}
                  label={row.morningSubmittedLabel}
                />
              </td>
              <td className="tabular py-2.5 px-3 text-foreground">
                <SubmissionCell
                  submitted={row.hasEveningSubmission}
                  label={row.eveningSubmittedLabel}
                />
              </td>
              <td className="py-2.5 px-3">
                <StatusBadge
                  isCompleted={row.isCompleted}
                  label={row.statusLabel}
                  tone={row.statusTone}
                />
              </td>
              <td className="py-2.5 pr-3 pl-3">
                <Link
                  href={row.href}
                  className="inline-flex min-h-11 items-center gap-1.5 text-foreground transition-colors duration-150 hover:text-primary"
                >
                  <span>{row.summaryNote}</span>
                  <LinkPendingIcon label="Đang mở chi tiết báo cáo…" className="size-4">
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  </LinkPendingIcon>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function SubmissionCell({ submitted, label }: { submitted: boolean; label: string }) {
  if (!submitted) {
    return <span className="text-muted-foreground">{label}</span>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid size-5 shrink-0 place-items-center rounded-pill bg-success text-white">
        <Check aria-hidden="true" className="size-3.5 stroke-[3]" />
      </span>
      <span>{label}</span>
    </span>
  );
}

function StatusBadge({
  isCompleted,
  label,
  tone,
}: {
  isCompleted: boolean;
  label: string;
  tone: 'info' | 'success';
}) {
  return (
    <Badge
      tone={tone}
      icon={
        isCompleted ? (
          <span className="grid size-4 shrink-0 place-items-center rounded-pill bg-success text-white">
            <Check aria-hidden="true" className="size-3 stroke-[3]" />
          </span>
        ) : (
          <Clock aria-hidden="true" className="size-4 shrink-0" />
        )
      }
    >
      {label}
    </Badge>
  );
}
