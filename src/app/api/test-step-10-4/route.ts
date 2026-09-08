import { NextResponse } from 'next/server';
import { computeMonthlyPerformanceReviews } from '@/app/hr/actions';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    test: 'Step 10.4 - Monthly performance_reviews computation job',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    const testPeriod = '2026-09';

    // 1. Run computation job
    const computation = await computeMonthlyPerformanceReviews(testPeriod, null, true);

    results.checks.computationJob = {
      success: true,
      periodMonth: computation.periodMonth,
      totalProfilesEvaluated: computation.totalProfilesEvaluated,
      reviewsCreatedOrUpdated: computation.reviewsCreatedOrUpdated,
      averageOverallScore: computation.averageOverallScore,
      topPerformersCount: computation.topPerformers.length,
      sampleTopPerformer: computation.topPerformers[0] || null,
    };

    if (computation.totalProfilesEvaluated === 0) {
      throw new Error('Zero profiles evaluated in performance review computation');
    }

    // 2. Query performance_reviews table in database to confirm persistence
    const admin = createAdminClient();
    const { data: persistedReviews, error: reviewsError } = await admin
      .from('performance_reviews')
      .select('*')
      .eq('period_month', testPeriod);

    results.checks.dbPersistence = {
      success: !reviewsError,
      dbError: reviewsError ? reviewsError.message : null,
      persistedRowsCount: persistedReviews?.length || 0,
      sampleReviewRow: persistedReviews && persistedReviews.length > 0 ? {
        profileId: persistedReviews[0].profile_id,
        taskCompletionPct: persistedReviews[0].task_completion_pct,
        deadlineAdherencePct: persistedReviews[0].deadline_adherence_pct,
        attendancePct: persistedReviews[0].attendance_pct,
        overallScore: persistedReviews[0].overall_score,
        hasNotes: !!persistedReviews[0].notes,
      } : null,
    };

    // 3. Check profiles cached score sync
    const { data: updatedProfiles } = await admin
      .from('profiles')
      .select('id, full_name_en, full_name_ar, overall_score, attendance_rate')
      .eq('status', 'active')
      .limit(3);

    results.checks.profilesCacheSync = {
      success: true,
      sampleProfiles: updatedProfiles?.map((p) => ({
        name: p.full_name_en || p.full_name_ar,
        overallScore: p.overall_score,
        attendanceRate: p.attendance_rate,
      })),
    };

    results.overallSuccess = true;
    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    results.overallSuccess = false;
    results.error = error?.message || String(error);
    return NextResponse.json(results, { status: 500 });
  }
}
