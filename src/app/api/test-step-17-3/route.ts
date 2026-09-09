import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendTaskDelegatedEmail,
  sendTaskReviewRequestEmail,
  sendEventReviewRequestEmail,
  sendCheckinDutyAssignedEmail,
  sendEventApprovedEmail,
  sendBudgetAlertEmail,
  sendSpeakerConfirmedEmail,
  sendAlumniTransitionEmail,
} from '@/lib/email/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    step: '17.3 - Wire Email Delivery for Notification Triggers',
    timestamp: new Date().toISOString(),
    tests: {},
    allPassed: false,
  };

  try {
    const admin = createAdminClient();
    const testEmail = 'test-recipient@gdgoc.hnu.edu.eg';
    const testName = 'GDGoC Test Member';

    // 1. Test sendTaskDelegatedEmail
    const resTask = await sendTaskDelegatedEmail({
      to: testEmail,
      recipientName: testName,
      taskTitle: 'Build Responsive Landing Page',
      delegatorName: 'Executive Team',
      taskId: '11111111-1111-1111-1111-111111111111',
      isBroadcast: false,
    });
    results.tests.sendTaskDelegatedEmail = {
      passed: resTask.success,
      id: resTask.id,
      simulated: resTask.simulated,
    };

    // 2. Test sendTaskReviewRequestEmail
    const resReview = await sendTaskReviewRequestEmail({
      to: testEmail,
      reviewerName: 'Branch Head',
      taskTitle: 'API Authentication Endpoint',
      submitterName: testName,
      stageName: 'Stage 2 (Branch Review)',
      taskId: '11111111-1111-1111-1111-111111111111',
    });
    results.tests.sendTaskReviewRequestEmail = {
      passed: resReview.success,
      id: resReview.id,
    };

    // 3. Test sendEventReviewRequestEmail
    const resEventReview = await sendEventReviewRequestEmail({
      to: testEmail,
      reviewerName: 'Chapter President',
      eventTitle: 'DevFest Cairo 2026',
      submitterName: 'Technical Committee',
      stageName: 'Final Approval',
      eventId: '22222222-2222-2222-2222-222222222222',
    });
    results.tests.sendEventReviewRequestEmail = {
      passed: resEventReview.success,
      id: resEventReview.id,
    };

    // 4. Test sendCheckinDutyAssignedEmail
    const resCheckin = await sendCheckinDutyAssignedEmail({
      to: testEmail,
      recipientName: testName,
      eventTitle: 'DevFest Cairo 2026',
      eventId: '22222222-2222-2222-2222-222222222222',
    });
    results.tests.sendCheckinDutyAssignedEmail = {
      passed: resCheckin.success,
      id: resCheckin.id,
    };

    // 5. Test sendEventApprovedEmail
    const resApproved = await sendEventApprovedEmail({
      to: testEmail,
      creatorName: testName,
      eventTitle: 'DevFest Cairo 2026',
      approverName: 'President',
      eventId: '22222222-2222-2222-2222-222222222222',
    });
    results.tests.sendEventApprovedEmail = {
      passed: resApproved.success,
      id: resApproved.id,
    };

    // 6. Test sendBudgetAlertEmail
    const resBudget = await sendBudgetAlertEmail({
      to: testEmail,
      recipientName: testName,
      eventTitle: 'DevFest Cairo 2026',
      estimatedCost: 800,
      actualCost: 1100,
      eventId: '22222222-2222-2222-2222-222222222222',
    });
    results.tests.sendBudgetAlertEmail = {
      passed: resBudget.success,
      id: resBudget.id,
    };

    // 7. Test sendSpeakerConfirmedEmail
    const resSpeaker = await sendSpeakerConfirmedEmail({
      to: testEmail,
      recipientName: testName,
      speakerName: 'Dr. Jane Doe',
      organization: 'Google DeepMind',
      contactId: '33333333-3333-3333-3333-333333333333',
    });
    results.tests.sendSpeakerConfirmedEmail = {
      passed: resSpeaker.success,
      id: resSpeaker.id,
    };

    // 8. Test sendAlumniTransitionEmail
    const resAlumni = await sendAlumniTransitionEmail({
      to: testEmail,
      recipientName: testName,
      reason: 'Graduation Class of 2026',
    });
    results.tests.sendAlumniTransitionEmail = {
      passed: resAlumni.success,
      id: resAlumni.id,
    };

    // 9. Verify audit logs record for dispatched emails
    const { data: recentLogs } = await admin
      .from('audit_logs')
      .select('id, action, entity_type, metadata, created_at')
      .eq('action', 'email_dispatched')
      .order('created_at', { ascending: false })
      .limit(8);

    results.tests.auditLogsVerification = {
      passed: Boolean(recentLogs && recentLogs.length >= 1),
      count: recentLogs?.length || 0,
      sample: recentLogs?.[0] || null,
    };

    const allTestsPassed = Object.values(results.tests).every((t: any) => t.passed === true);
    results.allPassed = allTestsPassed;

    return NextResponse.json(results);
  } catch (err: any) {
    console.error('Error in test-step-17-3:', err);
    results.error = err.message || 'Test failed';
    return NextResponse.json(results, { status: 500 });
  }
}
