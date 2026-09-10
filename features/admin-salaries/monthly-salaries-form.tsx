'use client';

import { useActionState, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrencyVND, formatThousands, parseCurrencyInput } from '@/lib/currency';
import { salaryFieldName } from '@/lib/validation/salaries';

import { saveSalariesAction, type SaveSalariesState } from './actions';

export type SalarySalesRow = {
  id: string;
  full_name: string;
  employee_code: string | null;
  is_active: boolean;
};

type Props = {
  month: string;
  monthLabel: string;
  salesList: readonly SalarySalesRow[];
  currentAmounts: Readonly<Record<string, number | null>>;
};

function initialValues(
  salesList: readonly SalarySalesRow[],
  currentAmounts: Props['currentAmounts'],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const sales of salesList) {
    const amount = currentAmounts[sales.id];
    values[sales.id] = typeof amount === 'number' ? formatThousands(amount) : '';
  }
  return values;
}

export function MonthlySalariesForm({
  month,
  monthLabel,
  salesList,
  currentAmounts,
}: Props) {
  const [state, formAction, isPending] = useActionState<SaveSalariesState, FormData>(
    saveSalariesAction,
    null,
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(salesList, currentAmounts),
  );

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const total = salesList.reduce(
    (sum, sales) => sum + (parseCurrencyInput(values[sales.id] ?? '') ?? 0),
    0,
  );

  function setAmount(salesId: string, value: string) {
    setValues((previous) => ({ ...previous, [salesId]: value }));
  }

  function formatAmount(salesId: string, value: string) {
    const amount = parseCurrencyInput(value);
    if (amount !== null) setAmount(salesId, formatThousands(amount));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="month" value={month} />

      {state?.ok && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-border bg-status-exceeded-bg px-3 py-3 text-sm text-status-exceeded-fg">
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          {state.data.notice}
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" className="rounded-lg border border-destructive bg-card px-3 py-3 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {salesList.map((sales) => {
          const field = salaryFieldName(sales.id);
          const value = values[sales.id] ?? '';
          const parsedAmount = parseCurrencyInput(value);
          const error = fieldErrors[field]?.[0];

          return (
            <li key={sales.id}>
              <Card className="flex h-full flex-col gap-3">
                <div>
                  <p className="text-base font-semibold text-heading">{sales.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {sales.employee_code ?? 'Chưa có mã nhân viên'}
                    {!sales.is_active && ' · đã vô hiệu hoá'}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field}>
                    Lương <span className="sr-only">của {sales.full_name}</span>
                  </Label>
                  <Input
                    id={field}
                    name={field}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9.]*"
                    autoComplete="off"
                    enterKeyHint="next"
                    placeholder="Chưa nhập"
                    disabled={isPending}
                    invalid={Boolean(error)}
                    aria-describedby={`${field}-${error ? 'error' : 'helper'}`}
                    value={value}
                    onChange={(event) => setAmount(sales.id, event.currentTarget.value)}
                    onBlur={(event) => formatAmount(sales.id, event.currentTarget.value)}
                  />
                  {error ? (
                    <p id={`${field}-error`} role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  ) : (
                    <p id={`${field}-helper`} className="text-sm text-muted-foreground">
                      {parsedAmount === null ? 'Để trống nếu chưa nhập.' : formatCurrencyVND(parsedAmount)}
                    </p>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <Card className="flex flex-col gap-1">
        <CardTitle className="text-base">Tổng {monthLabel}</CardTitle>
        <p className="tabular text-xl font-bold break-words text-heading">{formatCurrencyVND(total)}</p>
      </Card>

      <Button type="submit" size="lg" loading={isPending} loadingText="Đang lưu lương…">
        <Save aria-hidden="true" className="size-5" />
        Lưu lương {monthLabel}
      </Button>
    </form>
  );
}
