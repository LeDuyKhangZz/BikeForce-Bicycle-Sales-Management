'use client';

import { useLinkStatus } from 'next/link';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  label: string;
  className?: string;
};

/**
 * Thay icon của một `<Link>` bằng spinner ngay khi điều hướng bắt đầu.
 * Component phải nằm bên trong `<Link>` để `useLinkStatus()` nhận đúng trạng thái.
 */
export function LinkPendingIcon({ children, label, className }: Props) {
  const { pending } = useLinkStatus();

  return (
    <>
      {pending ? (
        <Loader2
          aria-hidden="true"
          data-link-loading="true"
          className={cn('shrink-0 animate-spin motion-reduce:animate-none', className)}
        />
      ) : (
        children
      )}
      {pending && (
        <span role="status" aria-live="polite" className="sr-only">
          {label}
        </span>
      )}
    </>
  );
}
