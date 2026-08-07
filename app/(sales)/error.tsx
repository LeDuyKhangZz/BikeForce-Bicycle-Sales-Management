'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';

/**
 * Error boundary của route group `(sales)`.
 *
 * NFR-014: KHÔNG hiển thị `error.message` thô cho người dùng — chuỗi đó có thể
 * chứa tên bảng/cột/constraint của Postgres. Chỉ log ở console và hiện `digest`
 * để đối chiếu với log server.
 */
export default function SalesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[sales-error]', error.digest ?? '', error.message);
  }, [error]);

  return (
    <Card className="flex flex-col items-start gap-3">
      <TriangleAlert aria-hidden="true" className="size-6 text-destructive" />
      <CardTitle>Đã có lỗi xảy ra</CardTitle>
      <p className="text-sm text-muted-foreground">
        Không tải được nội dung. Dữ liệu bạn đã nhập không bị mất.
      </p>
      {error.digest && (
        <p className="text-sm text-muted-foreground tabular">Mã lỗi: {error.digest}</p>
      )}
      <Button onClick={reset}>Thử lại</Button>
    </Card>
  );
}
