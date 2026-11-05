'use server';

import { revalidatePath } from 'next/cache';

import { AUTH_MESSAGES } from '@/lib/auth/messages';
import { getVietnamMonthRange } from '@/lib/date';
import { ADMIN_ORDERS_PATH } from '@/lib/operations/filters';
import { OPERATIONS_SYNC_MESSAGES } from '@/lib/operations/messages';
import { createClient } from '@/lib/supabase/server';
import { syncMisaOrdersSchema } from '@/lib/validation/operations';
import { syncMisaOrdersFromApi } from '@/services/orders';
import { getSessionProfile } from '@/services/profiles';
import type { ActionResult } from '@/types/action-result';

export type SyncOrdersActionState = ActionResult<{ notice: string }> | null;

export async function syncMisaOrdersAction(
  _previousState: SyncOrdersActionState,
  formData: FormData,
): Promise<SyncOrdersActionState> {
  const rawMonth = formData.get('month');
  const parsed = syncMisaOrdersSchema.safeParse({
    month: typeof rawMonth === 'string' ? rawMonth : undefined,
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

  const monthRange =
    parsed.data.month !== null ? getVietnamMonthRange(parsed.data.month) : null;

  try {
    const summary = await syncMisaOrdersFromApi(supabase, {
      fromDate: monthRange?.from ?? null,
    });

    revalidatePath(ADMIN_ORDERS_PATH);

    return {
      ok: true,
      data: {
        notice: `Đã đồng bộ ${summary.orderCount.toLocaleString('vi-VN')} đơn hàng và ${summary.lineCount.toLocaleString('vi-VN')} dòng mặt hàng từ MISA.`,
      },
    };
  } catch (error: unknown) {
    console.error('[syncMisaOrdersAction]', error);
    const isMissingCreds =
      error instanceof Error && error.message === 'MISSING_MISA_CREDENTIALS';

    return {
      ok: false,
      code: 'UNKNOWN',
      message: isMissingCreds
        ? OPERATIONS_SYNC_MESSAGES.MISSING_CREDENTIALS
        : OPERATIONS_SYNC_MESSAGES.ORDERS_SYNC_FAILED,
    };
  }
}

