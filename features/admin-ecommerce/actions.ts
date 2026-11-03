'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ marketplace_code: z.enum(['TIKTOK', 'SHOPEE']), amount: z.coerce.number().int().nonnegative() });

export async function saveMarketplaceAdTopUp(formData: FormData): Promise<void> {
  await requireRole('ADMIN');
  const parsed = schema.safeParse({ marketplace_code: formData.get('marketplace_code'), amount: formData.get('amount') });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_marketplace_ad_top_up', { p_marketplace_code: parsed.data.marketplace_code, p_amount: parsed.data.amount });
  if (error) console.error('[saveMarketplaceAdTopUp]', error.code, error.message);
  revalidatePath('/admin/ecommerce');
}
