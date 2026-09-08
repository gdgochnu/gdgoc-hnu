'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import {
  HrDashboardKpis,
  EventAttendanceSummary,
  EventAttendanceRecord,
  AttendanceLeaderboardEntry,
  AttendanceLeaderboardSummary,
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

