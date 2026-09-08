'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import {
  PRContact,
  PrContactType,
  PrPipelineStage,
  PrInteractionType,
  PRInteraction,
  PrDashboardMetrics,
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
    const interactionsMap = new Map<string, { count: number; latest?: PRInteraction; next_follow_up?: string | null }>();

    if (contactIds.length > 0) {
      const { data: interactions } = await admin
        .from('pr_interactions')
        .select('id, contact_id, profile_id, interaction_type, summary, next_follow_up, created_at')
        .in('contact_id', contactIds)
        .order('created_at', { ascending: false });

      if (interactions) {
        interactions.forEach((inter: any) => {
          const current = interactionsMap.get(inter.contact_id) || { count: 0, next_follow_up: null };
          current.count += 1;
          if (!current.latest) {
            current.latest = inter;
          }
          if (inter.next_follow_up && !current.next_follow_up) {
            current.next_follow_up = inter.next_follow_up;
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
        next_follow_up: interInfo?.next_follow_up || null,
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

/**
 * Get all interactions for a specific PR contact
 */
export async function getPrInteractions(
  contactId: string,
  options?: { skipAuthCheck?: boolean }
): Promise<{ success: boolean; data: PRInteraction[]; error?: string }> {
  try {
    if (!options?.skipAuthCheck) {
      const access = await canAccessPrCrm();
      if (!access.hasAccess) {
        return { success: false, data: [], error: 'Unauthorized' };
      }
    }

    const admin = createAdminClient();

    const { data: interactions, error } = await admin
      .from('pr_interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getPrInteractions] DB error:', error);
      return { success: false, data: [], error: error.message };
    }

    if (!interactions || interactions.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch author profiles
    const authorIds = Array.from(new Set(interactions.map((i: any) => i.profile_id).filter(Boolean)));
    const authorMap = new Map<string, any>();

    if (authorIds.length > 0) {
      const { data: authors } = await admin
        .from('profiles')
        .select('id, full_name_en, full_name_ar, avatar_url')
        .in('id', authorIds);

      if (authors) {
        authors.forEach((a) => authorMap.set(a.id, a));
      }
    }

    const formatted: PRInteraction[] = interactions.map((item: any) => {
      const author = authorMap.get(item.profile_id);
      return {
        id: item.id,
        contact_id: item.contact_id,
        profile_id: item.profile_id,
        interaction_type: item.interaction_type,
        summary: item.summary,
        next_follow_up: item.next_follow_up || null,
        created_at: item.created_at,
        author: author
          ? {
              id: author.id,
              full_name_en: author.full_name_en,
              full_name_ar: author.full_name_ar,
              avatar_url: author.avatar_url,
            }
          : null,
      };
    });

    return { success: true, data: formatted };
  } catch (err: any) {
    console.error('[getPrInteractions] exception:', err);
    return { success: false, data: [], error: err.message || 'Failed to fetch interactions' };
  }
}

/**
 * Log a new interaction (email, call, meeting, message) for a contact
 */
export async function createPrInteraction(
  data: {
    contact_id: string;
    interaction_type: PrInteractionType;
    summary: string;
    next_follow_up?: string | null;
    update_stage?: PrPipelineStage;
  },
  options?: { skipAuthCheck?: boolean; authorId?: string }
): Promise<{ success: boolean; data?: PRInteraction; error?: string }> {
  try {
    let authorId = options?.authorId;

    if (!options?.skipAuthCheck) {
      const access = await canAccessPrCrm();
      if (!access.hasAccess) {
        return { success: false, error: 'Unauthorized: PR CRM write access required' };
      }
      authorId = access.profileId;
    }

    if (!data.contact_id) {
      return { success: false, error: 'Contact ID is required' };
    }
    if (!data.summary || data.summary.trim() === '') {
      return { success: false, error: 'Interaction summary is required' };
    }

    const admin = createAdminClient();

    // 1. Insert interaction
    const insertPayload = {
      contact_id: data.contact_id,
      profile_id: authorId,
      interaction_type: data.interaction_type || 'email',
      summary: data.summary.trim(),
      next_follow_up: data.next_follow_up ? new Date(data.next_follow_up).toISOString() : null,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await admin
      .from('pr_interactions')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('[createPrInteraction] insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    // 2. Optionally update stage & always update updated_at on pr_contacts
    const contactUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (data.update_stage) {
      contactUpdates.pipeline_stage = data.update_stage;
    }

    await admin
      .from('pr_contacts')
      .update(contactUpdates)
      .eq('id', data.contact_id);

    // Fetch author info for response
    let authorData = null;
    if (authorId) {
      const { data: author } = await admin
        .from('profiles')
        .select('id, full_name_en, full_name_ar, avatar_url')
        .eq('id', authorId)
        .maybeSingle();
      if (author) {
        authorData = {
          id: author.id,
          full_name_en: author.full_name_en,
          full_name_ar: author.full_name_ar,
          avatar_url: author.avatar_url,
        };
      }
    }

    revalidatePath('/pr');
    revalidatePath('/workspace/pr');

    return {
      success: true,
      data: {
        id: inserted.id,
        contact_id: inserted.contact_id,
        profile_id: inserted.profile_id,
        interaction_type: inserted.interaction_type,
        summary: inserted.summary,
        next_follow_up: inserted.next_follow_up,
        created_at: inserted.created_at,
        author: authorData,
      },
    };
  } catch (err: any) {
    console.error('[createPrInteraction] exception:', err);
    return { success: false, error: err.message || 'Failed to log interaction' };
  }
}

/**
 * Delete an interaction log
 */
export async function deletePrInteraction(
  interactionId: string,
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
      .from('pr_interactions')
      .delete()
      .eq('id', interactionId);

    if (error) {
      console.error('[deletePrInteraction] delete error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/pr');
    revalidatePath('/workspace/pr');

    return { success: true };
  } catch (err: any) {
    console.error('[deletePrInteraction] exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get comprehensive KPI metrics for the PR CRM Dashboard (Spec §1.2, §4.7)
 */
export async function getPrDashboardMetrics(options?: {
  skipAuthCheck?: boolean;
}): Promise<{ success: boolean; data?: PrDashboardMetrics; error?: string }> {
  try {
    if (!options?.skipAuthCheck) {
      const access = await canAccessPrCrm();
      if (!access.hasAccess) {
        return { success: false, error: 'Unauthorized: PR CRM access required' };
      }
    }

    const admin = createAdminClient();

    // 1. Fetch all contacts
    const { data: contacts, error: contactsError } = await admin
      .from('pr_contacts')
      .select('id, name, organization, type, pipeline_stage, assigned_to, created_at');

    if (contactsError) {
      console.error('[getPrDashboardMetrics] contacts error:', contactsError);
      return { success: false, error: contactsError.message };
    }

    const allContacts = contacts || [];
    const totalContacts = allContacts.length;
    const confirmedContacts = allContacts.filter((c) => c.pipeline_stage === 'confirmed').length;
    const activeNegotiations = allContacts.filter((c) => c.pipeline_stage === 'negotiating').length;
    const conversionRate = totalContacts > 0 ? Math.round((confirmedContacts / totalContacts) * 100) : 0;

    // Contact Type breakdown
    const typeBreakdown: Record<PrContactType, number> = {
      speaker: 0,
      sponsor: 0,
      partner: 0,
      venue: 0,
      other: 0,
    };
    allContacts.forEach((c) => {
      if (typeBreakdown[c.type as PrContactType] !== undefined) {
        typeBreakdown[c.type as PrContactType] += 1;
      } else {
        typeBreakdown.other += 1;
      }
    });

    // Pipeline Stage breakdown
    const stageBreakdown: Record<PrPipelineStage, number> = {
      new: 0,
      contacted: 0,
      negotiating: 0,
      confirmed: 0,
    };
    allContacts.forEach((c) => {
      if (stageBreakdown[c.pipeline_stage as PrPipelineStage] !== undefined) {
        stageBreakdown[c.pipeline_stage as PrPipelineStage] += 1;
      } else {
        stageBreakdown.new += 1;
      }
    });

    // 2. Fetch all interactions
    const { data: interactions, error: interError } = await admin
      .from('pr_interactions')
      .select('id, contact_id, profile_id, interaction_type, next_follow_up, created_at')
      .order('created_at', { ascending: false });

    if (interError) {
      console.error('[getPrDashboardMetrics] interactions error:', interError);
      return { success: false, error: interError.message };
    }

    const allInteractions = interactions || [];

    // Interaction channels breakdown
    const interactionChannelBreakdown: Record<PrInteractionType, number> = {
      email: 0,
      call: 0,
      meeting: 0,
      message: 0,
    };
    allInteractions.forEach((i) => {
      if (interactionChannelBreakdown[i.interaction_type as PrInteractionType] !== undefined) {
        interactionChannelBreakdown[i.interaction_type as PrInteractionType] += 1;
      }
    });

    // 3. Compute follow-ups and urgent follow-ups
    const now = Date.now();
    let overdueCount = 0;
    let upcomingCount = 0;

    // Map contact ID to contact details for fast lookup
    const contactMap = new Map<string, any>(allContacts.map((c) => [c.id, c]));

    // Fetch team member names for assignee lookup
    const assigneeIds = Array.from(new Set(allContacts.map((c) => c.assigned_to).filter(Boolean)));
    const assigneeMap = new Map<string, string>();
    if (assigneeIds.length > 0) {
      const { data: assignees } = await admin
        .from('profiles')
        .select('id, full_name_en')
        .in('id', assigneeIds);
      if (assignees) {
        assignees.forEach((a) => assigneeMap.set(a.id, a.full_name_en));
      }
    }

    // Identify interactions with scheduled next_follow_up
    const followUpItems: Array<{
      contactId: string;
      contactName: string;
      organization?: string | null;
      type: PrContactType;
      stage: PrPipelineStage;
      nextFollowUp: string;
      isOverdue: boolean;
      diffDays: number;
      assigneeName?: string | null;
    }> = [];

    allInteractions.forEach((inter) => {
      if (!inter.next_follow_up) return;
      const fDate = new Date(inter.next_follow_up);
      const diffMs = fDate.getTime() - now;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const isOverdue = diffMs < -1000 * 60 * 60 * 12;

      if (isOverdue) {
        overdueCount += 1;
      } else {
        upcomingCount += 1;
      }

      const contact = contactMap.get(inter.contact_id);
      if (contact) {
        followUpItems.push({
          contactId: contact.id,
          contactName: contact.name,
          organization: contact.organization,
          type: contact.type as PrContactType,
          stage: contact.pipeline_stage as PrPipelineStage,
          nextFollowUp: inter.next_follow_up,
          isOverdue,
          diffDays,
          assigneeName: contact.assigned_to ? assigneeMap.get(contact.assigned_to) || null : null,
        });
      }
    });

    // Deduplicate by contactId taking the most recent or overdue
    const uniqueFollowUpsMap = new Map<string, typeof followUpItems[0]>();
    followUpItems.forEach((f) => {
      const existing = uniqueFollowUpsMap.get(f.contactId);
      if (!existing || (f.isOverdue && !existing.isOverdue)) {
        uniqueFollowUpsMap.set(f.contactId, f);
      }
    });

    const urgentFollowUps = Array.from(uniqueFollowUpsMap.values())
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return new Date(a.nextFollowUp).getTime() - new Date(b.nextFollowUp).getTime();
      })
      .slice(0, 8);

    // 4. Team Activity Leaderboard
    const profileActivityMap = new Map<string, { interactionsCount: number; contactsAssignedCount: number }>();

    allInteractions.forEach((i) => {
      if (!i.profile_id) return;
      const cur = profileActivityMap.get(i.profile_id) || { interactionsCount: 0, contactsAssignedCount: 0 };
      cur.interactionsCount += 1;
      profileActivityMap.set(i.profile_id, cur);
    });

    allContacts.forEach((c) => {
      if (!c.assigned_to) return;
      const cur = profileActivityMap.get(c.assigned_to) || { interactionsCount: 0, contactsAssignedCount: 0 };
      cur.contactsAssignedCount += 1;
      profileActivityMap.set(c.assigned_to, cur);
    });

    const teamProfileIds = Array.from(profileActivityMap.keys());
    const teamActivity: PrDashboardMetrics['teamActivity'] = [];

    if (teamProfileIds.length > 0) {
      const { data: teamProfiles } = await admin
        .from('profiles')
        .select('id, full_name_en, avatar_url, role')
        .in('id', teamProfileIds);

      if (teamProfiles) {
        teamProfiles.forEach((p) => {
          const stats = profileActivityMap.get(p.id) || { interactionsCount: 0, contactsAssignedCount: 0 };
          teamActivity.push({
            profileId: p.id,
            name: p.full_name_en || 'Team Member',
            avatarUrl: p.avatar_url,
            role: p.role as UserRole,
            interactionsCount: stats.interactionsCount,
            contactsAssignedCount: stats.contactsAssignedCount,
          });
        });
      }
    }

    teamActivity.sort((a, b) => b.interactionsCount + b.contactsAssignedCount - (a.interactionsCount + a.contactsAssignedCount));

    const metricsData: PrDashboardMetrics = {
      totalContacts,
      confirmedContacts,
      conversionRate,
      activeNegotiations,
      overdueFollowUpsCount: overdueCount,
      upcomingFollowUpsCount: upcomingCount,
      typeBreakdown,
      stageBreakdown,
      interactionChannelBreakdown,
      teamActivity,
      urgentFollowUps,
    };

    return { success: true, data: metricsData };
  } catch (err: any) {
    console.error('[getPrDashboardMetrics] exception:', err);
    return { success: false, error: err.message || 'Failed to compute PR metrics' };
  }
}


