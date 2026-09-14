'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import {
  Course,
  CourseSession,
  CourseInstructor,
  EnrollmentStatus,
  EnrollmentType,
  CourseStatus,
} from '@/types/student';

export interface StudentCourseCardItem {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category: string | null;
  department_id: string | null;
  department_name?: string;
  department_code?: string;
  capacity: number | null;
  enrollment_type: EnrollmentType;
  status: CourseStatus;
  sessions_count: number;
  total_duration_minutes: number;
  enrollment_count: number;
  is_full: boolean;
  my_enrollment_status: EnrollmentStatus | null;
  instructors: Array<{
    id: string;
    profile_id: string;
    full_name: string;
    avatar_url: string | null;
    role: 'instructor' | 'mentor';
  }>;
}

export interface CourseDetailResult {
  course: Course & {
    department_name?: string;
    department_code?: string;
    enrollment_count: number;
    is_full: boolean;
    total_duration_minutes: number;
  };
  instructors: Array<{
    id: string;
    profile_id: string;
    full_name: string;
    avatar_url: string | null;
    role: 'instructor' | 'mentor';
    committee_role: string;
    department_name?: string;
  }>;
  sessions: CourseSession[];
  myEnrollment: {
    status: EnrollmentStatus;
    enrolled_at: string;
    confirmed_at: string | null;
  } | null;
  canEnroll: boolean;
  needsOnboarding: boolean;
  isAuthenticated: boolean;
}

/**
 * 1. Fetch published courses for the student catalog
 */
export async function getPublishedCourses(): Promise<{
  success: boolean;
  courses: StudentCourseCardItem[];
  categories: string[];
  departments: Array<{ id: string; name: string; code: string }>;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();
    const userId = context.user?.id || null;

    let studentProfileId: string | null = null;
    let needsOnboarding = false;

    if (userId) {
      const { data: stu } = await admin
        .from('student_profiles')
        .select('id, status')
        .eq('id', userId)
        .maybeSingle();

      if (stu) {
        studentProfileId = stu.id;
        if (stu.status === 'incomplete') {
          needsOnboarding = true;
        }
      } else {
        needsOnboarding = true;
      }
    }

    // 1. Query published courses with relations
    const { data: coursesData, error: coursesErr } = await admin
      .from('courses')
      .select(`
        id,
        title,
        description,
        cover_image_url,
        category,
        department_id,
        capacity,
        enrollment_type,
        status,
        created_at,
        department:departments(id, name, code),
        instructors:course_instructors(
          id,
          role,
          profile:profiles!course_instructors_profile_id_fkey(id, full_name, avatar_url, role)
        ),
        sessions:course_sessions(id, duration_minutes, status),
        enrollments:course_enrollments(id, status, student_id)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (coursesErr) {
      console.error('getPublishedCourses error:', coursesErr);
      return {
        success: false,
        courses: [],
        categories: [],
        departments: [],
        isAuthenticated: Boolean(userId),
        needsOnboarding,
        error: coursesErr.message,
      };
    }

    // 2. Fetch distinct departments for filter bar
    const { data: deptsData } = await admin
      .from('departments')
      .select('id, name, code')
      .order('name', { ascending: true });

    const departments = (deptsData || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      code: d.code,
    }));

    const categoriesSet = new Set<string>();

    const courses: StudentCourseCardItem[] = (coursesData || []).map((c: any) => {
      const dept = Array.isArray(c.department) ? c.department[0] : c.department;
      if (c.category) {
        categoriesSet.add(c.category);
      }

      // Map instructors
      const instList = (c.instructors || []).map((ins: any) => {
        const prof = Array.isArray(ins.profile) ? ins.profile[0] : ins.profile;
        return {
          id: ins.id,
          profile_id: prof?.id || '',
          full_name: prof?.full_name || 'Instructor',
          avatar_url: prof?.avatar_url || null,
          role: ins.role,
        };
      });

      // Calculate sessions and total duration
      const sessions = c.sessions || [];
      const sessionsCount = sessions.length;
      let totalDuration = 0;
      for (const s of sessions) {
        totalDuration += s.duration_minutes ? Number(s.duration_minutes) : 120;
      }

      // Enrollments and student personal status
      const enrollments = c.enrollments || [];
      const confirmedCount = enrollments.filter((e: any) => e.status === 'confirmed').length;
      const isFull = Boolean(c.capacity && confirmedCount >= c.capacity);

      let myEnrollmentStatus: EnrollmentStatus | null = null;
      if (studentProfileId) {
        const myRecord = enrollments.find((e: any) => e.student_id === studentProfileId);
        if (myRecord) {
          myEnrollmentStatus = myRecord.status as EnrollmentStatus;
        }
      }

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        cover_image_url: c.cover_image_url,
        category: c.category,
        department_id: c.department_id,
        department_name: dept?.name,
        department_code: dept?.code,
        capacity: c.capacity,
        enrollment_type: c.enrollment_type,
        status: c.status,
        sessions_count: sessionsCount,
        total_duration_minutes: totalDuration,
        enrollment_count: confirmedCount,
        is_full: isFull,
        my_enrollment_status: myEnrollmentStatus,
        instructors: instList,
      };
    });

    return {
      success: true,
      courses,
      categories: Array.from(categoriesSet).sort(),
      departments,
      isAuthenticated: Boolean(userId),
      needsOnboarding,
    };
  } catch (err: any) {
    console.error('getPublishedCourses exception:', err);
    return {
      success: false,
      courses: [],
      categories: [],
      departments: [],
      isAuthenticated: false,
      needsOnboarding: false,
      error: err.message || 'Failed to load courses catalog.',
    };
  }
}

/**
 * 2. Fetch full course details for /student/courses/[id]
 */
export async function getCourseDetail(courseId: string): Promise<{
  success: boolean;
  data?: CourseDetailResult;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();
    const userId = context.user?.id || null;

    let studentProfileId: string | null = null;
    let needsOnboarding = false;

    if (userId) {
      const { data: stu } = await admin
        .from('student_profiles')
        .select('id, status')
        .eq('id', userId)
        .maybeSingle();

      if (stu) {
        studentProfileId = stu.id;
        if (stu.status === 'incomplete') {
          needsOnboarding = true;
        }
      } else {
        needsOnboarding = true;
      }
    }

    // 1. Fetch course details
    const { data: courseData, error: courseErr } = await admin
      .from('courses')
      .select(`
        *,
        department:departments(id, name, code, branch),
        instructors:course_instructors(
          id,
          role,
          profile_id,
          profile:profiles!course_instructors_profile_id_fkey(
            id,
            full_name,
            avatar_url,
            role,
            department:departments!profiles_department_id_fkey(name, code)
          )
        ),
        enrollments:course_enrollments(id, status, student_id, enrolled_at, confirmed_at)
      `)
      .eq('id', courseId)
      .single();

    if (courseErr || !courseData) {
      return { success: false, error: 'Course not found or inaccessible.' };
    }

    // 2. Fetch sessions
    const { data: sessionsData, error: sessionsErr } = await admin
      .from('course_sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('session_number', { ascending: true });

    if (sessionsErr) {
      console.error('getCourseDetail sessionsErr:', sessionsErr);
    }

    const dept = Array.isArray(courseData.department) ? courseData.department[0] : courseData.department;
    const enrollments = courseData.enrollments || [];
    const confirmedCount = enrollments.filter((e: any) => e.status === 'confirmed').length;
    const isFull = Boolean(courseData.capacity && confirmedCount >= courseData.capacity);

    // Compute total hours
    const sessionsList = sessionsData || [];
    let totalDuration = 0;
    for (const s of sessionsList) {
      totalDuration += s.duration_minutes ? Number(s.duration_minutes) : 120;
    }

    // Teaching staff
    const instructorsList = (courseData.instructors || []).map((ins: any) => {
      const prof = Array.isArray(ins.profile) ? ins.profile[0] : ins.profile;
      const pDept = Array.isArray(prof?.department) ? prof?.department[0] : prof?.department;
      return {
        id: ins.id,
        profile_id: ins.profile_id,
        full_name: prof?.full_name || 'Team Instructor',
        avatar_url: prof?.avatar_url || null,
        role: ins.role as 'instructor' | 'mentor',
        committee_role: prof?.role || 'member',
        department_name: pDept?.name,
      };
    });

    // Check my enrollment
    let myEnrollment: {
      status: EnrollmentStatus;
      enrolled_at: string;
      confirmed_at: string | null;
    } | null = null;

    if (studentProfileId) {
      const myRecord = enrollments.find((e: any) => e.student_id === studentProfileId);
      if (myRecord) {
        myEnrollment = {
          status: myRecord.status as EnrollmentStatus,
          enrolled_at: myRecord.enrolled_at,
          confirmed_at: myRecord.confirmed_at,
        };
      }
    }

    const canEnroll = !myEnrollment && !isFull && courseData.status === 'published';

    return {
      success: true,
      data: {
        course: {
          ...courseData,
          department_name: dept?.name,
          department_code: dept?.code,
          enrollment_count: confirmedCount,
          is_full: isFull,
          total_duration_minutes: totalDuration,
        },
        instructors: instructorsList,
        sessions: sessionsList,
        myEnrollment,
        canEnroll,
        needsOnboarding,
        isAuthenticated: Boolean(userId),
      },
    };
  } catch (err: any) {
    console.error('getCourseDetail exception:', err);
    return { success: false, error: err.message || 'Failed to load course details.' };
  }
}

/**
 * 3. Student enrolls in a course
 */
export async function enrollInCourse(courseId: string): Promise<{
  success: boolean;
  status?: EnrollmentStatus;
  message?: string;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();

    if (!context.user) {
      return { success: false, error: 'Please sign in with Google to enroll in this course.' };
    }

    // Verify student profile exists
    const { data: student, error: stuErr } = await admin
      .from('student_profiles')
      .select('id, status, full_name_en')
      .eq('id', context.user.id)
      .maybeSingle();

    if (stuErr || !student) {
      return {
        success: false,
        error: 'Student profile not found. Please complete your registration onboarding first.',
      };
    }

    if (student.status === 'incomplete') {
      return {
        success: false,
        error: 'Please complete your student profile onboarding before enrolling.',
      };
    }

    // Verify course exists and is published
    const { data: course, error: courseErr } = await admin
      .from('courses')
      .select('id, title, capacity, enrollment_type, status')
      .eq('id', courseId)
      .single();

    if (courseErr || !course) {
      return { success: false, error: 'Course not found.' };
    }

    if (course.status !== 'published') {
      return { success: false, error: 'This course is not currently accepting enrollments.' };
    }

    // Check existing enrollment
    const { data: existing } = await admin
      .from('course_enrollments')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('student_id', student.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'confirmed') {
        return { success: false, error: 'You are already enrolled in this course.' };
      }
      if (existing.status === 'pending') {
        return { success: false, error: 'Your enrollment request is already pending instructor review.' };
      }
      if (existing.status === 'waitlisted') {
        return { success: false, error: 'You are currently on the waitlist for this course.' };
      }
    }

    // Check capacity
    const { count: confirmedCount } = await admin
      .from('course_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'confirmed');

    const isFull = Boolean(course.capacity && (confirmedCount || 0) >= course.capacity);

    let enrollmentStatus: EnrollmentStatus;
    let messageText: string;

    if (isFull) {
      enrollmentStatus = 'waitlisted';
      messageText = 'Course capacity is full. You have been added to the waitlist!';
    } else if (course.enrollment_type === 'open') {
      enrollmentStatus = 'confirmed';
      messageText = 'Congratulations! Your enrollment is confirmed. Welcome to the course!';
    } else {
      enrollmentStatus = 'pending';
      messageText = 'Enrollment request submitted! Waiting for instructor approval.';
    }

    const { error: insErr } = await admin
      .from('course_enrollments')
      .upsert({
        course_id: courseId,
        student_id: student.id,
        status: enrollmentStatus,
        enrolled_at: new Date().toISOString(),
        confirmed_at: enrollmentStatus === 'confirmed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'course_id,student_id' });

    if (insErr) {
      console.error('enrollInCourse insert error:', insErr);
      return { success: false, error: insErr.message || 'Failed to record enrollment.' };
    }

    revalidatePath(`/student/courses`);
    revalidatePath(`/student/courses/${courseId}`);
    revalidatePath(`/student/dashboard`);

    return {
      success: true,
      status: enrollmentStatus,
      message: messageText,
    };
  } catch (err: any) {
    console.error('enrollInCourse exception:', err);
    return { success: false, error: err.message || 'Failed to complete enrollment.' };
  }
}
