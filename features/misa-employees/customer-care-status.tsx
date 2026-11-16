import { AlertTriangle } from 'lucide-react';

import { needsCustomerCare } from '@/lib/amis/customer-alerts';
import { formatMisaDate } from '@/lib/amis/customer-display';

type Props = { lastVisitDate: string | null; lastCareDate?: string | null; cutoff: string };

export function CustomerCareStatus({ lastVisitDate, lastCareDate, cutoff }: Props) {
  const careDate = lastCareDate ?? lastVisitDate;
  const needsCare = needsCustomerCare(careDate, cutoff);
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${needsCare ? 'font-semibold text-destructive' : 'text-heading'}`}>
      {needsCare && <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />}
      <span>{careDate === null ? 'Chưa có ngày chăm sóc' : formatMisaDate(careDate)}</span>
      {needsCare && <span className="w-full text-xs">{careDate === null ? 'Cần chăm sóc' : 'Từ 30 ngày chưa chăm sóc'}</span>}
    </span>
  );
}
