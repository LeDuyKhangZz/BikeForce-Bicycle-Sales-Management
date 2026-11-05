'use client';

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { formatCurrencyVND } from '@/lib/currency';
import type { EcommerceDashboardTrend } from '@/lib/reports/ecommerce-dashboard';

type Props = { trend: EcommerceDashboardTrend };

function LineChart({ trend }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = trend.dailyRevenue;
  const maxValue = Math.max(...points.map((point) => point.revenue), 1);
  const xFor = (index: number) => points.length < 2 ? 360 : 56 + (index * 600) / (points.length - 1);
  const yFor = (value: number) => 190 - (value / maxValue) * 150;
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point.revenue)}`).join(' ');
  const area = points.length > 0 ? `${path} L ${xFor(points.length - 1)} 192 L ${xFor(0)} 192 Z` : '';
  const active = activeIndex === null ? null : points[activeIndex];

  return (
    <Card className="relative flex min-w-0 flex-col gap-3 overflow-hidden bg-gradient-to-br from-white to-sky-50/60">
      <div>
        <CardTitle>Doanh thu theo ngày</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">7 ngày có báo cáo gần nhất</p>
      </div>
      {active && (
        <div className="absolute right-4 top-3 z-10 rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-lg" role="status">
          <p className="font-semibold text-heading">{active.label}</p>
          <p className="text-primary">Doanh thu: {active.display}</p>
        </div>
      )}
      {points.length === 0 ? <ChartEmpty /> : (
        <svg viewBox="0 0 720 250" role="img" aria-label="Biểu đồ doanh thu theo ngày" className="h-56 w-full overflow-visible">
          <defs><linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3188db" stopOpacity=".22" /><stop offset="100%" stopColor="#3188db" stopOpacity=".01" /></linearGradient></defs>
          {[0, 1, 2, 3].map((step) => {
            const value = maxValue * (3 - step) / 3;
            const y = 40 + step * 50;
            return <g key={step}><line x1="56" x2="666" y1={y} y2={y} stroke="#e3eaf2" /><text x="48" y={y + 4} textAnchor="end" className="fill-slate-500 text-[11px]">{formatCurrencyVND(Math.round(value))}</text></g>;
          })}
          <path d={area} fill="url(#revenue-area)" />
          <path d={path} fill="none" stroke="#3286d5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <g key={point.date} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}>
              <circle cx={xFor(index)} cy={yFor(point.revenue)} r="12" fill="transparent" tabIndex={0} aria-label={`${point.label}: ${point.display}`} />
              <circle cx={xFor(index)} cy={yFor(point.revenue)} r={activeIndex === index ? 6 : 4.5} fill="white" stroke="#3286d5" strokeWidth="3" pointerEvents="none" />
              <text x={xFor(index)} y="222" textAnchor="middle" className="fill-slate-600 text-[11px]">{point.label}</text>
            </g>
          ))}
        </svg>
      )}
    </Card>
  );
}

function DonutChart({ trend }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const rows = trend.platformMix.filter((row) => row.amount > 0);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const circumference = 2 * Math.PI * 66;
  let accumulated = 0;

  return (
    <Card className="relative flex min-w-0 flex-col gap-3 overflow-hidden bg-gradient-to-br from-white to-violet-50/50">
      <div><CardTitle>Tỷ trọng doanh thu theo sàn</CardTitle><p className="mt-1 text-xs text-muted-foreground">{trend.latestDateLabel ? `Báo cáo ${trend.latestDateLabel}` : 'Chưa có báo cáo tài chính'}</p></div>
      {activeIndex !== null && rows[activeIndex] && (
        <div className="absolute right-3 top-3 z-10 rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-lg" role="status">
          <p className="font-semibold text-heading">{rows[activeIndex].name}</p>
          <p className="text-primary">{rows[activeIndex].display} · {rows[activeIndex].percentage.toFixed(1)}%</p>
        </div>
      )}
      {rows.length === 0 ? <ChartEmpty /> : (
        <div className="grid min-h-48 grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(150px,1fr)_minmax(130px,1fr)]">
          <svg viewBox="0 0 200 200" role="img" aria-label="Biểu đồ tỷ trọng doanh thu theo sàn" className="mx-auto size-48 max-w-full -rotate-90">
            <circle cx="100" cy="100" r="66" fill="none" stroke="#edf1f6" strokeWidth="24" />
            {rows.map((row, index) => {
              const length = (row.amount / total) * circumference;
              const offset = accumulated;
              accumulated += length;
              return <circle key={row.name} cx="100" cy="100" r="66" fill="none" stroke={row.color} strokeWidth={activeIndex === index ? 28 : 24} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)} tabIndex={0} aria-label={`${row.name} ${row.display}, ${row.percentage.toFixed(1)}%`} />;
            })}
          </svg>
          <div className="flex flex-col gap-3">
            <p className="text-center text-xl font-bold tabular-nums text-heading">{formatCurrencyVND(total)}<span className="mt-1 block text-xs font-normal text-muted-foreground">Tổng doanh số</span></p>
            {trend.platformMix.map((row) => (
              <button type="button" key={row.name} onMouseEnter={() => setActiveIndex(rows.findIndex((item) => item.name === row.name))} onMouseLeave={() => setActiveIndex(null)} className="flex items-start gap-2 text-left text-sm">
                <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="min-w-0 flex-1"><span className="block text-muted-foreground">{row.name}</span><span className="font-semibold text-heading">{row.display}</span></span>
                <span className="font-semibold text-heading">{row.percentage.toFixed(1)}%</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function OrderSourceChart({ trend }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const maxValue = Math.max(...trend.latestOrderSources.map((row) => row.count), 1);
  return (
    <Card className="relative flex min-w-0 flex-col gap-3 overflow-hidden bg-gradient-to-br from-white to-orange-50/40">
      <div><CardTitle>Đơn hàng theo nguồn</CardTitle><p className="mt-1 text-xs text-muted-foreground">Đơn hoàn tất theo báo cáo Pancake</p></div>
      {activeIndex !== null && trend.latestOrderSources[activeIndex] && (
        <div className="absolute right-3 top-3 z-10 rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-lg" role="status">
          <p className="font-semibold text-heading">{trend.latestOrderSources[activeIndex].name}</p>
          <p className="text-primary">Đơn hàng: {trend.latestOrderSources[activeIndex].count}</p>
        </div>
      )}
      {trend.latestOrderSources.length === 0 ? <ChartEmpty /> : (
        <div className="flex flex-1 flex-col justify-center gap-5 py-3">
          {trend.latestOrderSources.map((source, index) => (
            <div key={source.name} className="grid grid-cols-[5rem_1fr_2rem] items-center gap-3 text-sm" onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)} tabIndex={0} aria-label={`${source.name}: ${source.count} đơn`}>
              <span className="truncate text-right text-xs text-muted-foreground">{source.name}</span>
              <span className="h-6 overflow-hidden rounded-md bg-slate-100"><span className="block h-full rounded-md transition-[width]" style={{ width: `${Math.max(source.count > 0 ? 3 : 0, (source.count / maxValue) * 100)}%`, backgroundColor: source.color }} /></span>
              <span className="text-right font-semibold tabular-nums text-heading">{source.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ChartEmpty() {
  return <div className="grid min-h-48 place-items-center rounded-xl bg-slate-50 px-4 text-center text-sm text-muted-foreground">Chưa có đủ dữ liệu Pancake để vẽ biểu đồ.</div>;
}

export function EcommerceCharts({ trend }: Props) {
  return (
    <section aria-label="Biểu đồ Sàn thương mại điện tử" className="grid gap-4 xl:grid-cols-3">
      <LineChart trend={trend} />
      <DonutChart trend={trend} />
      <OrderSourceChart trend={trend} />
    </section>
  );
}
