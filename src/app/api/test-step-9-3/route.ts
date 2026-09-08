import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEventFeedbackSummary } from '@/app/events/actions';
import * as fs from 'fs';
import * as path from 'path';

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
    const testSlug = `test-feedback-results-${testRunId}`;
    const { data: testEvent, error: eventErr } = await admin
      .from('events')
      .insert({
        title: `Test Feedback Results Event ${testRunId}`,
        slug: testSlug,
        venue: 'Engineering Hall 3',
        event_date: '2026-09-08',
        start_time: '12:00',
        end_time: '15:00',
        capacity: 150,
        department_id: dept.id,
        status: 'completed',
      })
      .select()
      .single();

    if (eventErr || !testEvent) {
      throw new Error(`Failed to create test event: ${eventErr?.message}`);
    }
    createdEventIds.push(testEvent.id);

    // 3. Create test registrations for feedback attribution
    const { data: regNamed, error: regErr } = await admin
      .from('event_registrations')
      .insert({
        event_id: testEvent.id,
        full_name: `Attributed Attendee ${testRunId}`,
        email: `feedback-named-${testRunId}@example.com`,
        status: 'registered',
      })
      .select()
      .single();

    if (regErr || !regNamed) {
      throw new Error(`Failed to create test registration: ${regErr?.message}`);
    }
    createdRegistrationIds.push(regNamed.id);

    // 4. Insert 5 diverse test feedback records:
    // Sub 1: 5★ with comment (Public/named via registration)
    // Sub 2: 5★ with comment (Anonymous)
    // Sub 3: 4★ with comment (Public/named via profile)
    // Sub 4: 4★ rating only without comment (Anonymous)
    // Sub 5: 3★ with comment (Anonymous)
    // Total: 5, Sum: 21, Expected Average: 4.2
    // Distribution: 5★: 2, 4★: 2, 3★: 1, 2★: 0, 1★: 0
    // Comments: 4, Anonymous: 3
    const testFeedbackPayloads = [
      {
        event_id: testEvent.id,
        registration_id: regNamed.id,
        rating: 5,
        comment: 'Outstanding speaker and great live coding demo! Learned a ton.',
        is_anonymous: false,
      },
      {
        event_id: testEvent.id,
        rating: 5,
        comment: 'One of the best chapter events this season. Keep it up!',
        is_anonymous: true,
      },
      {
        event_id: testEvent.id,
        profile_id: testMember.id,
        rating: 4,
        comment: 'Very informative session, but could use a longer Q&A slot.',
        is_anonymous: false,
      },
      {
        event_id: testEvent.id,
        rating: 4,
        comment: null,
        is_anonymous: true,
      },
      {
        event_id: testEvent.id,
        rating: 3,
        comment: 'Good content but the venue hall was slightly crowded.',
        is_anonymous: true,
      },
    ];

    const { data: insertedFeedbacks, error: fbErr } = await admin
      .from('event_feedback')
      .insert(testFeedbackPayloads)
      .select();

    if (fbErr || !insertedFeedbacks) {
      throw new Error(`Failed to insert test feedback records: ${fbErr?.message}`);
    }

    for (const fb of insertedFeedbacks) {
      createdFeedbackIds.push(fb.id);
    }

    // 5. Test getEventFeedbackSummary action
    const summary = await getEventFeedbackSummary(testEvent.id);

    // Verify statistics
    const totalCountPassed = summary.totalCount === 5;
    const averageRatingPassed = Math.abs(summary.averageRating - 4.2) < 0.05;
    const distributionPassed =
      summary.distribution[5] === 2 &&
      summary.distribution[4] === 2 &&
      summary.distribution[3] === 1 &&
      summary.distribution[2] === 0 &&
      summary.distribution[1] === 0;
    const commentsCountPassed = summary.commentsCount === 4;
    const anonymousCountPassed = summary.anonymousCount === 3;

    // Verify anonymity masking per Spec §3.17 & §4.18
    const anonItems = summary.feedback.filter((f) => f.is_anonymous);
    const namedItems = summary.feedback.filter((f) => !f.is_anonymous);

    // Anonymous items must have masked profile / registration
    const anonymityEnforced = anonItems.every(
      (f) => f.profile === null && f.registration === null
    );

    // Named items should preserve identity
    const namedPreserved = namedItems.length === 2 && namedItems.some((f) => f.profile !== null || f.registration !== null);

    // 6. Verify Component & Integration Files Exist
    const componentPath = path.join(
      process.cwd(),
      'src',
      'components',
      'events',
      'EventFeedbackResultsView.tsx'
    );
    const componentExists = fs.existsSync(componentPath);

    const eventPagePath = path.join(
      process.cwd(),
      'src',
      'app',
      'events',
      '[id]',
      'page.tsx'
    );
    const eventPageContent = fs.existsSync(eventPagePath)
      ? fs.readFileSync(eventPagePath, 'utf-8')
      : '';

    const pageIntegratesComponent =
      eventPageContent.includes('EventFeedbackResultsView') &&
      eventPageContent.includes('getEventFeedbackSummary');

    // 7. Cleanup test records
    if (createdFeedbackIds.length > 0) {
      await admin.from('event_feedback').delete().in('id', createdFeedbackIds);
    }
    if (createdRegistrationIds.length > 0) {
      await admin.from('event_registrations').delete().in('id', createdRegistrationIds);
    }
    if (createdEventIds.length > 0) {
      await admin.from('events').delete().in('id', createdEventIds);
    }

    const allChecksPassed =
      totalCountPassed &&
      averageRatingPassed &&
      distributionPassed &&
      commentsCountPassed &&
      anonymousCountPassed &&
      anonymityEnforced &&
      namedPreserved &&
      componentExists &&
      pageIntegratesComponent;

    return NextResponse.json({
      status: allChecksPassed ? 'ok' : 'partial',
      message: allChecksPassed
        ? 'Phase 9 - Step 9.3: Event feedback results view, average score computation, distribution breakdown, and comment highlights verified successfully!'
        : 'Phase 9 - Step 9.3: Verification completed with notes.',
      step: '9.3',
      specReference: '§3.17, §4.18',
      summaryResults: {
        totalCount: summary.totalCount,
        averageRating: summary.averageRating,
        expectedAverage: 4.2,
        distribution: summary.distribution,
        commentsCount: summary.commentsCount,
        anonymousCount: summary.anonymousCount,
      },
      checks: {
        totalCountPassed,
        averageRatingPassed,
        distributionPassed,
        commentsCountPassed,
        anonymousCountPassed,
        anonymityEnforced,
        namedPreserved,
        componentExists,
        pageIntegratesComponent,
      },
    });
  } catch (err: unknown) {
    console.error('test-step-9-3 error:', err);

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
        error: err instanceof Error ? err.message : 'Unknown error during Step 9.3 test',
      },
      { status: 500 }
    );
  }
}
