'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';

export interface WorkshopRegistrationsHeader {
  id: string;
  title: string;
  category: string | null;
  department_id: string | null;
  department_name?: string;
  cover_image_url: string | null;
  status: string;
  capacity: number | null;
  registration_open: boolean;
  total_registrations: number;
  confirmed_count: number;
  waitlisted_count: number;
  cancelled_count: number;
}

export interface WorkshopStudentItem {
  id: string; // registration id
  workshop_id: string;
  student_id: string;
  qr_code: string;
  status: 'registered' | 'waitlisted' | 'cancelled';
  registered_at: string;
  student: {
    id: string;
    full_name_en: string;
    full_name_ar: string | null;
    email: string;
    phone: string | null;
    whatsapp_number: string | null;
    national_id: string | null;
    university: string | null;
    faculty: string | null;
    department_major: string | null;
    academic_year: number | null;
    qr_code: string;
    avatar_url: string | null;
  };
  attended_sessions_count: number;
  total_sessions_count: number;
}

type VerifyAccessResult =
  | { authorized: false; error: string; workshop?: undefined; profile?: undefined; admin?: undefined }
  | {
      authorized: true;
      workshop: any;
      profile: NonNullable<Awaited<ReturnType<typeof getUserContext>>['profile']>;
      admin: ReturnType<typeof createAdminClient>;
      error?: undefined;
    };

async function verifyWorkshopManagementAccess(workshopId: string): Promise<VerifyAccessResult> {
  const context = await getUserContext();
  if (!context.user || !context.profile) {
    return { authorized: false, error: 'Unauthorized: Authentication required.' };
  }
  const profile = context.profile;

  const admin = createAdminClient();
  const { data: workshop, error: wsErr } = await admin
    .from('workshops')
    .select(`
      id,
      title,
      category,
      department_id,
      cover_image_url,
      status,
      capacity,
      registration_open,
      department:departments(id, name, code),
      instructors:workshop_instructors(id, profile_id, role)
    `)
    .eq('id', workshopId)
    .single();

  if (wsErr || !workshop) {
    return { authorized: false, error: 'Workshop not found.' };
  }

  const role = profile.role as string;
  const isPresident =
    role === 'president' ||
    role === 'co_president' ||
    role === 'branch_head' ||
    role === 'vice_president';
  const isOwningHead =
    (role === 'committee_head' || role === 'committee_co_head') &&
    profile.department_id === workshop.department_id;
  const isAssignedInstructor = (workshop.instructors || []).some(
    (wi: any) => wi.profile_id === profile.id
  );

  if (!isPresident && !isOwningHead && !isAssignedInstructor) {
    return {
      authorized: false,
      error: 'Forbidden: You do not have permission to manage registrations for this workshop.',
    };
  }

  return {
    authorized: true,
    workshop,
    profile,
    admin,
  };
}

/**
 * 1. Fetch registrations roster with student details & session attendance
 */
export async function getWorkshopRegistrationsRoster(workshopId: string): Promise<{
  success: boolean;
  header?: WorkshopRegistrationsHeader;
  registrations: WorkshopStudentItem[];
  canManage: boolean;
  error?: string;
}> {
  try {
    const access = await verifyWorkshopManagementAccess(workshopId);
    if (!access.authorized || !access.workshop) {
      return {
        success: false,
        registrations: [],
        canManage: false,
        error: access.error,
      };
    }

    const { workshop, admin } = access;
    const dept = Array.isArray(workshop.department) ? workshop.department[0] : workshop.department;

    // Fetch workshop sessions count
    const { count: sessionsCount } = await admin
      .from('workshop_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('workshop_id', workshopId);

    const totalSessions = sessionsCount || 0;

    // Fetch registrations
    const { data: regRows, error: regErr } = await admin
      .from('workshop_registrations')
      .select(`
        id,
        workshop_id,
        student_id,
        qr_code,
        status,
        registered_at,
        student:student_profiles!workshop_registrations_student_id_fkey(
          id,
          full_name_en,
          full_name_ar,
          email,
          phone,
          whatsapp_number,
          national_id,
          university,
          faculty,
          department_major,
          academic_year,
          qr_code,
          avatar_url
        )
      `)
      .eq('workshop_id', workshopId)
      .order('registered_at', { ascending: false });

    if (regErr) {
      console.error('getWorkshopRegistrationsRoster regErr:', regErr);
    }

    // Attendance cross-reference
    let attendedMap = new Map<string, number>();
    try {
      const { data: attRows } = await admin
        .from('student_attendance')
        .select('student_id, workshop_session_id')
        .not('workshop_session_id', 'is', null);

      if (attRows) {
        for (const r of attRows) {
          const count = attendedMap.get(r.student_id) || 0;
          attendedMap.set(r.student_id, count + 1);
        }
      }
    } catch {}

    const list = regRows || [];
    const confirmedCount = list.filter((r: any) => r.status === 'registered').length;
    const waitlistedCount = list.filter((r: any) => r.status === 'waitlisted').length;
    const cancelledCount = list.filter((r: any) => r.status === 'cancelled').length;

    const registrationsList: WorkshopStudentItem[] = list.map((r: any) => {
      const s = Array.isArray(r.student) ? r.student[0] : r.student;
      return {
        id: r.id,
        workshop_id: r.workshop_id,
        student_id: r.student_id,
        qr_code: r.qr_code,
        status: r.status,
        registered_at: r.registered_at,
        student: {
          id: s?.id || r.student_id,
          full_name_en: s?.full_name_en || 'Registered Student',
          full_name_ar: s?.full_name_ar || null,
          email: s?.email || '',
          phone: s?.phone || null,
          whatsapp_number: s?.whatsapp_number || null,
          national_id: s?.national_id || null,
          university: s?.university || null,
          faculty: s?.faculty || null,
          department_major: s?.department_major || null,
          academic_year: s?.academic_year || null,
          qr_code: s?.qr_code || r.qr_code,
          avatar_url: s?.avatar_url || null,
        },
        attended_sessions_count: attendedMap.get(r.student_id) || 0,
        total_sessions_count: totalSessions,
      };
    });

    const header: WorkshopRegistrationsHeader = {
      id: workshop.id,
      title: workshop.title,
      category: workshop.category,
      department_id: workshop.department_id,
      department_name: dept?.name,
      cover_image_url: workshop.cover_image_url,
      status: workshop.status,
      capacity: workshop.capacity,
      registration_open: workshop.registration_open,
      total_registrations: registrationsList.length,
      confirmed_count: confirmedCount,
      waitlisted_count: waitlistedCount,
      cancelled_count: cancelledCount,
    };

    return {
      success: true,
      header,
      registrations: registrationsList,
      canManage: true,
    };
  } catch (err: any) {
    console.error('getWorkshopRegistrationsRoster exception:', err);
    return {
      success: false,
      registrations: [],
      canManage: false,
      error: err.message || 'Failed to load registrations.',
    };
  }
}

/**
 * 2. Cancel a workshop registration spot
 */
export async function cancelWorkshopRegistration(
  workshopId: string,
  registrationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyWorkshopManagementAccess(workshopId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { admin } = access;

    const { error: updErr } = await admin
      .from('workshop_registrations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', registrationId)
      .eq('workshop_id', workshopId);

    if (updErr) {
      console.error('cancelWorkshopRegistration error:', updErr);
      return { success: false, error: updErr.message };
    }

    revalidatePath(`/student-portal/admin/workshops/${workshopId}/registrations`);
    revalidatePath(`/student/workshops/${workshopId}`);
    revalidatePath(`/student/dashboard`);

    return { success: true };
  } catch (err: any) {
    console.error('cancelWorkshopRegistration exception:', err);
    return { success: false, error: err.message || 'Failed to cancel registration.' };
  }
}

/**
 * 3. Delete a workshop registration record completely so student can register again
 */
export async function removeWorkshopRegistration(
  workshopId: string,
  registrationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyWorkshopManagementAccess(workshopId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { admin } = access;

    const { error: delErr } = await admin
      .from('workshop_registrations')
      .delete()
      .eq('id', registrationId)
      .eq('workshop_id', workshopId);

    if (delErr) {
      console.error('removeWorkshopRegistration error:', delErr);
      return { success: false, error: delErr.message };
    }

    revalidatePath(`/student-portal/admin/workshops/${workshopId}/registrations`);
    revalidatePath(`/student/workshops/${workshopId}`);
    revalidatePath(`/student/dashboard`);

    return { success: true };
  } catch (err: any) {
    console.error('removeWorkshopRegistration exception:', err);
    return { success: false, error: err.message || 'Failed to remove registration.' };
  }
}

/**
 * 4. Restore a cancelled registration back to confirmed 'registered'
 */
export async function restoreWorkshopRegistration(
  workshopId: string,
  registrationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyWorkshopManagementAccess(workshopId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { admin } = access;

    const { error: updErr } = await admin
      .from('workshop_registrations')
      .update({
        status: 'registered',
        updated_at: new Date().toISOString(),
      })
      .eq('id', registrationId)
      .eq('workshop_id', workshopId);

    if (updErr) {
      console.error('restoreWorkshopRegistration error:', updErr);
      return { success: false, error: updErr.message };
    }

    revalidatePath(`/student-portal/admin/workshops/${workshopId}/registrations`);
    revalidatePath(`/student/workshops/${workshopId}`);
    revalidatePath(`/student/dashboard`);

    return { success: true };
  } catch (err: any) {
    console.error('restoreWorkshopRegistration exception:', err);
    return { success: false, error: err.message || 'Failed to restore registration.' };
  }
}
