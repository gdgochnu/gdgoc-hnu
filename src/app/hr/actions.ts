'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import {
  HrDashboardKpis,
  EventAttendanceSummary,
  EventAttendanceRecord,
} from '@/types';

/**
 * Access check for the HR Dashboard (Spec §1.1, §4.5, §3.17):
 * - President & Co-President: Full access
 * - HR Committee (Head, Co-Head, Members): Full access
 * - Non-Tech Branch Head: Full access across non-tech committees including HR
 */
export async function canAccessHrDashboard(): Promise<{
  hasAccess: boolean;
  role?: string;
  isHrMember: boolean;
  isPresidential: boolean;
}> {
  const context = await getUserContext();
  if (!context.user || !context.profile || context.profile.status !== 'active') {
    return { hasAccess: false, isHrMember: false, isPresidential: false };
  }

  const role = context.profile.role;
  const isPresidential = role === 'president' || role === 'co_president';
  if (isPresidential) {
    return { hasAccess: true, role, isHrMember: false, isPresidential: true };
  }

  const deptCode = (context.profile.department as any)?.code;
  const isHrMember = deptCode === 'HR' || deptCode === 'HUMAN_RESOURCES';
  if (isHrMember) {
    return { hasAccess: true, role, isHrMember: true, isPresidential: false };
  }

  const isNonTechBranchHead =
    role === 'branch_head' && (context.profile.department as any)?.branch === 'non_tech';
  if (isNonTechBranchHead) {
    return { hasAccess: true, role, isHrMember: false, isPresidential: false };
  }

  return { hasAccess: false, role, isHrMember: false, isPresidential: false };
}

/**
 * Retrieves aggregate KPI metrics for the HR dashboard (Spec §4.5):
 * - Total Event Registrations (status = 'registered')
 * - Total Checked-in Attendees (count of attendance rows)
 * - Chapter Attendance Rate %
 * - Active Chapter Members count
 * - Events count
 */
export async function getHrDashboardKpis(): Promise<HrDashboardKpis> {
  const admin = createAdminClient();

  try {
    const [
      { count: regCount },
      { count: attCount },
      { count: activeMembersCount },
      { count: eventsCount },
    ] = await Promise.all([
      admin
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'registered'),
      admin
        .from('attendance')
        .select('*', { count: 'exact', head: true }),
      admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      admin
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('status', ['published', 'completed', 'closed']),
    ]);

    const totalRegistrations = regCount || 0;
    const totalCheckedIn = attCount || 0;
    const activeMembers = activeMembersCount || 0;
    const events = eventsCount || 0;

    const attendanceRate =
      totalRegistrations > 0
        ? Number(((totalCheckedIn / totalRegistrations) * 100).toFixed(1))
        : 0;

    return {
      totalRegistrations,
      totalCheckedIn,
      attendanceRate,
      activeMembers,
      eventsCount: events,
    };
  } catch (err: unknown) {
    console.error('getHrDashboardKpis error:', err);
    return {
      totalRegistrations: 0,
      totalCheckedIn: 0,
      attendanceRate: 0,
      activeMembers: 0,
      eventsCount: 0,
    };
  }
}

/**
 * Retrieves event attendance details for a selected event or the latest event (Spec §4.5):
 * - List of available events for the selector
 * - Registered vs. Attended vs. Absent breakdown
 * - Detailed list of attendees with check-in timestamps and methods
 * - Duplicate scan attempts log from audit_logs
 */
export async function getEventAttendanceDetails(
  selectedEventId?: string
): Promise<EventAttendanceSummary> {
  const admin = createAdminClient();

  try {
    // 1. Fetch available events (completed or published, ordered by date desc)
    const { data: eventsListRows } = await admin
      .from('events')
      .select('id, title, slug, event_date, status, venue, capacity')
      .order('event_date', { ascending: false });

    const eventsList = (eventsListRows || []).map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug || e.id,
      event_date: e.event_date,
      status: e.status,
    }));

    if (eventsList.length === 0) {
      return {
        event: null,
        eventsList: [],
        totalRegistered: 0,
        totalAttended: 0,
        totalAbsent: 0,
        attendanceRate: 0,
        attendees: [],
        duplicateScans: [],
      };
    }

    // Determine target event: either selectedEventId or the first event in the list
    const targetEventRow = selectedEventId
      ? eventsListRows?.find((e) => e.id === selectedEventId || e.slug === selectedEventId) || eventsListRows?.[0]
      : eventsListRows?.[0];

    if (!targetEventRow) {
      return {
        event: null,
        eventsList,
        totalRegistered: 0,
        totalAttended: 0,
        totalAbsent: 0,
        attendanceRate: 0,
        attendees: [],
        duplicateScans: [],
      };
    }

    const eventId = targetEventRow.id;

    // 2. Fetch registrations, attendance records, and duplicate scan logs in parallel
    const [
      { data: registrationsRows },
      { data: attendanceRows },
      { data: duplicateAuditRows },
    ] = await Promise.all([
      admin
        .from('event_registrations')
        .select('id, profile_id, full_name, email, phone, status, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true }),
      admin
        .from('attendance')
        .select(`
          id,
          registration_id,
          profile_id,
          check_in_time,
          method,
          checked_in_by,
          officer:profiles!checked_in_by(id, full_name)
        `)
        .eq('event_id', eventId),
      admin
        .from('audit_logs')
        .select('id, metadata, created_at')
        .eq('action', 'qr_checkin_duplicate_prevented')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    // Map attendance by registration_id and profile_id
    const attendanceByRegId = new Map<string, any>();
    const attendanceByProfileId = new Map<string, any>();

    (attendanceRows || []).forEach((att) => {
      if (att.registration_id) {
        attendanceByRegId.set(att.registration_id, att);
      }
      if (att.profile_id) {
        attendanceByProfileId.set(att.profile_id, att);
      }
    });

    // 3. Build attendee records
    const attendees: EventAttendanceRecord[] = (registrationsRows || []).map((reg) => {
      const att =
        attendanceByRegId.get(reg.id) ||
        (reg.profile_id ? attendanceByProfileId.get(reg.profile_id) : null);

      const officerObj = Array.isArray(att?.officer) ? att.officer[0] : att?.officer;

      return {
        registrationId: reg.id,
        profileId: reg.profile_id || null,
        fullName: reg.full_name,
        email: reg.email,
        phone: reg.phone || null,
        registrationStatus: reg.status as any,
        isAttended: Boolean(att),
        checkInTime: att?.check_in_time || null,
        method: att?.method || null,
        checkedInBy: officerObj?.full_name || null,
      };
    });

    const totalRegistered = attendees.length;
    const totalAttended = attendees.filter((a) => a.isAttended).length;
    const totalAbsent = Math.max(0, totalRegistered - totalAttended);
    const attendanceRate =
      totalRegistered > 0
        ? Number(((totalAttended / totalRegistered) * 100).toFixed(1))
        : 0;

    // Filter duplicate scan audit records for this event
    const duplicateScans = (duplicateAuditRows || [])
      .filter((row: any) => row.metadata?.event_id === eventId)
      .map((row: any) => ({
        id: row.id,
        attendeeName: row.metadata?.attendee_name || 'Attendee',
        attendeeEmail: row.metadata?.attendee_email || '—',
        attemptedAt: row.metadata?.attempted_at || row.created_at,
      }));

    return {
      event: {
        id: targetEventRow.id,
        title: targetEventRow.title,
        slug: targetEventRow.slug || targetEventRow.id,
        event_date: targetEventRow.event_date,
        status: targetEventRow.status,
        venue: targetEventRow.venue || null,
        capacity: targetEventRow.capacity || null,
      },
      eventsList,
      totalRegistered,
      totalAttended,
      totalAbsent,
      attendanceRate,
      attendees,
      duplicateScans,
    };
  } catch (err: unknown) {
    console.error('getEventAttendanceDetails error:', err);
    return {
      event: null,
      eventsList: [],
      totalRegistered: 0,
      totalAttended: 0,
      totalAbsent: 0,
      attendanceRate: 0,
      attendees: [],
      duplicateScans: [],
    };
  }
}
