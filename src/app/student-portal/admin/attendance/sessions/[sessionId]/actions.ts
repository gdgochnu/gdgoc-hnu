'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { dispatchStudentNotification } from '@/app/student/notifications/actions';

export interface SiblingSessionOption {
  id: string;
  session_number: number;
  title: string;
  session_date: string;
}

export interface SessionStudentAttendanceItem {
  student_id: string;
  full_name_en: string;
  full_name_ar: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  faculty: string | null;
  academic_year: number | null;
  qr_code: string;
  enrollment_status: 'confirmed' | 'pending' | 'waitlisted' | 'registered' | 'walk_in';
  is_present: boolean;
  attendance_id: string | null;
  check_in_time: string | null;
  check_in_method: 'qr' | 'manual' | null;
  checked_in_by_name: string | null;
  notes: string | null;
}

export interface SessionAttendanceSheetData {
  success: boolean;
  error?: string;
  session: {
    id: string;
    session_number: number;
    title: string;
    description?: string | null;
    session_date: string;
    start_time: string;
    end_time: string;
    type: 'online' | 'offline';
    venue?: string | null;
    status: string;
  };
  parent: {
    id: string;
    title: string;
    target_type: 'course' | 'workshop';
    department_name?: string | null;
    status: string;
  };
  siblingSessions: SiblingSessionOption[];
  students: SessionStudentAttendanceItem[];
  stats: {
    total_enrolled: number;
    total_present: number;
    total_absent: number;
    attendance_rate: number;
  };
  userCanManage: boolean;
  currentOfficerName: string;
}

/**
 * Get comprehensive attendance sheet for a session (course or workshop)
 */
export async function getSessionAttendanceSheet(sessionId: string): Promise<SessionAttendanceSheetData> {
  const admin = createAdminClient();

  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return {
        success: false,
        error: 'Authentication required to access attendance sheet.',
        session: {} as any,
        parent: {} as any,
        siblingSessions: [],
        students: [],
        stats: { total_enrolled: 0, total_present: 0, total_absent: 0, attendance_rate: 0 },
        userCanManage: false,
        currentOfficerName: '',
      };
    }

    const profile = context.profile;
    const role = profile.role as string;

    // Check staff permissions
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

    // 1. Try finding as course_session
    const { data: courseSession } = await admin
      .from('course_sessions')
      .select(`
        id,
        course_id,
        session_number,
        title,
        description,
        session_date,
        start_time,
        end_time,
        type,
        venue,
        status,
        course:courses!course_sessions_course_id_fkey(
          id,
          title,
          status,
          department_id,
          department:departments!courses_department_id_fkey(name)
        )
      `)
      .eq('id', sessionId)
      .maybeSingle();

    let targetType: 'course' | 'workshop' = 'course';
    let rawSession: any = null;
    let rawParent: any = null;

    if (courseSession) {
      targetType = 'course';
      rawSession = courseSession;
      rawParent = Array.isArray(courseSession.course) ? courseSession.course[0] : courseSession.course;
    } else {
      // 2. Try finding as workshop_session
      const { data: workshopSession } = await admin
        .from('workshop_sessions')
        .select(`
          id,
          workshop_id,
          session_number,
          title,
          description,
          session_date,
          start_time,
          end_time,
          type,
          venue,
          status,
          workshop:workshops!workshop_sessions_workshop_id_fkey(
            id,
            title,
            status,
            department_id,
            department:departments!workshops_department_id_fkey(name)
          )
        `)
        .eq('id', sessionId)
        .maybeSingle();

      if (!workshopSession) {
        return {
          success: false,
          error: 'Session not found in courses or workshops.',
          session: {} as any,
          parent: {} as any,
          siblingSessions: [],
          students: [],
          stats: { total_enrolled: 0, total_present: 0, total_absent: 0, attendance_rate: 0 },
          userCanManage: false,
          currentOfficerName: profile.full_name,
        };
      }

      targetType = 'workshop';
      rawSession = workshopSession;
      rawParent = Array.isArray(workshopSession.workshop) ? workshopSession.workshop[0] : workshopSession.workshop;
    }

    // Check if user is instructor for this course/workshop
    let isInstructor = false;
    if (targetType === 'course') {
      const { count } = await admin
        .from('course_instructors')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', rawParent.id)
        .eq('profile_id', profile.id);
      isInstructor = (count || 0) > 0;
    } else {
      const { count } = await admin
        .from('workshop_instructors')
        .select('id', { count: 'exact', head: true })
        .eq('workshop_id', rawParent.id)
        .eq('profile_id', profile.id);
      isInstructor = (count || 0) > 0;
    }

    const userCanManage = isLeadership || isHr || isHead || isInstructor;

    if (!userCanManage) {
      return {
        success: false,
        error: 'Forbidden: You do not have permission to view this attendance sheet.',
        session: {} as any,
        parent: {} as any,
        siblingSessions: [],
        students: [],
        stats: { total_enrolled: 0, total_present: 0, total_absent: 0, attendance_rate: 0 },
        userCanManage: false,
        currentOfficerName: profile.full_name,
      };
    }

    // 3. Fetch sibling sessions for quick dropdown switcher
    let siblingSessions: SiblingSessionOption[] = [];
    if (targetType === 'course') {
      const { data: siblings } = await admin
        .from('course_sessions')
        .select('id, session_number, title, session_date')
        .eq('course_id', rawParent.id)
        .order('session_number', { ascending: true });
      siblingSessions = siblings || [];
    } else {
      const { data: siblings } = await admin
        .from('workshop_sessions')
        .select('id, session_number, title, session_date')
        .eq('workshop_id', rawParent.id)
        .order('session_number', { ascending: true });
      siblingSessions = siblings || [];
    }

    // 4. Fetch existing attendance records for this session
    const attQuery = admin.from('student_attendance').select(`
      id,
      student_id,
      check_in_time,
      method,
      notes,
      checked_in_by,
      officer:profiles!student_attendance_checked_in_by_fkey(full_name)
    `);

    if (targetType === 'course') {
      attQuery.eq('session_id', sessionId);
    } else {
      attQuery.eq('workshop_session_id', sessionId);
    }

    const { data: attendanceRows } = await attQuery;
    const attendanceMap = new Map<string, any>();
    for (const att of attendanceRows || []) {
      attendanceMap.set(att.student_id, att);
    }

    // 5. Fetch enrolled / registered students
    const studentList: SessionStudentAttendanceItem[] = [];
    const processedStudentIds = new Set<string>();

    if (targetType === 'course') {
      const { data: enrollments } = await admin
        .from('course_enrollments')
        .select(`
          status,
          student:student_profiles(
            id,
            full_name_en,
            full_name_ar,
            email,
            phone,
            avatar_url,
            faculty,
            academic_year,
            qr_code
          )
        `)
        .eq('course_id', rawParent.id)
        .order('created_at', { ascending: true });

      for (const e of enrollments || []) {
        const s = Array.isArray(e.student) ? e.student[0] : e.student;
        if (!s) continue;

        processedStudentIds.add(s.id);
        const att = attendanceMap.get(s.id);
        const officer = att?.officer ? (Array.isArray(att.officer) ? att.officer[0] : att.officer) : null;

        studentList.push({
          student_id: s.id,
          full_name_en: s.full_name_en,
          full_name_ar: s.full_name_ar,
          email: s.email,
          phone: s.phone,
          avatar_url: s.avatar_url,
          faculty: s.faculty,
          academic_year: s.academic_year,
          qr_code: s.qr_code,
          enrollment_status: e.status as any,
          is_present: !!att,
          attendance_id: att?.id || null,
          check_in_time: att?.check_in_time || null,
          check_in_method: att?.method || null,
          checked_in_by_name: officer?.full_name || null,
          notes: att?.notes || null,
        });
      }
    } else {
      const { data: registrations } = await admin
        .from('workshop_registrations')
        .select(`
          status,
          student:student_profiles(
            id,
            full_name_en,
            full_name_ar,
            email,
            phone,
            avatar_url,
            faculty,
            academic_year,
            qr_code
          )
        `)
        .eq('workshop_id', rawParent.id)
        .order('created_at', { ascending: true });

      for (const r of registrations || []) {
        const s = Array.isArray(r.student) ? r.student[0] : r.student;
        if (!s) continue;

        processedStudentIds.add(s.id);
        const att = attendanceMap.get(s.id);
        const officer = att?.officer ? (Array.isArray(att.officer) ? att.officer[0] : att.officer) : null;

        studentList.push({
          student_id: s.id,
          full_name_en: s.full_name_en,
          full_name_ar: s.full_name_ar,
          email: s.email,
          phone: s.phone,
          avatar_url: s.avatar_url,
          faculty: s.faculty,
          academic_year: s.academic_year,
          qr_code: s.qr_code,
          enrollment_status: r.status as any,
          is_present: !!att,
          attendance_id: att?.id || null,
          check_in_time: att?.check_in_time || null,
          check_in_method: att?.method || null,
          checked_in_by_name: officer?.full_name || null,
          notes: att?.notes || null,
        });
      }
    }

    // 6. Include walk-ins (students with attendance record but not officially enrolled/registered)
    for (const [attStudentId, att] of attendanceMap.entries()) {
      if (!processedStudentIds.has(attStudentId)) {
        const { data: walkInProfile } = await admin
          .from('student_profiles')
          .select(`
            id,
            full_name_en,
            full_name_ar,
            email,
            phone,
            avatar_url,
            faculty,
            academic_year,
            qr_code
          `)
          .eq('id', attStudentId)
          .single();

        if (walkInProfile) {
          const officer = att?.officer ? (Array.isArray(att.officer) ? att.officer[0] : att.officer) : null;
          studentList.push({
            student_id: walkInProfile.id,
            full_name_en: walkInProfile.full_name_en,
            full_name_ar: walkInProfile.full_name_ar,
            email: walkInProfile.email,
            phone: walkInProfile.phone,
            avatar_url: walkInProfile.avatar_url,
            faculty: walkInProfile.faculty,
            academic_year: walkInProfile.academic_year,
            qr_code: walkInProfile.qr_code,
            enrollment_status: 'walk_in',
            is_present: true,
            attendance_id: att.id,
            check_in_time: att.check_in_time,
            check_in_method: att.method,
            checked_in_by_name: officer?.full_name || null,
            notes: att.notes,
          });
        }
      }
    }

    // Sort: present first, then alphabetical by full_name_en
    studentList.sort((a, b) => {
      if (a.is_present !== b.is_present) {
        return a.is_present ? -1 : 1;
      }
      return a.full_name_en.localeCompare(b.full_name_en);
    });

    const totalEnrolled = studentList.length;
    const totalPresent = studentList.filter((s) => s.is_present).length;
    const totalAbsent = totalEnrolled - totalPresent;
    const attendanceRate = totalEnrolled > 0 ? Math.round((totalPresent / totalEnrolled) * 100) : 0;

    const deptName = rawParent.department
      ? (Array.isArray(rawParent.department) ? rawParent.department[0]?.name : rawParent.department.name)
      : null;

    return {
      success: true,
      session: {
        id: rawSession.id,
        session_number: rawSession.session_number,
        title: rawSession.title,
        description: rawSession.description,
        session_date: rawSession.session_date,
        start_time: rawSession.start_time,
        end_time: rawSession.end_time,
        type: rawSession.type,
        venue: rawSession.venue,
        status: rawSession.status,
      },
      parent: {
        id: rawParent.id,
        title: rawParent.title,
        target_type: targetType,
        department_name: deptName,
        status: rawParent.status,
      },
      siblingSessions,
      students: studentList,
      stats: {
        total_enrolled: totalEnrolled,
        total_present: totalPresent,
        total_absent: totalAbsent,
        attendance_rate: attendanceRate,
      },
      userCanManage,
      currentOfficerName: profile.full_name,
    };
  } catch (err: any) {
    console.error('getSessionAttendanceSheet error:', err);
    return {
      success: false,
      error: err.message || 'Failed to load session attendance sheet.',
      session: {} as any,
      parent: {} as any,
      siblingSessions: [],
      students: [],
      stats: { total_enrolled: 0, total_present: 0, total_absent: 0, attendance_rate: 0 },
      userCanManage: false,
      currentOfficerName: '',
    };
  }
}

/**
 * Toggle attendance for a single student (Mark Present or Revoke/Mark Absent)
 */
export async function toggleStudentAttendance(input: {
  sessionId: string;
  studentId: string;
  targetType: 'course' | 'workshop';
  isPresent: boolean;
  notes?: string;
}): Promise<{
  success: boolean;
  error?: string;
  attendanceId?: string;
  checkInTime?: string;
  checkedInByName?: string;
}> {
  const admin = createAdminClient();

  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    const profile = context.profile;
    const now = new Date().toISOString();

    if (input.isPresent) {
      // Mark present (insert record)
      const payload: any = {
        student_id: input.studentId,
        checked_in_by: profile.id,
        method: 'manual',
        notes: input.notes || 'Manually marked present in attendance sheet',
        check_in_time: now,
      };

      if (input.targetType === 'course') {
        payload.session_id = input.sessionId;
        payload.workshop_session_id = null;
      } else {
        payload.session_id = null;
        payload.workshop_session_id = input.sessionId;
      }

      const { data, error } = await admin
        .from('student_attendance')
        .insert(payload)
        .select('id, check_in_time')
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Student is already marked present.' };
        }
        throw error;
      }

      revalidatePath(`/student-portal/admin/attendance/sessions/${input.sessionId}`);

      // Notify student in English
      dispatchStudentNotification({
        studentId: input.studentId,
        type: 'session',
        title: 'Attendance Confirmed',
        message: `Your attendance has been confirmed for the session by ${profile.full_name}. Keep up the great participation!`,
        linkUrl: '/student/dashboard?tab=attendance',
        relatedEntityType: input.targetType === 'course' ? 'course_session' : 'workshop_session',
        relatedEntityId: input.sessionId,
      }).catch((notifErr) => console.warn('dispatchStudentNotification manual attendance warning:', notifErr));

      return {
        success: true,
        attendanceId: data.id,
        checkInTime: data.check_in_time,
        checkedInByName: profile.full_name,
      };
    } else {
      // Mark absent (delete attendance record)
      const delQuery = admin.from('student_attendance').delete().eq('student_id', input.studentId);

      if (input.targetType === 'course') {
        delQuery.eq('session_id', input.sessionId);
      } else {
        delQuery.eq('workshop_session_id', input.sessionId);
      }

      const { error } = await delQuery;
      if (error) throw error;

      revalidatePath(`/student-portal/admin/attendance/sessions/${input.sessionId}`);

      return { success: true };
    }
  } catch (err: any) {
    console.error('toggleStudentAttendance error:', err);
    return { success: false, error: err.message || 'Failed to update attendance status.' };
  }
}

/**
 * Bulk mark multiple students present or absent
 */
export async function bulkMarkSessionAttendance(input: {
  sessionId: string;
  studentIds: string[];
  targetType: 'course' | 'workshop';
  action: 'mark_present' | 'mark_absent';
}): Promise<{ success: boolean; count?: number; error?: string }> {
  const admin = createAdminClient();

  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    const profile = context.profile;
    const now = new Date().toISOString();

    if (input.studentIds.length === 0) {
      return { success: true, count: 0 };
    }

    if (input.action === 'mark_present') {
      const rows = input.studentIds.map((sid) => ({
        student_id: sid,
        session_id: input.targetType === 'course' ? input.sessionId : null,
        workshop_session_id: input.targetType === 'workshop' ? input.sessionId : null,
        checked_in_by: profile.id,
        method: 'manual',
        notes: 'Bulk manual check-in from attendance sheet',
        check_in_time: now,
      }));

      const { error } = await admin
        .from('student_attendance')
        .upsert(rows, {
          onConflict: input.targetType === 'course' ? 'session_id,student_id' : 'workshop_session_id,student_id',
          ignoreDuplicates: true,
        });

      if (error) throw error;
    } else {
      const delQuery = admin
        .from('student_attendance')
        .delete()
        .in('student_id', input.studentIds);

      if (input.targetType === 'course') {
        delQuery.eq('session_id', input.sessionId);
      } else {
        delQuery.eq('workshop_session_id', input.sessionId);
      }

      const { error } = await delQuery;
      if (error) throw error;
    }

    revalidatePath(`/student-portal/admin/attendance/sessions/${input.sessionId}`);

    return { success: true, count: input.studentIds.length };
  } catch (err: any) {
    console.error('bulkMarkSessionAttendance error:', err);
    return { success: false, error: err.message || 'Failed to perform bulk attendance update.' };
  }
}
