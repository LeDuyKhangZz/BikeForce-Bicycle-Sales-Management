/**
 * View model của dashboard Admin — 12 chỉ số bắt buộc của `docs/01 §12.1`
 * (Master Spec §16), FR-024, UC-12, AF-01.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO LÀ HÀM THUẦN Ở `lib/`
 * ─────────────────────────────────────────────────────────────────────────
 *  Ba trong 12 chỉ số là **phần trăm** (`% đạt doanh số`, `% đạt doanh thu`, và
 *  tỷ lệ Sales đã báo cáo). BR-011 + DEC-007 cấm persist `%`, nên chúng phải
 *  tính runtime — và `lib/kpi.ts` là nguồn DUY NHẤT của công thức đó (NFR-012).
 *  Viết `actual / target * 100` trong `.tsx` là vi phạm thẳng AGENTS.md §1.3.
 *
 *  BR-015 áp dụng nguyên vẹn ở cấp tổng: một ngày mà **cả đội** đặt
 *  `target_revenue = 0` thì mẫu số bằng 0, và `calculateAchievement()` đã có
 *  sẵn câu trả lời đúng (`100,0%` hoặc số vượt tuyệt đối) thay vì `NaN`/`∞`.
 */
import {
  calculateAchievement,
  formatMetricValue,
  type AchievementResult,
  type KpiMetric,
} from '@/lib/kpi';
import { KPI_METRIC_ROWS } from '@/lib/reports/metric-rows';

/** Đúng những gì view model cần — khai báo cấu trúc để `lib/` không chạm `services/`. */
export type AdminOverviewSource = {
  active_sales_count: number;
  morning_submitted_count: number;
  completed_count: number;
  no_report_count: number;
  target_visit_points: number;
  actual_visit_points: number;
  target_sales_amount: number;
  actual_sales_amount: number;
  target_revenue: number;
  actual_revenue: number;
  target_customer_visits: number;
  actual_customer_visits: number;
};

/** Một ô số của dashboard. `hint` là dòng phụ, `null` khi không có gì để nói thêm. */
export type OverviewTile = {
  key: string;
  label: string;
  value: string;
  hint: string | null;
  /** Tone traffic-light; `null` = ô trung tính, không mang phán xét. */
  tone: 'success' | 'warning' | 'danger' | 'neutral' | null;
};

/** Một dòng của bảng tổng target vs actual toàn đội. */
export type OverviewMetricRow = {
  metric: KpiMetric;
  label: string;
  targetText: string;
  actualText: string;
  result: AchievementResult;
};

export type AdminOverview = {
  /** Bốn ô đếm người — chỉ số 1…4. */
  headcountTiles: readonly OverviewTile[];
  /** Bốn dòng target vs actual — chỉ số 5…12. */
  metricRows: readonly OverviewMetricRow[];
  /** Tỷ lệ Sales đã hoàn tất báo cáo trong ngày, `null` khi chưa có Sales nào. */
  completionPercent: number | null;
  /** Số Sales đã cam kết sáng nhưng CHƯA hoàn tất cuối ngày. */
  notCompletedCount: number;
};

/**
 * Ngưỡng traffic-light cho tỷ lệ hoàn tất báo cáo của cả đội.
 *
 * Cố ý **không** tái dùng ngưỡng BR-023 (100 / 80): BR-023 nói về mức hoàn thành
 * KPI của một chỉ tiêu, còn đây là "bao nhiêu người đã nộp báo cáo" — hai
 * chuyện khác nhau, và gán ghép chúng sẽ khiến việc sửa một bên vô tình đổi bên
 * kia. Đây là ngưỡng TRÌNH BÀY, không phải business rule.
 */
const COMPLETION_GOOD = 100;
const COMPLETION_WARN = 60;

function completionTone(percent: number | null): OverviewTile['tone'] {
  if (percent === null) return 'neutral';
  if (percent >= COMPLETION_GOOD) return 'success';
  if (percent >= COMPLETION_WARN) return 'warning';
  return 'danger';
}

/** `3` → `'3'`. Số người không có đơn vị, và không bao giờ là `NaN`. */
function formatCount(value: number): string {
  return Number.isSafeInteger(value) && value >= 0 ? String(value) : '0';
}

export function toAdminOverview(source: AdminOverviewSource): AdminOverview {
  const active = Math.max(0, source.active_sales_count);
  const morning = Math.max(0, source.morning_submitted_count);
  const completed = Math.max(0, source.completed_count);
  const noReport = Math.max(0, source.no_report_count);
  const notCompletedCount = Math.max(0, morning - completed);

  // Mẫu số 0 (chưa có Sales active nào) ⇒ `null`, không phải `0%`: "không có ai
  // để tính" khác hẳn "không ai làm được gì" (cùng tinh thần BR-015).
  const completionPercent = active === 0 ? null : (completed / active) * 100;

  const headcountTiles: OverviewTile[] = [
    {
      key: 'ACTIVE_SALES',
      label: 'Sales đang hoạt động',
      value: formatCount(active),
      hint: null,
      tone: null,
    },
    {
      key: 'MORNING_SUBMITTED',
      label: 'Đã cam kết sáng',
      value: formatCount(morning),
      hint: notCompletedCount > 0 ? `${notCompletedCount} người chưa hoàn tất cuối ngày` : null,
      tone: null,
    },
    {
      key: 'COMPLETED',
      label: 'Đã hoàn thành',
      value: formatCount(completed),
      hint:
        completionPercent === null
          ? null
          : `${percentDisplay(completionPercent)} toàn đội`,
      tone: completionTone(completionPercent),
    },
    {
      key: 'NO_REPORT',
      label: 'Chưa báo cáo',
      value: formatCount(noReport),
      // Ô này đảo chiều: 0 người chưa báo cáo mới là tốt.
      tone: noReport === 0 ? 'success' : 'danger',
      hint: noReport === 0 ? 'Cả đội đã cam kết sáng' : 'Cần nhắc trực tiếp',
    },
  ];

  /*
   * Bốn dòng target vs actual đọc từ `KPI_METRIC_ROWS` — nguồn DUY NHẤT của
   * "4 chỉ tiêu là gì" (Phase 6). Tên cột tổng ở đây trùng đúng tên cột của
   * `daily_reports`, nên ánh xạ là tra thẳng, không có bảng thứ hai.
   */
  const metricRows: OverviewMetricRow[] = KPI_METRIC_ROWS.map((row) => {
    const target = source[row.targetColumn];
    const actual = source[row.actualColumn];

    return {
      metric: row.metric,
      label: row.label,
      targetText: formatMetricValue(target, row.metric),
      actualText: formatMetricValue(actual, row.metric),
      result: calculateAchievement(target, actual, row.metric),
    };
  });

  return { headcountTiles, metricRows, completionPercent, notCompletedCount };
}

const percentFormatter = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * `66.666…` → `'66,7%'`. Làm tròn 1 chữ số thập phân theo BR-014.
 *
 * Riêng cho tỷ lệ **người**, không phải cho `%` hoàn thành KPI — cái đó đã có
 * `AchievementResult.display` của `lib/kpi.ts` và không được tính lại ở đây.
 */
export function percentDisplay(percent: number | null): string {
  if (percent === null || !Number.isFinite(percent)) return '—';
  return `${percentFormatter.format(percent)}%`;
}
