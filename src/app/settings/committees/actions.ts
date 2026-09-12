'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { DepartmentBranch } from '@/types';

// Verify caller is Chapter President
async function verifyPresidentCaller() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required.');
  }

  const admin = createAdminClient();
  let { data: profile } = await admin
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .maybeSingle();

  // Local development bootstrap if no president exists
  if (!profile || !['president', 'co_president'].includes(profile.role) || profile.status !== 'active') {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'president');

    if (count === 0) {
      await admin
        .from('profiles')
        .update({ role: 'president', status: 'active' })
        .eq('id', user.id);
      profile = { id: user.id, role: 'president', status: 'active' };
    } else {
      throw new Error('Unauthorized: Chapter President privileges required.');
    }
  }

  return { user, profile, admin };
}

export interface CreateCommitteeInput {
  name: string;
  code: string;
  branch: DepartmentBranch;
  description?: string;
}

export async function createCommittee(input: CreateCommitteeInput) {
  try {
    const { user, admin } = await verifyPresidentCaller();

    const cleanCode = input.code.trim().toUpperCase().replace(/\s+/g, '_');
    const cleanName = input.name.trim();

    if (!cleanCode || !cleanName) {
      return { success: false, error: 'Committee name and unique code are required.' };
    }

    // Check code uniqueness
    const { data: existing } = await admin
      .from('departments')
      .select('id')
      .eq('code', cleanCode)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `A committee with code "${cleanCode}" already exists.` };
    }

    const { data: newDept, error: insertError } = await admin
      .from('departments')
      .insert({
        name: cleanName,
        code: cleanCode,
        branch: input.branch,
        description: input.description?.trim() || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log to audit_logs
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'department_created',
      entity_type: 'department',
      entity_id: newDept.id,
      metadata: { name: cleanName, code: cleanCode, branch: input.branch },
    });

    revalidatePath('/settings/committees');
    revalidatePath('/approvals');
    revalidatePath('/onboarding/complete-profile');
    return { success: true, department: newDept };
  } catch (err: unknown) {
    console.error('Create committee error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Server error' };
  }
}

export interface UpdateCommitteeInput {
  id: string;
  name: string;
  code: string;
  branch: DepartmentBranch;
  description?: string;
}

export async function updateCommittee(input: UpdateCommitteeInput) {
  try {
    const { user, admin } = await verifyPresidentCaller();

    const cleanCode = input.code.trim().toUpperCase().replace(/\s+/g, '_');
    const cleanName = input.name.trim();

    if (!cleanCode || !cleanName) {
      return { success: false, error: 'Committee name and unique code are required.' };
    }

    // Check if code is already taken by another department
    const { data: duplicate } = await admin
      .from('departments')
      .select('id')
      .eq('code', cleanCode)
      .neq('id', input.id)
      .maybeSingle();

    if (duplicate) {
      return { success: false, error: `Another committee with code "${cleanCode}" already exists.` };
    }

    const { error: updateError } = await admin
      .from('departments')
      .update({
        name: cleanName,
        code: cleanCode,
        branch: input.branch,
        description: input.description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id);

    if (updateError) throw updateError;

    // Log to audit_logs
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'department_updated',
      entity_type: 'department',
      entity_id: input.id,
      metadata: { name: cleanName, code: cleanCode, branch: input.branch },
    });

    revalidatePath('/settings/committees');
    revalidatePath('/approvals');
    revalidatePath('/onboarding/complete-profile');
    return { success: true };
  } catch (err: unknown) {
    console.error('Update committee error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Server error' };
  }
}

export async function assignCommitteeLeadership(
  departmentId: string,
  newHeadId: string | null,
  newCoHeadId: string | null
) {
  try {
    const { user, admin } = await verifyPresidentCaller();

    // Prevent appointing same person as both Head and Co-Head of the same committee
    if (newHeadId && newCoHeadId && newHeadId === newCoHeadId) {
      return { success: false, error: 'The same member cannot be both Head and Co-Head simultaneously.' };
    }

    // Fetch current department info
    const { data: dept, error: deptError } = await admin
      .from('departments')
      .select('id, name, head_id, co_head_id')
      .eq('id', departmentId)
      .single();

    if (deptError || !dept) throw new Error('Committee not found.');

    const oldHeadId = dept.head_id;
    const oldCoHeadId = dept.co_head_id;

    // 1. Update Head assignment
    if (oldHeadId && oldHeadId !== newHeadId) {
      // Revert old head role to member if they don't hold another executive role
      await admin
        .from('profiles')
        .update({ role: 'member', updated_at: new Date().toISOString() })
        .eq('id', oldHeadId)
        .eq('role', 'committee_head');
    }

    if (newHeadId && newHeadId !== oldHeadId) {
      await admin
        .from('profiles')
        .update({
          role: 'committee_head',
          department_id: departmentId,
          position: `Head of ${dept.name}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', newHeadId);

      // Notification
      await admin.from('notifications').insert({
        profile_id: newHeadId,
        type: 'role_assigned',
        title: 'Leadership Appointment! 🌟',
        message: `You have been appointed as Committee Head of ${dept.name}.`,
        related_entity_type: 'department',
        related_entity_id: departmentId,
        is_read: false,
      });
    }

    // 2. Update Co-Head assignment
    if (oldCoHeadId && oldCoHeadId !== newCoHeadId) {
      await admin
        .from('profiles')
        .update({ role: 'member', updated_at: new Date().toISOString() })
        .eq('id', oldCoHeadId)
        .eq('role', 'committee_co_head');
    }

    if (newCoHeadId && newCoHeadId !== oldCoHeadId) {
      await admin
        .from('profiles')
        .update({
          role: 'committee_co_head',
          department_id: departmentId,
          position: `Co-Head of ${dept.name}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', newCoHeadId);

      // Notification
      await admin.from('notifications').insert({
        profile_id: newCoHeadId,
        type: 'role_assigned',
        title: 'Leadership Appointment! 🌟',
        message: `You have been appointed as Committee Co-Head of ${dept.name}.`,
        related_entity_type: 'department',
        related_entity_id: departmentId,
        is_read: false,
      });
    }

    // 3. Update department record
    const { error: deptUpdateError } = await admin
      .from('departments')
      .update({
        head_id: newHeadId,
        co_head_id: newCoHeadId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', departmentId);

    if (deptUpdateError) throw deptUpdateError;

    // 4. Log to audit_logs
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'department_leadership_assigned',
      entity_type: 'department',
      entity_id: departmentId,
      metadata: {
        department_name: dept.name,
        new_head_id: newHeadId,
        new_co_head_id: newCoHeadId,
        previous_head_id: oldHeadId,
        previous_co_head_id: oldCoHeadId,
      },
    });

    revalidatePath('/settings/committees');
    revalidatePath('/approvals');
    revalidatePath('/members');
    return { success: true };
  } catch (err: unknown) {
    console.error('Assign leadership error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Server error' };
  }
}
