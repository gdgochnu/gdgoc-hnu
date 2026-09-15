'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import {
  Quiz,
  QuizQuestion,
  QuizStatus,
  QuizQuestionType,
  CourseInstructorRole,
} from '@/types/student';

export interface CourseDetailHeader {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  department_id: string | null;
  department_name?: string;
  department_code?: string;
  cover_image_url: string | null;
  status: string;
  enrollment_type: string;
  instructors_list: Array<{
    id: string;
    profile_id: string;
    role: CourseInstructorRole;
    full_name: string;
    avatar_url: string | null;
  }>;
}

export interface QuizLessonOption {
  id: string;
  lesson_number: number;
  title: string;
}

export interface CourseQuizItem extends Omit<Quiz, 'lesson'> {
  lesson?: {
    id: string;
    lesson_number: number;
    title: string;
  } | null;
  attempts_count: number;
  passed_count: number;
}

export interface CreateQuizInput {
  course_id: string;
  lesson_id?: string | null;
  title: string;
  description?: string;
  time_limit_minutes?: number | null;
  passing_score_percentage: number;
  questions: QuizQuestion[];
  allow_retakes: boolean;
  max_attempts: number;
  status: QuizStatus;
}

export interface UpdateQuizInput extends Partial<CreateQuizInput> {
  id: string;
  course_id: string;
}

export interface CourseQuizzesResult {
  success: boolean;
  course?: CourseDetailHeader;
  quizzes: CourseQuizItem[];
  availableLessons: QuizLessonOption[];
  canManage: boolean;
  userRole?: string;
  error?: string;
}

type VerifyAccessResult =
  | { authorized: false; error: string; course?: undefined; profile?: undefined; supabase?: undefined }
  | {
      authorized: true;
      course: any;
      profile: NonNullable<Awaited<ReturnType<typeof getUserContext>>['profile']>;
      supabase: ReturnType<typeof createAdminClient>;
      error?: undefined;
    };

/**
 * Check if the current user has permission to manage quizzes for this course
 */
async function verifyCourseAccess(courseId: string): Promise<VerifyAccessResult> {
  const context = await getUserContext();
  if (!context.user || !context.profile) {
    return { authorized: false, error: 'Unauthorized: Authentication required.' };
  }
  const profile = context.profile;

  const supabase = createAdminClient();
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      description,
      category,
      department_id,
      cover_image_url,
      status,
      enrollment_type,
      department:departments(id, name, code),
      instructors:course_instructors(
        id,
        role,
        profile_id,
        profile:profiles!course_instructors_profile_id_fkey(
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .eq('id', courseId)
    .single();

  if (courseErr || !course) {
    return { authorized: false, error: 'Course not found or database error.' };
  }

  const isPresident = profile.role === 'president' || profile.role === 'co_president';
  const isOwningHead =
    (profile.role === 'committee_head' || profile.role === 'committee_co_head') &&
    profile.department_id === course.department_id;
  const isAssignedInstructor = (course.instructors || []).some(
    (ins: any) => ins.profile_id === profile.id
  );

  if (!isPresident && !isOwningHead && !isAssignedInstructor) {
    return { authorized: false, error: 'Forbidden: You do not have permission to manage quizzes for this course.' };
  }

  return { authorized: true, course, profile, supabase };
}

/**
 * Fetch all quizzes and lessons for a course
 */
export async function getCourseWithQuizzes(courseId: string): Promise<CourseQuizzesResult> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, quizzes: [], availableLessons: [], canManage: false, error: access.error };
    }

    const { course, profile, supabase } = access;

    // 1. Fetch lessons for selection
    const { data: lessonsData } = await supabase
      .from('course_lessons')
      .select('id, lesson_number, title')
      .eq('course_id', courseId)
      .order('lesson_number', { ascending: true });

    const availableLessons: QuizLessonOption[] = (lessonsData || []).map((l: any) => ({
      id: l.id,
      lesson_number: l.lesson_number,
      title: l.title,
    }));

    // 2. Fetch quizzes
    const { data: quizzesData, error: quizzesErr } = await supabase
      .from('quizzes')
      .select(`
        *,
        lesson:course_lessons(id, lesson_number, title)
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (quizzesErr) {
      console.error('getCourseWithQuizzes error:', quizzesErr);
    }

    // 3. Fetch attempt statistics for each quiz
    const quizIds = (quizzesData || []).map((q) => q.id);
    const attemptsMap = new Map<string, { total: number; passed: number }>();

    if (quizIds.length > 0) {
      const { data: attData } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id, passed')
        .in('quiz_id', quizIds);

      if (attData) {
        for (const att of attData) {
          const curr = attemptsMap.get(att.quiz_id) || { total: 0, passed: 0 };
          curr.total += 1;
          if (att.passed) curr.passed += 1;
          attemptsMap.set(att.quiz_id, curr);
        }
      }
    }

    const quizzes: CourseQuizItem[] = (quizzesData || []).map((q: any) => {
      const lsn = Array.isArray(q.lesson) ? q.lesson[0] : q.lesson;
      const stats = attemptsMap.get(q.id) || { total: 0, passed: 0 };

      return {
        id: q.id,
        course_id: q.course_id,
        workshop_id: q.workshop_id,
        lesson_id: q.lesson_id,
        title: q.title,
        description: q.description || '',
        time_limit_minutes: q.time_limit_minutes,
        passing_score_percentage: Number(q.passing_score_percentage) || 60,
        questions: Array.isArray(q.questions) ? q.questions : [],
        allow_retakes: Boolean(q.allow_retakes),
        max_attempts: Number(q.max_attempts) || 1,
        status: q.status as QuizStatus,
        created_by: q.created_by,
        created_at: q.created_at,
        updated_at: q.updated_at,
        lesson: lsn || null,
        attempts_count: stats.total,
        passed_count: stats.passed,
      };
    });

    const dept = Array.isArray(course.department) ? course.department[0] : course.department;
    const courseHeader: CourseDetailHeader = {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      department_id: course.department_id,
      department_name: dept?.name,
      department_code: dept?.code,
      cover_image_url: course.cover_image_url,
      status: course.status,
      enrollment_type: course.enrollment_type,
      instructors_list: (course.instructors || []).map((ins: any) => {
        const prof = Array.isArray(ins.profile) ? ins.profile[0] : ins.profile;
        return {
          id: ins.id,
          profile_id: ins.profile_id,
          role: ins.role as CourseInstructorRole,
          full_name: prof?.full_name || 'Instructor',
          avatar_url: prof?.avatar_url || null,
        };
      }),
    };

    return {
      success: true,
      course: courseHeader,
      quizzes,
      availableLessons,
      canManage: true,
      userRole: profile.role,
    };
  } catch (err: any) {
    console.error('getCourseWithQuizzes exception:', err);
    return {
      success: false,
      quizzes: [],
      availableLessons: [],
      canManage: false,
      error: err.message || 'Failed to load course quizzes.',
    };
  }
}

/**
 * Create a new quiz
 */
export async function createCourseQuiz(input: CreateQuizInput): Promise<{
  success: boolean;
  quiz?: CourseQuizItem;
  error?: string;
}> {
  try {
    const access = await verifyCourseAccess(input.course_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { profile, supabase } = access;

    const { data: newQuiz, error: insertErr } = await supabase
      .from('quizzes')
      .insert({
        course_id: input.course_id,
        lesson_id: input.lesson_id || null,
        title: input.title.trim(),
        description: input.description?.trim() || '',
        time_limit_minutes: input.time_limit_minutes !== undefined ? input.time_limit_minutes : null,
        passing_score_percentage: input.passing_score_percentage,
        questions: input.questions,
        allow_retakes: input.allow_retakes,
        max_attempts: input.max_attempts,
        status: input.status,
        created_by: profile.id,
      })
      .select(`
        *,
        lesson:course_lessons(id, lesson_number, title)
      `)
      .single();

    if (insertErr || !newQuiz) {
      console.error('createCourseQuiz error:', insertErr);
      return { success: false, error: 'Failed to create quiz.' };
    }

    const lsn = Array.isArray(newQuiz.lesson) ? newQuiz.lesson[0] : newQuiz.lesson;

    revalidatePath(`/student-portal/admin/courses/${input.course_id}/quizzes`);
    revalidatePath(`/student/courses/${input.course_id}`);

    return {
      success: true,
      quiz: {
        id: newQuiz.id,
        course_id: newQuiz.course_id,
        workshop_id: newQuiz.workshop_id,
        lesson_id: newQuiz.lesson_id,
        title: newQuiz.title,
        description: newQuiz.description || '',
        time_limit_minutes: newQuiz.time_limit_minutes,
        passing_score_percentage: Number(newQuiz.passing_score_percentage) || 60,
        questions: Array.isArray(newQuiz.questions) ? newQuiz.questions : [],
        allow_retakes: Boolean(newQuiz.allow_retakes),
        max_attempts: Number(newQuiz.max_attempts) || 1,
        status: newQuiz.status as QuizStatus,
        created_by: newQuiz.created_by,
        created_at: newQuiz.created_at,
        updated_at: newQuiz.updated_at,
        lesson: lsn || null,
        attempts_count: 0,
        passed_count: 0,
      },
    };
  } catch (err: any) {
    console.error('createCourseQuiz exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Update an existing quiz
 */
export async function updateCourseQuiz(input: UpdateQuizInput): Promise<{
  success: boolean;
  quiz?: CourseQuizItem;
  error?: string;
}> {
  try {
    const access = await verifyCourseAccess(input.course_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.description !== undefined) updatePayload.description = input.description.trim();
    if (input.lesson_id !== undefined) updatePayload.lesson_id = input.lesson_id || null;
    if (input.time_limit_minutes !== undefined) updatePayload.time_limit_minutes = input.time_limit_minutes;
    if (input.passing_score_percentage !== undefined) updatePayload.passing_score_percentage = input.passing_score_percentage;
    if (input.questions !== undefined) updatePayload.questions = input.questions;
    if (input.allow_retakes !== undefined) updatePayload.allow_retakes = input.allow_retakes;
    if (input.max_attempts !== undefined) updatePayload.max_attempts = input.max_attempts;
    if (input.status !== undefined) updatePayload.status = input.status;

    const { data: updated, error: updateErr } = await supabase
      .from('quizzes')
      .update(updatePayload)
      .eq('id', input.id)
      .select(`
        *,
        lesson:course_lessons(id, lesson_number, title)
      `)
      .single();

    if (updateErr || !updated) {
      console.error('updateCourseQuiz error:', updateErr);
      return { success: false, error: 'Failed to update quiz.' };
    }

    const lsn = Array.isArray(updated.lesson) ? updated.lesson[0] : updated.lesson;

    revalidatePath(`/student-portal/admin/courses/${input.course_id}/quizzes`);
    revalidatePath(`/student/courses/${input.course_id}`);

    return {
      success: true,
      quiz: {
        id: updated.id,
        course_id: updated.course_id,
        workshop_id: updated.workshop_id,
        lesson_id: updated.lesson_id,
        title: updated.title,
        description: updated.description || '',
        time_limit_minutes: updated.time_limit_minutes,
        passing_score_percentage: Number(updated.passing_score_percentage) || 60,
        questions: Array.isArray(updated.questions) ? updated.questions : [],
        allow_retakes: Boolean(updated.allow_retakes),
        max_attempts: Number(updated.max_attempts) || 1,
        status: updated.status as QuizStatus,
        created_by: updated.created_by,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
        lesson: lsn || null,
        attempts_count: 0,
        passed_count: 0,
      },
    };
  } catch (err: any) {
    console.error('updateCourseQuiz exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Toggle publish / unpublish status
 */
export async function toggleQuizStatus(
  quizId: string,
  courseId: string,
  newStatus: QuizStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const { error: toggleErr } = await supabase
      .from('quizzes')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quizId);

    if (toggleErr) {
      console.error('toggleQuizStatus error:', toggleErr);
      return { success: false, error: 'Failed to update quiz status.' };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/quizzes`);
    revalidatePath(`/student/courses/${courseId}`);

    return { success: true };
  } catch (err: any) {
    console.error('toggleQuizStatus exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Delete a quiz
 */
export async function deleteCourseQuiz(
  quizId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const { error: deleteErr } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (deleteErr) {
      console.error('deleteCourseQuiz error:', deleteErr);
      return { success: false, error: 'Failed to delete quiz.' };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/quizzes`);
    revalidatePath(`/student/courses/${courseId}`);

    return { success: true };
  } catch (err: any) {
    console.error('deleteCourseQuiz exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
