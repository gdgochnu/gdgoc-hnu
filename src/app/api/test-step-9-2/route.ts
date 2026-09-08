import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { submitEventFeedback, getExistingEventFeedback } from '@/app/events/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const testRunId = Date.now();
  const createdEventIds: string[] = [];
  const createdFeedbackIds: string[] = [];
  const createdRegistrationIds: string[] = [];

  try {
    // 1. Fetch prerequisite department & active member profile
    const { data: dept } = await admin
      .from('departments')
      .select('id, code')
      .limit(1)
      .single();

    const { data: testMember } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!dept || !testMember) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Prerequisites missing (active department or active profile not found).',
        },
        { status: 500 }
      );
    }

    // 2. Create test event
    const testSlug = `test-feedback-form-${testRunId}`;
    const { data: testEvent, error: eventErr } = await admin
      .from('events')
      .insert({
        title: `Test Feedback Form Event ${testRunId}`,
        slug: testSlug,
        venue: 'Hall B',
        event_date: '2026-09-08',
        start_time: '14:00',
        end_time: '16:00',
        capacity: 50,
        department_id: dept.id,
        status: 'completed',
      })
      .select()
      .single();

    if (eventErr || !testEvent) {
      throw new Error(`Failed to create test event: ${eventErr?.message}`);
    }
    createdEventIds.push(testEvent.id);

    // 3. Test Rating Validation Boundaries:
    // A. Rating 0 (too low)
    const resLow = await submitEventFeedback({
      eventId: testEvent.id,
      rating: 0,
      comment: 'Invalid rating',
    });
    const lowRejected = !resLow.success && resLow.code === 'INVALID_RATING';

    // B. Rating 6 (too high)
    const resHigh = await submitEventFeedback({
      eventId: testEvent.id,
      rating: 6,
      comment: 'Invalid rating',
    });
    const highRejected = !resHigh.success && resHigh.code === 'INVALID_RATING';

    // C. Rating 3.5 (float)
    const resFloat = await submitEventFeedback({
      eventId: testEvent.id,
      rating: 3.5,
      comment: 'Float rating',
    });
    const floatRejected = !resFloat.success && resFloat.code === 'INVALID_RATING';

    // 4. Test Valid Anonymous-by-Default Submission (with registration pass)
    const testRegEmailA = `feedback-anon-${testRunId}@example.com`;
    const { data: regA, error: regAErr } = await admin
      .from('event_registrations')
      .insert({
        event_id: testEvent.id,
        full_name: `Anonymous Attendee ${testRunId}`,
        email: testRegEmailA,
        status: 'registered',
      })
      .select()
      .single();

    if (regAErr || !regA) {
      throw new Error(`Failed to create registration A: ${regAErr?.message}`);
    }
    createdRegistrationIds.push(regA.id);

    // Submit with default isAnonymous (omitted, should default to true)
    const commentText = 'The workshop was brilliant! Hands-on labs were clear and engaging.';
    const resAnon = await submitEventFeedback({
      eventId: testEvent.id,
      rating: 5,
      comment: commentText,
      registrationId: regA.id,
      // isAnonymous omitted -> should default to true
    });

    if (!resAnon.success || !resAnon.feedback) {
      throw new Error(`Failed anonymous feedback submission: ${resAnon.error}`);
    }
    createdFeedbackIds.push(resAnon.feedback.id);

    const anonSubmissionPassed =
      resAnon.feedback.rating === 5 &&
      resAnon.feedback.is_anonymous === true &&
      resAnon.feedback.comment === commentText;

    // 5. Test Duplicate Prevention on same registration pass
    const resDuplicate = await submitEventFeedback({
      eventId: testEvent.id,
      rating: 4,
      comment: 'Trying to submit again',
      registrationId: regA.id,
    });
    const duplicateBlocked =
      !resDuplicate.success && resDuplicate.code === 'DUPLICATE_SUBMISSION';

    // 6. Test Named (Non-Anonymous) Submission
    const testRegEmailB = `feedback-named-${testRunId}@example.com`;
    const { data: regB, error: regBErr } = await admin
      .from('event_registrations')
      .insert({
        event_id: testEvent.id,
        full_name: `Named Attendee ${testRunId}`,
        email: testRegEmailB,
        status: 'registered',
      })
      .select()
      .single();

    if (regBErr || !regB) {
      throw new Error(`Failed to create registration B: ${regBErr?.message}`);
    }
    createdRegistrationIds.push(regB.id);

    const resNamed = await submitEventFeedback({
      eventId: testEvent.id,
      rating: 4,
      comment: 'Great speaker and venue was well organized.',
      isAnonymous: false,
      registrationId: regB.id,
    });

    if (!resNamed.success || !resNamed.feedback) {
      throw new Error(`Failed named feedback submission: ${resNamed.error}`);
    }
    createdFeedbackIds.push(resNamed.feedback.id);

    const namedSubmissionPassed =
      resNamed.feedback.rating === 4 &&
      resNamed.feedback.is_anonymous === false;

    // 7. Verify Existing Feedback Retrieval
    const existingCheck = await getExistingEventFeedback(testEvent.id, regA.id);
    const existingCheckPassed =
      existingCheck.hasSubmitted &&
      existingCheck.feedback?.id === resAnon.feedback.id;

    // 8. Verify Audit Logs
    const { data: auditLogs } = await admin
      .from('audit_logs')
      .select('*')
      .eq('action', 'event_feedback_submitted')
      .in('entity_id', createdFeedbackIds);

    const auditLoggedCount = auditLogs?.length || 0;
    const auditLogsValid = auditLoggedCount === 2;

    // 9. Clean up all test records
    if (createdFeedbackIds.length > 0) {
      await admin.from('event_feedback').delete().in('id', createdFeedbackIds);
    }
    if (createdRegistrationIds.length > 0) {
      await admin.from('event_registrations').delete().in('id', createdRegistrationIds);
    }
    if (createdEventIds.length > 0) {
      await admin.from('events').delete().in('id', createdEventIds);
    }
    await admin.from('audit_logs').delete().in('entity_id', createdFeedbackIds);

    const allPassed =
      lowRejected &&
      highRejected &&
      floatRejected &&
      anonSubmissionPassed &&
      duplicateBlocked &&
      namedSubmissionPassed &&
      existingCheckPassed &&
      auditLogsValid;

    return NextResponse.json({
      status: allPassed ? 'ok' : 'partial',
      message: allPassed
        ? 'Phase 9 - Step 9.2: Feedback submission form, 1-5 rating, comment, anonymous toggle, and duplicate prevention verified successfully!'
        : 'Phase 9 - Step 9.2: Some test checks did not pass.',
      step: '9.2',
      specReference: '§3.11, §4.18',
      checks: {
        ratingValidation: {
          lowRatingRejected: lowRejected,
          highRatingRejected: highRejected,
          floatRatingRejected: floatRejected,
        },
        anonymousByDefault: {
          passed: anonSubmissionPassed,
          rating: resAnon.feedback?.rating,
          isAnonymous: resAnon.feedback?.is_anonymous,
          commentLength: resAnon.feedback?.comment?.length,
        },
        duplicatePrevention: {
          blocked: duplicateBlocked,
        },
        namedSubmission: {
          passed: namedSubmissionPassed,
          rating: resNamed.feedback?.rating,
          isAnonymous: resNamed.feedback?.is_anonymous,
        },
        existingFeedbackQuery: {
          passed: existingCheckPassed,
          retrievedId: existingCheck.feedback?.id,
        },
        auditLogs: {
          passed: auditLogsValid,
          count: auditLoggedCount,
        },
      },
    });
  } catch (err: unknown) {
    console.error('test-step-9-2 error:', err);

    // Best-effort cleanup
    try {
      if (createdFeedbackIds.length > 0) {
        await admin.from('event_feedback').delete().in('id', createdFeedbackIds);
      }
      if (createdRegistrationIds.length > 0) {
        await admin.from('event_registrations').delete().in('id', createdRegistrationIds);
      }
      if (createdEventIds.length > 0) {
        await admin.from('events').delete().in('id', createdEventIds);
      }
    } catch {
      // ignore
    }

    return NextResponse.json(
      {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error during Step 9.2 test',
      },
      { status: 500 }
    );
  }
}
