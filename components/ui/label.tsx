import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type Props = ComponentProps<'label'> & {
  required?: boolean;
};

/**
 * Label LUÔN hiển thị — không bao giờ dùng placeholder thay label
 * (rule input-labels). Placeholder biến mất ngay khi người dùng gõ, và Sales
 * đang đứng ngoài thị trường không có cách nào nhớ lại ô đó là ô gì.
 */
export function Label({ required, className, children, ...props }: Props) {
  return (
    <label
      className={cn('block text-sm font-medium text-foreground', className)}
      {...props}
    >
      {children}
      {required && (
        <span className="text-destructive" aria-hidden="true">
          {' *'}
        </span>
      )}
      {required && <span className="sr-only"> (bắt buộc)</span>}
    </label>
  );
}
