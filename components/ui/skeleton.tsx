import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Skeleton bắt buộc cho mọi khối chờ > 300ms (rule progressive-loading).
 * Chỉ animate `opacity` — không animate layout property (rule transform-performance).
 * `prefers-reduced-motion: reduce` đã được xử lý global trong globals.css.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-border', className)}
      {...props}
    />
  );
}
