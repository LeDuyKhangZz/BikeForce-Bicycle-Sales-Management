import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { calculateMonthlySalesChange } from '@/lib/amis/monthly-sales-change';

type Props = { current: number | null; previous: number | null | undefined };

export function MonthlySalesChange({ current, previous }: Props) {
  const change = calculateMonthlySalesChange(current, previous ?? null);
  if (change.kind === 'UNKNOWN') return <span className="text-muted-foreground">{change.display}</span>;
  if (change.kind === 'DOWN') return <span className="inline-flex items-center gap-1 text-destructive"><TrendingDown aria-hidden="true" className="size-3" />{change.display}</span>;
  if (change.kind === 'UP' || change.kind === 'NEW') return <span className="inline-flex items-center gap-1 text-success"><TrendingUp aria-hidden="true" className="size-3" />{change.display}</span>;
  return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus aria-hidden="true" className="size-3" />{change.display}</span>;
}
