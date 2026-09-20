'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { StudentProfile, StudentOnboardingInput, StudentDashboardData } from '@/types/student';
import { revalidatePath } from 'next/cache';

/**
 * 1. Get student profile for currently logged in user (or by studentId for authorized staff)
 */
export async function getCurrentStudentProfile(): Promise<{
  success: boolean;
  student: StudentProfile | null;
  isTeamMember: boolean;
  teamProfileId: string | null;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { success: false, student: null, isTeamMember: false, teamProfileId: null, error: 'Unauthorized' };
    }

    const admin = createAdminClient();

    // Query student profile
    const { data: student, error } = await admin
      .from('student_profiles')
      .select('*')
      .eq('id', context.user.id)
      .maybeSingle();

    if (error) {
      console.error('getCurrentStudentProfile error:', error);
      return { success: false, student: null, isTeamMember: false, teamProfileId: null, error: error.message };
    }

    // Check if user is also a team member
    const teamProfileId = context.profile?.id || student?.team_profile_id || null;

    // Auto-link team_profile_id if not linked yet
    if (student && !student.team_profile_id && context.profile?.id) {
      await admin
        .from('student_profiles')
        .update({ team_profile_id: context.profile.id, updated_at: new Date().toISOString() })
        .eq('id', student.id);
      student.team_profile_id = context.profile.id;
    }

    return {
      success: true,
      student: student as StudentProfile | null,
      isTeamMember: Boolean(context.profile),
      teamProfileId,
    };
  } catch (err: any) {
    console.error('getCurrentStudentProfile exception:', err);
    return { success: false, student: null, isTeamMember: false, teamProfileId: null, error: err.message };
  }
}

/**
 * 2. Check and auto-link student profile to existing team member profile by email
 */
export async function linkStudentToTeamMember(studentId: string, email: string): Promise<{
  linked: boolean;
  teamProfileId?: string;
}> {
  try {
    if (!email || !studentId) return { linked: false };
    const admin = createAdminClient();

    const { data: teamProf } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (teamProf?.id) {
      await admin
        .from('student_profiles')
        .update({ team_profile_id: teamProf.id, updated_at: new Date().toISOString() })
        .eq('id', studentId);
      return { linked: true, teamProfileId: teamProf.id };
    }

    return { linked: false };
  } catch (err) {
    console.warn('linkStudentToTeamMember warning:', err);
    return { linked: false };
  }
}

/**
 * 3. Complete student onboarding form to activate account
 */
export async function completeStudentProfile(input: StudentOnboardingInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const admin = createAdminClient();

    // Check if student profile exists, if not initialize it
    const { data: existing } = await admin
      .from('student_profiles')
      .select('id, team_profile_id')
      .eq('id', context.user.id)
      .maybeSingle();

    const teamProfileId = existing?.team_profile_id || context.profile?.id || null;

    const profileData = {
      id: context.user.id,
      email: context.user.email?.toLowerCase().trim() || '',
      team_profile_id: teamProfileId,
      full_name_ar: input.full_name_ar.trim(),
      full_name_en: input.full_name_en.trim(),
      national_id: input.national_id.trim(),
      university: input.university?.trim() || 'Helwan National University',
      faculty: input.faculty.trim(),
      department_major: input.department_major?.trim() || null,
      academic_year: input.academic_year,
      phone: input.phone.trim(),
      whatsapp_number: input.whatsapp_number.trim(),
      facebook_url: input.facebook_url?.trim() || null,
      instagram_url: input.instagram_url?.trim() || null,
      linkedin_url: input.linkedin_url?.trim() || null,
      avatar_url: context.profile?.avatar_url || null,
      status: 'active', // Immediately active per spec §4.S.2
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await admin
      .from('student_profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (upsertErr) {
      console.error('completeStudentProfile upsert error:', upsertErr);
      return { success: false, error: upsertErr.message };
    }

    revalidatePath('/student');
    revalidatePath('/student/dashboard');
    revalidatePath('/student/onboarding');

    return { success: true };
  } catch (err: any) {
    console.error('completeStudentProfile exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * 4. Get student onboarding data, checking auto-link bridge with profiles
 */
export async function getStudentOnboardingData(): Promise<{
  authenticated: boolean;
  isAlreadyActive: boolean;
  isTeamMember: boolean;
  student: StudentProfile | null;
  faculties: Array<{ id: string; name_ar: string; name_en: string; sort_order: number }>;
  prefilled: {
    fullNameAr: string;
    fullNameEn: string;
    email: string;
    nationalId: string;
    university: string;
    faculty: string;
    departmentMajor: string;
    academicYear: number;
    phone: string;
    whatsappNumber: string;
    facebookUrl: string;
    instagramUrl: string;
    linkedinUrl: string;
    avatarUrl: string | null;
  };
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return {
        authenticated: false,
        isAlreadyActive: false,
        isTeamMember: false,
        student: null,
        faculties: [],
        prefilled: {
          fullNameAr: '',
          fullNameEn: '',
          email: '',
          nationalId: '',
          university: 'Helwan National University',
          faculty: '',
          departmentMajor: '',
          academicYear: 1,
          phone: '',
          whatsappNumber: '',
          facebookUrl: '',
          instagramUrl: '',
          linkedinUrl: '',
          avatarUrl: null,
        },
      };
    }

    const admin = createAdminClient();

    // 1. Fetch faculties options
    const { data: facultiesData } = await admin
      .from('faculty_options')
      .select('id, name_ar, name_en, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const faculties = facultiesData || [];

    // 2. Fetch team profile if exists
    let teamProfile = context.profile;
    if (!teamProfile && context.user.email) {
      const { data: matchedProfile } = await admin
        .from('profiles')
        .select('*')
        .eq('email', context.user.email.toLowerCase().trim())
        .maybeSingle();
      if (matchedProfile) {
        teamProfile = matchedProfile as any;
      }
    }

    // 3. Fetch or initialize student profile
    let { data: student } = await admin
      .from('student_profiles')
      .select('*')
      .eq('id', context.user.id)
      .maybeSingle();

    // If not exists yet, create initial incomplete record
    if (!student) {
      const { data: newStudent } = await admin
        .from('student_profiles')
        .insert({
          id: context.user.id,
          email: context.user.email?.toLowerCase().trim() || '',
          team_profile_id: teamProfile?.id || null,
          status: 'incomplete',
        })
        .select('*')
        .maybeSingle();

      student = newStudent || null;
    } else if (!student.team_profile_id && teamProfile?.id) {
      // Bridge link if not set
      await admin
        .from('student_profiles')
        .update({ team_profile_id: teamProfile.id, updated_at: new Date().toISOString() })
        .eq('id', student.id);
      student.team_profile_id = teamProfile.id;
    }

    const isAlreadyActive = student?.status === 'active';
    const isTeamMember = Boolean(teamProfile);

    const prefilled = {
      fullNameAr: student?.full_name_ar || (teamProfile as any)?.full_name_ar || '',
      fullNameEn: student?.full_name_en || (teamProfile as any)?.full_name_en || (teamProfile as any)?.full_name || '',
      email: student?.email || context.user.email || '',
      nationalId: student?.national_id || (teamProfile as any)?.national_id || '',
      university: student?.university || 'Helwan National University',
      faculty: student?.faculty || (teamProfile as any)?.faculty || '',
      departmentMajor: student?.department_major || (teamProfile as any)?.department_major || '',
      academicYear: student?.academic_year || (teamProfile as any)?.academic_year || 1,
      phone: student?.phone || (teamProfile as any)?.phone || '',
      whatsappNumber: student?.whatsapp_number || (teamProfile as any)?.whatsapp_number || (teamProfile as any)?.phone || '',
      facebookUrl: student?.facebook_url || (teamProfile as any)?.facebook_url || '',
      instagramUrl: student?.instagram_url || (teamProfile as any)?.instagram_url || '',
      linkedinUrl: student?.linkedin_url || (teamProfile as any)?.linkedin_url || '',
      avatarUrl: student?.avatar_url || (teamProfile as any)?.avatar_url || null,
    };

    return {
      authenticated: true,
      isAlreadyActive,
      isTeamMember,
      student: student as StudentProfile | null,
      faculties,
      prefilled,
    };
  } catch (err: any) {
    console.error('getStudentOnboardingData exception:', err);
    return {
      authenticated: false,
      isAlreadyActive: false,
      isTeamMember: false,
      student: null,
      faculties: [],
      prefilled: {
        fullNameAr: '',
        fullNameEn: '',
        email: '',
        nationalId: '',
        university: 'Helwan National University',
        faculty: '',
        departmentMajor: '',
        academicYear: 1,
        phone: '',
        whatsappNumber: '',
        facebookUrl: '',
        instagramUrl: '',
        linkedinUrl: '',
        avatarUrl: null,
      },
      error: err.message,
    };
  }
}

/**
 * 5. Get full dashboard data for active student
 */
export async function getStudentDashboardData(): Promise<{
  authenticated: boolean;
  needsOnboarding: boolean;
  data?: StudentDashboardData;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { authenticated: false, needsOnboarding: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();

    // 1. Fetch student profile
    const { data: student, error: stuErr } = await admin
      .from('student_profiles')
      .select('*')
      .eq('id', context.user.id)
      .maybeSingle();

    if (stuErr) {
      console.error('getStudentDashboardData student error:', stuErr);
      return { authenticated: true, needsOnboarding: false, error: stuErr.message };
    }

    if (!student || student.status !== 'active') {
      return { authenticated: true, needsOnboarding: true };
    }

    // 2. Fetch linked team member profile if exists
    let teamProfile: StudentDashboardData['teamProfile'] = null;
    const teamProfileId = student.team_profile_id || context.profile?.id;

    if (teamProfileId) {
      const { data: tp } = await admin
        .from('profiles')
        .select(`
          id,
          role,
          department:departments (
            name,
            code,
            branch
          )
        `)
        .eq('id', teamProfileId)
        .maybeSingle();

      if (tp) {
        teamProfile = {
          id: tp.id,
          role: tp.role,
          department: (tp.department as any) || null,
        };
      }
    }

    // 3. Certificates query
    let certificates: StudentDashboardData['certificates'] = [];
    try {
      const { data: certs } = await admin
        .from('certificates')
        .select('id, title, certificate_number, verification_code, issue_date, pdf_drive_url')
        .or(`recipient_email.eq.${student.email}${teamProfileId ? `,recipient_profile_id.eq.${teamProfileId}` : ''}`)
        .order('created_at', { ascending: false });

      if (certs) {
        certificates = certs.map((c: any) => ({
          id: c.id,
          title: c.title,
          certificate_number: c.certificate_number,
          verification_code: c.verification_code,
          issue_date: c.issue_date,
          pdf_drive_url: c.pdf_drive_url || null,
        }));
      }
    } catch {
      certificates = [];
    }

    // 4. Query real attendance records for this student with session details
    let attendance: StudentDashboardData['attendance'] = [];
    const attendedCourseSessionIds = new Set<string>();
    const attendedWorkshopSessionIds = new Set<string>();

    try {
      const { data: attData, error: attErr } = await admin
        .from('student_attendance')
        .select(`
          id,
          session_id,
          workshop_session_id,
          check_in_time,
          method,
          notes,
          checked_in_by,
          officer:profiles!student_attendance_checked_in_by_fkey(full_name),
          course_session:course_sessions!student_attendance_session_id_fkey(
            id,
            session_number,
            title,
            session_date,
            start_time,
            type,
            venue,
            course:courses!course_sessions_course_id_fkey(title)
          ),
          workshop_session:workshop_sessions!student_attendance_workshop_session_id_fkey(
            id,
            session_number,
            title,
            session_date,
            start_time,
            type,
            venue,
            workshop:workshops!workshop_sessions_workshop_id_fkey(title)
          )
        `)
        .eq('student_id', student.id)
        .order('check_in_time', { ascending: false });

      if (attErr) {
        console.error('getStudentDashboardData attendance error:', attErr);
      }

      if (attData) {
        attendance = attData.map((a: any) => {
          const isCourse = !!a.session_id;
          const officer = Array.isArray(a.officer) ? a.officer[0] : a.officer;
          const cs = Array.isArray(a.course_session) ? a.course_session[0] : a.course_session;
          const ws = Array.isArray(a.workshop_session) ? a.workshop_session[0] : a.workshop_session;
          const c = cs?.course ? (Array.isArray(cs.course) ? cs.course[0] : cs.course) : null;
          const w = ws?.workshop ? (Array.isArray(ws.workshop) ? ws.workshop[0] : ws.workshop) : null;

          if (a.session_id) attendedCourseSessionIds.add(a.session_id);
          if (a.workshop_session_id) attendedWorkshopSessionIds.add(a.workshop_session_id);

          const eventTitle = isCourse ? (c?.title || 'Course Track') : (w?.title || 'Workshop');
          const sessionTitle = isCourse
            ? (cs?.title ? `Session ${cs.session_number}: ${cs.title}` : `Session ${cs?.session_number || ''}`)
            : (ws?.title ? `Session ${ws.session_number}: ${ws.title}` : `Session ${ws?.session_number || ''}`);
          const sessionNumber = isCourse ? cs?.session_number : ws?.session_number;
          const date = isCourse ? (cs?.session_date || a.check_in_time) : (ws?.session_date || a.check_in_time);
          const venue = isCourse ? cs?.venue : ws?.venue;

          return {
            id: a.id,
            event_title: eventTitle,
            type: isCourse ? ('course' as const) : ('workshop' as const),
            session_title: sessionTitle,
            session_number: sessionNumber,
            date: date,
            scanned_at: a.check_in_time,
            method: a.method,
            checked_in_by_name: officer?.full_name || 'GDGoC Officer',
            venue: venue,
          };
        });
      }
    } catch (attEx) {
      console.error('getStudentDashboardData attendance exception:', attEx);
    }

    // 5. Query enrolled courses for this student
    let courses: StudentDashboardData['courses'] = [];
    try {
      const { data: enrollmentRows } = await admin
        .from('course_enrollments')
        .select(`
          id,
          status,
          enrolled_at,
          course:courses(
            id,
            title,
            description,
            department:departments(name),
            sessions:course_sessions(id, title, session_date, start_time, end_time, type, venue, youtube_url, duration_minutes, deadline, status)
          )
        `)
        .eq('student_id', student.id)
        .eq('status', 'confirmed');

      if (enrollmentRows) {
        courses = enrollmentRows.map((e: any) => {
          const c = Array.isArray(e.course) ? e.course[0] : e.course;
          const dept = Array.isArray(c?.department) ? c?.department[0] : c?.department;
          const sList = c?.sessions || [];
          const nextSession = sList
            .filter((s: any) => s.status === 'scheduled')
            .sort((a: any, b: any) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())[0];

          const courseAttendedCount = sList.filter((s: any) => attendedCourseSessionIds.has(s.id)).length;

          return {
            id: c?.id || e.id,
            title: c?.title || 'Enrolled Course',
            description: c?.description || '',
            committee_name: dept?.name,
            sessions_total: sList.length,
            sessions_attended: courseAttendedCount,
            next_session: nextSession
              ? {
                  title: nextSession.title,
                  date: nextSession.session_date,
                  start_time: nextSession.start_time,
                  end_time: nextSession.end_time,
                  type: nextSession.type,
                  venue: nextSession.venue,
                  youtube_url: nextSession.youtube_url,
                  duration_minutes: nextSession.duration_minutes,
                  deadline: nextSession.deadline,
                }
              : null,
          };
        });
      }
    } catch (e) {
      console.error('getStudentDashboardData courses query error:', e);
      courses = [];
    }

    // 6. Query registered workshops for this student
    let workshops: StudentDashboardData['workshops'] = [];
    try {
      const { data: wsRows } = await admin
        .from('workshop_registrations')
        .select(`
          id,
          qr_code,
          status,
          registered_at,
          workshop:workshops(
            id,
            title,
            description,
            category,
            department:departments(name),
            sessions:workshop_sessions(
              id,
              session_number,
              title,
              session_date,
              start_time,
              end_time,
              type,
              venue,
              status
            )
          )
        `)
        .eq('student_id', student.id)
        .eq('status', 'registered');

      if (wsRows && wsRows.length > 0) {
        const today = new Date().toISOString().split('T')[0];

        workshops = wsRows.map((row: any) => {
          const w = Array.isArray(row.workshop) ? row.workshop[0] : row.workshop;
          const dept = Array.isArray(w?.department) ? w?.department[0] : w?.department;
          const sList = (w?.sessions || [])
            .slice()
            .sort((a: any, b: any) => a.session_number - b.session_number);

          const formattedSessions = sList.map((s: any) => ({
            id: s.id,
            session_number: s.session_number,
            title: s.title,
            date: s.session_date,
            start_time: s.start_time,
            end_time: s.end_time,
            type: s.type as 'online' | 'offline',
            venue: s.venue,
            status: s.status,
            is_attended: attendedWorkshopSessionIds.has(s.id),
          }));

          const attendedCount = formattedSessions.filter((s: any) => s.is_attended).length;
          const upcoming = formattedSessions.find((s: any) => s.date >= today && s.status !== 'cancelled');
          const nextSession = upcoming || formattedSessions[0] || null;

          const isAllPast = formattedSessions.length > 0 && formattedSessions.every((s: any) => s.date < today);
          const status: 'upcoming' | 'completed' | 'in_progress' = isAllPast ? 'completed' : 'upcoming';

          return {
            id: w?.id || row.id,
            registration_id: row.id,
            qr_code: row.qr_code,
            title: w?.title || 'Workshop',
            description: w?.description || '',
            committee_name: dept?.name,
            category: w?.category,
            date: nextSession ? nextSession.date : row.registered_at,
            sessions_count: sList.length,
            sessions_attended: attendedCount,
            status,
            venue: nextSession?.venue || undefined,
            next_session: nextSession
              ? {
                  id: nextSession.id,
                  session_number: nextSession.session_number,
                  title: nextSession.title,
                  date: nextSession.date,
                  start_time: nextSession.start_time,
                  end_time: nextSession.end_time,
                  type: nextSession.type,
                  venue: nextSession.venue,
                }
              : null,
            sessions: formattedSessions,
          };
        });
      }
    } catch (wsErr) {
      console.error('getStudentDashboardData workshops error:', wsErr);
      workshops = [];
    }

    let tasks: StudentDashboardData['tasks'] = [];
    let quizzes: StudentDashboardData['quizzes'] = [];
    let recentFeedback: StudentDashboardData['recent_feedback'] = [];

    const enrolledCourseIds = courses.map((c) => c.id).filter(Boolean);
    const registeredWorkshopIds = workshops.map((w) => w.id).filter(Boolean);

    try {
      if (enrolledCourseIds.length > 0 || registeredWorkshopIds.length > 0) {
        // 1. Fetch tasks
        let taskQuery = admin
          .from('student_tasks')
          .select(`
            id,
            course_id,
            workshop_id,
            lesson_id,
            title,
            description,
            due_date,
            submission_type,
            max_score,
            assigned_to,
            specific_student_ids,
            status,
            course:courses(id, title),
            workshop:workshops(id, title)
          `)
          .neq('status', 'draft')
          .order('due_date', { ascending: true, nullsFirst: false });

        if (enrolledCourseIds.length > 0 && registeredWorkshopIds.length > 0) {
          taskQuery = taskQuery.or(`course_id.in.(${enrolledCourseIds.join(',')}),workshop_id.in.(${registeredWorkshopIds.join(',')})`);
        } else if (enrolledCourseIds.length > 0) {
          taskQuery = taskQuery.in('course_id', enrolledCourseIds);
        } else if (registeredWorkshopIds.length > 0) {
          taskQuery = taskQuery.in('workshop_id', registeredWorkshopIds);
        }

        const { data: rawTasks, error: taskErr } = await taskQuery;
        if (taskErr) {
          console.error('getStudentDashboardData tasks error:', taskErr);
        }

        // Fetch submissions by this student
        const { data: mySubmissions } = await admin
          .from('student_task_submissions')
          .select(`
            id,
            task_id,
            status,
            score,
            feedback_comment,
            submitted_at,
            graded_at,
            grader:profiles!student_task_submissions_graded_by_fkey(full_name)
          `)
          .eq('student_id', student.id);

        const subMap = new Map<string, any>();
        if (mySubmissions) {
          for (const sub of mySubmissions) {
            subMap.set(sub.task_id, sub);
          }
        }

        const now = Date.now();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

        if (rawTasks && rawTasks.length > 0) {
          const visibleTasks = rawTasks.filter((t: any) => {
            if (t.assigned_to === 'all_enrolled') return true;
            if (Array.isArray(t.specific_student_ids) && t.specific_student_ids.includes(student.id)) return true;
            return false;
          });

          tasks = visibleTasks.map((t: any) => {
            const courseObj = Array.isArray(t.course) ? t.course[0] : t.course;
            const wsObj = Array.isArray(t.workshop) ? t.workshop[0] : t.workshop;
            const courseTitle = courseObj?.title || wsObj?.title || 'Curriculum Track';
            const sub = subMap.get(t.id);

            const status = sub?.status || 'pending';
            const dueTime = t.due_date ? new Date(t.due_date).getTime() : null;
            const isDueSoon = dueTime ? (dueTime - now > 0 && dueTime - now <= threeDaysMs && (status === 'pending' || status === 'needs_revision')) : false;
            const isOverdue = dueTime ? (dueTime < now && status === 'pending') : false;

            return {
              id: t.id,
              course_id: t.course_id,
              workshop_id: t.workshop_id,
              title: t.title,
              course_title: courseTitle,
              deadline: t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible',
              due_date: t.due_date,
              is_due_soon: isDueSoon,
              is_overdue: isOverdue,
              submission_type: t.submission_type || 'link',
              status,
              score: sub?.score ?? null,
              max_score: t.max_score || 10,
              feedback: sub?.feedback_comment || null,
            };
          });

          if (mySubmissions && mySubmissions.length > 0) {
            const taskLookup = new Map<string, any>(rawTasks.map((t: any) => [t.id, t]));
            recentFeedback = mySubmissions
              .filter((sub: any) => (sub.feedback_comment || sub.status === 'graded') && sub.status !== 'submitted')
              .map((sub: any) => {
                const parentTask = taskLookup.get(sub.task_id);
                const cObj = Array.isArray(parentTask?.course) ? parentTask.course[0] : parentTask?.course;
                const wObj = Array.isArray(parentTask?.workshop) ? parentTask.workshop[0] : parentTask?.workshop;
                const grader = Array.isArray(sub.grader) ? sub.grader[0] : sub.grader;

                return {
                  id: sub.id,
                  task_id: sub.task_id,
                  task_title: parentTask?.title || 'Assignment Deliverable',
                  course_id: parentTask?.course_id || null,
                  course_title: cObj?.title || wObj?.title || 'Learning Curriculum',
                  score: sub.score,
                  max_score: parentTask?.max_score || 10,
                  status: sub.status,
                  feedback_comment: sub.feedback_comment,
                  graded_at: sub.graded_at,
                  mentor_name: grader?.full_name || 'Course Instructor / Mentor',
                };
              })
              .sort((a, b) => new Date(b.graded_at || 0).getTime() - new Date(a.graded_at || 0).getTime())
              .slice(0, 10);
          }
        }

        // 2. Fetch quizzes
        let quizQuery = admin
          .from('quizzes')
          .select(`
            id,
            course_id,
            workshop_id,
            lesson_id,
            title,
            description,
            time_limit_minutes,
            passing_score_percentage,
            questions,
            allow_retakes,
            max_attempts,
            status,
            course:courses(id, title),
            workshop:workshops(id, title)
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (enrolledCourseIds.length > 0 && registeredWorkshopIds.length > 0) {
          quizQuery = quizQuery.or(`course_id.in.(${enrolledCourseIds.join(',')}),workshop_id.in.(${registeredWorkshopIds.join(',')})`);
        } else if (enrolledCourseIds.length > 0) {
          quizQuery = quizQuery.in('course_id', enrolledCourseIds);
        } else if (registeredWorkshopIds.length > 0) {
          quizQuery = quizQuery.in('workshop_id', registeredWorkshopIds);
        }

        const { data: rawQuizzes, error: qErr } = await quizQuery;
        if (qErr) {
          console.error('getStudentDashboardData quizzes error:', qErr);
        }

        const { data: myAttempts } = await admin
          .from('quiz_attempts')
          .select('id, quiz_id, attempt_number, total_score, passed, status, submitted_at')
          .eq('student_id', student.id)
          .order('attempt_number', { ascending: false });

        const attemptsMap = new Map<string, any>();
        if (myAttempts) {
          for (const att of myAttempts) {
            if (!attemptsMap.has(att.quiz_id)) {
              attemptsMap.set(att.quiz_id, att);
            }
          }
        }

        if (rawQuizzes && rawQuizzes.length > 0) {
          quizzes = rawQuizzes.map((q: any) => {
            const courseObj = Array.isArray(q.course) ? q.course[0] : q.course;
            const wsObj = Array.isArray(q.workshop) ? q.workshop[0] : q.workshop;
            const courseTitle = courseObj?.title || wsObj?.title || 'Curriculum Track';
            const att = attemptsMap.get(q.id);

            const isCompleted = att && (att.status === 'graded' || att.status === 'submitted');
            const totalQuestions = Array.isArray(q.questions) ? q.questions.length : 0;

            return {
              id: q.id,
              course_id: q.course_id,
              workshop_id: q.workshop_id,
              title: q.title,
              course_title: courseTitle,
              time_limit_minutes: q.time_limit_minutes,
              passing_score_percentage: q.passing_score_percentage,
              status: isCompleted ? 'completed' : 'available',
              score: att?.total_score ?? null,
              passed: att?.passed ?? null,
              total_questions: totalQuestions,
            };
          });
        }
      }
    } catch (tqErr) {
      console.error('getStudentDashboardData tasks & quizzes error:', tqErr);
    }

    // Calculate aggregate attendance rates
    let totalSessionsExpected = 0;
    courses.forEach((c) => (totalSessionsExpected += c.sessions_total));
    workshops.forEach((w) => (totalSessionsExpected += w.sessions_count));

    const totalSessionsAttended = attendance.length;
    const enrolledCoursesCount = courses.length;
    const workshopsCount = workshops.length;
    const pendingTasksCount = tasks.filter((t: any) => t.status === 'pending' || t.status === 'needs_revision').length;
    const certificatesCount = certificates.length;

    const stats = {
      enrolledCoursesCount,
      workshopsCount,
      attendanceRate:
        totalSessionsExpected > 0
          ? Math.round((totalSessionsAttended / totalSessionsExpected) * 100)
          : totalSessionsAttended > 0
          ? 100
          : 0,
      totalSessionsAttended,
      totalSessionsExpected,
      pendingTasksCount,
      certificatesCount,
    };

    return {
      authenticated: true,
      needsOnboarding: false,
      data: {
        student: student as StudentProfile,
        teamProfile,
        stats,
        courses,
        workshops,
        tasks,
        quizzes,
        recent_feedback: recentFeedback,
        attendance,
        certificates,
      },
    };
  } catch (err: any) {
    console.error('getStudentDashboardData exception:', err);
    return { authenticated: false, needsOnboarding: false, error: err.message };
  }
}

/**
 * 6. Get data for permanent student QR pass
 */
export async function getStudentQrPassData(): Promise<{
  authenticated: boolean;
  needsOnboarding: boolean;
  student?: StudentProfile;
  teamRole?: string | null;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { authenticated: false, needsOnboarding: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();
    const { data: student } = await admin
      .from('student_profiles')
      .select('*')
      .eq('id', context.user.id)
      .maybeSingle();

    if (!student || student.status !== 'active') {
      return { authenticated: true, needsOnboarding: true };
    }

    let teamRole: string | null = null;
    if (student.team_profile_id || context.profile?.id) {
      const { data: tp } = await admin
        .from('profiles')
        .select('role')
        .eq('id', student.team_profile_id || context.profile?.id)
        .maybeSingle();
      if (tp) teamRole = tp.role;
    }

    return {
      authenticated: true,
      needsOnboarding: false,
      student: student as StudentProfile,
      teamRole,
    };
  } catch (err: any) {
    return { authenticated: false, needsOnboarding: false, error: err.message };
  }
}


