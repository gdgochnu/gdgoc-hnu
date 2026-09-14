'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { StudentProfile, StudentOnboardingInput } from '@/types/student';
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
