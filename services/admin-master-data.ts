import { z } from 'zod';

import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const uuidSchema = z.string().uuid();
const customerCandidateSchema = z.object({
  source_customer_id: uuidSchema,
  source_id: z.string(),
  source_name: z.string(),
  source_code: z.string().nullable(),
  normalized_phone: z.string(),
  canonical_customer_id: uuidSchema,
  canonical_name: z.string(),
  canonical_code: z.string().nullable(),
  total_count: z.number().or(z.string().regex(/^\d+$/)).transform(Number),
});
const customerReviewSchema = z.object({
  source_customer_id: uuidSchema,
  source_id: z.string(),
  source_name: z.string(),
  source_code: z.string().nullable(),
  phone_raw: z.string().nullable(),
  normalized_phone: z.string().nullable(),
  review_reason: z.string(),
  suggested_misa: z.array(z.object({
    id: uuidSchema,
    customer_code: z.string().nullable(),
    customer_name: z.string(),
    normalized_phone: z.string().nullable(),
    match_reason: z.string(),
  })),
  total_count: z.number().or(z.string().regex(/^\d+$/)).transform(Number),
});
const unmappedProductSchema = z.object({
  source_product_id: uuidSchema,
  source_system: z.string(),
  source_id: z.string(),
  product_code: z.string(),
  product_name: z.string(),
  color: z.string(),
  size: z.string(),
  misa_variants: z.array(z.object({
    id: uuidSchema,
    product_code: z.string(),
    product_name: z.string(),
    color: z.string(),
    size: z.string(),
  })),
  total_count: z.number().or(z.string().regex(/^\d+$/)).transform(Number),
});

export type CustomerIdentityCandidate = z.infer<typeof customerCandidateSchema>;
export type CustomerIdentityReview = z.infer<typeof customerReviewSchema>;
export type UnmappedProductAlias = z.infer<typeof unmappedProductSchema>;

async function callAdminRpc(
  supabase: SupabaseClient<Database>,
  functionName: string,
  parameters: Record<string, unknown>,
): Promise<unknown> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new Error('Phiên Admin đã hết hạn. Vui lòng đăng nhập lại.');

  const response = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: getSupabaseAnonKey(),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(parameters),
    cache: 'no-store',
  });
  if (!response.ok) {
    const responseText = await response.text();
    let errorCode: string | undefined;
    let errorMessage: string | undefined;
    try {
      const errorBody: unknown = JSON.parse(responseText);
      const parsedError = z.object({ code: z.string().optional(), message: z.string().optional() }).safeParse(errorBody);
      if (parsedError.success) {
        errorCode = parsedError.data.code;
        errorMessage = parsedError.data.message;
      }
    } catch {
      // Keep a generic server log if PostgREST did not return JSON.
    }
    console.error('[admin-master-data-rpc]', {
      functionName,
      status: response.status,
      code: errorCode,
      message: errorMessage,
    });
    throw new Error('Không thể tải hoặc lưu dữ liệu chuẩn hóa. Kiểm tra migration và quyền Admin.');
  }
  if (response.status === 204) return null;
  const body: unknown = await response.json();
  return body;
}

export async function listCustomerIdentityCandidates(
  supabase: SupabaseClient<Database>,
  page: number,
): Promise<{ rows: CustomerIdentityCandidate[]; total: number }> {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const value = await callAdminRpc(supabase, 'list_customer_identity_candidates', {
    p_limit: 50,
    p_offset: (safePage - 1) * 50,
  });
  const rows = z.array(customerCandidateSchema).parse(value);
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export async function listCustomerIdentityReview(
  supabase: SupabaseClient<Database>,
  page: number,
): Promise<{ rows: CustomerIdentityReview[]; total: number }> {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const value = await callAdminRpc(supabase, 'list_customer_identity_review', {
    p_limit: 50,
    p_offset: (safePage - 1) * 50,
  });
  const rows = z.array(customerReviewSchema).parse(value);
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export async function listUnmappedProductAliases(
  supabase: SupabaseClient<Database>,
  page: number,
): Promise<{ rows: UnmappedProductAlias[]; total: number }> {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const value = await callAdminRpc(supabase, 'list_unmapped_product_aliases', {
    p_limit: 50,
    p_offset: (safePage - 1) * 50,
  });
  const rows = z.array(unmappedProductSchema).parse(value);
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export async function approveCustomerIdentityLink(
  supabase: SupabaseClient<Database>,
  sourceCustomerId: string,
  canonicalCustomerId: string,
): Promise<void> {
  await callAdminRpc(supabase, 'approve_customer_identity_link', {
    p_source_customer_id: sourceCustomerId,
    p_canonical_customer_id: canonicalCustomerId,
  });
}

export async function approveProductAliasMapping(
  supabase: SupabaseClient<Database>,
  sourceProductId: string,
  canonicalProductId: string,
): Promise<void> {
  await callAdminRpc(supabase, 'approve_product_alias_mapping', {
    p_source_product_id: sourceProductId,
    p_canonical_product_id: canonicalProductId,
  });
}
