import type { ActionResult } from '@/types/action-result';

export type SetSystemAccountActiveState = ActionResult<{ notice: string }> | null;
