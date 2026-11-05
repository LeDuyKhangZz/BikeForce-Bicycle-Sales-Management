'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, formAction, isPending] = useActionState<
    SyncInventoryActionState,
    FormData
  >(syncMisaInventoryAction, null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isPending) {
      dialog.close();
    } else if (state !== null && !dialog.open) {
      dialog.showModal();
    }
  }, [state, isPending]);

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
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-card p-6 shadow-xl backdrop:bg-black/40"
        >
          <div className={`mb-4 flex items-center gap-2 rounded-lg p-3 ${
            state.ok
              ? 'bg-status-exceeded-bg text-status-exceeded-fg'
              : 'bg-status-missed-bg text-status-missed-fg'
          }`}>
          {state.ok ? (
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          )}
            <h2 id={titleId} className="text-base font-semibold">
              {state.ok ? 'Đồng bộ tồn kho thành công' : 'Đồng bộ tồn kho thất bại'}
            </h2>
          </div>
          <p className="mb-6 text-sm text-foreground">
            {state.ok ? state.data.notice : state.message}
          </p>
          <form method="dialog" className="flex justify-end">
            <Button type="submit" variant="primary" size="md">Đóng</Button>
          </form>
        </dialog>
      )}
    </div>
  );
}
