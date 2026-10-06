'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { EnrollmentStatus } from '@/types/student';
import { dispatchStudentNotification } from '@/app/student/notifications/actions';
import { sendCourseEnrollmentConfirmedEmail } from '@/lib/email/service';


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

    // Notify student + send confirmation email (fire & forget)
    if (updatedEnrollment?.student_id) {
      const studentId = updatedEnrollment.student_id;

      dispatchStudentNotification({
        studentId,
        type: 'course',
        title: `Enrollment Confirmed: ${course.title}`,
        message: `Congratulations! Your application to enroll in "${course.title}" has been reviewed and approved by course instructors. You can now access all lectures, study materials, and assignments.`,
        linkUrl: `/student/courses/${courseId}`,
        relatedEntityType: 'course',
        relatedEntityId: courseId,
      }).catch((notifErr) => console.warn('dispatchStudentNotification approve warning:', notifErr));

      // Fetch student profile + assigned WhatsApp group for email
      ;(async () => {
        try {
          const { data: stu } = await admin
            .from('student_profiles')
            .select('full_name_en, email')
            .eq('id', studentId)
            .maybeSingle();

          if (!stu?.email) return;

          // Check if student already has a group assigned
          const { data: enrollment } = await admin
            .from('course_enrollments')
            .select('group_id')
            .eq('course_id', courseId)
            .eq('student_id', studentId)
            .maybeSingle();

          let whatsappLink: string | null = null;
          let whatsappName: string | null = null;

          if (enrollment?.group_id) {
            const { data: grp } = await admin
              .from('course_groups')
              .select('name, whatsapp_link')
              .eq('id', enrollment.group_id)
              .maybeSingle();
            whatsappLink = grp?.whatsapp_link || null;
            whatsappName = grp?.name || null;
          }

          await sendCourseEnrollmentConfirmedEmail({
            to: stu.email,
            studentName: stu.full_name_en || 'Student',
            courseTitle: course.title,
            courseCategory: course.category,
            courseId,
            whatsappGroupLink: whatsappLink,
            whatsappGroupName: whatsappName,
          });
        } catch (emailErr) {
          console.warn('sendCourseEnrollmentConfirmedEmail single-approve error:', emailErr);
        }
      })();
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

/**
 * 7. Move an enrollment to waitlisted status (from pending, confirmed, or rejected)
 */
export async function waitlistCourseEnrollment(
  courseId: string,
  enrollmentId: string,
  reason?: string
): Promise<{
  success: boolean;
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
      .eq('course_id', courseId)
      .single();

    const wasConfirmed = targetEnrollment?.status === 'confirmed';

    const { data: updatedEnrollment, error: updateErr } = await admin
      .from('course_enrollments')
      .update({
        status: 'waitlisted',
        confirmed_at: null,
        confirmed_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
      .eq('course_id', courseId)
      .select('student_id')
      .single();

    if (updateErr) {
      console.error('waitlistCourseEnrollment error:', updateErr);
      return { success: false, error: updateErr.message };
    }

    // Notify student in English
    if (updatedEnrollment?.student_id) {
      dispatchStudentNotification({
        studentId: updatedEnrollment.student_id,
        type: 'course',
        title: `Added to Waitlist: ${course.title}`,
        message: reason
          ? `Your application for "${course.title}" has been placed on the waiting list. Note from instructors: "${reason}". We will notify you immediately if a seat becomes available.`
          : `Your application for "${course.title}" has been placed on the waiting list. As soon as a seat opens up or capacity expands, you will be notified!`,
        linkUrl: `/student/courses/${courseId}`,
        relatedEntityType: 'course',
        relatedEntityId: courseId,
      }).catch((notifErr) => console.warn('dispatchStudentNotification waitlist warning:', notifErr));
    }

    // If was confirmed previously and is now waitlisted, auto-advance next waitlist student
    if (wasConfirmed) {
      await autoAdvanceWaitlist(admin, courseId, course.capacity);
    }

    revalidatePath(`/student-portal/admin/courses/${courseId}/enrollments`);
    revalidatePath(`/student/courses/${courseId}`);
    revalidatePath(`/student/courses`);
    revalidatePath(`/student/dashboard`);

    return { success: true };
  } catch (err: any) {
    console.error('waitlistCourseEnrollment exception:', err);
    return { success: false, error: err.message || 'Failed to waitlist enrollment.' };
  }
}

/**
 * 8. Approve all pending enrollment applications in bulk
 */
export async function approveAllPendingCourseEnrollments(courseId: string): Promise<{
  success: boolean;
  approvedCount?: number;
  message?: string;
  error?: string;
}> {
  try {
    const access = await verifyEnrollmentAccess(courseId);
    if (!access.authorized || !access.course) {
      return { success: false, error: access.error };
    }

    const { course, profile, admin } = access;

    // 1. Fetch all pending enrollments ordered by submission time
    const { data: pendingList, error: fetchErr } = await admin
      .from('course_enrollments')
      .select('id, student_id, enrolled_at')
      .eq('course_id', courseId)
      .eq('status', 'pending')
      .order('enrolled_at', { ascending: true });

    if (fetchErr) {
      return { success: false, error: fetchErr.message };
    }

    if (!pendingList || pendingList.length === 0) {
      return { success: false, error: 'No pending enrollment applications found to approve.' };
    }

    // 2. Check capacity
    let toApprove = pendingList;
    if (course.capacity) {
      const { count: confirmedCount } = await admin
        .from('course_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'confirmed');

      const remainingSeats = Math.max(0, course.capacity - (confirmedCount || 0));

      if (remainingSeats <= 0) {
        return {
          success: false,
          error: `Course capacity is full (${course.capacity} seats). Please expand capacity first or waitlist applicants.`,
        };
      }

      toApprove = pendingList.slice(0, remainingSeats);
    }

    const toApproveIds = toApprove.map((e) => e.id);
    const nowStr = new Date().toISOString();

    // 3. Batch update all approved enrollments
    const { error: updateErr } = await admin
      .from('course_enrollments')
      .update({
        status: 'confirmed',
        confirmed_at: nowStr,
        confirmed_by: profile.id,
        updated_at: nowStr,
      })
      .in('id', toApproveIds);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 4. Send notifications + emails to all approved students in parallel background
    Promise.allSettled(
      toApprove.map((e) =>
        dispatchStudentNotification({
          studentId: e.student_id,
          type: 'course',
          title: `Enrollment Confirmed: ${course.title}`,
          message: `Congratulations! Your application to enroll in "${course.title}" has been approved. You can now access all lectures, study materials, and assignments.`,
          linkUrl: `/student/courses/${courseId}`,
          relatedEntityType: 'course',
          relatedEntityId: courseId,
        })
      )
    ).catch((notifErr) => console.warn('dispatchStudentNotification bulk approve warning:', notifErr));

    // Send confirmation emails with WhatsApp group info in the background
    ;(async () => {
      try {
        const studentIds = toApprove.map((e) => e.student_id);

        // Fetch all student profiles at once
        const { data: profiles } = await admin
          .from('student_profiles')
          .select('id, full_name_en, email')
          .in('id', studentIds);

        // Fetch all enrollments with group info at once
        const { data: enrollments } = await admin
          .from('course_enrollments')
          .select('student_id, group_id')
          .eq('course_id', courseId)
          .in('student_id', studentIds);

        // Fetch all groups that are referenced
        const groupIds = [...new Set(
          (enrollments || []).map((e: any) => e.group_id).filter(Boolean)
        )];
        const { data: groups } = groupIds.length
          ? await admin
              .from('course_groups')
              .select('id, name, whatsapp_link')
              .in('id', groupIds)
          : { data: [] };

        const groupMap: Record<string, { name: string; whatsapp_link: string }> = {};
        for (const g of groups || []) {
          groupMap[g.id] = g;
        }
        const enrollmentGroupMap: Record<string, string | null> = {};
        for (const e of enrollments || []) {
          enrollmentGroupMap[(e as any).student_id] = (e as any).group_id || null;
        }

        await Promise.allSettled(
          (profiles || []).map(async (stu: any) => {
            if (!stu.email) return;
            const groupId = enrollmentGroupMap[stu.id] || null;
            const grp = groupId ? groupMap[groupId] : null;
            return sendCourseEnrollmentConfirmedEmail({
              to: stu.email,
              studentName: stu.full_name_en || 'Student',
              courseTitle: course.title,
              courseCategory: course.category,
              courseId,
              whatsappGroupLink: grp?.whatsapp_link || null,
              whatsappGroupName: grp?.name || null,
            });
          })
        );
      } catch (emailErr) {
        console.warn('sendCourseEnrollmentConfirmedEmail bulk-approve error:', emailErr);
      }
    })();


    revalidatePath(`/student-portal/admin/courses/${courseId}/enrollments`);
    revalidatePath(`/student-portal/admin/courses/${courseId}/groups`);
    revalidatePath(`/student/courses/${courseId}`);
    revalidatePath(`/student/courses`);
    revalidatePath(`/student/dashboard`);

    const wasLimited = toApprove.length < pendingList.length;
    return {
      success: true,
      approvedCount: toApprove.length,
      message: wasLimited
        ? `Successfully approved ${toApprove.length} pending students. Note: ${pendingList.length - toApprove.length} remain pending due to course capacity limit (${course.capacity} seats).`
        : `Successfully approved all ${toApprove.length} pending student applications!`,
    };
  } catch (err: any) {
    console.error('approveAllPendingCourseEnrollments exception:', err);
    return { success: false, error: err.message || 'Failed to approve all pending enrollments.' };
  }
}


