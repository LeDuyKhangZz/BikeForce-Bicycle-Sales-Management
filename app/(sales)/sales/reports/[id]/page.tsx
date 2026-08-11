import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock } from 'lucide-react';

import { BackLink } from '@/components/ui/back-link';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { AchievementTable } from '@/features/report-comparison/achievement-table';
import { ReportNotes } from '@/features/report-comparison/report-notes';
import { ShareImageButton } from '@/features/report-share/share-image-button';
import { formatVietnamDate } from '@/lib/date';
import { salesHistoryPath } from '@/lib/reports/history-url';
import { REPORT_STATUS_LABEL, REPORT_STATUS_TONE } from '@/lib/reports/report-status';
import { shareCardVariantForStatus, shareImageFileName } from '@/lib/reports/share-card';
import { createClient } from '@/lib/supabase/server';
import { getReportById } from '@/services/reports';

export const metadata: Metadata = {
  title: 'Chi tiết báo cáo · BikeForce',
};

/**
 * `/sales/reports/[id]` — UC-10, FR-022. Mở từ `/sales/history` (FR-021) và từ
 * CTA "Xem báo cáo hôm nay" của `/sales/today` (FR-007).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  QUYỀN ĐỌC LÀ VIỆC CỦA RLS, KHÔNG PHẢI CỦA TRANG NÀY
 * ─────────────────────────────────────────────────────────────────────────
 *  `getReportById()` cố ý **không nhận `salesId`**. Policy
 *  `reports_select_own_or_admin` cho Sales thấy đúng báo cáo của mình (BR-003)
 *  và cho Admin thấy tất cả (BR-022) — trang chỉ việc `notFound()` khi service
 *  trả `null` (AGENTS.md §8).
 *
 *  **404 cho "không tồn tại" và cho "không có quyền" là CỐ Ý giống hệt nhau.**
 *  Phân biệt hai ca sẽ biến trang này thành kênh dò ID: gõ thử một `id` và đọc
 *  mã lỗi là biết báo cáo đó có tồn tại hay không (`docs/05 §12` dòng 9).
 *
 * Ba khối nội dung đều **dùng lại nguyên** component đã có từ Phase 5 và Phase
 * 6 — `AchievementTable`, `ReportNotes`, `ShareImageButton`. Không viết lại,
 * nhờ vậy màn hình này và `/sales/today` không thể ra hai con số khác nhau.
 */

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SalesReportDetailPage({ params }: Props) {
  const profile = await requireRole('SALES');
  const { id } = await params;

  const supabase = await createClient();
  const report = await getReportById(supabase, id);

  if (report === null) notFound();

  const isCompleted = report.status === 'COMPLETED';

  // BR-002 / FR-017 — biến thể ảnh suy ra từ `status` ĐÃ PERSIST, không bao giờ
  // từ trạng thái form. PHASE 14 (DEC-058): một báo cáo mới có cam kết sáng nay
  // cũng xuất được ảnh — bản "CAM KẾT ĐẦU NGÀY".
  const shareVariant = shareCardVariantForStatus(report.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {/*
          `href` tường minh chứ không `router.back()`: mở trang này từ một link
          Zalo là vào thẳng, lịch sử trình duyệt trống nên "quay lại" sẽ rơi ra
          ngoài ứng dụng (rule `back-stack-integrity`).
        */}
        <BackLink href={salesHistoryPath()}>Về lịch sử báo cáo</BackLink>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="tabular text-2xl font-bold tracking-tight text-heading">
            {formatVietnamDate(report.report_date)}
          </h1>
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

      {/* PHASE 13 — cùng thứ tự với `/sales/today`: tuyến trước, bảng số sau.
          Hai màn hình trình bày CÙNG một báo cáo nên không được lệch bố cục. */}
      <ReportNotes report={report} />
      <AchievementTable report={report} />

      <ShareImageButton
        reportId={report.id}
        variant={shareVariant}
        fileName={shareImageFileName(profile.full_name, report.report_date, shareVariant)}
      />

      {!isCompleted && (
        // BR-019 — báo cáo mới có cam kết sáng thì không sửa được từ đây, và ảnh
        // xuất ra là bản CAM KẾT chứ không phải bản kết quả. Nói rõ thay vì để
        // người dùng tự đoán vì sao tấm ảnh thiếu cột "Thực đạt".
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-base">Chưa hoàn tất</CardTitle>
          <p className="text-sm text-muted-foreground">
            Báo cáo này mới có cam kết đầu ngày, nên ảnh xuất ra là bản cam kết. Sau khi hoàn tất
            cuối ngày, ảnh sẽ có thêm cột thực đạt và tỉ lệ hoàn thành.
          </p>
        </Card>
      )}
    </div>
  );
}
