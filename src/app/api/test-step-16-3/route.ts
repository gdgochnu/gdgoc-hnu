import { NextResponse } from 'next/server';
import { getUpcomingLeadershipFeed } from '@/app/command-center/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    step: '16.3 - "Upcoming" Feed (Synced with Google Calendar)',
    timestamp: new Date().toISOString(),
    tests: {},
    allPassed: false,
  };

  try {
    // 1. Direct execution of getUpcomingLeadershipFeed
    const feedRes = await getUpcomingLeadershipFeed({ bypassAuthForAdminTest: true });

    results.tests.getUpcomingLeadershipFeed = {
      passed: feedRes.success,
      summary: {
        totalUpcomingCount: feedRes.summary.totalUpcomingCount,
        eventsCount: feedRes.summary.eventsCount,
        deadlinesCount: feedRes.summary.deadlinesCount,
        sharedCalendarLink: feedRes.summary.sharedCalendarLink,
        sharedCalendarName: feedRes.summary.sharedCalendarName,
      },
      sampleItems: feedRes.summary.items.slice(0, 5).map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        scheduledDate: item.scheduledDate,
        timeGroup: item.timeGroup,
        daysUntil: item.daysUntil,
        actionUrl: item.actionUrl,
        hasGoogleCalendarUrl: !!item.googleCalendarUrl && item.googleCalendarUrl.includes('calendar.google.com'),
      })),
      error: feedRes.error || null,
    };

    // 2. Validate Item Structure Integrity
    const validTypes = ['event', 'task_deadline'];
    const validTimeGroups = ['today', 'tomorrow', 'this_week', 'next_week', 'later'];

    let itemsValid = true;
    for (const item of feedRes.summary.items) {
      if (
        typeof item.id !== 'string' ||
        !validTypes.includes(item.type) ||
        typeof item.title !== 'string' ||
        typeof item.scheduledDate !== 'string' ||
        !validTimeGroups.includes(item.timeGroup) ||
        typeof item.daysUntil !== 'number' ||
        typeof item.actionUrl !== 'string' ||
        typeof item.googleCalendarUrl !== 'string' ||
        !item.googleCalendarUrl.includes('calendar.google.com')
      ) {
        itemsValid = false;
        break;
      }
    }

    results.tests.itemsStructureIntegrity = {
      passed: itemsValid,
      totalChecked: feedRes.summary.items.length,
    };

    results.allPassed =
      results.tests.getUpcomingLeadershipFeed.passed &&
      results.tests.itemsStructureIntegrity.passed;

    return NextResponse.json(results, { status: results.allPassed ? 200 : 500 });
  } catch (err: any) {
    results.error = err.message || String(err);
    results.allPassed = false;
    return NextResponse.json(results, { status: 500 });
  }
}
