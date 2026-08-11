'use client';

import { useEffect, useTransition } from 'react';
import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';

/** Error boundary của route group `(admin)`. Xem giải thích ở `(sales)/error.tsx`. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRetrying, startRetry] = useTransition();

  useEffect(() => {
    console.error('[admin-error]', error.digest ?? '', error.message);
  }, [error]);

  return (
    <Card className="flex flex-col items-start gap-3">
      <TriangleAlert aria-hidden="true" className="size-6 text-destructive" />
      <CardTitle>Đã có lỗi xảy ra</CardTitle>
      <p className="text-sm text-muted-foreground">Không tải được nội dung.</p>
      {error.digest && (
        <p className="text-sm text-muted-foreground tabular">Mã lỗi: {error.digest}</p>
      )}
      <Button
        onClick={() => startRetry(reset)}
        loading={isRetrying}
        loadingText="Đang tải lại…"
      >
        Thử lại
      </Button>
    </Card>
  );
}
