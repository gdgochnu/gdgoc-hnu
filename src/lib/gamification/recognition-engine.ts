import { createAdminClient } from '@/lib/supabase/admin';
import { awardPoints, getCurrentSeason } from '@/lib/gamification/points-engine';
import { getTierForPoints } from '@/lib/gamification/levels-streaks';
import { dispatchNotificationsSafely } from '@/lib/notifications/triggers';

/**
 * GDGoC HNU OS — Recognition Wall & Live Feed Engine (§4.13)
 * Surfaces "Member of the Month", event shout-outs, and newly-awarded badges as a live feed.
 */

export type FeedItemType = 'badge_earned' | 'shoutout' | 'milestone' | 'points_award';

export interface RecognitionFeedItem {
  id: string;
  type: FeedItemType;
  recipient: {
    id: string;
    name: string;
    avatarUrl: string | null;
    departmentName?: string;
    tierTitle?: string;
  };
  author?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role?: string;
  } | null;
  title: string;
  message: string;
  points?: number;
  badge?: {
    code: string;
    name: string;
    tier: string;
  } | null;
  timestamp: string;
}

export interface MemberOfTheMonth {
  profileId: string;
  fullName: string;
  avatarUrl: string | null;
  departmentName: string;
  departmentCode: string;
  monthlyPoints: number;
  totalPoints: number;
  tier: string;
  monthName: string;
  achievements: string[];
}

export interface RecognitionWallData {
  memberOfTheMonth: MemberOfTheMonth | null;
  feed: RecognitionFeedItem[];
  totalShoutoutsThisMonth: number;
}

let recognitionCache: {
  expiresAt: number;
  data: RecognitionWallData;
} | null = null;
const RECOGNITION_CACHE_TTL = 60 * 1000; // 60 seconds

export function invalidateRecognitionCache() {
  recognitionCache = null;
}

/**
 * Fetches the complete Recognition Wall data including Member of the Month and Live Feed.
 */
export async function getRecognitionWallData(limit: number = 20): Promise<RecognitionWallData> {
  if (recognitionCache && recognitionCache.expiresAt > Date.now()) {
    return recognitionCache.data;
  }

  const admin = createAdminClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const currentMonthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // 1. Fetch departments map for quick lookup
  const { data: depts } = await admin.from('departments').select('id, name, code');
  const deptMap = new Map<string, { name: string; code: string }>();
  (depts || []).forEach((d) => deptMap.set(d.id, { name: d.name, code: d.code }));

  // 2. Compute Member of the Month: Member with most points accumulated this month
  const { data: monthLogs } = await admin
    .from('points_log')
    .select('profile_id, points, reason, created_at')
    .gte('created_at', startOfMonth);

  const monthlyPointsMap = new Map<string, number>();
  const monthlyReasonsMap = new Map<string, string[]>();

  (monthLogs || []).forEach((log) => {
    const current = monthlyPointsMap.get(log.profile_id) || 0;
    monthlyPointsMap.set(log.profile_id, current + Number(log.points || 0));

    if (log.reason) {
      const reasons = monthlyReasonsMap.get(log.profile_id) || [];
      if (reasons.length < 3 && !reasons.includes(log.reason)) {
        reasons.push(log.reason);
      }
      monthlyReasonsMap.set(log.profile_id, reasons);
    }
  });

  let topMemberId: string | null = null;
  let topMonthScore = -1;

  monthlyPointsMap.forEach((pts, profileId) => {
    if (pts > topMonthScore) {
      topMonthScore = pts;
      topMemberId = profileId;
    }
  });

  let memberOfTheMonth: MemberOfTheMonth | null = null;

  // Fallback: If no points logged yet this month, pick top active member overall
  if (!topMemberId) {
    const { data: topActive } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, department_id, overall_score')
      .eq('status', 'active')
      .order('overall_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (topActive) {
      const deptInfo = topActive.department_id ? deptMap.get(topActive.department_id) : null;
      const tierInfo = getTierForPoints(Number(topActive.overall_score || 0));
      memberOfTheMonth = {
        profileId: topActive.id,
        fullName: topActive.full_name,
        avatarUrl: topActive.avatar_url,
        departmentName: deptInfo?.name || 'General Member',
        departmentCode: deptInfo?.code || 'GDG',
        monthlyPoints: 0,
        totalPoints: Number(topActive.overall_score || 0),
        tier: tierInfo.title,
        monthName: currentMonthName,
        achievements: ['All-Time Chapter Standout', 'Consistent Excellence'],
      };
    }
  } else {
    const { data: topProf } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, department_id, overall_score')
      .eq('id', topMemberId)
      .maybeSingle();

    if (topProf) {
      const deptInfo = topProf.department_id ? deptMap.get(topProf.department_id) : null;
      const tierInfo = getTierForPoints(Number(topProf.overall_score || 0));
      memberOfTheMonth = {
        profileId: topProf.id,
        fullName: topProf.full_name,
        avatarUrl: topProf.avatar_url,
        departmentName: deptInfo?.name || 'General Member',
        departmentCode: deptInfo?.code || 'GDG',
        monthlyPoints: topMonthScore,
        totalPoints: Number(topProf.overall_score || 0),
        tier: tierInfo.title,
        monthName: currentMonthName,
        achievements: monthlyReasonsMap.get(topProf.id) || ['High Monthly Engagement', 'Active Contributor'],
      };
    }
  }

  // 3. Fetch Recent Badges Awarded
  const { data: recentBadges } = await admin
    .from('member_badges')
    .select(`
      id,
      awarded_at,
      notes,
      awarded_by,
      profile:profiles!member_badges_profile_id_fkey(id, full_name, avatar_url, department_id, overall_score),
      badge:badges(id, code, name, description, tier, points_reward),
      awarded_by_profile:profiles!member_badges_awarded_by_fkey(id, full_name, avatar_url, role)
    `)
    .order('awarded_at', { ascending: false })
    .limit(limit);

  // 4. Fetch Recent High-Value Points / Kudos / Shoutouts
  const { data: recentPoints } = await admin
    .from('points_log')
    .select(`
      id,
      points,
      reason,
      action_key,
      created_at,
      profile:profiles!points_log_profile_id_fkey(id, full_name, avatar_url, department_id, overall_score),
      awarded_by_profile:profiles!points_log_awarded_by_fkey(id, full_name, avatar_url, role)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  // 5. Combine and Sort Feed
  const feedItems: RecognitionFeedItem[] = [];

  (recentBadges || []).forEach((b: any) => {
    if (!b.profile || !b.badge) return;
    const deptInfo = b.profile.department_id ? deptMap.get(b.profile.department_id) : null;
    const tier = getTierForPoints(Number(b.profile.overall_score || 0));

    feedItems.push({
      id: `badge-${b.id}`,
      type: 'badge_earned',
      recipient: {
        id: b.profile.id,
        name: b.profile.full_name,
        avatarUrl: b.profile.avatar_url,
        departmentName: deptInfo?.name,
        tierTitle: tier.title,
      },
      author: b.awarded_by_profile
        ? {
            id: b.awarded_by_profile.id,
            name: b.awarded_by_profile.full_name,
            avatarUrl: b.awarded_by_profile.avatar_url,
            role: b.awarded_by_profile.role,
          }
        : null,
      title: `Unlocked Badge: ${b.badge.name}`,
      message: b.notes || b.badge.description || `Awarded the ${b.badge.name} badge!`,
      points: b.badge.points_reward,
      badge: {
        code: b.badge.code,
        name: b.badge.name,
        tier: b.badge.tier,
      },
      timestamp: b.awarded_at,
    });
  });

  (recentPoints || []).forEach((p: any) => {
    if (!p.profile) return;
    const deptInfo = p.profile.department_id ? deptMap.get(p.profile.department_id) : null;
    const tier = getTierForPoints(Number(p.profile.overall_score || 0));
    const isShoutout = p.action_key === 'shoutout' || p.action_key === 'kudos' || !!p.awarded_by_profile;

    feedItems.push({
      id: `points-${p.id}`,
      type: isShoutout ? 'shoutout' : 'points_award',
      recipient: {
        id: p.profile.id,
        name: p.profile.full_name,
        avatarUrl: p.profile.avatar_url,
        departmentName: deptInfo?.name,
        tierTitle: tier.title,
      },
      author: p.awarded_by_profile
        ? {
            id: p.awarded_by_profile.id,
            name: p.awarded_by_profile.full_name,
            avatarUrl: p.awarded_by_profile.avatar_url,
            role: p.awarded_by_profile.role,
          }
        : null,
      title: isShoutout ? 'Peer Recognition & Shout-out' : 'Achievement Points',
      message: p.reason || `Awarded ${p.points} points for chapter contribution.`,
      points: Number(p.points || 0),
      timestamp: p.created_at,
    });
  });

  // Sort by timestamp descending
  feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const countShoutoutsThisMonth = feedItems.filter(
    (item) => item.type === 'shoutout' && new Date(item.timestamp) >= new Date(startOfMonth)
  ).length;

  const result: RecognitionWallData = {
    memberOfTheMonth,
    feed: feedItems.slice(0, limit),
    totalShoutoutsThisMonth: countShoutoutsThisMonth,
  };

  recognitionCache = {
    expiresAt: Date.now() + RECOGNITION_CACHE_TTL,
    data: result,
  };

  return result;
}

/**
 * Creates a peer recognition shout-out for a member.
 * Automatically awards recognition bonus points and creates a notification.
 */
export async function sendShoutOut(input: {
  targetProfileId: string;
  senderProfileId: string;
  message: string;
  points?: number;
}): Promise<{ success: boolean; error?: string; pointsAwarded?: number }> {
  try {
    const admin = createAdminClient();

    // 1. Verify target profile exists
    const { data: target } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', input.targetProfileId)
      .single();

    if (!target) return { success: false, error: 'Target member not found' };

    // 2. Fetch sender profile
    const { data: sender } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', input.senderProfileId)
      .single();

    if (!sender) return { success: false, error: 'Sender profile not found' };

    // Prevent sending shout-out to oneself
    if (input.targetProfileId === input.senderProfileId) {
      return { success: false, error: 'You cannot send a shout-out to yourself.' };
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 3. Duplicate prevention: max 1 shout-out to the same peer per 24 hours
    const { data: alreadySentToPeer } = await admin
      .from('points_log')
      .select('id')
      .eq('action_key', 'shoutout')
      .eq('profile_id', input.targetProfileId)
      .eq('awarded_by', input.senderProfileId)
      .gte('created_at', twentyFourHoursAgo)
      .maybeSingle();

    if (alreadySentToPeer) {
      return {
        success: false,
        error: `You already sent a shout-out to ${target.full_name} today. Share the appreciation with other teammates!`,
      };
    }

    // 4. Rate limit: max 5 shout-outs per 24 hours per member
    const DAILY_LIMIT = 5;
    const { count: dailyCount } = await admin
      .from('points_log')
      .select('id', { count: 'exact', head: true })
      .eq('action_key', 'shoutout')
      .eq('awarded_by', input.senderProfileId)
      .gte('created_at', twentyFourHoursAgo);

    if (dailyCount !== null && dailyCount >= DAILY_LIMIT) {
      return {
        success: false,
        error: `Daily shout-out limit reached (${DAILY_LIMIT}/day). You can send more shout-outs tomorrow!`,
      };
    }

    const pts = input.points || 15; // default 15 bonus points for recognition

    // 5. Award points via points engine
    const awardRes = await awardPoints({
      profileId: input.targetProfileId,
      actionKey: 'shoutout',
      customPoints: pts,
      customReason: `Shout-out from ${sender.full_name}: "${input.message.trim()}"`,
      awardedBy: input.senderProfileId,
    });

    if (!awardRes.success) {
      return {
        success: false,
        error: awardRes.error || awardRes.skipReason || 'Failed to award points for shout-out',
      };
    }

    // 6. Create in-app notification for recipient
    await dispatchNotificationsSafely([
      {
        profileId: input.targetProfileId,
        type: 'gamification_award',
        title: `🌟 Shout-out from ${sender.full_name}!`,
        message: `"${input.message.trim()}" (+${pts} points)`,
        relatedEntityType: 'shoutout',
        relatedEntityId: input.targetProfileId,
      },
    ]);

    invalidateRecognitionCache();

    return {
      success: true,
      pointsAwarded: pts,
    };
  } catch (err: any) {
    console.error('[sendShoutOut] error:', err);
    return { success: false, error: err.message };
  }
}
