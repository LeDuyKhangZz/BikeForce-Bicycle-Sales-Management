import { buildHatdeSnapshotViewModel, type HatdeSnapshotViewModel } from '@/lib/hatde/view-model';
import { createClient } from '@/lib/supabase/server';
import { getLatestHatdeSnapshot, listHatdeSnapshotTimes } from '@/services/hatde';

export type HatdePageData = {
  report: HatdeSnapshotViewModel | null;
  availableTimes: string[];
};

export async function getHatdePageData(filters: {
  reportDate?: string;
  reportTime?: string;
}): Promise<HatdePageData> {
  const supabase = await createClient();
  const [report, snapshots] = await Promise.all([
    getLatestHatdeSnapshot(supabase, filters),
    filters.reportDate === undefined
      ? Promise.resolve([])
      : listHatdeSnapshotTimes(supabase, filters.reportDate),
  ]);

  return {
    report: report === null ? null : buildHatdeSnapshotViewModel(report),
    availableTimes: snapshots.map((snapshot) => snapshot.report_time),
  };
}
