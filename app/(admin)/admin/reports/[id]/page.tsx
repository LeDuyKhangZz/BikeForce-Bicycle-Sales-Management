import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock } from 'lucide-react';

import { BackLink } from '@/components/ui/back-link';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { AchievementTable } from '@/features/report-comparison/achievement-table';
import { ReportNotes } from '@/features/report-comparison/report-notes';
import { formatVietnamDate } from '@/lib/date';
import { ADMIN_REPORTS_PATH } from '@/lib/reports/admin-filters';
import { REPORT_STATUS_LABEL, REPORT_STATUS_TONE } from '@/lib/reports/report-status';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/services/profiles';
import { getReportById } from '@/services/reports';

export const metadata: Metadata = {
  title: 'Chi tiết báo cáo · BikeForce',
};

/**
 * `/admin/reports/[id]` — UC-14, FR-027, AF-04.
 *
 * Dùng lại **nguyên** `getReportById()` của Phase 7 và hai component đối chiếu
 * của Phase 5. Hàm service cố ý không nhận `salesId`, nên chính nó phục vụ được
 * cả Sales (BR-003 — chỉ báo cáo của mình) lẫn Admin (BR-022 — mọi báo cáo);
 * khác biệt duy nhất nằm ở policy `reports_select_own_or_admin`, không nằm
 * trong code.
 *
 * ⚠ **Admin KHÔNG có nút Xuất ảnh ở đây.** Ảnh 9:16 là sản phẩm Sales gửi Zalo
 * dưới tên của chính họ (FR-017…FR-020, UC-08) — route ảnh vẫn cho Admin gọi
 * (BR-022) nhưng đặt nút ở màn hình này sẽ mời Admin phát ảnh mang tên người
 * khác. Đó là quyết định về sản phẩm, không phải giới hạn kỹ thuật.
 *
 * ⚠ **Admin KHÔNG sửa được gì.** BR-020 + DEC-026: không có UPDATE policy nào
 * cho Admin trên `daily_reports`, nên trang này chỉ đọc — và nói rõ điều đó
 * thay vì để người dùng đi tìm nút Sửa.
 */

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminReportDetailPage({ params }: Props) {
  await requireRole('ADMIN');
  const { id } = await params;

  const supabase = await createClient();
  const report = await getReportById(supabase, id);

  // 404 cho cả "không tồn tại" lẫn "không đọc được" — chống dò ID
  // (`docs/05 §12` dòng 9).
  if (report === null) notFound();

  // Tên Sales sở hữu báo cáo. Truy vấn riêng thay vì nhúng vào `getReportById`:
  // màn hình của Sales (Phase 7) không cần cột này, và giữ tập cột của hàm dùng
  // chung hẹp nhất có thể là đúng NFR-002.
  const owner = await getSessionProfile(supabase, report.sales_id);
  const isCompleted = report.status === 'COMPLETED';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <BackLink href={ADMIN_REPORTS_PATH}>Về danh sách báo cáo</BackLink>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight break-words text-heading">
              {owner?.full_name ?? 'Nhân viên'}
            </h1>
            <p className="tabular text-sm text-muted-foreground">
              {formatVietnamDate(report.report_date)}
              {owner?.employee_code !== null && owner?.employee_code !== undefined && (
                <span> · {owner.employee_code}</span>
              )}
            </p>
          </div>

          <Badge
            tone={REPORT_STATUS_TONE[report.status]}
            icon={
              isCompleted ? (
                <CheckCircle2 aria-hidden="true" className="size-4" />
              ) : (
                <Clock aria-hidden="true" className="size-4" />
              )
            }
          >
            {REPORT_STATUS_LABEL[report.status]}
          </Badge>
        </div>
      </div>

      <AchievementTable report={report} />
      <ReportNotes report={report} />

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-base">Chỉ xem</CardTitle>
        <p className="text-sm text-muted-foreground">
          Báo cáo do Sales tự nhập và không ai được sửa sau khi hoàn tất — kể cả Quản trị viên. Nếu
          số liệu sai, hãy trao đổi trực tiếp với nhân viên.
        </p>
      </Card>
    </div>
  );
}
