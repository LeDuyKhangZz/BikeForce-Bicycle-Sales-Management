import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { BackLink } from '@/components/ui/back-link';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { AdminReportTable } from '@/features/admin-reports/admin-report-table';
import { EditSalesForm } from '@/features/admin-sales-management/edit-sales-form';
import { ToggleActiveButton } from '@/features/admin-sales-management/toggle-active-button';
import { AchievementBadge } from '@/features/report-comparison/achievement-badge';
import { formatVietnamMonth, getVietnamCurrentMonth, resolveVietnamMonth } from '@/lib/date';
import { calculateAchievement, formatMetricValue } from '@/lib/kpi';
import { adminReportsPath, parseAdminReportFilters } from '@/lib/reports/admin-filters';
import { KPI_METRIC_ROWS } from '@/lib/reports/metric-rows';
import { createClient } from '@/lib/supabase/server';
import { getSalesPerformance } from '@/services/admin';
import { getSalesProfileById } from '@/services/profiles';
import { getAdminReports } from '@/services/reports';

export const metadata: Metadata = {
  title: 'Hồ sơ nhân viên · BikeForce',
};

/**
 * `/admin/sales/[id]` — UC-18, UC-19, UC-16; FR-031, FR-032.
 *
 * Bốn khối: hồ sơ (sửa được), hiệu suất tháng, lịch sử báo cáo gần đây, và nút
 * bật/tắt quyền truy cập.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  KHÔNG DÙNG SERVICE ROLE Ở TRANG NÀY
 * ─────────────────────────────────────────────────────────────────────────
 *  Mọi truy vấn đi qua client anon **chịu RLS**: `profiles_select_self_or_admin`
 *  cho Admin đọc hồ sơ, `reports_select_own_or_admin` cho Admin đọc báo cáo
 *  (BR-022). Service role chỉ xuất hiện ở đúng một chỗ trong toàn dự án —
 *  `auth.admin.createUser` của UC-17 (DEC-005).
 *
 *  `null` từ service = không tồn tại **hoặc** không có quyền ⇒ `notFound()` cho
 *  cả hai, chống dò ID.
 */

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
};

/** Số báo cáo gần đây hiện ngay trên hồ sơ — đủ để nhìn nhịp làm việc. */
const RECENT_REPORTS_PAGE = 1;

export default async function AdminSalesDetailPage({ params, searchParams }: Props) {
  await requireRole('ADMIN');

  const { id } = await params;
  const { month: monthParam } = await searchParams;
  const { month, from, to } = resolveVietnamMonth(monthParam);
  const currentMonth = getVietnamCurrentMonth();

  const supabase = await createClient();
  const profile = await getSalesProfileById(supabase, id);

  if (profile === null) notFound();

  // Bộ lọc dùng chung với `/admin/reports` — nhờ vậy link "Xem tất cả" mở đúng
  // danh sách đã lọc sẵn theo người này (rule `state-preservation`).
  const filters = parseAdminReportFilters({ month, salesId: id });

  const [performanceRows, { rows: recentReports, pageInfo }] = await Promise.all([
    getSalesPerformance(supabase, { from, to }),
    getAdminReports(
      supabase,
      { range: { from, to }, salesId: id, status: null, search: null },
      RECENT_REPORTS_PAGE,
    ),
  ]);

  const performance = performanceRows.find((row) => row.sales_id === id);

  const metricRows = KPI_METRIC_ROWS.map((row) => {
    const target = performance?.[row.targetColumn] ?? 0;
    const actual = performance?.[row.actualColumn] ?? 0;

    return {
      metric: row.metric,
      label: row.label,
      targetText: formatMetricValue(target, row.metric),
      actualText: formatMetricValue(actual, row.metric),
      result: calculateAchievement(target, actual, row.metric),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/sales">Về danh sách nhân viên</BackLink>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight break-words text-heading">
            {profile.full_name}
          </h1>
          <Badge tone={profile.is_active ? 'success' : 'neutral'}>
            {profile.is_active ? 'Đang hoạt động' : 'Đã vô hiệu hoá'}
          </Badge>
        </div>

        <p className="text-sm break-all text-muted-foreground">
          {profile.email}
          {profile.employee_code !== null && <span> · {profile.employee_code}</span>}
        </p>
      </div>

      {/* ── Hiệu suất tháng — UC-16, FR-029 ─────────────────────────────── */}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Hiệu suất {formatVietnamMonth(month)}</CardTitle>
          <span className="tabular text-sm text-muted-foreground">
            {performance?.kpi_achieved_days ?? 0}/{performance?.report_count ?? 0} ngày đạt KPI
          </span>
        </div>

        {(performance?.report_count ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nhân viên này chưa có báo cáo hoàn tất nào trong{' '}
            {formatVietnamMonth(month).toLowerCase()}.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {metricRows.map((row) => (
              <li
                key={row.metric}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 flex-col">
                  <p className="text-sm font-medium text-heading">{row.label}</p>
                  <p className="tabular text-sm break-words text-muted-foreground">
                    {row.actualText} / {row.targetText}
                  </p>
                </div>
                <AchievementBadge result={row.result} />
              </li>
            ))}
          </ul>
        )}

        {month !== currentMonth && (
          <p className="text-xs text-muted-foreground">
            Đang xem tháng cũ. Bỏ tham số tháng trên URL để về tháng hiện tại.
          </p>
        )}
      </Card>

      {/* ── Lịch sử báo cáo gần đây ─────────────────────────────────────── */}
      {recentReports.length > 0 && (
        <div className="flex flex-col gap-2">
          <AdminReportTable
            reports={recentReports}
            buildHref={(reportId) => `/admin/reports/${reportId}`}
          />

          {pageInfo.pageCount > 1 && (
            <Link
              href={adminReportsPath(filters)}
              className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-primary"
            >
              Xem tất cả {pageInfo.total} báo cáo của nhân viên này
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </div>
      )}

      {/* ── Sửa hồ sơ — UC-18, FR-031 ───────────────────────────────────── */}
      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Sửa hồ sơ</CardTitle>
        <p className="text-sm text-muted-foreground">
          Email đăng nhập không đổi được ở bản này. Số liệu báo cáo do nhân viên tự nhập và không ai
          sửa được, kể cả Quản trị viên.
        </p>
        <EditSalesForm
          salesId={profile.id}
          initialValues={{
            full_name: profile.full_name,
            phone: profile.phone ?? '',
            employee_code: profile.employee_code ?? '',
          }}
        />
      </Card>

      {/* ── Bật/tắt quyền truy cập — UC-19, FR-032, BR-009 ──────────────── */}
      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Quyền truy cập</CardTitle>
        <p className="text-sm text-muted-foreground">
          {profile.is_active
            ? 'Nhân viên đang đăng nhập và gửi báo cáo bình thường.'
            : 'Nhân viên hiện không đăng nhập được. Báo cáo cũ vẫn được giữ nguyên.'}
        </p>
        <ToggleActiveButton
          salesId={profile.id}
          salesName={profile.full_name}
          isActive={profile.is_active}
        />
      </Card>
    </div>
  );
}
