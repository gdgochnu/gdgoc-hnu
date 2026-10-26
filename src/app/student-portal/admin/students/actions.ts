import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { MANDATORY_SOCIAL_CHANNELS } from '@/config/social-gate';

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
  socialFollowsCount: number;
  socialFollowCompleted: boolean;
}

export interface AdminStudentsAnalytics {
  totalStudents: number;
  activeCourses: number;
  totalEnrollments: number;
  totalCertificates: number;
  totalAttendanceLogs: number;
  totalWorkshopRegistrations: number;
  avgAttendanceRate: number;
  totalSocialFollowCompleted: number;
  socialFollowRate: number;
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
      .order('created_at', { ascending: false })
      .limit(50000);

    if (studentsErr) {
      console.error('getAdminStudentsDirectoryData student_profiles error:', studentsErr);
    }

    const studentList = rawStudents || [];

    // 2. Fetch auxiliary data in parallel for stats and student enrichment with safe limits
    const [
      coursesRes,
      courseSessionsRes,
      enrollmentsRes,
      certificatesRes,
      attendanceRes,
      workshopsRes,
      workshopSessionsRes,
      socialFollowsRes,
    ] = await Promise.allSettled([
      admin.from('courses').select('id, title, category').limit(50000),
      admin.from('course_sessions').select('id, course_id').limit(50000),
      admin.from('course_enrollments').select('id, student_id, course_id, status').limit(50000),
      admin.from('student_certificates').select('id, student_id').limit(50000),
      admin.from('student_attendance').select('id, student_id, session_id, workshop_session_id').limit(50000),
      admin.from('workshop_registrations').select('id, student_id, status, workshop_id').limit(50000),
      admin.from('workshop_sessions').select('id, workshop_id').limit(50000),
      admin.from('student_social_follows').select('*').limit(50000),
    ]);

    const courses = coursesRes.status === 'fulfilled' && coursesRes.value.data ? coursesRes.value.data : [];
    const courseSessions = courseSessionsRes.status === 'fulfilled' && courseSessionsRes.value.data ? courseSessionsRes.value.data : [];
    const enrollments = enrollmentsRes.status === 'fulfilled' && enrollmentsRes.value.data ? enrollmentsRes.value.data : [];
    const certificates = certificatesRes.status === 'fulfilled' && certificatesRes.value.data ? certificatesRes.value.data : [];
    const attendance = attendanceRes.status === 'fulfilled' && attendanceRes.value.data ? attendanceRes.value.data : [];
    const workshops = workshopsRes.status === 'fulfilled' && workshopsRes.value.data ? workshopsRes.value.data : [];
    const workshopSessions = workshopSessionsRes.status === 'fulfilled' && workshopSessionsRes.value.data ? workshopSessionsRes.value.data : [];
    const socialFollows = socialFollowsRes.status === 'fulfilled' && socialFollowsRes.value.data ? socialFollowsRes.value.data : [];

    // Map sessions count per course & workshop
    const courseSessionsCountMap = new Map<string, number>();
    courseSessions.forEach((cs: any) => {
      courseSessionsCountMap.set(cs.course_id, (courseSessionsCountMap.get(cs.course_id) || 0) + 1);
    });

    const wsSessionsCountMap = new Map<string, number>();
    workshopSessions.forEach((ws: any) => {
      wsSessionsCountMap.set(ws.workshop_id, (wsSessionsCountMap.get(ws.workshop_id) || 0) + 1);
    });

    const courseMap = new Map<string, { title: string; category: string }>();
    courses.forEach((c: any) => courseMap.set(c.id, { title: c.title, category: c.category || c.title || 'General' }));

    // Lookup maps
    const enrollmentsByStudent = new Map<string, string[]>();
    const studentCourseIdsMap = new Map<string, string[]>();
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

          if (e.course_id) {
            const cIds = studentCourseIdsMap.get(e.student_id) || [];
            cIds.push(e.course_id);
            studentCourseIdsMap.set(e.student_id, cIds);
          }
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

    // Map each student's distinct attended sessions (session_id or workshop_session_id)
    const studentAttendedSessionsMap = new Map<string, Set<string>>();
    for (const att of attendance as any[]) {
      if (att.student_id) {
        const set = studentAttendedSessionsMap.get(att.student_id) || new Set<string>();
        const sessKey = att.session_id
          ? `c_${att.session_id}`
          : (att.workshop_session_id ? `w_${att.workshop_session_id}` : `id_${att.id}`);
        set.add(sessKey);
        studentAttendedSessionsMap.set(att.student_id, set);
      }
    }

    const studentWsIdsMap = new Map<string, string[]>();
    const workshopsCountMap = new Map<string, number>();
    for (const ws of workshops as any[]) {
      if (ws.student_id && (ws.status === 'registered' || ws.status === 'confirmed' || !ws.status)) {
        workshopsCountMap.set(ws.student_id, (workshopsCountMap.get(ws.student_id) || 0) + 1);
        if (ws.workshop_id) {
          const wIds = studentWsIdsMap.get(ws.student_id) || [];
          wIds.push(ws.workshop_id);
          studentWsIdsMap.set(ws.student_id, wIds);
        }
      }
    }

    // Social follows map (Consolidated single record per student)
    const socialFollowsMap = new Map<string, Set<string>>();
    for (const sf of socialFollows as any[]) {
      if (sf.student_id) {
        const set = new Set<string>();
        if (sf.youtube) set.add('youtube');
        if (sf.facebook) set.add('facebook');
        if (sf.instagram) set.add('instagram');
        if (sf.tiktok) set.add('tiktok');
        if (sf.linkedin) set.add('linkedin');
        if (sf.whatsapp) set.add('whatsapp');
        socialFollowsMap.set(sf.student_id, set);
      }
    }

    const totalRequiredSocial = MANDATORY_SOCIAL_CHANNELS.length;
    let totalSocialFollowCompleted = 0;

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
      const attSessions = studentAttendedSessionsMap.get(s.id) || new Set<string>();
      const attLogsCount = attSessions.size;
      const wsCount = workshopsCountMap.get(s.id) || 0;

      const followedPlatforms = socialFollowsMap.get(s.id) || new Set();
      const socialFollowsCount = followedPlatforms.size;
      const socialFollowCompleted = socialFollowsCount >= totalRequiredSocial;

      if (socialFollowCompleted) {
        totalSocialFollowCompleted++;
      }

      // Calculate actual total expected sessions from student's enrolled courses and workshops
      const studentCourseIds = studentCourseIdsMap.get(s.id) || [];
      const studentWsIds = studentWsIdsMap.get(s.id) || [];

      let expectedSessions = 0;
      for (const cId of studentCourseIds) {
        expectedSessions += courseSessionsCountMap.get(cId) || 0;
      }
      for (const wId of studentWsIds) {
        expectedSessions += wsSessionsCountMap.get(wId) || 0;
      }

      let attendanceRate = 0;
      if (expectedSessions > 0) {
        attendanceRate = Math.min(100, Math.round((attLogsCount / expectedSessions) * 100));
      } else if (attLogsCount > 0) {
        attendanceRate = 100;
      } else {
        attendanceRate = 0;
      }

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
        socialFollowsCount,
        socialFollowCompleted,
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

    const socialFollowRate =
      students.length > 0 ? Math.round((totalSocialFollowCompleted / students.length) * 100) : 0;

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
          totalSocialFollowCompleted,
          socialFollowRate,
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
