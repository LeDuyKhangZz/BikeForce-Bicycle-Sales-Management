import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MissingReportAlerts } from '@/features/admin-dashboard/missing-report-alerts';
import { OverviewTiles } from '@/features/admin-dashboard/overview-tiles';
import { requireRole } from '@/features/auth/queries';
import { formatVietnamDate, getVietnamToday } from '@/lib/date';
import { toAdminOverview } from '@/lib/reports/admin-overview';
import { createClient } from '@/lib/supabase/server';
import { getAdminTodayOverview, getMissingReportAlerts } from '@/services/admin';

export const metadata: Metadata = {
  title: 'Tổng quan · BikeForce',
};

/**
 * `/admin` — UC-12, FR-024, AF-01. ĐÍCH ĐẾN sau khi Admin đăng nhập.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  MỌI CON SỐ ĐẾM/CỘNG Ở SERVER, TRONG SQL
 * ─────────────────────────────────────────────────────────────────────────
 *  12 chỉ số đến từ **một** lời gọi RPC `admin_today_overview` (migration
 *  0006), không phải từ việc kéo báo cáo của cả đội về rồi cộng bằng JavaScript
 *  — đó là thứ NFR-002 và AGENTS.md §5 cấm. Cảnh báo FR-033 là lời gọi thứ hai,
 *  cũng anti-join ngay trong SQL.
 *
 *  Hai lời gọi chạy **song song** (`Promise.all`): chúng độc lập, và nối tiếp
 *  thì thời gian chờ cộng dồn vô ích.
 *
 *  Ngày nghiệp vụ do `getVietnamToday()` quyết định rồi truyền xuống — hàm SQL
 *  cố ý KHÔNG tự gọi `vn_today()` (docs/07 QUY TẮC 3: chỉ một nơi biết "hôm nay").
 *
 *  Quyền: `requireRole('ADMIN')` là lớp 2, guard `is_admin()` bên trong hàm SQL
 *  là lớp 3, và RLS vẫn đứng dưới cùng vì hàm là `security invoker` (DEC-004).
 */
export default async function AdminDashboardPage() {
  await requireRole('ADMIN');

  const today = getVietnamToday();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-heading">Tổng quan</h1>
        {/* BR-005 — ngày nghiệp vụ theo Asia/Ho_Chi_Minh, do server tính. */}
        <p className="tabular text-sm text-muted-foreground">{formatVietnamDate(today)}</p>
      </div>

      {/*
        Streaming: khối số liệu hiện ngay khi truy vấn xong, không chờ nhau.
        Skeleton bắt buộc cho khối tải > 300ms (rule progressive-loading).
      */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent today={today} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ today }: { today: string }) {
  const supabase = await createClient();

  const [overviewSource, alerts] = await Promise.all([
    getAdminTodayOverview(supabase, today),
    getMissingReportAlerts(supabase, today),
  ]);

  const overview = toAdminOverview(overviewSource);

  // Chưa có Sales nào trong hệ thống là trạng thái RỖNG thật sự — khác hẳn
  // "có Sales nhưng chưa ai báo cáo". Hiện 12 số 0 ở đây chỉ gây hoang mang.
  if (overviewSource.active_sales_count === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-base font-medium text-foreground">Chưa có Sales nào đang hoạt động</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Hãy tạo tài khoản Sales trước. Khi có người báo cáo, số liệu toàn đội sẽ hiện ở đây.
        </p>
      </Card>
    );
  }

  return (
    <>
      <OverviewTiles overview={overview} />
      <MissingReportAlerts alerts={alerts} />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
