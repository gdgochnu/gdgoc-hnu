import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getTierForPoints,
  calculateMemberStreaks,
  TIERS,
} from '@/lib/gamification/levels-streaks';

/**
 * GET /api/test-step-19-2
 * Verify: Levels, Tiers & Streak Tracking (§4.13)
 * Tests:
 *   1. All 5 tiers defined (Newcomer -> Contributor -> Achiever -> Leader -> Legend)
 *   2. getTierForPoints mapping & progress calculations at each threshold
 *   3. calculateMemberStreaks execution and structure
 */
export async function GET() {
  const results: Record<string, unknown> = {};
  const admin = createAdminClient();

  // Test 1: Tier definitions
  try {
    results['1_tier_definitions'] = {
      count: TIERS.length,
      tiers: TIERS.map((t) => ({
        level: t.level,
        tier: t.tier,
        title: t.title,
        range: `${t.minPoints} - ${t.maxPoints ?? '∞'}`,
        color: t.color,
      })),
      allFiveTiersPresent: TIERS.length === 5,
    };
  } catch (e: any) {
    results['1_tier_definitions'] = { error: e.message };
  }

  // Test 2: Threshold mapping & progress verification
  try {
    const testCases = [
      { pts: 0, expectedTier: 'newcomer', expectedLevel: 1 },
      { pts: 50, expectedTier: 'newcomer', expectedLevel: 1 },
      { pts: 100, expectedTier: 'contributor', expectedLevel: 2 },
      { pts: 200, expectedTier: 'contributor', expectedLevel: 2 },
      { pts: 250, expectedTier: 'achiever', expectedLevel: 3 },
      { pts: 500, expectedTier: 'leader', expectedLevel: 4 },
      { pts: 1200, expectedTier: 'legend', expectedLevel: 5 },
    ];

    const mappingResults = testCases.map((tc) => {
      const res = getTierForPoints(tc.pts);
      return {
        points: tc.pts,
        tier: res.tier,
        level: res.level,
        progressPct: `${res.progressPct}%`,
        pointsToNext: res.pointsToNextTier,
        isMaxTier: res.isMaxTier,
        passed: res.tier === tc.expectedTier && res.level === tc.expectedLevel,
      };
    });

    results['2_tier_threshold_mapping'] = {
      allPassed: mappingResults.every((m) => m.passed),
      samples: mappingResults,
    };
  } catch (e: any) {
    results['2_tier_threshold_mapping'] = { error: e.message };
  }

  // Test 3: Streak calculation for an active member
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, overall_score')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!profile) {
      results['3_streak_calculation'] = { skipped: true, reason: 'No active profile found in DB' };
    } else {
      const streaks = await calculateMemberStreaks(profile.id);
      const tierInfo = getTierForPoints(Number(profile.overall_score || 0));

      results['3_streak_calculation'] = {
        profileId: profile.id,
        name: profile.full_name,
        overallScore: profile.overall_score,
        tier: `${tierInfo.title} (Level ${tierInfo.level})`,
        progressPct: `${tierInfo.progressPct}%`,
        eventStreak: streaks.eventAttendance,
        taskStreak: streaks.taskOnTime,
        passed:
          typeof streaks.eventAttendance.currentStreak === 'number' &&
          typeof streaks.taskOnTime.currentStreak === 'number',
      };
    }
  } catch (e: any) {
    results['3_streak_calculation'] = { error: e.message };
  }

  return NextResponse.json({
    step: '19.2',
    description: 'Levels/Tiers + Streak Tracking',
    timestamp: new Date().toISOString(),
    results,
  });
}
