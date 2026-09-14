'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { CourseLesson, CourseSession, StudentTask, Quiz, CourseInstructorRole } from '@/types/student';
import { callDriveBridge } from '@/lib/drive/drive-client';

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

export interface LessonMaterialItem {
  title: string;
  url: string;
  driveFileId?: string;
  type?: 'pdf' | 'link' | 'video' | 'doc';
  size?: number;
}

export interface CourseLessonItem extends Omit<CourseLesson, 'session'> {
  session?: {
    id: string;
    session_number: number;
    title: string;
    session_date: string;
  } | null;
  tasks?: any[];
  quizzes?: any[];
  tasks_count: number;
  quizzes_count: number;
}

export interface CreateLessonInput {
  course_id: string;
  lesson_number: number;
  title: string;
  content: string;
  session_id?: string | null;
  youtube_url?: string | null;
  materials?: string[];
}

export interface UpdateLessonInput extends Partial<CreateLessonInput> {
  id: string;
  course_id: string;
}

export interface CreateLessonTaskInput {
  course_id: string;
  lesson_id: string;
  title: string;
  description: string;
  due_date?: string | null;
  submission_type: 'link' | 'file' | 'both';
  max_score: number;
  assigned_to: 'all_enrolled' | 'specific';
}

export interface CreateLessonQuizInput {
  course_id: string;
  lesson_id: string;
  title: string;
  description: string;
  time_limit_minutes?: number | null;
  passing_score_percentage: number;
  questions: any[];
  allow_retakes: boolean;
  max_attempts: number;
  status: 'draft' | 'published';
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
 * Check if the current user has permission to manage this course's curriculum & lessons
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
      error: 'Forbidden: You do not have permission to manage lessons for this course.',
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
 * 1. Fetch Course details, available Sessions for dropdown, and all Lessons with attached Tasks & Quizzes
 */
export async function getCourseWithLessons(courseId: string): Promise<{
  success: boolean;
  course?: CourseDetailHeader;
  availableSessions: Array<{ id: string; session_number: number; title: string; session_date: string }>;
  lessons: CourseLessonItem[];
  canManage: boolean;
  userRole?: string;
  error?: string;
}> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized || !access.course) {
      return {
        success: false,
        availableSessions: [],
        lessons: [],
        canManage: false,
        error: access.error,
      };
    }

    const { course, profile, supabase } = access;

    // Fetch Course Sessions for dropdown
    const { data: sessionsRows } = await supabase
      .from('course_sessions')
      .select('id, session_number, title, session_date')
      .eq('course_id', courseId)
      .order('session_number', { ascending: true });

    const availableSessions = (sessionsRows || []).map((s: any) => ({
      id: s.id,
      session_number: s.session_number,
      title: s.title,
      session_date: s.session_date,
    }));

    // Fetch Course Lessons
    const { data: lessonsRows, error: lessonsErr } = await supabase
      .from('course_lessons')
      .select(`
        id,
        course_id,
        session_id,
        lesson_number,
        title,
        content,
        youtube_url,
        materials,
        created_by,
        created_at,
        updated_at,
        session:course_sessions(id, session_number, title, session_date)
      `)
      .eq('course_id', courseId)
      .order('lesson_number', { ascending: true });

    if (lessonsErr) {
      console.error('getCourseWithLessons query error:', lessonsErr);
    }

    // Fetch Tasks for this course to link to lessons
    const { data: tasksRows } = await supabase
      .from('student_tasks')
      .select('id, course_id, lesson_id, title, due_date, max_score, submission_type, status')
      .eq('course_id', courseId);

    // Fetch Quizzes for this course to link to lessons
    const { data: quizzesRows } = await supabase
      .from('quizzes')
      .select('id, course_id, lesson_id, title, time_limit_minutes, passing_score_percentage, status, questions')
      .eq('course_id', courseId);

    const lessonsList: CourseLessonItem[] = (lessonsRows || []).map((row: any) => {
      const lessonTasks = (tasksRows || []).filter((t: any) => t.lesson_id === row.id);
      const lessonQuizzes = (quizzesRows || []).filter((q: any) => q.lesson_id === row.id);

      return {
        id: row.id,
        course_id: row.course_id,
        session_id: row.session_id,
        lesson_number: row.lesson_number,
        title: row.title,
        content: row.content || '',
        youtube_url: row.youtube_url || null,
        materials: row.materials || [],
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        session: Array.isArray(row.session) ? row.session[0] : row.session || null,
        tasks: lessonTasks,
        quizzes: lessonQuizzes,
        tasks_count: lessonTasks.length,
        quizzes_count: lessonQuizzes.length,
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
      availableSessions,
      lessons: lessonsList,
      canManage: true,
      userRole: profile.role,
    };
  } catch (err: any) {
    console.error('getCourseWithLessons catch:', err);
    return {
      success: false,
      availableSessions: [],
      lessons: [],
      canManage: false,
      error: err.message || 'Failed to fetch course lessons.',
    };
  }
}

/**
 * 2. Create a new Course Lesson
 */
export async function createCourseLesson(
  input: CreateLessonInput
): Promise<{ success: boolean; lesson?: CourseLessonItem; error?: string }> {
  try {
    const access = await verifyCourseAccess(input.course_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { profile, supabase } = access;

    const { data: newRow, error: insertErr } = await supabase
      .from('course_lessons')
      .insert({
        course_id: input.course_id,
        lesson_number: input.lesson_number,
        title: input.title.trim(),
        content: input.content || '',
        session_id: input.session_id || null,
        youtube_url: input.youtube_url?.trim() || null,
        materials: input.materials || [],
        created_by: profile.id,
      })
      .select(`
        id,
        course_id,
        session_id,
        lesson_number,
        title,
        content,
        youtube_url,
        materials,
        created_by,
        created_at,
        updated_at,
        session:course_sessions(id, session_number, title, session_date)
      `)
      .single();

    if (insertErr || !newRow) {
      return { success: false, error: insertErr?.message || 'Failed to insert lesson.' };
    }

    revalidatePath(`/student-portal/admin/courses/${input.course_id}/lessons`);
    revalidatePath(`/student/courses/${input.course_id}`);

    const sessionObj = Array.isArray(newRow.session) ? newRow.session[0] : newRow.session;
    const formatted: CourseLessonItem = {
      ...newRow,
      session: sessionObj || null,
      tasks: [],
      quizzes: [],
      tasks_count: 0,
      quizzes_count: 0,
    };

    return { success: true, lesson: formatted };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 3. Update an existing Course Lesson
 */
export async function updateCourseLesson(
  input: UpdateLessonInput
): Promise<{ success: boolean; lesson?: CourseLessonItem; error?: string }> {
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
    if (input.content !== undefined) updatePayload.content = input.content;
    if (input.lesson_number !== undefined) updatePayload.lesson_number = input.lesson_number;
    if (input.session_id !== undefined) updatePayload.session_id = input.session_id || null;
    if (input.youtube_url !== undefined) updatePayload.youtube_url = input.youtube_url?.trim() || null;
    if (input.materials !== undefined) updatePayload.materials = input.materials;

    const { data: updatedRow, error: updErr } = await supabase
      .from('course_lessons')
      .update(updatePayload)
      .eq('id', input.id)
      .eq('course_id', input.course_id)
      .select(`
        id,
        course_id,
        session_id,
        lesson_number,
        title,
        content,
        youtube_url,
        materials,
        created_by,
        created_at,
        updated_at,
        session:course_sessions(id, session_number, title, session_date)
      `)
      .single();

    if (updErr || !updatedRow) {
      return { success: false, error: updErr?.message || 'Failed to update lesson.' };
    }

    revalidatePath(`/student-portal/admin/courses/${input.course_id}/lessons`);
    revalidatePath(`/student/courses/${input.course_id}`);

    const sessionObj = Array.isArray(updatedRow.session) ? updatedRow.session[0] : updatedRow.session;
    return {
      success: true,
      lesson: {
        ...updatedRow,
        session: sessionObj || null,
        tasks_count: 0,
        quizzes_count: 0,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 4. Delete a Course Lesson
 */
export async function deleteCourseLesson(
  lessonId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;
    const { error: delErr } = await supabase
      .from('course_lessons')
      .delete()
      .eq('id', lessonId)
      .eq('course_id', courseId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/lessons`);
    revalidatePath(`/student/courses/${courseId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 5. Reorder Course Lessons (batch update lesson_number)
 */
export async function reorderCourseLessons(
  courseId: string,
  lessonIdsInOrder: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    for (let index = 0; index < lessonIdsInOrder.length; index++) {
      const lessonId = lessonIdsInOrder[index];
      const lessonNumber = index + 1;
      await supabase
        .from('course_lessons')
        .update({ lesson_number: lessonNumber, updated_at: new Date().toISOString() })
        .eq('id', lessonId)
        .eq('course_id', courseId);
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/lessons`);
    revalidatePath(`/student/courses/${courseId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 6. Quick create an attached Student Task for a Lesson
 */
export async function quickCreateTaskForLesson(
  input: CreateLessonTaskInput
): Promise<{ success: boolean; task?: StudentTask; error?: string }> {
  try {
    const access = await verifyCourseAccess(input.course_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { profile, supabase } = access;

    const { data: newTask, error: taskErr } = await supabase
      .from('student_tasks')
      .insert({
        course_id: input.course_id,
        lesson_id: input.lesson_id,
        title: input.title.trim(),
        description: input.description.trim(),
        due_date: input.due_date || null,
        submission_type: input.submission_type,
        max_score: input.max_score || 100,
        assigned_to: input.assigned_to || 'all_enrolled',
        status: 'active',
        created_by: profile.id,
      })
      .select()
      .single();

    if (taskErr || !newTask) {
      return { success: false, error: taskErr?.message || 'Failed to create task.' };
    }

    revalidatePath(`/student-portal/admin/courses/${input.course_id}/lessons`);
    return { success: true, task: newTask };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 7. Quick create an attached Quiz for a Lesson
 */
export async function quickCreateQuizForLesson(
  input: CreateLessonQuizInput
): Promise<{ success: boolean; quiz?: Quiz; error?: string }> {
  try {
    const access = await verifyCourseAccess(input.course_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { profile, supabase } = access;

    const { data: newQuiz, error: quizErr } = await supabase
      .from('quizzes')
      .insert({
        course_id: input.course_id,
        lesson_id: input.lesson_id,
        title: input.title.trim(),
        description: input.description.trim(),
        time_limit_minutes: input.time_limit_minutes || null,
        passing_score_percentage: input.passing_score_percentage || 60,
        questions: input.questions || [],
        allow_retakes: input.allow_retakes || false,
        max_attempts: input.max_attempts || 1,
        status: input.status || 'draft',
        created_by: profile.id,
      })
      .select()
      .single();

    if (quizErr || !newQuiz) {
      return { success: false, error: quizErr?.message || 'Failed to create quiz.' };
    }

    revalidatePath(`/student-portal/admin/courses/${input.course_id}/lessons`);
    return { success: true, quiz: newQuiz };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 8. Add a material link to a Lesson
 */
export async function addLessonMaterialItem(
  courseId: string,
  lessonId: string,
  material: LessonMaterialItem
): Promise<{ success: boolean; materials?: string[]; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;
    const { data: lesson, error: getErr } = await supabase
      .from('course_lessons')
      .select('materials')
      .eq('id', lessonId)
      .single();

    if (getErr || !lesson) {
      return { success: false, error: 'Lesson not found.' };
    }

    const currentMaterials: string[] = lesson.materials || [];
    const serialized = JSON.stringify(material);
    const updatedMaterials = [...currentMaterials, serialized];

    const { error: updErr } = await supabase
      .from('course_lessons')
      .update({ materials: updatedMaterials, updated_at: new Date().toISOString() })
      .eq('id', lessonId);

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/lessons`);
    return { success: true, materials: updatedMaterials };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 9. Remove a material item from a Lesson
 */
export async function removeLessonMaterialItem(
  courseId: string,
  lessonId: string,
  index: number
): Promise<{ success: boolean; materials?: string[]; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;
    const { data: lesson, error: getErr } = await supabase
      .from('course_lessons')
      .select('materials')
      .eq('id', lessonId)
      .single();

    if (getErr || !lesson) {
      return { success: false, error: 'Lesson not found.' };
    }

    const currentMaterials: string[] = lesson.materials || [];
    const updatedMaterials = currentMaterials.filter((_, i) => i !== index);

    const { error: updErr } = await supabase
      .from('course_lessons')
      .update({ materials: updatedMaterials, updated_at: new Date().toISOString() })
      .eq('id', lessonId);

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/lessons`);
    return { success: true, materials: updatedMaterials };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 10. Upload a PDF/Document to Google Drive and attach to a Lesson
 */
export async function uploadLessonMaterialFile(
  courseId: string,
  lessonId: string,
  formData: FormData
): Promise<{ success: boolean; material?: LessonMaterialItem; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || file?.name || 'Lesson Material';

    if (!file) {
      return { success: false, error: 'No file provided.' };
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    // Upload via Google Drive Bridge
    const driveRes = await callDriveBridge<{ fileId: string; fileUrl: string; downloadUrl: string }>(
      'uploadFile',
      {
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        base64Data,
      }
    );

    const fileId = driveRes.data?.fileId || driveRes.fileId || `mock-file-${Date.now()}`;
    const fileUrl = driveRes.data?.fileUrl || driveRes.fileUrl || `https://drive.google.com/file/d/${fileId}/view`;

    const materialItem: LessonMaterialItem = {
      title,
      url: fileUrl,
      driveFileId: fileId,
      type: file.type?.includes('pdf') ? 'pdf' : 'doc',
      size: file.size,
    };

    const addRes = await addLessonMaterialItem(courseId, lessonId, materialItem);
    if (!addRes.success) {
      return { success: false, error: addRes.error };
    }

    return { success: true, material: materialItem };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
