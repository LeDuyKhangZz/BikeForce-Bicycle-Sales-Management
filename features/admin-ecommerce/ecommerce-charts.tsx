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

function ChartEmpty() {
  return <div className="grid min-h-48 place-items-center rounded-xl bg-slate-50 px-4 text-center text-sm text-muted-foreground">Chưa có đủ dữ liệu Pancake để vẽ biểu đồ.</div>;
}

export function EcommerceCharts({ trend }: Props) {
  return (
    <section aria-label="Biểu đồ Sàn thương mại điện tử" className="grid min-w-0 gap-4">
      <LineChart trend={trend} />
    </section>
  );
}
