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

// ==============================================================================
// Phase 8 Step 8.9: Smart Attendance (QR Check-in) Server Actions
// Spec reference: §4.3 item 5 & 6, §4.4
// ==============================================================================

export interface RecordQrCheckinInput {
  eventId: string;
  qrCode: string;
}

/**
 * Scan and record an attendee check-in via their unique QR pass.
 * Enforces:
 * 1. Active caller session.
 * 2. Strict Check-in Duty Access Gating (assigned in checkin_access_profile_ids, HR, or President/Co-President).
 * 3. Validates that QR code belongs to this specific event.
 * 4. Blocks waitlisted attendees.
 * 5. Strictly blocks duplicate scans on (event_id, registration_id).
 * 6. Records attendance with check-in timestamp and officer identity.
 */
export async function recordQrCheckin(input: RecordQrCheckinInput) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized: Active membership required.', code: 'UNAUTHORIZED' };
    }

    const admin = createAdminClient();
    const cleanQr = (input.qrCode || '').trim();

    if (!cleanQr) {
      return { success: false, error: 'QR Code cannot be empty.', code: 'EMPTY_QR' };
    }

    // 1. Strict Access Gating Check (§4.3 item 5)
    const accessCheck = await checkUserCheckinAccess(input.eventId, context.user.id);
    if (!accessCheck.hasAccess) {
      return {
        success: false,
        error: 'Forbidden: You do not have check-in duty assigned for this event. Access restricted to assigned team members, HR, and Leadership.',
        code: 'DUTY_ACCESS_DENIED',
      };
    }

    // 2. Fetch event to verify existence
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('id, title, status')
      .eq('id', input.eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Event not found.', code: 'EVENT_NOT_FOUND' };
    }

    // 3. Look up attendee registration by (event_id, qr_code)
    const { data: registration, error: regErr } = await admin
      .from('event_registrations')
      .select('id, event_id, profile_id, full_name, email, phone, status, qr_code')
      .eq('event_id', input.eventId)
      .eq('qr_code', cleanQr)
      .maybeSingle();

    if (regErr || !registration) {
      return {
        success: false,
        error: 'QR Pass not recognized for this event. Please verify the ticket or check registration.',
        code: 'INVALID_QR',
      };
    }

    // Check if attendee is waitlisted
    if (registration.status === 'waitlisted') {
      return {
        success: false,
        error: 'Waitlist Notice: This attendee is currently on the waitlist and has not been confirmed.',
        code: 'WAITLISTED',
        attendee: registration,
      };
    }

    // 4. Duplicate scan check (§4.3 item 6, §4.4)
    const { data: existingAttendance } = await admin
      .from('attendance')
      .select('id, check_in_time, checked_in_by, method')
      .eq('event_id', input.eventId)
      .eq('registration_id', registration.id)
      .maybeSingle();

    if (existingAttendance) {
      return {
        success: false,
        error: 'Duplicate scan! This attendee has already been checked in.',
        code: 'DUPLICATE_CHECKIN',
        alreadyCheckedIn: true,
        checkInTime: existingAttendance.check_in_time,
        attendee: registration,
      };
    }

    // 5. Insert attendance record
    const now = new Date().toISOString();
    const { data: newAttendance, error: attErr } = await admin
      .from('attendance')
      .insert({
        event_id: input.eventId,
        registration_id: registration.id,
        profile_id: registration.profile_id || null,
        check_in_time: now,
        checked_in_by: context.user.id,
        method: 'qr',
      })
      .select()
      .single();

    if (attErr || !newAttendance) {
      if (attErr?.code === '23505') {
        return {
          success: false,
          error: 'Duplicate scan! Already checked in.',
          code: 'DUPLICATE_CHECKIN',
          alreadyCheckedIn: true,
          attendee: registration,
        };
      }
      return { success: false, error: attErr?.message || 'Failed to record attendance.', code: 'INSERT_FAILED' };
    }

    // 6. Record audit log
    await admin.from('audit_logs').insert({
      actor_id: context.user.id,
      action: 'qr_checkin_recorded',
      entity_type: 'attendance',
      entity_id: newAttendance.id,
      metadata: {
        event_id: input.eventId,
        registration_id: registration.id,
        attendee_name: registration.full_name,
        attendee_email: registration.email,
        qr_code: registration.qr_code,
      },
    });

    revalidatePath(`/events/${input.eventId}/attendance`);
    return {
      success: true,
      attendance: newAttendance,
      attendee: registration,
      checkInTime: now,
    };
  } catch (err: unknown) {
    console.error('recordQrCheckin error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error recording QR check-in.',
      code: 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Fetch attendance statistics and recent live check-in stream for an event.
 */
export async function getEventAttendanceStream(eventId: string) {
  try {
    const admin = createAdminClient();

    // 1. Total Registered
    const { count: regCount } = await admin
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'registered');

    // 2. Total Checked In
    const { count: checkinCount } = await admin
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    // 3. Recent check-ins stream (last 20)
    const { data: recentList } = await admin
      .from('attendance')
      .select(`
        id,
        check_in_time,
        method,
        registration:registration_id (id, full_name, email, phone, qr_code),
        checked_in_by_profile:checked_in_by (id, full_name, role)
      `)
      .eq('event_id', eventId)
      .order('check_in_time', { ascending: false })
      .limit(20);

    const totalRegistered = regCount ?? 0;
    const totalCheckedIn = checkinCount ?? 0;
    const attendanceRate = totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0;

    const formattedList = (recentList || []).map((item: any) => ({
      id: item.id as string,
      check_in_time: item.check_in_time as string,
      method: item.method as string,
      registration: (Array.isArray(item.registration) ? item.registration[0] : item.registration) as {
        id: string;
        full_name: string;
        email: string;
        phone?: string | null;
        qr_code: string;
      } | null,
      checked_in_by_profile: (Array.isArray(item.checked_in_by_profile) ? item.checked_in_by_profile[0] : item.checked_in_by_profile) as {
        full_name: string;
        role: string;
      } | null,
    }));

    return {
      totalRegistered,
      totalCheckedIn,
      attendanceRate,
      recentCheckins: formattedList,
    };
  } catch (err) {
    console.error('getEventAttendanceStream error:', err);
    return {
      totalRegistered: 0,
      totalCheckedIn: 0,
      attendanceRate: 0,
      recentCheckins: [],
    };
  }
}

// ==============================================================================
// Phase 8 Step 8.10: Walk-in Manual Check-in (Search & On-site Registration)
// Spec reference: §4.3 item 6, §4.4
// ==============================================================================

export interface SearchAttendeesInput {
  eventId: string;
  query: string;
}

export interface ManualCheckinInput {
  eventId: string;
  registrationId: string;
}

export interface RegisterWalkinInput {
  eventId: string;
  fullName: string;
  email: string;
  phone?: string;
}

/**
 * Search registered attendees for an event by name, phone, or email.
 * Includes current check-in status (timestamp and method if checked in).
 */
export async function searchEventAttendees(input: SearchAttendeesInput) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized.', results: [] };
    }

    const accessCheck = await checkUserCheckinAccess(input.eventId, context.user.id);
    if (!accessCheck.hasAccess) {
      return { success: false, error: 'Forbidden: Insufficient check-in duty permissions.', results: [] };
    }

    const admin = createAdminClient();
    const cleanQuery = (input.query || '').trim();

    if (!cleanQuery || cleanQuery.length < 2) {
      return { success: true, results: [] };
    }

    // 1. Query registrations matching name, email, or phone
    const { data: registrations, error: regErr } = await admin
      .from('event_registrations')
      .select('id, full_name, email, phone, status, qr_code, created_at')
      .eq('event_id', input.eventId)
      .or(`full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`)
      .order('full_name')
      .limit(20);

    if (regErr) {
      return { success: false, error: regErr.message, results: [] };
    }

    if (!registrations || registrations.length === 0) {
      return { success: true, results: [] };
    }

    // 2. Query attendance for these registrations
    const regIds = registrations.map(r => r.id);
    const { data: attendanceRows } = await admin
      .from('attendance')
      .select('registration_id, check_in_time, method')
      .eq('event_id', input.eventId)
      .in('registration_id', regIds);

    const attendanceMap = new Map<string, { check_in_time: string; method: string }>();
    if (attendanceRows) {
      for (const row of attendanceRows) {
        if (row.registration_id) {
          attendanceMap.set(row.registration_id, {
            check_in_time: row.check_in_time,
            method: row.method,
          });
        }
      }
    }

    const results = registrations.map(reg => ({
      ...reg,
      isCheckedIn: attendanceMap.has(reg.id),
      checkInTime: attendanceMap.get(reg.id)?.check_in_time || null,
      checkInMethod: attendanceMap.get(reg.id)?.method || null,
    }));

    return { success: true, results };
  } catch (err: unknown) {
    console.error('searchEventAttendees error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error searching attendees.',
      results: [],
    };
  }
}

/**
 * Record manual check-in for an existing pre-registered attendee.
 * Used when attendee forgot their QR code or phone battery died (§4.4).
 */
export async function recordManualCheckin(input: ManualCheckinInput) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized: Active membership required.', code: 'UNAUTHORIZED' };
    }

    // 1. Strict Check-in Duty Access Gating (§4.3 item 5)
    const accessCheck = await checkUserCheckinAccess(input.eventId, context.user.id);
    if (!accessCheck.hasAccess) {
      return {
        success: false,
        error: 'Forbidden: You do not have check-in duty assigned for this event.',
        code: 'DUTY_ACCESS_DENIED',
      };
    }

    const admin = createAdminClient();

    // 2. Fetch attendee registration
    const { data: registration, error: regErr } = await admin
      .from('event_registrations')
      .select('id, event_id, profile_id, full_name, email, phone, status, qr_code')
      .eq('id', input.registrationId)
      .eq('event_id', input.eventId)
      .maybeSingle();

    if (regErr || !registration) {
      return { success: false, error: 'Registration not found for this event.', code: 'NOT_FOUND' };
    }

    if (registration.status === 'waitlisted') {
      return {
        success: false,
        error: 'Attendee is currently on the waitlist. Registration is not confirmed.',
        code: 'WAITLISTED',
        attendee: registration,
      };
    }

    // 3. Duplicate scan/check-in prevention (§4.4)
    const { data: existingAttendance } = await admin
      .from('attendance')
      .select('id, check_in_time, checked_in_by, method')
      .eq('event_id', input.eventId)
      .eq('registration_id', registration.id)
      .maybeSingle();

    if (existingAttendance) {
      return {
        success: false,
        error: 'Attendee has already been checked in.',
        code: 'DUPLICATE_CHECKIN',
        alreadyCheckedIn: true,
        checkInTime: existingAttendance.check_in_time,
        attendee: registration,
      };
    }

    // 4. Record attendance with method = 'manual'
    const now = new Date().toISOString();
    const { data: newAttendance, error: attErr } = await admin
      .from('attendance')
      .insert({
        event_id: input.eventId,
        registration_id: registration.id,
        profile_id: registration.profile_id || null,
        check_in_time: now,
        checked_in_by: context.user.id,
        method: 'manual',
      })
      .select()
      .single();

    if (attErr || !newAttendance) {
      if (attErr?.code === '23505') {
        return {
          success: false,
          error: 'Duplicate check-in! Already checked in.',
          code: 'DUPLICATE_CHECKIN',
          alreadyCheckedIn: true,
          attendee: registration,
        };
      }
      return { success: false, error: attErr?.message || 'Failed to record manual check-in.' };
    }

    // 5. Audit log
    await admin.from('audit_logs').insert({
      actor_id: context.user.id,
      action: 'manual_checkin_recorded',
      entity_type: 'attendance',
      entity_id: newAttendance.id,
      metadata: {
        event_id: input.eventId,
        registration_id: registration.id,
        attendee_name: registration.full_name,
        attendee_email: registration.email,
        method: 'manual',
      },
    });

    revalidatePath(`/events/${input.eventId}/attendance`);
    return {
      success: true,
      attendance: newAttendance,
      attendee: registration,
      checkInTime: now,
    };
  } catch (err: unknown) {
    console.error('recordManualCheckin error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error recording manual check-in.',
    };
  }
}

/**
 * Fast Walk-in Registration + Immediate Check-in on site (§4.4).
 * Allows check-in officers to register an on-the-spot attendee in under 10 seconds.
 */
export async function registerAndCheckInWalkin(input: RegisterWalkinInput) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized: Active membership required.', code: 'UNAUTHORIZED' };
    }

    // 1. Strict Check-in Duty Access Gating (§4.3 item 5)
    const accessCheck = await checkUserCheckinAccess(input.eventId, context.user.id);
    if (!accessCheck.hasAccess) {
      return {
        success: false,
        error: 'Forbidden: You do not have check-in duty assigned for this event.',
        code: 'DUTY_ACCESS_DENIED',
      };
    }

    const fullName = (input.fullName || '').trim();
    const email = (input.email || '').trim().toLowerCase();
    const phone = (input.phone || '').trim() || null;

    if (!fullName || fullName.length < 2) {
      return { success: false, error: 'Please enter attendee full name (at least 2 characters).' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    const admin = createAdminClient();

    // 2. Check if attendee already has a registration for this event
    const { data: existingReg } = await admin
      .from('event_registrations')
      .select('id, full_name, email, phone, status, qr_code')
      .eq('event_id', input.eventId)
      .eq('email', email)
      .maybeSingle();

    let targetRegistration = existingReg;

    // If not registered yet, create the walk-in registration row
    if (!targetRegistration) {
      const uniqueQr = `GDGOC-REG-WALKIN-${crypto.randomUUID().toUpperCase()}`;
      const { data: createdReg, error: regErr } = await admin
        .from('event_registrations')
        .insert({
          event_id: input.eventId,
          profile_id: null,
          full_name: fullName,
          email: email,
          phone: phone,
          custom_answers: { walk_in: true, registered_by_officer: context.user.id },
          qr_code: uniqueQr,
          status: 'registered',
        })
        .select()
        .single();

      if (regErr || !createdReg) {
        return { success: false, error: regErr?.message || 'Failed to create walk-in registration.' };
      }
      targetRegistration = createdReg;
    }

    if (!targetRegistration) {
      return { success: false, error: 'Could not find or create registration.' };
    }

    // 3. Check if already checked in
    const { data: existingAtt } = await admin
      .from('attendance')
      .select('id, check_in_time, method')
      .eq('event_id', input.eventId)
      .eq('registration_id', targetRegistration.id)
      .maybeSingle();

    if (existingAtt) {
      return {
        success: false,
        error: 'Attendee is already checked in.',
        code: 'DUPLICATE_CHECKIN',
        alreadyCheckedIn: true,
        checkInTime: existingAtt.check_in_time,
        attendee: targetRegistration,
      };
    }

    // 4. Record attendance row with method = 'manual'
    const now = new Date().toISOString();
    const { data: newAttendance, error: attErr } = await admin
      .from('attendance')
      .insert({
        event_id: input.eventId,
        registration_id: targetRegistration.id,
        profile_id: null,
        check_in_time: now,
        checked_in_by: context.user.id,
        method: 'manual',
      })
      .select()
      .single();

    if (attErr || !newAttendance) {
      return { success: false, error: attErr?.message || 'Failed to record walk-in attendance.' };
    }

    // 5. Audit log
    await admin.from('audit_logs').insert({
      actor_id: context.user.id,
      action: 'walkin_registered_and_checked_in',
      entity_type: 'attendance',
      entity_id: newAttendance.id,
      metadata: {
        event_id: input.eventId,
        registration_id: targetRegistration.id,
        attendee_name: targetRegistration.full_name,
        attendee_email: targetRegistration.email,
        method: 'manual',
        is_walkin: true,
      },
    });

    revalidatePath(`/events/${input.eventId}/attendance`);
    return {
      success: true,
      attendance: newAttendance,
      attendee: targetRegistration,
      checkInTime: now,
    };
  } catch (err: unknown) {
    console.error('registerAndCheckInWalkin error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error registering and checking in walk-in.',
    };
  }
}

// ==============================================================================
// Phase 8 Step 8.11: Event Lifecycle Transition to 'completed' (Auto / Manual)
// Spec reference: §4.3 item 7, §4.9, §4.18
// ==============================================================================

export interface CompleteEventInput {
  eventId: string;
  notes?: string;
}

/**
 * Manual transition of an event to 'completed'.
 * Authorized for: President, Co-President, Branch Head, Host Committee Head/Co-Head,
 * Operations Head/Co-Head, or assigned Event Owners/Creator.
 */
export async function completeEvent(input: CompleteEventInput | string) {
  try {
    const eventId = typeof input === 'string' ? input : input.eventId;
    const notes = typeof input === 'string' ? undefined : input.notes;

    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized: Active membership required.', code: 'UNAUTHORIZED' };
    }

    const admin = createAdminClient();

    // 1. Fetch event with hosting department
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('*, department:departments(id, name, code, branch)')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Event not found.', code: 'NOT_FOUND' };
    }

    if (event.status === 'completed') {
      return { success: true, message: 'Event is already marked as completed.', event };
    }

    // 2. Validate status can transition to completed
    // Events must be in 'published', 'closed', or 'approved' status to be completed
    if (!['published', 'closed', 'approved'].includes(event.status)) {
      return {
        success: false,
        error: `Cannot complete event with status '${event.status}'. Event must be approved, published, or closed.`,
        code: 'INVALID_STATUS',
      };
    }

    // 3. Authorization check
    const userId = context.user.id;
    const { role, department } = context.profile;
    const isPresidential = ['president', 'co_president'].includes(role);
    const isHostDeptHead =
      ['committee_head', 'committee_co_head'].includes(role) &&
      department?.id === event.department_id;
    const isBranchHead =
      role === 'branch_head' &&
      department?.branch &&
      department.branch === (event.department as any)?.branch;
    const isOperationsHead =
      ['committee_head', 'committee_co_head'].includes(role) &&
      (department?.code === 'OPERATIONS' || department?.name?.toLowerCase().includes('operations'));
    const isCreator = event.created_by === userId;
    const isOwner =
      Array.isArray(event.owners) &&
      event.owners.some((o: any) => o.profile_id === userId);

    const hasPermission =
      isPresidential ||
      isHostDeptHead ||
      isBranchHead ||
      isOperationsHead ||
      isCreator ||
      isOwner;

    if (!hasPermission) {
      return {
        success: false,
        error: 'Forbidden: You do not have permission to mark this event as completed.',
        code: 'FORBIDDEN',
      };
    }

    // 4. Update event status to 'completed'
    const now = new Date().toISOString();
    const { data: updatedEvent, error: updateErr } = await admin
      .from('events')
      .update({
        status: 'completed',
        updated_at: now,
      })
      .eq('id', eventId)
      .select('*, department:departments(id, name, code, branch)')
      .single();

    if (updateErr || !updatedEvent) {
      return { success: false, error: updateErr?.message || 'Failed to update event status.' };
    }

    // 5. Record audit log
    await admin.from('audit_logs').insert({
      actor_id: context.user.id,
      action: 'event_completed',
      entity_type: 'event',
      entity_id: eventId,
      metadata: {
        mode: 'manual',
        previous_status: event.status,
        new_status: 'completed',
        notes: notes || null,
        completed_by: context.user.id,
        completed_at: now,
      },
    });

    revalidatePath('/events');
    revalidatePath(`/events/${eventId}`);
    if (event.slug) revalidatePath(`/events/${event.slug}`);
    revalidatePath(`/events/${eventId}/attendance`);

    return {
      success: true,
      event: updatedEvent,
      message: 'Event has been successfully marked as completed.',
    };
  } catch (err: unknown) {
    console.error('completeEvent error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error marking event as completed.',
    };
  }
}

/**
 * Close public registration for an event (transitions status from 'published' to 'closed').
 */
export async function closeEvent(eventId: string) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized: Active membership required.', code: 'UNAUTHORIZED' };
    }

    const admin = createAdminClient();
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('*, department:departments(id, name, code, branch)')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Event not found.', code: 'NOT_FOUND' };
    }

    if (event.status !== 'published') {
      return {
        success: false,
        error: `Cannot close event with status '${event.status}'. Only published events can be closed.`,
      };
    }

    // Permission check
    const userId = context.user.id;
    const { role, department } = context.profile;
    const isPresidential = ['president', 'co_president'].includes(role);
    const isHostDeptHead =
      ['committee_head', 'committee_co_head'].includes(role) && department?.id === event.department_id;
    const isBranchHead =
      role === 'branch_head' && department?.branch === (event.department as any)?.branch;
    const isOwner =
      Array.isArray(event.owners) && event.owners.some((o: any) => o.profile_id === userId);
    const isCreator = event.created_by === userId;

    if (!isPresidential && !isHostDeptHead && !isBranchHead && !isOwner && !isCreator) {
      return { success: false, error: 'Forbidden: Insufficient permissions to close registration.' };
    }

    const now = new Date().toISOString();
    const { data: updatedEvent, error: updateErr } = await admin
      .from('events')
      .update({ status: 'closed', updated_at: now })
      .eq('id', eventId)
      .select()
      .single();

    if (updateErr || !updatedEvent) {
      return { success: false, error: updateErr?.message || 'Failed to close event.' };
    }

    await admin.from('audit_logs').insert({
      actor_id: context.user.id,
      action: 'event_closed',
      entity_type: 'event',
      entity_id: eventId,
      metadata: {
        previous_status: 'published',
        new_status: 'closed',
        closed_by: context.user.id,
        closed_at: now,
      },
    });

    revalidatePath('/events');
    revalidatePath(`/events/${eventId}`);
    if (event.slug) revalidatePath(`/events/${event.slug}`);

    return { success: true, event: updatedEvent };
  } catch (err: unknown) {
    console.error('closeEvent error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error closing event.' };
  }
}

/**
 * Automatic transition of past events to 'completed' (§4.3 item 7).
 * Scans all events with status in ('published', 'closed') where event_date < today
 * (or event_date == today with end_time passed) and flips them to 'completed'.
 */
export async function checkAndAutoTransitionPastEvents() {
  try {
    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Fetch all published or closed events whose event_date is past or today
    const { data: candidateEvents, error: fetchErr } = await admin
      .from('events')
      .select('id, title, slug, status, event_date, end_time')
      .in('status', ['published', 'closed'])
      .lte('event_date', today);

    if (fetchErr || !candidateEvents || candidateEvents.length === 0) {
      return { success: true, transitionedCount: 0, eventIds: [] };
    }

    const now = new Date();
    // Compare time for events happening today: if event_date < today, it's definitely past.
    // If event_date === today, check if end_time exists and is passed.
    const currentUtcHours = now.getUTCHours() + 2; // Approx Egypt EET
    const currentTimeStr = `${String(currentUtcHours).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

    const pastEvents = candidateEvents.filter((ev) => {
      if (ev.event_date < today) {
        return true;
      }
      if (ev.event_date === today && ev.end_time) {
        return ev.end_time < currentTimeStr;
      }
      return false;
    });

    if (pastEvents.length === 0) {
      return { success: true, transitionedCount: 0, eventIds: [] };
    }

    const targetIds = pastEvents.map((e) => e.id);
    const timestamp = new Date().toISOString();

    // Batch update events to 'completed'
    const { error: updateErr } = await admin
      .from('events')
      .update({
        status: 'completed',
        updated_at: timestamp,
      })
      .in('id', targetIds);

    if (updateErr) {
      console.error('checkAndAutoTransitionPastEvents update error:', updateErr);
      return { success: false, error: updateErr.message, transitionedCount: 0, eventIds: [] };
    }

    // Insert audit logs for each transitioned event
    const auditEntries = pastEvents.map((ev) => ({
      actor_id: null,
      action: 'event_completed',
      entity_type: 'event',
      entity_id: ev.id,
      metadata: {
        mode: 'auto',
        reason: 'event_date_passed',
        event_date: ev.event_date,
        previous_status: ev.status,
        new_status: 'completed',
        completed_at: timestamp,
      },
    }));

    await admin.from('audit_logs').insert(auditEntries);

    // Revalidate affected paths
    revalidatePath('/events');
    for (const ev of pastEvents) {
      revalidatePath(`/events/${ev.id}`);
      if (ev.slug) revalidatePath(`/events/${ev.slug}`);
    }

    return {
      success: true,
      transitionedCount: pastEvents.length,
      eventIds: targetIds,
    };
  } catch (err: unknown) {
    console.error('checkAndAutoTransitionPastEvents error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error auto-transitioning past events.',
      transitionedCount: 0,
      eventIds: [],
    };
  }
}




