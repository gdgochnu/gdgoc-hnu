'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import {
  PRContact,
  PrContactType,
  PrPipelineStage,
  PRInteraction,
  UserRole,
} from '@/types';

/**
 * Access check for PR CRM (Spec §1.1, §1.3, §4.7):
 * - President & Co-President: Full access
 * - PR Committee (Head, Co-Head, Members): Full access
 * - Non-Tech Branch Head: Full access
 */
export async function canAccessPrCrm(): Promise<{
  hasAccess: boolean;
  role?: string;
  isPrMember: boolean;
  isPresidential: boolean;
  profileId?: string;
}> {
  const context = await getUserContext();
  if (!context.user || !context.profile || context.profile.status !== 'active') {
    return { hasAccess: false, isPrMember: false, isPresidential: false };
  }

  const role = context.profile.role;
  const isPresidential = role === 'president' || role === 'co_president';
  if (isPresidential) {
    return {
      hasAccess: true,
      role,
      isPrMember: false,
      isPresidential: true,
      profileId: context.profile.id,
    };
  }

  const deptCode = (context.profile.department as any)?.code;
  const isPrMember = deptCode === 'PR' || deptCode === 'PUBLIC_RELATIONS';
  if (isPrMember) {
    return {
      hasAccess: true,
      role,
      isPrMember: true,
      isPresidential: false,
      profileId: context.profile.id,
    };
  }

  const isNonTechBranchHead =
    role === 'branch_head' && (context.profile.department as any)?.branch === 'non_tech';
  if (isNonTechBranchHead) {
    return {
      hasAccess: true,
      role,
      isPrMember: false,
      isPresidential: false,
      profileId: context.profile.id,
    };
  }

  return { hasAccess: false, role, isPrMember: false, isPresidential: false };
}

export interface GetPrContactsFilters {
  type?: string;
  stage?: string;
  search?: string;
  assigned_to?: string;
}

/**
 * Fetch all PR contacts with joined assignee profiles and interaction counts
 */
export async function getPrContacts(
  filters?: GetPrContactsFilters,
  options?: { skipAuthCheck?: boolean }
): Promise<{ success: boolean; data: PRContact[]; error?: string }> {
  try {
    if (!options?.skipAuthCheck) {
      const access = await canAccessPrCrm();
      if (!access.hasAccess) {
        return { success: false, data: [], error: 'Unauthorized: PR CRM access required' };
      }
    }

    const admin = createAdminClient();

    // 1. Fetch contacts
    let query = admin
      .from('pr_contacts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }
    if (filters?.stage && filters.stage !== 'all') {
      query = query.eq('pipeline_stage', filters.stage);
    }
    if (filters?.assigned_to && filters.assigned_to !== 'all') {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    const { data: contactsData, error: contactsError } = await query;

    if (contactsError) {
      console.error('[getPrContacts] DB error:', contactsError);
      return { success: false, data: [], error: contactsError.message };
    }

    if (!contactsData || contactsData.length === 0) {
      return { success: true, data: [] };
    }

    // Filter by search query in memory for rich multi-field match (name, organization, role_title, email, phone, notes)
    let filteredList = contactsData;
    if (filters?.search && filters.search.trim() !== '') {
      const q = filters.search.trim().toLowerCase();
      filteredList = filteredList.filter((c: any) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.organization && c.organization.toLowerCase().includes(q)) ||
        (c.role_title && c.role_title.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    // 2. Fetch assignees and creators to avoid N+1 queries
    const profileIds = new Set<string>();
    filteredList.forEach((c: any) => {
      if (c.assigned_to) profileIds.add(c.assigned_to);
      if (c.created_by) profileIds.add(c.created_by);
    });

    const profileMap = new Map<string, any>();
    if (profileIds.size > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name_en, full_name_ar, avatar_url, role')
        .in('id', Array.from(profileIds));

      if (profiles) {
        profiles.forEach((p) => profileMap.set(p.id, p));
      }
    }

    // 3. Fetch interaction counts & latest interaction per contact
    const contactIds = filteredList.map((c: any) => c.id);
    const interactionsMap = new Map<string, { count: number; latest?: PRInteraction }>();

    if (contactIds.length > 0) {
      const { data: interactions } = await admin
        .from('pr_interactions')
        .select('id, contact_id, profile_id, interaction_type, summary, next_follow_up, created_at')
        .in('contact_id', contactIds)
        .order('created_at', { ascending: false });

      if (interactions) {
        interactions.forEach((inter: any) => {
          const current = interactionsMap.get(inter.contact_id) || { count: 0 };
          current.count += 1;
          if (!current.latest) {
            current.latest = inter;
          }
          interactionsMap.set(inter.contact_id, current);
        });
      }
    }

    // 4. Transform into full PRContact objects
    const contacts: PRContact[] = filteredList.map((c: any) => {
      const assigneeProfile = c.assigned_to ? profileMap.get(c.assigned_to) : null;
      const creatorProfile = c.created_by ? profileMap.get(c.created_by) : null;
      const interInfo = interactionsMap.get(c.id);

      return {
        id: c.id,
        name: c.name,
        organization: c.organization || null,
        role_title: c.role_title || null,
        email: c.email || null,
        phone: c.phone || null,
        type: c.type as PrContactType,
        pipeline_stage: c.pipeline_stage as PrPipelineStage,
        notes: c.notes || null,
        assigned_to: c.assigned_to || null,
        created_by: c.created_by || null,
        created_at: c.created_at,
        updated_at: c.updated_at,
        assignee: assigneeProfile
          ? {
              id: assigneeProfile.id,
              full_name_en: assigneeProfile.full_name_en,
              full_name_ar: assigneeProfile.full_name_ar,
              avatar_url: assigneeProfile.avatar_url,
              role: assigneeProfile.role,
            }
          : null,
        creator: creatorProfile
          ? {
              id: creatorProfile.id,
              full_name_en: creatorProfile.full_name_en,
              full_name_ar: creatorProfile.full_name_ar,
            }
          : null,
        interactions_count: interInfo?.count || 0,
        latest_interaction: interInfo?.latest || null,
      };
    });

    return { success: true, data: contacts };
  } catch (err: any) {
    console.error('[getPrContacts] exception:', err);
    return { success: false, data: [], error: err.message || 'Failed to fetch contacts' };
  }
}

/**
 * Fetch PR team members and leadership for assignment selection
 */
export async function getPrTeamMembers(options?: { skipAuthCheck?: boolean }): Promise<{
  success: boolean;
  data: Array<{
    id: string;
    full_name_en: string;
    full_name_ar: string;
    role: UserRole;
    avatar_url?: string | null;
    email: string;
    department_name?: string | null;
  }>;
  error?: string;
}> {
  try {
    if (!options?.skipAuthCheck) {
      const access = await canAccessPrCrm();
      if (!access.hasAccess) {
        return { success: false, data: [], error: 'Unauthorized' };
      }
    }

    const admin = createAdminClient();

    // Query active PR members + leadership
    const { data: prDept } = await admin
      .from('departments')
      .select('id, name, code')
      .or('code.eq.PR,code.eq.PUBLIC_RELATIONS')
      .maybeSingle();

    let query = admin
      .from('profiles')
      .select('id, full_name_en, full_name_ar, email, role, avatar_url, department_id')
      .eq('status', 'active');

    if (prDept?.id) {
      query = query.or(
        `department_id.eq.${prDept.id},role.in.(president,co_president,branch_head)`
      );
    } else {
      query = query.in('role', ['president', 'co_president', 'branch_head']);
    }

    const { data: members, error } = await query.order('role', { ascending: true });

    if (error) {
      console.error('[getPrTeamMembers] DB error:', error);
      return { success: false, data: [], error: error.message };
    }

    return {
      success: true,
      data: (members || []).map((m: any) => ({
        id: m.id,
        full_name_en: m.full_name_en || m.full_name_ar || 'Member',
        full_name_ar: m.full_name_ar || m.full_name_en || 'عضو',
        role: m.role as UserRole,
        avatar_url: m.avatar_url || null,
        email: m.email,
        department_name: prDept?.name || 'PR',
      })),
    };
  } catch (err: any) {
    console.error('[getPrTeamMembers] exception:', err);
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Create a new PR contact in the pipeline
 */
export async function createPrContact(
  formData: {
    name: string;
    organization?: string | null;
    role_title?: string | null;
    email?: string | null;
    phone?: string | null;
    type: PrContactType;
    pipeline_stage?: PrPipelineStage;
    notes?: string | null;
    assigned_to?: string | null;
  },
  options?: { skipAuthCheck?: boolean; authorId?: string }
): Promise<{ success: boolean; data?: PRContact; error?: string }> {
  try {
    let authorId = options?.authorId;

    if (!options?.skipAuthCheck) {
      const access = await canAccessPrCrm();
      if (!access.hasAccess) {
        return { success: false, error: 'Unauthorized: PR CRM write access required' };
      }
      authorId = access.profileId;
    }

    if (!formData.name || formData.name.trim() === '') {
      return { success: false, error: 'Contact name is required' };
    }

    const admin = createAdminClient();

    const insertPayload = {
      name: formData.name.trim(),
      organization: formData.organization?.trim() || null,
      role_title: formData.role_title?.trim() || null,
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      type: formData.type || 'speaker',
      pipeline_stage: formData.pipeline_stage || 'new',
      notes: formData.notes?.trim() || null,
      assigned_to: formData.assigned_to || null,
      created_by: authorId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await admin
      .from('pr_contacts')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[createPrContact] insert error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/pr');
    revalidatePath('/workspace/pr');

    return { success: true, data: inserted as PRContact };
  } catch (err: any) {
    console.error('[createPrContact] exception:', err);
    return { success: false, error: err.message || 'Failed to create contact' };
  }
}

/**
 * Move contact to a new pipeline stage (Kanban stage transition)
 */
export async function updatePrContactStage(
  contactId: string,
  newStage: PrPipelineStage,
  options?: { skipAuthCheck?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!options?.skipAuthCheck) {
      const access = await canAccessPrCrm();
      if (!access.hasAccess) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    const validStages: PrPipelineStage[] = ['new', 'contacted', 'negotiating', 'confirmed'];
    if (!validStages.includes(newStage)) {
      return { success: false, error: `Invalid stage: ${newStage}` };
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from('pr_contacts')
      .update({
        pipeline_stage: newStage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);

    if (error) {
      console.error('[updatePrContactStage] update error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/pr');
    revalidatePath('/workspace/pr');

    return { success: true };
  } catch (err: any) {
    console.error('[updatePrContactStage] exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update full contact information
 */
export async function updatePrContact(
  contactId: string,
  updates: Partial<PRContact>,
  options?: { skipAuthCheck?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!options?.skipAuthCheck) {
      const access = await canAccessPrCrm();
      if (!access.hasAccess) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    const admin = createAdminClient();

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.organization !== undefined) payload.organization = updates.organization?.trim() || null;
    if (updates.role_title !== undefined) payload.role_title = updates.role_title?.trim() || null;
    if (updates.email !== undefined) payload.email = updates.email?.trim() || null;
    if (updates.phone !== undefined) payload.phone = updates.phone?.trim() || null;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.pipeline_stage !== undefined) payload.pipeline_stage = updates.pipeline_stage;
    if (updates.notes !== undefined) payload.notes = updates.notes?.trim() || null;
    if (updates.assigned_to !== undefined) payload.assigned_to = updates.assigned_to || null;

    const { error } = await admin
      .from('pr_contacts')
      .update(payload)
      .eq('id', contactId);

    if (error) {
      console.error('[updatePrContact] update error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/pr');
    revalidatePath('/workspace/pr');

    return { success: true };
  } catch (err: any) {
    console.error('[updatePrContact] exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a contact (cascades interactions)
 */
export async function deletePrContact(
  contactId: string,
  options?: { skipAuthCheck?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!options?.skipAuthCheck) {
      const access = await canAccessPrCrm();
      if (!access.hasAccess) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from('pr_contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      console.error('[deletePrContact] delete error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/pr');
    revalidatePath('/workspace/pr');

    return { success: true };
  } catch (err: any) {
    console.error('[deletePrContact] exception:', err);
    return { success: false, error: err.message };
  }
}
