import { createAdminClient } from '@/lib/supabase/admin';
import type {
  PointRule,
  PointsLogEntry,
  AwardPointsInput,
  AwardPointsResult,
  MemberPointsSummary,
} from '@/types/gamification';

/**
 * Returns the current active semester/season string (e.g. '2026-Fall', '2027-Spring').
 */
export function getCurrentSeason(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 11 = Dec

  // Academic semester division:
  // Feb (1) - Jun (5): Spring
  // Jul (6) - Aug (7): Summer
  // Sep (8) - Jan (0): Fall
  if (month >= 1 && month <= 5) {
    return `${year}-Spring`;
  } else if (month >= 6 && month <= 7) {
    return `${year}-Summer`;
  } else {
    // If January, it's still part of previous calendar year's Fall semester
    const fallYear = month === 0 ? year - 1 : year;
    return `${fallYear}-Fall`;
  }
}

/**
 * Fetches all point rules.
 */
export async function getPointRules(includeInactive = false): Promise<PointRule[]> {
  const supabase = createAdminClient();
  let query = supabase.from('point_rules').select('*').order('points', { ascending: false });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[getPointRules] error:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetches a single point rule by action key.
 */
export async function getPointRule(actionKey: string): Promise<PointRule | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('point_rules')
    .select('*')
    .eq('action_key', actionKey)
    .maybeSingle();

  if (error) {
    console.error('[getPointRule] error:', error);
    return null;
  }
  return data;
}

/**
 * Admin action: Update point value or status for a rule.
 * Tunable by President (§4.13).
 */
export async function updatePointRule(
  ruleId: string,
  updates: {
    points?: number;
    is_active?: boolean;
    title?: string;
    description?: string;
  }
): Promise<{ success: boolean; rule?: PointRule; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('point_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, rule: data };
  } catch (err: any) {
    console.error('[updatePointRule] error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Core points awarding engine (§4.13).
 * Awards points dynamically based on point_rules, logs the transaction,
 * updates user overall_score, and delivers an in-app notification.
 */
export async function awardPoints(input: AwardPointsInput): Promise<AwardPointsResult> {
  const supabase = createAdminClient();
  const season = input.season || getCurrentSeason();

  try {
    // 1. Fetch the rule for this action
    let rule = await getPointRule(input.actionKey);

    if (!rule) {
      if (input.customPoints !== undefined && input.customPoints > 0) {
        rule = {
          id: '',
          action_key: input.actionKey,
          title: input.customReason || 'Bonus Points',
          description: input.customReason || null,
          points: input.customPoints,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } else {
        console.warn(`[awardPoints] No point rule found for action: ${input.actionKey}`);
        return {
          success: false,
          pointsAwarded: 0,
          error: `Point rule '${input.actionKey}' not found.`,
        };
      }
    }

    if (!rule.is_active && input.customPoints === undefined) {
      return {
        success: false,
        pointsAwarded: 0,
        skipped: true,
        skipReason: `Point rule '${input.actionKey}' is currently disabled.`,
      };
    }

    const pointsToAward = input.customPoints !== undefined ? input.customPoints : rule.points;

    if (pointsToAward === 0) {
      return {
        success: true,
        pointsAwarded: 0,
        skipped: true,
        skipReason: 'Points configured to 0.',
      };
    }

    // 2. Duplicate prevention (if relatedEntityId is supplied)
    if (input.preventDuplicate && input.relatedEntityId) {
      const { data: existing } = await supabase
        .from('points_log')
        .select('id')
        .eq('profile_id', input.profileId)
        .eq('action_key', input.actionKey)
        .ilike('reason', `%${input.relatedEntityId}%`)
        .maybeSingle();

      if (existing) {
        return {
          success: true,
          pointsAwarded: 0,
          skipped: true,
          skipReason: `Points for '${input.actionKey}' already awarded for entity ${input.relatedEntityId}.`,
        };
      }
    }

    // 3. Compose reason
    let reason = input.customReason || rule.description || rule.title;
    if (input.relatedEntityId) {
      reason = `${reason} (Ref: ${input.relatedEntityId})`;
    }

    // 4. Insert into points_log
    const { error: logErr } = await supabase.from('points_log').insert({
      profile_id: input.profileId,
      rule_id: rule.id || null,
      action_key: input.actionKey,
      points: pointsToAward,
      reason,
      awarded_by: input.awardedBy || null,
      season,
    });

    if (logErr) throw logErr;

    // 5. Update profiles.overall_score
    const { data: profile } = await supabase
      .from('profiles')
      .select('overall_score')
      .eq('id', input.profileId)
      .single();

    const currentScore = Number(profile?.overall_score || 0);
    const newTotal = currentScore + pointsToAward;

    await supabase
      .from('profiles')
      .update({
        overall_score: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.profileId);

    // 6. Send in-app notification
    await supabase.from('notifications').insert({
      profile_id: input.profileId,
      type: 'points_awarded',
      title: `+${pointsToAward} Points Earned! 🌟`,
      message: `You earned ${pointsToAward} points: ${rule.title}`,
      related_entity_type: 'points',
      related_entity_id: rule.id || null,
      is_read: false,
    });

    return {
      success: true,
      pointsAwarded: pointsToAward,
      rule,
      newTotalPoints: newTotal,
    };
  } catch (err: any) {
    console.error('[awardPoints] error:', err);
    return {
      success: false,
      pointsAwarded: 0,
      error: err.message || 'Failed to award points',
    };
  }
}

/**
 * Deduct points manually (e.g. President / Admin adjustment).
 */
export async function deductPoints(input: {
  profileId: string;
  points: number;
  reason: string;
  awardedBy?: string;
  season?: string;
}): Promise<{ success: boolean; newTotalPoints?: number; error?: string }> {
  const supabase = createAdminClient();
  const season = input.season || getCurrentSeason();
  const deductAmount = Math.abs(input.points);

  try {
    const { error: logErr } = await supabase.from('points_log').insert({
      profile_id: input.profileId,
      action_key: 'manual_deduction',
      points: -deductAmount,
      reason: input.reason,
      awarded_by: input.awardedBy || null,
      season,
    });

    if (logErr) throw logErr;

    const { data: profile } = await supabase
      .from('profiles')
      .select('overall_score')
      .eq('id', input.profileId)
      .single();

    const currentScore = Number(profile?.overall_score || 0);
    const newTotal = Math.max(0, currentScore - deductAmount);

    await supabase
      .from('profiles')
      .update({
        overall_score: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.profileId);

    return { success: true, newTotalPoints: newTotal };
  } catch (err: any) {
    console.error('[deductPoints] error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches points log history for a specific member.
 */
export async function getMemberPointsHistory(
  profileId: string,
  limit = 50
): Promise<PointsLogEntry[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('points_log')
    .select(`
      id, profile_id, rule_id, action_key, points, reason, awarded_by, season, created_at,
      rule:point_rules(*),
      awarded_by_profile:profiles!awarded_by(id, full_name, avatar_url, role)
    `)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getMemberPointsHistory] error:', error);
    return [];
  }

  return (data as any[]) || [];
}

/**
 * Fetches a member's points summary including season points and all-time points.
 */
export async function getMemberPointsSummary(
  profileId: string,
  season: string = getCurrentSeason()
): Promise<MemberPointsSummary> {
  const supabase = createAdminClient();

  // 1. All-time points from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('overall_score')
    .eq('id', profileId)
    .single();

  const totalPoints = Number(profile?.overall_score || 0);

  // 2. Season points from points_log
  const { data: seasonLogs } = await supabase
    .from('points_log')
    .select('points')
    .eq('profile_id', profileId)
    .eq('season', season);

  const seasonPoints = (seasonLogs || []).reduce((acc, curr) => acc + curr.points, 0);

  // 3. Recent history
  const log = await getMemberPointsHistory(profileId, 20);

  return {
    profileId,
    totalPoints,
    seasonPoints,
    season,
    log,
  };
}
