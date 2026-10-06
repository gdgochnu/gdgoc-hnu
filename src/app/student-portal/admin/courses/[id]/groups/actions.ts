'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { CourseGroup } from '@/types/student';
import { dispatchStudentNotification } from '@/app/student/notifications/actions';
import { sendCourseEnrollmentConfirmedEmail } from '@/lib/email/service';

export interface GroupStudentItem {
  enrollment_id: string;
  student_id: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  email: string;
  phone: string | null;
  whatsapp_number: string | null;
  faculty: string | null;
  department_major: string | null;
  academic_year: number | null;
  avatar_url: string | null;
  group_id: string | null;
  group_name: string | null;
  group_assigned_at: string | null;
  joined_group_at: string | null;
  enrolled_at: string;
}

export interface CourseGroupsPageData {
  course: {
    id: string;
    title: string;
    category: string | null;
    department_name?: string;
    department_code?: string;
    confirmed_count: number;
    capacity: number | null;
  };
  groups: CourseGroup[];
  students: GroupStudentItem[];
  canManage: boolean;
}

type AccessResult =
  | { authorized: false; error: string; course?: undefined; profile?: undefined; admin?: undefined }
  | {
      authorized: true;
      course: any;
      profile: NonNullable<Awaited<ReturnType<typeof getUserContext>>['profile']>;
      admin: ReturnType<typeof createAdminClient>;
      error?: undefined;
    };

async function verifyGroupAccess(courseId: string): Promise<AccessResult> {
  const context = await getUserContext();
  if (!context.user || !context.profile) {
    return { authorized: false, error: 'Unauthorized: Staff authentication required.' };
  }
  const profile = context.profile;
  const admin = createAdminClient();

  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select(`
      id,
      title,
      category,
      department_id,
      capacity,
      status,
      department:departments(id, name, code)
    `)
    .eq('id', courseId)
    .single();

  if (courseErr || !course) {
    return { authorized: false, error: 'Course not found.' };
  }

  const role = profile.role;
  const isLeadership = ['president', 'co_president', 'branch_head'].includes(role);
  const isOwningHead =
    (role === 'committee_head' || role === 'committee_co_head') &&
    profile.department_id === course.department_id;

  if (isLeadership || isOwningHead) {
    return { authorized: true, course, profile, admin };
  }

  // Check if assigned instructor
  const { data: instructor } = await admin
    .from('course_instructors')
    .select('id')
    .eq('course_id', courseId)
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (instructor) {
    return { authorized: true, course, profile, admin };
  }

  return { authorized: false, error: 'Permission denied for this course.' };
}

/**
 * 1. Fetch Course Groups and Student Roster with Group tracking
 */
export async function getCourseGroupsData(courseId: string): Promise<{
  success: boolean;
  data?: CourseGroupsPageData;
  error?: string;
}> {
  try {
    const access = await verifyGroupAccess(courseId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const { admin, course, profile } = access;
    const isLeadership = ['president', 'co_president', 'branch_head'].includes(profile.role);
    const isOwningHead =
      (profile.role === 'committee_head' || profile.role === 'committee_co_head') &&
      profile.department_id === course.department_id;
    const canManage = isLeadership || isOwningHead;

    // 1. Fetch Groups for this course
    const { data: rawGroups, error: groupsErr } = await admin
      .from('course_groups')
      .select('*')
      .eq('course_id', courseId)
      .order('group_number', { ascending: true })
      .order('name', { ascending: true });

    if (groupsErr) {
      console.error('getCourseGroupsData groupsErr:', groupsErr);
    }

    // 2. Fetch all confirmed enrollments with student profile info
    const { data: rawEnrollments, error: enrollErr } = await admin
      .from('course_enrollments')
      .select(`
        id,
        course_id,
        student_id,
        status,
        group_id,
        joined_group_at,
        group_assigned_at,
        enrolled_at,
        confirmed_at,
        student:student_profiles(
          id,
          full_name_en,
          full_name_ar,
          email,
          phone,
          whatsapp_number,
          university,
          faculty,
          department_major,
          academic_year,
          avatar_url
        )
      `)
      .eq('course_id', courseId)
      .eq('status', 'confirmed')
      .order('enrolled_at', { ascending: true });

    if (enrollErr) {
      console.error('getCourseGroupsData enrollErr:', enrollErr);
      return { success: false, error: enrollErr.message };
    }

    const groupsMap = new Map<string, CourseGroup>();
    (rawGroups || []).forEach((g: any) => {
      groupsMap.set(g.id, {
        ...g,
        assigned_count: 0,
        joined_count: 0,
      });
    });

    const students: GroupStudentItem[] = (rawEnrollments || []).map((e: any) => {
      const sp = Array.isArray(e.student) ? e.student[0] : e.student;
      const grp = e.group_id ? groupsMap.get(e.group_id) : null;

      if (grp) {
        grp.assigned_count = (grp.assigned_count || 0) + 1;
        if (e.joined_group_at) {
          grp.joined_count = (grp.joined_count || 0) + 1;
        }
      }

      return {
        enrollment_id: e.id,
        student_id: e.student_id,
        full_name_en: sp?.full_name_en || null,
        full_name_ar: sp?.full_name_ar || null,
        email: sp?.email || 'No email',
        phone: sp?.phone || null,
        whatsapp_number: sp?.whatsapp_number || sp?.phone || null,
        faculty: sp?.faculty || null,
        department_major: sp?.department_major || null,
        academic_year: sp?.academic_year ? Number(sp.academic_year) : null,
        avatar_url: sp?.avatar_url || null,
        group_id: e.group_id || null,
        group_name: grp ? grp.name : null,
        group_assigned_at: e.group_assigned_at || null,
        joined_group_at: e.joined_group_at || null,
        enrolled_at: e.enrolled_at,
      };
    });

    const dept = Array.isArray(course.department) ? course.department[0] : course.department;

    return {
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title,
          category: course.category,
          department_name: dept?.name,
          department_code: dept?.code,
          confirmed_count: students.length,
          capacity: course.capacity,
        },
        groups: Array.from(groupsMap.values()),
        students,
        canManage,
      },
    };
  } catch (err: any) {
    console.error('getCourseGroupsData exception:', err);
    return { success: false, error: err.message || 'Failed to load course groups.' };
  }
}

/**
 * 2. Create a new Course Group
 */
export async function createCourseGroupAction(input: {
  courseId: string;
  name: string;
  max_capacity?: number;
  invitation_link?: string | null;
  notes?: string | null;
}): Promise<{ success: boolean; group?: CourseGroup; error?: string }> {
  try {
    const access = await verifyGroupAccess(input.courseId);
    if (!access.authorized) return { success: false, error: access.error };

    const { admin } = access;

    // Get latest group_number
    const { data: maxGrp } = await admin
      .from('course_groups')
      .select('group_number')
      .eq('course_id', input.courseId)
      .order('group_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNum = (maxGrp?.group_number || 0) + 1;

    const { data: newGrp, error: insertErr } = await admin
      .from('course_groups')
      .insert({
        course_id: input.courseId,
        name: input.name.trim(),
        group_number: nextNum,
        max_capacity: input.max_capacity && input.max_capacity > 0 ? input.max_capacity : 50,
        invitation_link: input.invitation_link?.trim() || null,
        notes: input.notes?.trim() || null,
      })
      .select('*')
      .single();

    if (insertErr || !newGrp) {
      return { success: false, error: insertErr?.message || 'Failed to create group.' };
    }

    revalidatePath(`/student-portal/admin/courses/${input.courseId}/groups`);
    revalidatePath(`/student/courses/${input.courseId}`);

    return {
      success: true,
      group: {
        ...newGrp,
        assigned_count: 0,
        joined_count: 0,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 3. Update an existing Course Group
 */
export async function updateCourseGroupAction(input: {
  groupId: string;
  courseId: string;
  name: string;
  max_capacity?: number;
  invitation_link?: string | null;
  notes?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyGroupAccess(input.courseId);
    if (!access.authorized) return { success: false, error: access.error };

    const { admin } = access;

    const { error: updErr } = await admin
      .from('course_groups')
      .update({
        name: input.name.trim(),
        max_capacity: input.max_capacity && input.max_capacity > 0 ? input.max_capacity : 50,
        invitation_link: input.invitation_link?.trim() || null,
        notes: input.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.groupId)
      .eq('course_id', input.courseId);

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${input.courseId}/groups`);
    revalidatePath(`/student/courses/${input.courseId}`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 4. Delete a Course Group (Students in this group will be unassigned automatically)
 */
export async function deleteCourseGroupAction(input: {
  groupId: string;
  courseId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyGroupAccess(input.courseId);
    if (!access.authorized) return { success: false, error: access.error };

    const { admin } = access;

    // Unassign students from this group
    await admin
      .from('course_enrollments')
      .update({
        group_id: null,
        group_assigned_at: null,
        joined_group_at: null,
      })
      .eq('group_id', input.groupId);

    // Delete group
    const { error: delErr } = await admin
      .from('course_groups')
      .delete()
      .eq('id', input.groupId)
      .eq('course_id', input.courseId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    revalidatePath(`/student-portal/admin/courses/${input.courseId}/groups`);
    revalidatePath(`/student/courses/${input.courseId}`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 5. Assign or Change a Student's Group
 */
export async function assignStudentToGroupAction(input: {
  enrollmentId: string;
  groupId: string | null;
  courseId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyGroupAccess(input.courseId);
    if (!access.authorized) return { success: false, error: access.error };

    const { admin, course } = access;

    const { data: updatedEnrollment, error: updErr } = await admin
      .from('course_enrollments')
      .update({
        group_id: input.groupId,
        group_assigned_at: input.groupId ? new Date().toISOString() : null,
        // Reset joined status if changing to a different group or unassigning
        joined_group_at: null,
      })
      .eq('id', input.enrollmentId)
      .eq('course_id', input.courseId)
      .select('student_id')
      .single();

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    // Dispatch notification to student if assigned to a group
    if (input.groupId && updatedEnrollment?.student_id) {
      const { data: grp } = await admin
        .from('course_groups')
        .select('name')
        .eq('id', input.groupId)
        .maybeSingle();

      const groupName = grp?.name || 'Study Group';
      const courseTitle = course.title || 'the track';

      dispatchStudentNotification({
        studentId: updatedEnrollment.student_id,
        type: 'course',
        title: `Group Assigned: ${courseTitle}`,
        message: `You have been assigned to "${groupName}" in "${courseTitle}". Open your course page now to join the WhatsApp group and meet your peers!`,
        linkUrl: `/student/courses/${input.courseId}`,
        relatedEntityType: 'course',
        relatedEntityId: input.courseId,
      }).catch((notifErr) => console.warn('dispatchStudentNotification assign warning:', notifErr));
    }

    revalidatePath(`/student-portal/admin/courses/${input.courseId}/groups`);
    revalidatePath(`/student/courses/${input.courseId}`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 6. Smart Auto-Distribution: Splits all confirmed students into groups of X (e.g. 50 students per group)
 */
export async function autoDistributeStudentsToGroupsAction(input: {
  courseId: string;
  groupCapacity: number; // e.g. 50
  groupPrefix?: string; // e.g. "Group" or "مجموعة"
  onlyUnassigned?: boolean; // if true, only distribute students who don't have a group yet
  strategy?: 'fifo' | 'alphabetical' | 'faculty';
}): Promise<{
  success: boolean;
  totalAssigned?: number;
  groupsCreated?: number;
  error?: string;
}> {
  try {
    const access = await verifyGroupAccess(input.courseId);
    if (!access.authorized) return { success: false, error: access.error };

    const { admin, course } = access;
    const capacity = input.groupCapacity && input.groupCapacity > 0 ? input.groupCapacity : 50;
    const prefix = input.groupPrefix?.trim() || 'Group';

    // 1. Fetch confirmed enrollments
    let query = admin
      .from('course_enrollments')
      .select(`
        id,
        student_id,
        group_id,
        enrolled_at,
        student:student_profiles(
          full_name_en,
          full_name_ar,
          faculty,
          academic_year
        )
      `)
      .eq('course_id', input.courseId)
      .eq('status', 'confirmed');

    if (input.onlyUnassigned) {
      query = query.is('group_id', null);
    }

    const { data: enrollments, error: fetchErr } = await query;

    if (fetchErr || !enrollments || enrollments.length === 0) {
      return {
        success: false,
        error: enrollments?.length === 0 ? 'No eligible confirmed students found to distribute.' : fetchErr?.message,
      };
    }

    // Sort according to strategy
    const sorted = [...enrollments].sort((a: any, b: any) => {
      const spA = Array.isArray(a.student) ? a.student[0] : a.student;
      const spB = Array.isArray(b.student) ? b.student[0] : b.student;

      if (input.strategy === 'alphabetical') {
        const nameA = spA?.full_name_en || spA?.full_name_ar || '';
        const nameB = spB?.full_name_en || spB?.full_name_ar || '';
        return nameA.localeCompare(nameB, 'ar');
      } else if (input.strategy === 'faculty') {
        const facA = spA?.faculty || '';
        const facB = spB?.faculty || '';
        if (facA !== facB) return facA.localeCompare(facB, 'ar');
        return (spA?.academic_year || 0) - (spB?.academic_year || 0);
      }
      // default: FIFO
      return new Date(a.enrolled_at).getTime() - new Date(b.enrolled_at).getTime();
    });

    // 2. Fetch existing groups
    const { data: existingGroups } = await admin
      .from('course_groups')
      .select('*')
      .eq('course_id', input.courseId)
      .order('group_number', { ascending: true });

    let activeGroups: any[] = existingGroups || [];
    let groupsCreatedCount = 0;

    // Calculate how many total groups needed
    const totalStudents = sorted.length;
    const groupsNeeded = Math.ceil(totalStudents / capacity);

    if (activeGroups.length < groupsNeeded) {
      const neededMore = groupsNeeded - activeGroups.length;
      const startNum = activeGroups.length + 1;

      const newGroupsToInsert = [];
      for (let i = 0; i < neededMore; i++) {
        const num = startNum + i;
        newGroupsToInsert.push({
          course_id: input.courseId,
          name: `${prefix} ${num}`,
          group_number: num,
          max_capacity: capacity,
          invitation_link: null,
          notes: null,
        });
      }

      const { data: created, error: createErr } = await admin
        .from('course_groups')
        .insert(newGroupsToInsert)
        .select('*');

      if (createErr) {
        return { success: false, error: createErr.message };
      }

      groupsCreatedCount = created?.length || 0;
      activeGroups = [...activeGroups, ...(created || [])];
    }

    // 3. Distribute chunks of students into activeGroups
    const nowIso = new Date().toISOString();
    let assignedCount = 0;
    const notifsToSend: Array<{ studentId: string; groupName: string }> = [];

    for (let i = 0; i < sorted.length; i++) {
      const groupIdx = Math.floor(i / capacity);
      const targetGroup = activeGroups[groupIdx] || activeGroups[activeGroups.length - 1];

      if (targetGroup) {
        const enrollment = sorted[i];
        const { error: updErr } = await admin
          .from('course_enrollments')
          .update({
            group_id: targetGroup.id,
            group_assigned_at: nowIso,
          })
          .eq('id', enrollment.id);

        if (!updErr) {
          assignedCount++;
          if (enrollment.student_id) {
            notifsToSend.push({
              studentId: enrollment.student_id,
              groupName: targetGroup.name,
            });
          }
        }
      }
    }

    // Dispatch notifications in background
    if (notifsToSend.length > 0) {
      const courseTitle = course.title || 'the track';
      Promise.allSettled(
        notifsToSend.map(({ studentId, groupName }) =>
          dispatchStudentNotification({
            studentId,
            type: 'course',
            title: `Group Assigned: ${courseTitle}`,
            message: `You have been assigned to "${groupName}" in "${courseTitle}". Open your course page now to join the WhatsApp group!`,
            linkUrl: `/student/courses/${input.courseId}`,
            relatedEntityType: 'course',
            relatedEntityId: input.courseId,
          })
        )
      ).catch((notifErr) => console.warn('dispatchStudentNotification auto-distribute warning:', notifErr));
    }

    revalidatePath(`/student-portal/admin/courses/${input.courseId}/groups`);
    revalidatePath(`/student/courses/${input.courseId}`);

    return {
      success: true,
      totalAssigned: assignedCount,
      groupsCreated: groupsCreatedCount,
    };
  } catch (err: any) {
    console.error('autoDistributeStudentsToGroupsAction exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 7. Bulk Assign selected students to a specific group
 */
export async function bulkAssignStudentsToGroupAction(input: {
  courseId: string;
  enrollmentIds: string[];
  groupId: string | null;
}): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const access = await verifyGroupAccess(input.courseId);
    if (!access.authorized) return { success: false, error: access.error };

    const { admin, course } = access;
    if (!input.enrollmentIds || input.enrollmentIds.length === 0) {
      return { success: false, error: 'No students selected.' };
    }

    const nowIso = new Date().toISOString();
    const { data: updatedEnrollments, error: updErr } = await admin
      .from('course_enrollments')
      .update({
        group_id: input.groupId,
        group_assigned_at: input.groupId ? nowIso : null,
        joined_group_at: null,
      })
      .in('id', input.enrollmentIds)
      .eq('course_id', input.courseId)
      .select('student_id');

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    // Dispatch notifications if assigned to a group
    if (input.groupId && updatedEnrollments && updatedEnrollments.length > 0) {
      const { data: grp } = await admin
        .from('course_groups')
        .select('name')
        .eq('id', input.groupId)
        .maybeSingle();

      const groupName = grp?.name || 'Study Group';
      const courseTitle = course.title || 'the track';

      Promise.allSettled(
        updatedEnrollments.map((e) =>
          dispatchStudentNotification({
            studentId: e.student_id,
            type: 'course',
            title: `Group Assigned: ${courseTitle}`,
            message: `You have been assigned to "${groupName}" in "${courseTitle}". Open your course page now to join the WhatsApp group!`,
            linkUrl: `/student/courses/${input.courseId}`,
            relatedEntityType: 'course',
            relatedEntityId: input.courseId,
          })
        )
      ).catch((notifErr) => console.warn('dispatchStudentNotification bulk assign warning:', notifErr));
    }

    revalidatePath(`/student-portal/admin/courses/${input.courseId}/groups`);
    revalidatePath(`/student/courses/${input.courseId}`);

    return { success: true, count: input.enrollmentIds.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 8. Student tracks joining their study group link
 */
export async function trackCourseGroupJoinAction(input: {
  courseId: string;
}): Promise<{ success: boolean; invitation_link?: string | null; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { success: false, error: 'Student authentication required.' };
    }

    const studentId = context.user.id;
    const admin = createAdminClient();

    // 1. Fetch student enrollment with group info
    const { data: enrollment, error: fetchErr } = await admin
      .from('course_enrollments')
      .select(`
        id,
        group_id,
        group:course_groups(
          id,
          name,
          invitation_link
        )
      `)
      .eq('course_id', input.courseId)
      .eq('student_id', studentId)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (fetchErr || !enrollment || !enrollment.group_id) {
      return { success: false, error: 'No group assigned yet for your enrollment.' };
    }

    // 2. Mark joined_group_at timestamp
    await admin
      .from('course_enrollments')
      .update({
        joined_group_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id);

    const grp = Array.isArray(enrollment.group) ? enrollment.group[0] : enrollment.group;

    revalidatePath(`/student/courses/${input.courseId}`);

    return {
      success: true,
      invitation_link: grp?.invitation_link || null,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Sends a test confirmation email for a specific course group to verify styling and WhatsApp link.
 */
export async function sendTestGroupEmailAction(input: {
  courseId: string;
  groupId: string;
  testEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await verifyGroupAccess(input.courseId);
    if (!access.authorized || !access.course) {
      return { success: false, error: access.error };
    }

    const { course, admin } = access;

    const { data: group, error: groupErr } = await admin
      .from('course_groups')
      .select('name, invitation_link')
      .eq('id', input.groupId)
      .eq('course_id', input.courseId)
      .single();

    if (groupErr || !group) {
      return { success: false, error: 'Course group not found.' };
    }

    const result = await sendCourseEnrollmentConfirmedEmail({
      to: input.testEmail.trim(),
      studentName: 'Test Student (Preview)',
      courseTitle: course.title,
      courseCategory: course.category,
      courseId: input.courseId,
      whatsappGroupLink: group.invitation_link || null,
      whatsappGroupName: group.name || null,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to send test email.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('sendTestGroupEmailAction error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends confirmation emails to all confirmed students assigned to a specific course group.
 */
export async function sendGroupConfirmationEmailsAction(input: {
  courseId: string;
  groupId: string;
}): Promise<{
  success: boolean;
  sentCount?: number;
  failedCount?: number;
  totalStudents?: number;
  error?: string;
}> {
  try {
    const access = await verifyGroupAccess(input.courseId);
    if (!access.authorized || !access.course) {
      return { success: false, error: access.error };
    }

    const { course, admin } = access;

    // 1. Fetch group details
    const { data: group, error: groupErr } = await admin
      .from('course_groups')
      .select('id, name, invitation_link')
      .eq('id', input.groupId)
      .eq('course_id', input.courseId)
      .single();

    if (groupErr || !group) {
      return { success: false, error: 'Course group not found.' };
    }

    // 2. Fetch all confirmed students in this group
    const { data: enrollments, error: enrollErr } = await admin
      .from('course_enrollments')
      .select(`
        student_id,
        student:student_profiles!course_enrollments_student_id_fkey(
          id, full_name_en, full_name_ar, email
        )
      `)
      .eq('course_id', input.courseId)
      .eq('group_id', input.groupId)
      .eq('status', 'confirmed');

    if (enrollErr) {
      return { success: false, error: enrollErr.message };
    }

    if (!enrollments || enrollments.length === 0) {
      return { success: false, error: 'No confirmed students are assigned to this group yet.' };
    }

    // 3. Dispatch emails in parallel
    const results = await Promise.allSettled(
      enrollments.map(async (e: any) => {
        const stu = Array.isArray(e.student) ? e.student[0] : e.student;
        if (!stu?.email) throw new Error('No email found');
        return sendCourseEnrollmentConfirmedEmail({
          to: stu.email,
          studentName: stu.full_name_en || stu.full_name_ar || 'Student',
          courseTitle: course.title,
          courseCategory: course.category,
          courseId: input.courseId,
          whatsappGroupLink: group.invitation_link || null,
          whatsappGroupName: group.name || null,
        });
      })
    );

    const sentCount = results.filter(
      (r) => r.status === 'fulfilled' && (r as any).value?.success !== false
    ).length;
    const failedCount = enrollments.length - sentCount;

    return {
      success: true,
      sentCount,
      failedCount,
      totalStudents: enrollments.length,
    };
  } catch (err: any) {
    console.error('sendGroupConfirmationEmailsAction error:', err);
    return { success: false, error: err.message };
  }
}

