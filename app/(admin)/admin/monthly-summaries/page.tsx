import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  PauseCircle,
  UsersRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonClassName } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { LinkPendingIcon } from '@/components/ui/link-pending-icon';
import { PreviewImageViewer } from '@/features/admin-report-previews/preview-image-viewer';
import { requireRole } from '@/features/auth/queries';
import { formatVietnamMonth, resolveVietnamMonth, shiftVietnamMonth } from '@/lib/date';
import { monthlySummaryImagePath } from '@/lib/reports/monthly-summary-card';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { listSalesOptions } from '@/services/profiles';

export const metadata: Metadata = { title: 'Tổng kết tháng · BikeForce' };
const PAGE_PATH = '/admin/monthly-summaries';

type Props = { searchParams: Promise<{ month?: string; sales?: string }> };

export default async function AdminMonthlySummariesPage({ searchParams }: Props) {
  await requireRole('ADMIN');
  const params = await searchParams;
  const { month } = resolveVietnamMonth(params.month);
  const previousMonth = shiftVietnamMonth(month, -1);
  const nextMonth = shiftVietnamMonth(month, 1);
  const supabase = await createClient();
  const salesList = await listSalesOptions(supabase);
  const selectedSales = salesList.find((sales) => sales.id === params.sales) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-heading">
          <CalendarRange aria-hidden="true" className="size-6" />
          Tổng kết tháng
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Tổng hợp tự động dữ liệu của cả tháng từ SaleWork và AMIS, không sử dụng phần Sales tự nhập hằng ngày.
        </p>
      </div>

      <Card className="flex items-center justify-between gap-2 py-2">
        <MonthLink href={previousMonth && `${PAGE_PATH}?month=${previousMonth}`} label="Tháng trước" icon={<ChevronLeft aria-hidden="true" className="size-5" />} />
        <p aria-live="polite" className="tabular text-base font-semibold text-heading">{formatVietnamMonth(month)}</p>
        <MonthLink href={nextMonth && `${PAGE_PATH}?month=${nextMonth}`} label="Tháng sau" icon={<ChevronRight aria-hidden="true" className="size-5" />} />
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Tất cả nhân viên</CardTitle>
        <p className="text-sm text-muted-foreground">Nhân viên đang làm việc được ưu tiên hiển thị trước.</p>
        {salesList.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <UsersRound aria-hidden="true" className="size-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chưa có nhân viên Sales để tổng kết.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border" aria-label="Danh sách nhân viên">
            {salesList.map((sales) => (
              <li key={sales.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold break-words text-heading">{sales.full_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {sales.employee_code && <span className="text-sm text-muted-foreground">{sales.employee_code}</span>}
                    <Badge tone={sales.is_active ? 'success' : 'neutral'} icon={sales.is_active ? <CheckCircle2 aria-hidden="true" className="size-4" /> : <PauseCircle aria-hidden="true" className="size-4" />}>
                      {sales.is_active ? 'Đang làm việc' : 'Đã nghỉ'}
                    </Badge>
                  </div>
                </div>
                <Link href={`${PAGE_PATH}?month=${month}&sales=${sales.id}#monthly-summary-preview`} className={buttonClassName({ variant: 'secondary', className: 'shrink-0' })} aria-label={`Xem trước tổng kết tháng của ${sales.full_name}`}>
                  <Eye aria-hidden="true" className="size-4" />
                  Xem trước
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selectedSales && (
        <section id="monthly-summary-preview" aria-labelledby="monthly-summary-preview-title" className="scroll-mt-24">
          <Card className="flex flex-col gap-3">
            <CardTitle id="monthly-summary-preview-title" className="text-base">Tổng kết {formatVietnamMonth(month).toLocaleLowerCase('vi-VN')} · {selectedSales.full_name}</CardTitle>
            <p className="text-sm text-muted-foreground">SaleWork và AMIS đều được lọc đúng tháng đang chọn; số liệu thiếu hiển thị “-”.</p>
            <PreviewImageViewer src={monthlySummaryImagePath(selectedSales.id, month)} alt={`Tổng kết tháng của ${selectedSales.full_name}`} width={1080} height={1920} />
          </Card>
        </section>
      )}
    </div>
  );
}

function MonthLink({ href, label, icon }: { href: string | null; label: string; icon: React.ReactNode }) {
  const className = cn(buttonClassName({ variant: 'ghost' }), 'min-w-11');
  if (href === null) return <span aria-disabled="true" className={cn(className, 'cursor-not-allowed opacity-45')}>{icon}<span className="sr-only">{label}</span></span>;
  return <Link href={href} className={className}><LinkPendingIcon label={`Đang mở ${label.toLocaleLowerCase('vi-VN')}…`}>{icon}</LinkPendingIcon><span className="sr-only">{label}</span></Link>;
}
