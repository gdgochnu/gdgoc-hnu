import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';

export interface AdminStudentItem {
  id: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  national_id: string | null;
  avatar_url: string | null;
  faculty: string | null;
  academic_year: number | null;
  department_major: string | null;
  university: string;
  status: string;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
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

    // 1. Fetch raw student_profiles with select('*') so no column mismatches can occur
    const { data: rawStudents, error: studentsErr } = await admin
      .from('student_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (studentsErr) {
      console.error('getAdminStudentsDirectoryData student_profiles error:', studentsErr);
    }

    const studentList = rawStudents || [];

    // 2. Fetch auxiliary data in parallel for stats and student enrichment
    const [
      coursesRes,
      enrollmentsRes,
      certificatesRes,
      attendanceRes,
      workshopsRes,
    ] = await Promise.allSettled([
      admin.from('courses').select('id, title, category'),
      admin.from('course_enrollments').select('id, student_id, course_id, status'),
      admin.from('student_certificates').select('id, student_id'),
      admin.from('student_attendance').select('id, student_id'),
      admin.from('workshop_registrations').select('id, student_id, status'),
    ]);

    const courses = coursesRes.status === 'fulfilled' && coursesRes.value.data ? coursesRes.value.data : [];
    const courseMap = new Map<string, { title: string; category: string }>();
    courses.forEach((c: any) => courseMap.set(c.id, { title: c.title, category: c.category || c.title || 'General' }));

    const enrollments = enrollmentsRes.status === 'fulfilled' && enrollmentsRes.value.data ? enrollmentsRes.value.data : [];
    const certificates = certificatesRes.status === 'fulfilled' && certificatesRes.value.data ? certificatesRes.value.data : [];
    const attendance = attendanceRes.status === 'fulfilled' && attendanceRes.value.data ? attendanceRes.value.data : [];
    const workshops = workshopsRes.status === 'fulfilled' && workshopsRes.value.data ? workshopsRes.value.data : [];

    // Lookup maps
    const enrollmentsByStudent = new Map<string, string[]>();
    const trackCountMap: Record<string, number> = {};
    const TRACK_COLORS = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#8B5CF6', '#06B6D4', '#EC4899'];

    for (const e of enrollments as any[]) {
      if (e.status === 'confirmed' || !e.status) {
        const c = courseMap.get(e.course_id);
        const title = c?.title || 'Course';
        const category = c?.category || 'General';

        trackCountMap[category] = (trackCountMap[category] || 0) + 1;

        if (e.student_id) {
          const list = enrollmentsByStudent.get(e.student_id) || [];
          list.push(title);
          enrollmentsByStudent.set(e.student_id, list);
        }
      }
    }

    const byTrack = Object.entries(trackCountMap)
      .map(([track, count], idx) => ({ track, count, color: TRACK_COLORS[idx % TRACK_COLORS.length] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const certsCountMap = new Map<string, number>();
    for (const cert of certificates as any[]) {
      if (cert.student_id) {
        certsCountMap.set(cert.student_id, (certsCountMap.get(cert.student_id) || 0) + 1);
      }
    }

    const attCountMap = new Map<string, number>();
    for (const att of attendance as any[]) {
      if (att.student_id) {
        attCountMap.set(att.student_id, (attCountMap.get(att.student_id) || 0) + 1);
      }
    }

    const workshopsCountMap = new Map<string, number>();
    for (const ws of workshops as any[]) {
      if (ws.student_id) {
        workshopsCountMap.set(ws.student_id, (workshopsCountMap.get(ws.student_id) || 0) + 1);
      }
    }

    // Faculty & Year aggregators
    const facultyMap: Record<string, number> = {};
    const yearMap: Record<number, number> = {};

    const students: AdminStudentItem[] = studentList.map((s: any) => {
      if (s.faculty) {
        facultyMap[s.faculty] = (facultyMap[s.faculty] || 0) + 1;
      }
      if (s.academic_year) {
        const yr = Number(s.academic_year);
        if (!isNaN(yr) && yr > 0) {
          yearMap[yr] = (yearMap[yr] || 0) + 1;
        }
      }

      const courseTitles = enrollmentsByStudent.get(s.id) || [];
      const enrolledCoursesCount = courseTitles.length;
      const certsCount = certsCountMap.get(s.id) || 0;
      const attLogsCount = attCountMap.get(s.id) || 0;
      const wsCount = workshopsCountMap.get(s.id) || 0;

      const expectedSessions = enrolledCoursesCount * 6 || (wsCount > 0 ? wsCount * 3 : 1);
      const rawRate = Math.round((attLogsCount / expectedSessions) * 100);
      const attendanceRate = enrolledCoursesCount === 0 && wsCount === 0 && attLogsCount === 0 ? 0 : Math.min(100, Math.max(0, rawRate || 0));

      return {
        id: s.id,
        full_name_en: s.full_name_en,
        full_name_ar: s.full_name_ar,
        email: s.email,
        phone: s.phone,
        whatsapp_number: s.whatsapp_number,
        national_id: s.national_id,
        avatar_url: s.avatar_url,
        faculty: s.faculty,
        academic_year: s.academic_year ? Number(s.academic_year) : null,
        department_major: s.department_major,
        university: s.university || 'Helwan National University (HNU)',
        status: s.status || 'active',
        linkedin_url: s.linkedin_url,
        facebook_url: s.facebook_url,
        instagram_url: s.instagram_url,
        created_at: s.created_at || new Date().toISOString(),
        enrolledCourses: enrolledCoursesCount,
        courseTitles,
        certificatesCount: certsCount,
        attendanceCount: attLogsCount,
        attendanceRate,
        workshopsCount: wsCount,
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
          totalStudents: students.length,
          activeCourses: courses.length,
          totalEnrollments: enrollments.length,
          totalCertificates: certificates.length,
          totalAttendanceLogs: attendance.length,
          totalWorkshopRegistrations: workshops.length,
          avgAttendanceRate,
          byFaculty,
          byYear,
          byTrack,
        },
        students,
        totalCount: students.length,
        facultiesList,
      },
    };
  } catch (err: any) {
    console.error('getAdminStudentsDirectoryData error:', err);
    return { success: false, error: err?.message || 'Failed to load students directory data' };
  }
}
