'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { EventRegistrationField, EventOwner, TaskPriority, TaskAssignmentMode, EventStatus } from '@/types';
import { createApprovalInstance } from '@/lib/approvals/approval-engine';
import { sendEventRegistrationEmail } from '@/lib/email/service';

export interface EventTaskDraftInput {
  title: string;
  description?: string;
  departmentId: string;
  assigneeId?: string | null;
  assignmentMode?: TaskAssignmentMode;
  priority?: TaskPriority;
  deadline?: string;
  isCheckinDuty?: boolean;
}

export interface CreateEventDraftInput {
  title: string;
  slug?: string;
  description?: string;
  venue?: string;
  eventDate: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  capacity?: number | null;
  departmentId: string;
  registrationFields?: EventRegistrationField[];
  owners?: EventOwner[];
  tasks?: EventTaskDraftInput[];
  checkinAccessProfileIds?: string[];
}

function generateSlug(title: string): string {
  const cleaned = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0600-\u06FF\-]/g, '')
    .replace(/\s+/g, '-');
  return cleaned || `event-${Date.now()}`;
}

export async function createEventDraft(input: CreateEventDraftInput) {
  try {
    const context = await getUserContext();

    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized: Active chapter membership required.' };
    }

    const { role, department } = context.profile;
    const allowedRoles = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'];
    if (!allowedRoles.includes(role)) {
      return { success: false, error: 'Forbidden: Only Chapter Leadership and Committee Heads can create events.' };
    }

    // Validation
    const title = input.title?.trim();
    if (!title || title.length < 3) {
      return { success: false, error: 'Event title must be at least 3 characters long.' };
    }

    if (!input.eventDate) {
      return { success: false, error: 'Event date is required.' };
    }

    if (!input.departmentId) {
      return { success: false, error: 'Host committee (department) is required.' };
    }

    const capacity = input.capacity ? Number(input.capacity) : null;
    if (capacity !== null && (isNaN(capacity) || capacity < 1)) {
      return { success: false, error: 'Capacity must be a positive number.' };
    }

    const admin = createAdminClient();

    // Verify target department exists
    const { data: dept, error: deptErr } = await admin
      .from('departments')
      .select('id, name, branch')
      .eq('id', input.departmentId)
      .maybeSingle();

    if (deptErr || !dept) {
      return { success: false, error: 'Selected host committee does not exist.' };
    }

    // Role scope check: Committee heads can only create for their own committee (unless Presidential/Branch Head)
    const isPresidential = ['president', 'co_president'].includes(role);
    if (!isPresidential) {
      if (role === 'branch_head') {
        if (department?.branch !== dept.branch) {
          return { success: false, error: 'Branch Heads can only create events for committees within their branch.' };
        }
      } else if (['committee_head', 'committee_co_head'].includes(role)) {
        if (context.profile.department_id !== dept.id) {
          return { success: false, error: 'Committee Heads can only create events for their own committee.' };
        }
      }
    }

    // Generate unique slug
    let baseSlug = input.slug?.trim() ? generateSlug(input.slug.trim()) : generateSlug(title);
    let finalSlug = baseSlug;
    let slugCounter = 1;

    while (true) {
      const { data: existing } = await admin
        .from('events')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();

      if (!existing) break;
      finalSlug = `${baseSlug}-${slugCounter++}`;
    }

    // Format registration fields
    const registrationFields = (input.registrationFields || []).map((f, idx) => ({
      id: f.id || `field_${idx + 1}_${Date.now()}`,
      label: f.label?.trim() || `Question ${idx + 1}`,
      field_type: f.field_type || 'text',
      options: f.options || [],
      required: Boolean(f.required),
      placeholder: f.placeholder || '',
    }));

    // Format owners
    const owners: EventOwner[] = (input.owners || []).map(o => ({
      profile_id: o.profile_id,
      committee_role: o.committee_role || 'Event Lead',
      full_name: o.full_name,
      email: o.email,
    }));

    // If caller is not in owners, add caller as Creator/Lead by default
    if (!owners.some(o => o.profile_id === context.user!.id)) {
      owners.unshift({
        profile_id: context.user.id,
        committee_role: 'Event Creator',
        full_name: (context.profile as any).full_name_en || context.profile.full_name,
        email: context.profile.email,
      });
    }

    // Insert into events as draft
    const { data: event, error: insertErr } = await admin
      .from('events')
      .insert({
        title,
        slug: finalSlug,
        description: input.description?.trim() || null,
        venue: input.venue?.trim() || null,
        event_date: input.eventDate,
        start_time: input.startTime || null,
        end_time: input.endTime || null,
        capacity,
        department_id: dept.id,
        status: 'draft',
        registration_fields: registrationFields,
        owners,
        created_by: context.user.id,
      })
      .select('*, department:departments(id, name, code, branch)')
      .single();

    if (insertErr || !event) {
      return { success: false, error: `Database error creating event: ${insertErr?.message}` };
    }

    // Seed initial event tasks if provided (Step 8.2)
    if (input.tasks && input.tasks.length > 0) {
      for (const t of input.tasks) {
        if (!t.title?.trim()) continue;
        await createEventTaskInternal(admin, context.user.id, event.id, t);
      }
    }

    revalidatePath('/events');
    revalidatePath('/dashboard');

    return {
      success: true,
      event,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error creating event draft.',
    };
  }
}

async function createEventTaskInternal(
  admin: ReturnType<typeof createAdminClient>,
  callerId: string,
  eventId: string,
  input: EventTaskDraftInput
) {
  const isBroadcast = input.assignmentMode === 'broadcast';
  const { data: newTask, error } = await admin
    .from('tasks')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      department_id: input.departmentId,
      assignee_id: isBroadcast ? null : (input.assigneeId || null),
      assignment_mode: isBroadcast ? 'broadcast' : 'single',
      event_id: eventId,
      priority: input.priority || 'medium',
      status: 'todo',
      deadline: input.deadline ? new Date(input.deadline).toISOString() : null,
      created_by: callerId,
    })
    .select('id, title, department_id')
    .single();

  if (!error && newTask && isBroadcast) {
    const { data: deptMembers } = await admin
      .from('profiles')
      .select('id')
      .eq('department_id', input.departmentId)
      .eq('status', 'active');

    if (deptMembers && deptMembers.length > 0) {
      await admin.from('task_assignees').insert(
        deptMembers.map(m => ({
          task_id: newTask.id,
          profile_id: m.id,
          status: 'todo',
        }))
      );
    }
  }

  // Step 8.3: If this task is an Attendance Check-in duty, automatically add assignee(s) to checkin_access_profile_ids
  const isCheckinDuty = Boolean(
    input.isCheckinDuty ||
    /(attendance|check-?in|حضور|تسجيل حضور)/i.test(input.title)
  );

  if (!error && newTask && isCheckinDuty) {
    try {
      const checkinProfilesToAdd: string[] = [];
      if (!isBroadcast && input.assigneeId) {
        checkinProfilesToAdd.push(input.assigneeId);
      } else if (isBroadcast) {
        const { data: deptMembers } = await admin
          .from('profiles')
          .select('id')
          .eq('department_id', input.departmentId)
          .eq('status', 'active');
        if (deptMembers && deptMembers.length > 0) {
          deptMembers.forEach(m => checkinProfilesToAdd.push(m.id));
        }
      }

      if (checkinProfilesToAdd.length > 0) {
        const { data: curEvent } = await admin
          .from('events')
          .select('checkin_access_profile_ids')
          .eq('id', eventId)
          .maybeSingle();

        if (curEvent) {
          const currentIds: string[] = Array.isArray(curEvent.checkin_access_profile_ids)
            ? curEvent.checkin_access_profile_ids
            : [];
          const merged = Array.from(new Set([...currentIds, ...checkinProfilesToAdd]));
          await admin
            .from('events')
            .update({ checkin_access_profile_ids: merged })
            .eq('id', eventId);
        }
      }
    } catch (checkinErr) {
      console.warn('Error auto-syncing checkin_access_profile_ids (column may be pending migration):', checkinErr);
    }
  }

  return newTask;
}

export async function createEventTask(eventId: string, input: EventTaskDraftInput) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized.' };
    }

    const admin = createAdminClient();

    // Verify event exists
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('id, department_id, status')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Event not found.' };
    }

    const taskTitle = input.title?.trim();
    if (!taskTitle || taskTitle.length < 2) {
      return { success: false, error: 'Task title must be at least 2 characters long.' };
    }

    const deptId = input.departmentId || event.department_id;
    const task = await createEventTaskInternal(admin, context.user.id, eventId, {
      ...input,
      departmentId: deptId,
    });

    if (!task) {
      return { success: false, error: 'Failed to create event task.' };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/tasks`);
    revalidatePath('/tasks');

    return { success: true, task };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error creating event task.',
    };
  }
}

export async function getEventTasks(eventId: string) {
  try {
    const admin = createAdminClient();
    const { data: tasks, error } = await admin
      .from('tasks')
      .select(`
        id,
        title,
        description,
        department_id,
        assignee_id,
        created_by,
        delegated_by_id,
        parent_task_id,
        assignment_mode,
        event_id,
        priority,
        status,
        deadline,
        evidence_url,
        approval_instance_id,
        created_at,
        updated_at,
        departments:department_id (id, name, code, branch),
        assignee:assignee_id (id, full_name, avatar_url, role, position),
        task_assignees (
          id,
          profile_id,
          status,
          evidence_url,
          submitted_at,
          profile:profile_id (id, full_name, avatar_url, role, position)
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, tasks: tasks || [] };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error fetching event tasks.',
    };
  }
}

export async function linkExistingTaskToEvent(taskId: string, eventId: string) {
  try {
    const context = await getUserContext();
    if (!context.user) return { success: false, error: 'Unauthorized.' };

    const admin = createAdminClient();
    const { error } = await admin
      .from('tasks')
      .update({ event_id: eventId })
      .eq('id', taskId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/tasks`);
    revalidatePath('/tasks');

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error linking task.',
    };
  }
}

export async function unlinkTaskFromEvent(taskId: string, eventId: string) {
  try {
    const context = await getUserContext();
    if (!context.user) return { success: false, error: 'Unauthorized.' };

    const admin = createAdminClient();
    const { error } = await admin
      .from('tasks')
      .update({ event_id: null })
      .eq('id', taskId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/tasks`);
    revalidatePath('/tasks');

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error unlinking task.',
    };
  }
}

export async function deleteEventDraft(eventId: string) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized.' };
    }

    const admin = createAdminClient();

    const { data: event, error: fetchErr } = await admin
      .from('events')
      .select('id, status, created_by, department_id')
      .eq('id', eventId)
      .maybeSingle();

    if (fetchErr || !event) {
      return { success: false, error: 'Event not found.' };
    }

    if (event.status !== 'draft') {
      return { success: false, error: 'Only draft events can be deleted.' };
    }

    const isPresidential = ['president', 'co_president'].includes(context.profile.role);
    const isCreator = event.created_by === context.user.id;
    const isDeptHead = context.profile.department_id === event.department_id && ['committee_head', 'committee_co_head'].includes(context.profile.role);

    if (!isPresidential && !isCreator && !isDeptHead) {
      return { success: false, error: 'Forbidden: You do not have permission to delete this event.' };
    }

    // Unlink tasks attached to this event before deletion so tasks are preserved
    await admin.from('tasks').update({ event_id: null }).eq('event_id', eventId);

    const { error: delErr } = await admin
      .from('events')
      .delete()
      .eq('id', eventId);

    if (delErr) {
      return { success: false, error: `Failed to delete event: ${delErr.message}` };
    }

    revalidatePath('/events');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error deleting event.',
    };
  }
}

// ==============================================================================
// Phase 8 Step 8.3: Check-in Access Assignment & Task-Gating Helpers
// Spec reference: §3.17, §4.3 item 5
// ==============================================================================

export async function assignCheckinAccess(eventId: string, profileIds: string[]) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized.' };
    }

    const admin = createAdminClient();
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('id, department_id, checkin_access_profile_ids, title')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Event not found.' };
    }

    const allowedRoles = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'];
    if (!allowedRoles.includes(context.profile.role)) {
      return { success: false, error: 'Forbidden: Insufficient permissions to assign check-in access.' };
    }

    const existing: string[] = Array.isArray(event.checkin_access_profile_ids)
      ? event.checkin_access_profile_ids
      : [];

    const merged = Array.from(new Set([...existing, ...profileIds.filter(Boolean)]));

    const { error: updateErr } = await admin
      .from('events')
      .update({ checkin_access_profile_ids: merged })
      .eq('id', eventId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Auto-create Attendance Check-in duty task for newly assigned profiles if not already created
    for (const pid of profileIds) {
      if (!existing.includes(pid)) {
        await createEventTaskInternal(admin, context.user.id, eventId, {
          title: `Attendance Check-in Duty - ${event.title}`,
          description: 'Responsible for scanning attendee QR codes and managing check-in desk operations.',
          departmentId: event.department_id,
          assigneeId: pid,
          assignmentMode: 'single',
          priority: 'high',
          isCheckinDuty: true,
        });
      }
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/tasks`);
    revalidatePath(`/events/${eventId}/attendance`);

    return { success: true, checkin_access_profile_ids: merged };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error assigning check-in access.',
    };
  }
}

export async function removeCheckinAccess(eventId: string, profileId: string) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized.' };
    }

    const admin = createAdminClient();
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('id, checkin_access_profile_ids')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Event not found.' };
    }

    const allowedRoles = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'];
    if (!allowedRoles.includes(context.profile.role)) {
      return { success: false, error: 'Forbidden: Insufficient permissions to remove check-in access.' };
    }

    const existing: string[] = Array.isArray(event.checkin_access_profile_ids)
      ? event.checkin_access_profile_ids
      : [];

    const updated = existing.filter(id => id !== profileId);

    const { error: updateErr } = await admin
      .from('events')
      .update({ checkin_access_profile_ids: updated })
      .eq('id', eventId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/tasks`);
    revalidatePath(`/events/${eventId}/attendance`);

    return { success: true, checkin_access_profile_ids: updated };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error removing check-in access.',
    };
  }
}

export async function getEventCheckinAccess(eventId: string) {
  try {
    const admin = createAdminClient();
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('id, checkin_access_profile_ids')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Event not found.', members: [] };
    }

    const profileIds: string[] = Array.isArray(event.checkin_access_profile_ids)
      ? event.checkin_access_profile_ids
      : [];

    if (profileIds.length === 0) {
      return { success: true, members: [] };
    }

    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select(`
        id,
        full_name,
        full_name_en,
        email,
        avatar_url,
        role,
        position,
        department:department_id (id, name, code)
      `)
      .in('id', profileIds);

    if (profErr) {
      return { success: false, error: profErr.message, members: [] };
    }

    return { success: true, members: profiles || [] };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error fetching check-in access.',
      members: [],
    };
  }
}

export async function checkUserCheckinAccess(eventId: string, profileId: string): Promise<{
  hasAccess: boolean;
  reason: 'assigned' | 'presidential_override' | 'hr_override' | 'denied' | 'error';
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    // 1. Fetch user profile + department
    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('id, role, department:department_id(id, name, code)')
      .eq('id', profileId)
      .maybeSingle();

    if (profErr || !profile) {
      return { hasAccess: false, reason: 'error', error: 'Profile not found' };
    }

    // 2. Standing override: President or Co-President (§3.17, §4.3 item 5)
    if (['president', 'co_president'].includes(profile.role)) {
      return { hasAccess: true, reason: 'presidential_override' };
    }

    // 3. Standing override: HR committee member (§3.17, §4.3 item 5)
    const deptCode = (profile.department as any)?.code;
    if (deptCode === 'HR') {
      return { hasAccess: true, reason: 'hr_override' };
    }

    // 4. Check explicit checkin_access_profile_ids on the event
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('checkin_access_profile_ids')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { hasAccess: false, reason: 'error', error: 'Event not found' };
    }

    const accessList: string[] = Array.isArray(event.checkin_access_profile_ids)
      ? event.checkin_access_profile_ids
      : [];

    if (accessList.includes(profileId)) {
      return { hasAccess: true, reason: 'assigned' };
    }

    return { hasAccess: false, reason: 'denied' };
  } catch (err: unknown) {
    return {
      hasAccess: false,
      reason: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ==============================================================================
// Phase 8 Step 8.4: Submit Event for Review → Approval Engine Integration
// Spec reference: §4.3 item 2 & §4.2 Part C
// ==============================================================================

export async function submitEventForReview(eventId: string) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized: Active chapter membership required.' };
    }

    const admin = createAdminClient();

    // 1. Fetch event
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('*, department:departments(id, name, code, branch)')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Event not found.' };
    }

    if (!['draft', 'rejected'].includes(event.status)) {
      return { success: false, error: `Event cannot be submitted for review while in '${event.status}' status.` };
    }

    // Role check: Creator, owner, committee head of event, or leadership
    const isPresidential = ['president', 'co_president'].includes(context.profile.role);
    const isBranchHead = context.profile.role === 'branch_head';
    const isDeptHead = context.profile.department_id === event.department_id && ['committee_head', 'committee_co_head'].includes(context.profile.role);
    const userId = context.user.id;
    const isCreator = event.created_by === userId;
    const isOwner = Array.isArray(event.owners) && event.owners.some((o: any) => o.profile_id === userId);

    if (!isPresidential && !isBranchHead && !isDeptHead && !isCreator && !isOwner) {
      return { success: false, error: 'Forbidden: You do not have permission to submit this event for review.' };
    }

    // 2. Call createApprovalInstance (workflow_type = 'event_publish')
    const { instance, computation } = await createApprovalInstance({
      workflowType: 'event_publish',
      entityId: event.id,
      submitterId: userId,
      departmentId: event.department_id,
    });

    const isAutoApproved = computation.isAutoApproved;
    const now = new Date().toISOString();
    let newStatus: EventStatus = 'branch_review';

    if (isAutoApproved) {
      newStatus = 'approved';
    } else {
      const { data: firstStep } = await admin
        .from('approval_instance_steps')
        .select('approver_rule')
        .eq('instance_id', instance.id)
        .eq('step_order', 1)
        .maybeSingle();

      if (firstStep?.approver_rule === 'branch_head') {
        newStatus = 'branch_review';
      } else if (firstStep?.approver_rule === 'president_or_co_president') {
        newStatus = 'pending_final_approval';
      } else {
        newStatus = 'submitted_for_review';
      }
    }

    // 3. Update event record
    const { data: updatedEvent, error: updateErr } = await admin
      .from('events')
      .update({
        status: newStatus,
        approval_instance_id: instance.id,
        updated_at: now,
      })
      .eq('id', eventId)
      .select('*, department:departments(id, name, code, branch)')
      .single();

    if (updateErr || !updatedEvent) {
      return { success: false, error: `Failed to update event: ${updateErr?.message}` };
    }

    // 4. Audit Log write
    await admin.from('audit_logs').insert({
      actor_id: context.user.id,
      action: 'event_submitted_for_review',
      entity_type: 'event_publish',
      entity_id: eventId,
      metadata: {
        previous_status: event.status,
        new_status: newStatus,
        approval_instance_id: instance.id,
        is_auto_approved: isAutoApproved,
      },
    });

    revalidatePath('/events');
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/review`);
    revalidatePath('/approvals');

    return {
      success: true,
      event: updatedEvent,
      instance,
      isAutoApproved,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error submitting event for review.',
    };
  }
}

// ==============================================================================
// Phase 8 Step 8.6: Publish Action (Gated strictly by status = 'approved')
// Spec reference: §4.3 item 3 & §4.3 item 4
// ==============================================================================

export async function publishEvent(eventId: string) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized: Active membership required.' };
    }

    const admin = createAdminClient();

    // 1. Fetch event
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('*, department:departments(id, name, code, branch)')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Event not found.' };
    }

    // Strict Gate: ONLY enabled once status = 'approved' (Spec §4.3 item 3)
    if (event.status !== 'approved') {
      return {
        success: false,
        error: `Event cannot be published until all executive approvals are completed. (Current status: '${event.status}', required: 'approved').`,
      };
    }

    // Check authorization: Creator, owners, host committee head, or Chapter Leadership
    const isPresidential = ['president', 'co_president'].includes(context.profile.role);
    const isBranchHead = context.profile.role === 'branch_head';
    const isDeptHead = context.profile.department_id === event.department_id && ['committee_head', 'committee_co_head'].includes(context.profile.role);
    const userId = context.user.id;
    const isCreator = event.created_by === userId;
    const isOwner = Array.isArray(event.owners) && event.owners.some((o: any) => o.profile_id === userId);

    if (!isPresidential && !isBranchHead && !isDeptHead && !isCreator && !isOwner) {
      return { success: false, error: 'Forbidden: You do not have permission to publish this event.' };
    }

    const now = new Date().toISOString();

    // 2. Update event status to 'published'
    const { data: publishedEvent, error: updateErr } = await admin
      .from('events')
      .update({
        status: 'published',
        updated_at: now,
      })
      .eq('id', eventId)
      .select('*, department:departments(id, name, code, branch)')
      .single();

    if (updateErr || !publishedEvent) {
      return { success: false, error: `Failed to publish event: ${updateErr?.message}` };
    }

    // 3. Write Audit Log
    await admin.from('audit_logs').insert({
      actor_id: userId,
      action: 'event_published',
      entity_type: 'event',
      entity_id: eventId,
      metadata: {
        previous_status: 'approved',
        new_status: 'published',
        slug: publishedEvent.slug,
        title: publishedEvent.title,
      },
    });

    revalidatePath('/events');
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/review`);
    revalidatePath(`/events/${publishedEvent.slug}`);

    return {
      success: true,
      event: publishedEvent,
      publicUrl: `/events/${publishedEvent.slug}`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error publishing event.',
    };
  }
}

export async function unpublishEvent(eventId: string) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized.' };
    }

    const admin = createAdminClient();
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('id, status, slug, title')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Event not found.' };
    }

    const isPresidential = ['president', 'co_president'].includes(context.profile.role);
    if (!isPresidential) {
      return { success: false, error: 'Forbidden: Only Chapter Leadership can unpublish an event.' };
    }

    const now = new Date().toISOString();
    const { data: revertedEvent, error: updateErr } = await admin
      .from('events')
      .update({
        status: 'approved',
        updated_at: now,
      })
      .eq('id', eventId)
      .select()
      .single();

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    await admin.from('audit_logs').insert({
      actor_id: context.user.id,
      action: 'event_unpublished',
      entity_type: 'event',
      entity_id: eventId,
      metadata: { previous_status: event.status, new_status: 'approved' },
    });

    revalidatePath('/events');
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/review`);
    revalidatePath(`/events/${event.slug}`);

    return { success: true, event: revertedEvent };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error unpublishing event.',
    };
  }
}

// ==============================================================================
// Phase 8 Step 8.7: Public Event Page & Registration Actions
// Spec reference: §4.3 item 4 & §6 (/events/[slug])
// ==============================================================================

export interface RegisterForEventInput {
  eventId: string;
  fullName: string;
  email: string;
  phone?: string;
  customAnswers?: Record<string, any>;
}

/**
 * Fetch public event data by slug or UUID.
 * Includes registration counts and capacity status.
 */
export async function getPublicEventBySlug(slugOrId: string) {
  try {
    const admin = createAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    const query = admin
      .from('events')
      .select('*, department:departments(id, name, code, branch)');

    const { data: eventData, error: eventErr } = isUuid
      ? await query.eq('id', slugOrId).maybeSingle()
      : await query.eq('slug', slugOrId).maybeSingle();

    if (eventErr || !eventData) {
      return null;
    }

    // Fetch registration statistics
    const { count: registeredCount } = await admin
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventData.id)
      .eq('status', 'registered');

    const { count: waitlistCount } = await admin
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventData.id)
      .eq('status', 'waitlisted');

    const totalRegistered = registeredCount ?? 0;
    const totalWaitlisted = waitlistCount ?? 0;
    const capacity = eventData.capacity;
    const isCapacityFull = capacity !== null && capacity > 0 && totalRegistered >= capacity;
    const spotsRemaining = capacity !== null && capacity > 0 ? Math.max(0, capacity - totalRegistered) : null;

    return {
      event: {
        ...eventData,
        registration_fields: Array.isArray(eventData.registration_fields) ? eventData.registration_fields : [],
        owners: Array.isArray(eventData.owners) ? eventData.owners : [],
      },
      registeredCount: totalRegistered,
      waitlistCount: totalWaitlisted,
      isCapacityFull,
      spotsRemaining,
    };
  } catch (err) {
    console.error('getPublicEventBySlug error:', err);
    return null;
  }
}

/**
 * Register a attendee (public student or authenticated member) for a published event.
 * Enforces:
 * 1. Event must exist and be published (or preview bypass for admins).
 * 2. Full name & valid email required.
 * 3. Required custom fields must be filled.
 * 4. Duplicate registration prevention by (event_id, email).
 * 5. Automatic waitlist if capacity is reached.
 * 6. Generates unique secure QR code string.
 */
export async function registerForEvent(input: RegisterForEventInput) {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();

    const fullName = (input.fullName || '').trim();
    const email = (input.email || '').trim().toLowerCase();
    const phone = (input.phone || '').trim() || null;
    const customAnswers = input.customAnswers || {};

    // 1. Basic validation
    if (!fullName || fullName.length < 2) {
      return { success: false, error: 'Please enter your full name (at least 2 characters).' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    // 2. Fetch event
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('id, title, slug, status, capacity, registration_fields, event_date, start_time, end_time, venue')
      .eq('id', input.eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Event not found.' };
    }

    // Check if event is open for registration
    const isPresidential = context.profile && ['president', 'co_president'].includes(context.profile.role);
    if (event.status !== 'published' && !isPresidential) {
      return {
        success: false,
        error: `Registration is not open for this event (current status: ${event.status}).`,
      };
    }

    // 3. Check for existing registration
    const { data: existingReg } = await admin
      .from('event_registrations')
      .select('id, full_name, email, qr_code, status, created_at')
      .eq('event_id', event.id)
      .eq('email', email)
      .maybeSingle();

    if (existingReg) {
      return {
        success: false,
        code: 'ALREADY_REGISTERED',
        error: 'You are already registered for this event with this email address.',
        registration: existingReg,
        eventSlug: event.slug,
      };
    }

    // 4. Validate required custom registration questions
    const registrationFields: EventRegistrationField[] = Array.isArray(event.registration_fields)
      ? event.registration_fields
      : [];

    for (const field of registrationFields) {
      if (field.required) {
        const val = customAnswers[field.id];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
          return {
            success: false,
            error: `Please answer the required question: "${field.label}"`,
          };
        }
      }
    }

    // 5. Capacity Check
    let registrationStatus: 'registered' | 'waitlisted' = 'registered';
    if (event.capacity && event.capacity > 0) {
      const { count: currentRegistered } = await admin
        .from('event_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'registered');

      if ((currentRegistered ?? 0) >= event.capacity) {
        registrationStatus = 'waitlisted';
      }
    }

    // 6. Generate Unique QR Code
    // Format: GDGOC-REG-{randomHex}-{randomHex}
    const uniqueQr = `GDGOC-REG-${crypto.randomUUID().toUpperCase()}`;

    // 7. Insert registration
    const { data: newReg, error: insertErr } = await admin
      .from('event_registrations')
      .insert({
        event_id: event.id,
        profile_id: context.user?.id || null,
        full_name: fullName,
        email: email,
        phone: phone,
        custom_answers: customAnswers,
        qr_code: uniqueQr,
        status: registrationStatus,
      })
      .select()
      .single();

    if (insertErr || !newReg) {
      if (insertErr?.code === '23505') {
        // Unique violation fallback
        return {
          success: false,
          code: 'ALREADY_REGISTERED',
          error: 'You are already registered for this event.',
          eventSlug: event.slug,
        };
      }
      return {
        success: false,
        error: insertErr?.message || 'Failed to submit registration. Please try again.',
      };
    }

    // Trigger confirmation & QR email (non-blocking for registration success)
    try {
      await sendEventRegistrationEmail({
        to: newReg.email,
        fullName: newReg.full_name,
        eventTitle: event.title,
        eventSlug: event.slug,
        eventDate: event.event_date,
        startTime: event.start_time,
        endTime: event.end_time,
        venue: event.venue,
        qrCode: newReg.qr_code,
        status: newReg.status,
        registrationId: newReg.id,
      });
    } catch (emailErr) {
      console.warn('Failed to send event registration email:', emailErr);
    }

    // Revalidate public & internal pages
    revalidatePath(`/events/${event.slug}`);
    revalidatePath(`/events/${event.slug}/confirmation`);
    revalidatePath(`/events/${event.id}`);

    return {
      success: true,
      registration: newReg,
      eventSlug: event.slug,
      isWaitlisted: registrationStatus === 'waitlisted',
    };
  } catch (err: unknown) {
    console.error('registerForEvent error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred during registration.',
    };
  }
}

/**
 * Fetch event registration details by registration ID or QR code.
 */
export async function getEventRegistrationById(registrationIdOrQr: string) {
  try {
    const admin = createAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(registrationIdOrQr);

    const query = admin
      .from('event_registrations')
      .select('*, event:events(*, department:departments(id, name, code, branch))');

    const { data: reg, error } = isUuid
      ? await query.eq('id', registrationIdOrQr).maybeSingle()
      : await query.eq('qr_code', registrationIdOrQr).maybeSingle();

    if (error || !reg) return null;
    return reg;
  } catch (err) {
    console.error('getEventRegistrationById error:', err);
    return null;
  }
}

