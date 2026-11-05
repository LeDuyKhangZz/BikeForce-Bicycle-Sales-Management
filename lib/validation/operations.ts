import { z } from 'zod';

const ISO_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const syncMisaOrdersSchema = z.object({
  month: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && ISO_MONTH_REGEX.test(val) ? val : null)),
});

export const syncMisaInventorySchema = z.object({
  warehouse: z
    .string()
    .trim()
    .max(40, 'Mã kho tối đa 40 ký tự.')
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type SyncMisaOrdersInput = z.infer<typeof syncMisaOrdersSchema>;
export type SyncMisaInventoryInput = z.infer<typeof syncMisaInventorySchema>;

