'use client';

import { RefreshCw } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { formatVietnamDateTime } from '@/lib/date';
import type { MonthlySyncStatus } from '@/services/monthly-sync-jobs';

import { requestMonthlySyncAction, type RequestMonthlySyncState } from './actions';

type Props = {
  month: string;
  status: MonthlySyncStatus | null;
  requestedAt: string | null;
  completedAt: string | null;
  syncedRows: number | null;
  errorMessage: string | null;
};

function statusText(status: MonthlySyncStatus | null): string {
  if (status === 'PENDING') return 'Đang chờ máy đồng bộ';
  if (status === 'RUNNING') return 'Đang lấy dữ liệu tháng';
  if (status === 'COMPLETED') return 'Đã đồng bộ xong';
  if (status === 'FAILED') return 'Đồng bộ chưa thành công';
  return 'Chưa đồng bộ tháng này';
}

export function MonthlySyncButton({ month, status, requestedAt, completedAt, syncedRows, errorMessage }: Props) {
  const [state, formAction, isPending] = useActionState<RequestMonthlySyncState, FormData>(requestMonthlySyncAction, null);
  const router = useRouter();
  const active = status === 'PENDING' || status === 'RUNNING';

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [active, router]);

  const timestamp = completedAt ?? requestedAt;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="month" value={month} />
      <Button type="submit" size="lg" loading={isPending} loadingText="Đang gửi yêu cầu…" disabled={active}>
        <RefreshCw aria-hidden="true" className="size-5" />
        {active ? statusText(status) : 'Đồng bộ dữ liệu tháng'}
      </Button>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {state?.ok ? state.data.notice : state?.message ?? statusText(status)}
        {syncedRows !== null && status === 'COMPLETED' ? ` · ${syncedRows} tài khoản SaleWork` : ''}
        {timestamp ? ` · ${formatVietnamDateTime(timestamp)}` : ''}
      </p>
      {status === 'FAILED' && errorMessage && (
        <p role="alert" className="text-sm text-destructive">{errorMessage}</p>
      )}
    </form>
  );
}
