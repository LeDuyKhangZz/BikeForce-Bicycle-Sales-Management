import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Skeleton bắt buộc cho mọi khối chờ > 300ms (rule progressive-loading).
 *
 * PHASE 13 (DEC-053) — đổi từ `animate-pulse` sang **shimmer quét ngang**.
 * Nhấp nháy độ mờ đọc ra như "hỏng"; vệt sáng chạy qua đọc ra như "đang tải" và
 * gợi đúng hướng đọc của nội dung sắp hiện. Vệt chỉ chạm `transform`
 * (rule `transform-performance`), `overflow-hidden` giữ nó trong khung.
 *
 * `prefers-reduced-motion: reduce` đã được xử lý global trong `globals.css`;
 * lúc đó khối vẫn hiện ra như một mảng xám tĩnh — vẫn đúng nghĩa "chỗ này sắp
 * có nội dung", chỉ là không chuyển động.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn('relative overflow-hidden rounded-md bg-border/70', className)}
      {...props}
    >
      <span className="absolute inset-y-0 -left-full w-full animate-shimmer bg-linear-to-r from-transparent via-white/70 to-transparent motion-reduce:hidden" />
    </div>
  );
}
