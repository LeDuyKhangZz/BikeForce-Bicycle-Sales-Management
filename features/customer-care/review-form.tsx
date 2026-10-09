'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { reviewCustomerCare, type CareActionState } from '@/features/customer-care/actions';

type Props = { submissionId: string };

export function ReviewCareForm({ submissionId }: Props) {
  const [state, action, pending] = useActionState<CareActionState, FormData>(reviewCustomerCare, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="submission_id" value={submissionId} />
      <label className="text-sm font-medium text-heading" htmlFor={`reason-${submissionId}`}>Lý do từ chối (nếu có)</label>
      <textarea id={`reason-${submissionId}`} name="rejection_reason" maxLength={1000} className="min-h-20 rounded-md border border-input-border/70 bg-background p-3 text-base" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="APPROVED" loading={pending}>Phê duyệt</Button>
        <Button type="submit" name="decision" value="REJECTED" variant="destructive" disabled={pending}>Từ chối</Button>
      </div>
      {state && <p role="alert" className={state.ok ? 'text-sm text-success' : 'text-sm text-destructive'}>{state.ok ? state.data.notice : state.message}</p>}
    </form>
  );
}
