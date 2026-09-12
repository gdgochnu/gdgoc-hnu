import { NextResponse } from 'next/server';
import { computeMonthlyPerformanceReviews } from '@/app/hr/actions';
import { verifyCronAuth } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const periodMonth = body.periodMonth; // Optional 'YYYY-MM'

    const result = await computeMonthlyPerformanceReviews(periodMonth, null, true);

    return NextResponse.json({
      success: true,
      message: 'Monthly performance reviews computation completed successfully.',
      result,
    });
  } catch (error: any) {
    console.error('Job error in compute-performance-reviews:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to compute performance reviews' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const periodMonth = searchParams.get('periodMonth') || undefined;

    const result = await computeMonthlyPerformanceReviews(periodMonth, null, true);
    return NextResponse.json({
      success: true,
      job: 'computeMonthlyPerformanceReviews',
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error executing review computation job' },
      { status: 500 }
    );
  }
}
