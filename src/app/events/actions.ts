'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { EventRegistrationField, EventOwner } from '@/types';

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
