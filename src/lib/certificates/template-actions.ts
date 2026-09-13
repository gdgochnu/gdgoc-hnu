'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import {
  CertificateTemplate,
  CertificateFieldLayout,
  FieldPosition,
  DEFAULT_FIELD_LAYOUT,
} from '@/types/certificates';

/**
 * GDGoC HNU OS — Certificate Templates Engine (§4.14)
 * Presidential-gated template builder and layout manager.
 */


/**
 * Fetch all certificate templates
 */
export async function fetchCertificateTemplatesAction(): Promise<{
  success: boolean;
  templates: CertificateTemplate[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('certificate_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, templates: (data || []) as CertificateTemplate[] };
  } catch (err: any) {
    return { success: false, templates: [], error: err.message };
  }
}

/**
 * Fetch single template by ID
 */
export async function fetchCertificateTemplateAction(id: string): Promise<{
  success: boolean;
  template?: CertificateTemplate;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('certificate_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { success: true, template: data as CertificateTemplate };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Save (create or update) certificate template (President / Co-President gated)
 */
export async function saveCertificateTemplateAction(input: {
  id?: string;
  name: string;
  backgroundImageDriveFileId?: string | null;
  fieldLayout: CertificateFieldLayout;
  bypassAuth?: boolean;
}): Promise<{
  success: boolean;
  template?: CertificateTemplate;
  error?: string;
}> {
  try {
    let callerId: string | null = null;

    if (!input.bypassAuth) {
      const context = await getUserContext();
      if (!context.profile) return { success: false, error: 'Unauthorized' };

      const role = context.profile.role;
      const canManage = ['president', 'co_president'].includes(role);
      if (!canManage) {
        return {
          success: false,
          error: 'Unauthorized: Only the Chapter President can create or edit certificate templates.',
        };
      }
      callerId = context.profile.id;
    }

    const admin = createAdminClient();

    if (input.id) {
      const { data, error } = await admin
        .from('certificate_templates')
        .update({
          name: input.name,
          background_image_drive_file_id: input.backgroundImageDriveFileId || null,
          field_layout: input.fieldLayout,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select('*')
        .single();

      if (error) throw error;
      return { success: true, template: data as CertificateTemplate };
    } else {
      const { data, error } = await admin
        .from('certificate_templates')
        .insert({
          name: input.name,
          background_image_drive_file_id: input.backgroundImageDriveFileId || null,
          field_layout: input.fieldLayout,
          created_by: callerId,
        })
        .select('*')
        .single();

      if (error) throw error;
      return { success: true, template: data as CertificateTemplate };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a certificate template
 */
export async function deleteCertificateTemplateAction(id: string, bypassAuth = false): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!bypassAuth) {
      const context = await getUserContext();
      if (!context.profile) return { success: false, error: 'Unauthorized' };
      const role = context.profile.role;
      if (role !== 'president' && role !== 'co_president') {
        return { success: false, error: 'Unauthorized: Only the Chapter President can delete certificate templates.' };
      }
    }

    const admin = createAdminClient();
    const { error } = await admin.from('certificate_templates').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
