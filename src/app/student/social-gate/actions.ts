'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { MANDATORY_SOCIAL_CHANNELS } from '@/config/social-gate';

export interface SocialFollowStatus {
  completedAll: boolean;
  followedPlatforms: string[];
  totalRequired: number;
  completedCount: number;
  studentId: string | null;
}

/**
 * Checks if the current student has completed all mandatory social media follows in Supabase.
 */
export async function checkStudentSocialFollowStatus(): Promise<SocialFollowStatus> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return {
        completedAll: true, // If not logged in, don't block
        followedPlatforms: [],
        totalRequired: MANDATORY_SOCIAL_CHANNELS.length,
        completedCount: 0,
        studentId: null,
      };
    }

    const studentId = context.user.id;
    const admin = createAdminClient();

    // Query single follow record for this student
    const { data: record, error } = await admin
      .from('student_social_follows')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) {
      console.warn('checkStudentSocialFollowStatus query error:', error.message);
      return {
        completedAll: false,
        followedPlatforms: [],
        totalRequired: MANDATORY_SOCIAL_CHANNELS.length,
        completedCount: 0,
        studentId,
      };
    }

    const followedPlatforms: string[] = [];
    if (record) {
      if (record.youtube) followedPlatforms.push('youtube');
      if (record.facebook) followedPlatforms.push('facebook');
      if (record.instagram) followedPlatforms.push('instagram');
      if (record.tiktok) followedPlatforms.push('tiktok');
      if (record.linkedin) followedPlatforms.push('linkedin');
      if (record.whatsapp) followedPlatforms.push('whatsapp');
    }

    const completedAll =
      record?.completed_all ||
      followedPlatforms.length >= MANDATORY_SOCIAL_CHANNELS.length;

    return {
      completedAll,
      followedPlatforms,
      totalRequired: MANDATORY_SOCIAL_CHANNELS.length,
      completedCount: followedPlatforms.length,
      studentId,
    };
  } catch (err: any) {
    console.error('checkStudentSocialFollowStatus exception:', err);
    return {
      completedAll: true,
      followedPlatforms: [],
      totalRequired: MANDATORY_SOCIAL_CHANNELS.length,
      completedCount: 0,
      studentId: null,
    };
  }
}

/**
 * Records a verified platform follow for the student in Supabase (Consolidated Single Row).
 */
export async function recordPlatformFollowAction(
  platform: string,
  durationSeconds: number
): Promise<{ success: boolean; completedAll: boolean; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { success: false, completedAll: false, error: 'Authentication required' };
    }

    const studentId = context.user.id;
    const targetChannel = MANDATORY_SOCIAL_CHANNELS.find((c) => c.id === platform);

    if (!targetChannel) {
      return { success: false, completedAll: false, error: 'Invalid platform' };
    }

    // Anti-cheat verification on server: duration must be >= minimum threshold (4s)
    if (durationSeconds < 4) {
      return {
        success: false,
        completedAll: false,
        error: 'Verification failed: Please visit the channel and follow before confirming.',
      };
    }

    const admin = createAdminClient();

    // 1. Fetch current follow record for the student
    const { data: currentRecord } = await admin
      .from('student_social_follows')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    const isYoutube = platform === 'youtube' || !!currentRecord?.youtube;
    const isFacebook = platform === 'facebook' || !!currentRecord?.facebook;
    const isInstagram = platform === 'instagram' || !!currentRecord?.instagram;
    const isTiktok = platform === 'tiktok' || !!currentRecord?.tiktok;
    const isLinkedin = platform === 'linkedin' || !!currentRecord?.linkedin;
    const isWhatsapp = platform === 'whatsapp' || !!currentRecord?.whatsapp;

    const completedAll =
      isYoutube && isFacebook && isInstagram && isTiktok && isLinkedin && isWhatsapp;

    const upsertPayload: Record<string, any> = {
      student_id: studentId,
      [platform]: true,
      completed_all: completedAll,
      updated_at: new Date().toISOString(),
    };

    if (completedAll && !currentRecord?.completed_at) {
      upsertPayload.completed_at = new Date().toISOString();
    }

    // 2. Upsert consolidated row
    const { error: upsertErr } = await admin
      .from('student_social_follows')
      .upsert(upsertPayload, { onConflict: 'student_id' });

    if (upsertErr) {
      console.error('recordPlatformFollowAction upsert error:', upsertErr);
      return { success: false, completedAll: false, error: upsertErr.message };
    }

    return { success: true, completedAll };
  } catch (err: any) {
    console.error('recordPlatformFollowAction exception:', err);
    return { success: false, completedAll: false, error: err?.message || 'Server error' };
  }
}

/**
 * Fetches aggregate social media follow statistics for Chapter Leadership (President).
 */
export async function getSocialFollowStatsForPresident(): Promise<{
  success: boolean;
  totalStudents: number;
  completedAllCount: number;
  completionRate: number;
  byPlatform: Record<string, number>;
}> {
  try {
    const admin = createAdminClient();

    const [studentsRes, followsRes] = await Promise.allSettled([
      admin.from('student_profiles').select('id', { count: 'exact', head: true }),
      admin.from('student_social_follows').select('*'),
    ]);

    const totalStudents = studentsRes.status === 'fulfilled' ? (studentsRes.value.count ?? 0) : 0;
    const records = followsRes.status === 'fulfilled' && followsRes.value.data ? followsRes.value.data : [];

    const byPlatform: Record<string, number> = {
      youtube: 0,
      facebook: 0,
      instagram: 0,
      tiktok: 0,
      linkedin: 0,
      whatsapp: 0,
    };

    let completedAllCount = 0;

    for (const row of records as any[]) {
      if (row.youtube) byPlatform.youtube++;
      if (row.facebook) byPlatform.facebook++;
      if (row.instagram) byPlatform.instagram++;
      if (row.tiktok) byPlatform.tiktok++;
      if (row.linkedin) byPlatform.linkedin++;
      if (row.whatsapp) byPlatform.whatsapp++;
      if (row.completed_all) completedAllCount++;
    }

    const completionRate = totalStudents > 0 ? Math.round((completedAllCount / totalStudents) * 100) : 0;

    return {
      success: true,
      totalStudents,
      completedAllCount,
      completionRate,
      byPlatform,
    };
  } catch (err: any) {
    console.error('getSocialFollowStatsForPresident exception:', err);
    return {
      success: false,
      totalStudents: 0,
      completedAllCount: 0,
      completionRate: 0,
      byPlatform: {},
    };
  }
}
