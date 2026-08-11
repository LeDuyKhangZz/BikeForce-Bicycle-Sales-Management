import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BackLink } from '@/components/ui/back-link';
import { requireRole } from '@/features/auth/queries';
import { CommitmentSummary } from '@/features/report-morning/commitment-summary';
import {
  EveningReportForm,
  type EveningFormValues,
} from '@/features/report-evening/evening-report-form';
import { formatVietnamDate, getVietnamToday } from '@/lib/date';
import { MORNING_REPORT_PATH, SALES_TODAY_PATH } from '@/lib/reports/today-cta';
import { createClient } from '@/lib/supabase/server';
import { getTodayReport } from '@/services/reports';

export const metadata: Metadata = {
  title: 'Báo cáo cuối ngày · BikeForce',
};

/**
 * `/sales/today/evening` — UC-06, FR-013, FR-014, FR-015.
 *
 * RSC nạp báo cáo hôm nay trước khi render, đúng `docs/03 §5.2`. Hai nhánh
 * chuyển hướng ở đây là lớp chặn THỨ NHẤT, không phải lớp duy nhất:
 *
 *   • **BR-007** — chưa có cam kết sáng thì không có gì để hoàn tất. Đưa thẳng
 *     tới form đầu ngày (`docs/03 §5.2` bước 9) thay vì về `/sales/today`: người
 *     dùng đang muốn báo cáo, đừng bắt họ bấm thêm một lần nữa.
 *   • **BR-019** — đã `COMPLETED` thì khoá vĩnh viễn; vào lại đây chỉ để nhìn
 *     một form không lưu được. Đá về `/sales/today`, nơi trạng thái "Đã hoàn
 *     thành" được hiển thị tử tế.
 *
 * Lớp thứ hai là Server Action (kiểm lại đúng hai điều kiện này trước khi ghi),
 * lớp thứ ba là RLS `reports_update_own_open` + `ck_completed_requires_actuals`.
 */
export default async function EveningReportPage() {
  const profile = await requireRole('SALES');

  const supabase = await createClient();
  const today = getVietnamToday();
  const report = await getTodayReport(supabase, profile.id, today);

  if (report === null) {
    redirect(MORNING_REPORT_PATH);
  }

  if (report.status === 'COMPLETED') {
    redirect(SALES_TODAY_PATH);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href={SALES_TODAY_PATH}>Về trang Hôm nay</BackLink>

        <h1 className="text-2xl font-bold tracking-tight text-heading">Báo cáo cuối ngày</h1>
        <p className="tabular text-sm text-muted-foreground">{formatVietnamDate(today)}</p>
      </div>

      {/* FR-013 — hiển thị lại TOÀN BỘ cam kết sáng để đối chiếu trực tiếp. */}
      <CommitmentSummary report={report} />

      <EveningReportForm
        reportId={report.id}
        today={today}
        commitment={{
          target_visit_points: report.target_visit_points,
          target_sales_amount: report.target_sales_amount,
          target_revenue: report.target_revenue,
          target_customer_visits: report.target_customer_visits,
        }}
        initialValues={EMPTY_FORM_VALUES}
      />
    </div>
  );
}

/**
 * Form cuối ngày luôn bắt đầu RỖNG.
 *
 * Khác form đầu ngày ở chỗ không có chế độ "sửa": BR-019 khoá báo cáo ngay khi
 * `COMPLETED`, nên bốn cột `actual_*` chỉ được ghi đúng một lần và không bao giờ
 * có sẵn giá trị để prefill. Điền sẵn bằng con số cam kết sáng cũng bị loại —
 * đó là mời người dùng bấm Lưu mà không đọc, và số liệu thực đạt sẽ thành bản
 * sao của mục tiêu.
 */
const EMPTY_FORM_VALUES: EveningFormValues = {
  actual_visit_points: '',
  actual_sales_amount: '',
  actual_revenue: '',
  actual_customer_visits: '',
  actual_route: '',
  evening_note: '',
};
