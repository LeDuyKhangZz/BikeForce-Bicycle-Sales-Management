import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { Card } from '@/components/ui/card';

type Props = {
  monthLabel: string;
  previousMonth: string | null;
  nextMonth: string | null;
};

const PAGE_PATH = '/admin/misa-employees';

export function MisaEmployeeMonthNavigation({ monthLabel, previousMonth, nextMonth }: Props) {
  return (
    <Card className="flex items-center justify-between gap-2 rounded-2xl p-3 sm:justify-start sm:gap-3 sm:px-4">
      {previousMonth ? (
        <Link href={`${PAGE_PATH}?month=${previousMonth}`} aria-label="Tháng trước" className="grid size-11 shrink-0 place-items-center rounded-xl border border-input-border text-heading shadow-xs hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Link>
      ) : <span aria-hidden="true" className="size-11" />}
      <p aria-live="polite" className="flex min-h-11 items-center gap-2 rounded-xl bg-primary/10 px-3 font-semibold text-primary">
        <CalendarDays aria-hidden="true" className="size-5" />
        {monthLabel}
      </p>
      {nextMonth ? (
        <Link href={`${PAGE_PATH}?month=${nextMonth}`} aria-label="Tháng sau" className="grid size-11 shrink-0 place-items-center rounded-xl border border-input-border text-heading shadow-xs hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ChevronRight aria-hidden="true" className="size-5" />
        </Link>
      ) : <span aria-hidden="true" className="size-11" />}
    </Card>
  );
}
