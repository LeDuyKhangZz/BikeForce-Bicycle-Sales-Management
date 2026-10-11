import { z } from 'zod';

import { isValidVietnamDate } from '@/lib/date';
import { HATDE_BRANCH_CODES } from '@/lib/hatde/branches';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MAX_BIGINT_AS_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

const branchSchema = z.object({
  branch_code: z.enum(HATDE_BRANCH_CODES),
  revenue: z.number().int().min(0).max(MAX_BIGINT_AS_SAFE_INTEGER),
  transactions: z.number().int().min(0),
  vs_yesterday: z.number().finite(),
  vs_last_week: z.number().finite(),
});

export const hatdeSnapshotSchema = z
  .object({
    report_date: z
      .string()
      .regex(DATE_PATTERN, 'report_date phải có dạng YYYY-MM-DD')
      .refine(isValidVietnamDate, 'report_date không phải ngày hợp lệ'),
    report_time: z.string().regex(TIME_PATTERN, 'report_time phải có dạng HH:mm'),
    branches: z.array(branchSchema).min(1, 'Cần ít nhất 1 chi nhánh').max(6),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>();
    for (const [index, branch] of value.branches.entries()) {
      if (seen.has(branch.branch_code)) {
        context.addIssue({
          code: 'custom',
          path: ['branches', index, 'branch_code'],
          message: 'Mã chi nhánh bị trùng',
        });
      }
      seen.add(branch.branch_code);
    }
  });

export const hatdeUpsertResultSchema = z.object({
  id: z.string().uuid(),
  created: z.boolean(),
});

export type HatdeSnapshotInput = z.infer<typeof hatdeSnapshotSchema>;
