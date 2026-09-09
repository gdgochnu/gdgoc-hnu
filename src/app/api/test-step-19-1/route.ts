import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getPointRules,
  getPointRule,
  awardPoints,
  updatePointRule,
  getMemberPointsHistory,
  getMemberPointsSummary,
} from '@/lib/gamification/points-engine';

/**
 * GET /api/test-step-19-1
 * Verify: point_rules-driven points engine
 * Tests:
 *   1. point_rules catalog retrieval & rule verification
 *   2. Awarding points based on point_rules (with points_log insert & profile overall_score update)
 *   3. Duplicate prevention with relatedEntityId
 *   4. Point rule update & restoration (tunable economy)
 *   5. Points history and summary retrieval
 */
export async function GET() {
  const results: Record<string, unknown> = {};
  const admin = createAdminClient();

  // Test 1: Fetch rules catalog
  try {
    const rules = await getPointRules(true);
    const requiredKeys = [
      'task_completed_on_time',
      'task_completed',
      'event_attended',
      'event_speaker_confirmed',
      'media_coverage_completed',
      'onboarding_completed',
    ];

    const foundKeys = rules.map((r) => r.action_key);
    const allFound = requiredKeys.every((k) => foundKeys.includes(k));

    results['1_point_rules_catalog'] = {
      rulesCount: rules.length,
      rules: rules.map((r) => ({ key: r.action_key, points: r.points, active: r.is_active })),
      allRequiredRulesPresent: allFound,
    };
  } catch (e: any) {
    results['1_point_rules_catalog'] = { error: e.message };
  }

  // Test 2 & 3: Award points to a test profile
  let testProfileId: string | null = null;
  let originalScore = 0;
  const testEntityId = `test-entity-${Date.now()}`;

  try {
    // Pick an active profile
    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, overall_score')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!profile) {
      results['2_award_points_flow'] = { skipped: true, reason: 'No active profile found in DB' };
    } else {
      const profileId = profile.id;
      originalScore = Number(profile.overall_score || 0);

      // Award points for task_completed_on_time
      const awardResult = await awardPoints({
        profileId,
        actionKey: 'task_completed_on_time',
        relatedEntityId: testEntityId,
        preventDuplicate: true,
      });

      // Verify points_log entry
      const { data: logEntry } = await admin
        .from('points_log')
        .select('*')
        .eq('profile_id', profileId)
        .eq('action_key', 'task_completed_on_time')
        .ilike('reason', `%${testEntityId}%`)
        .maybeSingle();

      // Verify updated profile score
      const { data: updatedProfile } = await admin
        .from('profiles')
        .select('overall_score')
        .eq('id', profileId)
        .single();

      const newScore = Number(updatedProfile?.overall_score || 0);
      const pointsAwarded = awardResult.pointsAwarded;

      results['2_award_points_flow'] = {
        success: awardResult.success,
        pointsAwarded,
        expectedRule: 'task_completed_on_time',
        originalScore,
        newScore,
        scoreIncrementCorrect: newScore === originalScore + pointsAwarded,
        pointsLogRecorded: !!logEntry,
      };

      // Test 3: Duplicate prevention
      const duplicateAttempt = await awardPoints({
        profileId,
        actionKey: 'task_completed_on_time',
        relatedEntityId: testEntityId,
        preventDuplicate: true,
      });

      results['3_duplicate_prevention'] = {
        skipped: duplicateAttempt.skipped,
        skipReason: duplicateAttempt.skipReason,
        pointsAwarded: duplicateAttempt.pointsAwarded,
        passed: duplicateAttempt.skipped === true && duplicateAttempt.pointsAwarded === 0,
      };

      // Test 4: Points summary
      const summary = await getMemberPointsSummary(profileId);
      results['4_points_summary'] = {
        profileId: summary.profileId,
        totalPoints: summary.totalPoints,
        seasonPoints: summary.seasonPoints,
        recentLogCount: summary.log.length,
        hasEntries: summary.log.length > 0,
      };

      // Clean up test entry and restore profile score
      if (logEntry) {
        await admin.from('points_log').delete().eq('id', logEntry.id);
        await admin
          .from('profiles')
          .update({ overall_score: originalScore })
          .eq('id', profileId);
      }
    }
  } catch (e: any) {
    results['2_award_points_flow'] = { error: e.message };
  }

  // Test 5: Point rule update & restore
  try {
    const rule = await getPointRule('onboarding_completed');
    if (!rule) {
      results['5_point_rule_tuning'] = { skipped: true, reason: 'Rule not found' };
    } else {
      const originalPoints = rule.points;
      const testPoints = originalPoints + 5;

      // Update
      const updated = await updatePointRule(rule.id, { points: testPoints });
      const verifyUpdate = await getPointRule('onboarding_completed');

      // Restore
      await updatePointRule(rule.id, { points: originalPoints });
      const verifyRestore = await getPointRule('onboarding_completed');

      results['5_point_rule_tuning'] = {
        originalPoints,
        updatedPoints: verifyUpdate?.points,
        restoredPoints: verifyRestore?.points,
        passed: verifyUpdate?.points === testPoints && verifyRestore?.points === originalPoints,
      };
    }
  } catch (e: any) {
    results['5_point_rule_tuning'] = { error: e.message };
  }

  return NextResponse.json({
    step: '19.1',
    description: 'point_rules-driven Points Engine',
    timestamp: new Date().toISOString(),
    results,
  });
}
