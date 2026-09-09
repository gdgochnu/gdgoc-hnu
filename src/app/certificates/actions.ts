'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { issueCertificatesBatch } from '@/lib/certificates/issue-engine';
import type { IssueCertificatesBatchInput, IssueCertificatesResult } from '@/types/certificates';
import { revalidatePath } from 'next/cache';

/**
 * Server action to issue a batch of certificates
 */
export async function issueBatchAction(
  input: IssueCertificatesBatchInput
): Promise<IssueCertificatesResult> {
  const context = await getUserContext();
  if (!context.user || !context.profile) {
    return {
      success: false,
      totalRequested: input.recipients.length,
      totalIssued: 0,
      issuedCertificates: [],
      errors: ['Unauthorized. Please sign in.'],
    };
  }

  const isLeadership = [
    'president',
    'co_president',
    'branch_head',
    'committee_head',
    'committee_co_head',
  ].includes(context.profile.role);

  if (!isLeadership) {
    return {
      success: false,
      totalRequested: input.recipients.length,
      totalIssued: 0,
      issuedCertificates: [],
      errors: ['Insufficient permissions to issue chapter certificates.'],
    };
  }

  const result = await issueCertificatesBatch(input, context.profile.id);
  revalidatePath('/certificates');
  revalidatePath('/profile');
  revalidatePath('/stats');
  return result;
}

/**
 * Server action to fetch issued certificates with pagination and search
 */
export async function fetchIssuedCertificatesAction(query?: string) {
  const admin = createAdminClient();

  let q = admin
    .from('certificates')
    .select(`
      id,
      title,
      certificate_number,
      verification_code,
      issue_date,
      recipient_name,
      recipient_email,
      pdf_drive_url,
      event_id,
      issued_by,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (query && query.trim()) {
    q = q.or(`recipient_name.ilike.%${query}%,certificate_number.ilike.%${query}%,title.ilike.%${query}%`);
  }

  const { data, error } = await q;

  if (error) {
    console.error('fetchIssuedCertificatesAction error:', error);
    return { success: false, data: [], error: error.message };
  }

  return { success: true, data: data || [] };
}

/**
 * Server action to delete an issued certificate (Leadership gated)
 */
export async function deleteIssuedCertificateAction(certificateId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const isLeadership = [
      'president',
      'co_president',
      'branch_head',
      'committee_head',
      'committee_co_head',
    ].includes(context.profile.role);

    if (!isLeadership) {
      return { success: false, error: 'Insufficient permissions to delete certificates.' };
    }

    const admin = createAdminClient();
    const { error } = await admin.from('certificates').delete().eq('id', certificateId);

    if (error) throw error;

    revalidatePath('/certificates');
    revalidatePath('/profile');
    revalidatePath('/stats');

    return { success: true };
  } catch (err: any) {
    console.error('deleteIssuedCertificateAction error:', err);
    return { success: false, error: err.message || 'Failed to delete certificate' };
  }
}
