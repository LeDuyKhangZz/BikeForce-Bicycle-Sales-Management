import Link from 'next/link';
import { Bell } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  pendingCount: number;
};

export function CustomerCareNotificationButton({ pendingCount }: Props) {
  const label = pendingCount > 0
    ? `${pendingCount} yêu cầu chăm sóc đang chờ phê duyệt`
    : 'Không có yêu cầu chăm sóc chờ phê duyệt';

  return (
    <Link
      href="/admin/customer-care"
      aria-label={label}
      title={label}
      className={buttonClassName({
        variant: 'secondary',
        className: 'relative shrink-0 px-3',
      })}
    >
      <Bell aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Thông báo</span>
      {pendingCount > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute -end-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-pill',
            'bg-destructive px-1 text-[11px] font-bold leading-none text-destructive-foreground tabular-nums',
          )}
        >
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </Link>
  );
}
