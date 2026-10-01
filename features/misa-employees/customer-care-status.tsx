import { AlertTriangle } from 'lucide-react';

import { needsCustomerCare } from '@/lib/amis/customer-alerts';
import { formatMisaDate } from '@/lib/amis/customer-display';

type Props = { lastVisitDate: string | null; cutoff: string };

export function CustomerCareStatus({ lastVisitDate, cutoff }: Props) {
  const needsCare = needsCustomerCare(lastVisitDate, cutoff);
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${needsCare ? 'font-semibold text-destructive' : 'text-heading'}`}>
      {needsCare && <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />}
      <span>{lastVisitDate === null ? 'Chưa có ngày ghé thăm' : formatMisaDate(lastVisitDate)}</span>
      {needsCare && <span className="w-full text-xs">{lastVisitDate === null ? 'Cần chăm sóc' : 'Từ 30 ngày chưa ghé thăm'}</span>}
    </span>
  );
}
