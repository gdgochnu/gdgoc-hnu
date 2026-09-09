import { createAdminClient } from '@/lib/supabase/admin';
import { awardPoints } from '@/lib/gamification/points-engine';

/**
 * GDGoC HNU OS — Badge System (§4.13)
 */

export type BadgeCategory = 'milestone' | 'attendance' | 'leadership' | 'special';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon_url: string | null;
  category: BadgeCategory;
  tier: BadgeTier;
  points_reward: number;
  created_at: string;
}

export interface MemberBadgeRecord {
  id: string;
  profile_id: string;
  badge_id: string;
  awarded_by: string | null;
  awarded_at: string;
  notes: string | null;
  badge: Badge;
  awarded_by_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  } | null;
}

export interface AwardBadgeResult {
  success: boolean;
  awarded: boolean;
  badge?: Badge;
  alreadyEarned?: boolean;
  pointsAwarded?: number;
  error?: string;
}

export const BADGE_TIER_STYLES: Record<
  BadgeTier,
  { color: string; bgColor: string; borderColor: string; label: string }
> = {
  bronze: {
    color: '#cd7f32',
    bgColor: 'rgba(205, 127, 50, 0.12)',
    borderColor: 'rgba(205, 127, 50, 0.35)',
    label: 'Bronze',
  },
  silver: {
    color: '#c0c0c0',
    bgColor: 'rgba(192, 192, 192, 0.12)',
    borderColor: 'rgba(192, 192, 192, 0.35)',
    label: 'Silver',
  },
  gold: {
    color: '#ffd700',
    bgColor: 'rgba(255, 215, 0, 0.12)',
    borderColor: 'rgba(255, 215, 0, 0.35)',
    label: 'Gold',
  },
  platinum: {
    color: '#00e5ff',
    bgColor: 'rgba(0, 229, 255, 0.12)',
    borderColor: 'rgba(0, 229, 255, 0.35)',
    label: 'Platinum',
  },
  diamond: {
    color: '#b388ff',
    bgColor: 'rgba(179, 136, 255, 0.15)',
    borderColor: 'rgba(179, 136, 255, 0.45)',
    label: 'Diamond',
  },
};

/**
 * Fetches the entire official badge catalog.
 */
export async function getBadgeCatalog(): Promise<Badge[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('badges')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getBadgeCatalog] error:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetches all badges earned by a member.
 */
export async function getMemberBadges(profileId: string): Promise<MemberBadgeRecord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('member_badges')
    .select(`
      id, profile_id, badge_id, awarded_by, awarded_at, notes,
      badge:badges(*),
      awarded_by_profile:profiles!awarded_by(id, full_name, avatar_url, role)
    `)
    .eq('profile_id', profileId)
    .order('awarded_at', { ascending: false });

  if (error) {
    console.error('[getMemberBadges] error:', error);
    return [];
  }
  return (data as any[]) || [];
}

/**
 * Awards a badge to a member.
 * Prevents duplicates via unique constraint and sends in-app celebration notification.
 */
export async function awardBadge(input: {
  profileId: string;
  badgeCode: string;
  awardedBy?: string;
  notes?: string;
}): Promise<AwardBadgeResult> {
  const admin = createAdminClient();

  try {
    // 1. Fetch badge details
    const { data: badge, error: badgeErr } = await admin
      .from('badges')
      .select('*')
      .eq('code', input.badgeCode)
      .maybeSingle();

    if (badgeErr || !badge) {
      return { success: false, awarded: false, error: `Badge '${input.badgeCode}' not found.` };
    }

    // 2. Check if already earned
    const { data: existing } = await admin
      .from('member_badges')
      .select('id')
      .eq('profile_id', input.profileId)
      .eq('badge_id', badge.id)
      .maybeSingle();

    if (existing) {
      return {
        success: true,
        awarded: false,
        alreadyEarned: true,
        badge,
      };
    }

    // 3. Insert member_badges row
    const now = new Date().toISOString();
    const { error: insertErr } = await admin.from('member_badges').insert({
      profile_id: input.profileId,
      badge_id: badge.id,
      awarded_by: input.awardedBy || null,
      awarded_at: now,
      notes: input.notes || badge.description,
    });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return { success: true, awarded: false, alreadyEarned: true, badge };
      }
      throw insertErr;
    }

    // 4. Award bonus points if badge has points_reward > 0
    let pointsAwarded = 0;
    if (badge.points_reward > 0) {
      const ptsRes = await awardPoints({
        profileId: input.profileId,
        actionKey: 'badge_unlocked',
        customPoints: badge.points_reward,
        customReason: `Unlocked Badge: ${badge.name}`,
        awardedBy: input.awardedBy,
        relatedEntityId: badge.id,
      });
      if (ptsRes.success) {
        pointsAwarded = ptsRes.pointsAwarded;
      }
    }

    // 5. Send in-app celebration notification
    await admin.from('notifications').insert({
      profile_id: input.profileId,
      type: 'badge_awarded',
      title: `Badge Unlocked: ${badge.name}! 🏅`,
      message: `Congratulations! You've unlocked the "${badge.name}" badge (${badge.tier.toUpperCase()} tier).`,
      related_entity_type: 'badge',
      related_entity_id: badge.id,
      is_read: false,
    });

    return {
      success: true,
      awarded: true,
      badge,
      pointsAwarded,
    };
  } catch (err: any) {
    console.error('[awardBadge] error:', err);
    return { success: false, awarded: false, error: err.message };
  }
}

/**
 * Evaluates automatic milestone criteria for a member and awards any newly earned badges:
 * - 'first_event': Attended >= 1 event
 * - 'ten_tasks_done': Completed >= 10 tasks
 * - 'onboarded': Profile active and completed onboarding checklist
 */
export async function checkAutomaticBadges(profileId: string): Promise<{
  newlyAwarded: string[];
}> {
  const admin = createAdminClient();
  const newlyAwarded: string[] = [];

  try {
    // Check 1: First Event
    const { count: attendanceCount } = await admin
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId);

    if (attendanceCount && attendanceCount >= 1) {
      const res = await awardBadge({
        profileId,
        badgeCode: 'first_event',
        notes: 'Attended their first GDGoC HNU chapter event.',
      });
      if (res.awarded) newlyAwarded.push('first_event');
    }

    // Check 2: 10 Tasks Done
    const { count: tasksCount } = await admin
      .from('task_assignees')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('status', 'done');

    if (tasksCount && tasksCount >= 10) {
      const res = await awardBadge({
        profileId,
        badgeCode: 'ten_tasks_done',
        notes: 'Successfully completed 10 assigned tasks.',
      });
      if (res.awarded) newlyAwarded.push('ten_tasks_done');
    }

    // Check 3: Onboarded badge
    const { data: profile } = await admin
      .from('profiles')
      .select('status')
      .eq('id', profileId)
      .single();

    if (profile && profile.status === 'active') {
      const { count: pendingItems } = await admin
        .from('onboarding_checklists')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .eq('is_completed', false);

      // If all checklist items are completed (or none pending)
      if (pendingItems === 0) {
        const res = await awardBadge({
          profileId,
          badgeCode: 'onboarded',
          notes: 'Completed onboarding checklist and active chapter member.',
        });
        if (res.awarded) newlyAwarded.push('onboarded');
      }
    }
  } catch (err: any) {
    console.error('[checkAutomaticBadges] error:', err);
  }

  return { newlyAwarded };
}
