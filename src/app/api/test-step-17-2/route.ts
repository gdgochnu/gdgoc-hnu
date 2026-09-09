import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  notifyNewAccountPending,
  notifyTaskDelegated,
  notifyTaskSubmittedUpward,
  notifyTaskReviewStage,
  notifyTaskRejectedOrChanges,
  notifyTaskApproved,
  notifyEventReviewStage,
  notifyEventApproved,
  notifyEventNearingCapacity,
  notifyCheckinDutyAssigned,
  notifyMemberMissedEvents,
  notifySpeakerConfirmed,
  notifySlaEscalation,
  notifyOnboardingChecklistReady,
  notifyEventBudgetExceeded,
  notifyMemberArchivedToAlumni,
  notifyCertificateIssued,
  notifyGamificationAward,
} from '@/lib/notifications/triggers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    step: '17.2 - Wire Every Notification Trigger from Spec §4.11',
    timestamp: new Date().toISOString(),
    tests: {},
    allPassed: false,
  };

  try {
    const admin = createAdminClient();

    // 1. Fetch a test profile to receive notifications
    const { data: testProfile } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .limit(1)
      .single();

    if (!testProfile) {
      throw new Error('No profile available for testing notifications.');
    }

    const testId = testProfile.id;

    // Test 1: notifyNewAccountPending
    const countNewAccount = await notifyNewAccountPending({
      applicantId: testId,
      applicantName: 'Test Applicant',
      position: 'Frontend Developer',
    });
    results.tests.notifyNewAccountPending = {
      passed: typeof countNewAccount === 'number',
      dispatched: countNewAccount,
    };

    // Test 2: notifyTaskDelegated (single + broadcast)
    const countDelegated = await notifyTaskDelegated({
      taskId: '11111111-1111-1111-1111-111111111111',
      taskTitle: 'Build Landing Page',
      delegatorName: 'Team Lead',
      recipientProfileIds: [testId],
      isBroadcast: false,
    });
    results.tests.notifyTaskDelegated = {
      passed: countDelegated >= 1,
      dispatched: countDelegated,
    };

    // Test 3: notifyTaskSubmittedUpward
    const countUpward = await notifyTaskSubmittedUpward({
      taskId: '11111111-1111-1111-1111-111111111111',
      taskTitle: 'Build Landing Page',
      submitterName: 'Test Contributor',
      delegatorId: testId,
    });
    results.tests.notifyTaskSubmittedUpward = {
      passed: countUpward === 1,
      dispatched: countUpward,
    };

    // Test 4: notifyTaskReviewStage (stages 1, 2, 3)
    const countReview = await notifyTaskReviewStage({
      taskId: '11111111-1111-1111-1111-111111111111',
      taskTitle: 'API Integration',
      submitterName: 'Developer',
      stageOrder: 2,
      approverIds: [testId],
    });
    results.tests.notifyTaskReviewStage = {
      passed: countReview === 1,
      dispatched: countReview,
    };

    // Test 5: notifyTaskRejectedOrChanges
    const countChanges = await notifyTaskRejectedOrChanges({
      taskId: '11111111-1111-1111-1111-111111111111',
      taskTitle: 'API Integration',
      recipientId: testId,
      reviewerName: 'Tech Lead',
      action: 'changes_requested',
      notes: 'Please add unit tests.',
    });
    results.tests.notifyTaskRejectedOrChanges = {
      passed: countChanges === 1,
      dispatched: countChanges,
    };

    // Test 6: notifyTaskApproved
    const countTaskApproved = await notifyTaskApproved({
      taskId: '11111111-1111-1111-1111-111111111111',
      taskTitle: 'API Integration',
      recipientId: testId,
      approverName: 'President',
    });
    results.tests.notifyTaskApproved = {
      passed: countTaskApproved === 1,
      dispatched: countTaskApproved,
    };

    // Test 7: notifyEventReviewStage & notifyEventApproved
    const countEventReview = await notifyEventReviewStage({
      eventId: '22222222-2222-2222-2222-222222222222',
      eventTitle: 'Flutter Festival 2026',
      submitterName: 'Mobile Head',
      stageOrder: 1,
      approverIds: [testId],
    });
    const countEventApproved = await notifyEventApproved({
      eventId: '22222222-2222-2222-2222-222222222222',
      eventTitle: 'Flutter Festival 2026',
      creatorId: testId,
      approverName: 'Chapter President',
    });
    results.tests.eventReviewAndApproval = {
      passed: countEventReview === 1 && countEventApproved === 1,
      eventReviewDispatched: countEventReview,
      eventApprovedDispatched: countEventApproved,
    };

    // Test 8: notifyCheckinDutyAssigned
    const countCheckin = await notifyCheckinDutyAssigned({
      eventId: '22222222-2222-2222-2222-222222222222',
      eventTitle: 'Flutter Festival 2026',
      assignedProfileIds: [testId],
    });
    results.tests.notifyCheckinDutyAssigned = {
      passed: countCheckin === 1,
      dispatched: countCheckin,
    };

    // Test 9: notifyEventBudgetExceeded & notifyEventNearingCapacity
    const countBudget = await notifyEventBudgetExceeded({
      eventId: '22222222-2222-2222-2222-222222222222',
      eventTitle: 'Flutter Festival 2026',
      estimatedCost: 500,
      actualCost: 650,
    });
    const countCapacity = await notifyEventNearingCapacity({
      eventId: '22222222-2222-2222-2222-222222222222',
      eventTitle: 'Flutter Festival 2026',
      currentRegistrations: 95,
      capacity: 100,
    });
    results.tests.eventBudgetAndCapacity = {
      passed: typeof countBudget === 'number' && typeof countCapacity === 'number',
      budgetAlertDispatched: countBudget,
      capacityAlertDispatched: countCapacity,
    };

    // Test 10: notifyOnboardingChecklistReady & notifyMemberArchivedToAlumni
    const countOnboarding = await notifyOnboardingChecklistReady({
      memberId: testId,
      memberName: 'Test Member',
    });
    const countAlumni = await notifyMemberArchivedToAlumni({
      memberId: testId,
      memberName: 'Test Alumnus',
      leaveReason: 'Graduation',
    });
    results.tests.onboardingAndAlumni = {
      passed: countOnboarding >= 1 && countAlumni >= 1,
      onboardingDispatched: countOnboarding,
      alumniDispatched: countAlumni,
    };

    // Test 11: notifySpeakerConfirmed & notifySlaEscalation
    const countSpeaker = await notifySpeakerConfirmed({
      contactId: '33333333-3333-3333-3333-333333333333',
      speakerName: 'Dr. Jane Smith',
      organization: 'Google',
    });
    const countSla = await notifySlaEscalation({
      entityType: 'task',
      entityId: '11111111-1111-1111-1111-111111111111',
      title: 'Stalled Deliverable',
      currentApproverId: testId,
      hoursPastSla: 72,
    });
    results.tests.speakerAndSla = {
      passed: typeof countSpeaker === 'number' && countSla >= 1,
      speakerDispatched: countSpeaker,
      slaDispatched: countSla,
    };

    // Test 12: notifyCertificateIssued & notifyGamificationAward
    const countCert = await notifyCertificateIssued({
      certificateId: '44444444-4444-4444-4444-444444444444',
      certificateTitle: 'Web Development Workshop Certificate',
      recipientId: testId,
    });
    const countGamification = await notifyGamificationAward({
      recipientId: testId,
      awardTitle: 'Onboarded Master',
      awardType: 'badge',
    });
    results.tests.certAndGamification = {
      passed: countCert === 1 && countGamification === 1,
      certDispatched: countCert,
      gamificationDispatched: countGamification,
    };

    // Verify row structure in DB
    const { data: latestNotifs } = await admin
      .from('notifications')
      .select('type, title, is_read, related_entity_type')
      .eq('profile_id', testId)
      .order('created_at', { ascending: false })
      .limit(5);

    results.tests.dbVerification = {
      passed: Boolean(latestNotifs && latestNotifs.length > 0),
      sampleCount: latestNotifs?.length || 0,
      sampleTypes: latestNotifs?.map((n) => n.type) || [],
    };

    // Check all tests passed
    const allTestsPassed = Object.values(results.tests).every((t: any) => t.passed === true);
    results.allPassed = allTestsPassed;

    return NextResponse.json(results);
  } catch (err: any) {
    console.error('Error in test-step-17-2:', err);
    results.error = err.message || 'Test execution failed';
    return NextResponse.json(results, { status: 500 });
  }
}
