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

    // Fetch in parallel
    const [
      studentsCountResult,
      coursesResult,
      enrollmentsCountResult,
      certificatesCountResult,
      attendanceCountResult,
      workshopsCountResult,
      facultyDistResult,
      yearDistResult,
      enrollmentsWithCoursesResult,
      studentsListResult,
    ] = await Promise.allSettled([
      // 1. Total students
      admin.from('student_profiles').select('id', { count: 'exact', head: true }),
      
      // 2. Published courses
      admin.from('courses').select('id, title, category', { count: 'exact' }).eq('status', 'published'),
      
      // 3. Confirmed enrollments
      admin.from('course_enrollments').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
      
      // 4. Certificates
      admin.from('student_certificates').select('id', { count: 'exact', head: true }),
      
      // 5. Attendance
      admin.from('student_attendance').select('id', { count: 'exact', head: true }),
      
      // 6. Workshop registrations
      admin.from('workshop_registrations').select('id', { count: 'exact', head: true }).eq('status', 'registered'),
      
      // 7. Faculty breakdown
      admin.from('student_profiles').select('faculty').not('faculty', 'is', null),
      
      // 8. Year breakdown
      admin.from('student_profiles').select('academic_year').not('academic_year', 'is', null),
      
      // 9. Enrollments breakdown for tracks
      admin.from('course_enrollments').select('course:courses!course_enrollments_course_id_fkey(title, category)').eq('status', 'confirmed'),
      
      // 10. Detailed students
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
          created_at,
          enrollments:course_enrollments(
            id,
            status,
            course:courses!course_enrollments_course_id_fkey(title)
          ),
          certificates:student_certificates(id),
          attendance:student_attendance(id),
          workshops:workshop_registrations(id)
        `)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const totalStudents = studentsCountResult.status === 'fulfilled' ? (studentsCountResult.value.count ?? 0) : 0;
    const activeCourses = coursesResult.status === 'fulfilled' ? (coursesResult.value.count ?? 0) : 0;
    const totalEnrollments = enrollmentsCountResult.status === 'fulfilled' ? (enrollmentsCountResult.value.count ?? 0) : 0;
    const totalCertificates = certificatesCountResult.status === 'fulfilled' ? (certificatesCountResult.value.count ?? 0) : 0;
    const totalAttendanceLogs = attendanceCountResult.status === 'fulfilled' ? (attendanceCountResult.value.count ?? 0) : 0;
    const totalWorkshopRegistrations = workshopsCountResult.status === 'fulfilled' ? (workshopsCountResult.value.count ?? 0) : 0;

    // Faculty breakdown
    const facultyRaw = facultyDistResult.status === 'fulfilled' ? (facultyDistResult.value.data ?? []) : [];
    const facultyMap: Record<string, number> = {};
    for (const row of facultyRaw) {
      if (row.faculty) facultyMap[row.faculty] = (facultyMap[row.faculty] || 0) + 1;
    }
    const byFaculty = Object.entries(facultyMap)
      .map(([faculty, count]) => ({ faculty, count }))
      .sort((a, b) => b.count - a.count);

    const facultiesList = Object.keys(facultyMap).sort();

    // Year breakdown
    const yearRaw = yearDistResult.status === 'fulfilled' ? (yearDistResult.value.data ?? []) : [];
    const yearMap: Record<number, number> = {};
    for (const row of yearRaw) {
      if (row.academic_year) yearMap[row.academic_year] = (yearMap[row.academic_year] || 0) + 1;
    }
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

    // Track breakdown
    const enrollmentsRaw = enrollmentsWithCoursesResult.status === 'fulfilled' ? (enrollmentsWithCoursesResult.value.data ?? []) : [];
    const trackMap: Record<string, number> = {};
    const TRACK_COLORS = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#8B5CF6', '#06B6D4', '#EC4899'];
    for (const item of enrollmentsRaw as any[]) {
      const course = Array.isArray(item.course) ? item.course[0] : item.course;
      const key = course?.category || course?.title || 'General';
      trackMap[key] = (trackMap[key] || 0) + 1;
    }
    const byTrack = Object.entries(trackMap)
      .map(([track, count], idx) => ({ track, count, color: TRACK_COLORS[idx % TRACK_COLORS.length] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Map students
    const studentsRaw = studentsListResult.status === 'fulfilled' ? (studentsListResult.value.data ?? []) : [];
    const students: AdminStudentItem[] = (studentsRaw as any[]).map((s) => {
      const confirmedEnrollments = (s.enrollments || []).filter((e: any) => e.status === 'confirmed' || !e.status);
      const courseTitles = confirmedEnrollments
        .map((e: any) => {
          const c = Array.isArray(e.course) ? e.course[0] : e.course;
          return c?.title || null;
        })
        .filter(Boolean);

      const enrolledCoursesCount = confirmedEnrollments.length;
      const certsCount = (s.certificates || []).length;
      const attLogsCount = (s.attendance || []).length;
      const workshopsCount = (s.workshops || []).length;

      // Approximate attendance rate
      const expectedSessions = enrolledCoursesCount * 6 || 1;
      const rawRate = Math.round((attLogsCount / expectedSessions) * 100);
      const attendanceRate = enrolledCoursesCount === 0 && attLogsCount === 0 ? 0 : Math.min(100, Math.max(0, rawRate || 0));

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

    const avgAttendanceRate =
      students.length > 0
        ? Math.round(students.reduce((acc, s) => acc + s.attendanceRate, 0) / students.length)
        : 0;

    return {
      success: true,
      data: {
        stats: {
          totalStudents,
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
        totalCount: totalStudents,
        facultiesList,
      },
    };
  } catch (err: any) {
    console.error('getAdminStudentsDirectoryData error:', err);
    return { success: false, error: err?.message || 'Failed to load students directory data' };
  }
}
