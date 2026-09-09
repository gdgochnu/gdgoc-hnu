import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getBadgeCatalog,
  getMemberBadges,
  awardBadge,
  checkAutomaticBadges,
} from '@/lib/gamification/badges-engine';

/**
 * GET /api/test-step-19-3
 * Verify: Badge system including initial badge set from spec §4.13 + "Onboarded" badge.
 * Tests:
 *   1. Official badge catalog retrieval & completeness check
 *   2. Awarding a badge with points reward
 *   3. Duplicate prevention for earned badges
 *   4. Automatic badge evaluation engine
 */
export async function GET() {
  const results: Record<string, unknown> = {};
  const admin = createAdminClient();

  // Test 1: Fetch and verify full catalog
  try {
    const catalog = await getBadgeCatalog();
    const requiredCodes = [
      'onboarded',
      'first_event',
      'ten_tasks_done',
      'perfect_month',
      'mentor',
      'event_mvp',
      'speaker_whisperer',
    ];

    const foundCodes = catalog.map((b) => b.code);
    const allFound = requiredCodes.every((c) => foundCodes.includes(c));

    results['1_badge_catalog'] = {
      totalBadges: catalog.length,
      badges: catalog.map((b) => ({
        code: b.code,
        name: b.name,
        tier: b.tier,
        category: b.category,
        reward: b.points_reward,
      })),
      allRequiredBadgesPresent: allFound,
    };
  } catch (e: any) {
    results['1_badge_catalog'] = { error: e.message };
  }

  // Test 2 & 3: Badge awarding & duplicate prevention
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, overall_score')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!profile) {
      results['2_badge_awarding'] = { skipped: true, reason: 'No active profile in DB' };
    } else {
      const profileId = profile.id;
      const initialScore = Number(profile.overall_score || 0);

      // Clean up event_mvp if already possessed to ensure clean test
      const { data: existingMvp } = await admin
        .from('badges')
        .select('id')
        .eq('code', 'event_mvp')
        .single();

      if (existingMvp) {
        await admin
          .from('member_badges')
          .delete()
          .eq('profile_id', profileId)
          .eq('badge_id', existingMvp.id);
      }

      // Award event_mvp badge (reward: 75 pts)
      const awardRes = await awardBadge({
        profileId,
        badgeCode: 'event_mvp',
        notes: 'Test recognition: Standout contributor during workshop.',
      });

      // Verify member_badges
      const memberBadges = await getMemberBadges(profileId);
      const hasMvp = memberBadges.some((b) => b.badge.code === 'event_mvp');

      // Verify points increment
      const { data: afterProfile } = await admin
        .from('profiles')
        .select('overall_score')
        .eq('id', profileId)
        .single();

      const afterScore = Number(afterProfile?.overall_score || 0);

      results['2_badge_awarding'] = {
        success: awardRes.success,
        awarded: awardRes.awarded,
        badgeName: awardRes.badge?.name,
        pointsAwarded: awardRes.pointsAwarded,
        hasBadgeInList: hasMvp,
        scoreIncrementCorrect: afterScore === initialScore + (awardRes.pointsAwarded || 0),
      };

      // Test 3: Duplicate prevention
      const duplicateRes = await awardBadge({
        profileId,
        badgeCode: 'event_mvp',
      });

      results['3_duplicate_prevention'] = {
        alreadyEarned: duplicateRes.alreadyEarned,
        awardedAgain: duplicateRes.awarded,
        passed: duplicateRes.alreadyEarned === true && duplicateRes.awarded === false,
      };

      // Test 4: Check automatic badges
      const autoRes = await checkAutomaticBadges(profileId);
      results['4_automatic_badges_evaluation'] = {
        success: true,
        evaluatedFor: profile.full_name,
        newlyAwarded: autoRes.newlyAwarded,
      };

      // Clean up test badge and test points
      if (existingMvp) {
        await admin
          .from('member_badges')
          .delete()
          .eq('profile_id', profileId)
          .eq('badge_id', existingMvp.id);

        await admin
          .from('points_log')
          .delete()
          .eq('profile_id', profileId)
          .eq('action_key', 'badge_unlocked')
          .ilike('reason', '%Event MVP%');

        await admin
          .from('profiles')
          .update({ overall_score: initialScore })
          .eq('id', profileId);
      }
    }
  } catch (e: any) {
    results['2_badge_awarding'] = { error: e.message };
  }

  return NextResponse.json({
    step: '19.3',
    description: 'Badge System + Initial Spec Catalog',
    timestamp: new Date().toISOString(),
    results,
  });
}
