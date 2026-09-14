'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { CourseInstructorRole } from '@/types/student';

export interface CourseRosterHeader {
  id: string;
  title: string;
  category: string | null;
  department_id: string | null;
  department_name?: string;
  department_code?: string;
  cover_image_url: string | null;
  status: string;
}

export interface AssignedInstructorItem {
  id: string;
  course_id: string;
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
  | { authorized: false; error: string; course?: undefined; profile?: undefined; supabase?: undefined }
  | {
      authorized: true;
      course: any;
      profile: NonNullable<Awaited<ReturnType<typeof getUserContext>>['profile']>;
      supabase: ReturnType<typeof createAdminClient>;
      error?: undefined;
    };

/**
 * Verify user can manage instructors for this course
 */
async function verifyCourseManagementAccess(courseId: string): Promise<VerifyAccessResult> {
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
      category,
      department_id,
      cover_image_url,
      status,
      department:departments(id, name, code)
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

  if (!isPresident && !isOwningHead) {
    return {
      authorized: false,
      error: 'Forbidden: Only Chapter Leadership and Committee Heads can manage course instructor rosters.',
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
 * 1. Fetch Course Instructors Roster and Candidate Members Pool
 */
export async function getCourseInstructorsRoster(courseId: string): Promise<{
  success: boolean;
  course?: CourseRosterHeader;
  assigned: AssignedInstructorItem[];
  candidates: CandidateMemberItem[];
  canManage: boolean;
  userRole?: string;
  error?: string;
}> {
  try {
    const access = await verifyCourseManagementAccess(courseId);
    if (!access.authorized || !access.course) {
      return {
        success: false,
        assigned: [],
        candidates: [],
        canManage: false,
        error: access.error,
      };
    }

    const { course, profile, supabase } = access;
    const isPresident = profile.role === 'president' || profile.role === 'co_president';

    // Fetch assigned instructors with profile and department info
    const { data: assignedData, error: assignedErr } = await supabase
      .from('course_instructors')
      .select(`
        id,
        course_id,
        profile_id,
        role,
        assigned_at,
        profile:profiles!course_instructors_profile_id_fkey(
          id,
          full_name,
          avatar_url,
          role,
          email,
          department:departments!profiles_department_id_fkey(name, code)
        )
      `)
      .eq('course_id', courseId)
      .order('assigned_at', { ascending: true });

    if (assignedErr) {
      console.error('getCourseInstructorsRoster assignedErr:', assignedErr);
      return {
        success: false,
        assigned: [],
        candidates: [],
        canManage: false,
        error: 'Failed to fetch assigned instructors.',
      };
    }

    const assignedIds = new Set((assignedData || []).map((a: any) => a.profile_id));

    // Fetch candidate pool
    let candidateQuery = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        role,
        department_id,
        email,
        department:departments!profiles_department_id_fkey(name, code)
      `)
      .neq('role', 'alumni');

    if (!isPresident && course.department_id) {
      candidateQuery = candidateQuery.eq('department_id', course.department_id);
    }

    const { data: candidatesData, error: candidatesErr } = await candidateQuery.order('full_name', { ascending: true });

    if (candidatesErr) {
      console.error('getCourseInstructorsRoster candidatesErr:', candidatesErr);
    }

    const dept = Array.isArray(course.department) ? course.department[0] : course.department;

    const courseHeader: CourseRosterHeader = {
      id: course.id,
      title: course.title,
      category: course.category,
      department_id: course.department_id,
      department_name: dept?.name,
      department_code: dept?.code,
      cover_image_url: course.cover_image_url,
      status: course.status,
    };

    const assignedList: AssignedInstructorItem[] = (assignedData || []).map((item: any) => {
      const prof = Array.isArray(item.profile) ? item.profile[0] : item.profile;
      const pDept = Array.isArray(prof?.department) ? prof?.department[0] : prof?.department;

      return {
        id: item.id,
        course_id: item.course_id,
        profile_id: item.profile_id,
        role: item.role,
        assigned_at: item.assigned_at,
        full_name: prof?.full_name || 'Team Member',
        avatar_url: prof?.avatar_url || null,
        committee_role: prof?.role || 'member',
        email: prof?.email,
        department_name: pDept?.name,
      };
    });

    const candidateList: CandidateMemberItem[] = (candidatesData || [])
      .filter((c: any) => !assignedIds.has(c.id))
      .map((c: any) => {
        const cDept = Array.isArray(c.department) ? c.department[0] : c.department;
        return {
          id: c.id,
          full_name: c.full_name,
          avatar_url: c.avatar_url,
          role: c.role,
          department_id: c.department_id,
          department_name: cDept?.name,
          email: c.email,
        };
      });

    return {
      success: true,
      course: courseHeader,
      assigned: assignedList,
      candidates: candidateList,
      canManage: true,
      userRole: profile.role,
    };
  } catch (err: any) {
    console.error('getCourseInstructorsRoster exception:', err);
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
 * 2. Assign a Team Member to Course as Instructor or Mentor
 */
export async function assignCourseInstructor(
  courseId: string,
  profileId: string,
  role: CourseInstructorRole
): Promise<{ success: boolean; item?: AssignedInstructorItem; error?: string }> {
  try {
    const access = await verifyCourseManagementAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase, profile: userProfile } = access;

    const { data: inserted, error: insErr } = await supabase
      .from('course_instructors')
      .insert([
        {
          course_id: courseId,
          profile_id: profileId,
          role,
          assigned_by: userProfile.id,
        },
      ])
      .select(`
        id,
        course_id,
        profile_id,
        role,
        assigned_at,
        profile:profiles!course_instructors_profile_id_fkey(
          id,
          full_name,
          avatar_url,
          role,
          email,
          department:departments!profiles_department_id_fkey(name, code)
        )
      `)
      .single();

    if (insErr || !inserted) {
      console.error('assignCourseInstructor error:', insErr);
      return { success: false, error: insErr?.message || 'Failed to assign member.' };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/instructors`);
    revalidatePath(`/student-portal/admin/courses/${courseId}/sessions`);
    revalidatePath(`/student-portal/admin/courses`);

    const prof = Array.isArray(inserted.profile) ? inserted.profile[0] : inserted.profile;
    const pDept = Array.isArray(prof?.department) ? prof?.department[0] : prof?.department;

    return {
      success: true,
      item: {
        id: inserted.id,
        course_id: inserted.course_id,
        profile_id: inserted.profile_id,
        role: inserted.role,
        assigned_at: inserted.assigned_at,
        full_name: prof?.full_name || 'Team Member',
        avatar_url: prof?.avatar_url || null,
        committee_role: prof?.role || 'member',
        email: prof?.email,
        department_name: pDept?.name,
      },
    };
  } catch (err: any) {
    console.error('assignCourseInstructor exception:', err);
    return { success: false, error: err.message || 'Failed to assign member.' };
  }
}

/**
 * 3. Toggle/Update Instructor Role (instructor <-> mentor)
 */
export async function updateCourseInstructorRole(
  courseId: string,
  profileId: string,
  role: CourseInstructorRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyCourseManagementAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const { error: updErr } = await supabase
      .from('course_instructors')
      .update({ role })
      .match({ course_id: courseId, profile_id: profileId });

    if (updErr) {
      console.error('updateCourseInstructorRole error:', updErr);
      return { success: false, error: updErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/instructors`);
    revalidatePath(`/student-portal/admin/courses/${courseId}/sessions`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 4. Remove an Instructor/Mentor from Course Roster
 */
export async function removeCourseInstructor(
  courseId: string,
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyCourseManagementAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { supabase } = access;

    const { error: delErr } = await supabase
      .from('course_instructors')
      .delete()
      .match({ course_id: courseId, profile_id: profileId });

    if (delErr) {
      console.error('removeCourseInstructor error:', delErr);
      return { success: false, error: delErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/instructors`);
    revalidatePath(`/student-portal/admin/courses/${courseId}/sessions`);
    revalidatePath(`/student-portal/admin/courses`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
