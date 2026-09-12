import { NextResponse } from 'next/server';
import { refreshProfilesAttendanceRateCache } from '@/lib/attendance/cache-refresh';
import { verifyCronAuth } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron Job: Daily profiles.attendance_rate cache-refresh job
 * Triggered daily to ensure all members have accurate, up-to-date attendance rates
 * reflected across member profiles, leaderboards, and certificate eligibility.
 *
 * Spec §3.2, §4.4, §10, Checklist 22.5 & 22.6
 */
export async function GET(req: Request) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const result = await refreshProfilesAttendanceRateCache();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to refresh attendance rates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job: 'refresh-attendance-rates',
      timestamp: new Date().toISOString(),
      totalProfilesProcessed: result.totalProfilesProcessed,
      updatedProfilesCount: result.updatedProfilesCount,
      totalCompletedEvents: result.totalCompletedEvents,
      averageAttendanceRate: result.averageAttendanceRate,
    });
  } catch (error: any) {
    console.error('Cron error in refresh-attendance-rates:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error executing attendance rate cache refresh job' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
