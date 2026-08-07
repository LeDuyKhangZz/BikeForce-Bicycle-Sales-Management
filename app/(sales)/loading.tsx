import { Skeleton } from '@/components/ui/skeleton';

/** Bắt buộc theo AGENTS.md §4: mỗi route group có loading / error / not-found. */
export default function SalesLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải…</span>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
