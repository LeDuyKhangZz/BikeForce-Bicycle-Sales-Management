import { Card, CardTitle } from '@/components/ui/card';
import { AchievementBadge } from '@/features/report-comparison/achievement-badge';
import type { AdminOverview } from '@/lib/reports/admin-overview';
import { cn } from '@/lib/utils';

/**
 * 12 chỉ số bắt buộc của dashboard Admin — FR-024, UC-12, AF-01,
 * `docs/01 §12.1` (Master Spec §16).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BỐ CỤC EXECUTIVE DASHBOARD, KHÔNG PHẢI 12 Ô BẰNG NHAU
 * ─────────────────────────────────────────────────────────────────────────
 *  `PROJECT_CHECKLIST.md § Phase 8` yêu cầu "4–6 KPI card lớn, traffic-light
 *  status, một màn hình, mobile rút gọn". Mười hai ô cùng cỡ là bảng số, không
 *  phải dashboard — mắt không biết nhìn đâu trước.
 *
 *  Vì vậy chia hai tầng:
 *    • **4 ô đếm người** (chỉ số 1…4) — cỡ lớn, có traffic-light. Đây là câu
 *      hỏi Admin mở app để hỏi: "hôm nay ai đã nộp, ai chưa".
 *    • **4 dòng target vs actual** (chỉ số 5…12, mỗi chỉ tiêu 2 số) — dạng bảng
 *      đối chiếu, dùng lại đúng `AchievementBadge` của Phase 5 nên nhãn và
 *      ngưỡng không thể lệch với màn hình Sales.
 *
 *  2 cột ở 375px thay vì 1: bốn ô đếm đều là số ngắn, xếp 2×2 cho cả bốn nằm
 *  trọn trong màn hình đầu tiên mà không phải cuộn (yêu cầu "một màn hình").
 *
 * Component KHÔNG tính gì — `toAdminOverview()` ở `lib/reports/admin-overview.ts`
 * lo toàn bộ, và có unit test riêng (AGENTS.md §1.3).
 */

type Props = {
  overview: AdminOverview;
};

/** Nền/chữ đã ĐO contrast — cùng bảng token với `components/ui/badge.tsx`. */
const TONE_CLASS = {
  success: 'bg-status-exceeded-bg text-status-exceeded-fg',
  warning: 'bg-status-near-bg text-status-near-fg',
  danger: 'bg-status-missed-bg text-status-missed-fg',
  neutral: 'bg-status-pending-bg text-status-pending-fg',
} as const;

export function OverviewTiles({ overview }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-heading">Tình hình hôm nay</h2>

        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {overview.headcountTiles.map((tile) => (
            <li key={tile.key}>
              <Card className="flex h-full flex-col gap-1">
                <p className="text-sm text-muted-foreground">{tile.label}</p>
                <p
                  className={cn(
                    'tabular text-3xl font-bold text-heading',
                    // Traffic-light: màu chỉ là lớp thứ hai — con số và dòng
                    // `hint` bên dưới mới là thứ mang nghĩa (rule color-not-only).
                    tile.tone !== null && 'w-fit rounded-lg px-2',
                    tile.tone !== null && TONE_CLASS[tile.tone],
                  )}
                >
                  {tile.value}
                </p>
                {tile.hint !== null && (
                  <p className="text-xs break-words text-muted-foreground">{tile.hint}</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Tổng cam kết và thực đạt toàn đội</CardTitle>

        {/* ── < 768px: card xếp dọc (DEC-019 — cấm cuộn ngang) ───────────── */}
        <ul className="flex flex-col gap-3 md:hidden">
          {overview.metricRows.map((row) => (
            <li key={row.metric} className="flex flex-col gap-2 rounded-lg border border-border p-3">
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

        {/* ── ≥ 768px: bảng thật ─────────────────────────────────────────── */}
        <table className="hidden w-full border-collapse text-sm md:table">
          <caption className="sr-only">
            Tổng cam kết đầu ngày và tổng thực đạt của cả đội trong ngày hôm nay, cho bốn chỉ tiêu
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
            {overview.metricRows.map((row) => (
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
    </div>
  );
}
