import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarSearch, ChevronLeft, ChevronRight } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import { LinkSpinner } from '@/components/ui/link-spinner';
import { DailyTrendChart } from '@/features/admin-analytics/daily-trend-chart';
import { requireRole } from '@/features/auth/queries';
import { AchievementBadge } from '@/features/report-comparison/achievement-badge';
import {
  formatVietnamMonth,
  getVietnamCurrentMonth,
  resolveVietnamMonth,
  shiftVietnamMonth,
} from '@/lib/date';
import { calculateAchievement, formatMetricValue, type KpiMetric } from '@/lib/kpi';
import { KPI_METRIC_ROWS, kpiMetricRow } from '@/lib/reports/metric-rows';
import { parseTrendMetric } from '@/lib/reports/trend-chart';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { getAdminDailyTrend, getAdminMonthlySummary } from '@/services/admin';

export const metadata: Metadata = {
  title: 'Phân tích tháng · BikeForce',
};

const ANALYTICS_PATH = '/admin/analytics';

/**
 * `/admin/analytics` — UC-15, FR-028, AF-05.
 *
 * Tổng cam kết vs tổng thực đạt cho **cả bốn** chỉ tiêu trong một tháng, kèm `%`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  MỘT RPC, MỘT LƯỢT QUÉT
 * ─────────────────────────────────────────────────────────────────────────
 *  `admin_monthly_summary` cộng ngay trong SQL (migration 0006). Một tháng của
 *  20 Sales là ~600 dòng — kéo về Node rồi `reduce()` là vừa chậm vừa tốn băng
 *  thông của hạn mức Supabase Free (NFR-013, AGENTS.md §5).
 *
 *  Hàm SQL chỉ cộng báo cáo đã `COMPLETED`: một tháng đang dở không được lấy cam
 *  kết sáng của hôm nay cộng vào rồi kết luận cả đội chưa đạt.
 *
 *  `%` vẫn tính ở tầng này bằng `calculateAchievement()` — BR-011 cấm persist,
 *  và `lib/kpi.ts` là nguồn duy nhất của công thức (NFR-012). BR-015 áp dụng
 *  nguyên vẹn ở cấp tổng: mẫu số 0 không bao giờ ra `NaN`.
 *
 * ✅ Biểu đồ trend theo ngày (FR-037, AF-08) **đã làm** bằng SVG viết tay —
 * `features/admin-analytics/daily-trend-chart.tsx`. Ràng buộc "chỉ làm nếu
 * không phát sinh dependency nặng" của `PROJECT_CHECKLIST.md § Phase 9` vẫn giữ
 * nguyên: **không** thêm package nào, và biểu đồ render ngay trong Server
 * Component nên không có JavaScript biểu đồ nào chạy trên máy khách.
 */

type Props = {
  searchParams: Promise<{ month?: string; metric?: string }>;
};

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  await requireRole('ADMIN');

  const params = await searchParams;
  const currentMonth = getVietnamCurrentMonth();
  const { month, from, to } = resolveVietnamMonth(params.month);
  const trendMetric = parseTrendMetric(params.metric);

  const supabase = await createClient();
  /*
   * Hai RPC độc lập nhau nên chạy song song: tổng tháng (một dòng) và chuỗi
   * theo ngày (tối đa 31 dòng). Tuần tự thì trang phải chờ hai lượt round-trip
   * chồng lên nhau mà không được lợi gì.
   */
  const [summary, trend] = await Promise.all([
    getAdminMonthlySummary(supabase, { from, to }),
    getAdminDailyTrend(supabase, { from, to }),
  ]);

  const rows = KPI_METRIC_ROWS.map((row) => {
    const target = summary[row.targetColumn];
    const actual = summary[row.actualColumn];

    return {
      metric: row.metric,
      label: row.label,
      targetText: formatMetricValue(target, row.metric),
      actualText: formatMetricValue(actual, row.metric),
      result: calculateAchievement(target, actual, row.metric),
    };
  });

  /*
   * Chuỗi theo ngày của ĐÚNG chỉ tiêu đang chọn. Tên cột lấy từ
   * `KPI_METRIC_ROWS` — nguồn duy nhất của "4 chỉ tiêu là gì" (kết luận Phase
   * 6). Dòng RPC và dòng `daily_reports` cố ý mang cùng tên cột nên không cần
   * một bảng ánh xạ thứ hai.
   */
  const trendRow = kpiMetricRow(trendMetric);
  const trendMetricLabel = trendRow.label;
  const trendPoints = trend.map((day) => ({
    date: day.report_date,
    target: day[trendRow.targetColumn],
    actual: day[trendRow.actualColumn],
  }));

  const previousMonth = shiftVietnamMonth(month, -1);
  const nextMonth = shiftVietnamMonth(month, 1);
  // BR-021 — không có báo cáo của tương lai, nên không cho đi tới đó.
  const canGoNext = nextMonth !== null && nextMonth <= currentMonth;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-heading">Phân tích tháng</h1>
        <p className="text-sm text-muted-foreground">
          Chỉ tính báo cáo đã hoàn tất cuối ngày.
        </p>
      </div>

      <Card className="flex items-center justify-between gap-2 py-2">
        <MonthLink
          href={previousMonth === null ? null : `${ANALYTICS_PATH}?month=${previousMonth}`}
          label="Tháng trước"
          icon={<ChevronLeft aria-hidden="true" className="size-5" />}
        />
        <p aria-live="polite" className="tabular text-base font-semibold text-heading">
          {formatVietnamMonth(month)}
        </p>
        <MonthLink
          href={canGoNext && nextMonth !== null ? `${ANALYTICS_PATH}?month=${nextMonth}` : null}
          label="Tháng sau"
          icon={<ChevronRight aria-hidden="true" className="size-5" />}
        />
      </Card>

      {summary.report_count === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <CalendarSearch aria-hidden="true" className="size-12 text-muted-foreground" />
          <p className="text-base font-medium text-foreground">
            {formatVietnamMonth(month)} chưa có báo cáo hoàn tất nào
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Số liệu tổng hợp chỉ tính báo cáo đã hoàn tất cuối ngày. Hãy chọn tháng khác.
          </p>
          {previousMonth !== null && (
            <Link
              href={`${ANALYTICS_PATH}?month=${previousMonth}`}
              className={buttonClassName({ variant: 'secondary' })}
            >
              Xem tháng trước
              <LinkSpinner label="Đang mở tháng trước…" />
            </Link>
          )}
        </Card>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3">
            <li>
              <Card className="flex h-full flex-col gap-1">
                <p className="text-sm text-muted-foreground">Báo cáo hoàn tất</p>
                <p className="tabular text-3xl font-bold text-heading">{summary.report_count}</p>
              </Card>
            </li>
            <li>
              <Card className="flex h-full flex-col gap-1">
                <p className="text-sm text-muted-foreground">Sales có số liệu</p>
                <p className="tabular text-3xl font-bold text-heading">{summary.sales_count}</p>
              </Card>
            </li>
          </ul>

          <Card className="flex flex-col gap-3">
            <CardTitle className="text-base">Tổng cam kết và thực đạt</CardTitle>

            {/* ── < 768px: card xếp dọc (DEC-019) ─────────────────────────── */}
            <ul className="flex flex-col gap-3 md:hidden">
              {rows.map((row) => (
                <li
                  key={row.metric}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3"
                >
                  <p className="text-base font-semibold text-heading">{row.label}</p>
                  <dl className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs text-muted-foreground">Tổng cam kết</dt>
                      <dd className="tabular text-base font-semibold break-words text-foreground">
                        {row.targetText}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs text-muted-foreground">Tổng thực đạt</dt>
                      <dd className="tabular text-base font-semibold break-words text-foreground">
                        {row.actualText}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex">
                    <AchievementBadge result={row.result} />
                  </div>
                </li>
              ))}
            </ul>

            {/* ── ≥ 768px: bảng thật ──────────────────────────────────────── */}
            <table className="hidden w-full border-collapse text-sm md:table">
              <caption className="sr-only">
                Tổng cam kết và tổng thực đạt của cả đội trong {formatVietnamMonth(month)}, cho bốn
                chỉ tiêu
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
                    Chỉ tiêu
                  </th>
                  <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
                    Tổng cam kết
                  </th>
                  <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
                    Tổng thực đạt
                  </th>
                  <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
                    Hoàn thành
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.metric} className="border-b border-border last:border-b-0">
                    <th scope="row" className="py-3 pr-3 text-left font-medium text-foreground">
                      {row.label}
                    </th>
                    <td className="tabular py-3 pl-3 text-right font-semibold break-words text-foreground">
                      {row.targetText}
                    </td>
                    <td className="tabular py-3 pl-3 text-right font-semibold break-words text-foreground">
                      {row.actualText}
                    </td>
                    <td className="py-3 pl-3">
                      <div className="flex justify-end">
                        <AchievementBadge result={row.result} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* ── FR-037 / AF-08 — diễn biến theo ngày ─────────────────────── */}
          <MetricTabs month={month} selected={trendMetric} />

          <DailyTrendChart
            metric={trendMetric}
            metricLabel={trendMetricLabel}
            monthLabel={formatVietnamMonth(month)}
            points={trendPoints}
          />
        </>
      )}
    </div>
  );
}

/**
 * Bộ chuyển chỉ tiêu của biểu đồ — bốn `<Link>` thật, KHÔNG phải state client.
 *
 * Đổi chỉ tiêu là đổi câu hỏi đang xem, nên nó thuộc về URL: chia sẻ được, quay
 * lại được bằng nút Back, và không cần một byte JavaScript nào. Cùng lối làm với
 * `MonthFilter` của Phase 7.
 */
function MetricTabs({ month, selected }: { month: string; selected: KpiMetric }) {
  return (
    <nav aria-label="Chọn chỉ tiêu cho biểu đồ">
      <ul className="flex flex-wrap gap-2">
        {KPI_METRIC_ROWS.map((row) => {
          const isSelected = row.metric === selected;

          return (
            <li key={row.metric}>
              <Link
                href={`${ANALYTICS_PATH}?month=${month}&metric=${row.metric}`}
                aria-current={isSelected ? 'true' : undefined}
                className={cn(
                  buttonClassName({ variant: isSelected ? 'primary' : 'secondary' }),
                  'h-11 px-4 text-sm',
                )}
              >
                {row.label}
                <LinkSpinner label={`Đang mở chỉ tiêu ${row.label}…`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Không export — chỉ dùng trong file này. Cùng quy ước với `MonthFilter` của Phase 7. */
function MonthLink({
  href,
  label,
  icon,
}: {
  href: string | null;
  label: string;
  icon: React.ReactNode;
}) {
  const className = cn(buttonClassName({ variant: 'ghost' }), 'min-w-11');

  if (href === null) {
    return (
      <span aria-disabled="true" className={cn(className, 'cursor-not-allowed opacity-45')}>
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      <LinkPendingIcon label={`Đang mở ${label.toLocaleLowerCase('vi-VN')}…`} className="size-5">
        {icon}
      </LinkPendingIcon>
      <span className="sr-only">{label}</span>
    </Link>
  );
}
