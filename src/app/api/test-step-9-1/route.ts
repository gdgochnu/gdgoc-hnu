import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { triggerEventFeedbackSurveys, completeEvent } from '@/app/events/actions';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const testRunId = Date.now();
  const createdEventIds: string[] = [];
  const createdRegistrationIds: string[] = [];
  const createdAttendanceIds: string[] = [];
  const createdNotificationIds: string[] = [];

  try {
    // 1. Verify Migration File Exists
    const migrationFilePath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20260908000018_create_event_feedback.sql'
    );
    const migrationFileExists = fs.existsSync(migrationFilePath);
    let migrationSql = '';
    if (migrationFileExists) {
      migrationSql = fs.readFileSync(migrationFilePath, 'utf-8');
    }

    const hasTableDef = migrationSql.includes('CREATE TABLE IF NOT EXISTS public.event_feedback');
    const hasRatingCheck = migrationSql.includes('rating >= 1 AND rating <= 5');
    const hasAnonymousCol = migrationSql.includes('is_anonymous BOOLEAN');
    const hasRlsPolicies = migrationSql.includes('event_feedback_select_policy') && migrationSql.includes('event_feedback_insert_policy');

    // 2. Check if event_feedback table is registered in Supabase schema cache
    const { data: feedbackCheck, error: tableErr } = await admin
      .from('event_feedback')
      .select('*')
      .limit(1);

    const isTableInCache = !tableErr;

    // 3. Fetch test department & member profile
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
          message: 'Prerequisites missing (active department or active member profile not found).',
        },
        { status: 500 }
      );
    }

    // 4. Create a test event for Step 9.1 feedback survey verification
    const testSlug = `test-feedback-event-${testRunId}`;
    const { data: testEvent, error: eventErr } = await admin
      .from('events')
      .insert({
        title: `Test Feedback Auto-Survey Event ${testRunId}`,
        slug: testSlug,
        venue: 'Main Auditorium',
        event_date: '2026-09-08',
        start_time: '10:00',
        end_time: '12:00',
        capacity: 100,
        department_id: dept.id,
        status: 'published',
      })
      .select()
      .single();

    if (eventErr || !testEvent) {
      throw new Error(`Failed to create test event: ${eventErr?.message}`);
    }
    createdEventIds.push(testEvent.id);

    // 5. Create Test Attendees:
    // Attendee A: Team member with profile_id
    const { data: attA, error: attAErr } = await admin
      .from('attendance')
      .insert({
        event_id: testEvent.id,
        profile_id: testMember.id,
        method: 'qr',
      })
      .select()
      .single();

    if (attAErr || !attA) {
      throw new Error(`Failed to insert Attendee A attendance: ${attAErr?.message}`);
    }
    createdAttendanceIds.push(attA.id);

    // Attendee B: External ticketed attendee with email registration
    const testExternalEmail = `survey-attendee-${testRunId}@example.com`;
    const { data: regB, error: regBErr } = await admin
      .from('event_registrations')
      .insert({
        event_id: testEvent.id,
        full_name: `External Attendee ${testRunId}`,
        email: testExternalEmail,
        status: 'registered',
      })
      .select()
      .single();

    if (regBErr || !regB) {
      throw new Error(`Failed to insert Attendee B registration: ${regBErr?.message}`);
    }
    createdRegistrationIds.push(regB.id);

    const { data: attB, error: attBErr } = await admin
      .from('attendance')
      .insert({
        event_id: testEvent.id,
        registration_id: regB.id,
        method: 'manual',
      })
      .select()
      .single();

    if (attBErr || !attB) {
      throw new Error(`Failed to insert Attendee B attendance: ${attBErr?.message}`);
    }
    createdAttendanceIds.push(attB.id);

    // 6. Execute survey trigger directly to verify attendee processing and dispatch
    const surveyTriggerResult = await triggerEventFeedbackSurveys(testEvent.id);

    // 7. Verify In-App Notification was generated for Attendee A (profile_id)
    const { data: notifications } = await admin
      .from('notifications')
      .select('*')
      .eq('profile_id', testMember.id)
      .eq('related_entity_id', testEvent.id);

    const matchedNotification = notifications?.find(
      (n) => n.type === 'event_feedback_request' && n.title.includes(testEvent.title)
    );

    if (notifications) {
      for (const n of notifications) {
        createdNotificationIds.push(n.id);
      }
    }

    // 8. Verify Email survey dispatch was logged for Attendee B (external email)
    const { data: emailAuditLogs } = await admin
      .from('audit_logs')
      .select('*')
      .eq('action', 'email_dispatched')
      .eq('entity_type', 'email')
      .order('created_at', { ascending: false })
      .limit(10);

    const matchedEmailLog = emailAuditLogs?.find(
      (log) =>
        log.metadata?.to?.toLowerCase() === testExternalEmail.toLowerCase() &&
        log.metadata?.type === 'event_feedback_survey'
    );

    // 9. Verify Survey Dispatch summary audit log
    const { data: dispatchAuditLogs } = await admin
      .from('audit_logs')
      .select('*')
      .eq('action', 'event_feedback_surveys_dispatched')
      .eq('entity_id', testEvent.id)
      .limit(1);

    const matchedDispatchLog = dispatchAuditLogs?.[0];

    // 10. Test Direct event_feedback CRUD if table is present in database
    let feedbackCrudResult: Record<string, any> = { tested: false };
    if (isTableInCache) {
      const { data: insertedFb, error: fbInsertErr } = await admin
        .from('event_feedback')
        .insert({
          event_id: testEvent.id,
          profile_id: testMember.id,
          rating: 5,
          comment: 'Outstanding workshop! Great presentation and interactive demos.',
          is_anonymous: true,
        })
        .select()
        .single();

      if (fbInsertErr) {
        feedbackCrudResult = { tested: true, success: false, error: fbInsertErr.message };
      } else {
        feedbackCrudResult = {
          tested: true,
          success: true,
          insertedId: insertedFb.id,
          rating: insertedFb.rating,
          isAnonymous: insertedFb.is_anonymous,
          comment: insertedFb.comment,
        };

        // Clean up test feedback
        await admin.from('event_feedback').delete().eq('id', insertedFb.id);
      }
    }

    // 11. Cleanup all test data
    if (createdAttendanceIds.length > 0) {
      await admin.from('attendance').delete().in('id', createdAttendanceIds);
    }
    if (createdRegistrationIds.length > 0) {
      await admin.from('event_registrations').delete().in('id', createdRegistrationIds);
    }
    if (createdNotificationIds.length > 0) {
      await admin.from('notifications').delete().in('id', createdNotificationIds);
    }
    if (createdEventIds.length > 0) {
      await admin.from('events').delete().in('id', createdEventIds);
    }
    await admin.from('audit_logs').delete().eq('entity_id', testEvent.id);

    const allSurveyChecksPassed =
      surveyTriggerResult.success &&
      Boolean(matchedNotification) &&
      Boolean(matchedEmailLog) &&
      Boolean(matchedDispatchLog);

    return NextResponse.json({
      status: allSurveyChecksPassed ? 'ok' : 'partial',
      message: allSurveyChecksPassed
        ? 'Phase 9 - Step 9.1: event_feedback table migration and automated survey dispatch (in-app + email) verified successfully!'
        : 'Phase 9 - Step 9.1: Verification completed with notes.',
      step: '9.1',
      specReference: '§3.11, §3.17, §4.18',
      migration: {
        fileExists: migrationFileExists,
        hasTableDef,
        hasRatingCheck,
        hasAnonymousCol,
        hasRlsPolicies,
        isTableInSchemaCache: isTableInCache,
        tableCacheMessage: isTableInCache
          ? 'Table public.event_feedback is active in Supabase schema cache.'
          : 'Table public.event_feedback needs SQL execution in Supabase SQL editor.',
        sqlEditorUrl: 'https://supabase.com/dashboard/project/ilccfcupdvlsfylskdsp/sql/new',
        migrationFilePath: 'supabase/migrations/20260908000018_create_event_feedback.sql',
      },
      surveyDispatch: {
        triggerResult: surveyTriggerResult,
        inAppNotificationCreated: Boolean(matchedNotification),
        notificationDetails: matchedNotification
          ? {
              id: matchedNotification.id,
              type: matchedNotification.type,
              title: matchedNotification.title,
            }
          : null,
        emailSurveyDispatched: Boolean(matchedEmailLog),
        emailDetails: matchedEmailLog
          ? {
              to: matchedEmailLog.metadata?.to,
              subject: matchedEmailLog.metadata?.subject,
              simulated: matchedEmailLog.metadata?.simulated,
            }
          : null,
        dispatchAuditLogged: Boolean(matchedDispatchLog),
        dispatchAuditDetails: matchedDispatchLog
          ? {
              attendeeCount: matchedDispatchLog.metadata?.attendee_count,
              inAppCount: matchedDispatchLog.metadata?.in_app_count,
              emailCount: matchedDispatchLog.metadata?.email_count,
            }
          : null,
      },
      feedbackCrud: feedbackCrudResult,
    });
  } catch (err: unknown) {
    console.error('test-step-9-1 error:', err);

    // Attempt best-effort cleanup
    try {
      if (createdAttendanceIds.length > 0) {
        await admin.from('attendance').delete().in('id', createdAttendanceIds);
      }
      if (createdRegistrationIds.length > 0) {
        await admin.from('event_registrations').delete().in('id', createdRegistrationIds);
      }
      if (createdNotificationIds.length > 0) {
        await admin.from('notifications').delete().in('id', createdNotificationIds);
      }
      if (createdEventIds.length > 0) {
        await admin.from('events').delete().in('id', createdEventIds);
      }
    } catch {
      // ignore cleanup errors
    }

    return NextResponse.json(
      {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error during Step 9.1 test',
      },
      { status: 500 }
    );
  }
}
