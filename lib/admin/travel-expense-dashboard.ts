import { formatCurrencyVND } from '@/lib/currency';

type TravelExpensePerson = {
  id: string;
  full_name: string;
  employee_code: string | null;
};

export type MonthlyExpenseAmount = { month: string; amount: number };

const CHART_WIDTH = 960;
const CHART_HEIGHT = 350;
const CHART_LEFT = 76;
const CHART_TOP = 20;
const CHART_RIGHT = 18;
const CHART_BOTTOM = 58;
const DONUT_RADIUS = 62;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

export type TravelExpenseDashboardModel = {
  totalPeople: number;
  enteredCount: number;
  missingCount: number;
  completionText: string;
  totalAmountText: string;
  missingPeople: readonly {
    id: string;
    fullName: string;
    employeeCode: string;
  }[];
};

export type TravelExpenseMonthlyChartModel = {
  year: string;
  donut: {
    circumference: number;
    selectedMonthLength: number;
    selectedMonthLabel: string;
    selectedAmountText: string;
    selectedPercentText: string;
    otherMonthsAmountText: string;
    otherMonthsPercentText: string;
    yearTotalText: string;
  };
  chart: {
    width: number;
    height: number;
    plotLeft: number;
    plotTop: number;
    plotWidth: number;
    plotHeight: number;
    baseline: number;
    ticks: readonly { y: number; label: string }[];
    bars: readonly {
      month: string;
      label: string;
      amount: number;
      amountText: string;
      x: number;
      y: number;
      width: number;
      height: number;
      hitX: number;
      hitWidth: number;
      tooltipX: number;
      tooltipY: number;
      selected: boolean;
      widthPercent: number;
    }[];
    emptyText: string | null;
  };
};

function formatCompactVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)} ₫`;
}

export function buildTravelExpenseDashboard(
  people: readonly TravelExpensePerson[],
  amounts: Readonly<Record<string, number | null>>,
): TravelExpenseDashboardModel {
  let enteredCount = 0;
  let totalAmount = 0;
  const missingPeople: TravelExpenseDashboardModel['missingPeople'][number][] = [];

  for (const person of people) {
    const amount = amounts[person.id];
    if (typeof amount === 'number') {
      enteredCount += 1;
      totalAmount += amount;
      continue;
    }
    missingPeople.push({
      id: person.id,
      fullName: person.full_name,
      employeeCode: person.employee_code ?? 'Chưa có mã nhân viên',
    });
  }

  const totalPeople = people.length;
  const completionPercent = totalPeople === 0 ? 0 : (enteredCount / totalPeople) * 100;
  return {
    totalPeople,
    enteredCount,
    missingCount: totalPeople - enteredCount,
    completionText: `${completionPercent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`,
    totalAmountText: formatCurrencyVND(totalAmount),
    missingPeople,
  };
}

export function buildTravelExpenseMonthlyChart(
  monthlyAmounts: readonly MonthlyExpenseAmount[],
  selectedPeriodMonth: string,
): TravelExpenseMonthlyChartModel {
  const year = selectedPeriodMonth.slice(0, 4);
  const selectedMonth = selectedPeriodMonth.slice(0, 7);
  const amountsByMonth = new Map(monthlyAmounts.map((entry) => [entry.month, entry.amount]));
  const monthRows = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`;
    return { month, amount: amountsByMonth.get(month) ?? 0, label: `T${index + 1}` };
  });
  const yearTotal = monthRows.reduce((sum, row) => sum + row.amount, 0);
  const selectedAmount = monthRows.find((row) => row.month === selectedMonth)?.amount ?? 0;
  const otherMonthsAmount = Math.max(0, yearTotal - selectedAmount);
  const selectedPercent = yearTotal === 0 ? 0 : (selectedAmount / yearTotal) * 100;
  const otherMonthsPercent = yearTotal === 0 ? 0 : 100 - selectedPercent;

  const maxAmount = Math.max(0, ...monthRows.map((row) => row.amount));
  const plotWidth = CHART_WIDTH - CHART_LEFT - CHART_RIGHT;
  const plotHeight = CHART_HEIGHT - CHART_TOP - CHART_BOTTOM;
  const baseline = CHART_TOP + plotHeight;
  const tickRatios = maxAmount === 0 ? [0] : [0, 0.25, 0.5, 0.75, 1];
  const ticks = tickRatios.map((ratio) => ({
    y: baseline - ratio * plotHeight,
    label: formatCompactVnd(maxAmount * ratio),
  }));
  const slotWidth = plotWidth / monthRows.length;
  const barWidth = Math.min(42, slotWidth * 0.56);
  const bars = monthRows.map((row, index) => {
    const height = maxAmount === 0 ? 0 : (row.amount / maxAmount) * plotHeight;
    const x = CHART_LEFT + index * slotWidth + (slotWidth - barWidth) / 2;
    const centerX = x + barWidth / 2;
    const tooltipWidth = 170;
    return {
      ...row,
      amountText: formatCurrencyVND(row.amount),
      x,
      y: baseline - height,
      width: barWidth,
      height,
      hitX: CHART_LEFT + index * slotWidth,
      hitWidth: slotWidth,
      tooltipX: Math.max(CHART_LEFT, Math.min(centerX - tooltipWidth / 2, CHART_LEFT + plotWidth - tooltipWidth)),
      tooltipY: Math.max(4, baseline - height - 68),
      selected: row.month === selectedMonth,
      widthPercent: maxAmount === 0 ? 0 : (row.amount / maxAmount) * 100,
    };
  });

  return {
    year,
    donut: {
      circumference: DONUT_CIRCUMFERENCE,
      selectedMonthLength: DONUT_CIRCUMFERENCE * selectedPercent / 100,
      selectedMonthLabel: `Tháng ${selectedMonth.slice(5, 7)}/${year}`,
      selectedAmountText: formatCurrencyVND(selectedAmount),
      selectedPercentText: `${selectedPercent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`,
      otherMonthsAmountText: formatCurrencyVND(otherMonthsAmount),
      otherMonthsPercentText: `${otherMonthsPercent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`,
      yearTotalText: formatCompactVnd(yearTotal),
    },
    chart: {
      width: CHART_WIDTH,
      height: CHART_HEIGHT,
      plotLeft: CHART_LEFT,
      plotTop: CHART_TOP,
      plotWidth,
      plotHeight,
      baseline,
      ticks,
      bars,
      emptyText: yearTotal === 0 ? `Chưa có công tác phí trong năm ${year}` : null,
    },
  };
}
