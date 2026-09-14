'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { CourseInstructorRole } from '@/types/student';

export interface WorkshopRosterHeader {
  id: string;
  title: string;
  category: string | null;
  department_id: string | null;
  department_name?: string;
  department_code?: string;
  cover_image_url: string | null;
  status: string;
}

export interface AssignedWorkshopInstructorItem {
  id: string;
  workshop_id: string;
  profile_id: string;
  role: CourseInstructorRole;
  assigned_at: string;
  full_name: string;
  avatar_url: string | null;
  committee_role: string;
  email?: string;
  department_name?: string;
}

export interface CandidateMemberItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  department_id: string | null;
  department_name?: string;
  email?: string;
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
 * Verify user can manage instructors for this workshop
 */
async function verifyWorkshopManagementAccess(workshopId: string): Promise<VerifyAccessResult> {
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
      category,
      department_id,
      cover_image_url,
      status,
      department:departments(id, name, code)
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

  if (!isPresident && !isOwningHead) {
    return {
      authorized: false,
      error: 'Forbidden: Only Leadership and Committee Heads can manage workshop instructor rosters.',
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
 * 1. Fetch current assigned instructors and candidate team members
 */
export async function getWorkshopInstructorsRoster(workshopId: string): Promise<{
  success: boolean;
  workshop?: WorkshopRosterHeader;
  assigned: AssignedWorkshopInstructorItem[];
  candidates: CandidateMemberItem[];
  canManage: boolean;
  userRole?: string;
  error?: string;
}> {
  try {
    const access = await verifyWorkshopManagementAccess(workshopId);
    if (!access.authorized || !access.workshop) {
      return {
        success: false,
        assigned: [],
        candidates: [],
        canManage: false,
        error: access.error,
      };
    }

    const { workshop, profile, supabase } = access;
    const dept = Array.isArray(workshop.department) ? workshop.department[0] : workshop.department;

    const workshopHeader: WorkshopRosterHeader = {
      id: workshop.id,
      title: workshop.title,
      category: workshop.category,
      department_id: workshop.department_id,
      department_name: dept?.name,
      department_code: dept?.code,
      cover_image_url: workshop.cover_image_url,
      status: workshop.status,
    };

    // Query assigned instructors
    const { data: assignedRows, error: assignedErr } = await supabase
      .from('workshop_instructors')
      .select(`
        id,
        workshop_id,
        profile_id,
        role,
        assigned_at,
        profile:profiles!workshop_instructors_profile_id_fkey(
          id,
          full_name,
          avatar_url,
          role,
          email,
          department:departments(id, name, code)
        )
      `)
      .eq('workshop_id', workshopId)
      .order('assigned_at', { ascending: true });

    if (assignedErr) {
      console.error('getWorkshopInstructorsRoster assignedErr:', assignedErr);
    }

    const assignedList: AssignedWorkshopInstructorItem[] = (assignedRows || []).map((row: any) => {
      const p = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      const pDept = Array.isArray(p?.department) ? p?.department[0] : p?.department;

      return {
        id: row.id,
        workshop_id: row.workshop_id,
        profile_id: row.profile_id,
        role: row.role as CourseInstructorRole,
        assigned_at: row.assigned_at,
        full_name: p?.full_name || 'Team Member',
        avatar_url: p?.avatar_url || null,
        committee_role: p?.role || 'member',
        email: p?.email,
        department_name: pDept?.name,
      };
    });

    // Query all active team members as potential candidates
    const { data: candidateRows, error: candErr } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        role,
        department_id,
        email,
        department:departments(id, name, code)
      `)
      .order('full_name', { ascending: true });

    if (candErr) {
      console.error('getWorkshopInstructorsRoster candErr:', candErr);
    }

    const assignedProfileIds = new Set(assignedList.map((a) => a.profile_id));
    const candidatesList: CandidateMemberItem[] = (candidateRows || [])
      .filter((row: any) => !assignedProfileIds.has(row.id))
      .map((row: any) => {
        const cDept = Array.isArray(row.department) ? row.department[0] : row.department;
        return {
          id: row.id,
          full_name: row.full_name || 'Team Member',
          avatar_url: row.avatar_url || null,
          role: row.role || 'member',
          department_id: row.department_id,
          department_name: cDept?.name,
          email: row.email,
        };
      });

    return {
      success: true,
      workshop: workshopHeader,
      assigned: assignedList,
      candidates: candidatesList,
      canManage: true,
      userRole: profile.role,
    };
  } catch (err: any) {
    console.error('getWorkshopInstructorsRoster exception:', err);
    return {
      success: false,
      assigned: [],
      candidates: [],
      canManage: false,
      error: err.message || 'Failed to load instructors roster.',
    };
  }
}

/**
 * 2. Assign an instructor or mentor to a workshop
 */
export async function assignWorkshopInstructor(
  workshopId: string,
  profileId: string,
  role: CourseInstructorRole = 'instructor'
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyWorkshopManagementAccess(workshopId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { profile, supabase } = access;

    const { error: insErr } = await supabase.from('workshop_instructors').insert({
      workshop_id: workshopId,
      profile_id: profileId,
      role,
      assigned_by: profile.id,
    });

    if (insErr) {
      console.error('assignWorkshopInstructor insert error:', insErr);
      return { success: false, error: insErr.message || 'Failed to assign instructor.' };
    }

    revalidatePath(`/student-portal/admin/workshops/${workshopId}/instructors`);
    revalidatePath(`/student-portal/admin/workshops/${workshopId}/sessions`);
    revalidatePath(`/student/workshops/${workshopId}`);
    revalidatePath(`/student/workshops`);

    return { success: true };
  } catch (err: any) {
    console.error('assignWorkshopInstructor exception:', err);
    return { success: false, error: err.message || 'Failed to assign instructor.' };
  }
}

/**
 * 3. Update an instructor's role ('instructor' <=> 'mentor')
 */
export async function updateWorkshopInstructorRole(
  workshopId: string,
  instructorId: string,
  newRole: CourseInstructorRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyWorkshopManagementAccess(workshopId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const { error: updErr } = await supabase
      .from('workshop_instructors')
      .update({ role: newRole })
      .eq('id', instructorId)
      .eq('workshop_id', workshopId);

    if (updErr) {
      console.error('updateWorkshopInstructorRole error:', updErr);
      return { success: false, error: updErr.message || 'Failed to update role.' };
    }

    revalidatePath(`/student-portal/admin/workshops/${workshopId}/instructors`);
    revalidatePath(`/student-portal/admin/workshops/${workshopId}/sessions`);
    revalidatePath(`/student/workshops/${workshopId}`);

    return { success: true };
  } catch (err: any) {
    console.error('updateWorkshopInstructorRole exception:', err);
    return { success: false, error: err.message || 'Failed to update role.' };
  }
}

/**
 * 4. Remove an instructor or mentor from a workshop
 */
export async function removeWorkshopInstructor(
  workshopId: string,
  instructorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyWorkshopManagementAccess(workshopId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const { error: delErr } = await supabase
      .from('workshop_instructors')
      .delete()
      .eq('id', instructorId)
      .eq('workshop_id', workshopId);

    if (delErr) {
      console.error('removeWorkshopInstructor error:', delErr);
      return { success: false, error: delErr.message || 'Failed to remove instructor.' };
    }

    revalidatePath(`/student-portal/admin/workshops/${workshopId}/instructors`);
    revalidatePath(`/student-portal/admin/workshops/${workshopId}/sessions`);
    revalidatePath(`/student/workshops/${workshopId}`);
    revalidatePath(`/student/workshops`);

    return { success: true };
  } catch (err: any) {
    console.error('removeWorkshopInstructor exception:', err);
    return { success: false, error: err.message || 'Failed to remove instructor.' };
  }
}
