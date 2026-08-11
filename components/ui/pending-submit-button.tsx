'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type Props = {
  children: ReactNode;
  pendingText: string;
  className?: string;
};

/** Trạng thái gửi cho form Server Component dùng native `action`/`method`. */
export function PendingSubmitButton({ children, pendingText, className }: Props) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      className={className}
      loading={pending}
      loadingText={pendingText}
    >
      {children}
    </Button>
  );
}
