'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { Course, CourseInstructor, CourseStatus, EnrollmentType, CourseInstructorRole } from '@/types/student';

export interface AdminCourseItem extends Course {
  department_name?: string;
  department_code?: string;
  instructors_list: Array<{
    id: string;
    profile_id: string;
    role: CourseInstructorRole;
    full_name: string;
    avatar_url: string | null;
  }>;
  enrollment_count: number;
  sessions_count: number;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  category?: string;
  department_id?: string;
  cover_image_url?: string;
  enrollment_type: EnrollmentType;
  capacity?: number | null;
  syllabus?: string;
  status: CourseStatus;
  instructors?: Array<{
    profile_id: string;
    role: CourseInstructorRole;
  }>;
}

export interface UpdateCourseInput extends Partial<CreateCourseInput> {
  id: string;
}

/**
 * 1. Get list of courses accessible to current Team Member
 */
export async function getAdminCourses(): Promise<{
  success: boolean;
  courses: AdminCourseItem[];
  departments: Array<{ id: string; name: string; code: string; branch: string }>;
  teamMembers: Array<{ id: string; full_name: string; avatar_url: string | null; role: string; department_id: string | null }>;
  userRole: string;
  userDepartmentId: string | null;
  canCreate: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return {
        success: false,
        courses: [],
        departments: [],
        teamMembers: [],
        userRole: '',
        userDepartmentId: null,
        canCreate: false,
        error: 'Unauthorized: Team membership required.',
      };
    }

    const admin = createAdminClient();
    const profile = context.profile;
    const role = profile.role;
    const isLeadership = ['president', 'co_president', 'branch_head'].includes(role);
    const isPresident = role === 'president' || role === 'co_president';
    const isCommitteeHead = ['committee_head', 'committee_co_head'].includes(role);

    // 1. Fetch available departments
    const { data: depts } = await admin
      .from('departments')
      .select('id, name, code, branch')
      .order('name', { ascending: true });

    // 2. Fetch candidate team members for instructor assignment
    const { data: members } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, role, department_id')
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    // 3. Query courses according to role
    let courseQuery = admin.from('courses').select(`
      *,
      department:departments(id, name, code, branch),
      instructors:course_instructors(
        id,
        role,
        profile:profiles!course_instructors_profile_id_fkey(id, full_name, avatar_url)
      ),
      sessions:course_sessions(id),
      enrollments:course_enrollments(id)
    `);

    if (isPresident) {
      // See all courses
    } else if (isCommitteeHead && profile.department_id) {
      // See courses owned by their committee, or where assigned as instructor
      const { data: myInstructorCourses } = await admin
        .from('course_instructors')
        .select('course_id')
        .eq('profile_id', profile.id);

      const assignedIds = myInstructorCourses?.map((ci: any) => ci.course_id) || [];
      if (assignedIds.length > 0) {
        courseQuery = courseQuery.or(`department_id.eq.${profile.department_id},id.in.(${assignedIds.join(',')})`);
      } else {
        courseQuery = courseQuery.eq('department_id', profile.department_id);
      }
    } else {
      // Regular team members: see only courses where assigned as instructor/mentor
      const { data: myInstructorCourses } = await admin
        .from('course_instructors')
        .select('course_id')
        .eq('profile_id', profile.id);

      const assignedIds = myInstructorCourses?.map((ci: any) => ci.course_id) || [];
      if (assignedIds.length === 0) {
        return {
          success: true,
          courses: [],
          departments: depts || [],
          teamMembers: members || [],
          userRole: role,
          userDepartmentId: profile.department_id,
          canCreate: isPresident || isCommitteeHead,
        };
      }
      courseQuery = courseQuery.in('id', assignedIds);
    }

    const { data: rawCourses, error: courseErr } = await courseQuery.order('created_at', { ascending: false });

    if (courseErr) {
      console.error('getAdminCourses error:', courseErr);
      return {
        success: false,
        courses: [],
        departments: depts || [],
        teamMembers: members || [],
        userRole: role,
        userDepartmentId: profile.department_id,
        canCreate: isPresident || isCommitteeHead,
        error: courseErr.message,
      };
    }

    const courses: AdminCourseItem[] = (rawCourses || []).map((c: any) => {
      const instructors_list = (c.instructors || []).map((inst: any) => ({
        id: inst.id,
        profile_id: inst.profile?.id || '',
        role: inst.role as CourseInstructorRole,
        full_name: inst.profile?.full_name || 'Team Member',
        avatar_url: inst.profile?.avatar_url || null,
      }));

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        cover_image_url: c.cover_image_url,
        category: c.category,
        department_id: c.department_id,
        capacity: c.capacity,
        enrollment_type: c.enrollment_type,
        syllabus: c.syllabus,
        status: c.status,
        created_by: c.created_by,
        created_at: c.created_at,
        updated_at: c.updated_at,
        department_name: c.department?.name,
        department_code: c.department?.code,
        instructors_list,
        enrollment_count: c.enrollments?.length || 0,
        sessions_count: c.sessions?.length || 0,
      };
    });

    const canCreate = isPresident || isCommitteeHead;

    return {
      success: true,
      courses,
      departments: depts || [],
      teamMembers: members || [],
      userRole: role,
      userDepartmentId: profile.department_id,
      canCreate,
    };
  } catch (err: any) {
    console.error('getAdminCourses exception:', err);
    return {
      success: false,
      courses: [],
      departments: [],
      teamMembers: [],
      userRole: '',
      userDepartmentId: null,
      canCreate: false,
      error: err.message,
    };
  }
}

/**
 * 2. Create a new Course with optional instructor assignments
 */
export async function createAdminCourse(input: CreateCourseInput): Promise<{
  success: boolean;
  courseId?: string;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const profile = context.profile;
    const role = profile.role;
    const isPresident = role === 'president' || role === 'co_president';
    const isCommitteeHead = ['committee_head', 'committee_co_head'].includes(role);

    if (!isPresident && !isCommitteeHead) {
      return { success: false, error: 'Permission denied: Only Leadership and Committee Heads can create courses.' };
    }

    // Determine target department
    const targetDeptId = isPresident
      ? input.department_id || profile.department_id
      : profile.department_id;

    if (!targetDeptId) {
      return { success: false, error: 'Owning department / committee is required.' };
    }

    const admin = createAdminClient();

    // 1. Insert course
    const { data: newCourse, error: insertErr } = await admin
      .from('courses')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category?.trim() || 'General Technical',
        department_id: targetDeptId,
        cover_image_url: input.cover_image_url?.trim() || null,
        enrollment_type: input.enrollment_type || 'open',
        capacity: input.capacity && input.capacity > 0 ? input.capacity : null,
        syllabus: input.syllabus?.trim() || null,
        status: input.status || 'draft',
        created_by: profile.id,
      })
      .select('id')
      .single();

    if (insertErr || !newCourse) {
      console.error('createAdminCourse insert error:', insertErr);
      return { success: false, error: insertErr?.message || 'Failed to create course.' };
    }

    // 2. Assign instructors if provided
    if (input.instructors && input.instructors.length > 0) {
      const instructorRows = input.instructors.map((inst) => ({
        course_id: newCourse.id,
        profile_id: inst.profile_id,
        role: inst.role,
        assigned_by: profile.id,
      }));

      const { error: instErr } = await admin
        .from('course_instructors')
        .insert(instructorRows);

      if (instErr) {
        console.warn('createAdminCourse instructor assignment note:', instErr.message);
      }
    }

    revalidatePath('/student-portal/admin/courses');
    revalidatePath('/student');
    revalidatePath('/student/dashboard');

    return { success: true, courseId: newCourse.id };
  } catch (err: any) {
    console.error('createAdminCourse exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Update an existing Course
 */
export async function updateAdminCourse(input: UpdateCourseInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();

    // Check course existence
    const { data: existingCourse } = await admin
      .from('courses')
      .select('id, department_id')
      .eq('id', input.id)
      .maybeSingle();

    if (!existingCourse) {
      return { success: false, error: 'Course not found.' };
    }

    const profile = context.profile;
    const role = profile.role;
    const isPresident = role === 'president' || role === 'co_president';
    const isOwnerHead = ['committee_head', 'committee_co_head'].includes(role) && profile.department_id === existingCourse.department_id;

    // Check if user is assigned instructor
    const { data: isInst } = await admin
      .from('course_instructors')
      .select('id')
      .eq('course_id', input.id)
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (!isPresident && !isOwnerHead && !isInst) {
      return { success: false, error: 'Permission denied to edit this course.' };
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.description !== undefined) updatePayload.description = input.description.trim() || null;
    if (input.category !== undefined) updatePayload.category = input.category.trim() || null;
    if (input.cover_image_url !== undefined) updatePayload.cover_image_url = input.cover_image_url.trim() || null;
    if (input.enrollment_type !== undefined) updatePayload.enrollment_type = input.enrollment_type;
    if (input.capacity !== undefined) updatePayload.capacity = input.capacity && input.capacity > 0 ? input.capacity : null;
    if (input.syllabus !== undefined) updatePayload.syllabus = input.syllabus.trim() || null;
    if (input.status !== undefined) updatePayload.status = input.status;

    // Only President can reassign owning department
    if (isPresident && input.department_id) {
      updatePayload.department_id = input.department_id;
    }

    const { error: updateErr } = await admin
      .from('courses')
      .update(updatePayload)
      .eq('id', input.id);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Sync instructors if provided and user has rights
    if ((isPresident || isOwnerHead) && input.instructors !== undefined) {
      // Remove previous instructors
      await admin.from('course_instructors').delete().eq('course_id', input.id);

      if (input.instructors.length > 0) {
        const rows = input.instructors.map((inst) => ({
          course_id: input.id,
          profile_id: inst.profile_id,
          role: inst.role,
          assigned_by: profile.id,
        }));
        await admin.from('course_instructors').insert(rows);
      }
    }

    revalidatePath('/student-portal/admin/courses');
    revalidatePath('/student');
    revalidatePath('/student/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('updateAdminCourse exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Delete or Archive Course
 */
export async function deleteAdminCourse(courseId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();
    const { data: course } = await admin
      .from('courses')
      .select('id, department_id')
      .eq('id', courseId)
      .maybeSingle();

    if (!course) {
      return { success: false, error: 'Course not found.' };
    }

    const role = context.profile.role;
    const isPresident = role === 'president' || role === 'co_president';
    const isOwnerHead = ['committee_head', 'committee_co_head'].includes(role) && context.profile.department_id === course.department_id;

    if (!isPresident && !isOwnerHead) {
      return { success: false, error: 'Only Leadership or Owning Committee Head can delete a course.' };
    }

    const { error: delErr } = await admin.from('courses').delete().eq('id', courseId);
    if (delErr) {
      return { success: false, error: delErr.message };
    }

    revalidatePath('/student-portal/admin/courses');
    revalidatePath('/student');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
