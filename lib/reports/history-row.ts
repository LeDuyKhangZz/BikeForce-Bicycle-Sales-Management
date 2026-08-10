/**
 * View model của MỘT dòng trong `/sales/history` — FR-021, UC-09.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO LÀ HÀM THUẦN Ở `lib/`
 * ─────────────────────────────────────────────────────────────────────────
 *  Mỗi dòng danh sách phải trả lời ba câu: ngày nào, trạng thái gì, và **ngày
 *  đó có đạt KPI không** (BR-024 — cả 4 chỉ tiêu ≥ 100%). Câu thứ ba là một
 *  phép tính nghiệp vụ thật, chạy 20 lần mỗi trang. Viết nó trong `.tsx` là vi
 *  phạm AGENTS.md §1.3 và cũng làm nó không kiểm được nếu không dựng DOM.
 *
 *  Ở đây KHÔNG có công thức nào: mọi con số đi qua `calculateAchievement()` và
 *  `isKpiAchievedDay()` của `lib/kpi.ts`, mọi chuỗi đi qua `formatMetricValue()`
 *  và `formatVietnamDate()`. File này chỉ **gộp** chúng lại đúng một lần.
 */
import { formatVietnamDate } from '@/lib/date';
import { calculateAchievement, isKpiAchievedDay, type AchievementResult } from '@/lib/kpi';
import { KPI_METRIC_ROWS, type KpiMetricSource } from '@/lib/reports/metric-rows';
import {
  REPORT_STATUS_LABEL,
  REPORT_STATUS_TONE,
  type ReportStatusTone,
} from '@/lib/reports/report-status';
import { salesReportPath } from '@/lib/reports/today-cta';
import type { Database } from '@/types/database.types';

type ReportStatus = Database['public']['Enums']['report_status'];

/** Đúng những gì một dòng cần — khai báo cấu trúc để `lib/` không chạm `services/`. */
export type HistoryRowSource = KpiMetricSource & {
  id: string;
  report_date: string;
  status: ReportStatus;
};

export type HistoryRow = {
  id: string;
  /** `'2026-08-07'` — giữ nguyên để dùng làm `key` và để sort ổn định. */
  reportDate: string;
  /** `'Thứ Sáu, 07/08/2026'`. */
  dateLabel: string;
  href: string;
  statusLabel: string;
  statusTone: ReportStatusTone;
  isCompleted: boolean;
  /**
   * BR-024 — `null` khi báo cáo **chưa** hoàn tất. Cố ý không phải `false`:
   * "chưa kết luận được" khác hẳn "đã kết luận là không đạt", và một badge đỏ
   * "Chưa đạt KPI" trên một báo cáo mới có cam kết sáng là nói sai sự thật.
   */
  kpiAchieved: boolean | null;
  /** Số chỉ tiêu đã đạt (0…4), `null` khi chưa hoàn tất. */
  achievedCount: number | null;
  /** Bốn kết quả thô — để nơi gọi hiện chi tiết mà không tính lại. */
  results: readonly AchievementResult[];
};

/** Tổng số chỉ tiêu của một ngày — BR-024 nói "cả 4". */
const METRIC_COUNT = KPI_METRIC_ROWS.length;

export function toHistoryRow(source: HistoryRowSource): HistoryRow {
  const results = KPI_METRIC_ROWS.map((row) =>
    calculateAchievement(source[row.targetColumn], source[row.actualColumn], row.metric),
  );

  // Chưa hoàn tất thì bốn ô `actual_*` đều `null` ⇒ mọi kết quả là `PENDING`.
  // Dựa vào `status` chứ không dựa vào việc "có kết quả PENDING nào không":
  // `status` là sự thật đã persist (BR-008), còn suy từ dữ liệu là đoán.
  const isCompleted = source.status === 'COMPLETED';

  return {
    id: source.id,
    reportDate: source.report_date,
    dateLabel: formatVietnamDate(source.report_date),
    href: salesReportPath(source.id),
    statusLabel: REPORT_STATUS_LABEL[source.status],
    statusTone: REPORT_STATUS_TONE[source.status],
    isCompleted,
    kpiAchieved: isCompleted ? isKpiAchievedDay(results) : null,
    achievedCount: isCompleted
      ? results.filter((result) => result.status === 'EXCEEDED').length
      : null,
    results,
  };
}

/** `2` → `'2/4 chỉ tiêu'`. `null` (chưa hoàn tất) → `'—'`. */
export function achievedCountLabel(achievedCount: number | null): string {
  if (achievedCount === null) return '—';
  return `${achievedCount}/${METRIC_COUNT} chỉ tiêu`;
}
