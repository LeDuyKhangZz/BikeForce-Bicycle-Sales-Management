import { BarChart3, CheckCircle2, CircleUserRound, DatabaseZap, ShoppingBag } from 'lucide-react';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import type { EcommerceReportViewModel } from '@/features/admin-ecommerce/queries';

type Props = {
  report: EcommerceReportViewModel | null;
};

export function EcommerceReportShell({ report }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold tracking-wide text-accent-text uppercase">Pancake</p>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Sàn TMĐT</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Khung báo cáo dành cho nhân viên phụ trách kênh thương mại điện tử.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-status-info-bg text-status-info-fg">
              <CircleUserRound aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <CardTitle>{report?.employeeName ?? 'Nguyễn Ngọc Triết'}</CardTitle>
              <p className="text-sm text-muted-foreground">Nhân viên Sàn TMĐT</p>
            </div>
          </div>
          <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold ${report === null ? 'bg-status-warning-bg text-status-warning-fg' : 'bg-status-success-bg text-status-success-fg'}`}>
            {report === null ? <DatabaseZap aria-hidden="true" className="size-4" /> : <CheckCircle2 aria-hidden="true" className="size-4" />}
            {report === null ? 'Chờ dữ liệu Pancake' : 'Đã đồng bộ Pancake'}
          </span>
        </CardHeader>
      </Card>

      <section aria-labelledby="ecommerce-overview-title" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 aria-hidden="true" className="size-5 text-primary" />
          <h2 id="ecommerce-overview-title" className="text-lg font-semibold text-heading">
            Tổng quan báo cáo
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(report?.metrics ?? []).map((metric) => (
            <Card key={metric.label} className="flex min-h-28 flex-col justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
              <p className="text-2xl font-bold tabular-nums text-heading">
                {metric.display}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {report === null ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-status-info-bg text-status-info-fg">
            <ShoppingBag aria-hidden="true" className="size-6" />
          </span>
          <CardTitle>Chưa có dữ liệu từ Pancake</CardTitle>
          <p className="max-w-lg text-sm text-muted-foreground">
            Hãy chạy workflow Pancake sau khi migration đã được áp dụng vào Supabase.
          </p>
        </Card>
      ) : (
        <section aria-labelledby="ecommerce-source-title" className="flex flex-col gap-3">
          <div>
            <h2 id="ecommerce-source-title" className="text-lg font-semibold text-heading">Theo nguồn đơn</h2>
            <p className="text-sm text-muted-foreground">Ngày {report.reportDate} · đồng bộ {report.syncedAt}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {report.sources.map((source) => (
              <Card key={source.name} className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>{source.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{source.orderCount} đơn không hủy</p>
                </div>
                <p className="text-lg font-bold tabular-nums text-heading">{source.revenueDisplay}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
