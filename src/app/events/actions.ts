'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { EventRegistrationField, EventOwner, TaskPriority, TaskAssignmentMode } from '@/types';

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

