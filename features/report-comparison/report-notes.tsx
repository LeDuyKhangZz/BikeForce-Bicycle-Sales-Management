import { Card, CardTitle } from '@/components/ui/card';
import type { DailyReport } from '@/services/reports';

/**
 * Phần CHỮ của một báo cáo ngày: tuyến kế hoạch, mục đích chuyến đi, tuyến thực
 * tế và ghi chú cuối ngày — DEC-029 (viếng thăm giữ **cả** cột số lẫn cột text).
 *
 * Tách khỏi `AchievementTable` vì bảng đối chiếu chỉ nói về bốn CON SỐ; ghép
 * chữ vào đó sẽ phá cấu trúc `<table>` ở ≥ 768px.
 *
 * Ba trường dưới là tuỳ chọn ở tầng dữ liệu (`visit_purpose`, `actual_route`,
 * `evening_note`) nên chỉ render khi thực sự có nội dung — một nhãn đứng trên ô
 * trống trông như lỗi tải dữ liệu.
 */

type Props = {
  report: DailyReport;
};

export function ReportNotes({ report }: Props) {
  const rows: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'Tuyến kế hoạch', value: report.planned_route },
    ...(report.visit_purpose
      ? [{ label: 'Mục đích chuyến đi', value: report.visit_purpose }]
      : []),
    ...(report.actual_route ? [{ label: 'Tuyến thực tế', value: report.actual_route }] : []),
    ...(report.evening_note ? [{ label: 'Ghi chú cuối ngày', value: report.evening_note }] : []),
  ];

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="text-base">Tuyến và ghi chú</CardTitle>

      <dl className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            {/* Ghi chú tới 1000 ký tự — xuống dòng, giữ nguyên ngắt dòng người dùng gõ. */}
            <dd className="text-sm whitespace-pre-line break-words text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
