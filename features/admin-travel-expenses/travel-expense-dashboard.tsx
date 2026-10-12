import { CheckCircle2, CircleAlert, ReceiptText, UsersRound } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import type { TravelExpenseDashboardModel } from '@/lib/admin/travel-expense-dashboard';

type Props = {
  dashboard: TravelExpenseDashboardModel;
};

export function TravelExpenseDashboard({ dashboard }: Props) {
  const tiles = [
    { label: 'Nhân viên', value: dashboard.totalPeople, icon: UsersRound },
    { label: 'Đã nhập', value: dashboard.enteredCount, icon: CheckCircle2 },
    { label: 'Chưa nhập', value: dashboard.missingCount, icon: CircleAlert },
    { label: 'Hoàn tất', value: dashboard.completionText, icon: ReceiptText },
  ] as const;

  if (dashboard.totalPeople === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <UsersRound aria-hidden="true" className="size-12 text-muted-foreground" />
        <p className="font-medium text-foreground">Chưa có nhân viên để theo dõi công tác phí</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="travel-expense-overview-title" className="flex flex-col gap-3">
        <h2 id="travel-expense-overview-title" className="text-lg font-semibold text-heading">
          Tổng quan tháng
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <li key={tile.label}>
                <Card className="flex h-full flex-col gap-2">
                  <Icon aria-hidden="true" className="size-5 text-primary" />
                  <p className="tabular text-3xl font-bold tracking-tight text-heading">{tile.value}</p>
                  <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Tổng công tác phí đã nhập</CardTitle>
        <p className="tabular text-3xl font-bold break-words text-heading">
          {dashboard.totalAmountText}
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle className="text-base">Nhân viên chưa nhập</CardTitle>
        {dashboard.missingPeople.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-status-exceeded-fg">
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
            Đã nhập đủ công tác phí cho tất cả nhân viên.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {dashboard.missingPeople.map((person) => (
              <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <p className="font-medium text-foreground">{person.fullName}</p>
                <p className="text-sm text-muted-foreground">{person.employeeCode}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
