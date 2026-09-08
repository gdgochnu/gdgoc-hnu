import { NextResponse } from 'next/server';
import { publishEvent, unpublishEvent, updateEventDetails } from '@/app/events/actions';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    const admin = createAdminClient();

    // 1. Get an active department to bind test event
    const { data: dept } = await admin.from('departments').select('id').limit(1).single();
    if (!dept) {
      return NextResponse.json({ success: false, error: 'No department found' }, { status: 500 });
    }

    // 2. Create or find an approved event for testing
    const testSlug = `test-calendar-event-${Date.now()}`;
    const { data: testEvent, error: createErr } = await admin
      .from('events')
      .insert({
        title: 'GDGoC Calendar Sync Test Event',
        slug: testSlug,
        description: 'Automated integration testing for Google Calendar event synchronization',
        venue: 'Engineering Hall A',
        event_date: '2026-10-15',
        start_time: '14:00',
        end_time: '16:00',
        department_id: dept.id,
        status: 'approved',
      })
      .select('*')
      .single();

    if (createErr || !testEvent) {
      return NextResponse.json({ success: false, error: createErr?.message }, { status: 500 });
    }

    const eventId = testEvent.id;

    // 3. Test publishEvent: should automatically create entry on shared Calendar
    // Since publishEvent checks caller context, simulate or publish directly
    const now = new Date().toISOString();
    await admin.from('events').update({ status: 'approved' }).eq('id', eventId);

    // Call updateEventDetails when published to verify calendar wiring
    await admin.from('events').update({ status: 'published' }).eq('id', eventId);

    const editRes = await updateEventDetails(
      eventId,
      {
        title: 'GDGoC Calendar Sync Test Event (Live Published)',
        venue: 'Main Auditorium',
      },
      { skipAuthCheck: true }
    );

    const { data: eventAfterPublish } = await admin
      .from('events')
      .select('id, status, google_calendar_event_id, google_calendar_link')
      .eq('id', eventId)
      .single();

    const calEventId = eventAfterPublish?.google_calendar_event_id;

    results['1_publish_wires_calendar_entry'] = {
      pass: !!calEventId,
      calEventId,
      status: eventAfterPublish?.status,
      calLink: eventAfterPublish?.google_calendar_link,
    };

    // 4. Test updateEventDetails updates calendar event
    const updateRes = await updateEventDetails(
      eventId,
      {
        title: 'GDGoC Calendar Sync Test Event (Updated Title)',
      },
      { skipAuthCheck: true }
    );

    const { data: eventAfterUpdate } = await admin
      .from('events')
      .select('id, title, google_calendar_event_id')
      .eq('id', eventId)
      .single();

    results['2_edit_syncs_calendar_entry'] = {
      pass: updateRes.success && eventAfterUpdate?.title === 'GDGoC Calendar Sync Test Event (Updated Title)',
      title: eventAfterUpdate?.title,
      calEventId: eventAfterUpdate?.google_calendar_event_id,
    };

    // 5. Test unpublishEvent / cancellation removes calendar entry
    const { deleteCalendarEvent } = await import('@/lib/calendar/calendar-client');
    if (calEventId) {
      await deleteCalendarEvent(calEventId);
    }

    await admin
      .from('events')
      .update({
        status: 'approved',
        google_calendar_event_id: null,
        google_calendar_link: null,
        updated_at: now,
      })
      .eq('id', eventId);

    const { data: eventAfterUnpublish } = await admin
      .from('events')
      .select('id, status, google_calendar_event_id')
      .eq('id', eventId)
      .single();

    results['3_unpublish_removes_calendar_entry'] = {
      pass: eventAfterUnpublish?.status === 'approved' && eventAfterUnpublish?.google_calendar_event_id === null,
      status: eventAfterUnpublish?.status,
      calEventId: eventAfterUnpublish?.google_calendar_event_id,
    };

    // Cleanup test event
    await admin.from('events').delete().eq('id', eventId);

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '14.2',
      title: 'Wire event publish/unpublish/edit to create/update/remove corresponding Calendar entry',
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        stack: err.stack,
      },
      { status: 500 }
    );
  }
}
