'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { revokeCustomerCare, type CareActionState } from '@/features/customer-care/actions';

type Props = { submissionId: string };

export function RevokeCareForm({ submissionId }: Props) {
  const [state, action, pending] = useActionState<CareActionState, FormData>(revokeCustomerCare, null);
  return (
    <form action={action} className="flex flex-col gap-3 border-t border-border pt-4">
      <input type="hidden" name="submission_id" value={submissionId} />
      <label className="text-sm font-medium text-heading" htmlFor={`revoke-reason-${submissionId}`}>Lý do thu hồi</label>
      <textarea
        id={`revoke-reason-${submissionId}`}
        name="reason"
        minLength={1}
        maxLength={1000}
        required
        className="min-h-24 w-full rounded-md border border-input-border bg-background p-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <Button type="submit" variant="destructive" loading={pending} loadingText="Đang thu hồi…">Thu hồi phê duyệt</Button>
      {state && <p role={state.ok ? 'status' : 'alert'} className={state.ok ? 'text-sm text-success' : 'text-sm text-destructive'}>{state.ok ? state.data.notice : state.message}</p>}
    </form>
  );
}
