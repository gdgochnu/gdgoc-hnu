'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';

export interface OperationsItem {
  id: string;
  event_id: string;
  task_name: string;
  phase: 'before' | 'during' | 'after';
  assigned_to: string | null;
  assigned_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role?: string;
  } | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  completed_by_profile?: {
    id: string;
    full_name: string;
  } | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventOperationsSummary {
  items: OperationsItem[];
  stats: {
    total: number;
    completed: number;
    percentage: number;
    before: { total: number; completed: number; percentage: number };
    during: { total: number; completed: number; percentage: number };
    after: { total: number; completed: number; percentage: number };
  };
}

const DEFAULT_OPERATIONS_CHECKLIST: Array<{
  task_name: string;
  phase: 'before' | 'during' | 'after';
  notes?: string;
}> = [
  // Before Event (Planning & Setup)
  { task_name: 'Venue Booking, Hall Reservation & Access Permissions', phase: 'before', notes: 'Confirm reservation with campus administration' },
  { task_name: 'Audio/Visual Equipment Testing (Projectors, Wireless Mics, Clicker)', phase: 'before', notes: 'Test HDMI cables, sound system and display resolution' },
  { task_name: 'Power Outlets, Extension Strips & High-Speed WiFi Verification', phase: 'before', notes: 'Ensure sufficient power ports for speakers and attendees' },
  { task_name: 'Hall Layout, Stage Setup & Seating Arrangement', phase: 'before', notes: 'Arrange speaker podium, front-row VIP seating and pathways' },
  { task_name: 'Signage, Directional Posters & Main Stage Backdrop Roll-ups', phase: 'before', notes: 'Place entrance signs and banner stands at key corridors' },
  { task_name: 'Attendee Registration Desk Setup & Name Badges Organization', phase: 'before', notes: 'Set up check-in scanners and alphabetized badge trays' },
  { task_name: 'Catering / Refreshments Order Confirmation & Delivery Timing', phase: 'before', notes: 'Verify delivery schedule and coffee break station' },
  { task_name: 'Volunteer Team Operations Briefing & Communications Channel', phase: 'before', notes: 'Assign roles (check-in, ushering, stage support, crowd flow)' },

  // During Event (Execution)
  { task_name: 'Registration Desk Management & QR Check-in Coordination', phase: 'during', notes: 'Coordinate queue flow and manual check-in lookups' },
  { task_name: 'Speaker Welcome, Stage Escort & Water Supply Provision', phase: 'during', notes: 'Ensure speakers are mic’d and prepped 10 mins before talk' },
  { task_name: 'Timekeeping & Speaker Session Duration Warnings', phase: 'during', notes: 'Display 5-min and 1-min time cards to presenters' },
  { task_name: 'Crowd Flow Control & Emergency Exits Safety Monitoring', phase: 'during', notes: 'Keep hall doors and emergency corridors completely clear' },
  { task_name: 'Stage Technical Support & Laptop/Adapter Troubleshooting', phase: 'during', notes: 'Stand by for presentation switching or audio issues' },
  { task_name: 'Break Logistics & Refreshment / Coffee Distribution Supervision', phase: 'during', notes: 'Manage break queue and maintain cleanliness around catering' },

  // After Event (Wrap-up & Teardown)
  { task_name: 'Hall Teardown, Trash Clearance & Cleanliness Inspection', phase: 'after', notes: 'Ensure the auditorium/room is left spotless' },
  { task_name: 'Audio/Visual & Chapter Equipment Inventory Count & Return', phase: 'after', notes: 'Pack up mics, adapters, cables, and banners safely' },
  { task_name: 'Leftover Badges, Banners & Swag Storage', phase: 'after', notes: 'Inventory remaining merchandise for the chapter locker' },
  { task_name: 'Lost & Found Items Collection & Announcement', phase: 'after', notes: 'Collect any forgotten belongings and notify attendees' },
  { task_name: 'Formal Venue Handover & Key Return to Campus Administration', phase: 'after', notes: 'Inspect room with facility manager and sign handover log' },
  { task_name: 'Post-Event Operations Volunteers Debrief & Lessons Learned', phase: 'after', notes: 'Conduct 10-min thank you and log improvement notes' },
];

export async function getDefaultOperationsTemplate() {
  return DEFAULT_OPERATIONS_CHECKLIST;
}

/**
 * Fetch Operations checklist items and computed statistics for an event
 */
export async function getEventOperationsChecklist(eventId: string): Promise<EventOperationsSummary> {
  const admin = createAdminClient();

  // Fetch items with profile details
  const { data: rawItems, error } = await admin
    .from('operations_checklist_items')
    .select(`
      id,
      event_id,
      task_name,
      phase,
      assigned_to,
      is_completed,
      completed_at,
      completed_by,
      notes,
      created_at,
      updated_at,
      assigned_profile:profiles!operations_checklist_items_assigned_to_fkey(id, full_name, avatar_url, role),
      completed_by_profile:profiles!operations_checklist_items_completed_by_fkey(id, full_name)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching event operations checklist:', error);
    return {
      items: [],
      stats: {
        total: 0,
        completed: 0,
        percentage: 0,
        before: { total: 0, completed: 0, percentage: 0 },
        during: { total: 0, completed: 0, percentage: 0 },
        after: { total: 0, completed: 0, percentage: 0 },
      },
    };
  }

  const items: OperationsItem[] = (rawItems || []).map((row: any) => ({
    id: row.id,
    event_id: row.event_id,
    task_name: row.task_name,
    phase: row.phase as 'before' | 'during' | 'after',
    assigned_to: row.assigned_to,
    assigned_profile: row.assigned_profile || null,
    is_completed: !!row.is_completed,
    completed_at: row.completed_at,
    completed_by: row.completed_by,
    completed_by_profile: row.completed_by_profile || null,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  // Calculate statistics
  const total = items.length;
  const completed = items.filter((i) => i.is_completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const beforeItems = items.filter((i) => i.phase === 'before');
  const duringItems = items.filter((i) => i.phase === 'during');
  const afterItems = items.filter((i) => i.phase === 'after');

  const calcPhase = (phaseList: OperationsItem[]) => {
    const t = phaseList.length;
    const c = phaseList.filter((i) => i.is_completed).length;
    return {
      total: t,
      completed: c,
      percentage: t > 0 ? Math.round((c / t) * 100) : 0,
    };
  };

  return {
    items,
    stats: {
      total,
      completed,
      percentage,
      before: calcPhase(beforeItems),
      during: calcPhase(duringItems),
      after: calcPhase(afterItems),
    },
  };
}

/**
 * Toggle an item's completion status
 */
export async function toggleOperationsItem(
  itemId: string,
  isCompleted: boolean
): Promise<{ success: boolean; error?: string }> {
  const context = await getUserContext();
  if (!context.user || !context.profile) {
    return { success: false, error: 'Unauthorized: Please sign in' };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from('operations_checklist_items')
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      completed_by: isCompleted ? context.profile.id : null,
    })
    .eq('id', itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Add a new operations item
 */
export async function addOperationsItem(
  eventId: string,
  data: {
    task_name: string;
    phase: 'before' | 'during' | 'after';
    assigned_to?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; item?: OperationsItem; error?: string }> {
  const context = await getUserContext();
  if (!context.user || !context.profile) {
    return { success: false, error: 'Unauthorized: Please sign in' };
  }

  if (!data.task_name?.trim()) {
    return { success: false, error: 'Task name is required' };
  }

  const admin = createAdminClient();

  const { data: inserted, error } = await admin
    .from('operations_checklist_items')
    .insert({
      event_id: eventId,
      task_name: data.task_name.trim(),
      phase: data.phase,
      assigned_to: data.assigned_to || null,
      notes: data.notes?.trim() || null,
      is_completed: false,
    })
    .select(`
      id,
      event_id,
      task_name,
      phase,
      assigned_to,
      is_completed,
      completed_at,
      completed_by,
      notes,
      created_at,
      updated_at,
      assigned_profile:profiles!operations_checklist_items_assigned_to_fkey(id, full_name, avatar_url, role)
    `)
    .single();

  if (error || !inserted) {
    return { success: false, error: error?.message || 'Failed to add operations item' };
  }

  const newItem: OperationsItem = {
    id: inserted.id,
    event_id: inserted.event_id,
    task_name: inserted.task_name,
    phase: inserted.phase as 'before' | 'during' | 'after',
    assigned_to: inserted.assigned_to,
    assigned_profile: (inserted as any).assigned_profile || null,
    is_completed: false,
    completed_at: null,
    completed_by: null,
    notes: inserted.notes,
    created_at: inserted.created_at,
    updated_at: inserted.updated_at,
  };

  return { success: true, item: newItem };
}

/**
 * Delete an operations item
 */
export async function deleteOperationsItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const context = await getUserContext();
  if (!context.user || !context.profile) {
    return { success: false, error: 'Unauthorized: Please sign in' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('operations_checklist_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Seed default standard operations template items for an event
 */
export async function seedDefaultOperationsChecklist(
  eventId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const context = await getUserContext();
  if (!context.user || !context.profile) {
    return { success: false, count: 0, error: 'Unauthorized: Please sign in' };
  }

  const admin = createAdminClient();

  // Check if any items exist already
  const { count } = await admin
    .from('operations_checklist_items')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (count && count > 0) {
    return { success: false, count: 0, error: 'Operations checklist already has items.' };
  }

  const payload = DEFAULT_OPERATIONS_CHECKLIST.map((item) => ({
    event_id: eventId,
    task_name: item.task_name,
    phase: item.phase,
    notes: item.notes || null,
    is_completed: false,
  }));

  const { error } = await admin.from('operations_checklist_items').insert(payload);

  if (error) {
    return { success: false, count: 0, error: error.message };
  }

  return { success: true, count: payload.length };
}

/**
 * Aggregates operations checklist progress across all events for /workspace/operations
 */
export async function getAllOperationsEventsSummary(): Promise<{
  events: Array<{
    id: string;
    title: string;
    slug: string | null;
    event_date: string | null;
    status: string;
    venue: string | null;
    stats: {
      total: number;
      completed: number;
      percentage: number;
      before: { total: number; completed: number };
      during: { total: number; completed: number };
      after: { total: number; completed: number };
    };
  }>;
  overallStats: {
    totalEvents: number;
    totalTasks: number;
    totalCompleted: number;
    percentage: number;
  };
}> {
  const admin = createAdminClient();

  const [{ data: eventsData }, { data: itemsData }] = await Promise.all([
    admin
      .from('events')
      .select('id, title, slug, event_date, status, venue')
      .order('event_date', { ascending: false }),
    admin
      .from('operations_checklist_items')
      .select('id, event_id, phase, is_completed'),
  ]);

  const allEvents = eventsData || [];
  const allItems = itemsData || [];

  // Group items by event_id
  const itemsByEvent = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByEvent.get(item.event_id) || [];
    list.push(item);
    itemsByEvent.set(item.event_id, list);
  }

  let totalTasks = 0;
  let totalCompleted = 0;

  const resultEvents = allEvents.map((evt) => {
    const items = itemsByEvent.get(evt.id) || [];
    const t = items.length;
    const c = items.filter((i) => i.is_completed).length;
    totalTasks += t;
    totalCompleted += c;

    const before = items.filter((i) => i.phase === 'before');
    const during = items.filter((i) => i.phase === 'during');
    const after = items.filter((i) => i.phase === 'after');

    return {
      id: evt.id,
      title: evt.title,
      slug: evt.slug,
      event_date: evt.event_date,
      status: evt.status,
      venue: evt.venue,
      stats: {
        total: t,
        completed: c,
        percentage: t > 0 ? Math.round((c / t) * 100) : 0,
        before: { total: before.length, completed: before.filter((i) => i.is_completed).length },
        during: { total: during.length, completed: during.filter((i) => i.is_completed).length },
        after: { total: after.length, completed: after.filter((i) => i.is_completed).length },
      },
    };
  });

  return {
    events: resultEvents,
    overallStats: {
      totalEvents: allEvents.length,
      totalTasks,
      totalCompleted,
      percentage: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
    },
  };
}
