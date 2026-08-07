import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import {
  MorningReportForm,
  type MorningFormValues,
} from '@/features/report-morning/morning-report-form';
import { formatVietnamDate, getVietnamToday } from '@/lib/date';
import { SALES_TODAY_PATH, canOpenMorningForm } from '@/lib/reports/today-cta';
import { createClient } from '@/lib/supabase/server';
import { getTodayReport, type DailyReport } from '@/services/reports';

export const metadata: Metadata = {
  title: 'Báo cáo đầu ngày · BikeForce',
};

/**
 * `/sales/today/morning` — UC-04 (tạo) và UC-05 (sửa), FR-008…FR-012.
 *
 * RSC **luôn** truy vấn báo cáo hôm nay trước khi render. Đây là lớp chống trùng
 * THỨ NHẤT trong ba lớp của FR-011 (`docs/03 §4.4`):
 *   1. tầng này — đã có báo cáo thì mở ở chế độ SỬA, không phải TẠO;
 *   2. Server Action — kiểm lại trước khi ghi;
 *   3. `UNIQUE(sales_id, report_date)` — chốt chặn thật cho hai tab bấm cùng lúc.
 */
export default async function MorningReportPage() {
  const profile = await requireRole('SALES');

  const supabase = await createClient();
  const today = getVietnamToday();
  const report = await getTodayReport(supabase, profile.id, today);

  // BR-019 — đã COMPLETED thì khoá vĩnh viễn. Chặn ngay ở đây để người dùng
  // không gõ lại cả form rồi mới nhận lỗi lưu.
  if (!canOpenMorningForm(report)) {
    redirect(SALES_TODAY_PATH);
  }

  const mode = report === null ? 'create' : 'edit';

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

        <h1 className="text-2xl font-bold tracking-tight text-heading">
          {mode === 'create' ? 'Báo cáo đầu ngày' : 'Sửa cam kết sáng'}
        </h1>
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

      <MorningReportForm
        mode={mode}
        reportId={report?.id ?? null}
        today={today}
        initialValues={toFormValues(report)}
      />
    </div>
  );
}

/**
 * Row của database → giá trị chuỗi cho ô nhập.
 *
 * Số được đổi sang chuỗi ở ĐÂY chứ không ở component: ô nhập giữ đúng những gì
 * người dùng gõ, còn việc quy về số nguyên là của `morningReportSchema`
 * (BR-010 — không bao giờ có chuỗi đã format đi xuống database).
 */
function toFormValues(report: DailyReport | null): MorningFormValues {
  if (report === null) {
    return {
      planned_route: '',
      visit_purpose: '',
      target_visit_points: '',
      target_sales_quantity: '',
      target_revenue: '',
      target_customer_visits: '',
    };
  }

  return {
    planned_route: report.planned_route,
    visit_purpose: report.visit_purpose ?? '',
    target_visit_points: String(report.target_visit_points),
    target_sales_quantity: String(report.target_sales_quantity),
    target_revenue: String(report.target_revenue),
    target_customer_visits: String(report.target_customer_visits),
  };
}
