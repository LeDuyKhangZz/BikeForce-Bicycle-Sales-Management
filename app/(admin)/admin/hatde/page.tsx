import type { Metadata } from 'next';

import { HatdeDashboard } from '@/features/admin-hatde/hatde-dashboard';
import { getHatdePageData } from '@/features/admin-hatde/queries';
import { requireRole } from '@/features/auth/queries';
import { resolveHatdeDate, resolveHatdeTime } from '@/lib/hatde/view-model';

export const metadata: Metadata = {
  title: 'Hạt Dẻ · BikeForce',
};

type Props = {
  searchParams: Promise<{ date?: string; time?: string }>;
};

export default async function HatdePage({ searchParams }: Props) {
  await requireRole('ADMIN');
  const params = await searchParams;
  const reportDate = resolveHatdeDate(params.date);
  const reportTime = reportDate === undefined ? undefined : resolveHatdeTime(params.time);
  const data = await getHatdePageData({ reportDate, reportTime });

  return (
    <HatdeDashboard
      report={data.report}
      selectedDate={reportDate}
      availableTimes={data.availableTimes}
    />
  );
}
