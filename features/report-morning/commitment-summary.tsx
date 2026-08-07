import { Card, CardTitle } from '@/components/ui/card';
import { formatCurrencyVND } from '@/lib/currency';
import type { DailyReport } from '@/services/reports';

type Props = {
  report: DailyReport;
};

/**
 * Bốn chỉ tiêu đã cam kết buổi sáng — CHỈ cột "Cam kết", cố ý một cột.
 *
 * ⚠ Đây KHÔNG phải bảng đối chiếu. Từ Phase 5, bảng đối chiếu hai cột kèm ô
 * "% hoàn thành" là `features/report-comparison/achievement-table.tsx` và nó
 * đang phục vụ `/sales/today`. Component này còn lại đúng một chỗ dùng:
 * `/sales/today/evening` — nơi Sales đang NHẬP thực đạt và cần nhìn lại con số
 * đã cam kết, chứ chưa có gì để đối chiếu. Đừng gộp hai component làm một.
 *
 * Component `features/` được biết nghiệp vụ nên nhận thẳng typed domain data;
 * nó **gọi** `formatCurrencyVND` chứ không tự format (AGENTS.md §9).
 */
export function CommitmentSummary({ report }: Props) {
  const rows: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'Điểm viếng thăm', value: `${report.target_visit_points} điểm` },
    { label: 'Doanh số', value: `${report.target_sales_quantity} xe` },
    { label: 'Doanh thu', value: formatCurrencyVND(report.target_revenue) },
    { label: 'Khách hàng', value: `${report.target_customer_visits} khách` },
  ];

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-base">Cam kết đầu ngày</CardTitle>

      <dl className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            {/* Tiền dài thì XUỐNG DÒNG, không cắt (rule truncation-strategy). */}
            <dd className="tabular text-right text-base font-semibold break-words text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <p className="text-sm text-muted-foreground">Tuyến ghé thăm</p>
        <p className="text-sm break-words text-foreground">{report.planned_route}</p>
      </div>

      {report.visit_purpose && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Mục đích chuyến đi</p>
          <p className="text-sm break-words text-foreground">{report.visit_purpose}</p>
        </div>
      )}
    </Card>
  );
}
