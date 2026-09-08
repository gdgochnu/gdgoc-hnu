import { NextResponse } from 'next/server';
import { computeMonthlyPerformanceReviews } from '@/app/hr/actions';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Authenticate if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow internal local or test invocation
      const host = req.headers.get('host') || '';
      if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
        return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
      }
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

export async function GET() {
  // Allow simple GET check or manual trigger for testing
  try {
    const result = await computeMonthlyPerformanceReviews(undefined, null, true);
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
