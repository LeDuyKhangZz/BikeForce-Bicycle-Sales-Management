import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import { SALES_HOME } from '@/lib/auth/routes';

/**
 * 404 của route group `(sales)`.
 *
 * Đây cũng là màn hình mà kịch bản IDOR số 1 (`docs/06 §10`) dẫn tới: Sales A mở
 * `/sales/reports/<id-của-Sales-B>` thì RLS trả 0 rows và page gọi `notFound()`.
 * **404 chứ không phải 403** — 403 sẽ xác nhận bản ghi đó có tồn tại.
 */
export default function SalesNotFound() {
  return (
    <Card className="flex flex-col items-start gap-3">
      <FileQuestion aria-hidden="true" className="size-6 text-muted-foreground" />
      <CardTitle>Không tìm thấy nội dung</CardTitle>
      <p className="text-sm text-muted-foreground">
        Nội dung này không tồn tại hoặc không thuộc về tài khoản của bạn.
      </p>
      <Link
        href={SALES_HOME}
        className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium text-primary hover:bg-background"
      >
        Về trang Hôm nay
      </Link>
    </Card>
  );
}
