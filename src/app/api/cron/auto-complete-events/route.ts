import { NextResponse } from 'next/server';
import { checkAndAutoTransitionPastEvents } from '@/app/events/actions';
import { verifyCronAuth } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron Job: Daily Event Auto-Completion
 * Triggered daily to transition past events to 'completed', record audit logs,
 * and dispatch attendee feedback surveys.
 *
 * Spec §4.3, §4.18, §10, Checklist 22.2 & 22.6
 */
export async function GET(req: Request) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const result = await checkAndAutoTransitionPastEvents();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to auto-complete past events' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job: 'auto-complete-events',
      timestamp: new Date().toISOString(),
      transitionedCount: result.transitionedCount,
      eventIds: result.eventIds,
    });
  } catch (error: any) {
    console.error('Cron error in auto-complete-events:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error executing event auto-complete job' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
