import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { registerForEvent, getEventRegistrationById } from '@/app/events/actions';
import { sendEventRegistrationEmail } from '@/lib/email/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const testRunId = Date.now();
  let testEventId: string | null = null;

  try {
    // 1. Fetch prerequisite department & creator
    const { data: dept } = await admin.from('departments').select('id, code').limit(1).single();
    const { data: creator } = await admin.from('profiles').select('id, role').eq('status', 'active').limit(1).single();

    if (!dept || !creator) {
      return NextResponse.json({
        status: 'error',
        message: 'Prerequisites missing: department or profile not found',
      }, { status: 500 });
    }

    const testSlug = `test-conf-event-${testRunId}`;

    // 2. Create test published event
    const { data: event, error: eventErr } = await admin
      .from('events')
      .insert({
        title: `Confirmation Test Event ${testRunId}`,
        slug: testSlug,
        description: 'Test event for verifying registration confirmation page and QR email dispatch',
        venue: 'Helwan National University - Hall C',
        event_date: '2026-10-20',
        start_time: '11:00',
        end_time: '15:00',
        capacity: 50,
        department_id: dept.id,
        status: 'published',
        created_by: creator.id,
      })
      .select()
      .single();

    if (eventErr || !event) {
      return NextResponse.json({
        status: 'error',
        message: `Failed to create test event: ${eventErr?.message}`,
      }, { status: 500 });
    }

    testEventId = event.id;

    // 3. Register a test attendee
    const attendeeEmail = `attendee_conf_${testRunId}@example.com`;
    const regRes = await registerForEvent({
      eventId: event.id,
      fullName: 'Youssef Nabil',
      email: attendeeEmail,
      phone: '+201112223334',
    });

    const passedRegistration = regRes.success === true &&
      !!regRes.registration?.id &&
      typeof regRes.registration?.qr_code === 'string' &&
      regRes.registration?.qr_code.startsWith('GDGOC-REG-');

    if (!passedRegistration || !regRes.registration) {
      return NextResponse.json({
        status: 'error',
        message: 'Attendee registration failed during Step 8.8 test',
      }, { status: 500 });
    }

    const regId = regRes.registration.id;
    const qrCode = regRes.registration.qr_code;

    // 4. Test getEventRegistrationById
    const fetchedReg = await getEventRegistrationById(regId);
    const passedFetchById = fetchedReg !== null &&
      fetchedReg.id === regId &&
      fetchedReg.email === attendeeEmail &&
      fetchedReg.event?.slug === testSlug;

    // 5. Test getEventRegistrationById by QR code lookup
    const fetchedByQr = await getEventRegistrationById(qrCode);
    const passedFetchByQr = fetchedByQr !== null && fetchedByQr.id === regId;

    // 6. Test direct sendEventRegistrationEmail for Confirmed status
    const confirmedEmailRes = await sendEventRegistrationEmail({
      to: attendeeEmail,
      fullName: 'Youssef Nabil',
      eventTitle: event.title,
      eventSlug: event.slug,
      eventDate: event.event_date,
      startTime: event.start_time,
      endTime: event.end_time,
      venue: event.venue,
      qrCode,
      status: 'registered',
      registrationId: regId,
    });
    const passedConfirmedEmail = confirmedEmailRes.success === true;

    // 7. Test direct sendEventRegistrationEmail for Waitlisted status
    const waitlistEmailRes = await sendEventRegistrationEmail({
      to: `waitlisted_${testRunId}@example.com`,
      fullName: 'Waitlist Attendee',
      eventTitle: event.title,
      eventSlug: event.slug,
      eventDate: event.event_date,
      qrCode: `GDGOC-REG-WAITLIST-${testRunId}`,
      status: 'waitlisted',
      registrationId: `waitlist-${testRunId}`,
    });
    const passedWaitlistEmail = waitlistEmailRes.success === true;

    // 8. Verify audit log entry for email dispatch
    const { data: auditEntries } = await admin
      .from('audit_logs')
      .select('action, metadata')
      .eq('action', 'email_dispatched')
      .order('created_at', { ascending: false })
      .limit(10);

    const emailAuditFound = Array.isArray(auditEntries) && auditEntries.some((entry: any) =>
      entry.metadata?.to === attendeeEmail &&
      entry.metadata?.type === 'event_registration' &&
      entry.metadata?.registrationId === regId
    );

    // 9. Overall verification status
    const allPassed =
      passedRegistration &&
      passedFetchById &&
      passedFetchByQr &&
      passedConfirmedEmail &&
      passedWaitlistEmail &&
      emailAuditFound;

    // 10. Cleanup test records
    await admin.from('event_registrations').delete().eq('event_id', testEventId);
    await admin.from('events').delete().eq('id', testEventId);

    return NextResponse.json({
      status: allPassed ? 'ok' : 'failed',
      step: '8.8',
      message: allPassed
        ? 'Step 8.8 Registration confirmation page + QR-code email verified successfully!'
        : 'Some Step 8.8 assertions failed.',
      verification: {
        allPassed,
        passedRegistration,
        passedFetchById,
        passedFetchByQr,
        passedConfirmedEmail,
        passedWaitlistEmail,
        emailAuditFound,
        testSlug,
        regId,
        qrCode,
      },
    });
  } catch (err: any) {
    if (testEventId) {
      await admin.from('event_registrations').delete().eq('event_id', testEventId);
      await admin.from('events').delete().eq('id', testEventId);
    }
    return NextResponse.json({
      status: 'error',
      message: err?.message || 'Unexpected error testing Step 8.8',
    }, { status: 500 });
  }
}
