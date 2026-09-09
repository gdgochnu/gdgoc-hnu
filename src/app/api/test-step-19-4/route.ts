import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getSeasonalLeaderboard,
  getAllTimeLeaderboard,
  resetSeasonJob,
  setLeaderboardOptIn,
} from '@/lib/gamification/leaderboard';

/**
 * GET /api/test-step-19-4
 * Verify: Seasonal Leaderboard + Reset Job + All-Time Hall of Fame (§4.13)
 * Tests:
 *   1. Seasonal leaderboard structure and descending sort order
 *   2. All-Time Hall of Fame leaderboard structure
 *   3. Opt-in visibility filtering (opt-out hides member from public leaderboard)
 *   4. Season reset job execution
 */
export async function GET() {
  const results: Record<string, unknown> = {};
  const admin = createAdminClient();

  // Test 1: Seasonal Leaderboard
  try {
    const seasonal = await getSeasonalLeaderboard({});
    const isSorted = seasonal.rankings.every((m, idx, arr) => {
      if (idx === 0) return true;
      return arr[idx - 1].points >= m.points;
    });

    results['1_seasonal_leaderboard'] = {
      season: seasonal.season,
      isAllTime: seasonal.isAllTime,
      totalParticipants: seasonal.totalParticipants,
      podiumCount: seasonal.podium.length,
      isSortedDescending: isSorted,
      topLeader: seasonal.rankings[0]
        ? {
            name: seasonal.rankings[0].fullName,
            dept: seasonal.rankings[0].departmentCode,
            pts: seasonal.rankings[0].points,
            tier: seasonal.rankings[0].tier.title,
          }
        : null,
    };
  } catch (e: any) {
    results['1_seasonal_leaderboard'] = { error: e.message };
  }

  // Test 2: All-Time Hall of Fame
  try {
    const allTime = await getAllTimeLeaderboard({});
    const isSorted = allTime.rankings.every((m, idx, arr) => {
      if (idx === 0) return true;
      return arr[idx - 1].points >= m.points;
    });

    results['2_all_time_hall_of_fame'] = {
      isAllTime: allTime.isAllTime,
      totalParticipants: allTime.totalParticipants,
      podiumCount: allTime.podium.length,
      isSortedDescending: isSorted,
      legendCount: allTime.rankings.filter((m) => m.tier.tier === 'legend').length,
    };
  } catch (e: any) {
    results['2_all_time_hall_of_fame'] = { error: e.message };
  }

  // Test 3: Opt-in Visibility Toggle
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, leaderboard_opt_in')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!profile) {
      results['3_opt_in_filtering'] = { skipped: true, reason: 'No active profile found' };
    } else {
      const originalOptIn = profile.leaderboard_opt_in !== false;

      // Toggle to false
      await setLeaderboardOptIn(profile.id, false);

      // Verify member is NOT present in public rankings
      const boardHidden = await getAllTimeLeaderboard({});
      const isHidden = !boardHidden.rankings.some((m) => m.profileId === profile.id);

      // Restore original
      await setLeaderboardOptIn(profile.id, originalOptIn);

      results['3_opt_in_filtering'] = {
        member: profile.full_name,
        profileId: profile.id,
        hiddenWhenOptOut: isHidden,
        restored: true,
        passed: isHidden,
      };
    }
  } catch (e: any) {
    results['3_opt_in_filtering'] = { error: e.message };
  }

  // Test 4: Season reset job
  try {
    const testSeason = `Test-${Date.now()}`;
    const { data: pres } = await admin
      .from('profiles')
      .select('id')
      .in('role', ['president', 'co_president'])
      .limit(1)
      .maybeSingle();

    const callerId = pres?.id || '00000000-0000-0000-0000-000000000000';
    const resetRes = await resetSeasonJob({
      newSeasonName: testSeason,
      callerId,
    });

    results['4_season_reset_job'] = {
      success: resetRes.success,
      newSeason: resetRes.newSeason,
      passed: resetRes.success && resetRes.newSeason === testSeason,
    };
  } catch (e: any) {
    results['4_season_reset_job'] = { error: e.message };
  }

  return NextResponse.json({
    step: '19.4',
    description: 'Seasonal Leaderboard + Reset Job + All-Time Hall of Fame',
    timestamp: new Date().toISOString(),
    results,
  });
}
