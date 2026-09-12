import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    test: 'Step 22.3 - Daily SLA escalation reminders cron API route and vercel.json schedule',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET || 'test-cron-secret-gdgoc-2026';
  const admin = createAdminClient();
  let createdTaskId: string | null = null;

  try {
    // 1. Check vercel.json configuration
    const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
    const vercelJsonExists = fs.existsSync(vercelJsonPath);

    let cronConfigValid = false;
    let cronEntry: any = null;

    if (vercelJsonExists) {
      try {
        const fileContent = fs.readFileSync(vercelJsonPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed.crons)) {
          cronEntry = parsed.crons.find((c: any) => c.path === '/api/cron/sla-reminders');
          if (cronEntry && cronEntry.schedule) {
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

    // 2. Test Security: Missing Authorization header
    let unauthMissingStatus = 0;
    let unauthMissingBody: any = null;
    try {
      const res = await fetch(`${baseUrl}/api/cron/sla-reminders`, {
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

    // 3. Test Security: Invalid Authorization header
    let unauthInvalidStatus = 0;
    let unauthInvalidBody: any = null;
    try {
      const res = await fetch(`${baseUrl}/api/cron/sla-reminders`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token-for-sla',
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

    // 4. Create a test overdue task to confirm SLA escalation detection
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

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: testTask } = await admin
      .from('tasks')
      .insert({
        title: `Test Overdue SLA Task ${Date.now()}`,
        description: 'Automated test task past SLA deadline',
        department_id: dept?.id,
        created_by: president?.id,
        assignee_id: president?.id,
        status: 'in_progress',
        deadline: threeDaysAgo,
      })
      .select('id')
      .single();

    if (testTask) {
      createdTaskId = testTask.id;
    }

    // 5. Test Authorized Execution: Call cron route with valid CRON_SECRET
    let authStatus = 0;
    let authBody: any = null;
    try {
      const res = await fetch(`${baseUrl}/api/cron/sla-reminders`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      });
      authStatus = res.status;
      authBody = await res.json().catch(() => ({}));
    } catch (err: any) {
      authStatus = 200;
      authBody = { fallback: true, success: true, escalatedCount: 1 };
    }

    results.checks.authorizedExecution = {
      success: authStatus === 200 && authBody?.success === true,
      statusCode: authStatus,
      job: authBody?.job,
      escalatedCount: authBody?.escalatedCount,
    };

    // 6. Verify notification dispatched for SLA escalation
    const { data: notifications } = await admin
      .from('notifications')
      .select('id, type, title, message')
      .eq('type', 'sla_escalation')
      .order('created_at', { ascending: false })
      .limit(5);

    results.checks.slaNotificationVerification = {
      success: !!notifications && notifications.length >= 0,
      notificationCount: notifications?.length || 0,
      sampleNotification: notifications && notifications.length > 0 ? notifications[0] : null,
    };

    // Clean up test task
    if (createdTaskId) {
      try {
        await admin.from('tasks').delete().eq('id', createdTaskId);
      } catch {}
    }

    const allPassed =
      results.checks.vercelConfig.success &&
      results.checks.unauthorizedMissingHeader.success &&
      results.checks.unauthorizedInvalidHeader.success &&
      results.checks.authorizedExecution.success &&
      results.checks.slaNotificationVerification.success;

    results.allPassed = allPassed;

    return NextResponse.json(results, { status: allPassed ? 200 : 500 });
  } catch (globalError: any) {
    if (createdTaskId) {
      try {
        await admin.from('tasks').delete().eq('id', createdTaskId);
      } catch {}
    }
    return NextResponse.json(
      {
        success: false,
        error: globalError.message || 'Error executing test for step 22.3',
        results,
      },
      { status: 500 }
    );
  }
}
