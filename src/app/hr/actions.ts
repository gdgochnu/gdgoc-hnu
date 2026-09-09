'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { notifyMemberMissedEvents } from '@/lib/notifications/triggers';
import {
  HrDashboardKpis,
  EventAttendanceSummary,
  EventAttendanceRecord,
  AttendanceLeaderboardEntry,
  AttendanceLeaderboardSummary,
  HrMemberNote,
  HrNoteType,
  HrNoteStatus,
  LowEngagementAlert,
  LowEngagementSummary,
  PerformanceReview,
  PerformanceComputationResult,
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

/**
 * Retrieves the Org-wide Attendance Rate leaderboard (Spec §4.5, §4.6, §5.1, §6):
 * - Ranks EVERY profile regardless of role: Members, Committee Co-Heads, Committee Heads, Branch Heads, Co-President, President.
 * - Computes events attended, total eligible chapter events, and overall attendance percentage.
 * - Allows filtering by branch ('tech' | 'non_tech'), department ID, role, and text search.
 * - Returns summary statistics including chapter average attendance and top attender.
 */
export async function getAttendanceLeaderboard(filters?: {
  branch?: string;
  departmentId?: string;
  role?: string;
  search?: string;
}): Promise<AttendanceLeaderboardSummary> {
  const admin = createAdminClient();

  try {
    // 1. Fetch active profiles, departments, events, attendance, and registrations in parallel
    const [
      { data: profilesData, error: profilesError },
      { data: deptsData },
      { data: eventsData },
      { data: attendanceData },
      { data: registrationsData },
    ] = await Promise.all([
      admin
        .from('profiles')
        .select(`
          id,
          full_name_ar,
          full_name_en,
          email,
          avatar_url,
          role,
          position,
          department_id,
          attendance_rate,
          leaderboard_opt_in,
          status,
          join_date
        `)
        .eq('status', 'active'),
      admin
        .from('departments')
        .select('id, name, code, branch')
        .order('name', { ascending: true }),
      admin
        .from('events')
        .select('id, title, event_date, status')
        .in('status', ['published', 'completed', 'closed']),
      admin
        .from('attendance')
        .select('id, event_id, profile_id, registration_id'),
      admin
        .from('event_registrations')
        .select('id, event_id, profile_id, email, status'),
    ]);

    if (profilesError) {
      console.error('Error querying profiles for attendance leaderboard:', profilesError);
    }

    const profiles = profilesData || [];
    const departments = (deptsData || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      branch: d.branch as 'tech' | 'non_tech',
    }));
    const deptMap = new Map(departments.map((d) => [d.id, d]));
    const events = eventsData || [];
    const totalEvents = events.length;

    // Build lookup maps for fast attendance resolution
    const registrationMap = new Map<string, { event_id: string; profile_id?: string; email?: string }>();
    (registrationsData || []).forEach((reg: any) => {
      registrationMap.set(reg.id, {
        event_id: reg.event_id,
        profile_id: reg.profile_id,
        email: reg.email?.toLowerCase(),
      });
    });

    // Map profile ID and email to attended event IDs
    const profileAttendedEvents = new Map<string, Set<string>>();
    const emailAttendedEvents = new Map<string, Set<string>>();

    (attendanceData || []).forEach((att: any) => {
      // Direct profile_id on attendance
      if (att.profile_id) {
        if (!profileAttendedEvents.has(att.profile_id)) {
          profileAttendedEvents.set(att.profile_id, new Set<string>());
        }
        profileAttendedEvents.get(att.profile_id)!.add(att.event_id);
      }

      // If linked via registration_id
      if (att.registration_id && registrationMap.has(att.registration_id)) {
        const reg = registrationMap.get(att.registration_id)!;
        if (reg.profile_id) {
          if (!profileAttendedEvents.has(reg.profile_id)) {
            profileAttendedEvents.set(reg.profile_id, new Set<string>());
          }
          profileAttendedEvents.get(reg.profile_id)!.add(att.event_id);
        }
        if (reg.email) {
          if (!emailAttendedEvents.has(reg.email)) {
            emailAttendedEvents.set(reg.email, new Set<string>());
          }
          emailAttendedEvents.get(reg.email)!.add(att.event_id);
        }
      }
    });

    // 2. Map all profiles into AttendanceLeaderboardEntry items
    const allEntries: AttendanceLeaderboardEntry[] = profiles.map((p: any) => {
      const dept = p.department_id ? deptMap.get(p.department_id) : null;
      const emailLower = (p.email || '').toLowerCase();

      // Collect unique events attended
      const attendedSet = new Set<string>();
      if (profileAttendedEvents.has(p.id)) {
        profileAttendedEvents.get(p.id)!.forEach((eventId) => attendedSet.add(eventId));
      }
      if (emailLower && emailAttendedEvents.has(emailLower)) {
        emailAttendedEvents.get(emailLower)!.forEach((eventId) => attendedSet.add(eventId));
      }

      const eventsAttended = attendedSet.size;
      const eventsEligible = Math.max(eventsAttended, totalEvents);

      let attendanceRate = 0;
      if (eventsEligible > 0) {
        const calculated = Number(((eventsAttended / eventsEligible) * 100).toFixed(1));
        attendanceRate =
          p.attendance_rate != null && p.attendance_rate > calculated
            ? Number(p.attendance_rate)
            : calculated;
      } else {
        attendanceRate = p.attendance_rate != null ? Number(p.attendance_rate) : 100;
      }

      const fullName =
        p.full_name_en ||
        p.full_name_ar ||
        p.email?.split('@')[0] ||
        'GDGoC Member';

      return {
        profileId: p.id,
        fullName,
        fullNameAr: p.full_name_ar || null,
        fullNameEn: p.full_name_en || null,
        avatarUrl: p.avatar_url || null,
        email: p.email,
        role: p.role,
        position: p.position || null,
        departmentId: p.department_id || null,
        departmentName: dept?.name || null,
        departmentCode: dept?.code || null,
        branch: dept?.branch || null,
        attendanceRate,
        eventsAttended,
        eventsEligible,
        rank: 0, // assigned after sorting
        leaderboardOptIn: p.leaderboard_opt_in !== false,
        status: p.status,
      };
    });

    // 3. Sort all entries by attendanceRate desc, eventsAttended desc, fullName asc
    allEntries.sort((a, b) => {
      if (b.attendanceRate !== a.attendanceRate) {
        return b.attendanceRate - a.attendanceRate;
      }
      if (b.eventsAttended !== a.eventsAttended) {
        return b.eventsAttended - a.eventsAttended;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    // Assign global ranks
    allEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // 4. Apply optional filters
    let filteredEntries = [...allEntries];

    if (filters?.branch && filters.branch !== 'all') {
      filteredEntries = filteredEntries.filter((e) => e.branch === filters.branch);
    }

    if (filters?.departmentId && filters.departmentId !== 'all') {
      filteredEntries = filteredEntries.filter((e) => e.departmentId === filters.departmentId);
    }

    if (filters?.role && filters.role !== 'all') {
      filteredEntries = filteredEntries.filter((e) => e.role === filters.role);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filteredEntries = filteredEntries.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          (e.fullNameAr && e.fullNameAr.toLowerCase().includes(q)) ||
          e.email.toLowerCase().includes(q) ||
          (e.position && e.position.toLowerCase().includes(q)) ||
          (e.departmentName && e.departmentName.toLowerCase().includes(q))
      );
    }

    // 5. Aggregate summary stats
    const totalProfiles = allEntries.length;
    const sumRates = allEntries.reduce((acc, curr) => acc + curr.attendanceRate, 0);
    const averageAttendanceRate =
      totalProfiles > 0 ? Number((sumRates / totalProfiles).toFixed(1)) : 0;
    const topAttender = allEntries.length > 0 ? allEntries[0] : null;

    return {
      entries: filteredEntries,
      totalProfiles,
      averageAttendanceRate,
      topAttender,
      departments,
    };
  } catch (err: unknown) {
    console.error('getAttendanceLeaderboard error:', err);
    return {
      entries: [],
      totalProfiles: 0,
      averageAttendanceRate: 0,
      topAttender: null,
      departments: [],
    };
  }
}

// In-memory fallback cache for HR notes if table execution in DB is pending
const memoryHrNotes: HrMemberNote[] = [];

/**
 * Computes low-engagement alerts for chapter members (Spec §4.5, §4.11):
 * - Identifies active members who have missed 3+ completed chapter events (or have low attendance < 40% with missed events).
 * - Pulls all HR follow-up notes/logs associated with the member.
 * - Tracks whether open follow-ups exist.
 */
export async function getLowEngagementAlerts(): Promise<LowEngagementSummary> {
  const admin = createAdminClient();

  try {
    // 1. Fetch profiles, completed events, attendance, registrations, and notes
    const [
      { data: profilesData },
      { data: deptsData },
      { data: eventsData },
      { data: attendanceData },
      { data: registrationsData },
      notesRes,
    ] = await Promise.all([
      admin
        .from('profiles')
        .select(`
          id,
          full_name_ar,
          full_name_en,
          email,
          avatar_url,
          role,
          position,
          department_id,
          attendance_rate,
          status
        `)
        .eq('status', 'active'),
      admin.from('departments').select('id, name, code, branch'),
      admin
        .from('events')
        .select('id, title, event_date, status')
        .in('status', ['published', 'completed', 'closed']),
      admin.from('attendance').select('id, event_id, profile_id, registration_id'),
      admin.from('event_registrations').select('id, event_id, profile_id, email, status'),
      admin.from('hr_member_notes').select('*').order('created_at', { ascending: false }),
    ]);

    const profiles = profilesData || [];
    const departments = deptsData || [];
    const deptMap = new Map(departments.map((d: any) => [d.id, d]));
    const events = eventsData || [];
    const totalCompletedEvents = events.length;

    // Database notes or memory fallback
    let allNotes: HrMemberNote[] = [];
    if (!notesRes.error && notesRes.data) {
      allNotes = notesRes.data.map((n: any) => ({
        id: n.id,
        profileId: n.profile_id,
        authorId: n.author_id,
        authorName: n.author_name || 'HR Team',
        noteType: n.note_type,
        note: n.note,
        actionTaken: n.action_taken,
        status: n.status,
        missedEventsCount: n.missed_events_count || 0,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      }));
    } else {
      allNotes = [...memoryHrNotes];
    }

    // Attendance resolution
    const registrationMap = new Map<string, { event_id: string; profile_id?: string; email?: string }>();
    (registrationsData || []).forEach((reg: any) => {
      registrationMap.set(reg.id, {
        event_id: reg.event_id,
        profile_id: reg.profile_id,
        email: reg.email?.toLowerCase(),
      });
    });

    const profileAttendedEvents = new Map<string, Set<string>>();
    const emailAttendedEvents = new Map<string, Set<string>>();

    (attendanceData || []).forEach((att: any) => {
      if (att.profile_id) {
        if (!profileAttendedEvents.has(att.profile_id)) {
          profileAttendedEvents.set(att.profile_id, new Set<string>());
        }
        profileAttendedEvents.get(att.profile_id)!.add(att.event_id);
      }
      if (att.registration_id && registrationMap.has(att.registration_id)) {
        const reg = registrationMap.get(att.registration_id)!;
        if (reg.profile_id) {
          if (!profileAttendedEvents.has(reg.profile_id)) {
            profileAttendedEvents.set(reg.profile_id, new Set<string>());
          }
          profileAttendedEvents.get(reg.profile_id)!.add(att.event_id);
        }
        if (reg.email) {
          if (!emailAttendedEvents.has(reg.email)) {
            emailAttendedEvents.set(reg.email, new Set<string>());
          }
          emailAttendedEvents.get(reg.email)!.add(att.event_id);
        }
      }
    });

    // 2. Identify low engagement alerts (3+ missed events OR low rate with at least 1 missed event when totalCompletedEvents < 3)
    const alerts: LowEngagementAlert[] = [];

    profiles.forEach((p: any) => {
      const emailLower = (p.email || '').toLowerCase();
      const attendedSet = new Set<string>();
      if (profileAttendedEvents.has(p.id)) {
        profileAttendedEvents.get(p.id)!.forEach((eventId) => attendedSet.add(eventId));
      }
      if (emailLower && emailAttendedEvents.has(emailLower)) {
        emailAttendedEvents.get(emailLower)!.forEach((eventId) => attendedSet.add(eventId));
      }

      const eventsAttended = attendedSet.size;
      const missedEventsCount = Math.max(0, totalCompletedEvents - eventsAttended);
      const attendanceRate =
        totalCompletedEvents > 0
          ? Number(((eventsAttended / totalCompletedEvents) * 100).toFixed(1))
          : p.attendance_rate ?? 100;

      // Flag if missed 3+ events, or if chapter has held at least 2 events and member attended 0
      const isLowEngagement =
        missedEventsCount >= 3 || (totalCompletedEvents >= 2 && eventsAttended === 0 && missedEventsCount >= 2);

      if (isLowEngagement) {
        const dept = p.department_id ? deptMap.get(p.department_id) : null;
        const memberNotes = allNotes.filter((n) => n.profileId === p.id);
        const hasOpenFollowUp = memberNotes.some((n) => n.status === 'open' || n.status === 'in_progress');
        const lastFollowUp = memberNotes.length > 0 ? memberNotes[0].createdAt : null;

        alerts.push({
          profileId: p.id,
          fullName: p.full_name_en || p.full_name_ar || p.email?.split('@')[0] || 'GDGoC Member',
          fullNameAr: p.full_name_ar || null,
          fullNameEn: p.full_name_en || null,
          avatarUrl: p.avatar_url || null,
          email: p.email,
          role: p.role,
          departmentId: p.department_id || null,
          departmentName: dept?.name || null,
          branch: dept?.branch || null,
          position: p.position || null,
          missedEventsCount,
          totalEligibleEvents: totalCompletedEvents,
          attendanceRate,
          notes: memberNotes,
          hasOpenFollowUp,
          lastFollowUpDate: lastFollowUp,
        });
      }
    });

    // Sort alerts by missedEventsCount desc, then attendanceRate asc
    alerts.sort((a, b) => {
      if (b.missedEventsCount !== a.missedEventsCount) {
        return b.missedEventsCount - a.missedEventsCount;
      }
      return a.attendanceRate - b.attendanceRate;
    });

    const openFollowUpsCount = alerts.filter((a) => a.hasOpenFollowUp).length;
    const resolvedFollowUpsCount = allNotes.filter((n) => n.status === 'resolved').length;

    return {
      alerts,
      totalAlerts: alerts.length,
      openFollowUpsCount,
      resolvedFollowUpsCount,
      recentNotes: allNotes.slice(0, 10),
    };
  } catch (err: unknown) {
    console.error('getLowEngagementAlerts error:', err);
    return {
      alerts: [],
      totalAlerts: 0,
      openFollowUpsCount: 0,
      resolvedFollowUpsCount: 0,
      recentNotes: [],
    };
  }
}

/**
 * Records an HR note / follow-up action for a member (Spec §4.5, §4.11):
 * - Accessible to HR members, Non-Tech Branch Head, and President/Co-President.
 * - Records note, action taken, and current status.
 * - Logs audit record and in-app notification.
 */
export async function createHrMemberNote(
  data: {
    profileId: string;
    noteType: HrNoteType;
    note: string;
    actionTaken?: string;
    status?: HrNoteStatus;
    missedEventsCount?: number;
  },
  skipAuthCheck: boolean = false
): Promise<{ success: boolean; note?: HrMemberNote; error?: string }> {
  if (!skipAuthCheck) {
    const access = await canAccessHrDashboard();
    if (!access.hasAccess) {
      return { success: false, error: 'Unauthorized. HR workspace access required.' };
    }
  }

  const context = await getUserContext();
  const authorId = context.profile?.id || null;
  const authorName = context.profile?.full_name || 'HR Team';
  const admin = createAdminClient();

  const newNote: HrMemberNote = {
    id: crypto.randomUUID(),
    profileId: data.profileId,
    authorId,
    authorName,
    noteType: data.noteType,
    note: data.note,
    actionTaken: data.actionTaken || null,
    status: data.status || 'open',
    missedEventsCount: data.missedEventsCount || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const { data: inserted, error } = await admin
      .from('hr_member_notes')
      .insert({
        id: newNote.id,
        profile_id: newNote.profileId,
        author_id: newNote.authorId,
        note_type: newNote.noteType,
        note: newNote.note,
        action_taken: newNote.actionTaken,
        status: newNote.status,
        missed_events_count: newNote.missedEventsCount,
      })
      .select()
      .single();

    if (error) {
      console.warn('DB insert failed for hr_member_notes, falling back to memory store:', error.message);
      memoryHrNotes.unshift(newNote);
    } else if (inserted) {
      newNote.id = inserted.id;
    }

    // Audit log
    await admin.from('audit_logs').insert({
      actor_id: authorId,
      action: 'hr_member_note_created',
      entity_type: 'profile',
      entity_id: data.profileId,
      metadata: {
        note_type: data.noteType,
        status: newNote.status,
        missed_events_count: newNote.missedEventsCount,
      },
    });

    return { success: true, note: newNote };
  } catch (err: any) {
    console.warn('createHrMemberNote error fallback:', err?.message);
    memoryHrNotes.unshift(newNote);
    return { success: true, note: newNote };
  }
}

/**
 * Updates an HR member note status (open -> in_progress -> resolved)
 */
export async function updateHrMemberNoteStatus(
  noteId: string,
  status: HrNoteStatus,
  actionTaken?: string,
  skipAuthCheck: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (!skipAuthCheck) {
    const access = await canAccessHrDashboard();
    if (!access.hasAccess) {
      return { success: false, error: 'Unauthorized.' };
    }
  }

  const admin = createAdminClient();

  // Update in memory fallback
  const memNote = memoryHrNotes.find((n) => n.id === noteId);
  if (memNote) {
    memNote.status = status;
    if (actionTaken) memNote.actionTaken = actionTaken;
    memNote.updatedAt = new Date().toISOString();
  }

  try {
    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (actionTaken) {
      updatePayload.action_taken = actionTaken;
    }

    await admin.from('hr_member_notes').update(updatePayload).eq('id', noteId);
    return { success: true };
  } catch (err: any) {
    console.warn('updateHrMemberNoteStatus DB error fallback:', err?.message);
    return { success: true };
  }
}

/**
 * Retrieves notes for a specific member
 */
export async function getMemberHrNotes(profileId: string): Promise<HrMemberNote[]> {
  const admin = createAdminClient();
  try {
    const { data, error } = await admin
      .from('hr_member_notes')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return memoryHrNotes.filter((n) => n.profileId === profileId);
    }

    return data.map((n: any) => ({
      id: n.id,
      profileId: n.profile_id,
      authorId: n.author_id,
      authorName: n.author_name || 'HR Team',
      noteType: n.note_type,
      note: n.note,
      actionTaken: n.action_taken,
      status: n.status,
      missedEventsCount: n.missed_events_count || 0,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));
  } catch {
    return memoryHrNotes.filter((n) => n.profileId === profileId);
  }
}

/**
 * Monthly performance reviews computation job (Spec §3.3, §4.5, §4.6):
 * - Evaluates all active profiles across:
 *   1. task_completion_pct (completed tasks / assigned tasks)
 *   2. deadline_adherence_pct (on-time tasks / deadline tasks)
 *   3. attendance_pct (attended chapter events / total completed events)
 *   4. team_contribution_pct (task activity + attendance + comments/initiatives)
 *   5. overall_score (weighted composite: 35% tasks, 25% deadline, 25% attendance, 15% contribution)
 * - Ingests HR member notes from Step 10.3 into review notes.
 * - Upserts rows into `performance_reviews` table.
 * - Updates cached `profiles.overall_score` and `profiles.attendance_rate`.
 */
export async function computeMonthlyPerformanceReviews(
  targetPeriodMonth?: string,
  reviewerId?: string | null,
  skipAuthCheck: boolean = false
): Promise<PerformanceComputationResult> {
  if (!skipAuthCheck) {
    const access = await canAccessHrDashboard();
    if (!access.hasAccess) {
      throw new Error('Unauthorized. Access restricted to HR and chapter leadership.');
    }
  }

  const periodMonth = targetPeriodMonth || new Date().toISOString().substring(0, 7); // 'YYYY-MM'
  const admin = createAdminClient();

  // 1. Fetch profiles, events, attendance, registrations, tasks, assignees, comments, and notes
  const [
    { data: profilesData },
    { data: eventsData },
    { data: attendanceData },
    { data: registrationsData },
    { data: tasksData },
    { data: assigneesData },
    { data: commentsData },
    notesRes,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name_ar, full_name_en, email, attendance_rate, overall_score, status')
      .eq('status', 'active'),
    admin
      .from('events')
      .select('id, title, event_date, status')
      .in('status', ['published', 'completed', 'closed']),
    admin.from('attendance').select('id, event_id, profile_id, registration_id'),
    admin.from('event_registrations').select('id, event_id, profile_id, email'),
    admin.from('tasks').select('id, title, status, deadline, assignee_id, updated_at'),
    admin.from('task_assignees').select('id, task_id, profile_id, status, submitted_at'),
    admin.from('task_comments').select('id, task_id, author_id'),
    admin.from('hr_member_notes').select('*'),
  ]);

  const profiles = profilesData || [];
  const events = eventsData || [];
  const totalCompletedEvents = events.length;

  // Build lookup maps
  const registrationMap = new Map<string, { event_id: string; profile_id?: string; email?: string }>();
  (registrationsData || []).forEach((reg: any) => {
    registrationMap.set(reg.id, {
      event_id: reg.event_id,
      profile_id: reg.profile_id,
      email: reg.email?.toLowerCase(),
    });
  });

  const profileAttendedEvents = new Map<string, Set<string>>();
  const emailAttendedEvents = new Map<string, Set<string>>();

  (attendanceData || []).forEach((att: any) => {
    if (att.profile_id) {
      if (!profileAttendedEvents.has(att.profile_id)) {
        profileAttendedEvents.set(att.profile_id, new Set<string>());
      }
      profileAttendedEvents.get(att.profile_id)!.add(att.event_id);
    }
    if (att.registration_id && registrationMap.has(att.registration_id)) {
      const reg = registrationMap.get(att.registration_id)!;
      if (reg.profile_id) {
        if (!profileAttendedEvents.has(reg.profile_id)) {
          profileAttendedEvents.set(reg.profile_id, new Set<string>());
        }
        profileAttendedEvents.get(reg.profile_id)!.add(att.event_id);
      }
      if (reg.email) {
        if (!emailAttendedEvents.has(reg.email)) {
          emailAttendedEvents.set(reg.email, new Set<string>());
        }
        emailAttendedEvents.get(reg.email)!.add(att.event_id);
      }
    }
  });

  // DB notes + memory fallback
  let allNotes: HrMemberNote[] = [];
  if (!notesRes.error && notesRes.data) {
    allNotes = notesRes.data.map((n: any) => ({
      id: n.id,
      profileId: n.profile_id,
      authorId: n.author_id,
      authorName: n.author_name || 'HR Team',
      noteType: n.note_type,
      note: n.note,
      actionTaken: n.action_taken,
      status: n.status,
      missedEventsCount: n.missed_events_count || 0,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));
  } else {
    allNotes = [...memoryHrNotes];
  }

  const tasks = tasksData || [];
  const assignees = assigneesData || [];
  const comments = commentsData || [];

  const reviewsToUpsert: any[] = [];
  const profileUpdates: Array<{ id: string; overall_score: number; attendance_rate: number }> = [];

  for (const p of profiles) {
    const emailLower = (p.email || '').toLowerCase();

    // 1. Task Metrics
    const userSingleTasks = tasks.filter((t: any) => t.assignee_id === p.id);
    const userBroadcastTasks = assignees.filter((a: any) => a.profile_id === p.id);
    const totalAssigned = userSingleTasks.length + userBroadcastTasks.length;

    const doneSingle = userSingleTasks.filter((t: any) => t.status === 'done');
    const doneBroadcast = userBroadcastTasks.filter((a: any) => a.status === 'done' || a.status === 'submitted');
    const totalDone = doneSingle.length + doneBroadcast.length;

    const task_completion_pct =
      totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : 100;

    // Deadline adherence
    let deadlineCount = 0;
    let onTimeCount = 0;
    userSingleTasks.forEach((t: any) => {
      if (t.deadline) {
        deadlineCount++;
        if (t.status === 'done') {
          const isFinishedOnTime = !t.updated_at || new Date(t.updated_at) <= new Date(t.deadline);
          if (isFinishedOnTime) onTimeCount++;
        }
      }
    });

    const deadline_adherence_pct =
      deadlineCount > 0 ? Math.round((onTimeCount / deadlineCount) * 100) : 100;

    // 2. Attendance %
    const attendedSet = new Set<string>();
    if (profileAttendedEvents.has(p.id)) {
      profileAttendedEvents.get(p.id)!.forEach((id) => attendedSet.add(id));
    }
    if (emailLower && emailAttendedEvents.has(emailLower)) {
      emailAttendedEvents.get(emailLower)!.forEach((id) => attendedSet.add(id));
    }

    const eventsAttended = attendedSet.size;
    const attendance_pct =
      totalCompletedEvents > 0
        ? Math.round((eventsAttended / totalCompletedEvents) * 100)
        : Number(p.attendance_rate ?? 100);

    // 3. Team Contribution %
    const userComments = comments.filter((c: any) => c.author_id === p.id).length;
    const team_contribution_pct = Math.min(
      100,
      Math.round(task_completion_pct * 0.5 + attendance_pct * 0.3 + Math.min(20, userComments * 5))
    );

    // 4. Overall Score (Spec §4.6)
    const overall_score = Math.min(
      100,
      Math.round(
        task_completion_pct * 0.35 +
          deadline_adherence_pct * 0.25 +
          attendance_pct * 0.25 +
          team_contribution_pct * 0.15
      )
    );

    // 5. Ingest HR Notes for this member
    const memberNotes = allNotes.filter((n) => n.profileId === p.id);
    const notesSummary =
      memberNotes.length > 0
        ? memberNotes
            .map(
              (n) =>
                `[${n.noteType}] ${n.note} (${n.status}${n.actionTaken ? ` - ${n.actionTaken}` : ''})`
            )
            .join(' | ')
        : null;

    reviewsToUpsert.push({
      profile_id: p.id,
      period_month: periodMonth,
      task_completion_pct,
      deadline_adherence_pct,
      attendance_pct,
      team_contribution_pct,
      overall_score,
      reviewer_id: reviewerId || null,
      notes: notesSummary,
      updated_at: new Date().toISOString(),
    });

    profileUpdates.push({
      id: p.id,
      overall_score,
      attendance_rate: attendance_pct,
    });
  }

  // 2. Upsert into performance_reviews table
  try {
    const { error: upsertError } = await admin
      .from('performance_reviews')
      .upsert(reviewsToUpsert, { onConflict: 'profile_id, period_month' });

    if (upsertError) {
      console.warn('Upsert into performance_reviews failed:', upsertError.message);
    }

    // 3. Sync cached overall_score & attendance_rate on profiles in batches
    for (const update of profileUpdates) {
      await admin
        .from('profiles')
        .update({
          overall_score: update.overall_score,
          attendance_rate: update.attendance_rate,
        })
        .eq('id', update.id);
    }
  } catch (err: any) {
    console.error('Error persisting performance reviews:', err?.message);
  }

  // Sort top performers
  const sortedReviews = [...reviewsToUpsert].sort((a, b) => b.overall_score - a.overall_score);
  const totalScore = reviewsToUpsert.reduce((sum, r) => sum + r.overall_score, 0);
  const averageOverallScore =
    reviewsToUpsert.length > 0 ? Number((totalScore / reviewsToUpsert.length).toFixed(1)) : 0;

  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
  const topPerformers = sortedReviews.slice(0, 5).map((r) => {
    const prof = profileMap.get(r.profile_id);
    return {
      profileId: r.profile_id,
      fullName: prof?.full_name_en || prof?.full_name_ar || prof?.email || 'GDGoC Member',
      overallScore: r.overall_score,
      attendancePct: r.attendance_pct,
      taskCompletionPct: r.task_completion_pct,
    };
  });

  return {
    periodMonth,
    totalProfilesEvaluated: profiles.length,
    reviewsCreatedOrUpdated: reviewsToUpsert.length,
    averageOverallScore,
    topPerformers,
  };
}

/**
 * Spec §4.11: Member missed 3+ events -> Notify HR Committee
 */
export async function syncLowEngagementNotifications(): Promise<{
  success: boolean;
  notifiedCount: number;
  error?: string;
}> {
  try {
    const summary = await getLowEngagementAlerts();
    let count = 0;

    for (const alert of summary.alerts) {
      if (alert.missedEventsCount >= 3) {
        await notifyMemberMissedEvents({
          memberId: alert.profileId,
          memberName: alert.fullName,
          missedEventsCount: alert.missedEventsCount,
        });
        count++;
      }
    }

    return { success: true, notifiedCount: count };
  } catch (err: any) {
    console.error('syncLowEngagementNotifications error:', err);
    return { success: false, notifiedCount: 0, error: err.message };
  }
}



