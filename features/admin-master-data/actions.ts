'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireRole } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import {
  approveCustomerIdentityLink,
  approveProductAliasMapping,
} from '@/services/admin-master-data';

const linkSchema = z.object({
  sourceId: z.string().uuid(),
  canonicalId: z.string().uuid(),
});

export async function linkCustomerIdentity(formData: FormData): Promise<void> {
  await requireRole('ADMIN');
  const parsed = linkSchema.safeParse({
    sourceId: formData.get('sourceId'),
    canonicalId: formData.get('canonicalId'),
  });
  if (!parsed.success) redirect('/admin/master-data?result=invalid');

  try {
    const supabase = await createClient();
    await approveCustomerIdentityLink(supabase, parsed.data.sourceId, parsed.data.canonicalId);
  } catch (error) {
    console.error('[linkCustomerIdentity]', error instanceof Error ? error.message : 'Unknown error');
    redirect('/admin/master-data?result=customer-error');
  }

  revalidatePath('/admin/master-data');
  revalidatePath('/admin/customers');
  redirect('/admin/master-data?result=customer-linked');
}

export async function linkProductAlias(formData: FormData): Promise<void> {
  await requireRole('ADMIN');
  const parsed = linkSchema.safeParse({
    sourceId: formData.get('sourceId'),
    canonicalId: formData.get('canonicalId'),
  });
  if (!parsed.success) redirect('/admin/master-data?result=invalid');

  try {
    const supabase = await createClient();
    await approveProductAliasMapping(supabase, parsed.data.sourceId, parsed.data.canonicalId);
  } catch (error) {
    console.error('[linkProductAlias]', error instanceof Error ? error.message : 'Unknown error');
    redirect('/admin/master-data?result=product-error');
  }

  revalidatePath('/admin/master-data');
  revalidatePath('/admin/inventory');
  redirect('/admin/master-data?result=product-linked');
}
