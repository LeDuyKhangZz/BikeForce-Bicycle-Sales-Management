import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { AchievementBadge } from '@/features/report-comparison/achievement-badge';
import { calculateAchievement, formatMetricValue } from '@/lib/kpi';
import type { SalesPerformanceRow } from '@/services/admin';

/**
 * Bảng hiệu suất theo từng Sales — FR-029, UC-16, AF-06, DEC-019.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  "SỐ NGÀY ĐẠT KPI" ĐƯỢC ĐẾM TRONG SQL, KHÔNG PHẢI Ở ĐÂY
 * ─────────────────────────────────────────────────────────────────────────
 *  BR-024 (đạt **cả bốn** chỉ tiêu ≥ 100%) được cài trong
 *  `admin_sales_performance` bằng một `count(*) filter (...)`, đúng nguyên tắc
 *  "aggregate làm bằng SQL" của AGENTS.md §5. Component chỉ hiển thị con số.
 *
 *  Ngược lại, `%` trung bình **không** đến từ SQL: BR-011 cấm persist `%`, nên
 *  nó được tính ở đây từ cặp tổng target/actual bằng `calculateAchievement()` —
 *  cùng một hàm với màn hình Sales, nên hai bên không thể lệch (NFR-012).
 *
 * Hai chế độ hiển thị, cấm cuộn ngang: card < 768px, `<table>` từ 768px.
 */

type Props = {
  rows: readonly SalesPerformanceRow[];
};

export function SalesPerformanceTable({ rows }: Props) {
  const views = rows.map((row) => ({
    id: row.sales_id,
    name: row.full_name,
    employeeCode: row.employee_code,
    isActive: row.is_active,
    reportCount: row.report_count,
    kpiAchievedDays: row.kpi_achieved_days,
    href: `/admin/sales/${row.sales_id}`,
    quantityText: formatMetricValue(row.actual_sales_quantity, 'SALES_QUANTITY'),
    revenueText: formatMetricValue(row.actual_revenue, 'REVENUE'),
    visitText: formatMetricValue(row.actual_visit_points, 'VISIT_POINTS'),
    // "Achievement trung bình" của FR-029 = tổng thực đạt / tổng cam kết của
    // doanh thu. Cố ý dùng doanh thu chứ không lấy trung bình cộng của bốn `%`:
    // trung bình của các tỷ lệ là một con số không có nghĩa nghiệp vụ.
    revenueResult: calculateAchievement(row.target_revenue, row.actual_revenue, 'REVENUE'),
  }));

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-base">Hiệu suất nhân viên</CardTitle>

      {/* ── < 768px: card xếp dọc ───────────────────────────────────────── */}
      <ul className="flex flex-col gap-3 md:hidden">
        {views.map((view) => (
          <li key={view.id}>
            <Link
              href={view.href}
              className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-150 active:bg-background"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold break-words text-heading">{view.name}</p>
                  {!view.isActive && <Badge tone="neutral">Đã nghỉ</Badge>}
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex flex-col">
                    <dt className="text-xs text-muted-foreground">Doanh thu</dt>
                    <dd className="tabular font-semibold break-words text-foreground">
                      {view.revenueText}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-xs text-muted-foreground">Ngày đạt KPI</dt>
                    <dd className="tabular font-semibold text-foreground">
                      {view.kpiAchievedDays}/{view.reportCount}
                    </dd>
                  </div>
                </dl>

                <div className="flex">
                  <AchievementBadge result={view.revenueResult} />
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
          Hiệu suất từng nhân viên kinh doanh trong khoảng thời gian đang chọn
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              Nhân viên
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Doanh số
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Doanh thu
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Viếng thăm
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Ngày đạt KPI
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Đạt doanh thu
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Chi tiết
            </th>
          </tr>
        </thead>
        <tbody>
          {views.map((view) => (
            <tr key={view.id} className="border-b border-border last:border-b-0">
              <th scope="row" className="py-3 pr-3 text-left font-medium break-words text-foreground">
                {view.name}
                <span className="block text-xs font-normal text-muted-foreground">
                  {view.employeeCode ?? '—'}
                  {!view.isActive && ' · đã nghỉ'}
                </span>
              </th>
              <td className="tabular py-3 pl-3 text-right break-words text-foreground">
                {view.quantityText}
              </td>
              <td className="tabular py-3 pl-3 text-right break-words text-foreground">
                {view.revenueText}
              </td>
              <td className="tabular py-3 pl-3 text-right break-words text-foreground">
                {view.visitText}
              </td>
              <td className="tabular py-3 pl-3 text-right font-semibold text-foreground">
                {view.kpiAchievedDays}/{view.reportCount}
              </td>
              <td className="py-3 pl-3">
                <div className="flex justify-end">
                  <AchievementBadge result={view.revenueResult} />
                </div>
              </td>
              <td className="py-3 pl-3 text-right">
                <Link
                  href={view.href}
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
