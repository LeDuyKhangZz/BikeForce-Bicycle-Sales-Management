'use client';

import { useActionState } from 'react';
import { CircleAlert, CircleCheck, ImagePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitCustomerCare, type CareActionState } from '@/features/customer-care/actions';

type Props = { periodMonth: string; employeeId: number; customerId: number; customerName: string; today: string };

export function CustomerCareForm({ periodMonth, employeeId, customerId, customerName, today }: Props) {
  const [state, action, pending] = useActionState<CareActionState, FormData>(submitCustomerCare, null);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="period_month" value={periodMonth} />
      <input type="hidden" name="misa_employee_id" value={employeeId} />
      <input type="hidden" name="misa_customer_id" value={customerId} />
      <div><p className="text-sm text-muted-foreground">Khách hàng</p><p className="font-bold text-heading">{customerName}</p></div>
      <div><Label htmlFor="care_date">Ngày chăm sóc</Label><Input id="care_date" name="care_date" type="date" max={today} defaultValue={today} required /></div>
      <div><Label htmlFor="evidence">Ảnh minh chứng</Label><Input id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,image/webp" multiple required /><p className="mt-1 text-xs text-muted-foreground">1–5 ảnh, mỗi ảnh tối đa 10 MB.</p></div>
      <div><Label htmlFor="note">Ghi chú</Label><textarea id="note" name="note" maxLength={2000} className="min-h-28 w-full rounded-md border border-input-border/70 bg-background p-3 text-base" /></div>
      {state?.ok && (
        <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-lg border border-success/40 bg-status-exceeded-bg p-4 text-status-exceeded-fg">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm font-semibold">{state.data.notice}</p>
        </div>
      )}
      {state && !state.ok && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-status-missed-bg p-4 text-status-missed-fg">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm font-semibold">{state.message}</p>
        </div>
      )}
      <Button type="submit" size="lg" loading={pending} loadingText="Đang tải ảnh…"><ImagePlus aria-hidden="true" className="size-5" />Gửi ảnh đã chăm sóc</Button>
    </form>
  );
}
