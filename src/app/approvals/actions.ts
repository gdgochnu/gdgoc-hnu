'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@/types';
import { 
  sendWelcomeApprovedEmail, 
  sendChangesRequestedEmail, 
  sendRejectionEmail 
} from '@/lib/email/service';

// Verify caller is President or Co-President
async function verifyLeadershipCaller() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .single();

  if (!profile || !['president', 'co_president'].includes(profile.role) || profile.status !== 'active') {
    // For local development convenience: if this is the very first user or testing, check if any president exists
    const admin = createAdminClient();
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'president');

    // If no active president exists yet, allow the current signed-in user to promote themselves / act
    if (count === 0) {
      await admin
        .from('profiles')
        .update({ role: 'president', status: 'active' })
        .eq('id', user.id);
      return { user, profile: { id: user.id, role: 'president', status: 'active' } };
    }

    throw new Error('Unauthorized: Presidential leadership privileges required.');
  }

  return { user, profile };
}

export async function approveAccount(
  profileId: string,
  role: UserRole = 'member',
  departmentId?: string,
  position?: string
) {
  try {
    const { user } = await verifyLeadershipCaller();
    const admin = createAdminClient();

    // 1. Update profile to active
    const updatePayload: Record<string, unknown> = {
      status: 'active',
      role,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (departmentId) updatePayload.department_id = departmentId;
    if (position) updatePayload.position = position;

    const { error: profError } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('id', profileId);

    if (profError) throw profError;

    // 2. Resolve approval instance if exists
    const { data: instance } = await admin
      .from('approval_instances')
      .select('id')
      .eq('workflow_type', 'account_approval')
      .eq('entity_id', profileId)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (instance) {
      await admin
        .from('approval_instances')
        .update({
          status: 'approved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', instance.id);

      await admin
        .from('approval_instance_steps')
        .update({
          status: 'approved',
          resolved_approver_id: user.id,
          acted_at: new Date().toISOString(),
        })
        .eq('instance_id', instance.id)
        .eq('step_order', 1);
    }

    // 3. Write immutable audit log
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'account_approved',
      entity_type: 'profile',
      entity_id: profileId,
      metadata: { role, department_id: departmentId, position },
    });

    // 4. Send approval notification to user
    await admin.from('notifications').insert({
      profile_id: profileId,
      type: 'account_approval',
      title: 'Application Approved! 🎉',
      message: 'Congratulations! Your GDGoC HNU application has been approved. Welcome to the team!',
      related_entity_type: 'profile',
      related_entity_id: profileId,
      is_read: false,
    });

    // 5. Send Welcome Email notification
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', profileId)
      .maybeSingle();

    if (targetProfile?.email) {
      let deptName = 'General Chapter';
      if (departmentId) {
        const { data: dept } = await admin
          .from('departments')
          .select('name')
          .eq('id', departmentId)
          .maybeSingle();
        if (dept) deptName = dept.name;
      }

      await sendWelcomeApprovedEmail({
        to: targetProfile.email,
        fullName: targetProfile.full_name || 'Member',
        role,
        departmentName: deptName,
        position: position || undefined,
      }).catch((err) => console.warn('Welcome email dispatch warning:', err));
    }

    revalidatePath('/approvals');
    revalidatePath('/members');
    return { success: true };
  } catch (err: unknown) {
    console.error('Approve account error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Server error' };
  }
}

export async function rejectAccount(profileId: string, reason: string) {
  try {
    const { user } = await verifyLeadershipCaller();
    const admin = createAdminClient();

    // 1. Update profile to rejected
    const { error: profError } = await admin
      .from('profiles')
      .update({
        status: 'rejected',
        rejection_reason: reason.trim() || 'Application did not meet current chapter requirements.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (profError) throw profError;

    // 2. Resolve approval instance
    await admin
      .from('approval_instances')
      .update({ status: 'rejected', resolved_at: new Date().toISOString() })
      .eq('workflow_type', 'account_approval')
      .eq('entity_id', profileId);

    // 3. Write immutable audit log
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'account_rejected',
      entity_type: 'profile',
      entity_id: profileId,
      metadata: { reason },
    });

    // 4. Send notification
    await admin.from('notifications').insert({
      profile_id: profileId,
      type: 'account_approval',
      title: 'Application Status Update',
      message: `Thank you for your interest in GDGoC HNU. Reason: ${reason}`,
      related_entity_type: 'profile',
      related_entity_id: profileId,
      is_read: false,
    });

    // 5. Send Rejection Email
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', profileId)
      .maybeSingle();

    if (targetProfile?.email) {
      await sendRejectionEmail({
        to: targetProfile.email,
        fullName: targetProfile.full_name || 'Candidate',
        reason: reason.trim() || undefined,
      }).catch((err) => console.warn('Rejection email dispatch warning:', err));
    }

    revalidatePath('/approvals');
    return { success: true };
  } catch (err: unknown) {
    console.error('Reject account error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Server error' };
  }
}

export async function requestAccountChanges(profileId: string, notes: string) {
  try {
    const { user } = await verifyLeadershipCaller();
    const admin = createAdminClient();

    // 1. Update profile to changes_requested
    const { error: profError } = await admin
      .from('profiles')
      .update({
        status: 'changes_requested',
        custom_fields: { changes_requested_notes: notes.trim() },
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (profError) throw profError;

    // 2. Update approval instance
    await admin
      .from('approval_instances')
      .update({ status: 'changes_requested' })
      .eq('workflow_type', 'account_approval')
      .eq('entity_id', profileId);

    // 3. Write audit log
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'account_changes_requested',
      entity_type: 'profile',
      entity_id: profileId,
      metadata: { notes },
    });

    // 4. Send notification
    await admin.from('notifications').insert({
      profile_id: profileId,
      type: 'account_approval',
      title: 'Changes Requested on Your Application',
      message: `Leadership reviewed your application and requested the following updates: "${notes}"`,
      related_entity_type: 'profile',
      related_entity_id: profileId,
      is_read: false,
    });

    // 5. Send Changes-Requested Email
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', profileId)
      .maybeSingle();

    if (targetProfile?.email) {
      await sendChangesRequestedEmail({
        to: targetProfile.email,
        fullName: targetProfile.full_name || 'Candidate',
        notes: notes.trim(),
      }).catch((err) => console.warn('Changes requested email dispatch warning:', err));
    }

    revalidatePath('/approvals');
    return { success: true };
  } catch (err: unknown) {
    console.error('Request changes error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Server error' };
  }
}

/**
 * Verifies caller has authority to suspend or reactivate the target profile:
 * - President / Co-President: org-wide authority.
 * - Branch Head: members & committee heads in their branch.
 * - Committee Head / Co-Head: members in their own committee.
 */
async function verifySuspensionAuthority(targetProfileId: string) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required.');
  }

  if (user.id === targetProfileId) {
    throw new Error('Self-suspension or self-reactivation is not permitted.');
  }

  const admin = createAdminClient();

  // Fetch caller's profile
  let { data: caller } = await admin
    .from('profiles')
    .select('id, role, status, department_id')
    .eq('id', user.id)
    .maybeSingle();

  // Local development auto-bootstrap if database has no active president
  if (!caller || !['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(caller.role)) {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'president');

    if (count === 0) {
      await admin
        .from('profiles')
        .update({ role: 'president', status: 'active' })
        .eq('id', user.id);
      caller = { id: user.id, role: 'president', status: 'active', department_id: null };
    } else {
      throw new Error('Unauthorized: Leadership or Committee Head privileges required.');
    }
  }

  if (caller.status !== 'active') {
    throw new Error('Unauthorized: Caller account is not active.');
  }

  // Fetch target profile
  const { data: target } = await admin
    .from('profiles')
    .select('id, role, status, department_id, full_name, email, custom_fields')
    .eq('id', targetProfileId)
    .maybeSingle();

  if (!target) {
    throw new Error('Target profile not found.');
  }

  if (target.role === 'president') {
    throw new Error('Cannot modify status of Chapter President.');
  }

  // 1. President or Co-President has org-wide authority
  if (['president', 'co_president'].includes(caller.role)) {
    return { user, caller, target, admin };
  }

  // 2. Branch Head
  if (caller.role === 'branch_head') {
    if (['president', 'co_president', 'branch_head'].includes(target.role)) {
      throw new Error('Branch Heads cannot suspend other Branch Heads or Presidential leadership.');
    }

    if (caller.department_id && target.department_id) {
      const { data: callerDept } = await admin
        .from('departments')
        .select('branch')
        .eq('id', caller.department_id)
        .maybeSingle();
      const { data: targetDept } = await admin
        .from('departments')
        .select('branch')
        .eq('id', target.department_id)
        .maybeSingle();

      if (callerDept && targetDept && callerDept.branch === targetDept.branch) {
        return { user, caller, target, admin };
      }
    }
    throw new Error('Unauthorized: Target member belongs to a different branch.');
  }

  // 3. Committee Head / Co-Head
  if (['committee_head', 'committee_co_head'].includes(caller.role)) {
    if (target.role !== 'member') {
      throw new Error('Committee Heads can only manage status of members in their committee.');
    }

    if (caller.department_id && caller.department_id === target.department_id) {
      return { user, caller, target, admin };
    }
    throw new Error('Unauthorized: Target member is outside your committee.');
  }

  throw new Error('Unauthorized: Insufficient authority to manage this account.');
}

export async function suspendAccount(profileId: string, reason?: string) {
  try {
    const { user, caller, target, admin } = await verifySuspensionAuthority(profileId);

    const suspensionReason = reason?.trim() || 'Administrative suspension by chapter leadership';
    const targetCustomFields = typeof target.custom_fields === 'object' && target.custom_fields !== null 
      ? target.custom_fields 
      : {};

    const updatedCustomFields = {
      ...targetCustomFields,
      suspension_reason: suspensionReason,
      suspended_at: new Date().toISOString(),
      suspended_by: user.id,
      suspended_by_role: caller.role,
    };

    // 1. Update status to suspended
    const { error: profError } = await admin
      .from('profiles')
      .update({
        status: 'suspended',
        custom_fields: updatedCustomFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (profError) throw profError;

    // 2. Write to audit_logs
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'account_suspended',
      entity_type: 'profile',
      entity_id: profileId,
      metadata: {
        reason: suspensionReason,
        target_email: target.email,
        target_role: target.role,
        caller_role: caller.role,
      },
    });

    // 3. Write in-app notification
    await admin.from('notifications').insert({
      profile_id: profileId,
      type: 'account_suspended',
      title: 'Account Suspended',
      message: `Your GDGoC HNU account was suspended: "${suspensionReason}". Please contact your committee Head or President.`,
      related_entity_type: 'profile',
      related_entity_id: profileId,
      is_read: false,
    });

    revalidatePath('/approvals');
    revalidatePath('/members');
    revalidatePath('/onboarding/status');
    return { success: true };
  } catch (err: unknown) {
    console.error('Suspend account error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Server error' };
  }
}

export async function reactivateAccount(profileId: string) {
  try {
    const { user, caller, target, admin } = await verifySuspensionAuthority(profileId);

    const targetCustomFields = typeof target.custom_fields === 'object' && target.custom_fields !== null 
      ? target.custom_fields 
      : {};

    const updatedCustomFields = {
      ...targetCustomFields,
      reactivated_at: new Date().toISOString(),
      reactivated_by: user.id,
      reactivated_by_role: caller.role,
    };

    // 1. Update status to active
    const { error: profError } = await admin
      .from('profiles')
      .update({
        status: 'active',
        custom_fields: updatedCustomFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (profError) throw profError;

    // 2. Write to audit_logs
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'account_reactivated',
      entity_type: 'profile',
      entity_id: profileId,
      metadata: {
        target_email: target.email,
        target_role: target.role,
        caller_role: caller.role,
      },
    });

    // 3. Write in-app notification
    await admin.from('notifications').insert({
      profile_id: profileId,
      type: 'account_reactivated',
      title: 'Account Reactivated! 🎉',
      message: 'Your GDGoC HNU account has been reactivated. Welcome back to the team!',
      related_entity_type: 'profile',
      related_entity_id: profileId,
      is_read: false,
    });

    revalidatePath('/approvals');
    revalidatePath('/members');
    revalidatePath('/onboarding/status');
    return { success: true };
  } catch (err: unknown) {
    console.error('Reactivate account error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Server error' };
  }
}

