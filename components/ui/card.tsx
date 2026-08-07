import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Bề mặt trắng trên nền `background` (#F8FAFC). Đường viền dùng `border`
 * (#E2E8F0) — đây là dải TRANG TRÍ, hợp lệ vì card không phải control tương tác.
 */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-card p-4', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn('text-lg font-semibold text-heading', className)} {...props} />;
}
