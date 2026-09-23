import { z } from 'zod';

export const misaCustomerPlanSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  employeeId: z.coerce.number().int().positive(),
  customerId: z.coerce.number().int().positive(),
  monthlyFrequency: z.coerce.number().int().min(0).max(31),
  committedSales: z.preprocess(
    (value) => value === '' || value === null ? null : value,
    z.coerce.number().int().min(0).max(999_999_999_999).nullable(),
  ),
});
