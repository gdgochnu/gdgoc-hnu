'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { Quiz, QuizQuestion, CourseInstructorRole } from '@/types/student';

export interface QuizAttemptReviewItem {
  id: string;
  quiz_id: string;
  student_id: string;
  attempt_number: number;
  answers: any[];
  auto_graded_score: number | null;
  manual_graded_score: number | null;
  total_score: number | null;
  passed: boolean | null;
  feedback: string | null;
  status: string;
  started_at: string;
  submitted_at: string | null;
  graded_at: string | null;
  graded_by: string | null;
  student: {
    id: string;
    full_name_en: string;
    full_name_ar: string | null;
    email: string;
    avatar_url: string | null;
    university: string | null;
    department_major: string | null;
  };
}

export interface QuizReviewPageResult {
  success: boolean;
  quiz?: {
    id: string;
    course_id: string;
    title: string;
    description: string;
    time_limit_minutes: number | null;
    passing_score_percentage: number;
    questions: QuizQuestion[];
    totalPoints: number;
    status: string;
  };
  course?: {
    id: string;
    title: string;
    department_id: string | null;
  };
  attempts: QuizAttemptReviewItem[];
  error?: string;
}

export interface SubmitManualGradeInput {
  course_id: string;
  quiz_id: string;
  attempt_id: string;
  question_grades: Record<string, { points_awarded: number; comment?: string }>;
  overall_feedback?: string;
}

type VerifyInstructorResult =
  | { authorized: false; error: string; course?: undefined; profile?: undefined; admin?: undefined }
  | { authorized: true; course: any; profile: any; admin: ReturnType<typeof createAdminClient>; error?: undefined };

/**
 * Verify instructor / admin permissions
 */
async function verifyInstructorAccess(courseId: string): Promise<VerifyInstructorResult> {
  const context = await getUserContext();
  if (!context.user || !context.profile) {
    return { authorized: false, error: 'Unauthorized: Authentication required.' };
  }
  const profile = context.profile;
  const admin = createAdminClient();

  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select('id, title, department_id, instructors:course_instructors(profile_id, role)')
    .eq('id', courseId)
    .single();

  if (courseErr || !course) {
    return { authorized: false, error: 'Course not found.' };
  }

  const isPresident = profile.role === 'president' || profile.role === 'co_president';
  const isHead =
    (profile.role === 'committee_head' || profile.role === 'committee_co_head') &&
    profile.department_id === course.department_id;
  const isInstructor = (course.instructors || []).some((ins: any) => ins.profile_id === profile.id);

  if (!isPresident && !isHead && !isInstructor) {
    return { authorized: false, error: 'Forbidden: You do not have permission to grade this quiz.' };
  }

  return { authorized: true, course, profile, admin };
}

/**
 * Fetch all student attempts for a quiz for instructor evaluation
 */
export async function getQuizAttemptsForReview(
  courseId: string,
  quizId: string
): Promise<QuizReviewPageResult> {
  try {
    const access = await verifyInstructorAccess(courseId);
    if (!access.authorized) {
      return { success: false, attempts: [], error: access.error };
    }

    const { course, admin } = access;

    // 1. Fetch Quiz
    const { data: quiz, error: quizErr } = await admin
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('course_id', courseId)
      .single();

    if (quizErr || !quiz) {
      return { success: false, attempts: [], error: 'Quiz not found.' };
    }

    const rawQuestions: QuizQuestion[] = Array.isArray(quiz.questions) ? quiz.questions : [];
    const totalPoints = rawQuestions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

    // 2. Fetch Attempts
    const { data: attemptsData, error: attemptsErr } = await admin
      .from('quiz_attempts')
      .select(`
        *,
        student:student_profiles(id, full_name_en, full_name_ar, email, avatar_url, university, department_major)
      `)
      .eq('quiz_id', quizId)
      .order('submitted_at', { ascending: false });

    if (attemptsErr) {
      console.error('getQuizAttemptsForReview attempts error:', attemptsErr);
    }

    const attempts: QuizAttemptReviewItem[] = (attemptsData || []).map((a: any) => {
      const std = Array.isArray(a.student) ? a.student[0] : a.student;
      return {
        id: a.id,
        quiz_id: a.quiz_id,
        student_id: a.student_id,
        attempt_number: a.attempt_number,
        answers: Array.isArray(a.answers) ? a.answers : [],
        auto_graded_score: a.auto_graded_score,
        manual_graded_score: a.manual_graded_score,
        total_score: a.total_score,
        passed: a.passed,
        feedback: a.feedback,
        status: a.status,
        started_at: a.started_at,
        submitted_at: a.submitted_at,
        graded_at: a.graded_at,
        graded_by: a.graded_by,
        student: {
          id: std?.id || a.student_id,
          full_name_en: std?.full_name_en || 'Student',
          full_name_ar: std?.full_name_ar || null,
          email: std?.email || '',
          avatar_url: std?.avatar_url || null,
          university: std?.university || null,
          department_major: std?.department_major || null,
        },
      };
    });

    return {
      success: true,
      quiz: {
        id: quiz.id,
        course_id: quiz.course_id,
        title: quiz.title,
        description: quiz.description || '',
        time_limit_minutes: quiz.time_limit_minutes,
        passing_score_percentage: Number(quiz.passing_score_percentage) || 60,
        questions: rawQuestions,
        totalPoints,
        status: quiz.status,
      },
      course: {
        id: course.id,
        title: course.title,
        department_id: course.department_id,
      },
      attempts,
    };
  } catch (err: any) {
    console.error('getQuizAttemptsForReview exception:', err);
    return { success: false, attempts: [], error: err.message || 'Failed to load quiz attempts.' };
  }
}

/**
 * Submit manual grades for open-ended questions and finalize attempt score
 */
export async function gradeQuizAttempt(input: SubmitManualGradeInput): Promise<{
  success: boolean;
  attempt?: QuizAttemptReviewItem;
  error?: string;
}> {
  try {
    const access = await verifyInstructorAccess(input.course_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { profile, admin } = access;

    // Fetch Quiz to get passing score and max points
    const { data: quiz } = await admin
      .from('quizzes')
      .select('passing_score_percentage, questions')
      .eq('id', input.quiz_id)
      .single();

    if (!quiz) {
      return { success: false, error: 'Quiz not found.' };
    }

    const rawQuestions: QuizQuestion[] = Array.isArray(quiz.questions) ? quiz.questions : [];
    const maxPoints = rawQuestions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

    // Fetch Attempt
    const { data: attempt } = await admin
      .from('quiz_attempts')
      .select('*')
      .eq('id', input.attempt_id)
      .single();

    if (!attempt) {
      return { success: false, error: 'Attempt not found.' };
    }

    // Update answers
    const answers: any[] = Array.isArray(attempt.answers) ? [...attempt.answers] : [];
    let manualGradedScore = 0;

    answers.forEach((ans) => {
      const qId = ans.question_id;
      if (input.question_grades[qId] !== undefined) {
        const awarded = Number(input.question_grades[qId].points_awarded) || 0;
        ans.points_awarded = awarded;
        ans.manual_comment = input.question_grades[qId].comment || '';
        ans.is_graded = true;
        manualGradedScore += awarded;
      }
    });

    const autoScore = Number(attempt.auto_graded_score) || 0;
    const totalScore = autoScore + manualGradedScore;
    const percentage = maxPoints > 0 ? Math.round((totalScore / maxPoints) * 100) : 0;
    const passed = percentage >= (Number(quiz.passing_score_percentage) || 60);

    const { data: updatedAttempt, error: updateErr } = await admin
      .from('quiz_attempts')
      .update({
        answers,
        manual_graded_score: manualGradedScore,
        total_score: totalScore,
        passed,
        status: 'graded',
        feedback: input.overall_feedback?.trim() || null,
        graded_at: new Date().toISOString(),
        graded_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.attempt_id)
      .select(`
        *,
        student:student_profiles(id, full_name_en, full_name_ar, email, avatar_url, university, department_major)
      `)
      .single();

    if (updateErr || !updatedAttempt) {
      console.error('gradeQuizAttempt update error:', updateErr);
      return { success: false, error: 'Failed to update quiz grade.' };
    }

    revalidatePath(`/student-portal/admin/courses/${input.course_id}/quizzes/${input.quiz_id}/review`);
    revalidatePath(`/student/courses/${input.course_id}`);

    const std = Array.isArray(updatedAttempt.student) ? updatedAttempt.student[0] : updatedAttempt.student;

    return {
      success: true,
      attempt: {
        id: updatedAttempt.id,
        quiz_id: updatedAttempt.quiz_id,
        student_id: updatedAttempt.student_id,
        attempt_number: updatedAttempt.attempt_number,
        answers: updatedAttempt.answers,
        auto_graded_score: updatedAttempt.auto_graded_score,
        manual_graded_score: updatedAttempt.manual_graded_score,
        total_score: updatedAttempt.total_score,
        passed: updatedAttempt.passed,
        feedback: updatedAttempt.feedback,
        status: updatedAttempt.status,
        started_at: updatedAttempt.started_at,
        submitted_at: updatedAttempt.submitted_at,
        graded_at: updatedAttempt.graded_at,
        graded_by: updatedAttempt.graded_by,
        student: {
          id: std?.id || updatedAttempt.student_id,
          full_name_en: std?.full_name_en || 'Student',
          full_name_ar: std?.full_name_ar || null,
          email: std?.email || '',
          avatar_url: std?.avatar_url || null,
          university: std?.university || null,
          department_major: std?.department_major || null,
        },
      },
    };
  } catch (err: any) {
    console.error('gradeQuizAttempt exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
