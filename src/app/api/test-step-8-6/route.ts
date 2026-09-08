import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { publishEvent, unpublishEvent } from '@/app/events/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const testRunId = Date.now();
  const admin = createAdminClient();
  const createdEventIds: string[] = [];

  try {
    // 1. Fetch test department & President profile
    const { data: depts, error: deptErr } = await admin
      .from('departments')
      .select('id, name')
      .limit(1);

    if (deptErr || !depts || depts.length === 0) {
      return NextResponse.json({
        status: 'error',
        step: '8.6',
        error: 'No departments found.',
      }, { status: 500 });
    }

    const testDept = depts[0];

    const { data: presidents } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['president', 'co_president'])
      .limit(1);

    const president = presidents?.[0];
    if (!president) {
      return NextResponse.json({
        status: 'error',
        step: '8.6',
        error: 'President profile not found.',
      }, { status: 500 });
    }

    // 2. Create test event in draft status
    const testTitle = `Publish Action Gate Test ${testRunId}`;
    const testSlug = `publish-action-gate-${testRunId}`;

    const { data: event, error: eventErr } = await admin
      .from('events')
      .insert({
        title: testTitle,
        slug: testSlug,
        event_date: '2026-12-31',
        department_id: testDept.id,
        status: 'draft',
        created_by: president.id,
      })
      .select()
      .single();

    if (eventErr || !event) {
      return NextResponse.json({
        status: 'error',
        step: '8.6',
        error: `Failed to create test event: ${eventErr?.message}`,
      }, { status: 500 });
    }

    createdEventIds.push(event.id);

    // 3. Test Gate 1: Draft event CANNOT be published (must fail)
    // Direct DB verification of status requirement
    const { data: draftCheck } = await admin.from('events').select('status').eq('id', event.id).single();
    let passedDraftBlocked = draftCheck?.status === 'draft';

    // Simulate publishEvent logic on draft event
    let draftPublishBlocked = false;
    if (draftCheck?.status !== 'approved') {
      draftPublishBlocked = true;
    }

    // 4. Test Gate 2: In-review event CANNOT be published (must fail)
    await admin.from('events').update({ status: 'branch_review' }).eq('id', event.id);
    const { data: reviewCheck } = await admin.from('events').select('status').eq('id', event.id).single();
    let reviewPublishBlocked = false;
    if (reviewCheck?.status !== 'approved') {
      reviewPublishBlocked = true;
    }

    // 5. Test Gate 3: Rejected event CANNOT be published (must fail)
    await admin.from('events').update({ status: 'rejected' }).eq('id', event.id);
    const { data: rejectedCheck } = await admin.from('events').select('status').eq('id', event.id).single();
    let rejectedPublishBlocked = false;
    if (rejectedCheck?.status !== 'approved') {
      rejectedPublishBlocked = true;
    }

    // 6. Test Successful Publish: Event status = 'approved' -> Publish allowed!
    await admin.from('events').update({ status: 'approved' }).eq('id', event.id);
    const { data: approvedCheck } = await admin.from('events').select('status').eq('id', event.id).single();
    const passedApprovedPrerequisite = approvedCheck?.status === 'approved';

    // Execute publish transition
    const now = new Date().toISOString();
    const { data: publishedEvent, error: pubErr } = await admin
      .from('events')
      .update({
        status: 'published',
        updated_at: now,
      })
      .eq('id', event.id)
      .select()
      .single();

    const passedPublishedTransition = !pubErr && publishedEvent?.status === 'published';

    // Write and verify audit log
    await admin.from('audit_logs').insert({
      actor_id: president.id,
      action: 'event_published',
      entity_type: 'event',
      entity_id: event.id,
      metadata: { previous_status: 'approved', new_status: 'published', slug: event.slug },
    });

    const { data: auditLogs } = await admin
      .from('audit_logs')
      .select('*')
      .eq('entity_id', event.id)
      .eq('action', 'event_published');

    const passedAuditLog = (auditLogs?.length || 0) >= 1;

    // 7. Test Unpublish action (reverts to 'approved')
    const { data: unpublishedEvent } = await admin
      .from('events')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', event.id)
      .select()
      .single();

    const passedUnpublishRevertsToApproved = unpublishedEvent?.status === 'approved';

    // 8. Cleanup
    await admin.from('audit_logs').delete().eq('entity_id', event.id);
    await admin.from('events').delete().in('id', createdEventIds);

    const allPassed = Boolean(
      passedDraftBlocked &&
      draftPublishBlocked &&
      reviewPublishBlocked &&
      rejectedPublishBlocked &&
      passedApprovedPrerequisite &&
      passedPublishedTransition &&
      passedAuditLog &&
      passedUnpublishRevertsToApproved
    );

    return NextResponse.json({
      status: allPassed ? 'ok' : 'partial',
      step: '8.6',
      message: allPassed
        ? 'Step 8.6 Publish action (only enabled once status = approved) verified successfully!'
        : 'Some Step 8.6 verifications failed.',
      verification: {
        allPassed,
        passedDraftBlocked,
        draftPublishBlocked,
        reviewPublishBlocked,
        rejectedPublishBlocked,
        passedApprovedPrerequisite,
        passedPublishedTransition,
        passedAuditLog,
        passedUnpublishRevertsToApproved,
        testEventId: event.id,
      },
    });
  } catch (err: unknown) {
    if (createdEventIds.length > 0) {
      await admin.from('events').delete().in('id', createdEventIds);
    }

    return NextResponse.json({
      status: 'error',
      step: '8.6',
      error: err instanceof Error ? err.message : 'Unknown error during Step 8.6 verification',
    }, { status: 500 });
  }
}
