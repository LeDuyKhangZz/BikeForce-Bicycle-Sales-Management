import { Card, CardTitle } from '@/components/ui/card';
import { calculateAchievement, formatMetricValue } from '@/lib/kpi';
import { KPI_METRIC_ROWS } from '@/lib/reports/metric-rows';
import type { DailyReport } from '@/services/reports';

import { AchievementBadge } from './achievement-badge';

/**
 * Bảng đối chiếu **Cam kết sáng ↔ Thực đạt ↔ Hoàn thành** cho cả 4 chỉ tiêu —
 * FR-016, `docs/05 §7`, DEC-019.
 *
 * Hai chế độ hiển thị, **cấm cuộn ngang** ở cả hai (DEC-019):
 *   • < 768px  → 4 card xếp dọc (`docs/05 §7.1`).
 *   • ≥ 768px  → `<table>` THẬT có `<caption>`, cột số căn phải, `tabular-nums`
 *                (`docs/05 §7.2`). Không phải một lưới `div` giả dạng bảng —
 *                screen reader cần quan hệ hàng/cột thật.
 *
 * Component này KHÔNG tính gì và KHÔNG format gì: mọi con số đi qua
 * `calculateAchievement()` / `formatMetricValue()` của `lib/kpi.ts` (NFR-012,
 * AGENTS.md §9). Ba tình huống của `docs/05 §7.3` đều do `lib/kpi` quyết định:
 * chưa có số liệu → `'—'` + "Chờ số liệu"; vượt xa → `'1.250,0%'` không cắt về
 * 100% (BR-004); `target = 0 && actual > 0` → `'+3 xe'` + "Vượt kế hoạch"
 * (BR-015).
 */

type Props = {
  report: DailyReport;
};

export function AchievementTable({ report }: Props) {
  // Danh sách bốn chỉ tiêu nằm ở `lib/reports/metric-rows.ts` — bảng này và thẻ
  // ảnh 9:16 (Phase 6) đọc CÙNG một định nghĩa, nên không thể lệch nhau
  // (`docs/07 §5`).
  const rows = KPI_METRIC_ROWS.map((row) => {
    const target = report[row.targetColumn];
    const actual = report[row.actualColumn];

    return {
      label: row.label,
      targetText: formatMetricValue(target, row.metric),
      actualText: formatMetricValue(actual, row.metric),
      result: calculateAchievement(target, actual, row.metric),
    };
  });

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-base">Cam kết và thực đạt</CardTitle>

      {/* ── < 768px: 4 card xếp dọc ─────────────────────────────────────── */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.label} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-base font-semibold text-heading">{row.label}</p>

            <dl className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">Cam kết</dt>
                {/* Tiền dài thì XUỐNG DÒNG, không cắt (rule truncation-strategy). */}
                <dd className="tabular text-base font-semibold break-words text-foreground">
                  {row.targetText}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">Thực đạt</dt>
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

      {/* ── ≥ 768px: bảng thật ──────────────────────────────────────────── */}
      <table className="hidden w-full border-collapse text-sm md:table">
        <caption className="sr-only">
          Đối chiếu cam kết đầu ngày với thực đạt cuối ngày cho bốn chỉ tiêu
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
              Chỉ tiêu
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Cam kết sáng
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Thực đạt
            </th>
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Hoàn thành
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border last:border-b-0">
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
  );
}
