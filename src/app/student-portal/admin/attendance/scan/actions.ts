'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { dispatchStudentNotification } from '@/app/student/notifications/actions';

export interface SelectableSession {
  id: string;
  target_type: 'course' | 'workshop';
  parent_id: string;
  parent_title: string;
  session_number: number;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  type: 'online' | 'offline';
  venue?: string | null;
  enrolled_or_registered_count: number;
  checked_in_count: number;
}

export interface AttendanceStudentSummary {
  id: string;
  full_name_en: string;
  full_name_ar: string | null;
  email: string;
  phone: string | null;
  faculty: string | null;
  academic_year: number | null;
  qr_code: string;
  avatar_url: string | null;
  is_enrolled: boolean;
  enrollment_status?: string;
  is_checked_in: boolean;
  check_in_time?: string | null;
  check_in_method?: string | null;
  checked_in_by_name?: string | null;
}

export interface RecentCheckinItem {
  id: string;
  check_in_time: string;
  method: 'qr' | 'manual';
  student: {
    id: string;
    full_name_en: string;
    full_name_ar: string | null;
    email: string;
    qr_code: string;
    avatar_url: string | null;
    faculty: string | null;
  };
  checked_in_by_name: string;
}

/**
 * 1. Fetch all active sessions (courses & workshops) available for taking attendance
 */
export async function getAttendanceScannerData(): Promise<{
  success: boolean;
  officerName: string;
  officerRole: string;
  canScan: boolean;
  sessions: SelectableSession[];
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return {
        success: false,
        officerName: '',
        officerRole: '',
        canScan: false,
        sessions: [],
        error: 'Unauthorized: Authentication required.',
      };
    }

    const profile = context.profile;
    const role = profile.role as string;
    const admin = createAdminClient();

    // Check if user is staff (Leadership, HR, Committee Head/Co-Head, or Assigned Instructor)
    const isLeadership =
      role === 'president' ||
      role === 'co_president' ||
      role === 'branch_head' ||
      role === 'vice_president';

    const { data: dept } = profile.department_id
      ? await admin.from('departments').select('code').eq('id', profile.department_id).single()
      : { data: null };

    const isHr = dept?.code === 'HR' || dept?.code === 'HUMAN_RESOURCES';
    const isHead = role === 'committee_head' || role === 'committee_co_head';

    // If not leadership or HR or Head, check if instructor
    const { count: insCount } = await admin
      .from('course_instructors')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id);

    const { count: wsInsCount } = await admin
      .from('workshop_instructors')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id);

    const isInstructor = (insCount || 0) > 0 || (wsInsCount || 0) > 0;

    if (!isLeadership && !isHr && !isHead && !isInstructor) {
      return {
        success: false,
        officerName: profile.full_name,
        officerRole: role,
        canScan: false,
        sessions: [],
        error: 'Forbidden: Attendance scanning is restricted to Chapter Officers, HR, and Session Instructors.',
      };
    }

    // 1. Query Course Sessions
    const { data: courseSessions } = await admin
      .from('course_sessions')
      .select(`
        id,
        course_id,
        session_number,
        title,
        session_date,
        start_time,
        end_time,
        type,
        venue,
        course:courses!course_sessions_course_id_fkey(
          id,
          title,
          status,
          department_id
        )
      `)
      .order('session_date', { ascending: false });

    // 2. Query Workshop Sessions
    const { data: workshopSessions } = await admin
      .from('workshop_sessions')
      .select(`
        id,
        workshop_id,
        session_number,
        title,
        session_date,
        start_time,
        end_time,
        type,
        venue,
        workshop:workshops!workshop_sessions_workshop_id_fkey(
          id,
          title,
          status,
          department_id
        )
      `)
      .order('session_date', { ascending: false });

    // 3. Query all attendance counts grouped by session
    const { data: courseAtt } = await admin
      .from('student_attendance')
      .select('session_id')
      .not('session_id', 'is', null);

    const { data: wsAtt } = await admin
      .from('student_attendance')
      .select('workshop_session_id')
      .not('workshop_session_id', 'is', null);

    const courseAttMap = new Map<string, number>();
    for (const r of courseAtt || []) {
      if (r.session_id) {
        courseAttMap.set(r.session_id, (courseAttMap.get(r.session_id) || 0) + 1);
      }
    }

    const wsAttMap = new Map<string, number>();
    for (const r of wsAtt || []) {
      if (r.workshop_session_id) {
        wsAttMap.set(r.workshop_session_id, (wsAttMap.get(r.workshop_session_id) || 0) + 1);
      }
    }

    // 4. Query enrollment counts for parent courses
    const { data: enrollments } = await admin
      .from('course_enrollments')
      .select('course_id')
      .eq('status', 'confirmed');

    const courseEnrollMap = new Map<string, number>();
    for (const e of enrollments || []) {
      courseEnrollMap.set(e.course_id, (courseEnrollMap.get(e.course_id) || 0) + 1);
    }

    // 5. Query registrations count for workshops
    const { data: registrations } = await admin
      .from('workshop_registrations')
      .select('workshop_id')
      .eq('status', 'registered');

    const wsRegMap = new Map<string, number>();
    for (const reg of registrations || []) {
      wsRegMap.set(reg.workshop_id, (wsRegMap.get(reg.workshop_id) || 0) + 1);
    }

    const sessionsList: SelectableSession[] = [];

    // Map course sessions
    for (const cs of courseSessions || []) {
      const c = Array.isArray(cs.course) ? cs.course[0] : cs.course;
      if (!c || c.status === 'archived') continue;

      sessionsList.push({
        id: cs.id,
        target_type: 'course',
        parent_id: c.id,
        parent_title: c.title,
        session_number: cs.session_number,
        title: cs.title,
        session_date: cs.session_date,
        start_time: cs.start_time,
        end_time: cs.end_time,
        type: cs.type as 'online' | 'offline',
        venue: cs.venue,
        enrolled_or_registered_count: courseEnrollMap.get(c.id) || 0,
        checked_in_count: courseAttMap.get(cs.id) || 0,
      });
    }

    // Map workshop sessions
    for (const ws of workshopSessions || []) {
      const w = Array.isArray(ws.workshop) ? ws.workshop[0] : ws.workshop;
      if (!w || w.status === 'archived') continue;

      sessionsList.push({
        id: ws.id,
        target_type: 'workshop',
        parent_id: w.id,
        parent_title: w.title,
        session_number: ws.session_number,
        title: ws.title,
        session_date: ws.session_date,
        start_time: ws.start_time,
        end_time: ws.end_time,
        type: ws.type as 'online' | 'offline',
        venue: ws.venue,
        enrolled_or_registered_count: wsRegMap.get(w.id) || 0,
        checked_in_count: wsAttMap.get(ws.id) || 0,
      });
    }

    return {
      success: true,
      officerName: profile.full_name,
      officerRole: role,
      canScan: true,
      sessions: sessionsList,
    };
  } catch (err: any) {
    console.error('getAttendanceScannerData exception:', err);
    return {
      success: false,
      officerName: '',
      officerRole: '',
      canScan: false,
      sessions: [],
      error: err.message || 'Failed to load sessions for attendance.',
    };
  }
}

// Short-term in-memory scan cache to lock out rapid multi-frame race conditions (TTL 5 seconds)
const recentScansCache = new Map<string, { timestamp: number; officerName: string }>();

function cleanOldScans() {
  const now = Date.now();
  for (const [key, val] of recentScansCache.entries()) {
    if (now - val.timestamp > 15000) {
      recentScansCache.delete(key);
    }
  }
}

/**
 * 2. Record student attendance (QR Scan or Walk-in)
 */
export async function recordStudentAttendance(input: {
  targetType: 'course' | 'workshop';
  sessionId: string;
  qrCodeOrQuery: string;
  method?: 'qr' | 'manual';
}): Promise<{
  success: boolean;
  alreadyCheckedIn?: boolean;
  checkInTime?: string;
  checkedInBy?: string;
  student?: AttendanceStudentSummary;
  message?: string;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Authentication required.' };
    }
    const officer = context.profile;
    const admin = createAdminClient();

    const raw = input.qrCodeOrQuery.trim();
    if (!raw) {
      return { success: false, error: 'QR code or student identifier is missing.' };
    }

    // 1. Resolve student profile
    // Student QR code could be from student_profiles (e.g. STU-...), or workshop_registrations (e.g. WS-REG-...), or email/phone
    let studentId: string | null = null;

    // Check student_profiles by qr_code, national_id, email, phone, or id
    const { data: matchedStudents } = await admin
      .from('student_profiles')
      .select(`
        id,
        full_name_en,
        full_name_ar,
        email,
        phone,
        whatsapp_number,
        national_id,
        university,
        faculty,
        department_major,
        academic_year,
        qr_code,
        avatar_url
      `)
      .or(`qr_code.eq."${raw}",email.ilike."${raw}",phone.eq."${raw}",national_id.eq."${raw}",id.eq."${raw}"`)
      .limit(1);

    let student = matchedStudents?.[0];

    // If not found, check if it's a workshop registration QR (WS-REG-...)
    if (!student && raw.startsWith('WS-REG-')) {
      const { data: regMatch } = await admin
        .from('workshop_registrations')
        .select('student_id, student:student_profiles(*)')
        .eq('qr_code', raw)
        .maybeSingle();

      if (regMatch) {
        student = Array.isArray(regMatch.student) ? regMatch.student[0] : regMatch.student;
      }
    }

    if (!student) {
      return {
        success: false,
        error: `No student found with QR code or identifier "${raw}".`,
      };
    }

    studentId = student.id;

    // Fast-path duplicate check using in-memory lock cache
    const scanKey = `${input.sessionId}_${studentId}`;
    const recentScan = recentScansCache.get(scanKey);
    const now = Date.now();

    // 2. Fetch session details & verify enrollment
    let isEnrolled = false;
    let enrollmentStatus = 'not_enrolled';

    if (input.targetType === 'course') {
      const { data: session } = await admin
        .from('course_sessions')
        .select('course_id')
        .eq('id', input.sessionId)
        .single();

      if (!session) {
        return { success: false, error: 'Course session not found.' };
      }

      const { data: enrollment } = await admin
        .from('course_enrollments')
        .select('status')
        .eq('course_id', session.course_id)
        .eq('student_id', studentId)
        .maybeSingle();

      if (enrollment) {
        enrollmentStatus = enrollment.status;
        isEnrolled = enrollment.status === 'confirmed';
      }
    } else {
      const { data: session } = await admin
        .from('workshop_sessions')
        .select('workshop_id')
        .eq('id', input.sessionId)
        .single();

      if (!session) {
        return { success: false, error: 'Workshop session not found.' };
      }

      const { data: registration } = await admin
        .from('workshop_registrations')
        .select('status')
        .eq('workshop_id', session.workshop_id)
        .eq('student_id', studentId)
        .maybeSingle();

      if (registration) {
        enrollmentStatus = registration.status;
        isEnrolled = registration.status === 'registered';
      }
    }

    // Rapid double-scan prevention: if this exact student was processed for this session in the last 4 seconds
    if (recentScan && now - recentScan.timestamp < 4000) {
      return {
        success: false,
        alreadyCheckedIn: true,
        checkInTime: new Date(recentScan.timestamp).toISOString(),
        checkedInBy: recentScan.officerName || officer.full_name,
        student: {
          id: student.id,
          full_name_en: student.full_name_en,
          full_name_ar: student.full_name_ar,
          email: student.email,
          phone: student.phone,
          faculty: student.faculty,
          academic_year: student.academic_year,
          qr_code: student.qr_code,
          avatar_url: student.avatar_url,
          is_enrolled: isEnrolled,
          enrollment_status: enrollmentStatus,
          is_checked_in: true,
          check_in_time: new Date(recentScan.timestamp).toISOString(),
          check_in_method: input.method || 'qr',
          checked_in_by_name: recentScan.officerName || officer.full_name,
        },
        message: `Already checked in just now for this session (${student.full_name_en}).`,
      };
    }

    // 3. Check duplicate check-in in database
    const query = admin.from('student_attendance').select(`
      id,
      check_in_time,
      method,
      checked_in_by,
      officer:profiles!student_attendance_checked_in_by_fkey(full_name)
    `);

    if (input.targetType === 'course') {
      query.eq('session_id', input.sessionId).eq('student_id', studentId);
    } else {
      query.eq('workshop_session_id', input.sessionId).eq('student_id', studentId);
    }

    const { data: existingAttendance } = await query.maybeSingle();

    if (existingAttendance) {
      const off = Array.isArray(existingAttendance.officer)
        ? existingAttendance.officer[0]
        : existingAttendance.officer;

      recentScansCache.set(scanKey, {
        timestamp: Date.now(),
        officerName: off?.full_name || 'Staff Member',
      });

      return {
        success: false,
        alreadyCheckedIn: true,
        checkInTime: existingAttendance.check_in_time,
        checkedInBy: off?.full_name || 'Staff Member',
        student: {
          id: student.id,
          full_name_en: student.full_name_en,
          full_name_ar: student.full_name_ar,
          email: student.email,
          phone: student.phone,
          faculty: student.faculty,
          academic_year: student.academic_year,
          qr_code: student.qr_code,
          avatar_url: student.avatar_url,
          is_enrolled: isEnrolled,
          enrollment_status: enrollmentStatus,
          is_checked_in: true,
          check_in_time: existingAttendance.check_in_time,
          check_in_method: existingAttendance.method,
          checked_in_by_name: off?.full_name,
        },
        message: `Already checked in at ${new Date(existingAttendance.check_in_time).toLocaleTimeString()}`,
      };
    }

    // 4. Create student_attendance record
    const newRecord: any = {
      student_id: studentId,
      checked_in_by: officer.id,
      method: input.method || 'qr',
      check_in_time: new Date().toISOString(),
    };

    if (input.targetType === 'course') {
      newRecord.session_id = input.sessionId;
    } else {
      newRecord.workshop_session_id = input.sessionId;
    }

    const { data: inserted, error: insErr } = await admin
      .from('student_attendance')
      .insert(newRecord)
      .select()
      .single();

    if (insErr) {
      // Handle unique constraint violation gracefully if another scan request won the race condition
      const isUniqueViolation =
        insErr.code === '23505' ||
        insErr.message?.toLowerCase().includes('unique') ||
        insErr.message?.toLowerCase().includes('duplicate');

      if (isUniqueViolation) {
        const { data: duplicateAtt } = await admin
          .from('student_attendance')
          .select(`
            id,
            check_in_time,
            method,
            checked_in_by,
            officer:profiles!student_attendance_checked_in_by_fkey(full_name)
          `)
          .eq(input.targetType === 'course' ? 'session_id' : 'workshop_session_id', input.sessionId)
          .eq('student_id', studentId)
          .maybeSingle();

        if (duplicateAtt) {
          const off = Array.isArray(duplicateAtt.officer)
            ? duplicateAtt.officer[0]
            : duplicateAtt.officer;

          recentScansCache.set(scanKey, {
            timestamp: Date.now(),
            officerName: off?.full_name || officer.full_name,
          });

          return {
            success: false,
            alreadyCheckedIn: true,
            checkInTime: duplicateAtt.check_in_time,
            checkedInBy: off?.full_name || officer.full_name,
            student: {
              id: student.id,
              full_name_en: student.full_name_en,
              full_name_ar: student.full_name_ar,
              email: student.email,
              phone: student.phone,
              faculty: student.faculty,
              academic_year: student.academic_year,
              qr_code: student.qr_code,
              avatar_url: student.avatar_url,
              is_enrolled: isEnrolled,
              enrollment_status: enrollmentStatus,
              is_checked_in: true,
              check_in_time: duplicateAtt.check_in_time,
              check_in_method: duplicateAtt.method,
              checked_in_by_name: off?.full_name || officer.full_name,
            },
            message: `Already checked in at ${new Date(duplicateAtt.check_in_time).toLocaleTimeString()}`,
          };
        }
      }

      console.error('recordStudentAttendance insert error:', insErr);
      return { success: false, error: insErr.message || 'Failed to record attendance.' };
    }

    // Register in recent scans cache
    recentScansCache.set(scanKey, {
      timestamp: Date.now(),
      officerName: officer.full_name,
    });
    cleanOldScans();

    // Notify student in English
    dispatchStudentNotification({
      studentId: student.id,
      type: 'session',
      title: 'Attendance Confirmed',
      message: `Your attendance has been recorded for today's session via ${input.method === 'manual' ? 'manual check-in' : 'QR pass scan'}. Keep up the great attendance rate!`,
      linkUrl: '/student/dashboard?tab=attendance',
      relatedEntityType: input.targetType === 'course' ? 'course_session' : 'workshop_session',
      relatedEntityId: input.sessionId,
    }).catch((notifErr) => console.warn('dispatchStudentNotification attendance warning:', notifErr));

    revalidatePath(`/student-portal/admin/attendance/scan`);
    revalidatePath(`/student-portal/admin/attendance/sessions/${input.sessionId}`);
    revalidatePath(`/student/dashboard`);

    return {
      success: true,
      checkInTime: inserted.check_in_time,
      student: {
        id: student.id,
        full_name_en: student.full_name_en,
        full_name_ar: student.full_name_ar,
        email: student.email,
        phone: student.phone,
        faculty: student.faculty,
        academic_year: student.academic_year,
        qr_code: student.qr_code,
        avatar_url: student.avatar_url,
        is_enrolled: isEnrolled,
        enrollment_status: enrollmentStatus,
        is_checked_in: true,
        check_in_time: inserted.check_in_time,
        check_in_method: inserted.method,
        checked_in_by_name: officer.full_name,
      },
      message: `Successfully checked in ${student.full_name_en}!`,
    };
  } catch (err: any) {
    console.error('recordStudentAttendance exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * 3. Search students by query with check-in status for the selected session
 */
export async function searchSessionAttendees(
  targetType: 'course' | 'workshop',
  sessionId: string,
  query: string
): Promise<{
  success: boolean;
  students: AttendanceStudentSummary[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const q = query.trim();
    if (!q) {
      return { success: true, students: [] };
    }

    // 1. Find matching students
    const { data: matched, error: matchErr } = await admin
      .from('student_profiles')
      .select(`
        id,
        full_name_en,
        full_name_ar,
        email,
        phone,
        whatsapp_number,
        national_id,
        university,
        faculty,
        department_major,
        academic_year,
        qr_code,
        avatar_url
      `)
      .or(`full_name_en.ilike.%${q}%,full_name_ar.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,qr_code.ilike.%${q}%`)
      .limit(20);

    if (matchErr || !matched) {
      return { success: false, students: [], error: matchErr?.message };
    }

    const studentIds = matched.map((s) => s.id);

    // 2. Fetch existing attendance for this session
    const attQuery = admin.from('student_attendance').select(`
      student_id,
      check_in_time,
      method,
      officer:profiles!student_attendance_checked_in_by_fkey(full_name)
    `);

    if (targetType === 'course') {
      attQuery.eq('session_id', sessionId).in('student_id', studentIds);
    } else {
      attQuery.eq('workshop_session_id', sessionId).in('student_id', studentIds);
    }

    const { data: attList } = await attQuery;
    const attMap = new Map<string, any>();
    for (const a of attList || []) {
      attMap.set(a.student_id, a);
    }

    // 3. Fetch enrollment / registration status
    const enrollmentMap = new Map<string, string>();
    if (targetType === 'course') {
      const { data: session } = await admin
        .from('course_sessions')
        .select('course_id')
        .eq('id', sessionId)
        .single();

      if (session) {
        const { data: enr } = await admin
          .from('course_enrollments')
          .select('student_id, status')
          .eq('course_id', session.course_id)
          .in('student_id', studentIds);

        for (const e of enr || []) {
          enrollmentMap.set(e.student_id, e.status);
        }
      }
    } else {
      const { data: session } = await admin
        .from('workshop_sessions')
        .select('workshop_id')
        .eq('id', sessionId)
        .single();

      if (session) {
        const { data: reg } = await admin
          .from('workshop_registrations')
          .select('student_id, status')
          .eq('workshop_id', session.workshop_id)
          .in('student_id', studentIds);

        for (const r of reg || []) {
          enrollmentMap.set(r.student_id, r.status);
        }
      }
    }

    const results: AttendanceStudentSummary[] = matched.map((s) => {
      const att = attMap.get(s.id);
      const enrStatus = enrollmentMap.get(s.id) || 'not_enrolled';
      const isEnrolled = targetType === 'course' ? enrStatus === 'confirmed' : enrStatus === 'registered';
      const off = att ? (Array.isArray(att.officer) ? att.officer[0] : att.officer) : null;

      return {
        id: s.id,
        full_name_en: s.full_name_en,
        full_name_ar: s.full_name_ar,
        email: s.email,
        phone: s.phone,
        faculty: s.faculty,
        academic_year: s.academic_year,
        qr_code: s.qr_code,
        avatar_url: s.avatar_url,
        is_enrolled: isEnrolled,
        enrollment_status: enrStatus,
        is_checked_in: Boolean(att),
        check_in_time: att?.check_in_time || null,
        check_in_method: att?.method || null,
        checked_in_by_name: off?.full_name || null,
      };
    });

    return { success: true, students: results };
  } catch (err: any) {
    console.error('searchSessionAttendees exception:', err);
    return { success: false, students: [], error: err.message };
  }
}

/**
 * 4. Fetch recent check-ins for the selected session
 */
export async function getRecentSessionCheckins(
  targetType: 'course' | 'workshop',
  sessionId: string
): Promise<{
  success: boolean;
  checkins: RecentCheckinItem[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    const query = admin
      .from('student_attendance')
      .select(`
        id,
        check_in_time,
        method,
        student:student_profiles!student_attendance_student_id_fkey(
          id,
          full_name_en,
          full_name_ar,
          email,
          qr_code,
          avatar_url,
          faculty
        ),
        officer:profiles!student_attendance_checked_in_by_fkey(
          full_name
        )
      `)
      .order('check_in_time', { ascending: false })
      .limit(10);

    if (targetType === 'course') {
      query.eq('session_id', sessionId);
    } else {
      query.eq('workshop_session_id', sessionId);
    }

    const { data: rows, error: err } = await query;

    if (err) {
      console.error('getRecentSessionCheckins error:', err);
      return { success: false, checkins: [], error: err.message };
    }

    const list: RecentCheckinItem[] = (rows || []).map((r: any) => {
      const s = Array.isArray(r.student) ? r.student[0] : r.student;
      const off = Array.isArray(r.officer) ? r.officer[0] : r.officer;

      return {
        id: r.id,
        check_in_time: r.check_in_time,
        method: r.method,
        student: {
          id: s?.id || '',
          full_name_en: s?.full_name_en || 'Student',
          full_name_ar: s?.full_name_ar || null,
          email: s?.email || '',
          qr_code: s?.qr_code || '',
          avatar_url: s?.avatar_url || null,
          faculty: s?.faculty || null,
        },
        checked_in_by_name: off?.full_name || 'Staff Member',
      };
    });

    return { success: true, checkins: list };
  } catch (err: any) {
    console.error('getRecentSessionCheckins exception:', err);
    return { success: false, checkins: [], error: err.message };
  }
}
