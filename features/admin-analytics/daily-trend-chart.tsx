import { Card, CardTitle } from '@/components/ui/card';
import { formatVietnamDate } from '@/lib/date';
import { calculateAchievement, formatMetricValue, type KpiMetric } from '@/lib/kpi';
import { buildTrendChart, type TrendPoint } from '@/lib/reports/trend-chart';

/**
 * Biểu đồ trend theo ngày trong tháng — FR-037, UC-15, AF-08 (PHASE 9).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO VẼ TAY BẰNG SVG THAY VÌ DÙNG THƯ VIỆN BIỂU ĐỒ
 * ─────────────────────────────────────────────────────────────────────────
 *  `PROJECT_CHECKLIST.md § Phase 9` ràng buộc FR-037 là **SHOULD, chỉ làm nếu
 *  không phát sinh dependency nặng**. Recharts kéo theo toàn bộ D3 (~90 kB
 *  gzip) và **buộc component phải là client component** — tức là đẩy cả dữ liệu
 *  doanh thu của đội qua payload RSC cho một thứ chỉ để nhìn. Một biểu đồ cột
 *  tĩnh là hơn 40 dòng SVG, không cần JavaScript nào chạy trên máy khách, và
 *  render thẳng trong Server Component.
 *
 *  Toàn bộ phép tính toạ độ nằm ở `lib/reports/trend-chart.ts` (DEC-023) và có
 *  16 unit test khoá lại — file này chỉ đổ số vào thuộc tính SVG.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  KHẢ NĂNG TIẾP CẬN — biểu đồ KHÔNG được là nguồn thông tin duy nhất
 * ─────────────────────────────────────────────────────────────────────────
 *  `PROJECT_CHECKLIST.md § Phase 9`: "Mọi bảng/biểu đồ có phương án `data-table`
 *  thay thế". Nên ở đây:
 *    • `<svg role="img">` mang `aria-label` tóm tắt — trình đọc màn hình nghe
 *      được kết luận thay vì 31 hình chữ nhật vô nghĩa;
 *    • ngay dưới là một `<table>` THẬT chứa đúng những con số đã vẽ, đặt trong
 *      `<details>` để không chiếm chỗ trên điện thoại nhưng vẫn nằm trong DOM
 *      và vẫn tìm được bằng Ctrl+F;
 *    • màu cột KHÔNG phải kênh thông tin duy nhất — bảng bên dưới có cột "Hoàn
 *      thành" bằng chữ, đúng quy tắc `docs/05` (trạng thái luôn kèm chữ).
 *
 *  Màu lấy từ semantic token qua `var(--color-*)` chứ không hardcode hex
 *  (AGENTS.md §10). SVG không nhận class Tailwind cho `fill` nên dùng biến CSS —
 *  vẫn là cùng một nguồn màu đã đo contrast ở DEC-014.
 */

type Props = {
  metric: KpiMetric;
  metricLabel: string;
  monthLabel: string;
  points: readonly TrendPoint[];
};

/** Ba mức của BR-023 → màu nền cột thực đạt. Ngưỡng vẫn do `lib/kpi.ts` quyết. */
const STATUS_FILL: Record<string, string> = {
  EXCEEDED: 'var(--color-success)',
  NEAR: 'var(--color-warning)',
  MISSED: 'var(--color-destructive)',
  PENDING: 'var(--color-muted-foreground)',
};

export function DailyTrendChart({ metric, metricLabel, monthLabel, points }: Props) {
  const model = buildTrendChart(points, metric);

  if (model.bars.length === 0) return null;

  const rows = model.bars.map((bar) => ({
    bar,
    result: calculateAchievement(bar.target, bar.actual, metric),
  }));

  const achievedDays = rows.filter((row) => row.result.status === 'EXCEEDED').length;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <CardTitle className="text-base">Diễn biến theo ngày · {metricLabel}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {model.bars.length} ngày có báo cáo hoàn tất, {achievedDays} ngày đạt chỉ tiêu. Cao nhất:{' '}
          <span className="tabular font-semibold text-foreground">
            {formatMetricValue(model.maxValue, metric)}
          </span>
          .
        </p>
      </div>

      {/* ── Chú giải: cột viền là cam kết, cột đặc là thực đạt ─────────────── */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-3 rounded-xs border-2 border-input-border"
          />
          Cam kết
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-3 rounded-xs bg-success" />
          Đạt
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-3 rounded-xs bg-warning" />
          Gần đạt
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-3 rounded-xs bg-destructive" />
          Chưa đạt
        </li>
      </ul>

      {/*
        `preserveAspectRatio="none"` + chiều cao cố định bằng CSS: cột giãn
        ngang theo màn hình còn chiều cao đứng yên. Không có chữ nào bên trong
        SVG nên không có gì bị phóng to (xem chú thích hệ toạ độ ở
        `lib/reports/trend-chart.ts`). `vector-effect` giữ mọi nét vẽ đúng 1px
        thật, nếu không thì phép kéo ngang làm viền dày mỏng không đều.
      */}
      <svg
        role="img"
        aria-label={`Biểu đồ cột ${metricLabel.toLowerCase()} theo ngày trong ${monthLabel}. ${model.bars.length} ngày có báo cáo hoàn tất, ${achievedDays} ngày đạt chỉ tiêu. Số liệu chi tiết có ở bảng ngay bên dưới.`}
        viewBox={`0 0 ${model.width} ${model.height}`}
        preserveAspectRatio="none"
        className="h-40 w-full md:h-52"
      >
        {/* Vạch lưới mảnh, thưa — docs/05 §15. Trang trí nên aria-hidden. */}
        {model.gridLines.map((y) => (
          <line
            key={y}
            aria-hidden="true"
            x1={0}
            x2={model.width}
            y1={y}
            y2={y}
            stroke="var(--color-border)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {rows.map(({ bar, result }) => (
          <g key={bar.date}>
            {/* Khung cam kết: chỉ viền, để cột thực đạt bên trong đọc được. */}
            {bar.height > 0 && (
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill="none"
                stroke="var(--color-input-border)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {bar.actualHeight > 0 && (
              <rect
                x={bar.actualX}
                y={bar.actualY}
                width={bar.actualWidth}
                height={bar.actualHeight}
                fill={STATUS_FILL[result.status] ?? STATUS_FILL.PENDING}
              />
            )}
          </g>
        ))}

        {/* Đường đáy — mốc thị giác cho "giá trị 0". */}
        <line
          aria-hidden="true"
          x1={0}
          x2={model.width}
          y1={model.baselineY}
          y2={model.baselineY}
          stroke="var(--color-input-border)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/*
        Trục X là HTML, không phải `<text>` trong SVG. Mỗi ngày một ô `flex-1`
        khớp đúng một khe cột vì vùng vẽ trải kín bề rộng viewBox
        (`PLOT_LEFT = 0`). Chỉ ô nào `showLabel` mới có chữ; các ô còn lại giữ
        chỗ để nhãn không bị dồn về một phía.
      */}
      <ul aria-hidden="true" className="flex text-xs text-muted-foreground">
        {model.bars.map((bar) => (
          <li key={bar.date} className="tabular min-w-0 flex-1 text-center">
            {bar.showLabel ? bar.dayLabel : ''}
          </li>
        ))}
      </ul>

      {/* ── Phương án data-table bắt buộc ──────────────────────────────────── */}
      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-heading">
          Xem số liệu dạng bảng
        </summary>
        <div className="border-t border-border px-3 pb-3">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              {metricLabel} theo từng ngày trong {monthLabel}: cam kết, thực đạt và mức hoàn thành
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
                  Ngày
                </th>
                <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
                  Cam kết
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
              {rows.map(({ bar, result }) => (
                <tr key={bar.date} className="border-b border-border last:border-b-0">
                  <th scope="row" className="py-2 pr-2 text-left font-medium text-foreground">
                    {formatVietnamDate(bar.date)}
                  </th>
                  <td className="tabular py-2 pl-2 text-right break-words text-foreground">
                    {formatMetricValue(bar.target, metric)}
                  </td>
                  <td className="tabular py-2 pl-2 text-right break-words text-foreground">
                    {formatMetricValue(bar.actual, metric)}
                  </td>
                  <td className="tabular py-2 pl-2 text-right font-semibold text-foreground">
                    {result.display}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}
