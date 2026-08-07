import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type Props = ComponentProps<'textarea'> & {
  invalid?: boolean;
};

/**
 * Cùng ràng buộc với `Input` (AGENTS.md §10 — touch & input), thêm:
 *   • `min-h-24` = 96px theo `docs/05 §6.2`.
 *   • `resize-y` — cho phép kéo cao thêm nhưng KHÔNG kéo ngang, vì kéo ngang
 *     tạo ra cuộn ngang, thứ bị cấm tuyệt đối trên mobile.
 *
 * Bộ đếm ký tự KHÔNG nằm ở đây: primitive không biết giới hạn nghiệp vụ là bao
 * nhiêu. Nơi gọi truyền `maxLength` và tự hiển thị bộ đếm.
 */
export function Textarea({ invalid, className, ...props }: Props) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        'min-h-24 w-full resize-y rounded-lg border bg-card px-3 py-3 text-base text-foreground',
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
