'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { EnrollmentStatus } from '@/types/student';
import { dispatchStudentNotification } from '@/app/student/notifications/actions';

export interface EnrollmentStudentItem {
  id: string; // enrollment id
  course_id: string;
  student_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  confirmed_at: string | null;
  confirmed_by_name?: string | null;
  student: {
    id: string;
    full_name_en: string | null;
    full_name_ar: string | null;
    email: string;
    phone: string | null;
    whatsapp_number: string | null;
    university: string;
    faculty: string | null;
    department_major: string | null;
    academic_year: number | null;
    qr_code: string;
    avatar_url: string | null;
  };
}

export interface CourseEnrollmentsHeader {
  id: string;
  title: string;
  category: string | null;
  department_id: string | null;
  department_name?: string;
  department_code?: string;
  capacity: number | null;
  enrollment_type: 'open' | 'gated';
  status: string;
  total_enrolled: number;
  confirmed_count: number;
  pending_count: number;
  waitlisted_count: number;
  rejected_count: number;
  is_full: boolean;
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

/**
 * Access verification for course enrollment management
 */
async function verifyEnrollmentAccess(courseId: string): Promise<AccessResult> {
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
      enrollment_type,
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

  if (isPresident || isOwningHead) {
    return { authorized: true, course, profile, admin };
  }

  // Check if assigned instructor
  const { data: instructorRow } = await admin
    .from('course_instructors')
    .select('id, role')
    .eq('course_id', courseId)
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (instructorRow && instructorRow.role === 'instructor') {
    return { authorized: true, course, profile, admin };
  }

  return {
    authorized: false,
    error: 'Access denied: Only course instructors or committee leadership can manage enrollments.',
  };
}

/**
 * 1. Fetch course enrollments roster grouped by status
 */
export async function getCourseEnrollmentsRoster(courseId: string): Promise<{
  success: boolean;
  header?: CourseEnrollmentsHeader;
  enrollments?: EnrollmentStudentItem[];
  canManage?: boolean;
  error?: string;
}> {
  try {
    const access = await verifyEnrollmentAccess(courseId);
    if (!access.authorized || !access.course) {
      return { success: false, error: access.error };
    }

    const { course, admin } = access;
    const dept = Array.isArray(course.department) ? course.department[0] : course.department;

    // Fetch enrollments joined with student_profiles
    const { data: enrollmentsData, error: enrollErr } = await admin
      .from('course_enrollments')
      .select(`
        id,
        course_id,
        student_id,
        status,
        enrolled_at,
        confirmed_at,
        confirmed_by,
        student:student_profiles!course_enrollments_student_id_fkey(
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
          qr_code,
          avatar_url
        )
      `)
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: true });

    if (enrollErr) {
      console.error('getCourseEnrollmentsRoster error:', enrollErr);
      return { success: false, error: enrollErr.message };
    }

    const list = enrollmentsData || [];
    const confirmedCount = list.filter((e: any) => e.status === 'confirmed').length;
    const pendingCount = list.filter((e: any) => e.status === 'pending').length;
    const waitlistedCount = list.filter((e: any) => e.status === 'waitlisted').length;
    const rejectedCount = list.filter((e: any) => e.status === 'rejected' || e.status === 'withdrawn').length;

    const isFull = Boolean(course.capacity && confirmedCount >= course.capacity);

    const header: CourseEnrollmentsHeader = {
      id: course.id,
      title: course.title,
      category: course.category,
      department_id: course.department_id,
      department_name: dept?.name,
      department_code: dept?.code,
      capacity: course.capacity,
      enrollment_type: course.enrollment_type,
      status: course.status,
      total_enrolled: list.length,
      confirmed_count: confirmedCount,
      pending_count: pendingCount,
      waitlisted_count: waitlistedCount,
      rejected_count: rejectedCount,
      is_full: isFull,
    };

    const enrollments: EnrollmentStudentItem[] = list.map((item: any) => {
      const stu = Array.isArray(item.student) ? item.student[0] : item.student;
      return {
        id: item.id,
        course_id: item.course_id,
        student_id: item.student_id,
        status: item.status,
        enrolled_at: item.enrolled_at,
        confirmed_at: item.confirmed_at,
        student: {
          id: stu?.id || item.student_id,
          full_name_en: stu?.full_name_en || 'Student Member',
          full_name_ar: stu?.full_name_ar || null,
          email: stu?.email || '',
          phone: stu?.phone || null,
          whatsapp_number: stu?.whatsapp_number || stu?.phone || null,
          university: stu?.university || 'Helwan National University',
          faculty: stu?.faculty || null,
          department_major: stu?.department_major || null,
          academic_year: stu?.academic_year || 1,
          qr_code: stu?.qr_code || 'STU-PASSPORT',
          avatar_url: stu?.avatar_url || null,
        },
      };
    });

    return {
      success: true,
      header,
      enrollments,
      canManage: true,
    };
  } catch (err: any) {
    console.error('getCourseEnrollmentsRoster exception:', err);
    return { success: false, error: err.message || 'Failed to load course enrollments.' };
  }
}

/**
 * Helper: Advance the first waitlisted student when a confirmed spot becomes available
 */
async function autoAdvanceWaitlist(admin: ReturnType<typeof createAdminClient>, courseId: string, capacity: number | null) {
  if (!capacity) return null;

  // Check current confirmed count
  const { count: confirmedCount } = await admin
    .from('course_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'confirmed');

  if ((confirmedCount || 0) < capacity) {
    // Find the oldest waitlisted student
    const { data: nextWaitlisted } = await admin
      .from('course_enrollments')
      .select('id, student_id')
      .eq('course_id', courseId)
      .eq('status', 'waitlisted')
      .order('enrolled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextWaitlisted) {
      await admin
        .from('course_enrollments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', nextWaitlisted.id);

      // Fetch course title and notify promoted student in English
      const { data: c } = await admin.from('courses').select('title').eq('id', courseId).single();
      const courseTitle = c?.title || 'the track';

      dispatchStudentNotification({
        studentId: nextWaitlisted.student_id,
        type: 'course',
        title: `Spot Available: ${courseTitle}`,
        message: `Great news! A seat has opened up and you have been automatically promoted from the waitlist to confirmed enrollment in "${courseTitle}". Welcome aboard!`,
        linkUrl: `/student/courses/${courseId}`,
        relatedEntityType: 'course',
        relatedEntityId: courseId,
      }).catch((notifErr) => console.warn('dispatchStudentNotification waitlist warning:', notifErr));

      return nextWaitlisted.id;
    }
  }

  return null;
}

/**
 * 2. Approve a pending enrollment application
 */
export async function approveCourseEnrollment(courseId: string, enrollmentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const access = await verifyEnrollmentAccess(courseId);
    if (!access.authorized || !access.course) {
      return { success: false, error: access.error };
    }

    const { course, profile, admin } = access;

    // Check capacity
    if (course.capacity) {
      const { count: confirmedCount } = await admin
        .from('course_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'confirmed');

      if ((confirmedCount || 0) >= course.capacity) {
        return {
          success: false,
          error: `Course capacity reached (${course.capacity} seats). Increase capacity or waitlist this applicant.`,
        };
      }
    }

    const { data: updatedEnrollment, error: updateErr } = await admin
      .from('course_enrollments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
      .eq('course_id', courseId)
      .select('student_id')
      .single();

    if (updateErr) {
      console.error('approveCourseEnrollment error:', updateErr);
      return { success: false, error: updateErr.message };
    }

    // Notify student in English
    if (updatedEnrollment?.student_id) {
      dispatchStudentNotification({
        studentId: updatedEnrollment.student_id,
        type: 'course',
        title: `Enrollment Confirmed: ${course.title}`,
        message: `Congratulations! Your application to enroll in "${course.title}" has been reviewed and approved by course instructors. You can now access all lectures, study materials, and assignments.`,
        linkUrl: `/student/courses/${courseId}`,
        relatedEntityType: 'course',
        relatedEntityId: courseId,
      }).catch((notifErr) => console.warn('dispatchStudentNotification approve warning:', notifErr));
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/enrollments`);
    revalidatePath(`/student/courses/${courseId}`);
    revalidatePath(`/student/courses`);
    revalidatePath(`/student/dashboard`);

    return { success: true };
  } catch (err: any) {
    console.error('approveCourseEnrollment exception:', err);
    return { success: false, error: err.message || 'Failed to approve enrollment.' };
  }
}

/**
 * 3. Reject / remove an enrollment (and automatically promote waitlisted student if a confirmed spot opens)
 */
export async function rejectCourseEnrollment(
  courseId: string,
  enrollmentId: string,
  reason?: string
): Promise<{
  success: boolean;
  promotedWaitlistId?: string | null;
  error?: string;
}> {
  try {
    const access = await verifyEnrollmentAccess(courseId);
    if (!access.authorized || !access.course) {
      return { success: false, error: access.error };
    }

    const { course, admin } = access;

    // Check previous status of the enrollment
    const { data: targetEnrollment } = await admin
      .from('course_enrollments')
      .select('status')
      .eq('id', enrollmentId)
      .single();

    const wasConfirmed = targetEnrollment?.status === 'confirmed';

    const { data: rejectedEnrollment, error: updateErr } = await admin
      .from('course_enrollments')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
      .eq('course_id', courseId)
      .select('student_id')
      .single();

    if (updateErr) {
      console.error('rejectCourseEnrollment error:', updateErr);
      return { success: false, error: updateErr.message };
    }

    // Notify student in English
    if (rejectedEnrollment?.student_id) {
      dispatchStudentNotification({
        studentId: rejectedEnrollment.student_id,
        type: 'course',
        title: `Enrollment Update: ${course.title}`,
        message: reason
          ? `Thank you for your interest in "${course.title}". Unfortunately, your application could not be accepted at this time. Note from instructors: "${reason}".`
          : `Thank you for your interest in "${course.title}". Unfortunately, your application could not be accepted at this time due to high volume and seat capacity constraints. We encourage you to apply for upcoming tracks!`,
        linkUrl: `/student/courses`,
        relatedEntityType: 'course',
        relatedEntityId: courseId,
      }).catch((notifErr) => console.warn('dispatchStudentNotification reject warning:', notifErr));
    }

    // If was confirmed, automatically advance the next waitlisted student!
    let promotedId: string | null = null;
    if (wasConfirmed) {
      promotedId = await autoAdvanceWaitlist(admin, courseId, course.capacity);
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/enrollments`);
    revalidatePath(`/student/courses/${courseId}`);
    revalidatePath(`/student/courses`);
    revalidatePath(`/student/dashboard`);

    return { success: true, promotedWaitlistId: promotedId };
  } catch (err: any) {
    console.error('rejectCourseEnrollment exception:', err);
    return { success: false, error: err.message || 'Failed to reject enrollment.' };
  }
}

/**
 * 4. Manually promote a waitlisted student to confirmed
 */
export async function promoteWaitlistStudent(courseId: string, enrollmentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const access = await verifyEnrollmentAccess(courseId);
    if (!access.authorized || !access.course) {
      return { success: false, error: access.error };
    }

    const { profile, admin } = access;

    const { data: promotedEnrollment, error: updateErr } = await admin
      .from('course_enrollments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
      .eq('course_id', courseId)
      .select('student_id')
      .single();

    if (updateErr) {
      console.error('promoteWaitlistStudent error:', updateErr);
      return { success: false, error: updateErr.message };
    }

    // Notify student in English
    if (promotedEnrollment?.student_id) {
      const { data: c } = await admin.from('courses').select('title').eq('id', courseId).single();
      const courseTitle = c?.title || 'the track';

      dispatchStudentNotification({
        studentId: promotedEnrollment.student_id,
        type: 'course',
        title: `Spot Available: ${courseTitle}`,
        message: `Great news! A seat has opened up and your enrollment in "${courseTitle}" is now confirmed. Welcome to the course!`,
        linkUrl: `/student/courses/${courseId}`,
        relatedEntityType: 'course',
        relatedEntityId: courseId,
      }).catch((notifErr) => console.warn('dispatchStudentNotification promote warning:', notifErr));
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/enrollments`);
    revalidatePath(`/student/courses/${courseId}`);
    revalidatePath(`/student/courses`);
    revalidatePath(`/student/dashboard`);

    return { success: true };
  } catch (err: any) {
    console.error('promoteWaitlistStudent exception:', err);
    return { success: false, error: err.message || 'Failed to promote waitlisted student.' };
  }
}

/**
 * 5. Delete an enrollment record completely (e.g. from Rejected list) so student can apply again
 */
export async function removeCourseEnrollment(courseId: string, enrollmentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const access = await verifyEnrollmentAccess(courseId);
    if (!access.authorized || !access.course) {
      return { success: false, error: access.error };
    }

    const { admin, course } = access;

    // Check if enrollment exists and was confirmed
    const { data: target } = await admin
      .from('course_enrollments')
      .select('status')
      .eq('id', enrollmentId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!target) {
      return { success: false, error: 'Enrollment not found.' };
    }

    const wasConfirmed = target.status === 'confirmed';

    const { error: delErr } = await admin
      .from('course_enrollments')
      .delete()
      .eq('id', enrollmentId)
      .eq('course_id', courseId);

    if (delErr) {
      console.error('removeCourseEnrollment error:', delErr);
      return { success: false, error: delErr.message };
    }

    // If deleting a confirmed student, auto-advance next waitlisted student
    if (wasConfirmed) {
      await autoAdvanceWaitlist(admin, courseId, course.capacity);
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/enrollments`);
    revalidatePath(`/student/courses/${courseId}`);
    revalidatePath(`/student/courses`);
    revalidatePath(`/student/dashboard`);

    return { success: true };
  } catch (err: any) {
    console.error('removeCourseEnrollment exception:', err);
    return { success: false, error: err.message || 'Failed to remove enrollment.' };
  }
}

/**
 * 6. Reset an enrollment status back to 'pending' (e.g. from Rejected or Waitlisted) for re-review
 */
export async function resetEnrollmentToPending(courseId: string, enrollmentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const access = await verifyEnrollmentAccess(courseId);
    if (!access.authorized || !access.course) {
      return { success: false, error: access.error };
    }

    const { admin, course } = access;

    const { data: target } = await admin
      .from('course_enrollments')
      .select('status')
      .eq('id', enrollmentId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!target) {
      return { success: false, error: 'Enrollment not found.' };
    }

    const wasConfirmed = target.status === 'confirmed';

    const { error: updateErr } = await admin
      .from('course_enrollments')
      .update({
        status: 'pending',
        confirmed_at: null,
        confirmed_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
      .eq('course_id', courseId);

    if (updateErr) {
      console.error('resetEnrollmentToPending error:', updateErr);
      return { success: false, error: updateErr.message };
    }

    // If was confirmed, advance waitlist
    if (wasConfirmed) {
      await autoAdvanceWaitlist(admin, courseId, course.capacity);
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/enrollments`);
    revalidatePath(`/student/courses/${courseId}`);
    revalidatePath(`/student/courses`);
    revalidatePath(`/student/dashboard`);

    return { success: true };
  } catch (err: any) {
    console.error('resetEnrollmentToPending exception:', err);
    return { success: false, error: err.message || 'Failed to reset enrollment.' };
  }
}

