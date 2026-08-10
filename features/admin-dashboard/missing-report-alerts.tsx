import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import type { MissingReportAlert } from '@/services/admin';

/**
 * Cảnh báo Sales chưa báo cáo — FR-033, UC-20, AF-02.
 *
 * Hai nhóm, và thứ tự **không** đổi chỗ được:
 *   1. **Chưa báo cáo gì** — chưa có dòng nào hôm nay. Nhóm cần nhắc gấp nhất.
 *   2. **Chưa hoàn tất cuối ngày** — đã cam kết sáng nhưng chưa nhập thực đạt.
 *
 * SQL đã sắp sẵn theo thứ tự đó (`admin_missing_report_alerts`), component chỉ
 * tách ra hai khối để mỗi khối có tiêu đề riêng — Admin đọc lướt là biết cần
 * gọi điện cho ai trước.
 *
 * ⚠ Cảnh báo KHÔNG phân biệt người nghỉ phép: v1 không có khái niệm ngày nghỉ
 * (OQ-08 đã trả lời "không" — DEC-030, ISSUE-006 CLOSED). Nói thẳng điều đó
 * trong giao diện để Admin không hiểu nhầm con số.
 */

type Props = {
  alerts: readonly MissingReportAlert[];
};

const ALERT_KINDS = {
  NO_REPORT: 'NO_REPORT',
  NOT_COMPLETED: 'NOT_COMPLETED',
} as const;

export function MissingReportAlerts({ alerts }: Props) {
  const noReport = alerts.filter((alert) => alert.alert_kind === ALERT_KINDS.NO_REPORT);
  const notCompleted = alerts.filter((alert) => alert.alert_kind === ALERT_KINDS.NOT_COMPLETED);

  if (alerts.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2 aria-hidden="true" className="size-10 text-status-exceeded-fg" />
        <p className="text-base font-medium text-foreground">Cả đội đã hoàn tất báo cáo hôm nay</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Không còn ai cần nhắc. Danh sách này tự cập nhật theo ngày nghiệp vụ giờ Việt Nam.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle className="text-base">Cần nhắc hôm nay</CardTitle>
        <Badge tone="warning" icon={<AlertTriangle aria-hidden="true" className="size-4" />}>
          {alerts.length} người
        </Badge>
      </div>

      <AlertGroup
        title="Chưa báo cáo gì"
        description="Chưa gửi cam kết đầu ngày."
        tone="danger"
        icon={<AlertTriangle aria-hidden="true" className="size-4" />}
        people={noReport}
      />

      <AlertGroup
        title="Chưa hoàn tất cuối ngày"
        description="Đã cam kết sáng nhưng chưa nhập thực đạt."
        tone="warning"
        icon={<Clock aria-hidden="true" className="size-4" />}
        people={notCompleted}
      />

      <p className="text-xs text-muted-foreground">
        Danh sách chưa loại trừ người nghỉ phép — bản v1 không quản lý ngày nghỉ.
      </p>
    </Card>
  );
}

type AlertGroupProps = {
  title: string;
  description: string;
  tone: 'danger' | 'warning';
  icon: React.ReactNode;
  people: readonly MissingReportAlert[];
};

/** Không export — chỉ dùng nội bộ file này (AGENTS.md §4). */
function AlertGroup({ title, description, tone, icon, people }: AlertGroupProps) {
  // Nhóm rỗng thì ẩn hẳn: một tiêu đề đứng trên khoảng trống trông như lỗi tải.
  if (people.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone} icon={icon}>
          {title}
        </Badge>
        <span className="tabular text-sm font-medium text-foreground">{people.length}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>

      <ul className="flex flex-col gap-2">
        {people.map((person) => (
          <li
            key={person.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
          >
            <span className="text-sm font-medium break-words text-foreground">
              {person.full_name}
            </span>
            {person.employee_code !== null && (
              <span className="tabular text-xs text-muted-foreground">
                {person.employee_code}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
