import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  generateOnboardingChecklistForProfile, 
  toggleChecklistItem, 
  getProfileOnboardingProgress,
  getCommitteeIncompleteOnboarding
} from '@/lib/onboarding/checklist';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const testRunId = Date.now();

  try {
    // 1. Check if tables exist
    const [templatesCheck, itemsCheck] = await Promise.all([
      admin.from('onboarding_checklist_templates').select('*').limit(1),
      admin.from('onboarding_checklist_items').select('*').limit(1),
    ]);

    if (templatesCheck.error || itemsCheck.error) {
      return NextResponse.json({
        status: 'pending_migration',
        message: 'Onboarding checklist tables (migration 013) need to be executed in Supabase SQL editor.',
        migrationFile: 'supabase/migrations/20260906000013_create_onboarding_checklist.sql',
        sqlEditorUrl: 'https://supabase.com/dashboard/project/ilccfcupdvlsfylskdsp/sql/new',
        templatesError: templatesCheck.error?.message,
        itemsError: itemsCheck.error?.message,
      });
    }

    // 2. Fetch seed templates
    const { data: dbTemplates } = await admin
      .from('onboarding_checklist_templates')
      .select('*')
      .order('sort_order', { ascending: true });

    const passedTemplatesSeeded = (dbTemplates?.length || 0) >= 4;

    // 3. Resolve department for test
    const { data: department } = await admin
      .from('departments')
      .select('id, name')
      .limit(1)
      .single();

    if (!department) {
      return NextResponse.json({ error: 'No department found for testing.' }, { status: 500 });
    }

    // 4. Create an active test member profile
    const testEmail = `test.onboarding.${testRunId}@example.com`;
    let testMember: any = null;

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      user_metadata: { full_name: `Test Member #${testRunId}` },
    });

    if (authData?.user) {
      const { data: newProfile, error: profileErr } = await admin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: testEmail,
          full_name: `Test Member #${testRunId}`,
          role: 'member',
          status: 'active',
          department_id: department.id,
        })
        .select('*')
        .single();

      if (profileErr) throw new Error(`Failed to upsert test profile: ${profileErr.message}`);
      testMember = newProfile;
    } else {
      // Fallback: pick existing member
      const { data: existingMember } = await admin
        .from('profiles')
        .select('*')
        .eq('role', 'member')
        .limit(1)
        .single();

      if (!existingMember) throw new Error('Could not create or find a member profile for test.');
      testMember = existingMember;
      // Clean previous test items for this member
      await admin.from('onboarding_checklist_items').delete().eq('profile_id', testMember.id);
      await admin.from('member_badges').delete().eq('profile_id', testMember.id);
      await admin.from('points_log').delete().eq('profile_id', testMember.id).eq('action_key', 'onboarding_completed');
    }

    // 5. Test Checklist Auto-Generation (Spec §4.15)
    const generatedItems = await generateOnboardingChecklistForProfile(testMember.id, department.id);

    const passedGeneratedItemsCount = generatedItems.length >= 4;
    const codeOfConductItem = generatedItems.find((i) =>
      i.label.toLowerCase().includes('code of conduct')
    );
    const otherItems = generatedItems.filter(
      (i) => !i.label.toLowerCase().includes('code of conduct')
    );

    const passedCodeOfConductAutoChecked =
      codeOfConductItem?.is_done === true && Boolean(codeOfConductItem?.completed_at);

    const passedOtherItemsPending =
      otherItems.length > 0 && otherItems.every((i) => i.is_done === false);

    // 6. Test Initial Progress (should be ~25% because code of conduct is auto-checked)
    const initialProgress = await getProfileOnboardingProgress(testMember.id);
    const passedInitialProgress =
      initialProgress.completed === 1 &&
      initialProgress.percentage > 0 &&
      initialProgress.isComplete === false &&
      initialProgress.hasOnboardedBadge === false;

    // 7. Member toggles remaining items to complete the checklist
    let lastToggleResult: any = null;
    for (const item of otherItems) {
      lastToggleResult = await toggleChecklistItem({
        itemId: item.id,
        profileId: testMember.id,
        isDone: true,
      });
    }

    // 8. Test 100% Completion & Automatic "Onboarded" Badge Awarding
    const finalProgress = await getProfileOnboardingProgress(testMember.id);

    const [badgeCheck, pointsCheck, notifCheck] = await Promise.all([
      admin
        .from('member_badges')
        .select('*, badge:badges(code, name)')
        .eq('profile_id', testMember.id),
      admin
        .from('points_log')
        .select('*')
        .eq('profile_id', testMember.id)
        .eq('action_key', 'onboarding_completed'),
      admin
        .from('notifications')
        .select('*')
        .eq('profile_id', testMember.id)
        .eq('type', 'badge_awarded'),
    ]);

    const passedFinalAllDone = finalProgress.isComplete === true && finalProgress.percentage === 100;
    const passedBadgeAwarded = (badgeCheck.data || []).some(
      (b: any) => b.badge?.code === 'onboarded'
    );
    const passedPointsAwarded = (pointsCheck.data || []).length > 0;
    const passedNotificationCreated = (notifCheck.data || []).length > 0;

    const allStep71AssertionsPassed =
      passedTemplatesSeeded &&
      passedGeneratedItemsCount &&
      passedCodeOfConductAutoChecked &&
      passedOtherItemsPending &&
      passedInitialProgress &&
      passedFinalAllDone &&
      passedBadgeAwarded &&
      passedPointsAwarded &&
      passedNotificationCreated;

    return NextResponse.json({
      status: allStep71AssertionsPassed ? 'ok' : 'assertion_failed',
      message: allStep71AssertionsPassed
        ? 'Phase 7 - Step 7.1 New-Member Onboarding Checklist PASSED perfectly!'
        : 'One or more assertions failed in Step 7.1.',
      verification: {
        testMember: {
          id: testMember.id,
          name: testMember.full_name,
          email: testMember.email,
        },
        templatesCount: dbTemplates?.length,
        itemsCount: generatedItems.length,
        assertions: {
          passedTemplatesSeeded,
          passedGeneratedItemsCount,
          passedCodeOfConductAutoChecked,
          passedOtherItemsPending,
          passedInitialProgress,
          passedFinalAllDone,
          passedBadgeAwarded,
          passedPointsAwarded,
          passedNotificationCreated,
        },
        initialProgress,
        finalProgress,
        awardedBadges: badgeCheck.data,
        awardedPoints: pointsCheck.data,
        allStep71AssertionsPassed,
      },
      urls: {
        dashboardUrl: '/dashboard',
        memberChecklistApi: `/api/onboarding/checklist?mock_user_id=${testMember.id}`,
      },
    });
  } catch (err: any) {
    console.error('Error in Step 7.1 verification:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
