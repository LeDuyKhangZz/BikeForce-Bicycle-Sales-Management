'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function HatdeError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[HatdePage]', error);
  }, [error]);

  return (
    <Card className="py-10 text-center">
      <AlertTriangle aria-hidden="true" className="mx-auto size-10 text-destructive" />
      <CardTitle className="mt-4">Không thể tải dữ liệu Hạt Dẻ</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">Vui lòng thử lại sau ít phút.</p>
      <Button type="button" onClick={reset} className="mt-5">Thử lại</Button>
    </Card>
  );
}
