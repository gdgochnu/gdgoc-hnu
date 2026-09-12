import { createAdminClient } from '@/lib/supabase/admin';

export interface AttendanceRateRefreshResult {
  success: boolean;
  totalProfilesProcessed: number;
  updatedProfilesCount: number;
  totalCompletedEvents: number;
  averageAttendanceRate: number;
  error?: string;
}

/**
 * Daily Attendance Rate Cache Refresh Job
 * Spec §3.2, §4.4, §10, Checklist 22.5
 *
 * Recomputes profiles.attendance_rate for all active members based on
 * total completed events vs. attended events.
 */
export async function refreshProfilesAttendanceRateCache(): Promise<AttendanceRateRefreshResult> {
  const admin = createAdminClient();

  try {
    // 1. Fetch completed/closed events
    const { data: eventsData, error: eventsErr } = await admin
      .from('events')
      .select('id, event_date, status')
      .in('status', ['completed', 'closed']);

    if (eventsErr) throw eventsErr;

    const completedEvents = eventsData || [];
    const completedEventIds = new Set(completedEvents.map((e) => e.id));
    const totalCompletedEvents = completedEvents.length;

    // 2. Fetch active profiles
    const { data: profilesData, error: profilesErr } = await admin
      .from('profiles')
      .select('id, email, attendance_rate, status')
      .eq('status', 'active');

    if (profilesErr) throw profilesErr;

    const profiles = profilesData || [];
    if (profiles.length === 0) {
      return {
        success: true,
        totalProfilesProcessed: 0,
        updatedProfilesCount: 0,
        totalCompletedEvents,
        averageAttendanceRate: 100,
      };
    }

    // 3. Fetch attendance and event registrations
    const [{ data: attendanceData }, { data: registrationsData }] = await Promise.all([
      admin.from('attendance').select('id, event_id, profile_id, registration_id'),
      admin.from('event_registrations').select('id, event_id, profile_id, email'),
    ]);

    const regMap = new Map<string, { event_id: string; profile_id?: string; email?: string }>();
    (registrationsData || []).forEach((reg: any) => {
      regMap.set(reg.id, {
        event_id: reg.event_id,
        profile_id: reg.profile_id,
        email: reg.email ? reg.email.toLowerCase() : undefined,
      });
    });

    // Map attended events per profileId and per email
    const profileAttendedMap = new Map<string, Set<string>>();
    const emailAttendedMap = new Map<string, Set<string>>();

    (attendanceData || []).forEach((att: any) => {
      if (!completedEventIds.has(att.event_id)) return;

      if (att.profile_id) {
        if (!profileAttendedMap.has(att.profile_id)) {
          profileAttendedMap.set(att.profile_id, new Set());
        }
        profileAttendedMap.get(att.profile_id)!.add(att.event_id);
      }

      if (att.registration_id && regMap.has(att.registration_id)) {
        const reg = regMap.get(att.registration_id)!;
        if (reg.profile_id) {
          if (!profileAttendedMap.has(reg.profile_id)) {
            profileAttendedMap.set(reg.profile_id, new Set());
          }
          profileAttendedMap.get(reg.profile_id)!.add(att.event_id);
        }
        if (reg.email) {
          if (!emailAttendedMap.has(reg.email)) {
            emailAttendedMap.set(reg.email, new Set());
          }
          emailAttendedMap.get(reg.email)!.add(att.event_id);
        }
      }
    });

    // 4. Calculate attendance rate for each profile and update if changed
    let updatedCount = 0;
    let totalRateSum = 0;
    const updates: Array<{ id: string; attendance_rate: number }> = [];

    for (const p of profiles) {
      const emailLower = (p.email || '').toLowerCase();
      const attendedSet = new Set<string>();

      if (profileAttendedMap.has(p.id)) {
        profileAttendedMap.get(p.id)!.forEach((eId) => attendedSet.add(eId));
      }
      if (emailLower && emailAttendedMap.has(emailLower)) {
        emailAttendedMap.get(emailLower)!.forEach((eId) => attendedSet.add(eId));
      }

      const eventsAttended = attendedSet.size;
      const calculatedRate =
        totalCompletedEvents > 0
          ? Math.min(100, Math.max(0, Math.round((eventsAttended / totalCompletedEvents) * 100)))
          : Number(p.attendance_rate ?? 100);

      totalRateSum += calculatedRate;

      if (p.attendance_rate !== calculatedRate) {
        updates.push({ id: p.id, attendance_rate: calculatedRate });
      }
    }

    // 5. Batch update profiles in parallel batches
    if (updates.length > 0) {
      const batchSize = 15;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        await Promise.all(
          batch.map((u) =>
            admin
              .from('profiles')
              .update({
                attendance_rate: u.attendance_rate,
                updated_at: new Date().toISOString(),
              })
              .eq('id', u.id)
          )
        );
      }
      updatedCount = updates.length;
    }

    const averageAttendanceRate =
      profiles.length > 0 ? Math.round(totalRateSum / profiles.length) : 100;

    return {
      success: true,
      totalProfilesProcessed: profiles.length,
      updatedProfilesCount: updatedCount,
      totalCompletedEvents,
      averageAttendanceRate,
    };
  } catch (err: any) {
    console.error('[refreshProfilesAttendanceRateCache] error:', err);
    return {
      success: false,
      totalProfilesProcessed: 0,
      updatedProfilesCount: 0,
      totalCompletedEvents: 0,
      averageAttendanceRate: 0,
      error: err.message,
    };
  }
}
