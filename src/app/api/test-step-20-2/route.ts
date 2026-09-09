import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  fetchCertificateEventsAction,
  getEventAttendeesForCertificatesAction,
  searchMemberRecipientsAction,
} from '@/lib/certificates/recipient-actions';

/**
 * GET /api/test-step-20-2
 * Verify: Recipient Selection Flow (§4.14)
 * Tests:
 *   1. Event listing for certificate issuance
 *   2. Bulk recipient selection by event attendance rate >= threshold
 *   3. Manual member search flow by name/email
 */
export async function GET() {
  const results: Record<string, unknown> = {};
  const admin = createAdminClient();

  // Test 1: Fetch Events for Certificates
  let targetEventId: string | null = null;
  try {
    const eventsRes = await fetchCertificateEventsAction();
    if (eventsRes.success && eventsRes.events.length > 0) {
      targetEventId = eventsRes.events[0].id;
      results['1_fetch_certificate_events'] = {
        success: true,
        totalEvents: eventsRes.events.length,
        sampleEvent: {
          id: eventsRes.events[0].id,
          title: eventsRes.events[0].title,
        },
      };
    } else {
      results['1_fetch_certificate_events'] = {
        success: true,
        totalEvents: 0,
        note: 'No events returned, will mock/fallback',
      };
    }
  } catch (e: any) {
    results['1_fetch_certificate_events'] = { error: e.message };
  }

  // Test 2: Bulk Selection from Event Attendance (threshold >= 75%)
  try {
    if (!targetEventId) {
      // Find or pick any event from DB
      const { data: ev } = await admin.from('events').select('id, title').limit(1).maybeSingle();
      if (ev) targetEventId = ev.id;
    }

    if (targetEventId) {
      let cleanupAttendanceId: string | null = null;
      const { data: member } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (member) {
        const { data: att } = await admin
          .from('attendance')
          .insert({
            event_id: targetEventId,
            profile_id: member.id,
            method: 'qr',
          })
          .select('id')
          .maybeSingle();

        if (att) cleanupAttendanceId = att.id;
      }

      const attendeesRes = await getEventAttendeesForCertificatesAction(targetEventId, 75);

      if (cleanupAttendanceId) {
        await admin.from('attendance').delete().eq('id', cleanupAttendanceId);
      }

      results['2_bulk_event_attendance_selection'] = {
        success: attendeesRes.success,
        eventTitle: attendeesRes.eventTitle,
        totalAttendees: attendeesRes.totalAttendees,
        qualifyingCount: attendeesRes.qualifyingCount,
        thresholdUsed: '>= 75%',
        sampleRecipient: attendeesRes.recipients[0]
          ? {
              name: attendeesRes.recipients[0].name,
              email: attendeesRes.recipients[0].email,
              attendancePct: attendeesRes.recipients[0].attendancePct,
            }
          : null,
      };
    } else {
      results['2_bulk_event_attendance_selection'] = { error: 'No event available in DB' };
    }
  } catch (e: any) {
    results['2_bulk_event_attendance_selection'] = { error: e.message };
  }

  // Test 3: Manual Member Search
  try {
    const searchRes = await searchMemberRecipientsAction('Test');
    results['3_manual_member_search'] = {
      success: searchRes.success,
      matchesCount: searchRes.members.length,
      sampleMatch: searchRes.members[0]
        ? {
            name: searchRes.members[0].name,
            email: searchRes.members[0].email,
          }
        : null,
    };
  } catch (e: any) {
    results['3_manual_member_search'] = { error: e.message };
  }

  return NextResponse.json(results);
}
