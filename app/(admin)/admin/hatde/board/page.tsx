import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock3, Store } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import { HatdeRankingBoard } from '@/features/admin-hatde/hatde-ranking-board';
import { getHatdePageData } from '@/features/admin-hatde/queries';
import { requireRole } from '@/features/auth/queries';
import { resolveHatdeDate, resolveHatdeTime } from '@/lib/hatde/view-model';

export const metadata: Metadata = {
  title: 'Bảng thi đua Hạt Dẻ · BikeForce',
};

type Props = {
  searchParams: Promise<{ date?: string; time?: string }>;
};

export default async function HatdeBoardPage({ searchParams }: Props) {
  await requireRole('ADMIN');
  const params = await searchParams;
  const reportDate = resolveHatdeDate(params.date);
  const reportTime = reportDate === undefined ? undefined : resolveHatdeTime(params.time);
  const data = await getHatdePageData({ reportDate, reportTime });

  return (
    <div className="space-y-6">
      <Link
        href="/admin/hatde"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-background"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Quay lại Hạt Dẻ
      </Link>

      <Card>
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-heading">
            Ngày báo cáo
            <input
              type="date"
              name="date"
              defaultValue={reportDate}
              className="min-h-12 rounded-md border border-input-border bg-card px-3 text-base text-foreground"
            />
          </label>
          <button type="submit" className="min-h-12 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Xem theo ngày
          </button>
        </form>

        {reportDate !== undefined && data.availableTimes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {data.availableTimes.map((time) => (
              <Link
                key={time}
                href={`/admin/hatde/board?date=${encodeURIComponent(reportDate)}&time=${encodeURIComponent(time)}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input-border px-3 text-sm font-semibold text-foreground hover:bg-background"
              >
                <Clock3 aria-hidden="true" className="size-4" />
                {time}
              </Link>
            ))}
          </div>
        )}
      </Card>

      {data.report === null ? (
        <Card className="py-10 text-center">
          <Store aria-hidden="true" className="mx-auto size-10 text-muted-foreground" />
          <CardTitle className="mt-4">Chưa có dữ liệu Hạt Dẻ</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">Chưa có snapshot cho lựa chọn này.</p>
        </Card>
      ) : (
        <HatdeRankingBoard report={data.report} />
      )}
    </div>
  );
}
