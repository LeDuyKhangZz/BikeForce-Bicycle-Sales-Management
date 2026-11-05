import { CheckCircle2, CircleAlert, ReceiptText, UsersRound } from 'lucide-react';

import { Card, CardTitle } from '@/components/ui/card';
import type { TravelExpenseDashboardModel, TravelExpenseMonthlyChartModel } from '@/lib/admin/travel-expense-dashboard';

type Props = { dashboard: TravelExpenseDashboardModel; monthlyChart: TravelExpenseMonthlyChartModel };

export function TravelExpenseDashboard({ dashboard, monthlyChart }: Props) {
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
      <section aria-label="Biểu đồ số tiền công tác phí theo tháng" className="grid gap-4 2xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.6fr)]">
        <Card className="flex flex-col gap-3">
          <CardTitle className="text-base">Tỷ trọng công tác phí trong năm</CardTitle>
          <p className="text-sm text-muted-foreground">Tháng đang xem so với các tháng còn lại của năm {monthlyChart.year}.</p>
          <div className="flex flex-1 flex-wrap items-center justify-center gap-5 py-2 sm:gap-8">
            <svg
              viewBox="0 0 180 180"
              className="size-44 shrink-0"
              role="img"
              aria-label={`${monthlyChart.donut.selectedMonthLabel}: ${monthlyChart.donut.selectedAmountText}; các tháng còn lại: ${monthlyChart.donut.otherMonthsAmountText}`}
            >
              <circle cx="90" cy="90" r="62" fill="none" stroke="var(--color-border)" strokeWidth="20" />
              <circle
                cx="90"
                cy="90"
                r="62"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="20"
                strokeDasharray={`${monthlyChart.donut.selectedMonthLength} ${monthlyChart.donut.circumference}`}
                transform="rotate(-90 90 90)"
              />
              <text x="90" y="87" textAnchor="middle" className="fill-heading text-2xl font-bold">
                {monthlyChart.donut.yearTotalText}
              </text>
              <text x="90" y="110" textAnchor="middle" className="fill-muted-foreground text-xs">
                Tổng năm
              </text>
            </svg>
            <ul className="flex min-w-52 flex-col gap-4 text-sm">
              <li className="flex items-start gap-2.5">
                <span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{monthlyChart.donut.selectedMonthLabel}</p>
                  <p className="tabular-nums text-muted-foreground">
                    {monthlyChart.donut.selectedAmountText} · {monthlyChart.donut.selectedPercentText}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full bg-border" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Các tháng còn lại</p>
                  <p className="tabular-nums text-muted-foreground">
                    {monthlyChart.donut.otherMonthsAmountText} · {monthlyChart.donut.otherMonthsPercentText}
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </Card>

        <Card className="flex min-w-0 flex-col gap-3">
          <div>
            <CardTitle className="text-base">Tổng công tác phí theo tháng</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Tổng số tiền từng tháng trong năm {monthlyChart.year}.</p>
          </div>
          <div className="hidden min-w-0 lg:block">
            <MonthlyExpenseColumnChart monthlyChart={monthlyChart} />
          </div>
          <ol aria-label={`Tổng công tác phí từng tháng năm ${monthlyChart.year}`} className="flex flex-col gap-3 lg:hidden">
            {monthlyChart.chart.bars.map((bar) => (
              <li key={bar.month} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3">
                <span className={`text-sm font-semibold ${bar.selected ? 'text-primary' : 'text-muted-foreground'}`}>{bar.label}</span>
                <div className="h-3 overflow-hidden rounded-full bg-background" aria-hidden="true">
                  <div
                    className={`h-full rounded-full ${bar.selected ? 'bg-accent' : 'bg-primary'}`}
                    style={{ width: `${bar.widthPercent}%` }}
                  />
                </div>
                <span className="text-right text-sm tabular-nums text-foreground">{bar.amountText}</span>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section aria-labelledby="travel-expense-overview-title" className="flex flex-col gap-3">
        <h2 id="travel-expense-overview-title" className="text-lg font-semibold text-heading">Tổng quan tháng</h2>
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
        <CardTitle className="text-base">Tổng công tác phí tháng đang xem</CardTitle>
        <p className="tabular text-3xl font-bold break-words text-heading">{dashboard.totalAmountText}</p>
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

function MonthlyExpenseColumnChart({ monthlyChart }: Pick<Props, 'monthlyChart'>) {
  const chart = monthlyChart.chart;
  return (
    <svg
      viewBox={`0 0 ${chart.width} ${chart.height}`}
      className="h-auto max-h-[360px] w-full"
      role="img"
      aria-label={`Biểu đồ tổng công tác phí theo tháng năm ${monthlyChart.year}`}
    >
      {chart.ticks.map((tick) => (
        <g key={`${tick.y}-${tick.label}`}>
          <line x1={chart.plotLeft} y1={tick.y} x2={chart.plotLeft + chart.plotWidth} y2={tick.y} stroke="var(--color-border)" strokeWidth="1" />
          <text x={chart.plotLeft - 8} y={tick.y + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{tick.label}</text>
        </g>
      ))}
      <line x1={chart.plotLeft} y1={chart.baseline} x2={chart.plotLeft + chart.plotWidth} y2={chart.baseline} stroke="var(--color-input-border)" strokeWidth="1" />
        {chart.bars.map((bar) => (
          <g key={bar.month} className="group">
          <title>{`${bar.month}: ${bar.amountText}`}</title>
            <rect
              x={bar.hitX}
              y={chart.plotTop}
              width={bar.hitWidth}
              height={chart.plotHeight}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`Tháng ${bar.month.slice(5, 7)}/${monthlyChart.year}: ${bar.amountText}`}
              className="cursor-pointer outline-none focus-visible:stroke-primary focus-visible:stroke-2"
            />
          {bar.amount > 0 && (
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx="3"
              fill={bar.selected ? 'var(--color-accent)' : 'var(--color-primary)'}
            />
          )}
            <g
              role="tooltip"
              className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <rect
                x={bar.tooltipX}
                y={bar.tooltipY}
                width="170"
                height="58"
                rx="3"
                fill="var(--color-card)"
                stroke="var(--color-border)"
                strokeWidth="1"
              />
              <text x={bar.tooltipX + 10} y={bar.tooltipY + 23} className="fill-foreground text-sm">
                {`Tháng ${bar.month.slice(5, 7)}/${monthlyChart.year}`}
              </text>
              <text x={bar.tooltipX + 10} y={bar.tooltipY + 45} className="fill-primary text-sm font-medium">
                {`Công tác phí: ${bar.amountText}`}
              </text>
            </g>
          <text
            x={bar.x + bar.width / 2}
            y={chart.baseline + 24}
            textAnchor="middle"
            className={bar.selected ? 'fill-primary text-xs font-bold' : 'fill-muted-foreground text-xs'}
          >
            {bar.label}
          </text>
        </g>
      ))}
      {chart.emptyText && (
        <text x={chart.plotLeft + chart.plotWidth / 2} y={chart.plotTop + chart.plotHeight / 2} textAnchor="middle" className="fill-muted-foreground text-sm">
          {chart.emptyText}
        </text>
      )}
    </svg>
  );
}
