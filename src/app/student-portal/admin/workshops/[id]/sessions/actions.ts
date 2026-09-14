'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { WorkshopSession, SessionType, SessionStatus, CourseInstructorRole } from '@/types/student';
import { callDriveBridge } from '@/lib/drive/drive-client';

export interface WorkshopDetailHeader {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  department_id: string | null;
  department_name?: string;
  department_code?: string;
  cover_image_url: string | null;
  status: string;
  capacity: number | null;
  registration_open: boolean;
  registration_deadline: string | null;
  instructors_list: Array<{
    id: string;
    profile_id: string;
    role: CourseInstructorRole;
    full_name: string;
    avatar_url: string | null;
  }>;
}

export interface CreateWorkshopSessionInput {
  workshop_id: string;
  session_number: number;
  title: string;
  description?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  type: SessionType;
  venue?: string;
  youtube_url?: string;
  online_meeting_url?: string;
  materials?: string[];
  status?: SessionStatus;
  duration_minutes?: number | null;
}

export interface UpdateWorkshopSessionInput extends Partial<CreateWorkshopSessionInput> {
  id: string;
  workshop_id: string;
}

export interface SessionMaterialItem {
  title: string;
  url: string;
  driveFileId?: string;
  type?: 'pdf' | 'link' | 'video' | 'doc';
  size?: number;
}

type VerifyAccessResult =
  | { authorized: false; error: string; workshop?: undefined; profile?: undefined; supabase?: undefined }
  | {
      authorized: true;
      workshop: any;
      profile: NonNullable<Awaited<ReturnType<typeof getUserContext>>['profile']>;
      supabase: ReturnType<typeof createAdminClient>;
      error?: undefined;
    };

/**
 * Check if the current user has permission to manage this workshop's sessions
 */
async function verifyWorkshopAccess(workshopId: string): Promise<VerifyAccessResult> {
  const context = await getUserContext();
  if (!context.user || !context.profile) {
    return { authorized: false, error: 'Unauthorized: Authentication required.' };
  }
  const profile = context.profile;

  const supabase = createAdminClient();
  const { data: workshop, error: wsErr } = await supabase
    .from('workshops')
    .select(`
      id,
      title,
      description,
      category,
      department_id,
      cover_image_url,
      status,
      capacity,
      registration_open,
      registration_deadline,
      department:departments(id, name, code),
      instructors:workshop_instructors(
        id,
        profile_id,
        role,
        profile:profiles!workshop_instructors_profile_id_fkey(id, full_name, avatar_url)
      )
    `)
    .eq('id', workshopId)
    .single();

  if (wsErr || !workshop) {
    return { authorized: false, error: 'Workshop not found.' };
  }

  const role = profile.role;
  const isPresident = role === 'president' || role === 'co_president' || role === 'branch_head';
  const isOwningHead =
    (role === 'committee_head' || role === 'committee_co_head') &&
    profile.department_id === workshop.department_id;

  const isAssignedInstructor = (workshop.instructors || []).some(
    (wi: any) => wi.profile_id === profile.id
  );

  if (!isPresident && !isOwningHead && !isAssignedInstructor) {
    return {
      authorized: false,
      error: 'Forbidden: You do not have permission to manage sessions for this workshop.',
    };
  }

  return {
    authorized: true,
    workshop,
    profile,
    supabase,
  };
}

/**
 * 1. Fetch Workshop details and its Sessions
 */
export async function getWorkshopWithSessions(workshopId: string): Promise<{
  success: boolean;
  workshop?: WorkshopDetailHeader;
  sessions: WorkshopSession[];
  canManage: boolean;
  userRole?: string;
  error?: string;
}> {
  try {
    const access = await verifyWorkshopAccess(workshopId);
    if (!access.authorized) {
      return { success: false, sessions: [], canManage: false, error: access.error };
    }

    const { workshop, supabase, profile } = access;

    // Fetch sessions ordered by session_number ASC, session_date ASC
    const { data: sessions, error: sessionsErr } = await supabase
      .from('workshop_sessions')
      .select('*')
      .eq('workshop_id', workshopId)
      .order('session_number', { ascending: true })
      .order('session_date', { ascending: true });

    if (sessionsErr) {
      console.error('getWorkshopWithSessions sessions error:', sessionsErr);
      return {
        success: false,
        sessions: [],
        canManage: false,
        error: sessionsErr.message,
      };
    }

    const dept = Array.isArray(workshop.department) ? workshop.department[0] : workshop.department;
    const instructorsList = (workshop.instructors || []).map((inst: any) => {
      const prof = Array.isArray(inst.profile) ? inst.profile[0] : inst.profile;
      return {
        id: inst.id,
        profile_id: prof?.id || inst.profile_id,
        role: inst.role as CourseInstructorRole,
        full_name: prof?.full_name || 'Instructor',
        avatar_url: prof?.avatar_url || null,
      };
    });

    const header: WorkshopDetailHeader = {
      id: workshop.id,
      title: workshop.title,
      description: workshop.description,
      category: workshop.category,
      department_id: workshop.department_id,
      department_name: dept?.name,
      department_code: dept?.code,
      cover_image_url: workshop.cover_image_url,
      status: workshop.status,
      capacity: workshop.capacity,
      registration_open: workshop.registration_open,
      registration_deadline: workshop.registration_deadline,
      instructors_list: instructorsList,
    };

    return {
      success: true,
      workshop: header,
      sessions: (sessions as WorkshopSession[]) || [],
      canManage: true,
      userRole: profile.role,
    };
  } catch (err: any) {
    console.error('getWorkshopWithSessions exception:', err);
    return {
      success: false,
      sessions: [],
      canManage: false,
      error: err.message || 'An unexpected error occurred.',
    };
  }
}

/**
 * 2. Create a new workshop session
 */
export async function createWorkshopSession(input: CreateWorkshopSessionInput): Promise<{
  success: boolean;
  session?: WorkshopSession;
  error?: string;
}> {
  try {
    const access = await verifyWorkshopAccess(input.workshop_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    // Validation
    if (!input.title || !input.title.trim()) {
      return { success: false, error: 'Session title is required.' };
    }
    if (!input.session_date) {
      return { success: false, error: 'Session date is required.' };
    }
    if (!input.start_time || !input.end_time) {
      return { success: false, error: 'Start and End time are required.' };
    }
    if (input.type === 'offline' && (!input.venue || !input.venue.trim())) {
      return { success: false, error: 'Venue is required for in-person offline sessions.' };
    }
    if (input.type === 'online' && !input.youtube_url && !input.online_meeting_url) {
      return { success: false, error: 'Either YouTube URL or Online Meeting URL is required for online sessions.' };
    }

    const payload: any = {
      workshop_id: input.workshop_id,
      session_number: input.session_number,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      session_date: input.session_date,
      start_time: input.start_time,
      end_time: input.end_time,
      type: input.type,
      venue: input.type === 'offline' ? input.venue?.trim() : null,
      youtube_url: input.type === 'online' ? input.youtube_url?.trim() : null,
      online_meeting_url: input.type === 'online' ? input.online_meeting_url?.trim() : null,
      duration_minutes: input.duration_minutes || null,
      materials: input.materials || [],
      status: input.status || 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newSession, error: createErr } = await supabase
      .from('workshop_sessions')
      .insert(payload)
      .select('*')
      .single();

    if (createErr || !newSession) {
      console.error('createWorkshopSession error:', createErr);
      return { success: false, error: createErr?.message || 'Failed to create workshop session.' };
    }

    revalidatePath(`/student-portal/admin/workshops/${input.workshop_id}/sessions`);
    revalidatePath(`/student/workshops/${input.workshop_id}`);

    return {
      success: true,
      session: newSession as WorkshopSession,
    };
  } catch (err: any) {
    console.error('createWorkshopSession exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * 3. Update an existing workshop session
 */
export async function updateWorkshopSession(input: UpdateWorkshopSessionInput): Promise<{
  success: boolean;
  session?: WorkshopSession;
  error?: string;
}> {
  try {
    const access = await verifyWorkshopAccess(input.workshop_id);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.session_number !== undefined) payload.session_number = input.session_number;
    if (input.title !== undefined) payload.title = input.title.trim();
    if (input.description !== undefined) payload.description = input.description.trim() || null;
    if (input.session_date !== undefined) payload.session_date = input.session_date;
    if (input.start_time !== undefined) payload.start_time = input.start_time;
    if (input.end_time !== undefined) payload.end_time = input.end_time;
    if (input.type !== undefined) payload.type = input.type;
    if (input.duration_minutes !== undefined) payload.duration_minutes = input.duration_minutes || null;

    if (input.type === 'offline') {
      payload.venue = input.venue?.trim() || null;
      payload.youtube_url = null;
      payload.online_meeting_url = null;
    } else if (input.type === 'online') {
      payload.venue = null;
      payload.youtube_url = input.youtube_url?.trim() || null;
      payload.online_meeting_url = input.online_meeting_url?.trim() || null;
    }

    if (input.status !== undefined) payload.status = input.status;
    if (input.materials !== undefined) payload.materials = input.materials;

    const { data: updatedSession, error: updateErr } = await supabase
      .from('workshop_sessions')
      .update(payload)
      .eq('id', input.id)
      .eq('workshop_id', input.workshop_id)
      .select('*')
      .single();

    if (updateErr || !updatedSession) {
      console.error('updateWorkshopSession error:', updateErr);
      return { success: false, error: updateErr?.message || 'Failed to update workshop session.' };
    }

    revalidatePath(`/student-portal/admin/workshops/${input.workshop_id}/sessions`);
    revalidatePath(`/student/workshops/${input.workshop_id}`);

    return {
      success: true,
      session: updatedSession as WorkshopSession,
    };
  } catch (err: any) {
    console.error('updateWorkshopSession exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * 4. Delete a workshop session
 */
export async function deleteWorkshopSession(
  workshopId: string,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyWorkshopAccess(workshopId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const { error: delErr } = await supabase
      .from('workshop_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('workshop_id', workshopId);

    if (delErr) {
      console.error('deleteWorkshopSession error:', delErr);
      return { success: false, error: delErr.message };
    }

    revalidatePath(`/student-portal/admin/workshops/${workshopId}/sessions`);
    revalidatePath(`/student/workshops/${workshopId}`);

    return { success: true };
  } catch (err: any) {
    console.error('deleteWorkshopSession exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * 5. Update workshop session status (scheduled, completed, cancelled)
 */
export async function updateWorkshopSessionStatus(
  workshopId: string,
  sessionId: string,
  status: SessionStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyWorkshopAccess(workshopId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const { error } = await supabase
      .from('workshop_sessions')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('workshop_id', workshopId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/student-portal/admin/workshops/${workshopId}/sessions`);
    revalidatePath(`/student/workshops/${workshopId}`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update session status.' };
  }
}

/**
 * 6. Add a material item (PDF/Drive link or web URL) to a workshop session
 */
export async function addWorkshopSessionMaterialItem(
  workshopId: string,
  sessionId: string,
  title: string,
  url: string,
  driveFileId?: string
): Promise<{ success: boolean; session?: WorkshopSession; error?: string }> {
  try {
    const access = await verifyWorkshopAccess(workshopId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const { data: session, error: findErr } = await supabase
      .from('workshop_sessions')
      .select('materials')
      .eq('id', sessionId)
      .eq('workshop_id', workshopId)
      .single();

    if (findErr || !session) {
      return { success: false, error: 'Session not found.' };
    }

    const materialObj: SessionMaterialItem = {
      title: title.trim(),
      url: url.trim(),
      driveFileId: driveFileId || undefined,
      type: driveFileId || url.toLowerCase().includes('.pdf') ? 'pdf' : 'link',
    };

    const materialString = JSON.stringify(materialObj);
    const updatedMaterials = [...(session.materials || []), materialString];

    const { data: updated, error: updateErr } = await supabase
      .from('workshop_sessions')
      .update({
        materials: updatedMaterials,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      return { success: false, error: updateErr?.message || 'Failed to add material.' };
    }

    revalidatePath(`/student-portal/admin/workshops/${workshopId}/sessions`);
    return { success: true, session: updated as WorkshopSession };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' };
  }
}

/**
 * 7. Remove a material item from a workshop session
 */
export async function removeWorkshopSessionMaterialItem(
  workshopId: string,
  sessionId: string,
  itemUrl: string
): Promise<{ success: boolean; session?: WorkshopSession; error?: string }> {
  try {
    const access = await verifyWorkshopAccess(workshopId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const { data: session, error: findErr } = await supabase
      .from('workshop_sessions')
      .select('materials')
      .eq('id', sessionId)
      .eq('workshop_id', workshopId)
      .single();

    if (findErr || !session) {
      return { success: false, error: 'Session not found.' };
    }

    const currentList: string[] = session.materials || [];
    const updatedMaterials = currentList.filter((m) => {
      try {
        const parsed = JSON.parse(m);
        return parsed.url !== itemUrl && parsed.driveFileId !== itemUrl;
      } catch {
        return m !== itemUrl;
      }
    });

    const { data: updated, error: updateErr } = await supabase
      .from('workshop_sessions')
      .update({
        materials: updatedMaterials,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      return { success: false, error: updateErr?.message || 'Failed to remove material.' };
    }

    revalidatePath(`/student-portal/admin/workshops/${workshopId}/sessions`);
    return { success: true, session: updated as WorkshopSession };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' };
  }
}

/**
 * 8. Upload a PDF/document file to Google Drive and attach to a workshop session
 */
export async function uploadWorkshopSessionMaterialFile(
  workshopId: string,
  sessionId: string,
  formData: FormData
): Promise<{
  success: boolean;
  material?: SessionMaterialItem;
  session?: WorkshopSession;
  error?: string;
}> {
  try {
    const access = await verifyWorkshopAccess(workshopId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || file?.name || 'Workshop Resource';

    if (!file) {
      return { success: false, error: 'No file provided.' };
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const driveRes = await callDriveBridge<{ fileId: string; fileUrl: string; downloadUrl: string }>(
      'uploadFile',
      {
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        base64Data: base64,
      }
    );

    const fileId = driveRes.data?.fileId || (driveRes as any).fileId || `mock-file-${Date.now()}`;
    const webUrl =
      driveRes.data?.fileUrl ||
      (driveRes as any).fileUrl ||
      `https://drive.google.com/file/d/${fileId}/view`;

    const addRes = await addWorkshopSessionMaterialItem(
      workshopId,
      sessionId,
      title,
      webUrl,
      fileId || undefined
    );

    if (!addRes.success) {
      return { success: false, error: addRes.error };
    }

    return {
      success: true,
      material: {
        title,
        url: webUrl,
        driveFileId: fileId || undefined,
        type: 'pdf',
        size: file.size,
      },
      session: addRes.session,
    };
  } catch (err: any) {
    console.error('uploadWorkshopSessionMaterialFile exception:', err);
    return { success: false, error: err.message || 'Failed to upload session resource.' };
  }
}
