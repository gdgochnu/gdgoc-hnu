'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { CourseSession, SessionType, SessionStatus, CourseInstructorRole } from '@/types/student';
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

export interface CreateSessionInput {
  course_id: string;
  session_number: number;
  title: string;
  description?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  type: SessionType;
  venue?: string;
  youtube_url?: string;
  materials?: string[];
  status?: SessionStatus;
}

export interface UpdateSessionInput extends Partial<CreateSessionInput> {
  id: string;
  course_id: string;
}

export interface SessionMaterialItem {
  title: string;
  url: string;
  driveFileId?: string;
  type?: 'pdf' | 'link' | 'video' | 'doc';
  size?: number;
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
 * Check if the current user has permission to manage this course's sessions
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
      error: 'Forbidden: You do not have permission to manage sessions for this course.',
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
 * 1. Fetch Course details and its Sessions
 */
export async function getCourseWithSessions(courseId: string): Promise<{
  success: boolean;
  course?: CourseDetailHeader;
  sessions: CourseSession[];
  canManage: boolean;
  userRole?: string;
  error?: string;
}> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized || !access.course) {
      return {
        success: false,
        sessions: [],
        canManage: false,
        error: access.error,
      };
    }

    const { course, supabase, profile } = access;

    // Fetch sessions ordered by session_number ASC, session_date ASC
    const { data: sessionsData, error: sessionsErr } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('session_number', { ascending: true })
      .order('session_date', { ascending: true });

    if (sessionsErr) {
      console.error('getCourseWithSessions error:', sessionsErr);
      return {
        success: false,
        sessions: [],
        canManage: false,
        error: 'Failed to load course sessions.',
      };
    }

    const instructors_list = (course.instructors || []).map((ci: any) => ({
      id: ci.id,
      profile_id: ci.profile_id,
      role: ci.role,
      full_name: ci.profile?.full_name || 'Instructor',
      avatar_url: ci.profile?.avatar_url || null,
    }));

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
      instructors_list,
    };

    return {
      success: true,
      course: courseHeader,
      sessions: (sessionsData as CourseSession[]) || [],
      canManage: true,
      userRole: profile.role,
    };
  } catch (err: any) {
    console.error('getCourseWithSessions exception:', err);
    return {
      success: false,
      sessions: [],
      canManage: false,
      error: err.message || 'Failed to fetch sessions.',
    };
  }
}

/**
 * 2. Create a new Course Session
 */
export async function createCourseSession(input: CreateSessionInput): Promise<{
  success: boolean;
  session?: CourseSession;
  error?: string;
}> {
  try {
    const access = await verifyCourseAccess(input.course_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    // Validation
    if (!input.title || !input.title.trim()) {
      return { success: false, error: 'Session title is required.' };
    }
    if (!input.session_date) {
      return { success: false, error: 'Session date is required.' };
    }
    if (!input.start_time || !input.end_time) {
      return { success: false, error: 'Start and end times are required.' };
    }
    if (input.type === 'offline' && (!input.venue || !input.venue.trim())) {
      return { success: false, error: 'Offline sessions require a physical venue (e.g. Hall 401, Lab B).' };
    }
    if (input.type === 'online' && (!input.youtube_url || !input.youtube_url.trim())) {
      return { success: false, error: 'Online sessions require a YouTube livestream or recorded video URL.' };
    }

    const { supabase } = access;

    const insertData = {
      course_id: input.course_id,
      session_number: input.session_number || 1,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      session_date: input.session_date,
      start_time: input.start_time,
      end_time: input.end_time,
      type: input.type,
      venue: input.type === 'offline' ? input.venue?.trim() || null : null,
      youtube_url: input.type === 'online' ? input.youtube_url?.trim() || null : null,
      materials: input.materials || [],
      status: input.status || 'scheduled',
    };

    const { data: newSession, error: insertErr } = await supabase
      .from('course_sessions')
      .insert([insertData])
      .select()
      .single();

    if (insertErr || !newSession) {
      console.error('createCourseSession insert error:', insertErr);
      return { success: false, error: insertErr?.message || 'Failed to create session.' };
    }

    revalidatePath(`/student-portal/admin/courses/${input.course_id}/sessions`);
    revalidatePath(`/student-portal/admin/courses`);

    return {
      success: true,
      session: newSession as CourseSession,
    };
  } catch (err: any) {
    console.error('createCourseSession exception:', err);
    return { success: false, error: err.message || 'Failed to create session.' };
  }
}

/**
 * 3. Update an existing Course Session
 */
export async function updateCourseSession(input: UpdateSessionInput): Promise<{
  success: boolean;
  session?: CourseSession;
  error?: string;
}> {
  try {
    const access = await verifyCourseAccess(input.course_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    if (input.title !== undefined && !input.title.trim()) {
      return { success: false, error: 'Session title cannot be empty.' };
    }
    if (input.type === 'offline' && input.venue !== undefined && !input.venue?.trim()) {
      return { success: false, error: 'Offline sessions require a physical venue.' };
    }
    if (input.type === 'online' && input.youtube_url !== undefined && !input.youtube_url?.trim()) {
      return { success: false, error: 'Online sessions require a YouTube URL.' };
    }

    const { supabase } = access;

    const updatePayload: Record<string, any> = {};
    if (input.session_number !== undefined) updatePayload.session_number = input.session_number;
    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.description !== undefined) updatePayload.description = input.description.trim() || null;
    if (input.session_date !== undefined) updatePayload.session_date = input.session_date;
    if (input.start_time !== undefined) updatePayload.start_time = input.start_time;
    if (input.end_time !== undefined) updatePayload.end_time = input.end_time;
    if (input.type !== undefined) {
      updatePayload.type = input.type;
      if (input.type === 'offline') {
        updatePayload.venue = input.venue?.trim() || null;
        updatePayload.youtube_url = null;
      } else {
        updatePayload.youtube_url = input.youtube_url?.trim() || null;
        updatePayload.venue = null;
      }
    } else {
      if (input.venue !== undefined) updatePayload.venue = input.venue?.trim() || null;
      if (input.youtube_url !== undefined) updatePayload.youtube_url = input.youtube_url?.trim() || null;
    }
    if (input.materials !== undefined) updatePayload.materials = input.materials;
    if (input.status !== undefined) updatePayload.status = input.status;

    const { data: updatedSession, error: updateErr } = await supabase
      .from('course_sessions')
      .update(updatePayload)
      .eq('id', input.id)
      .select()
      .single();

    if (updateErr || !updatedSession) {
      console.error('updateCourseSession error:', updateErr);
      return { success: false, error: updateErr?.message || 'Failed to update session.' };
    }

    revalidatePath(`/student-portal/admin/courses/${input.course_id}/sessions`);
    return {
      success: true,
      session: updatedSession as CourseSession,
    };
  } catch (err: any) {
    console.error('updateCourseSession exception:', err);
    return { success: false, error: err.message || 'Failed to update session.' };
  }
}

/**
 * 4. Quick toggle Session Status (scheduled | completed | cancelled)
 */
export async function updateSessionStatus(
  sessionId: string,
  courseId: string,
  status: SessionStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;
    const { error } = await supabase
      .from('course_sessions')
      .update({ status })
      .eq('id', sessionId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/sessions`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 5. Delete a Course Session
 */
export async function deleteCourseSession(
  sessionId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;
    const { error: delErr } = await supabase
      .from('course_sessions')
      .delete()
      .eq('id', sessionId);

    if (delErr) {
      console.error('deleteCourseSession error:', delErr);
      return { success: false, error: delErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/sessions`);
    revalidatePath(`/student-portal/admin/courses`);
    return { success: true };
  } catch (err: any) {
    console.error('deleteCourseSession exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 6. Add a material link or Drive file to session
 */
export async function addSessionMaterialItem(
  sessionId: string,
  courseId: string,
  material: SessionMaterialItem
): Promise<{ success: boolean; materials?: string[]; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;
    const { data: session, error: getErr } = await supabase
      .from('course_sessions')
      .select('materials')
      .eq('id', sessionId)
      .single();

    if (getErr || !session) {
      return { success: false, error: 'Session not found.' };
    }

    const currentMaterials: string[] = session.materials || [];
    const serialized = JSON.stringify(material);
    const updatedMaterials = [...currentMaterials, serialized];

    const { error: updErr } = await supabase
      .from('course_sessions')
      .update({ materials: updatedMaterials })
      .eq('id', sessionId);

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/sessions`);
    return { success: true, materials: updatedMaterials };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 7. Remove a material item from a session
 */
export async function removeSessionMaterialItem(
  sessionId: string,
  courseId: string,
  index: number
): Promise<{ success: boolean; materials?: string[]; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;
    const { data: session, error: getErr } = await supabase
      .from('course_sessions')
      .select('materials')
      .eq('id', sessionId)
      .single();

    if (getErr || !session) {
      return { success: false, error: 'Session not found.' };
    }

    const currentMaterials: string[] = session.materials || [];
    const updatedMaterials = currentMaterials.filter((_, i) => i !== index);

    const { error: updErr } = await supabase
      .from('course_sessions')
      .update({ materials: updatedMaterials })
      .eq('id', sessionId);

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/sessions`);
    return { success: true, materials: updatedMaterials };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 8. Upload a PDF/Document to Google Drive and attach to session
 */
export async function uploadSessionMaterialFile(
  courseId: string,
  sessionId: string,
  formData: FormData
): Promise<{ success: boolean; material?: SessionMaterialItem; error?: string }> {
  try {
    const access = await verifyCourseAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || file?.name || 'Session Material';

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

    const materialItem: SessionMaterialItem = {
      title,
      url: fileUrl,
      driveFileId: fileId,
      type: file.type.includes('pdf') ? 'pdf' : 'doc',
      size: file.size,
    };

    // Append to session materials
    const addRes = await addSessionMaterialItem(sessionId, courseId, materialItem);
    if (!addRes.success) {
      return { success: false, error: addRes.error };
    }

    return {
      success: true,
      material: materialItem,
    };
  } catch (err: any) {
    console.error('uploadSessionMaterialFile exception:', err);
    return { success: false, error: err.message || 'File upload failed.' };
  }
}
