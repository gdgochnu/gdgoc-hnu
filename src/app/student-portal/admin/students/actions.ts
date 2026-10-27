'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { MANDATORY_SOCIAL_CHANNELS } from '@/config/social-gate';
import { fetchAllSupabaseRows } from '@/lib/supabase/fetch-all';
import { getAppBaseUrl } from '@/lib/utils';
import {
  renderIncompleteProfileEmailHtml,
  sendIncompleteProfileReminderEmail,
} from '@/lib/email/service';
import { isStudentProfileComplete } from '@/lib/student/profile-validation';

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
  isProfileComplete: boolean;
  missingFields: string[];
  googleName: string | null;
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
  totalCompleteProfiles: number;
  totalIncompleteProfiles: number;
  profileCompletionRate: number;
  missingBreakdown: {
    missingFaculty: number;
    missingYear: number;
    missingPhone: number;
    missingNationalId: number;
    missingNames: number;
  };
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

    // 2. Fetch auxiliary data in parallel for stats and student enrichment with safe pagination
    const [
      coursesRes,
      courseSessionsRes,
      enrollments,
      certificates,
      attendance,
      workshopsRes,
      workshopSessionsRes,
      socialFollows,
      authUsersRes,
    ] = await Promise.all([
      admin.from('courses').select('id, title, category').limit(5000),
      admin.from('course_sessions').select('id, course_id').limit(5000),
      fetchAllSupabaseRows((from, to) =>
        admin.from('course_enrollments').select('id, student_id, course_id, status').range(from, to)
      ),
      fetchAllSupabaseRows((from, to) =>
        admin.from('student_certificates').select('id, student_id').range(from, to)
      ),
      fetchAllSupabaseRows((from, to) =>
        admin.from('student_attendance').select('id, student_id, session_id, workshop_session_id').range(from, to)
      ),
      admin.from('workshops').select('id, title, category').limit(5000),
      admin.from('workshop_sessions').select('id, workshop_id').limit(5000),
      fetchAllSupabaseRows((from, to) =>
        admin.from('student_social_follows').select('*').range(from, to)
      ),
      admin.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } })),
    ]);

    const courses = coursesRes.data || [];
    const courseSessions = courseSessionsRes.data || [];
    const workshops = workshopsRes.data || [];
    const workshopSessions = workshopSessionsRes.data || [];

    // Map Auth Users for name & avatar fallbacks
    const authMap = new Map<string, { fullName: string | null; avatarUrl: string | null }>();
    for (const u of (authUsersRes as any)?.data?.users || []) {
      authMap.set(u.id, {
        fullName: u.user_metadata?.full_name || u.user_metadata?.name || null,
        avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
      });
    }

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

    // Completeness aggregators
    let totalCompleteProfiles = 0;
    let totalIncompleteProfiles = 0;
    let missingFacultyCount = 0;
    let missingYearCount = 0;
    let missingPhoneCount = 0;
    let missingNationalIdCount = 0;
    let missingNamesCount = 0;

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

      // Metadata from Google Auth fallback
      const authMeta = authMap.get(s.id);
      const googleName = authMeta?.fullName || null;
      const avatarUrl = s.avatar_url || authMeta?.avatarUrl || null;

      // Determine missing profile data
      const missing: string[] = [];
      const hasFaculty = Boolean(s.faculty && s.faculty.trim());
      if (!hasFaculty) {
        missing.push('Faculty / الكلية');
        missingFacultyCount++;
      }

      const yrNum = Number(s.academic_year);
      const hasValidYear = Boolean(yrNum && !isNaN(yrNum) && yrNum >= 1 && yrNum <= 5);
      if (!hasValidYear) {
        missing.push('Academic Year / الفرقة الدراسية');
        missingYearCount++;
      }

      const phoneClean = (s.phone || '').replace(/[\s\-\(\)]/g, '');
      const waClean = (s.whatsapp_number || '').replace(/[\s\-\(\)]/g, '');
      const hasValidPhone = Boolean(phoneClean && /^(?:\+20|20|0)?1[0125]\d{8}$/.test(phoneClean));
      const hasValidWa = Boolean(waClean && /^(?:\+20|20|0)?1[0125]\d{8}$/.test(waClean));
      if (!hasValidPhone || !hasValidWa) {
        missing.push('Phone & WhatsApp / الهاتف والواتساب');
        missingPhoneCount++;
      }

      const natId = (s.national_id || '').trim();
      const hasValidNatId = Boolean(natId && /^\d{14}$/.test(natId));
      if (!hasValidNatId) {
        missing.push('National ID / الرقم القومي');
        missingNationalIdCount++;
      }

      const arParts = (s.full_name_ar || '').trim().split(/\s+/).filter(Boolean);
      const enParts = (s.full_name_en || '').trim().split(/\s+/).filter(Boolean);
      const hasValidNames = arParts.length >= 4 && enParts.length >= 4;
      if (!hasValidNames) {
        missing.push('Quad Arabic & English Names / الاسم الرباعي');
        missingNamesCount++;
      }

      const isProfileComplete = s.status === 'active' && missing.length === 0;
      if (isProfileComplete) {
        totalCompleteProfiles++;
      } else {
        totalIncompleteProfiles++;
      }

      return {
        id: s.id,
        full_name_en: s.full_name_en || googleName || null,
        full_name_ar: s.full_name_ar,
        email: s.email,
        phone: s.phone,
        whatsapp_number: s.whatsapp_number,
        national_id: s.national_id,
        avatar_url: avatarUrl,
        faculty: s.faculty,
        academic_year: s.academic_year ? Number(s.academic_year) : null,
        department_major: s.department_major,
        university: s.university || 'Helwan National University (HNU)',
        status: s.status || 'active',
        isProfileComplete,
        missingFields: missing,
        googleName,
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

    const profileCompletionRate =
      students.length > 0 ? Math.round((totalCompleteProfiles / students.length) * 100) : 0;

    return {
      success: true,
      data: {
        stats: {
          totalStudents: students.length,
          totalCompleteProfiles,
          totalIncompleteProfiles,
          profileCompletionRate,
          missingBreakdown: {
            missingFaculty: missingFacultyCount,
            missingYear: missingYearCount,
            missingPhone: missingPhoneCount,
            missingNationalId: missingNationalIdCount,
            missingNames: missingNamesCount,
          },
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

/**
 * Sends a profile completion reminder email to an individual student.
 */
export async function sendProfileCompletionReminderEmail(studentId: string): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }
    const role = context.profile.role;
    if (role !== 'president' && role !== 'co_president') {
      return { success: false, error: 'Unauthorized: Presidential permissions required.' };
    }

    const admin = createAdminClient();
    const { data: student, error: stuErr } = await admin
      .from('student_profiles')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (stuErr || !student) {
      return { success: false, error: 'Student not found.' };
    }

    if (!student.email) {
      return { success: false, error: 'Student has no registered email address.' };
    }

    // Get name (profile or auth)
    let studentName = student.full_name_en || student.full_name_ar || null;
    if (!studentName) {
      const { data: userAuth } = await admin.auth.admin.getUserById(student.id).catch(() => ({ data: { user: null } }));
      studentName = userAuth?.user?.user_metadata?.full_name || userAuth?.user?.user_metadata?.name || null;
    }

    const missing: string[] = [];
    if (!student.faculty) missing.push('Faculty / كلية الطالب');
    if (!student.academic_year) missing.push('Academic Year (1-5) / الفرقة الدراسية');
    if (!student.phone || !student.whatsapp_number) missing.push('Egyptian Mobile & WhatsApp / رقم الهاتف والواتساب');
    if (!student.national_id) missing.push('14-digit National ID / الرقم القومي');
    const arParts = (student.full_name_ar || '').trim().split(/\s+/).filter(Boolean);
    const enParts = (student.full_name_en || '').trim().split(/\s+/).filter(Boolean);
    if (arParts.length < 4 || enParts.length < 4) missing.push('Quad Arabic & English Names / الاسم الرباعي بالعربية والإنجليزية');

    const appUrl = getAppBaseUrl();
    const res = await sendIncompleteProfileReminderEmail({
      to: student.email,
      studentName,
      missingFields: missing,
      portalUrl: appUrl,
    });

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to dispatch email via Hostinger Mail API.' };
    }

    return { success: true, message: `Reminder email successfully sent to ${student.email}` };
  } catch (err: any) {
    console.error('sendProfileCompletionReminderEmail error:', err);
    return { success: false, error: err?.message || 'Failed to send reminder email.' };
  }
}

/**
 * Sends reminder emails in parallel batches to all students with incomplete profiles (or a specified list).
 */
export async function sendBulkProfileCompletionReminderEmails(options?: {
  studentIds?: string[];
}): Promise<{
  success: boolean;
  total: number;
  sentCount: number;
  failedCount: number;
  failedEmails?: string[];
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, total: 0, sentCount: 0, failedCount: 0, error: 'Unauthorized: Authentication required.' };
    }
    const role = context.profile.role;
    if (role !== 'president' && role !== 'co_president') {
      return { success: false, total: 0, sentCount: 0, failedCount: 0, error: 'Unauthorized: Presidential permissions required.' };
    }

    const admin = createAdminClient();

    // Fetch target students
    let query = admin
      .from('student_profiles')
      .select('id, email, full_name_en, full_name_ar, faculty, academic_year, phone, whatsapp_number, national_id, status');

    if (options?.studentIds && options.studentIds.length > 0) {
      query = query.in('id', options.studentIds);
    } else {
      query = query.eq('status', 'incomplete');
    }

    const { data: rawStudents, error: fetchErr } = await query;
    if (fetchErr) {
      return { success: false, total: 0, sentCount: 0, failedCount: 0, error: fetchErr.message };
    }

    const targetStudents = (rawStudents || []).filter((s) => s.email && s.email.includes('@'));
    if (targetStudents.length === 0) {
      return { success: true, total: 0, sentCount: 0, failedCount: 0 };
    }

    // Fetch auth names for fallback
    const authUsersRes = await admin.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } }));
    const authMap = new Map<string, string>();
    for (const u of authUsersRes.data?.users || []) {
      const name = u.user_metadata?.full_name || u.user_metadata?.name;
      if (name) authMap.set(u.id, name);
    }

    const appUrl = getAppBaseUrl();
    let sentCount = 0;
    let failedCount = 0;
    const failedEmails: string[] = [];

    // Process in batches of 5 with 250ms delay
    const BATCH_SIZE = 5;
    for (let i = 0; i < targetStudents.length; i += BATCH_SIZE) {
      const batch = targetStudents.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (student) => {
        const studentName = student.full_name_en || student.full_name_ar || authMap.get(student.id) || null;
        const missing: string[] = [];
        if (!student.faculty) missing.push('Faculty / الكلية');
        if (!student.academic_year) missing.push('Academic Year / الفرقة');
        if (!student.phone || !student.whatsapp_number) missing.push('Phone & WhatsApp / الهاتف والواتساب');
        if (!student.national_id) missing.push('National ID / الرقم القومي');

        const result = await sendIncompleteProfileReminderEmail({
          to: student.email!,
          studentName,
          missingFields: missing,
          portalUrl: appUrl,
        });

        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
          failedEmails.push(student.email!);
        }
      });

      await Promise.allSettled(promises);

      // Brief pause between batches to be gentle on SMTP/API
      if (i + BATCH_SIZE < targetStudents.length) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    revalidatePath('/student-portal/admin/students');

    return {
      success: true,
      total: targetStudents.length,
      sentCount,
      failedCount,
      failedEmails: failedEmails.slice(0, 10),
    };
  } catch (err: any) {
    console.error('sendBulkProfileCompletionReminderEmails exception:', err);
    return { success: false, total: 0, sentCount: 0, failedCount: 0, error: err?.message || 'Failed to dispatch bulk reminder emails.' };
  }
}

/**
 * Returns rendered preview HTML and subject line for the incomplete profile reminder email.
 */
export async function getIncompleteProfileEmailPreview(studentId?: string): Promise<{
  success: boolean;
  html?: string;
  subject?: string;
  sender?: string;
  sampleRecipient?: string;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    const appUrl = getAppBaseUrl();
    let studentName = 'Magdy Ayad';
    let sampleRecipient = 'magdyayadnady2006@gmail.com';
    let missingFields = [
      'Faculty / كلية الطالب',
      'Academic Year (1-5) / الفرقة الدراسية',
      'Egyptian Mobile & WhatsApp / رقم الهاتف والواتساب',
      '14-digit National ID / الرقم القومي',
      'Quad Name in Arabic & English / الاسم الرباعي بالعربية والإنجليزية',
    ];

    if (studentId) {
      const admin = createAdminClient();
      const { data: s } = await admin.from('student_profiles').select('*').eq('id', studentId).maybeSingle();
      if (s) {
        sampleRecipient = s.email || sampleRecipient;
        studentName = s.full_name_en || s.full_name_ar || studentName;
      }
    }

    const html = renderIncompleteProfileEmailHtml({
      studentName,
      missingFields,
      portalUrl: appUrl,
    });

    return {
      success: true,
      html,
      subject: '⚠️ مطلوب: استكمال بيانات حسابك الأكاديمي في GDGoC HNU | Complete Your Student Profile',
      sender: 'GDGoC Helwan National University <gdgochnu@uniskills.pro>',
      sampleRecipient,
    };
  } catch (err: any) {
    console.error('getIncompleteProfileEmailPreview error:', err);
    return { success: false, error: err?.message || 'Failed to generate preview' };
  }
}

/**
 * Sends a single test preview email to the logged in admin.
 */
export async function sendTestProfileCompletionEmail(targetEmail: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }
    const role = context.profile.role;
    if (role !== 'president' && role !== 'co_president') {
      return { success: false, error: 'Unauthorized: Presidential permissions required.' };
    }

    const appUrl = getAppBaseUrl();
    const res = await sendIncompleteProfileReminderEmail({
      to: targetEmail,
      studentName: 'Presidential Test Preview',
      missingFields: [
        'Faculty / كلية الطالب',
        'Academic Year (1-5) / الفرقة الدراسية',
        'Egyptian Mobile & WhatsApp / رقم الهاتف والواتساب',
        '14-digit National ID / الرقم القومي',
        'Quad Name in Arabic & English / الاسم الرباعي بالعربية والإنجليزية',
      ],
      portalUrl: appUrl,
    });

    return { success: res.success, error: res.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send test email' };
  }
}

