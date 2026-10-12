import { formatCurrencyVND } from '@/lib/currency';

type TravelExpensePerson = {
  id: string;
  full_name: string;
  employee_code: string | null;
};

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
