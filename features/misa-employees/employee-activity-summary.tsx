import { Activity, Link2, TrendingUp } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { MisaEmployeeActivity } from '@/features/misa-employees/queries';

type Props = { activity: MisaEmployeeActivity };

export function EmployeeActivitySummary({ activity }: Props) {
  return (
    <section aria-labelledby="employee-activity-title" className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
      <Card className="rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="employee-activity-title" className="flex items-center gap-2 text-lg font-bold text-heading">
              <Activity aria-hidden="true" className="size-5 text-primary" /> Hoạt động online
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">SaleWork · {activity.saleWorkPeriodLabel}</p>
          </div>
          {activity.linkedSalesName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-info-bg px-3 py-1 text-xs font-semibold text-status-info-fg">
              <Link2 aria-hidden="true" className="size-3.5" /> {activity.linkedSalesName}
            </span>
          )}
        </div>
        {activity.saleWorkMetrics === null ? (
          <p className="mt-5 text-sm text-muted-foreground">Chưa có dữ liệu SaleWork được ánh xạ cho nhân viên này.</p>
        ) : (
          <dl className="mt-4 divide-y divide-border">
            {activity.saleWorkMetrics.map((metric) => (
              <div key={metric.label} className="flex min-h-11 items-center justify-between gap-4 py-2 text-sm">
                <dt className="text-muted-foreground">{metric.label}</dt>
                <dd className="font-semibold tabular-nums text-heading">{metric.valueText}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card className="min-w-0 rounded-2xl">
        <h2 className="flex items-center gap-2 text-lg font-bold text-heading">
          <TrendingUp aria-hidden="true" className="size-5 text-primary" /> Tình trạng thực hiện
        </h2>
        {activity.performance === null ? (
          <p className="mt-5 text-sm text-muted-foreground">Chưa có dữ liệu MISA của nhân viên trong tháng này.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">{activity.performance.rangeText}</p>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {activity.performance.rows.map((row) => (
                <div key={row.label} className="rounded-xl border border-border p-3">
                  <h3 className="font-semibold text-heading">{row.label}</h3>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                    <div><dt className="text-xs text-muted-foreground">Chỉ tiêu</dt><dd className="mt-1 tabular-nums">{row.targetText}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Thực đạt</dt><dd className="mt-1 font-semibold tabular-nums text-heading">{row.actualText}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Hoàn thành</dt><dd className="mt-1 font-bold tabular-nums text-primary">{row.achievement.display}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
            <dl className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
              {activity.performance.supplementaryMetrics.map((metric) => (
                <div key={metric.label} className="rounded-xl bg-primary/5 p-3 text-center">
                  <dt className="text-xs text-muted-foreground">{metric.label}</dt>
                  <dd className="mt-1 font-bold tabular-nums text-heading">{metric.valueText}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </Card>
    </section>
  );
}
