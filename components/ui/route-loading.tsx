import { Loader2 } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  titleWidth?: 'short' | 'medium';
};

/**
 * Khung tải route dùng chung: giữ trước không gian của heading, KPI và danh sách
 * để nội dung thật xuất hiện không làm trang nhảy. Chỉ nhận chuỗi trình bày nên
 * primitive không biết role, route hay dữ liệu nghiệp vụ.
 */
export function RouteLoading({ label, titleWidth = 'short' }: Props) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      data-route-loading="true"
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 shadow-sm">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-pill bg-status-info-bg text-status-info-fg"
        >
          <Loader2
            data-loading-spinner="true"
            className="size-5 animate-spin motion-reduce:animate-none"
          />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-heading">{label}</p>
          <p className="text-xs text-muted-foreground">Dữ liệu đang được chuẩn bị, vui lòng chờ.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 py-1">
        <Skeleton className={cn('h-8', titleWidth === 'short' ? 'w-40' : 'w-52')} />
        <Skeleton className="h-4 w-64 max-w-[82%]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>

      <div className="rounded-lg bg-card p-4 shadow-sm">
        <Skeleton className="mb-4 h-5 w-36" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </div>
      </div>
    </section>
  );
}
