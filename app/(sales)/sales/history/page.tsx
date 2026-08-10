import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarSearch } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requireRole } from '@/features/auth/queries';
import { MonthFilter } from '@/features/sales-history/month-filter';
import { PaginationNav } from '@/features/sales-history/pagination-nav';
import { ReportHistoryList } from '@/features/sales-history/report-history-list';
import { formatVietnamMonth, getVietnamCurrentMonth, resolveVietnamMonth } from '@/lib/date';
import { salesHistoryPath } from '@/lib/reports/history-url';
import { parsePageParam } from '@/lib/reports/pagination';
import { MORNING_REPORT_PATH, SALES_TODAY_PATH } from '@/lib/reports/today-cta';
import { createClient } from '@/lib/supabase/server';
import { listReportsByMonth } from '@/services/reports';

export const metadata: Metadata = {
  title: 'Lịch sử báo cáo · BikeForce',
};

/**
 * `/sales/history` — UC-09, FR-021.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BỘ LỌC SỐNG TRÊN URL, PHÂN TRANG CHẠY Ở SERVER
 * ─────────────────────────────────────────────────────────────────────────
 *  `?month=` và `?page=` là **đầu vào không tin được** — người dùng gõ tay
 *  được, và một link cũ có thể mang tháng đã lỗi. Cả hai đi qua hàm thuần đã có
 *  unit test: `getVietnamMonthRange()` trả `null` cho tháng rác (DEC-040),
 *  `parsePageParam()` đưa mọi thứ không dùng được về trang 1. Không có đường
 *  nào ở đây làm trang 500 vì một chuỗi trên URL.
 *
 *  Truy vấn lấy **đúng 20 dòng** của trang đang xem (`listReportsByMonth`), bám
 *  `idx_daily_reports_sales_date_desc`. Không có bước nào kéo cả tháng về rồi
 *  cắt bằng JavaScript (NFR-002).
 *
 *  `sales_id` lấy từ **phiên server**, không bao giờ từ URL (AGENTS.md §8), và
 *  RLS (`reports_select_own_or_admin`) vẫn là chốt chặn thật cho BR-003.
 */

type Props = {
  searchParams: Promise<{ month?: string; page?: string }>;
};

export default async function SalesHistoryPage({ searchParams }: Props) {
  const profile = await requireRole('SALES');
  const params = await searchParams;

  const currentMonth = getVietnamCurrentMonth();
  // Tháng rác trên URL → lùi về tháng hiện tại thay vì báo lỗi (DEC-040).
  const { month, from, to } = resolveVietnamMonth(params.month);
  const page = parsePageParam(params.page);

  const supabase = await createClient();
  const { rows, pageInfo } = await listReportsByMonth(supabase, profile.id, { from, to }, page);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-heading">Lịch sử báo cáo</h1>
        <p className="text-sm text-muted-foreground">
          {pageInfo.total === 0
            ? 'Chưa có báo cáo nào trong tháng này.'
            : `${pageInfo.total} báo cáo trong ${formatVietnamMonth(month).toLowerCase()}.`}
        </p>
      </div>

      <MonthFilter month={month} currentMonth={currentMonth} />

      {rows.length === 0 ? (
        <EmptyState month={month} isCurrentMonth={month === currentMonth} />
      ) : (
        <>
          <ReportHistoryList reports={rows} />
          <PaginationNav
            pageInfo={pageInfo}
            buildHref={(nextPage) => salesHistoryPath({ month, page: nextPage })}
          />
        </>
      )}
    </div>
  );
}

/**
 * Empty state — icon + câu hướng dẫn + **đúng một CTA** (`docs/05 §12` dòng 4).
 *
 * CTA đổi theo ngữ cảnh: đang ở tháng hiện tại thì việc cần làm là **tạo báo
 * cáo hôm nay**; đang ở tháng cũ thì không tạo bù được (BR-021) nên lối ra duy
 * nhất có ý nghĩa là quay về tháng gần nhất.
 */
function EmptyState({ month, isCurrentMonth }: { month: string; isCurrentMonth: boolean }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-8 text-center">
      <CalendarSearch aria-hidden="true" className="size-12 text-muted-foreground" />
      <p className="text-base font-medium text-foreground">
        {formatVietnamMonth(month)} chưa có báo cáo nào
      </p>
      <p className="max-w-xs text-sm text-muted-foreground">
        {isCurrentMonth
          ? 'Báo cáo bạn hoàn tất sẽ xuất hiện ở đây, mới nhất trước.'
          : 'Bạn chưa gửi báo cáo nào trong tháng này. Báo cáo chỉ nhập được đúng trong ngày, không nhập bù được.'}
      </p>

      {isCurrentMonth ? (
        <Link href={MORNING_REPORT_PATH} className={buttonClassName()}>
          Tạo báo cáo đầu ngày
        </Link>
      ) : (
        <Link href={SALES_TODAY_PATH} className={buttonClassName({ variant: 'secondary' })}>
          Về trang Hôm nay
        </Link>
      )}
    </Card>
  );
}
