import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateEventDetails } from '@/app/events/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const results: Record<string, any> = {};

  try {
    // 1. Fetch an existing department to satisfy foreign key constraint
    const { data: dept } = await admin.from('departments').select('id').limit(1).single();
    const departmentId = dept?.id;

    // 2. Fetch an existing event to test with or create a temporary test event
    const testSlug = `test-edit-event-${Date.now()}`;
    const { data: createdEvent, error: createErr } = await admin
      .from('events')
      .insert({
        title: 'Original Event Title Before Edit',
        slug: testSlug,
        description: 'Original event description before editing.',
        venue: 'Original Venue Hall 1',
        event_date: '2026-10-15',
        start_time: '10:00',
        end_time: '12:00',
        capacity: 50,
        department_id: departmentId,
        status: 'draft',
        registration_fields: [
          { id: 'f1', label: 'Original Question', field_type: 'text', required: true }
        ],
        owners: [],
      })
      .select('*')
      .single();

    if (createErr || !createdEvent) {
      return NextResponse.json({
        success: false,
        error: `Failed to create test event: ${createErr?.message}`,
      }, { status: 500 });
    }

    const testEventId = createdEvent.id;
    results.createdTestEventId = testEventId;

    // 2. Test unauthorized call (no session & skipAuthCheck false)
    const unauthorizedRes = await updateEventDetails(testEventId, {
      title: 'Hacked Event Title',
    });
    results.unauthorizedCheck = {
      rejected: !unauthorizedRes.success,
      error: unauthorizedRes.error,
    };

    // 3. Test authorized execution using skipAuthCheck: true (simulating server/admin execution)
    const updatedTitle = 'Updated GDGoC Masterclass & AI Workshop';
    const updatedVenue = 'Auditorium 302, Main Campus';
    const updatedCapacity = 120;
    const updatedSlug = `${testSlug}-edited`;

    const updateRes = await updateEventDetails(
      testEventId,
      {
        title: updatedTitle,
        slug: updatedSlug,
        venue: updatedVenue,
        capacity: updatedCapacity,
        registrationFields: [
          { id: 'f1', label: 'Updated Question 1', field_type: 'text', required: true },
          { id: 'f2', label: 'Which track are you most interested in?', field_type: 'select', required: false, options: ['AI', 'Web', 'Cloud'] },
        ],
      },
      { skipAuthCheck: true }
    );

    results.updateExecution = {
      success: updateRes.success,
      returnedTitle: updateRes.event?.title,
      returnedVenue: updateRes.event?.venue,
      returnedCapacity: updateRes.event?.capacity,
      returnedSlug: updateRes.event?.slug,
      returnedFieldsCount: updateRes.event?.registration_fields?.length,
    };

    // 4. Verify in DB directly
    const { data: dbCheck } = await admin
      .from('events')
      .select('title, venue, capacity, slug, registration_fields')
      .eq('id', testEventId)
      .single();

    results.dbVerification = {
      matchesTitle: dbCheck?.title === updatedTitle,
      matchesVenue: dbCheck?.venue === updatedVenue,
      matchesCapacity: dbCheck?.capacity === updatedCapacity,
      matchesSlug: dbCheck?.slug === updatedSlug,
      matchesFieldsCount: dbCheck?.registration_fields?.length === 2,
    };

    // 5. Verify audit log entry
    const { data: auditLog } = await admin
      .from('audit_logs')
      .select('*')
      .eq('entity_id', testEventId)
      .eq('action', 'event_details_updated')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    results.auditLog = {
      recorded: !!auditLog,
      action: auditLog?.action,
      updatedFields: auditLog?.metadata?.updatedFields,
    };

    // 6. Clean up test event and test audit logs
    await admin.from('events').delete().eq('id', testEventId);

    const allPassed =
      results.unauthorizedCheck.rejected &&
      results.updateExecution.success &&
      results.dbVerification.matchesTitle &&
      results.dbVerification.matchesVenue &&
      results.dbVerification.matchesCapacity &&
      results.dbVerification.matchesSlug &&
      results.dbVerification.matchesFieldsCount &&
      results.auditLog.recorded;

    return NextResponse.json({
      test: 'Event Details Editing & Audit Verification',
      timestamp: new Date().toISOString(),
      allPassed,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
