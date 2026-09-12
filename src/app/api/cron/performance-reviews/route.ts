import { NextResponse } from 'next/server';
import { computeMonthlyPerformanceReviews } from '@/app/hr/actions';
import { verifyCronAuth } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron Job: Monthly Performance Reviews Computation
 * Triggered automatically on the 1st of every month at 00:00 UTC ("0 0 1 * *")
 *
 * Spec §4.2, §4.3, §10, Checklist 22.1 & 22.6
 */
export async function GET(req: Request) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetPeriod = searchParams.get('periodMonth') || undefined;

    const result = await computeMonthlyPerformanceReviews(targetPeriod, null, true);

    return NextResponse.json({
      success: true,
      job: 'monthly-performance-reviews',
      timestamp: new Date().toISOString(),
      periodMonth: result.periodMonth,
      totalProfilesEvaluated: result.totalProfilesEvaluated,
      reviewsCreatedOrUpdated: result.reviewsCreatedOrUpdated,
      averageOverallScore: result.averageOverallScore,
      topPerformersCount: result.topPerformers?.length || 0,
    });
  } catch (error: any) {
    console.error('Cron job error in monthly performance-reviews:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to compute performance reviews' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetPeriod = body?.periodMonth || undefined;

    const result = await computeMonthlyPerformanceReviews(targetPeriod, null, true);

    return NextResponse.json({
      success: true,
      job: 'monthly-performance-reviews',
      timestamp: new Date().toISOString(),
      periodMonth: result.periodMonth,
      totalProfilesEvaluated: result.totalProfilesEvaluated,
      reviewsCreatedOrUpdated: result.reviewsCreatedOrUpdated,
      averageOverallScore: result.averageOverallScore,
      topPerformersCount: result.topPerformers?.length || 0,
    });
  } catch (error: any) {
    console.error('Cron job error in monthly performance-reviews (POST):', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to compute performance reviews' },
      { status: 500 }
    );
  }
}
