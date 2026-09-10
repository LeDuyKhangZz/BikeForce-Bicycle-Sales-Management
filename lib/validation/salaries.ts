import { z } from 'zod';

import { parseCurrencyInput } from '@/lib/currency';
import { MAX_REVENUE_VND } from '@/lib/validation/report';

export const salaryMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const salaryInputSchema = z
  .unknown()
  .transform((raw, context): number | null => {
    if (raw === null || (typeof raw === 'string' && raw.trim() === '')) return null;
    if (typeof raw !== 'string') {
      context.addIssue({ code: 'custom', message: 'Chỉ nhập số tiền, ví dụ 15.000.000.' });
      return z.NEVER;
    }

    const amount = parseCurrencyInput(raw);
    if (amount === null) {
      context.addIssue({ code: 'custom', message: 'Chỉ nhập số tiền, ví dụ 15.000.000.' });
      return z.NEVER;
    }
    if (amount > MAX_REVENUE_VND) {
      context.addIssue({ code: 'custom', message: 'Số quá lớn, hãy kiểm tra lại số chữ số.' });
      return z.NEVER;
    }
    return amount;
  });

export function salaryFieldName(salesId: string): string {
  return `amount__${salesId}`;
}
