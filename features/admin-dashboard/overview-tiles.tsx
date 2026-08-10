import { Card, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { AchievementBadge, STATUS_TONE } from '@/features/report-comparison/achievement-badge';
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

/**
 * Vạch traffic-light bên trái ô — PHASE 13 (DEC-053).
 *
 * Cố ý dùng token **nền đặc** (`success` / `warning` / `destructive`) chứ không
 * dùng cặp `status-*-bg`: đây là một vạch ĐỒ HOẠ, không có chữ nằm trên nó, nên
 * nó chịu ngưỡng 3:1 của WCAG 1.4.11 chứ không phải 4,5:1. Cả bốn màu đều vượt.
 *
 * Bảng cặp nền×chữ (`TONE_CLASS` cũ) đã bị gỡ cùng lúc — không còn chỗ nào đặt
 * chữ lên nền trạng thái ở màn hình này nữa.
 */
const TONE_ACCENT_CLASS = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  neutral: 'bg-muted-foreground',
} as const;

export function OverviewTiles({ overview }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-heading">Tình hình hôm nay</h2>

        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {overview.headcountTiles.map((tile) => (
            <li key={tile.key}>
              {/*
                PHASE 13 (DEC-053) — ô chỉ số đổi trật tự đọc.

                Bản cũ: nhãn xám nhỏ ở trên, con số ở dưới, và khi có
                traffic-light thì con số bị bọc trong một mảng màu — trông như
                một cái badge bị lạc chỗ chứ không như một chỉ số.

                Bản mới: **con số lên trước và to hẳn** (đó là thứ Admin mở app
                để xem), nhãn xuống dưới, còn traffic-light chuyển thành một
                **vạch màu bên trái ô**. Vạch không tranh chỗ với chữ, không sinh
                thêm cặp nền×chữ nào phải đo lại tương phản, và vẫn đọc được
                trạng thái từ khoảng cách xa hơn hẳn.
              */}
              <Card className="relative flex h-full flex-col gap-0.5 overflow-hidden pl-4">
                {tile.tone !== null && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-y-0 left-0 w-1.5',
                      TONE_ACCENT_CLASS[tile.tone],
                    )}
                  />
                )}
                <p className="tabular text-4xl leading-none font-bold tracking-tight text-heading">
                  {tile.value}
                </p>
                <p className="text-sm font-medium text-foreground">{tile.label}</p>
                {tile.hint !== null && (
                  <p className="mt-0.5 text-xs break-words text-muted-foreground">{tile.hint}</p>
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
            <li
              key={row.metric}
              className="flex flex-col gap-2.5 rounded-md border border-border bg-background/60 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-heading">{row.label}</p>
                <AchievementBadge result={row.result} />
              </div>

              <ProgressBar percent={row.result.percent} tone={STATUS_TONE[row.result.status]} />

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
                  <div className="flex flex-col items-end gap-1.5">
                    <AchievementBadge result={row.result} />
                    <ProgressBar
                      percent={row.result.percent}
                      tone={STATUS_TONE[row.result.status]}
                      className="w-28"
                    />
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
