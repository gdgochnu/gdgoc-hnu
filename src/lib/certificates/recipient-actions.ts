'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import type { CertificateRecipientInput } from '@/types/certificates';

/**
 * GDGoC HNU OS — Certificate Recipient Selection Flow (§4.14)
 * Supports manual member search and bulk selection by event attendance rate.
 */

export interface EventAttendeeRecipient {
  profileId: string | null;
  registrationId: string;
  name: string;
  email: string;
  attendancePct: number;
  checkInTime: string;
  method: string;
}

export interface EventAttendeesResult {
  success: boolean;
  eventId: string;
  eventTitle: string;
  totalAttendees: number;
  qualifyingCount: number;
  recipients: CertificateRecipientInput[];
  attendees: EventAttendeeRecipient[];
  error?: string;
}

/**
 * Fetch published/completed events for certificate issuing
 */
export async function fetchCertificateEventsAction(): Promise<{
  success: boolean;
  events: Array<{ id: string; title: string; starts_at: string; status: string }>;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('events')
      .select('id, title, starts_at, status')
      .in('status', ['completed', 'published', 'draft'])
      .order('starts_at', { ascending: false });

    if (error) throw error;
    return { success: true, events: data || [] };
  } catch (err: any) {
    return { success: false, events: [], error: err.message };
  }
}

/**
 * Bulk select attendees from an event with attendance >= minAttendancePct
 * Spec §4.14: "bulk-select 'everyone who attended Event X with attendance >= Y%'"
 */
export async function getEventAttendeesForCertificatesAction(
  eventId: string,
  minAttendancePct: number = 75
): Promise<EventAttendeesResult> {
  try {
    const admin = createAdminClient();

    // 1. Fetch event title
    const { data: event, error: eventErr } = await admin
      .from('events')
      .select('id, title')
      .eq('id', eventId)
      .single();

    if (eventErr || !event) {
      return {
        success: false,
        eventId,
        eventTitle: '',
        totalAttendees: 0,
        qualifyingCount: 0,
        recipients: [],
        attendees: [],
        error: 'Event not found.',
      };
    }

    // 2. Fetch attendance rows
    const { data: attendances, error: attErr } = await admin
      .from('attendance')
      .select('id, event_id, registration_id, profile_id, check_in_time, method')
      .eq('event_id', eventId);

    if (attErr) {
      return {
        success: false,
        eventId,
        eventTitle: event.title,
        totalAttendees: 0,
        qualifyingCount: 0,
        recipients: [],
        attendees: [],
        error: attErr.message,
      };
    }

    const regIds = (attendances || []).map((a) => a.registration_id).filter(Boolean);
    const profIds = (attendances || []).map((a) => a.profile_id).filter(Boolean);

    const [regsRes, profsRes] = await Promise.all([
      regIds.length > 0
        ? admin.from('event_registrations').select('id, full_name, email').in('id', regIds)
        : Promise.resolve({ data: [] }),
      profIds.length > 0
        ? admin.from('profiles').select('id, full_name, email, attendance_rate').in('id', profIds)
        : Promise.resolve({ data: [] }),
    ]);

    const regMap = new Map<string, { full_name: string; email: string }>();
    (regsRes.data || []).forEach((r: any) => regMap.set(r.id, { full_name: r.full_name, email: r.email }));

    const profMap = new Map<string, { full_name: string; email: string; attendance_rate?: number }>();
    (profsRes.data || []).forEach((p: any) =>
      profMap.set(p.id, { full_name: p.full_name, email: p.email, attendance_rate: p.attendance_rate })
    );

    const allAttendees: EventAttendeeRecipient[] = [];

    (attendances || []).forEach((att) => {
      const reg = att.registration_id ? regMap.get(att.registration_id) : null;
      const prof = att.profile_id ? profMap.get(att.profile_id) : null;

      const name = reg?.full_name || prof?.full_name || 'Event Attendee';
      const email = reg?.email || prof?.email || '';
      const rate = prof?.attendance_rate !== undefined && prof?.attendance_rate !== null && Number(prof.attendance_rate) > 0
        ? Number(prof.attendance_rate)
        : 100;

      allAttendees.push({
        profileId: att.profile_id || null,
        registrationId: att.registration_id,
        name,
        email,
        attendancePct: rate,
        checkInTime: att.check_in_time,
        method: att.method || 'qr',
      });
    });

    // 3. Filter by threshold
    const qualifying = allAttendees.filter((a) => a.attendancePct >= minAttendancePct);

    const recipients: CertificateRecipientInput[] = qualifying.map((a) => ({
      profileId: a.profileId,
      name: a.name,
      email: a.email,
      attendancePct: a.attendancePct,
    }));

    return {
      success: true,
      eventId: event.id,
      eventTitle: event.title,
      totalAttendees: allAttendees.length,
      qualifyingCount: qualifying.length,
      recipients,
      attendees: allAttendees,
    };
  } catch (err: any) {
    return {
      success: false,
      eventId,
      eventTitle: '',
      totalAttendees: 0,
      qualifyingCount: 0,
      recipients: [],
      attendees: [],
      error: err.message,
    };
  }
}

/**
 * Manual search for chapter members
 */
export async function searchMemberRecipientsAction(query: string): Promise<{
  success: boolean;
  members: CertificateRecipientInput[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    let q = admin
      .from('profiles')
      .select('id, full_name, email, attendance_rate')
      .eq('status', 'active')
      .order('full_name')
      .limit(20);

    if (query.trim()) {
      q = q.or(`full_name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`);
    }

    const { data, error } = await q;
    if (error) throw error;

    const members: CertificateRecipientInput[] = (data || []).map((p) => ({
      profileId: p.id,
      name: p.full_name,
      email: p.email,
      attendancePct: p.attendance_rate || 100,
    }));

    return { success: true, members };
  } catch (err: any) {
    return { success: false, members: [], error: err.message };
  }
}
