import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { MorningReportForm } from '@/features/report-morning/morning-report-form';
import { formatVietnamDate, getVietnamToday } from '@/lib/date';
import { SALES_TODAY_PATH, canOpenMorningForm } from '@/lib/reports/today-cta';
import { createClient } from '@/lib/supabase/server';
import { getTodayReport } from '@/services/reports';

export const metadata: Metadata = {
  title: 'Báo cáo đầu ngày · BikeForce',
};

/**
 * `/sales/today/morning` — UC-04, FR-008…FR-011.
 *
 * ⚠ **PHASE 14 — DEC-055.** Route này từng gánh CẢ UC-05 (sửa cam kết sáng) bằng
 * một chế độ `edit`. Chế độ đó đã bị gỡ: hôm nay đã có báo cáo thì đây là màn
 * hình CHỈ ĐỌC-KHÔNG-VÀO-ĐƯỢC, người dùng bị đưa thẳng về `/sales/today`. Cam kết
 * sáng khoá ngay khi gửi.
 *
 * RSC **luôn** truy vấn báo cáo hôm nay trước khi render. Đây là lớp chống trùng
 * THỨ NHẤT trong ba lớp của FR-011 (`docs/03 §4.2`):
 *   1. tầng này — đã có báo cáo thì không mở form nữa;
 *   2. Server Action — kiểm lại trước khi ghi;
 *   3. `UNIQUE(sales_id, report_date)` — chốt chặn thật cho hai tab bấm cùng lúc.
 */
export default async function MorningReportPage() {
  const profile = await requireRole('SALES');

  const supabase = await createClient();
  const today = getVietnamToday();
  const report = await getTodayReport(supabase, profile.id, today);

  // DEC-055 (đã gửi cam kết sáng) và BR-019 (đã COMPLETED) — cả hai đều dừng ở
  // đây, để người dùng không gõ lại cả form rồi mới nhận lỗi lưu.
  if (!canOpenMorningForm(report)) {
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

        <h1 className="text-2xl font-bold tracking-tight text-heading">Báo cáo đầu ngày</h1>
      </div>

      {/*
        FR-009 + FR-010 — họ tên và ngày báo cáo là THÔNG TIN CHỈ ĐỌC, không phải
        ô nhập bị disable (rule read-only-distinction). Ngày do server tính bằng
        `getVietnamToday()`; đồng hồ máy client không tham gia (BR-005).
      */}
      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Thông tin cố định</CardTitle>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Nhân viên</dt>
            <dd className="text-right font-medium text-foreground">{profile.full_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Ngày báo cáo</dt>
            <dd className="tabular text-right font-medium text-foreground">
              {formatVietnamDate(today)}
            </dd>
          </div>
        </dl>
      </Card>

      {/*
        Form LUÔN mở rỗng. Từ DEC-055 không còn nhánh prefill nào: tới được dòng
        này nghĩa là `report === null`, đã được `canOpenMorningForm()` bảo đảm ở
        trên. Hàm `toFormValues()` cũ đã bị xoá cùng chế độ `edit`.
      */}
      <MorningReportForm today={today} />
    </div>
  );
}
