'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { CourseInstructorRole, TaskSubmissionStatus, TaskSubmissionType } from '@/types/student';
import { dispatchStudentNotification } from '@/app/student/notifications/actions';

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

export interface TaskOption {
  id: string;
  title: string;
  max_score: number;
  due_date: string | null;
  submission_type: TaskSubmissionType;
  lesson_title?: string | null;
  lesson_number?: number | null;
}

export interface SubmissionItem {
  id: string;
  task_id: string;
  student_id: string;
  submission_link: string | null;
  submission_file_drive_id: string | null;
  score: number | null;
  feedback_comment: string | null;
  status: TaskSubmissionStatus;
  submitted_at: string;
  graded_at: string | null;
  graded_by: string | null;
  task: {
    id: string;
    title: string;
    max_score: number;
    due_date: string | null;
    submission_type: TaskSubmissionType;
    lesson?: {
      id: string;
      lesson_number: number;
      title: string;
    } | null;
  };
  student: {
    id: string;
    full_name_en: string | null;
    full_name_ar: string | null;
    email: string;
    avatar_url: string | null;
    phone: string | null;
    university: string | null;
    department_major: string | null;
  };
  grader?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface CourseSubmissionsResult {
  success: boolean;
  course?: CourseDetailHeader;
  tasks: TaskOption[];
  submissions: SubmissionItem[];
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
 * Check if the current user has permission to review submissions for this course
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
    return { authorized: false, error: 'Forbidden: You do not have permission to review submissions for this course.' };
  }

  return { authorized: true, course, profile, supabase };
}

/**
 * Fetch all tasks and student submissions for a course
 */
export async function getCourseSubmissions(courseId: string): Promise<CourseSubmissionsResult> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, tasks: [], submissions: [], canManage: false, error: access.error };
    }

    const { course, profile, supabase } = access;

    // 1. Fetch tasks for this course
    const { data: tasksData, error: tasksErr } = await supabase
      .from('student_tasks')
      .select(`
        id,
        title,
        max_score,
        due_date,
        submission_type,
        lesson:course_lessons(id, lesson_number, title)
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (tasksErr) {
      console.error('getCourseSubmissions tasksErr:', tasksErr);
    }

    const tasksList: TaskOption[] = (tasksData || []).map((t: any) => {
      const lsn = Array.isArray(t.lesson) ? t.lesson[0] : t.lesson;
      return {
        id: t.id,
        title: t.title,
        max_score: Number(t.max_score) || 100,
        due_date: t.due_date,
        submission_type: t.submission_type,
        lesson_title: lsn?.title || null,
        lesson_number: lsn?.lesson_number || null,
      };
    });

    const taskIds = tasksList.map((t) => t.id);

    // 2. Fetch submissions for these tasks
    let submissionsList: SubmissionItem[] = [];
    if (taskIds.length > 0) {
      const { data: subsData, error: subsErr } = await supabase
        .from('student_task_submissions')
        .select(`
          id,
          task_id,
          student_id,
          submission_link,
          submission_file_drive_id,
          score,
          feedback_comment,
          status,
          submitted_at,
          graded_at,
          graded_by,
          task:student_tasks!student_task_submissions_task_id_fkey(
            id,
            title,
            max_score,
            due_date,
            submission_type,
            lesson:course_lessons(id, lesson_number, title)
          ),
          student:student_profiles!student_task_submissions_student_id_fkey(
            id,
            full_name_en,
            full_name_ar,
            email,
            avatar_url,
            phone,
            university,
            department_major
          ),
          grader:profiles!student_task_submissions_graded_by_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .in('task_id', taskIds)
        .order('submitted_at', { ascending: false });

      if (subsErr) {
        console.error('getCourseSubmissions subsErr:', subsErr);
      }

      submissionsList = (subsData || []).map((s: any) => {
        const t = Array.isArray(s.task) ? s.task[0] : s.task;
        const lsn = t?.lesson ? (Array.isArray(t.lesson) ? t.lesson[0] : t.lesson) : null;
        const stu = Array.isArray(s.student) ? s.student[0] : s.student;
        const grd = Array.isArray(s.grader) ? s.grader[0] : s.grader;

        return {
          id: s.id,
          task_id: s.task_id,
          student_id: s.student_id,
          submission_link: s.submission_link,
          submission_file_drive_id: s.submission_file_drive_id,
          score: s.score !== null && s.score !== undefined ? Number(s.score) : null,
          feedback_comment: s.feedback_comment,
          status: s.status as TaskSubmissionStatus,
          submitted_at: s.submitted_at,
          graded_at: s.graded_at,
          graded_by: s.graded_by,
          task: {
            id: t?.id || s.task_id,
            title: t?.title || 'Task',
            max_score: Number(t?.max_score) || 100,
            due_date: t?.due_date || null,
            submission_type: t?.submission_type || 'link',
            lesson: lsn || null,
          },
          student: {
            id: stu?.id || s.student_id,
            full_name_en: stu?.full_name_en || null,
            full_name_ar: stu?.full_name_ar || null,
            email: stu?.email || 'student@example.com',
            avatar_url: stu?.avatar_url || null,
            phone: stu?.phone || null,
            university: stu?.university || null,
            department_major: stu?.department_major || null,
          },
          grader: grd
            ? {
                id: grd.id,
                full_name: grd.full_name || 'Staff Mentor',
                avatar_url: grd.avatar_url || null,
              }
            : null,
        };
      });
    }

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
      tasks: tasksList,
      submissions: submissionsList,
      canManage: true,
      userRole: profile.role,
    };
  } catch (err: any) {
    console.error('getCourseSubmissions exception:', err);
    return {
      success: false,
      tasks: [],
      submissions: [],
      canManage: false,
      error: err.message || 'Failed to load task submissions.',
    };
  }
}

/**
 * Grade and provide feedback on a student submission
 */
export async function gradeStudentSubmission(payload: {
  submissionId: string;
  courseId: string;
  score: number;
  feedbackComment: string;
  status: TaskSubmissionStatus;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const access = await verifyCourseAccess(payload.courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { profile, supabase } = access;

    const { data: updatedSub, error: updateErr } = await supabase
      .from('student_task_submissions')
      .update({
        score: payload.score,
        feedback_comment: payload.feedbackComment.trim() || null,
        status: payload.status,
        graded_at: new Date().toISOString(),
        graded_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.submissionId)
      .select('id, task_id, student_id')
      .single();

    if (updateErr) {
      console.error('gradeStudentSubmission updateErr:', updateErr);
      return { success: false, error: 'Failed to record grading. Please try again.' };
    }

    // Notify student in English
    if (updatedSub?.student_id) {
      const { data: taskData } = await supabase
        .from('student_tasks')
        .select('title, max_score')
        .eq('id', updatedSub.task_id)
        .maybeSingle();

      const taskTitle = taskData?.title || 'Assignment Deliverable';
      const maxScore = taskData?.max_score || 10;
      const cleanFeedback = payload.feedbackComment.trim();

      if (payload.status === 'needs_revision') {
        dispatchStudentNotification({
          studentId: updatedSub.student_id,
          type: 'task',
          title: `Revision Requested: ${taskTitle}`,
          message: cleanFeedback
            ? `Your mentor reviewed your submission for "${taskTitle}" and requested changes. Mentor feedback: "${cleanFeedback}". Please update and resubmit your deliverable.`
            : `Your mentor reviewed your submission for "${taskTitle}" and requested changes. Please check the feedback on your course page and resubmit your deliverable.`,
          linkUrl: `/student/courses/${payload.courseId}`,
          relatedEntityType: 'task',
          relatedEntityId: updatedSub.task_id,
        }).catch((notifErr) => console.warn('dispatchStudentNotification revision warning:', notifErr));
      } else {
        dispatchStudentNotification({
          studentId: updatedSub.student_id,
          type: 'task',
          title: `Task Graded: ${taskTitle}`,
          message: cleanFeedback
            ? `Your submission for "${taskTitle}" has been graded. Score: ${payload.score}/${maxScore}. Feedback: "${cleanFeedback}".`
            : `Your submission for "${taskTitle}" has been graded. Score: ${payload.score}/${maxScore}. Keep up the great work!`,
          linkUrl: `/student/courses/${payload.courseId}`,
          relatedEntityType: 'task',
          relatedEntityId: updatedSub.task_id,
        }).catch((notifErr) => console.warn('dispatchStudentNotification graded warning:', notifErr));
      }
    }

    revalidatePath(`/student-portal/admin/courses/${payload.courseId}/submissions`);
    revalidatePath(`/student-portal/admin/courses/${payload.courseId}/tasks`);
    revalidatePath(`/student/courses/${payload.courseId}`);

    return {
      success: true,
      message:
        payload.status === 'needs_revision'
          ? 'Submission flagged for student revision with feedback.'
          : 'Submission graded and student notified successfully!',
    };
  } catch (err: any) {
    console.error('gradeStudentSubmission exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
