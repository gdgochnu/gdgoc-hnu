'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { StudentTask, TaskStatus, TaskSubmissionType, TaskAssignedScope, CourseInstructorRole } from '@/types/student';

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

export interface TaskLessonOption {
  id: string;
  lesson_number: number;
  title: string;
}

export interface EnrolledStudentOption {
  id: string; // student_profiles.id
  full_name_en: string | null;
  full_name_ar: string | null;
  email: string;
  avatar_url: string | null;
}

export interface CourseTaskItem extends Omit<StudentTask, 'lesson'> {
  lesson?: {
    id: string;
    lesson_number: number;
    title: string;
  } | null;
  submissions_count: number;
  graded_count: number;
  pending_count: number;
  total_eligible_students: number;
}

export interface CreateTaskInput {
  course_id: string;
  lesson_id?: string | null;
  title: string;
  description: string;
  due_date?: string | null;
  submission_type: TaskSubmissionType;
  max_score: number;
  assigned_to: TaskAssignedScope;
  specific_student_ids?: string[];
  status?: TaskStatus;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  course_id: string;
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
 * Check if the current user has permission to manage tasks for this course
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
        profile_id,
        role,
        profile:profiles!course_instructors_profile_id_fkey(id, full_name, avatar_url)
      )
    `)
    .eq('id', courseId)
    .single();

  if (courseErr || !course) {
    return { authorized: false, error: 'Course not found.' };
  }

  const role = profile.role;
  const isPresident = role === 'president' || role === 'co_president';
  const isOwningHead =
    (role === 'committee_head' || role === 'committee_co_head') &&
    profile.department_id === course.department_id;

  const isAssignedInstructor = (course.instructors || []).some(
    (ci: any) => ci.profile_id === profile.id
  );

  if (!isPresident && !isOwningHead && !isAssignedInstructor) {
    return {
      authorized: false,
      error: 'Forbidden: You do not have permission to manage tasks for this course.',
    };
  }

  return {
    authorized: true,
    course,
    profile,
    supabase,
  };
}

/**
 * 1. Fetch Course details, available lessons, enrolled students, and all course tasks with submission metrics
 */
export async function getCourseWithTasks(courseId: string): Promise<{
  success: boolean;
  course?: CourseDetailHeader;
  availableLessons: TaskLessonOption[];
  enrolledStudents: EnrolledStudentOption[];
  tasks: CourseTaskItem[];
  canManage: boolean;
  userRole?: string;
  error?: string;
}> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized || !access.course) {
      return {
        success: false,
        availableLessons: [],
        enrolledStudents: [],
        tasks: [],
        canManage: false,
        error: access.error,
      };
    }

    const { course, profile, supabase } = access;

    // Fetch Course Lessons for dropdown linking
    const { data: lessonsRows } = await supabase
      .from('course_lessons')
      .select('id, lesson_number, title')
      .eq('course_id', courseId)
      .order('lesson_number', { ascending: true });

    const availableLessons: TaskLessonOption[] = (lessonsRows || []).map((l: any) => ({
      id: l.id,
      lesson_number: l.lesson_number,
      title: l.title,
    }));

    // Fetch Confirmed Enrolled Students for specific targeting
    const { data: enrolledRows } = await supabase
      .from('course_enrollments')
      .select(`
        student_id,
        student:student_profiles(id, full_name_en, full_name_ar, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .eq('status', 'confirmed');

    const enrolledStudents: EnrolledStudentOption[] = (enrolledRows || [])
      .filter((row: any) => row.student)
      .map((row: any) => ({
        id: row.student.id,
        full_name_en: row.student.full_name_en,
        full_name_ar: row.student.full_name_ar,
        email: row.student.email,
        avatar_url: row.student.avatar_url,
      }));

    const totalConfirmedStudents = enrolledStudents.length;

    // Fetch Tasks for this course
    const { data: tasksRows, error: tasksErr } = await supabase
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
        created_by,
        created_at,
        updated_at,
        lesson:course_lessons(id, lesson_number, title)
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (tasksErr) {
      console.error('getCourseWithTasks query error:', tasksErr);
    }

    // Fetch Submissions count for all tasks of this course
    const taskIds = (tasksRows || []).map((t: any) => t.id);
    let submissionsByTaskId: Record<string, { total: number; graded: number; pending: number }> = {};

    if (taskIds.length > 0) {
      const { data: submissionsRows } = await supabase
        .from('student_task_submissions')
        .select('task_id, status')
        .in('task_id', taskIds);

      (submissionsRows || []).forEach((sub: any) => {
        if (!submissionsByTaskId[sub.task_id]) {
          submissionsByTaskId[sub.task_id] = { total: 0, graded: 0, pending: 0 };
        }
        submissionsByTaskId[sub.task_id].total += 1;
        if (sub.status === 'graded' || sub.status === 'final') {
          submissionsByTaskId[sub.task_id].graded += 1;
        } else {
          submissionsByTaskId[sub.task_id].pending += 1;
        }
      });
    }

    const tasksList: CourseTaskItem[] = (tasksRows || []).map((row: any) => {
      const subMetrics = submissionsByTaskId[row.id] || { total: 0, graded: 0, pending: 0 };
      const eligibleCount =
        row.assigned_to === 'specific' && Array.isArray(row.specific_student_ids)
          ? row.specific_student_ids.length
          : totalConfirmedStudents;

      const lessonObj = Array.isArray(row.lesson) ? row.lesson[0] : row.lesson;

      return {
        id: row.id,
        course_id: row.course_id,
        workshop_id: row.workshop_id,
        lesson_id: row.lesson_id,
        title: row.title,
        description: row.description || '',
        due_date: row.due_date,
        submission_type: row.submission_type,
        max_score: Number(row.max_score) || 100,
        assigned_to: row.assigned_to,
        specific_student_ids: row.specific_student_ids || [],
        status: row.status,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        lesson: lessonObj || null,
        submissions_count: subMetrics.total,
        graded_count: subMetrics.graded,
        pending_count: subMetrics.pending,
        total_eligible_students: eligibleCount,
      };
    });

    const header: CourseDetailHeader = {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      department_id: course.department_id,
      department_name: course.department?.name,
      department_code: course.department?.code,
      cover_image_url: course.cover_image_url,
      status: course.status,
      enrollment_type: course.enrollment_type,
      instructors_list: (course.instructors || []).map((ci: any) => ({
        id: ci.id,
        profile_id: ci.profile_id,
        role: ci.role,
        full_name: ci.profile?.full_name || 'Instructor',
        avatar_url: ci.profile?.avatar_url || null,
      })),
    };

    return {
      success: true,
      course: header,
      availableLessons,
      enrolledStudents,
      tasks: tasksList,
      canManage: true,
      userRole: profile.role,
    };
  } catch (err: any) {
    console.error('getCourseWithTasks catch:', err);
    return {
      success: false,
      availableLessons: [],
      enrolledStudents: [],
      tasks: [],
      canManage: false,
      error: err.message || 'Failed to fetch course tasks.',
    };
  }
}

/**
 * 2. Create a new Course Task
 */
export async function createCourseTask(
  input: CreateTaskInput
): Promise<{ success: boolean; task?: CourseTaskItem; error?: string }> {
  try {
    const access = await verifyCourseAccess(input.course_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { profile, supabase } = access;

    const { data: newTask, error: insertErr } = await supabase
      .from('student_tasks')
      .insert({
        course_id: input.course_id,
        lesson_id: input.lesson_id || null,
        title: input.title.trim(),
        description: input.description.trim(),
        due_date: input.due_date || null,
        submission_type: input.submission_type || 'link',
        max_score: input.max_score || 100,
        assigned_to: input.assigned_to || 'all_enrolled',
        specific_student_ids: input.specific_student_ids || [],
        status: input.status || 'active',
        created_by: profile.id,
      })
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
        created_by,
        created_at,
        updated_at,
        lesson:course_lessons(id, lesson_number, title)
      `)
      .single();

    if (insertErr || !newTask) {
      return { success: false, error: insertErr?.message || 'Failed to create task.' };
    }

    revalidatePath(`/student-portal/admin/courses/${input.course_id}/tasks`);
    revalidatePath(`/student-portal/admin/courses/${input.course_id}/lessons`);
    revalidatePath(`/student/courses/${input.course_id}`);

    const lessonObj = Array.isArray(newTask.lesson) ? newTask.lesson[0] : newTask.lesson;

    const formatted: CourseTaskItem = {
      ...newTask,
      max_score: Number(newTask.max_score) || 100,
      lesson: lessonObj || null,
      submissions_count: 0,
      graded_count: 0,
      pending_count: 0,
      total_eligible_students: input.assigned_to === 'specific' ? (input.specific_student_ids || []).length : 0,
    };

    return { success: true, task: formatted };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 3. Update an existing Course Task
 */
export async function updateCourseTask(
  input: UpdateTaskInput
): Promise<{ success: boolean; task?: CourseTaskItem; error?: string }> {
  try {
    const access = await verifyCourseAccess(input.course_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.description !== undefined) updatePayload.description = input.description.trim();
    if (input.due_date !== undefined) updatePayload.due_date = input.due_date;
    if (input.submission_type !== undefined) updatePayload.submission_type = input.submission_type;
    if (input.max_score !== undefined) updatePayload.max_score = input.max_score;
    if (input.assigned_to !== undefined) updatePayload.assigned_to = input.assigned_to;
    if (input.specific_student_ids !== undefined) updatePayload.specific_student_ids = input.specific_student_ids;
    if (input.lesson_id !== undefined) updatePayload.lesson_id = input.lesson_id || null;
    if (input.status !== undefined) updatePayload.status = input.status;

    const { data: updatedTask, error: updErr } = await supabase
      .from('student_tasks')
      .update(updatePayload)
      .eq('id', input.id)
      .eq('course_id', input.course_id)
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
        created_by,
        created_at,
        updated_at,
        lesson:course_lessons(id, lesson_number, title)
      `)
      .single();

    if (updErr || !updatedTask) {
      return { success: false, error: updErr?.message || 'Failed to update task.' };
    }

    revalidatePath(`/student-portal/admin/courses/${input.course_id}/tasks`);
    revalidatePath(`/student-portal/admin/courses/${input.course_id}/lessons`);
    revalidatePath(`/student/courses/${input.course_id}`);

    const lessonObj = Array.isArray(updatedTask.lesson) ? updatedTask.lesson[0] : updatedTask.lesson;

    const formatted: CourseTaskItem = {
      ...updatedTask,
      max_score: Number(updatedTask.max_score) || 100,
      lesson: lessonObj || null,
      submissions_count: 0,
      graded_count: 0,
      pending_count: 0,
      total_eligible_students: 0,
    };

    return { success: true, task: formatted };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 4. Delete a Course Task
 */
export async function deleteCourseTask(
  taskId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;
    const { error: delErr } = await supabase
      .from('student_tasks')
      .delete()
      .eq('id', taskId)
      .eq('course_id', courseId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/tasks`);
    revalidatePath(`/student-portal/admin/courses/${courseId}/lessons`);
    revalidatePath(`/student/courses/${courseId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 5. Update Task Status (Active / Closed / Draft)
 */
export async function updateTaskStatus(
  taskId: string,
  courseId: string,
  newStatus: TaskStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;
    const { error: updErr } = await supabase
      .from('student_tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('course_id', courseId);

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/tasks`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
