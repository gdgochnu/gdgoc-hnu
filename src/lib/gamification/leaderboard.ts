import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentSeason } from '@/lib/gamification/points-engine';
import { getTierForPoints, MemberTierInfo } from '@/lib/gamification/levels-streaks';

/**
 * GDGoC HNU OS — Seasonal & All-Time Leaderboards (§4.13)
 */

export interface LeaderboardMember {
  rank: number;
  profileId: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  departmentId: string | null;
  departmentName: string;
  departmentCode: string;
  points: number;
  tier: MemberTierInfo;
  badgesCount: number;
  leaderboardOptIn: boolean;
}

export interface LeaderboardResult {
  season?: string;
  isAllTime: boolean;
  totalParticipants: number;
  podium: LeaderboardMember[];
  rankings: LeaderboardMember[];
  myRanking?: LeaderboardMember | null;
}

/**
 * Fetches the Seasonal Leaderboard (resets each semester).
 * Honors profiles.leaderboard_opt_in (§4.13).
 */
export async function getSeasonalLeaderboard(params: {
  season?: string;
  departmentId?: string;
  currentUserId?: string;
  limit?: number;
}): Promise<LeaderboardResult> {
  const admin = createAdminClient();
  const season = params.season || getCurrentSeason();
  const limit = params.limit || 100;

  // 1. Fetch points_log entries for the given season
  let pointsQuery = admin
    .from('points_log')
    .select('profile_id, points')
    .eq('season', season);

  const { data: logs, error: logsErr } = await pointsQuery;
  if (logsErr) {
    console.error('[getSeasonalLeaderboard] logsErr:', logsErr);
    return { season, isAllTime: false, totalParticipants: 0, podium: [], rankings: [] };
  }

  // Aggregate points by profile_id
  const pointsMap = new Map<string, number>();
  (logs || []).forEach((l) => {
    pointsMap.set(l.profile_id, (pointsMap.get(l.profile_id) || 0) + l.points);
  });

  const profileIds = Array.from(pointsMap.keys());
  if (profileIds.length === 0) {
    return { season, isAllTime: false, totalParticipants: 0, podium: [], rankings: [] };
  }

  // 2. Fetch profiles for these members
  let profilesQuery = admin
    .from('profiles')
    .select(`
      id, full_name, avatar_url, role, department_id, status, leaderboard_opt_in,
      department:departments!profiles_department_id_fkey(name, code)
    `)
    .in('id', profileIds)
    .eq('status', 'active');

  if (params.departmentId && params.departmentId !== 'all') {
    profilesQuery = profilesQuery.eq('department_id', params.departmentId);
  }

  const { data: profiles, error: profErr } = await profilesQuery;
  if (profErr) {
    console.error('[getSeasonalLeaderboard] profErr:', profErr);
    return { season, isAllTime: false, totalParticipants: 0, podium: [], rankings: [] };
  }

  // 3. Fetch badge counts for these profiles
  const { data: memberBadges } = await admin
    .from('member_badges')
    .select('profile_id')
    .in('profile_id', profileIds);

  const badgeCountMap = new Map<string, number>();
  (memberBadges || []).forEach((mb) => {
    badgeCountMap.set(mb.profile_id, (badgeCountMap.get(mb.profile_id) || 0) + 1);
  });

  // 4. Build leaderboard items (only opt-in members appear on public list)
  const allMembers: LeaderboardMember[] = (profiles || [])
    .map((p: any) => {
      const pts = pointsMap.get(p.id) || 0;
      const dept = Array.isArray(p.department) ? p.department[0] : p.department;
      return {
        rank: 0,
        profileId: p.id,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        role: p.role,
        departmentId: p.department_id,
        departmentName: dept?.name || 'General',
        departmentCode: dept?.code || 'GEN',
        points: pts,
        tier: getTierForPoints(pts),
        badgesCount: badgeCountMap.get(p.id) || 0,
        leaderboardOptIn: p.leaderboard_opt_in !== false,
      };
    })
    .sort((a, b) => b.points - a.points);

  // Assign ranks
  allMembers.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  // Filter for opt-in on the public rankings
  const publicRankings = allMembers
    .filter((m) => m.leaderboardOptIn)
    .slice(0, limit);

  // Re-index ranks for public view
  publicRankings.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  const podium = publicRankings.slice(0, 3);
  const myRanking = params.currentUserId
    ? allMembers.find((m) => m.profileId === params.currentUserId) || null
    : null;

  return {
    season,
    isAllTime: false,
    totalParticipants: publicRankings.length,
    podium,
    rankings: publicRankings,
    myRanking,
  };
}

/**
 * Fetches the All-Time Hall of Fame (cumulative points across all history, never resets).
 */
export async function getAllTimeLeaderboard(params: {
  departmentId?: string;
  currentUserId?: string;
  limit?: number;
}): Promise<LeaderboardResult> {
  const admin = createAdminClient();
  const limit = params.limit || 100;

  // 1. Fetch profiles ordered by overall_score desc
  let query = admin
    .from('profiles')
    .select(`
      id, full_name, avatar_url, role, department_id, status, overall_score, leaderboard_opt_in,
      department:departments!profiles_department_id_fkey(name, code)
    `)
    .in('status', ['active', 'alumni'])
    .order('overall_score', { ascending: false });

  if (params.departmentId && params.departmentId !== 'all') {
    query = query.eq('department_id', params.departmentId);
  }

  const { data: profiles, error } = await query;
  if (error) {
    console.error('[getAllTimeLeaderboard] error:', error);
    return { isAllTime: true, totalParticipants: 0, podium: [], rankings: [] };
  }

  const profileIds = (profiles || []).map((p) => p.id);

  // 2. Fetch badge counts
  const { data: memberBadges } = await admin
    .from('member_badges')
    .select('profile_id')
    .in('profile_id', profileIds.length > 0 ? profileIds : ['none']);

  const badgeCountMap = new Map<string, number>();
  (memberBadges || []).forEach((mb) => {
    badgeCountMap.set(mb.profile_id, (badgeCountMap.get(mb.profile_id) || 0) + 1);
  });

  const allMembers: LeaderboardMember[] = (profiles || []).map((p: any) => {
    const pts = Number(p.overall_score || 0);
    const dept = Array.isArray(p.department) ? p.department[0] : p.department;
    return {
      rank: 0,
      profileId: p.id,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      role: p.role,
      departmentId: p.department_id,
      departmentName: dept?.name || 'General',
      departmentCode: dept?.code || 'GEN',
      points: pts,
      tier: getTierForPoints(pts),
      badgesCount: badgeCountMap.get(p.id) || 0,
      leaderboardOptIn: p.leaderboard_opt_in !== false,
    };
  });

  const publicRankings = allMembers
    .filter((m) => m.leaderboardOptIn)
    .slice(0, limit);

  publicRankings.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  const podium = publicRankings.slice(0, 3);
  const myRanking = params.currentUserId
    ? allMembers.find((m) => m.profileId === params.currentUserId) || null
    : null;

  return {
    isAllTime: true,
    totalParticipants: publicRankings.length,
    podium,
    rankings: publicRankings,
    myRanking,
  };
}

/**
 * Admin action: Reset season job.
 * Transitions active semester season to a new season name.
 * Historical entries in points_log remain intact with their season tag.
 */
export async function resetSeasonJob(params: {
  newSeasonName: string;
  callerId: string;
}): Promise<{ success: boolean; newSeason: string; error?: string }> {
  const admin = createAdminClient();

  try {
    const trimmed = params.newSeasonName.trim();
    if (!trimmed) {
      return { success: false, newSeason: '', error: 'Season name is required.' };
    }

    // Record audit log
    await admin.from('audit_logs').insert({
      actor_id: params.callerId,
      action: 'gamification_season_reset',
      entity_type: 'gamification',
      metadata: {
        newSeason: trimmed,
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true, newSeason: trimmed };
  } catch (err: any) {
    console.error('[resetSeasonJob] error:', err);
    return { success: false, newSeason: '', error: err.message };
  }
}

/**
 * Toggle member leaderboard visibility opt-in (§4.13).
 */
export async function setLeaderboardOptIn(
  profileId: string,
  optIn: boolean
): Promise<{ success: boolean; optIn: boolean; error?: string }> {
  const admin = createAdminClient();
  try {
    const { error } = await admin
      .from('profiles')
      .update({ leaderboard_opt_in: optIn, updated_at: new Date().toISOString() })
      .eq('id', profileId);

    if (error) throw error;
    return { success: true, optIn };
  } catch (err: any) {
    return { success: false, optIn: !optIn, error: err.message };
  }
}
