import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { CommitmentSummary } from '@/features/report-morning/commitment-summary';
import { formatVietnamDate, getVietnamToday } from '@/lib/date';
import { SALES_TODAY_PATH } from '@/lib/reports/today-cta';
import { createClient } from '@/lib/supabase/server';
import { getTodayReport } from '@/services/reports';

export const metadata: Metadata = {
  title: 'Báo cáo cuối ngày · BikeForce',
};

/**
 * `/sales/today/evening` — ĐÍCH ĐẾN của CTA chính khi `status = 'MORNING_SUBMITTED'`.
 *
 * ⚠ ĐÂY LÀ TRANG TỐI THIỂU CỦA PHASE 3, KHÔNG PHẢI FR-013/FR-014.
 * Form nhập thực đạt (`EveningReportForm`), chuyển trạng thái sang `COMPLETED`
 * và `evening_submitted_at` là **UC-06 — Phase 4**. Trang này tồn tại để CTA
 * chính của `/sales/today` có đích đến thật thay vì một link 404 — cùng cách
 * Phase 2 đã làm với `/sales/today`.
 *
 * Phần đã làm thật và Phase 4 dùng lại được: guard vai + BR-007 (chưa có báo cáo
 * sáng thì không vào được màn hình cuối ngày) + hiển thị lại cam kết sáng để đối
 * chiếu (FR-013).
 */
export default async function EveningReportPage() {
  const profile = await requireRole('SALES');

  const supabase = await createClient();
  const today = getVietnamToday();
  const report = await getTodayReport(supabase, profile.id, today);

  // BR-007 — không có báo cáo đầu ngày thì không có gì để hoàn tất.
  if (report === null) {
    redirect(SALES_TODAY_PATH);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={SALES_TODAY_PATH}
          className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Về trang Hôm nay
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-heading">Báo cáo cuối ngày</h1>
        <p className="tabular text-sm text-muted-foreground">{formatVietnamDate(today)}</p>
      </div>

      {/* FR-013 — hiển thị lại TOÀN BỘ cam kết sáng để đối chiếu trực tiếp. */}
      <CommitmentSummary report={report} />

      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <Clock aria-hidden="true" className="size-12 text-muted-foreground" />
        <CardTitle className="text-base">Chưa mở nhập thực đạt</CardTitle>
        <p className="max-w-xs text-sm text-muted-foreground">
          Màn hình nhập kết quả cuối ngày sẽ có ở bản cập nhật tiếp theo. Cam kết sáng của bạn đã
          được lưu và vẫn sửa được cho tới khi báo cáo hoàn tất.
        </p>
      </Card>
    </div>
  );
}
