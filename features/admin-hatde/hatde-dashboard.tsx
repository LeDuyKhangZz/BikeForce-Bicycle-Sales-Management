import Link from 'next/link';
import { ArrowDown, ArrowUp, Clock3, Minus, ReceiptText, Store } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HatdeComparisonViewModel, HatdeSnapshotViewModel } from '@/lib/hatde/view-model';

type Props = {
  report: HatdeSnapshotViewModel | null;
  selectedDate?: string;
  availableTimes: string[];
};

function Comparison({ value, label }: { value: HatdeComparisonViewModel; label: string }) {
  const Icon = value.direction === 'UP' ? ArrowUp : value.direction === 'DOWN' ? ArrowDown : Minus;
  const tone = value.direction === 'UP' ? 'success' : value.direction === 'DOWN' ? 'danger' : 'neutral';

  return (
    <Badge tone={tone} icon={<Icon aria-hidden="true" className="size-3.5" />}>
      {label}: {value.display}
    </Badge>
  );
}

export function HatdeDashboard({ report, selectedDate, availableTimes }: Props) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Hạt Dẻ Ông Lý</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-heading">Doanh thu chi nhánh</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Snapshot doanh thu được đồng bộ tự động từ CUKCUK qua n8n.
        </p>
      </header>

      <Card>
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-heading">
            Ngày báo cáo
            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="min-h-12 rounded-md border border-input-border bg-card px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </label>
          <button type="submit" className="min-h-12 touch-manipulation rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Xem theo ngày
          </button>
        </form>

        {selectedDate !== undefined && availableTimes.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium text-heading">Giờ cập nhật trong ngày</p>
            <div className="flex flex-wrap gap-2">
              {availableTimes.map((time) => (
                <Link
                  key={time}
                  href={`/admin/hatde?date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(time)}`}
                  className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-md border border-input-border px-3 text-sm font-semibold text-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Clock3 aria-hidden="true" className="size-4" />
                  {time}
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>

      {report === null ? (
        <Card className="py-10 text-center">
          <Store aria-hidden="true" className="mx-auto size-10 text-muted-foreground" />
          <CardTitle className="mt-4">Chưa có dữ liệu Hạt Dẻ</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Chưa có snapshot cho lựa chọn này. Hãy kiểm tra workflow n8n hoặc chọn ngày khác.
          </p>
        </Card>
      ) : (
        <>
          <section aria-labelledby="hatde-overview-title" className="grid gap-4 sm:grid-cols-2">
            <h2 id="hatde-overview-title" className="sr-only">Tổng quan snapshot</h2>
            <Card>
              <p className="text-sm text-muted-foreground">Tổng doanh thu toàn chuỗi</p>
              <p className="mt-2 break-words text-3xl font-bold tabular-nums tracking-tight text-heading">
                {report.totalRevenueDisplay}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">Tổng giao dịch</p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-heading">
                {report.totalTransactionsDisplay}
              </p>
            </Card>
          </section>

          <Card flush>
            <CardHeader className="border-b border-border px-4 py-4">
              <CardTitle>Chi nhánh theo doanh thu</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cập nhật {report.reportTime} · {report.reportDateDisplay}
              </p>
            </CardHeader>
            <ol className="divide-y divide-border">
              {report.branches.map((branch) => (
                <li key={branch.code} className="p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-status-info-bg text-sm font-bold tabular-nums text-status-info-fg">
                      {branch.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold break-words text-heading">{branch.name}</p>
                      <p className="mt-1 break-words text-xl font-bold tabular-nums text-heading">
                        {branch.revenueDisplay}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <ReceiptText aria-hidden="true" className="size-4" />
                        {branch.transactionsDisplay} giao dịch
                      </p>
                      <div className={cn('mt-3 flex flex-wrap gap-2')}>
                        <Comparison value={branch.vsYesterday} label="Hôm qua" />
                        <Comparison value={branch.vsLastWeek} label="Tuần trước" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}
    </div>
  );
}
