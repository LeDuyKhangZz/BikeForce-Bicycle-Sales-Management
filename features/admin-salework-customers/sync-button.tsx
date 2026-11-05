'use client';

import { useActionState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { syncSaleWorkCustomersAction } from './actions';
import type { SaleWorkCustomerSyncState } from './types';

export function SaleWorkCustomersSyncButton() {
  const [state, formAction, isPending] = useActionState<SaleWorkCustomerSyncState, FormData>(
    syncSaleWorkCustomersAction,
    null,
  );

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <form action={formAction}>
        <Button type="submit" size="md" loading={isPending} loadingText="Đang đồng bộ SaleWork…">
          <RefreshCw aria-hidden="true" className="size-4" />
          Đồng bộ ngay
        </Button>
      </form>
      {state?.ok && (
        <p role="status" className="flex max-w-xl items-start gap-2 rounded-lg bg-status-exceeded-bg px-3 py-2 text-sm text-status-exceeded-fg">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{state.data.notice}
        </p>
      )}
      {state && !state.ok && <p role="alert" className="max-w-xl rounded-lg bg-status-missed-bg px-3 py-2 text-sm text-status-missed-fg">{state.message}</p>}
    </div>
  );
}
