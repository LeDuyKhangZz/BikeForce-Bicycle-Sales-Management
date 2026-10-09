import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

export type CareSubmission = Database['public']['Tables']['customer_care_submissions']['Row'];
export type CareEvidence = Database['public']['Tables']['customer_care_evidence']['Row'];
export type CareSubmissionWithEvidence = CareSubmission & { evidence: CareEvidence[] };
export type CustomerCareReviewSummary = {
  status: Database['public']['Enums']['customer_care_status'];
  careDate: string;
  revocationReason: string | null;
};
export type PendingCareNotification = Pick<CareSubmission, 'id' | 'customer_name' | 'customer_code' | 'created_at'>;

export async function getOwnedCareCustomer(
  supabase: SupabaseClient<Database>,
  input: { periodMonth: string; employeeId: number; customerId: number },
) {
  const { data, error } = await supabase
    .from('misa_report119_customers')
    .select('misa_customer_id,misa_employee_id,period_month,customer_code,customer_name')
    .eq('period_month', input.periodMonth)
    .eq('misa_employee_id', input.employeeId)
    .eq('misa_customer_id', input.customerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCareSubmission(
  supabase: SupabaseClient<Database>,
  input: Database['public']['Tables']['customer_care_submissions']['Insert'],
): Promise<CareSubmission> {
  const { data, error } = await supabase
    .from('customer_care_submissions')
    .insert(input)
    .select('id,misa_customer_id,period_month,misa_employee_id,customer_code,customer_name,submitted_by,care_date,note,status,reviewed_by,reviewed_at,rejection_reason,revoked_by,revoked_at,revocation_reason,created_at,updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function addCareEvidence(
  supabase: SupabaseClient<Database>,
  rows: Database['public']['Tables']['customer_care_evidence']['Insert'][],
): Promise<void> {
  const { error } = await supabase.from('customer_care_evidence').insert(rows);
  if (error) throw error;
}

export async function listCareSubmissions(
  supabase: SupabaseClient<Database>,
  status?: Database['public']['Enums']['customer_care_status'],
): Promise<CareSubmissionWithEvidence[]> {
  let query = supabase
    .from('customer_care_submissions')
    .select('id,misa_customer_id,period_month,misa_employee_id,customer_code,customer_name,submitted_by,care_date,note,status,reviewed_by,reviewed_at,rejection_reason,revoked_by,revoked_at,revocation_reason,created_at,updated_at,evidence:customer_care_evidence(id,submission_id,cloudinary_asset_id,cloudinary_public_id,secure_url,resource_type,delivery_type,format,bytes,width,height,created_at)')
    .order('created_at', { ascending: false })
    .range(0, 99);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listApprovedCareSubmissions(
  supabase: SupabaseClient<Database>,
  page: number,
): Promise<{ rows: CareSubmissionWithEvidence[]; total: number }> {
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const { data, count, error } = await supabase
    .from('customer_care_submissions')
    .select('id,misa_customer_id,period_month,misa_employee_id,customer_code,customer_name,submitted_by,care_date,note,status,reviewed_by,reviewed_at,rejection_reason,revoked_by,revoked_at,revocation_reason,created_at,updated_at,evidence:customer_care_evidence(id,submission_id,cloudinary_asset_id,cloudinary_public_id,secure_url,resource_type,delivery_type,format,bytes,width,height,created_at)', { count: 'exact' })
    .eq('status', 'APPROVED')
    .order('reviewed_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function countPendingCareSubmissions(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  const { count, error } = await supabase
    .from('customer_care_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'PENDING');
  if (error) throw error;
  return count ?? 0;
}

export async function listPendingCareNotifications(
  supabase: SupabaseClient<Database>,
): Promise<PendingCareNotification[]> {
  const { data, error } = await supabase
    .from('customer_care_submissions')
    .select('id,customer_name,customer_code,created_at')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .range(0, 4);
  if (error) throw error;
  return data ?? [];
}

export async function getLatestCareReviewByCustomerIds(
  supabase: SupabaseClient<Database>,
  input: { periodMonth: string; employeeId: number; customerIds: number[] },
): Promise<Map<number, CustomerCareReviewSummary>> {
  if (input.customerIds.length === 0) return new Map();
  const latestByCustomer = new Map<number, CustomerCareReviewSummary>();
  const pageSize = 500;
  let offset = 0;

  while (true) {
    const { data, count, error } = await supabase
      .from('customer_care_submissions')
      .select('misa_customer_id,status,care_date,created_at,revocation_reason', { count: 'exact' })
      .eq('period_month', input.periodMonth)
      .eq('misa_employee_id', input.employeeId)
      .in('misa_customer_id', input.customerIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;

    for (const row of data ?? []) {
      if (!latestByCustomer.has(row.misa_customer_id)) {
        latestByCustomer.set(row.misa_customer_id, { status: row.status, careDate: row.care_date, revocationReason: row.revocation_reason });
      }
    }
    offset += pageSize;
    if (offset >= (count ?? 0)) break;
  }
  return latestByCustomer;
}

export async function listRecentlyApprovedCustomerIds(
  supabase: SupabaseClient<Database>,
  cutoff: string,
): Promise<number[]> {
  const customerIds = new Set<number>();
  const pageSize = 500;
  let offset = 0;

  while (true) {
    const { data, count, error } = await supabase
      .from('customer_care_submissions')
      .select('misa_customer_id', { count: 'exact' })
      .eq('status', 'APPROVED')
      .gte('care_date', cutoff)
      .order('misa_customer_id')
      .range(offset, offset + pageSize - 1);
    if (error) throw error;

    for (const row of data ?? []) {
      if (!Number.isSafeInteger(row.misa_customer_id)) {
        throw new Error('Mã khách hàng trong phiếu chăm sóc không hợp lệ.');
      }
      customerIds.add(row.misa_customer_id);
    }

    offset += pageSize;
    if (offset >= (count ?? 0)) break;
  }

  return [...customerIds];
}

export async function reviewCareSubmission(
  supabase: SupabaseClient<Database>,
  input: { id: string; adminId: string; status: 'APPROVED' | 'REJECTED'; rejectionReason: string | null },
): Promise<boolean> {
  const { data, error } = await supabase
    .from('customer_care_submissions')
    .update({ status: input.status, reviewed_by: input.adminId, reviewed_at: new Date().toISOString(), rejection_reason: input.rejectionReason })
    .eq('id', input.id)
    .eq('status', 'PENDING')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function revokeCareSubmission(
  supabase: SupabaseClient<Database>,
  input: { id: string; adminId: string; reason: string },
): Promise<boolean> {
  const { data, error } = await supabase
    .from('customer_care_submissions')
    .update({
      status: 'REVOKED',
      revoked_by: input.adminId,
      revoked_at: new Date().toISOString(),
      revocation_reason: input.reason,
    })
    .eq('id', input.id)
    .eq('status', 'APPROVED')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
