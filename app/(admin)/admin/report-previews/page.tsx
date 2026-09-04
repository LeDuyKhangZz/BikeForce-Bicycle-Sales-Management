import type { Metadata } from 'next';

import { EmployeePreviewList } from '@/features/admin-report-previews/employee-preview-list';
import { requireRole } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import { listSalesLatestReportPreviewOptions } from '@/services/profiles';
import { getSaleWorkReport } from '@/services/salework';

export const metadata: Metadata = {
  title: 'Xem trước báo cáo nhân viên · BikeForce',
};

type Props = {
  searchParams: Promise<{ daily?: string; salework?: string; variant?: string }>;
};

export default async function AdminReportPreviewsPage({ searchParams }: Props) {
  await requireRole('ADMIN');

  const supabase = await createClient();
  const [sales, saleWorkReports, params] = await Promise.all([
    listSalesLatestReportPreviewOptions(supabase),
    getSaleWorkReport(),
    searchParams,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold tracking-wide text-accent-text uppercase">Báo cáo</p>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Xem trước theo nhân viên</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Xem riêng báo cáo đầu ngày và cuối ngày của Sales; mẫu cuối ngày vẫn xem được khi còn thiếu
          số liệu. Báo cáo SaleWork của telesale được giữ nguyên.
        </p>
      </div>

      <EmployeePreviewList
        sales={sales}
        saleWorkReports={saleWorkReports}
        selectedDailyReportId={params.daily ?? null}
        selectedDailyVariant={params.variant === 'MORNING' ? 'MORNING' : 'EVENING'}
        selectedSaleWorkAccount={params.salework ?? null}
      />
    </div>
  );
}
