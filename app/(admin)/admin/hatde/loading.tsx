import { Skeleton } from '@/components/ui/skeleton';

export default function HatdeLoading() {
  return (
    <div className="space-y-6" aria-label="Đang tải dữ liệu Hạt Dẻ">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
