'use server';

import { getUserContext } from '@/lib/auth/get-user-context';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getPointRules,
  getPointRule,
  updatePointRule,
  awardPoints,
  deductPoints,
  getMemberPointsHistory,
  getMemberPointsSummary,
  getCurrentSeason,
} from '@/lib/gamification/points-engine';
import { getTierForPoints, calculateMemberStreaks } from '@/lib/gamification/levels-streaks';
import {
  getBadgeCatalog,
  getMemberBadges,
  awardBadge,
  checkAutomaticBadges,
  Badge,
  MemberBadgeRecord,
} from '@/lib/gamification/badges-engine';
import {
  getSeasonalLeaderboard,
  getAllTimeLeaderboard,
  resetSeasonJob,
  setLeaderboardOptIn,
  LeaderboardResult,
} from '@/lib/gamification/leaderboard';
import {
  getCommitteeLeaderboard,
  CommitteeLeaderboardResult,
} from '@/lib/gamification/committee-leaderboard';
import {
  getRecognitionWallData,
  sendShoutOut,
  RecognitionWallData,
} from '@/lib/gamification/recognition-engine';
import type { PointRule, PointsLogEntry, MemberPointsSummary } from '@/types/gamification';

/**
 * Server action: Fetch all point rules (active and inactive)
 */
export async function fetchPointRulesAction(): Promise<{
  success: boolean;
  rules: PointRule[];
  error?: string;
}> {
  try {
    const rules = await getPointRules(true);
    return { success: true, rules };
  } catch (err: any) {
    return { success: false, rules: [], error: err.message };
  }
}

/**
 * Server action: Update a point rule (President/Co-President only)
 */
export async function updatePointRuleAction(
  ruleId: string,
  updates: {
    points?: number;
    is_active?: boolean;
    title?: string;
    description?: string;
  }
): Promise<{ success: boolean; rule?: PointRule; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.profile) return { success: false, error: 'Unauthorized' };

    const role = context.profile.role;
    if (role !== 'president' && role !== 'co_president') {
      return { success: false, error: 'Only chapter presidential leadership can tune point rules.' };
    }

    return await updatePointRule(ruleId, updates);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Award manual bonus points to a member (Heads & Presidents)
 */
export async function awardManualPointsAction(input: {
  targetProfileId: string;
  actionKey: string;
  customPoints?: number;
  reason?: string;
}): Promise<{ success: boolean; pointsAwarded?: number; newTotal?: number; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.profile) return { success: false, error: 'Unauthorized' };

    const role = context.profile.role;
    const canAward = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(role);
    if (!canAward) {
      return { success: false, error: 'You do not have permission to award points.' };
    }

    const res = await awardPoints({
      profileId: input.targetProfileId,
      actionKey: input.actionKey,
      customPoints: input.customPoints,
      customReason: input.reason,
      awardedBy: context.profile.id,
    });

    if (!res.success) {
      return { success: false, error: res.error || res.skipReason || 'Failed to award points' };
    }

    return {
      success: true,
      pointsAwarded: res.pointsAwarded,
      newTotal: res.newTotalPoints,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Fetch current logged-in member's points summary
 */
export async function fetchMyPointsSummaryAction(): Promise<{
  success: boolean;
  summary?: MemberPointsSummary;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.profile) return { success: false, error: 'Unauthorized' };

    const summary = await getMemberPointsSummary(context.profile.id);
    return { success: true, summary };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Fetch points history for any member
 */
export async function fetchMemberPointsHistoryAction(
  profileId: string
): Promise<{
  success: boolean;
  history: PointsLogEntry[];
  error?: string;
}> {
  try {
    const history = await getMemberPointsHistory(profileId);
    return { success: true, history };
  } catch (err: any) {
    return { success: false, history: [], error: err.message };
  }
}

/**
 * Server action: Fetch tier and streaks for a member
 */
export async function fetchMemberTierAndStreaksAction(targetProfileId?: string) {
  try {
    const context = await getUserContext();
    const profileId = targetProfileId || context.profile?.id;
    if (!profileId) return { success: false, error: 'Profile ID required' };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, overall_score')
      .eq('id', profileId)
      .single();

    if (!profile) return { success: false, error: 'Profile not found' };

    const tierInfo = getTierForPoints(Number(profile.overall_score || 0));
    const streaks = await calculateMemberStreaks(profileId);

    return {
      success: true,
      profile: { id: profile.id, name: profile.full_name },
      tier: tierInfo,
      streaks,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Fetch entire badge catalog
 */
export async function fetchBadgeCatalogAction(): Promise<{
  success: boolean;
  badges: Badge[];
  error?: string;
}> {
  try {
    const badges = await getBadgeCatalog();
    return { success: true, badges };
  } catch (err: any) {
    return { success: false, badges: [], error: err.message };
  }
}

/**
 * Server action: Fetch member's badges
 */
export async function fetchMemberBadgesAction(targetProfileId?: string): Promise<{
  success: boolean;
  badges: MemberBadgeRecord[];
  error?: string;
}> {
  try {
    const context = await getUserContext();
    const profileId = targetProfileId || context.profile?.id;
    if (!profileId) return { success: false, badges: [], error: 'Profile ID required' };

    const badges = await getMemberBadges(profileId);
    return { success: true, badges };
  } catch (err: any) {
    return { success: false, badges: [], error: err.message };
  }
}

/**
 * Server action: Award a badge manually (Heads / Presidents)
 */
export async function awardBadgeManualAction(input: {
  targetProfileId: string;
  badgeCode: string;
  notes?: string;
}) {
  try {
    const context = await getUserContext();
    if (!context.profile) return { success: false, error: 'Unauthorized' };

    const role = context.profile.role;
    const canAward = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(role);
    if (!canAward) {
      return { success: false, error: 'Only leadership can award badges.' };
    }

    return await awardBadge({
      profileId: input.targetProfileId,
      badgeCode: input.badgeCode,
      awardedBy: context.profile.id,
      notes: input.notes,
    });
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Check and award automatic badges for current user
 */
export async function checkMyAutomaticBadgesAction() {
  try {
    const context = await getUserContext();
    if (!context.profile) return { success: false, newlyAwarded: [] };

    const res = await checkAutomaticBadges(context.profile.id);
    return { success: true, newlyAwarded: res.newlyAwarded };
  } catch (err: any) {
    return { success: false, newlyAwarded: [], error: err.message };
  }
}

/**
 * Server action: Fetch seasonal and all-time leaderboards
 */
export async function fetchLeaderboardsAction(departmentId?: string): Promise<{
  success: boolean;
  seasonal?: LeaderboardResult;
  allTime?: LeaderboardResult;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    const currentUserId = context.profile?.id;

    const [seasonal, allTime] = await Promise.all([
      getSeasonalLeaderboard({ departmentId, currentUserId }),
      getAllTimeLeaderboard({ departmentId, currentUserId }),
    ]);

    return { success: true, seasonal, allTime };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Toggle leaderboard opt-in
 */
export async function setLeaderboardOptInAction(optIn: boolean) {
  try {
    const context = await getUserContext();
    if (!context.profile) return { success: false, error: 'Unauthorized' };

    return await setLeaderboardOptIn(context.profile.id, optIn);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Reset season (President/Co-President only)
 */
export async function resetSeasonJobAction(newSeasonName: string) {
  try {
    const context = await getUserContext();
    if (!context.profile) return { success: false, error: 'Unauthorized' };

    const role = context.profile.role;
    if (role !== 'president' && role !== 'co_president') {
      return { success: false, error: 'Only presidential leadership can trigger a season reset.' };
    }

    return await resetSeasonJob({
      newSeasonName,
      callerId: context.profile.id,
    });
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Fetch committee leaderboard rankings
 */
export async function fetchCommitteeLeaderboardAction(params?: {
  branch?: 'tech' | 'non_tech' | 'all';
  season?: string;
}): Promise<{
  success: boolean;
  data?: CommitteeLeaderboardResult;
  error?: string;
}> {
  try {
    const data = await getCommitteeLeaderboard(params);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Fetch recognition wall and live feed
 */
export async function fetchRecognitionWallAction(limit?: number): Promise<{
  success: boolean;
  data?: RecognitionWallData;
  error?: string;
}> {
  try {
    const data = await getRecognitionWallData(limit);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server action: Send a peer shout-out
 */
export async function sendShoutOutAction(input: {
  targetProfileId: string;
  message: string;
  points?: number;
}): Promise<{
  success: boolean;
  pointsAwarded?: number;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.profile) return { success: false, error: 'Unauthorized' };

    return await sendShoutOut({
      targetProfileId: input.targetProfileId,
      senderProfileId: context.profile.id,
      message: input.message,
      points: input.points,
    });
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
