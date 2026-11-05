'use client';

import { useActionState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  syncMisaInventoryAction,
  type SyncInventoryActionState,
} from '@/features/admin-inventory/actions';

type Props = {
  warehouse: string | null;
};

export function SyncInventoryButton({ warehouse }: Props) {
  const [state, formAction, isPending] = useActionState<
    SyncInventoryActionState,
    FormData
  >(syncMisaInventoryAction, null);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <form action={formAction}>
        {warehouse !== null && (
          <input type="hidden" name="warehouse" value={warehouse} />
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isPending}
          loadingText="Đang đồng bộ kho MISA…"
          className="sm:w-auto"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          {warehouse === null ? 'Đồng bộ tồn kho ngay' : `Đồng bộ kho ${warehouse}`}
        </Button>
      </form>

      {state !== null && (
        <div
          role={state.ok ? 'status' : 'alert'}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${
            state.ok
              ? 'bg-status-exceeded-bg text-status-exceeded-fg'
              : 'bg-status-missed-bg text-status-missed-fg'
          }`}
        >
          {state.ok ? (
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          )}
          <span>{state.ok ? state.data.notice : state.message}</span>
        </div>
      )}
    </div>
  );
}
