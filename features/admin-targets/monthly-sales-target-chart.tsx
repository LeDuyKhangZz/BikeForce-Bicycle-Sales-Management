'use client';

import { useState } from 'react';

import { Card, CardTitle } from '@/components/ui/card';
import {
  buildMonthlySalesTargetTrend,
  getMonthlyTrendNearestIndex,
  type MonthlySalesTargetTrendPoint,
} from '@/lib/admin/monthly-sales-target-trend';

type Props = {
  month: string;
  points: readonly MonthlySalesTargetTrendPoint[];
};

const WIDTH = 720;
const LEFT = 24;
const RIGHT = 696;
const TOP = 20;
const BOTTOM = 180;

export function MonthlySalesTargetChart({ month, points }: Props) {
  const model = buildMonthlySalesTargetTrend(points, month);
  const selectedIndex = model.points.findIndex((point) => point.periodMonth.startsWith(month));
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const selected = model.points[activeIndex] ?? model.points[0];
  const x = (index: number) => LEFT + (index * (RIGHT - LEFT)) / 11;
  const line = (key: 'targetY' | 'actualY') => model.points.map((point, index) => `${x(index)},${point[key]}`).join(' ');
  const selectNearestMonth = (clientX: number, left: number, width: number) => {
    if (width <= 0) return;
    setActiveIndex(getMonthlyTrendNearestIndex((clientX - left) / width, model.points.length));
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle className="text-base">Mục tiêu doanh thu theo tháng · {model.year}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tổng chỉ tiêu công ty giao và doanh thu thực đạt từ báo cáo cuối ngày đã hoàn tất. Đơn vị: triệu đồng.
        </p>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2"><span aria-hidden="true" className="size-3 rounded-full bg-success" />Mục tiêu</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="size-3 rounded-full bg-status-info-fg" />Đã thực hiện</li>
      </ul>

      <svg
        viewBox={`0 0 ${WIDTH} 220`}
        role="img"
        aria-label={`Biểu đồ mục tiêu và thực hiện doanh thu theo 12 tháng năm ${model.year}. Tháng đang chọn: mục tiêu ${selected?.targetText ?? '0'}, thực hiện ${selected?.actualText ?? '0'}.`}
        className="aspect-[36/11] w-full touch-manipulation"
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          selectNearestMonth(event.clientX, bounds.left, bounds.width);
        }}
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          selectNearestMonth(event.clientX, bounds.left, bounds.width);
        }}
      >
        {model.gridValues.map((value, index) => {
          const y = TOP + (index * (BOTTOM - TOP)) / 4;
          return <g key={y} aria-hidden="true">
            <line x1={LEFT} x2={RIGHT} y1={y} y2={y} stroke="var(--color-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x={LEFT - 8} y={y + 4} textAnchor="end" fill="var(--color-muted-foreground)" fontSize="12">{model.gridLabels[index]}</text>
          </g>;
        })}
        <line aria-hidden="true" x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} stroke="var(--color-input-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <polyline aria-hidden="true" points={line('targetY')} fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <polyline aria-hidden="true" points={line('actualY')} fill="none" stroke="var(--color-status-info-fg)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {model.points.map((point, index) => <g key={point.periodMonth}>
          <circle cx={x(index)} cy={point.targetY} r="4" fill="var(--color-success)" />
          <circle cx={x(index)} cy={point.actualY} r="4" fill="var(--color-status-info-fg)" />
          {point.targetSalesAmount > 0 && <text x={x(index)} y={Math.max(14, point.targetY - 9)} textAnchor="middle" fill="var(--color-foreground)" fontSize="12" fontWeight="600">{point.targetChartText}</text>}
          {point.actualSalesAmount > 0 && <text x={x(index)} y={Math.min(BOTTOM - 8, point.actualY + 16)} textAnchor="middle" fill="var(--color-muted-foreground)" fontSize="12" fontWeight="600">{point.actualChartText}</text>}
          <circle
            cx={x(index)} cy={(point.targetY + point.actualY) / 2} r="18" fill="transparent"
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`Tháng ${index + 1}/${model.year}: mục tiêu ${point.targetFullText}, đã thực hiện ${point.actualFullText}`}
            onPointerEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onClick={() => setActiveIndex(index)}
          />
          <title>{`Tháng ${index + 1}/${model.year} — Mục tiêu: ${point.targetFullText}; Đã thực hiện: ${point.actualFullText}`}</title>
          <text x={x(index)} y="207" textAnchor="middle" fill="var(--color-muted-foreground)" fontSize="13">{index + 1}</text>
        </g>)}
        {selected && (() => {
          const selectedX = x(activeIndex);
          const tooltipWidth = 220;
          const tooltipX = selectedX > WIDTH - tooltipWidth - 16 ? selectedX - tooltipWidth - 12 : selectedX + 12;
          const tooltipY = 42;
          return <g aria-hidden="true">
            <line x1={selectedX} x2={selectedX} y1={TOP} y2={BOTTOM} stroke="var(--color-input-border)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height="54" rx="6" fill="var(--color-card)" stroke="var(--color-border)" />
            <text x={tooltipX + 12} y={tooltipY + 22} fill="var(--color-foreground)" fontSize="13">Mục tiêu: {selected.targetChartText} triệu</text>
            <text x={tooltipX + 12} y={tooltipY + 42} fill="var(--color-muted-foreground)" fontSize="13">Đã thực hiện: {selected.actualChartText} triệu</text>
          </g>;
        })()}
      </svg>

      {selected && <p aria-live="polite" className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground"><span className="font-medium">Tháng {selected.label.slice(1)}/{model.year}:</span> mục tiêu <span className="tabular font-semibold">{selected.targetFullText}</span>, đã thực hiện <span className="tabular font-semibold">{selected.actualFullText}</span>.</p>}

      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-heading">Xem số liệu dạng bảng</summary>
        <ul className="grid grid-cols-1 gap-2 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
          {model.points.map((point) => <li key={point.periodMonth} className="rounded-md bg-muted px-3 py-2 text-sm"><p className="font-medium text-heading">{point.label}/{model.year}</p><p className="tabular text-muted-foreground">Mục tiêu: {point.targetText}</p><p className="tabular text-muted-foreground">Thực hiện: {point.actualText}</p></li>)}
        </ul>
      </details>
    </Card>
  );
}

