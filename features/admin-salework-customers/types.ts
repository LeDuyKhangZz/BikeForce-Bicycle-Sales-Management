import type { ActionResult } from '@/types/action-result';

export type SaleWorkCustomerSyncState = ActionResult<{ notice: string }> | null;
