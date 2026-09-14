'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { StudentProfile, StudentOnboardingInput, StudentDashboardData } from '@/types/student';
import { revalidatePath } from 'next/cache';

/**
 * 1. Get student profile for currently logged in user (or by studentId for authorized staff)
 */
export async function getCurrentStudentProfile(): Promise<{
  success: boolean;
  student: StudentProfile | null;
  isTeamMember: boolean;
  teamProfileId: string | null;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { success: false, student: null, isTeamMember: false, teamProfileId: null, error: 'Unauthorized' };
    }

    const admin = createAdminClient();

    // Query student profile
    const { data: student, error } = await admin
      .from('student_profiles')
      .select('*')
      .eq('id', context.user.id)
      .maybeSingle();

    if (error) {
      console.error('getCurrentStudentProfile error:', error);
      return { success: false, student: null, isTeamMember: false, teamProfileId: null, error: error.message };
    }

    // Check if user is also a team member
    const teamProfileId = context.profile?.id || student?.team_profile_id || null;

    // Auto-link team_profile_id if not linked yet
    if (student && !student.team_profile_id && context.profile?.id) {
      await admin
        .from('student_profiles')
        .update({ team_profile_id: context.profile.id, updated_at: new Date().toISOString() })
        .eq('id', student.id);
      student.team_profile_id = context.profile.id;
    }

    return {
      success: true,
      student: student as StudentProfile | null,
      isTeamMember: Boolean(context.profile),
      teamProfileId,
    };
  } catch (err: any) {
    console.error('getCurrentStudentProfile exception:', err);
    return { success: false, student: null, isTeamMember: false, teamProfileId: null, error: err.message };
  }
}

/**
 * 2. Check and auto-link student profile to existing team member profile by email
 */
export async function linkStudentToTeamMember(studentId: string, email: string): Promise<{
  linked: boolean;
  teamProfileId?: string;
}> {
  try {
    if (!email || !studentId) return { linked: false };
    const admin = createAdminClient();

    const { data: teamProf } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (teamProf?.id) {
      await admin
        .from('student_profiles')
        .update({ team_profile_id: teamProf.id, updated_at: new Date().toISOString() })
        .eq('id', studentId);
      return { linked: true, teamProfileId: teamProf.id };
    }

    return { linked: false };
  } catch (err) {
    console.warn('linkStudentToTeamMember warning:', err);
    return { linked: false };
  }
}

/**
 * 3. Complete student onboarding form to activate account
 */
export async function completeStudentProfile(input: StudentOnboardingInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const admin = createAdminClient();

    // Check if student profile exists, if not initialize it
    const { data: existing } = await admin
      .from('student_profiles')
      .select('id, team_profile_id')
      .eq('id', context.user.id)
      .maybeSingle();

    const teamProfileId = existing?.team_profile_id || context.profile?.id || null;

    const profileData = {
      id: context.user.id,
      email: context.user.email?.toLowerCase().trim() || '',
      team_profile_id: teamProfileId,
      full_name_ar: input.full_name_ar.trim(),
      full_name_en: input.full_name_en.trim(),
      national_id: input.national_id.trim(),
      university: input.university?.trim() || 'Helwan National University',
      faculty: input.faculty.trim(),
      department_major: input.department_major?.trim() || null,
      academic_year: input.academic_year,
      phone: input.phone.trim(),
      whatsapp_number: input.whatsapp_number.trim(),
      facebook_url: input.facebook_url?.trim() || null,
      instagram_url: input.instagram_url?.trim() || null,
      linkedin_url: input.linkedin_url?.trim() || null,
      avatar_url: context.profile?.avatar_url || null,
      status: 'active', // Immediately active per spec §4.S.2
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await admin
      .from('student_profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (upsertErr) {
      console.error('completeStudentProfile upsert error:', upsertErr);
      return { success: false, error: upsertErr.message };
    }

    revalidatePath('/student');
    revalidatePath('/student/dashboard');
    revalidatePath('/student/onboarding');

    return { success: true };
  } catch (err: any) {
    console.error('completeStudentProfile exception:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * 4. Get student onboarding data, checking auto-link bridge with profiles
 */
export async function getStudentOnboardingData(): Promise<{
  authenticated: boolean;
  isAlreadyActive: boolean;
  isTeamMember: boolean;
  student: StudentProfile | null;
  faculties: Array<{ id: string; name_ar: string; name_en: string; sort_order: number }>;
  prefilled: {
    fullNameAr: string;
    fullNameEn: string;
    email: string;
    nationalId: string;
    university: string;
    faculty: string;
    departmentMajor: string;
    academicYear: number;
    phone: string;
    whatsappNumber: string;
    facebookUrl: string;
    instagramUrl: string;
    linkedinUrl: string;
    avatarUrl: string | null;
  };
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return {
        authenticated: false,
        isAlreadyActive: false,
        isTeamMember: false,
        student: null,
        faculties: [],
        prefilled: {
          fullNameAr: '',
          fullNameEn: '',
          email: '',
          nationalId: '',
          university: 'Helwan National University',
          faculty: '',
          departmentMajor: '',
          academicYear: 1,
          phone: '',
          whatsappNumber: '',
          facebookUrl: '',
          instagramUrl: '',
          linkedinUrl: '',
          avatarUrl: null,
        },
      };
    }

    const admin = createAdminClient();

    // 1. Fetch faculties options
    const { data: facultiesData } = await admin
      .from('faculty_options')
      .select('id, name_ar, name_en, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const faculties = facultiesData || [];

    // 2. Fetch team profile if exists
    let teamProfile = context.profile;
    if (!teamProfile && context.user.email) {
      const { data: matchedProfile } = await admin
        .from('profiles')
        .select('*')
        .eq('email', context.user.email.toLowerCase().trim())
        .maybeSingle();
      if (matchedProfile) {
        teamProfile = matchedProfile as any;
      }
    }

    // 3. Fetch or initialize student profile
    let { data: student } = await admin
      .from('student_profiles')
      .select('*')
      .eq('id', context.user.id)
      .maybeSingle();

    // If not exists yet, create initial incomplete record
    if (!student) {
      const { data: newStudent } = await admin
        .from('student_profiles')
        .insert({
          id: context.user.id,
          email: context.user.email?.toLowerCase().trim() || '',
          team_profile_id: teamProfile?.id || null,
          status: 'incomplete',
        })
        .select('*')
        .maybeSingle();

      student = newStudent || null;
    } else if (!student.team_profile_id && teamProfile?.id) {
      // Bridge link if not set
      await admin
        .from('student_profiles')
        .update({ team_profile_id: teamProfile.id, updated_at: new Date().toISOString() })
        .eq('id', student.id);
      student.team_profile_id = teamProfile.id;
    }

    const isAlreadyActive = student?.status === 'active';
    const isTeamMember = Boolean(teamProfile);

    const prefilled = {
      fullNameAr: student?.full_name_ar || (teamProfile as any)?.full_name_ar || '',
      fullNameEn: student?.full_name_en || (teamProfile as any)?.full_name_en || (teamProfile as any)?.full_name || '',
      email: student?.email || context.user.email || '',
      nationalId: student?.national_id || (teamProfile as any)?.national_id || '',
      university: student?.university || 'Helwan National University',
      faculty: student?.faculty || (teamProfile as any)?.faculty || '',
      departmentMajor: student?.department_major || (teamProfile as any)?.department_major || '',
      academicYear: student?.academic_year || (teamProfile as any)?.academic_year || 1,
      phone: student?.phone || (teamProfile as any)?.phone || '',
      whatsappNumber: student?.whatsapp_number || (teamProfile as any)?.whatsapp_number || (teamProfile as any)?.phone || '',
      facebookUrl: student?.facebook_url || (teamProfile as any)?.facebook_url || '',
      instagramUrl: student?.instagram_url || (teamProfile as any)?.instagram_url || '',
      linkedinUrl: student?.linkedin_url || (teamProfile as any)?.linkedin_url || '',
      avatarUrl: student?.avatar_url || (teamProfile as any)?.avatar_url || null,
    };

    return {
      authenticated: true,
      isAlreadyActive,
      isTeamMember,
      student: student as StudentProfile | null,
      faculties,
      prefilled,
    };
  } catch (err: any) {
    console.error('getStudentOnboardingData exception:', err);
    return {
      authenticated: false,
      isAlreadyActive: false,
      isTeamMember: false,
      student: null,
      faculties: [],
      prefilled: {
        fullNameAr: '',
        fullNameEn: '',
        email: '',
        nationalId: '',
        university: 'Helwan National University',
        faculty: '',
        departmentMajor: '',
        academicYear: 1,
        phone: '',
        whatsappNumber: '',
        facebookUrl: '',
        instagramUrl: '',
        linkedinUrl: '',
        avatarUrl: null,
      },
      error: err.message,
    };
  }
}

/**
 * 5. Get full dashboard data for active student
 */
export async function getStudentDashboardData(): Promise<{
  authenticated: boolean;
  needsOnboarding: boolean;
  data?: StudentDashboardData;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { authenticated: false, needsOnboarding: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();

    // 1. Fetch student profile
    const { data: student, error: stuErr } = await admin
      .from('student_profiles')
      .select('*')
      .eq('id', context.user.id)
      .maybeSingle();

    if (stuErr) {
      console.error('getStudentDashboardData student error:', stuErr);
      return { authenticated: true, needsOnboarding: false, error: stuErr.message };
    }

    if (!student || student.status !== 'active') {
      return { authenticated: true, needsOnboarding: true };
    }

    // 2. Fetch linked team member profile if exists
    let teamProfile: StudentDashboardData['teamProfile'] = null;
    const teamProfileId = student.team_profile_id || context.profile?.id;

    if (teamProfileId) {
      const { data: tp } = await admin
        .from('profiles')
        .select(`
          id,
          role,
          department:departments (
            name,
            code,
            branch
          )
        `)
        .eq('id', teamProfileId)
        .maybeSingle();

      if (tp) {
        teamProfile = {
          id: tp.id,
          role: tp.role,
          department: (tp.department as any) || null,
        };
      }
    }

    // 3. Certificates query
    let certificates: StudentDashboardData['certificates'] = [];
    try {
      const { data: certs } = await admin
        .from('certificates')
        .select('id, title, certificate_number, verification_code, issue_date, pdf_drive_url')
        .or(`recipient_email.eq.${student.email}${teamProfileId ? `,recipient_profile_id.eq.${teamProfileId}` : ''}`)
        .order('created_at', { ascending: false });

      if (certs) {
        certificates = certs.map((c: any) => ({
          id: c.id,
          title: c.title,
          certificate_number: c.certificate_number,
          verification_code: c.verification_code,
          issue_date: c.issue_date,
          pdf_drive_url: c.pdf_drive_url || null,
        }));
      }
    } catch {
      certificates = [];
    }

    // 4. Placeholder arrays for courses / workshops / tasks / quizzes / attendance
    // (These will be populated automatically as Sub-Phase S.B, S.C, S.D, S.E tables are created)
    let courses: StudentDashboardData['courses'] = [];
    let workshops: StudentDashboardData['workshops'] = [];
    let tasks: StudentDashboardData['tasks'] = [];
    let quizzes: StudentDashboardData['quizzes'] = [];
    let attendance: StudentDashboardData['attendance'] = [];

    // Safely check if student_attendance table exists
    try {
      const { data: attData } = await admin
        .from('student_attendance')
        .select('*')
        .eq('student_id', student.id)
        .order('scanned_at', { ascending: false })
        .limit(20);

      if (attData) {
        attendance = attData.map((a: any) => ({
          id: a.id,
          event_title: a.event_title || 'Session',
          type: a.type || 'course',
          session_title: a.session_title || 'Session',
          date: a.date || a.scanned_at,
          scanned_at: a.scanned_at,
        }));
      }
    } catch {
      // Table not yet migrated
    }

    const totalSessionsAttended = attendance.length;
    const enrolledCoursesCount = courses.length;
    const workshopsCount = workshops.length;
    const pendingTasksCount = tasks.filter((t: any) => t.status === 'pending').length;
    const certificatesCount = certificates.length;

    const stats = {
      enrolledCoursesCount,
      workshopsCount,
      attendanceRate: totalSessionsAttended > 0 ? 100 : 0,
      totalSessionsAttended,
      pendingTasksCount,
      certificatesCount,
    };

    return {
      authenticated: true,
      needsOnboarding: false,
      data: {
        student: student as StudentProfile,
        teamProfile,
        stats,
        courses,
        workshops,
        tasks,
        quizzes,
        attendance,
        certificates,
      },
    };
  } catch (err: any) {
    console.error('getStudentDashboardData exception:', err);
    return { authenticated: false, needsOnboarding: false, error: err.message };
  }
}

/**
 * 6. Get data for permanent student QR pass
 */
export async function getStudentQrPassData(): Promise<{
  authenticated: boolean;
  needsOnboarding: boolean;
  student?: StudentProfile;
  teamRole?: string | null;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { authenticated: false, needsOnboarding: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();
    const { data: student } = await admin
      .from('student_profiles')
      .select('*')
      .eq('id', context.user.id)
      .maybeSingle();

    if (!student || student.status !== 'active') {
      return { authenticated: true, needsOnboarding: true };
    }

    let teamRole: string | null = null;
    if (student.team_profile_id || context.profile?.id) {
      const { data: tp } = await admin
        .from('profiles')
        .select('role')
        .eq('id', student.team_profile_id || context.profile?.id)
        .maybeSingle();
      if (tp) teamRole = tp.role;
    }

    return {
      authenticated: true,
      needsOnboarding: false,
      student: student as StudentProfile,
      teamRole,
    };
  } catch (err: any) {
    return { authenticated: false, needsOnboarding: false, error: err.message };
  }
}


