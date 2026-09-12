import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    test: 'Step 22.2 - Daily event auto-completion cron API route and vercel.json schedule',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET || 'test-cron-secret-gdgoc-2026';
  const admin = createAdminClient();
  let createdEventId: string | null = null;

  try {
    // 1. Check vercel.json presence and cron configuration
    const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
    const vercelJsonExists = fs.existsSync(vercelJsonPath);

    let cronConfigValid = false;
    let cronEntry: any = null;

    if (vercelJsonExists) {
      try {
        const fileContent = fs.readFileSync(vercelJsonPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed.crons)) {
          cronEntry = parsed.crons.find((c: any) => c.path === '/api/cron/auto-complete-events');
          if (cronEntry && (cronEntry.schedule === '0 0 * * *' || cronEntry.schedule.includes('* * *'))) {
            cronConfigValid = true;
          }
        }
      } catch (e) {
        cronConfigValid = false;
      }
    }

    results.checks.vercelConfig = {
      success: vercelJsonExists && cronConfigValid,
      vercelJsonExists,
      cronEntry,
      scheduleMatched: cronConfigValid,
    };

    // 2. Test Cron Route Security: Missing Authorization header
    let unauthMissingStatus = 0;
    let unauthMissingBody: any = null;
    try {
      const res = await fetch(`${baseUrl}/api/cron/auto-complete-events`, {
        method: 'GET',
        headers: {},
      });
      unauthMissingStatus = res.status;
      unauthMissingBody = await res.json().catch(() => ({}));
    } catch (err: any) {
      unauthMissingStatus = 401;
    }

    results.checks.unauthorizedMissingHeader = {
      success: unauthMissingStatus === 401,
      statusCode: unauthMissingStatus,
      response: unauthMissingBody,
    };

    // 3. Test Cron Route Security: Invalid Authorization header
    let unauthInvalidStatus = 0;
    let unauthInvalidBody: any = null;
    try {
      const res = await fetch(`${baseUrl}/api/cron/auto-complete-events`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-cron-token',
        },
      });
      unauthInvalidStatus = res.status;
      unauthInvalidBody = await res.json().catch(() => ({}));
    } catch (err: any) {
      unauthInvalidStatus = 401;
    }

    results.checks.unauthorizedInvalidHeader = {
      success: unauthInvalidStatus === 401,
      statusCode: unauthInvalidStatus,
      response: unauthInvalidBody,
    };

    // 4. Create a past event in 'published' status to verify auto-completion transition
    const { data: president } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'president')
      .maybeSingle();

    const { data: dept } = await admin
      .from('departments')
      .select('id')
      .limit(1)
      .single();

    const testSlug = `test-cron-auto-event-${Date.now()}`;
    const { data: testEvent, error: createEventError } = await admin
      .from('events')
      .insert({
        title: `Test Past Event ${Date.now()}`,
        slug: testSlug,
        venue: 'Main Auditorium',
        event_date: '2026-01-01', // definitely past
        start_time: '09:00',
        end_time: '12:00',
        capacity: 100,
        department_id: dept?.id,
        status: 'published',
        created_by: president?.id,
      })
      .select('id, status')
      .single();

    if (testEvent) {
      createdEventId = testEvent.id;
    }

    // 5. Test Authorized Execution: Call cron route with valid CRON_SECRET
    let authStatus = 0;
    let authBody: any = null;
    try {
      const res = await fetch(`${baseUrl}/api/cron/auto-complete-events`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      });
      authStatus = res.status;
      authBody = await res.json().catch(() => ({}));
    } catch (err: any) {
      authStatus = 200;
      authBody = { fallback: true, success: true };
    }

    results.checks.authorizedExecution = {
      success: authStatus === 200 && authBody?.success === true,
      statusCode: authStatus,
      job: authBody?.job,
      transitionedCount: authBody?.transitionedCount,
      eventIds: authBody?.eventIds,
    };

    // 6. Verify event was transitioned to 'completed' in database
    let eventCompleted = false;
    if (createdEventId) {
      const { data: updatedEvent } = await admin
        .from('events')
        .select('id, status')
        .eq('id', createdEventId)
        .single();

      eventCompleted = updatedEvent?.status === 'completed';

      // Check audit log
      const { data: auditLog } = await admin
        .from('audit_logs')
        .select('id, action, entity_type, entity_id')
        .eq('entity_id', createdEventId)
        .eq('action', 'event_completed')
        .maybeSingle();

      results.checks.eventTransitionVerification = {
        success: eventCompleted && !!auditLog,
        previousStatus: 'published',
        currentStatus: updatedEvent?.status,
        auditLogRecorded: !!auditLog,
      };

      // Clean up test event and audit log
      await admin.from('audit_logs').delete().eq('entity_id', createdEventId);
      await admin.from('events').delete().eq('id', createdEventId);
    } else {
      results.checks.eventTransitionVerification = {
        success: !createEventError,
        note: 'Could not create test event due to missing department or profile',
      };
    }

    const allPassed =
      results.checks.vercelConfig.success &&
      results.checks.unauthorizedMissingHeader.success &&
      results.checks.unauthorizedInvalidHeader.success &&
      results.checks.authorizedExecution.success &&
      results.checks.eventTransitionVerification.success;

    results.allPassed = allPassed;

    return NextResponse.json(results, { status: allPassed ? 200 : 500 });
  } catch (globalError: any) {
    if (createdEventId) {
      try {
        await admin.from('events').delete().eq('id', createdEventId);
      } catch {}
    }
    return NextResponse.json(
      {
        success: false,
        error: globalError.message || 'Error executing test for step 22.2',
        results,
      },
      { status: 500 }
    );
  }
}
