import Link from 'next/link';
import { Clock, Eye, FileQuestion } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonClassName } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { LinkSpinner } from '@/components/ui/link-spinner';
import { formatVietnamDate } from '@/lib/date';
import { REPORT_STATUS_LABEL, REPORT_STATUS_TONE } from '@/lib/reports/report-status';
import type { SalesDailyPreviewOption } from '@/services/profiles';

type Props = {
  employees: readonly SalesDailyPreviewOption[];
  title: string;
  description: string;
  emptyText: string;
  sectionId: string;
};

export function SalesPreviewSection({ employees, title, description, emptyText, sectionId }: Props) {
  return (
    <section aria-labelledby={sectionId}>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={sectionId} className="text-base">{title}</CardTitle>
          <span className="text-sm text-muted-foreground">{description}</span>
        </div>

        {employees.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileQuestion aria-hidden="true" className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border" aria-label={title}>
            {employees.map((employee) => {
              const report = employee.daily_reports[0];

              return (
                <li key={employee.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold break-words text-heading">{employee.full_name}</p>
                      {!employee.is_active && <Badge tone="neutral">Đã nghỉ</Badge>}
                    </div>
                    <p className="tabular text-sm text-muted-foreground">
                      {employee.employee_code ?? 'Chưa có mã nhân viên'}
                    </p>
                    {report ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={REPORT_STATUS_TONE[report.status]}>
                          {REPORT_STATUS_LABEL[report.status]}
                        </Badge>
                        <span className="tabular text-sm text-muted-foreground">
                          {formatVietnamDate(report.report_date)}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">Chưa từng có báo cáo</p>
                    )}
                  </div>

                  {report ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <PreviewLink reportId={report.id} employeeName={employee.full_name} variant="MORNING" />
                      <PreviewLink reportId={report.id} employeeName={employee.full_name} variant="EVENING" />
                    </div>
                  ) : (
                    <span aria-disabled="true" className={buttonClassName({ variant: 'secondary', className: 'shrink-0 cursor-not-allowed opacity-45' })}>
                      <Clock aria-hidden="true" className="size-4" />
                      Chưa có dữ liệu
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}

function PreviewLink({ reportId, employeeName, variant }: { reportId: string; employeeName: string; variant: 'MORNING' | 'EVENING' }) {
  const isMorning = variant === 'MORNING';
  const label = isMorning ? 'Đầu ngày' : 'Cuối ngày';

  return (
    <Link
      href={`/admin/report-previews?daily=${reportId}&variant=${variant}#report-preview`}
      className={buttonClassName({ variant: 'secondary', className: 'shrink-0' })}
      aria-label={`Xem trước báo cáo ${label.toLocaleLowerCase('vi-VN')} của ${employeeName}`}
    >
      <Eye aria-hidden="true" className="size-4" />
      {label}
      <LinkSpinner label={`Đang mở preview ${label.toLocaleLowerCase('vi-VN')}…`} />
    </Link>
  );
}
