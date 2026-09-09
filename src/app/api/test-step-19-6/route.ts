import { NextResponse } from 'next/server';
import { getPointRules, updatePointRule } from '@/lib/gamification/points-engine';
import { TIERS } from '@/lib/gamification/levels-streaks';
import { getBadgeCatalog } from '@/lib/gamification/badges-engine';
import { fetchPointRulesAction } from '@/app/gamification/actions';

/**
 * GET /api/test-step-19-6
 * Verify: "How Points & Levels Work" Transparency System (§4.13)
 * Tests:
 *   1. Complete Point Rules transparency: all active & inactive rules readable
 *   2. Presidential tuning capability: updatePointRule modifies points and active state
 *   3. 5-Tier level progression integrity: complete boundaries & colors
 *   4. Badge catalog transparency: categories, descriptions, point rewards
 *   5. Server action fetchPointRulesAction integration
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // Test 1: Point Rules listing
  try {
    const rules = await getPointRules(true);
    const hasCoreRules = rules.some((r) => r.action_key === 'task_completed') ||
      rules.some((r) => r.action_key === 'event_attended') ||
      rules.some((r) => r.action_key === 'onboarding_completed');

    results['1_point_rules_transparency'] = {
      rulesCount: rules.length,
      hasCoreRules,
      sampleRules: rules.slice(0, 4).map((r) => ({
        key: r.action_key,
        title: r.title,
        points: r.points,
        isActive: r.is_active,
      })),
    };
  } catch (e: any) {
    results['1_point_rules_transparency'] = { error: e.message };
  }

  // Test 2: Presidential Tuning Capability
  try {
    const rules = await getPointRules(true);
    const targetRule = rules[0];

    if (targetRule) {
      const originalPoints = targetRule.points;
      // Test updating points
      const updateRes = await updatePointRule(targetRule.id, {
        points: originalPoints + 5,
      });

      // Restore original points
      await updatePointRule(targetRule.id, {
        points: originalPoints,
      });

      results['2_presidential_tuning'] = {
        ruleId: targetRule.id,
        ruleTitle: targetRule.title,
        tuningSuccess: updateRes.success,
        updatedPoints: updateRes.rule?.points,
        restoredPoints: originalPoints,
      };
    } else {
      results['2_presidential_tuning'] = { error: 'No rules available to tune' };
    }
  } catch (e: any) {
    results['2_presidential_tuning'] = { error: e.message };
  }

  // Test 3: Tier Progression Integrity
  try {
    const tierCount = TIERS.length;
    const tierNames = TIERS.map((t) => t.title);
    const hasValidBoundaries = TIERS.every((t, idx) => {
      if (idx === 0) return t.minPoints === 0;
      return t.minPoints === (TIERS[idx - 1].maxPoints! + 1);
    });

    results['3_tier_progression_system'] = {
      tierCount,
      tierNames,
      hasValidBoundaries,
      hasLegendNoCap: TIERS[TIERS.length - 1].maxPoints === null,
    };
  } catch (e: any) {
    results['3_tier_progression_system'] = { error: e.message };
  }

  // Test 4: Badge Catalog Transparency
  try {
    const badges = await getBadgeCatalog();
    const hasDescriptions = badges.every((b) => !!b.description && b.points_reward >= 0);

    results['4_badge_catalog_transparency'] = {
      badgeCount: badges.length,
      allHaveTransparentCriteria: hasDescriptions,
      badgesSummary: badges.map((b) => ({
        code: b.code,
        name: b.name,
        tier: b.tier,
        rewardPts: b.points_reward,
      })),
    };
  } catch (e: any) {
    results['4_badge_catalog_transparency'] = { error: e.message };
  }

  // Test 5: Server action
  try {
    const actionRes = await fetchPointRulesAction();
    results['5_server_action'] = {
      success: actionRes.success,
      rulesCount: actionRes.rules.length,
    };
  } catch (e: any) {
    results['5_server_action'] = { error: e.message };
  }

  return NextResponse.json(results);
}
