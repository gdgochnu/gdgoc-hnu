'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MenteeCourseSummary {
  course_id: string;
  course_title: string;
  mentor_role: string;
  sessionsAttended: number;
  sessionsTotal: number;
  tasksSubmitted: number;
  tasksTotal: number;
  quizzesPassed: number;
  quizzesTotal: number;
  averageTaskScore: number | null;
  averageQuizScore: number | null;
}

export interface MentorNoteItem {
  id: string;
  student_id: string;
  course_id: string | null;
  note: string;
  flagged_at_risk: boolean;
  created_at: string;
}

export interface MenteeProgress {
  student_id: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  email: string;
  avatar_url: string | null;
  university: string | null;
  department_major: string | null;
  courses: MenteeCourseSummary[];
  totalSessionsAttended: number;
  totalSessionsExpected: number;
  attendanceRate: number;
  tasksSubmitted: number;
  quizzesTaken: number;
  quizzesPassed: number;
  averageTaskScore: number | null;
  averageQuizScore: number | null;
  latestActivity: string | null;
  isAtRisk: boolean;
  mentorNotes: MentorNoteItem[];
}

export interface MentorDashboardResult {
  success: boolean;
  mentorProfile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  assignedCourses: Array<{ id: string; title: string; mentor_role: string }>;
  mentees: MenteeProgress[];
  atRiskCount: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helper: verify current user is a mentor/instructor in at least one course
// ---------------------------------------------------------------------------
async function verifyMentorAccess() {
  const context = await getUserContext();
  if (!context.user || !context.profile) {
    return { authorized: false as const, error: 'Unauthorized: Authentication required.' };
  }
  const profile = context.profile;
  const supabase = createAdminClient();

  const isPresident = profile.role === 'president' || profile.role === 'co_president';

  const { data: assignments, error: assignErr } = await supabase
    .from('course_instructors')
    .select('course_id, role, course:courses(id, title, status)')
    .eq('profile_id', profile.id);

  if (assignErr) console.error('verifyMentorAccess assignErr:', assignErr);

  const activeAssignments = (assignments || []).filter((a: any) => {
    const c = Array.isArray(a.course) ? a.course[0] : a.course;
    return c && c.status !== 'archived';
  });

  if (!isPresident && activeAssignments.length === 0) {
    return {
      authorized: false as const,
      error: 'You are not assigned as an instructor or mentor in any active course.',
    };
  }

  let coursesList: Array<{ id: string; title: string; mentor_role: string }>;

  if (isPresident && activeAssignments.length === 0) {
    const { data: allCourses } = await supabase
      .from('courses')
      .select('id, title')
      .neq('status', 'archived')
      .order('title');
    coursesList = (allCourses || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      mentor_role: 'president',
    }));
  } else {
    coursesList = activeAssignments.map((a: any) => {
      const c = Array.isArray(a.course) ? a.course[0] : a.course;
      return { id: a.course_id, title: c?.title || 'Course', mentor_role: a.role };
    });
  }

  return {
    authorized: true as const,
    profile,
    supabase,
    courseIds: coursesList.map((c) => c.id),
    coursesList,
  };
}

// ---------------------------------------------------------------------------
// Main fetch function
// ---------------------------------------------------------------------------
export async function getMentorDashboardData(): Promise<MentorDashboardResult> {
  try {
    const access = await verifyMentorAccess();
    if (!access.authorized) {
      return { success: false, assignedCourses: [], mentees: [], atRiskCount: 0, error: access.error };
    }

    const { profile, supabase, courseIds, coursesList } = access;

    if (courseIds.length === 0) {
      return {
        success: true,
        mentorProfile: {
          id: profile.id,
          full_name: profile.full_name || '',
          avatar_url: profile.avatar_url || null,
          role: profile.role,
        },
        assignedCourses: coursesList,
        mentees: [],
        atRiskCount: 0,
      };
    }

    // 1. Confirmed enrollments for mentor's courses
    const { data: enrollments, error: enrollErr } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        course_id,
        student_id,
        status,
        student:student_profiles!course_enrollments_student_id_fkey(
          id,
          full_name_en,
          full_name_ar,
          email,
          avatar_url,
          university,
          department_major
        )
      `)
      .in('course_id', courseIds)
      .eq('status', 'confirmed');

    if (enrollErr) console.error('getMentorDashboardData enrollErr:', enrollErr);

    // 2. Completed sessions per course
    const { data: sessions } = await supabase
      .from('course_sessions')
      .select('id, course_id, status')
      .in('course_id', courseIds);

    const completedSessions = (sessions || []).filter((s: any) => s.status === 'completed');
    const sessionIds = completedSessions.map((s: any) => s.id);

    // 3. Attendance
    let attendanceRows: any[] = [];
    if (sessionIds.length > 0) {
      const { data: attData } = await supabase
        .from('student_attendance')
        .select('id, student_id, session_id, check_in_time')
        .in('session_id', sessionIds);
      attendanceRows = attData || [];
    }

    // 4. Tasks & submissions
    const { data: tasks } = await supabase
      .from('student_tasks')
      .select('id, course_id, max_score')
      .in('course_id', courseIds);

    const taskIds = (tasks || []).map((t: any) => t.id);
    let taskSubmissions: any[] = [];
    if (taskIds.length > 0) {
      const { data: subsData } = await supabase
        .from('student_task_submissions')
        .select('id, task_id, student_id, score, status, submitted_at')
        .in('task_id', taskIds);
      taskSubmissions = subsData || [];
    }

    // 5. Quizzes & attempts
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, course_id, passing_score_percentage')
      .in('course_id', courseIds);

    const quizIds = (quizzes || []).map((q: any) => q.id);
    let quizAttempts: any[] = [];
    if (quizIds.length > 0) {
      const { data: attData } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id, student_id, total_score, passed, status, submitted_at')
        .in('quiz_id', quizIds)
        .in('status', ['submitted', 'graded']);
      quizAttempts = attData || [];
    }

    // 6. Mentor notes
    const { data: notesData } = await supabase
      .from('mentor_notes')
      .select('id, mentor_id, student_id, course_id, note, flagged_at_risk, created_at')
      .in('course_id', courseIds);

    // ---------------------------------------------------------------------------
    // Aggregate per student
    // ---------------------------------------------------------------------------
    const studentMap = new Map<string, MenteeProgress>();

    for (const enroll of (enrollments || [])) {
      const stu = Array.isArray(enroll.student) ? enroll.student[0] : enroll.student;
      if (!stu) continue;

      const sid = enroll.student_id;
      const cid = enroll.course_id;
      const courseInfo = coursesList.find((c) => c.id === cid);

      const courseCompletedSessions = completedSessions.filter((s: any) => s.course_id === cid);
      const courseSessionIds = courseCompletedSessions.map((s: any) => s.id);
      const sessionsAttended = attendanceRows.filter(
        (a: any) => a.student_id === sid && courseSessionIds.includes(a.session_id)
      ).length;

      const courseTasks = (tasks || []).filter((t: any) => t.course_id === cid);
      const courseTaskIds = courseTasks.map((t: any) => t.id);
      const studentSubmissions = taskSubmissions.filter(
        (s: any) => s.student_id === sid && courseTaskIds.includes(s.task_id) && s.status !== 'pending'
      );
      const taskScores = studentSubmissions
        .filter((s: any) => s.status === 'graded' || s.status === 'final')
        .map((s: any) => Number(s.score))
        .filter((v: number) => !isNaN(v));
      const avgTaskScore = taskScores.length > 0
        ? Math.round(taskScores.reduce((a: number, b: number) => a + b, 0) / taskScores.length)
        : null;

      const courseQuizzes = (quizzes || []).filter((q: any) => q.course_id === cid);
      const courseQuizIds = courseQuizzes.map((q: any) => q.id);
      const studentAttempts = quizAttempts.filter(
        (a: any) => a.student_id === sid && courseQuizIds.includes(a.quiz_id)
      );
      const passedAttempts = studentAttempts.filter((a: any) => a.passed === true);
      const quizScores = studentAttempts
        .map((a: any) => Number(a.total_score))
        .filter((v: number) => !isNaN(v) && v > 0);
      const avgQuizScore = quizScores.length > 0
        ? Math.round(quizScores.reduce((a: number, b: number) => a + b, 0) / quizScores.length)
        : null;

      const courseSummary: MenteeCourseSummary = {
        course_id: cid,
        course_title: courseInfo?.title || 'Course',
        mentor_role: courseInfo?.mentor_role || 'mentor',
        sessionsAttended,
        sessionsTotal: courseCompletedSessions.length,
        tasksSubmitted: studentSubmissions.length,
        tasksTotal: courseTasks.length,
        quizzesPassed: passedAttempts.length,
        quizzesTotal: courseQuizzes.length,
        averageTaskScore: avgTaskScore,
        averageQuizScore: avgQuizScore,
      };

      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          student_id: sid,
          full_name_en: stu.full_name_en || null,
          full_name_ar: stu.full_name_ar || null,
          email: stu.email || '',
          avatar_url: stu.avatar_url || null,
          university: stu.university || null,
          department_major: stu.department_major || null,
          courses: [],
          totalSessionsAttended: 0,
          totalSessionsExpected: 0,
          attendanceRate: 0,
          tasksSubmitted: 0,
          quizzesTaken: 0,
          quizzesPassed: 0,
          averageTaskScore: null,
          averageQuizScore: null,
          latestActivity: null,
          isAtRisk: false,
          mentorNotes: [],
        });
      }

      studentMap.get(sid)!.courses.push(courseSummary);
    }

    // Final aggregation pass
    for (const [sid, mentee] of studentMap) {
      let totSessAtt = 0, totSessExp = 0, totTasksSub = 0;
      let totQuizTaken = 0, totQuizPassed = 0;
      const allTaskScores: number[] = [];
      const allQuizScores: number[] = [];

      for (const cs of mentee.courses) {
        totSessAtt += cs.sessionsAttended;
        totSessExp += cs.sessionsTotal;
        totTasksSub += cs.tasksSubmitted;
        totQuizPassed += cs.quizzesPassed;
        if (cs.averageTaskScore !== null) allTaskScores.push(cs.averageTaskScore);
        if (cs.averageQuizScore !== null) allQuizScores.push(cs.averageQuizScore);
        // count quiz attempts per course
        const courseQuizzes = (quizIds.length > 0 ? quizAttempts : []).filter(
          (a: any) => {
            const q = (quizzes || []).find((q: any) => q.id === a.quiz_id);
            return q && q.course_id === cs.course_id && a.student_id === sid;
          }
        );
        totQuizTaken += courseQuizzes.length;
      }

      mentee.totalSessionsAttended = totSessAtt;
      mentee.totalSessionsExpected = totSessExp;
      mentee.attendanceRate = totSessExp > 0 ? Math.round((totSessAtt / totSessExp) * 100) : 0;
      mentee.tasksSubmitted = totTasksSub;
      mentee.quizzesTaken = totQuizTaken;
      mentee.quizzesPassed = totQuizPassed;
      mentee.averageTaskScore = allTaskScores.length > 0
        ? Math.round(allTaskScores.reduce((a, b) => a + b, 0) / allTaskScores.length)
        : null;
      mentee.averageQuizScore = allQuizScores.length > 0
        ? Math.round(allQuizScores.reduce((a, b) => a + b, 0) / allQuizScores.length)
        : null;

      // Latest activity
      const studentSubs = taskSubmissions.filter((s: any) => s.student_id === sid);
      const studentAtt = attendanceRows.filter((a: any) => a.student_id === sid);
      const activityDates = [
        ...studentSubs.map((s: any) => s.submitted_at),
        ...studentAtt.map((a: any) => a.check_in_time),
      ].filter(Boolean).sort().reverse();
      mentee.latestActivity = activityDates[0] || null;

      // Mentor notes
      const notes = (notesData || []).filter((n: any) => n.student_id === sid);
      mentee.mentorNotes = notes.map((n: any) => ({
        id: n.id,
        student_id: n.student_id,
        course_id: n.course_id,
        note: n.note,
        flagged_at_risk: n.flagged_at_risk,
        created_at: n.created_at,
      }));

      // At-risk logic
      mentee.isAtRisk =
        notes.some((n: any) => n.flagged_at_risk) ||
        (totSessExp > 0 && mentee.attendanceRate < 50);
    }

    const menteesList = Array.from(studentMap.values()).sort((a, b) => {
      if (a.isAtRisk !== b.isAtRisk) return a.isAtRisk ? -1 : 1;
      return (a.full_name_en || a.email).localeCompare(b.full_name_en || b.email);
    });

    return {
      success: true,
      mentorProfile: {
        id: profile.id,
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || null,
        role: profile.role,
      },
      assignedCourses: coursesList,
      mentees: menteesList,
      atRiskCount: menteesList.filter((m) => m.isAtRisk).length,
    };
  } catch (err: any) {
    console.error('getMentorDashboardData exception:', err);
    return {
      success: false,
      assignedCourses: [],
      mentees: [],
      atRiskCount: 0,
      error: err.message || 'Failed to load mentor dashboard.',
    };
  }
}

// ---------------------------------------------------------------------------
// Save a mentor note
// ---------------------------------------------------------------------------
export async function saveMentorNote(payload: {
  studentId: string;
  courseId: string | null;
  note: string;
  flaggedAtRisk: boolean;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = createAdminClient();

    const { error: insertErr } = await supabase.from('mentor_notes').insert({
      mentor_id: context.profile.id,
      student_id: payload.studentId,
      course_id: payload.courseId || null,
      note: payload.note.trim(),
      flagged_at_risk: payload.flaggedAtRisk,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertErr) {
      console.error('saveMentorNote insertErr:', insertErr);
      return { success: false, error: 'Failed to save note. Please try again.' };
    }

    revalidatePath('/student-portal/admin/mentorship');
    return {
      success: true,
      message: payload.flaggedAtRisk
        ? 'Student flagged as at-risk and note saved.'
        : 'Note saved successfully.',
    };
  } catch (err: any) {
    console.error('saveMentorNote exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
