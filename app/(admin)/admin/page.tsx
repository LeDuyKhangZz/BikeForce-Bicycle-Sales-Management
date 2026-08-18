import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ChevronRight, Target } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
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
        Lối vào "Chỉ tiêu tháng" (DEC-071). Đặt ở ĐÂY, trên `Suspense`, vì hai lý do:

        1. Nó KHÔNG phụ thuộc dữ liệu nên hiện ngay lập tức, không nằm sau skeleton.
        2. `/admin/targets` không có tab riêng ở bottom nav — nav Admin đã chạm trần
           5 mục của DEC-018. Người dùng mở màn Tổng quan mà không thấy module KPI
           đâu là chuyện đã xảy ra thật ngày 2026-08-18; cửa vào trên `/admin/sales`
           một mình là chưa đủ để tìm ra.
      */}
      <MonthlyTargetsShortcut month={today.slice(0, 7)} />

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

/**
 * Thẻ dẫn sang `/admin/targets` — DEC-071.
 *
 * Cả thẻ là một `<Link>` chứ không phải một nút nhỏ trong góc: đây là màn hình
 * đầu tiên Admin thấy sau khi đăng nhập, và giao chỉ tiêu là việc đầu tháng.
 * Vùng chạm vì vậy rộng bằng cả thẻ, thừa xa sàn 44px.
 */
function MonthlyTargetsShortcut({ month }: { month: string }) {
  return (
    <Link
      href={`/admin/targets?month=${month}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:bg-background"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-status-info-bg text-status-info-fg">
        <Target aria-hidden="true" className="size-5" />
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-base font-semibold text-heading">Chỉ tiêu tháng</span>
        <span className="text-sm text-muted-foreground">
          Giao chỉ tiêu doanh số và doanh thu cho từng nhân viên
        </span>
      </span>

      <LinkPendingIcon label="Đang mở chỉ tiêu tháng…" className="ml-auto size-5 shrink-0">
        <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
      </LinkPendingIcon>
    </Link>
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
