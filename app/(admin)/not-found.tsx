import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import { LinkSpinner } from '@/components/ui/link-spinner';
import { ADMIN_HOME } from '@/lib/auth/routes';

/** 404 của route group `(admin)`. */
export default function AdminNotFound() {
  return (
    <Card className="flex flex-col items-start gap-3">
      <FileQuestion aria-hidden="true" className="size-6 text-muted-foreground" />
      <CardTitle>Không tìm thấy nội dung</CardTitle>
      <p className="text-sm text-muted-foreground">Nội dung này không tồn tại.</p>
      <Link
        href={ADMIN_HOME}
        className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium text-primary hover:bg-background"
      >
        Về trang Tổng quan
        <LinkSpinner label="Đang về trang Tổng quan…" />
      </Link>
    </Card>
  );
}
