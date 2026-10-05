import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';

export interface AdminStudentItem {
  id: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  email: string | null;
  phone: string | null;
  national_id: string | null;
  student_id: string | null;
  avatar_url: string | null;
  faculty: string | null;
  academic_year: number | null;
  department_major: string | null;
  university: string;
  status: string;
  linkedin_url: string | null;
  github_url: string | null;
  created_at: string;
  enrolledCourses: number;
  courseTitles: string[];
  certificatesCount: number;
  attendanceCount: number;
  attendanceRate: number;
  workshopsCount: number;
}

export interface AdminStudentsAnalytics {
  totalStudents: number;
  activeCourses: number;
  totalEnrollments: number;
  totalCertificates: number;
  totalAttendanceLogs: number;
  totalWorkshopRegistrations: number;
  avgAttendanceRate: number;
  byFaculty: Array<{ faculty: string; count: number }>;
  byYear: Array<{ year: number; label: string; count: number }>;
  byTrack: Array<{ track: string; count: number; color: string }>;
}

export interface AdminStudentsDirectoryData {
  stats: AdminStudentsAnalytics;
  students: AdminStudentItem[];
  totalCount: number;
  facultiesList: string[];
}

export async function getAdminStudentsDirectoryData(): Promise<{
  success: boolean;
  data?: AdminStudentsDirectoryData;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    const role = context.profile.role;
    if (role !== 'president' && role !== 'co_president') {
      return { success: false, error: 'Unauthorized: Restricted to Chapter Presidential Leadership.' };
    }

    const admin = createAdminClient();

    // Fetch all needed metrics and raw lists in parallel
    const [
      studentsCountResult,
      coursesResult,
      enrollmentsCountResult,
      certificatesCountResult,
      attendanceCountResult,
      workshopsCountResult,
      studentsListResult,
      allEnrollmentsResult,
      allCertificatesResult,
      allAttendanceResult,
      allWorkshopsResult,
    ] = await Promise.allSettled([
      // 1. Total students
      admin.from('student_profiles').select('id', { count: 'exact', head: true }),

      // 2. Published courses
      admin.from('courses').select('id, title, category').eq('status', 'published'),

      // 3. Confirmed enrollments count
      admin.from('course_enrollments').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),

      // 4. Certificates count
      admin.from('student_certificates').select('id', { count: 'exact', head: true }),

      // 5. Attendance count
      admin.from('student_attendance').select('id', { count: 'exact', head: true }),

      // 6. Workshop registrations count
      admin.from('workshop_registrations').select('id', { count: 'exact', head: true }).eq('status', 'registered'),

      // 7. Full student profiles list (clean direct query without fragile reverse joins)
      admin
        .from('student_profiles')
        .select(`
          id,
          full_name_en,
          full_name_ar,
          email,
          phone,
          national_id,
          student_id,
          avatar_url,
          faculty,
          academic_year,
          department_major,
          university,
          status,
          linkedin_url,
          github_url,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(1000),

      // 8. All course enrollments with course details for mapping
      admin
        .from('course_enrollments')
        .select('student_id, course_id, status, course:courses!course_enrollments_course_id_fkey(title, category)'),

      // 9. All certificates for counting per student
      admin.from('student_certificates').select('student_id'),

      // 10. All attendance logs for counting per student
      admin.from('student_attendance').select('student_id'),

      // 11. All workshop registrations for counting per student
      admin.from('workshop_registrations').select('student_id'),
    ]);

    // Parse counts
    const totalStudents = studentsCountResult.status === 'fulfilled' ? (studentsCountResult.value.count ?? 0) : 0;
    const coursesRaw = coursesResult.status === 'fulfilled' ? (coursesResult.value.data ?? []) : [];
    const activeCourses = coursesRaw.length;
    const totalEnrollments = enrollmentsCountResult.status === 'fulfilled' ? (enrollmentsCountResult.value.count ?? 0) : 0;
    const totalCertificates = certificatesCountResult.status === 'fulfilled' ? (certificatesCountResult.value.count ?? 0) : 0;
    const totalAttendanceLogs = attendanceCountResult.status === 'fulfilled' ? (attendanceCountResult.value.count ?? 0) : 0;
    const totalWorkshopRegistrations = workshopsCountResult.status === 'fulfilled' ? (workshopsCountResult.value.count ?? 0) : 0;

    // Build fast lookup maps per student ID
    const enrollmentsByStudent: Record<string, Array<{ courseTitle: string; status: string }>> = {};
    const trackMap: Record<string, number> = {};
    const TRACK_COLORS = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#8B5CF6', '#06B6D4', '#EC4899'];

    if (allEnrollmentsResult.status === 'fulfilled' && allEnrollmentsResult.value.data) {
      for (const row of allEnrollmentsResult.value.data as any[]) {
        const sId = row.student_id;
        const course = Array.isArray(row.course) ? row.course[0] : row.course;
        const title = course?.title || 'Course';
        const category = course?.category || title || 'General';

        if (sId) {
          if (!enrollmentsByStudent[sId]) enrollmentsByStudent[sId] = [];
          enrollmentsByStudent[sId].push({ courseTitle: title, status: row.status });
        }

        if (row.status === 'confirmed' || !row.status) {
          trackMap[category] = (trackMap[category] || 0) + 1;
        }
      }
    }

    const byTrack = Object.entries(trackMap)
      .map(([track, count], idx) => ({ track, count, color: TRACK_COLORS[idx % TRACK_COLORS.length] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Certs count map
    const certsCountMap: Record<string, number> = {};
    if (allCertificatesResult.status === 'fulfilled' && allCertificatesResult.value.data) {
      for (const row of allCertificatesResult.value.data as any[]) {
        if (row.student_id) {
          certsCountMap[row.student_id] = (certsCountMap[row.student_id] || 0) + 1;
        }
      }
    }

    // Attendance count map
    const attCountMap: Record<string, number> = {};
    if (allAttendanceResult.status === 'fulfilled' && allAttendanceResult.value.data) {
      for (const row of allAttendanceResult.value.data as any[]) {
        if (row.student_id) {
          attCountMap[row.student_id] = (attCountMap[row.student_id] || 0) + 1;
        }
      }
    }

    // Workshops count map
    const workshopsCountMap: Record<string, number> = {};
    if (allWorkshopsResult.status === 'fulfilled' && allWorkshopsResult.value.data) {
      for (const row of allWorkshopsResult.value.data as any[]) {
        if (row.student_id) {
          workshopsCountMap[row.student_id] = (workshopsCountMap[row.student_id] || 0) + 1;
        }
      }
    }

    // Raw students list
    const rawStudents = studentsListResult.status === 'fulfilled' ? (studentsListResult.value.data ?? []) : [];
    if (studentsListResult.status === 'rejected') {
      console.error('studentsListResult query error:', studentsListResult.reason);
    }

    // Distribution aggregators
    const facultyMap: Record<string, number> = {};
    const yearMap: Record<number, number> = {};

    const students: AdminStudentItem[] = rawStudents.map((s: any) => {
      // Faculty & Year aggregation
      if (s.faculty) {
        facultyMap[s.faculty] = (facultyMap[s.faculty] || 0) + 1;
      }
      if (s.academic_year) {
        yearMap[s.academic_year] = (yearMap[s.academic_year] || 0) + 1;
      }

      const studentEnrollments = enrollmentsByStudent[s.id] || [];
      const confirmedEnrollments = studentEnrollments.filter((e) => e.status === 'confirmed' || !e.status);
      const courseTitles = confirmedEnrollments.map((e) => e.courseTitle);

      const enrolledCoursesCount = confirmedEnrollments.length;
      const certsCount = certsCountMap[s.id] || 0;
      const attLogsCount = attCountMap[s.id] || 0;
      const workshopsCount = workshopsCountMap[s.id] || 0;

      // Approximate attendance rate
      const expectedSessions = enrolledCoursesCount * 6 || (workshopsCount > 0 ? workshopsCount * 3 : 1);
      const rawRate = Math.round((attLogsCount / expectedSessions) * 100);
      const attendanceRate = enrolledCoursesCount === 0 && workshopsCount === 0 && attLogsCount === 0 ? 0 : Math.min(100, Math.max(0, rawRate || 0));

      return {
        id: s.id,
        full_name_en: s.full_name_en,
        full_name_ar: s.full_name_ar,
        email: s.email,
        phone: s.phone,
        national_id: s.national_id,
        student_id: s.student_id,
        avatar_url: s.avatar_url,
        faculty: s.faculty,
        academic_year: s.academic_year,
        department_major: s.department_major,
        university: s.university || 'Helwan National University (HNU)',
        status: s.status || 'active',
        linkedin_url: s.linkedin_url,
        github_url: s.github_url,
        created_at: s.created_at,
        enrolledCourses: enrolledCoursesCount,
        courseTitles,
        certificatesCount: certsCount,
        attendanceCount: attLogsCount,
        attendanceRate,
        workshopsCount,
      };
    });

    const byFaculty = Object.entries(facultyMap)
      .map(([faculty, count]) => ({ faculty, count }))
      .sort((a, b) => b.count - a.count);

    const facultiesList = Object.keys(facultyMap).sort();

    const yearLabels: Record<number, string> = {
      1: '1st Year',
      2: '2nd Year',
      3: '3rd Year',
      4: '4th Year',
      5: '5th Year',
    };
    const byYear = [1, 2, 3, 4, 5]
      .filter((y) => yearMap[y] !== undefined)
      .map((year) => ({ year, label: yearLabels[year] || `Year ${year}`, count: yearMap[year] || 0 }));

    const avgAttendanceRate =
      students.length > 0
        ? Math.round(students.reduce((acc, s) => acc + s.attendanceRate, 0) / students.length)
        : 0;

    return {
      success: true,
      data: {
        stats: {
          totalStudents: totalStudents || students.length,
          activeCourses,
          totalEnrollments,
          totalCertificates,
          totalAttendanceLogs,
          totalWorkshopRegistrations,
          avgAttendanceRate,
          byFaculty,
          byYear,
          byTrack,
        },
        students,
        totalCount: totalStudents || students.length,
        facultiesList,
      },
    };
  } catch (err: any) {
    console.error('getAdminStudentsDirectoryData error:', err);
    return { success: false, error: err?.message || 'Failed to load students directory data' };
  }
}
