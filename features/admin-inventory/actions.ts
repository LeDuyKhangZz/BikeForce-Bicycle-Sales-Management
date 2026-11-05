'use server';

import { revalidatePath } from 'next/cache';

import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { ADMIN_INVENTORY_PATH } from '@/lib/operations/filters';
import { OPERATIONS_SYNC_MESSAGES } from '@/lib/operations/messages';
import { createClient } from '@/lib/supabase/server';
import { syncMisaInventorySchema } from '@/lib/validation/operations';
import { syncMisaInventoryFromApi } from '@/services/inventory';
import { getSessionProfile } from '@/services/profiles';
import type { ActionResult } from '@/types/action-result';

export type SyncInventoryActionState = ActionResult<{ notice: string }> | null;

export async function syncMisaInventoryAction(
  _previousState: SyncInventoryActionState,
  formData: FormData,
): Promise<SyncInventoryActionState> {
  const rawWarehouse = formData.get('warehouse');
  const parsed = syncMisaInventorySchema.safeParse({
    warehouse: typeof rawWarehouse === 'string' ? rawWarehouse : undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: OPERATIONS_SYNC_MESSAGES.VALIDATION_FAILED,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: 'UNAUTHORIZED',
      message: AUTH_MESSAGES.SESSION_EXPIRED,
    };
  }

  const profile = await getSessionProfile(supabase, user.id);
  if (!profile) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: AUTH_MESSAGES.PROFILE_MISSING,
    };
  }
  if (!profile.is_active) {
    return {
      ok: false,
      code: 'ACCOUNT_DISABLED',
      message: AUTH_MESSAGES.ACCOUNT_DISABLED,
    };
  }
  if (profile.role !== 'ADMIN') {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: OPERATIONS_SYNC_MESSAGES.FORBIDDEN,
    };
  }

  try {
    const summary = await syncMisaInventoryFromApi(supabase, {
      warehouseCode: parsed.data.warehouse,
    });

    revalidatePath(ADMIN_INVENTORY_PATH);

    return {
      ok: true,
      data: {
        notice: `Đã đồng bộ ${summary.warehouseCount.toLocaleString('vi-VN')} kho (${summary.itemCount.toLocaleString('vi-VN')} dòng tồn kho) từ MISA.`,
      },
    };
  } catch (error: unknown) {
    console.error('[syncMisaInventoryAction]', error);
    const isMissingCreds =
      error instanceof Error && error.message === 'MISSING_MISA_CREDENTIALS';

    return {
      ok: false,
      code: 'UNKNOWN',
      message: isMissingCreds
        ? OPERATIONS_SYNC_MESSAGES.MISSING_CREDENTIALS
        : OPERATIONS_SYNC_MESSAGES.INVENTORY_SYNC_FAILED,
    };
  }
}

