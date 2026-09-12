import { NextResponse } from 'next/server';
import { escalatePastSlaReminders } from '@/app/command-center/actions';
import { verifyCronAuth } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron Job: Daily SLA Escalation Reminders
 * Triggered daily to scan for overdue tasks and stalled multi-stage approvals,
 * notifying assigned reviewers and Presidential leadership.
 *
 * Spec §4.2, §4.11, §10, Checklist 22.3 & 22.6
 */
export async function GET(req: Request) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const result = await escalatePastSlaReminders({ bypassAuthForAdminTest: true });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to dispatch SLA escalation reminders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job: 'sla-escalation-reminders',
      timestamp: new Date().toISOString(),
      escalatedCount: result.escalatedCount,
    });
  } catch (error: any) {
    console.error('Cron error in sla-reminders:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error executing SLA reminders job' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
