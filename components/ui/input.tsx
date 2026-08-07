import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type Props = ComponentProps<'input'> & {
  invalid?: boolean;
};

/**
 * Ràng buộc bắt buộc (AGENTS.md §10 — touch & input):
 *   • `min-h-12` = 48px — chiều cao tối thiểu của control trên mobile.
 *   • `text-base` = 16px — dưới 16px iOS Safari tự phóng to trang khi focus.
 *   • Viền dùng `input-border` (#64748B, 4.76:1), KHÔNG dùng `border`
 *     (#E2E8F0, 1.23:1 — không đạt ngưỡng 3:1 của WCAG 1.4.11 cho control).
 *
 * Trường số phải được truyền thêm `inputMode="numeric"` + `pattern="[0-9]*"`
 * từ phía gọi — primitive không đoán kiểu bàn phím thay nghiệp vụ.
 */
export function Input({ invalid, className, ...props }: Props) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'min-h-12 w-full rounded-lg border bg-card px-3 text-base text-foreground',
        'placeholder:text-muted-foreground',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-45',
        invalid ? 'border-destructive' : 'border-input-border',
        className,
      )}
      {...props}
    />
  );
}
