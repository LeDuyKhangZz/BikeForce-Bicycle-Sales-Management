'use client';

import { useActionState } from 'react';
import { Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { saveMisaCustomerPlan, type MisaCustomerPlanState } from '@/features/misa-employees/actions';

type Props = { month: string; employeeId: number; customerId: number; frequency: number; committedSales: number | null };

export function CustomerPlanEditor({ month, employeeId, customerId, frequency, committedSales }: Props) {
  const [state, formAction, pending] = useActionState<MisaCustomerPlanState, FormData>(saveMisaCustomerPlan, null);
  return (
    <form action={formAction} className="grid min-w-0 grid-cols-[5.5rem_minmax(8rem,1fr)_auto] items-end gap-2">
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="customerId" value={customerId} />
      <label className="min-w-0 text-xs text-muted-foreground">Lần/tháng
        <input name="monthlyFrequency" type="number" inputMode="numeric" min="0" max="31" defaultValue={frequency} className="mt-1 min-h-11 w-full rounded-md border border-input-border bg-card px-2 text-base tabular-nums text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
      </label>
      <label className="min-w-0 text-xs text-muted-foreground">Cam kết (VND)
        <input name="committedSales" type="number" inputMode="numeric" min="0" step="1000" defaultValue={committedSales ?? ''} placeholder="Chưa cam kết" className="mt-1 min-h-11 w-full rounded-md border border-input-border bg-card px-2 text-base tabular-nums text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
      </label>
      <Button type="submit" variant="secondary" loading={pending} loadingText="Lưu…" className="size-11 px-0" aria-label="Lưu kế hoạch khách hàng"><Save aria-hidden="true" className="size-4" /></Button>
      {state && !state.ok && <p role="alert" className="col-span-full text-xs text-destructive">{state.message}</p>}
      {state?.ok && <p role="status" className="col-span-full text-xs text-success">Đã lưu kế hoạch tháng.</p>}
    </form>
  );
}
