import { NextResponse } from 'next/server';
import { getPublicChapterStats } from '@/lib/stats/chapter-stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  const steps: any[] = [];

  try {
    // 1. Fetch public stats
    const stats = await getPublicChapterStats();

    steps.push({
      step: '1. Get Public Chapter Stats Execution',
      passed: typeof stats === 'object' && stats !== null,
      stats,
    });

    // 2. Validate structure: counts and aggregates only
    const hasRequiredFields =
      typeof stats.memberCount === 'number' &&
      typeof stats.eventsHeld === 'number' &&
      typeof stats.totalAttendance === 'number' &&
      typeof stats.certificatesIssued === 'number' &&
      typeof stats.activeCommittees === 'number' &&
      typeof stats.standoutAchievement === 'object';

    steps.push({
      step: '2. Validate Aggregate Metrics Structure',
      passed: hasRequiredFields,
    });

    // 3. Confirm Zero PII in returned payload
    const serialized = JSON.stringify(stats).toLowerCase();
    const hasPII =
      serialized.includes('@') ||
      serialized.includes('phone') ||
      serialized.includes('national_id') ||
      serialized.includes('email');

    steps.push({
      step: '3. Zero PII Verification Guarantee',
      passed: !hasPII,
    });

    const allPassed = steps.every((s) => s.passed);

    return NextResponse.json({
      success: allPassed,
      results: steps,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        steps,
      },
      { status: 500 }
    );
  }
}
