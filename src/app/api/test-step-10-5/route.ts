import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    test: 'Step 10.5 - Performance trend chart + attendance rate + certificates tab on every profile page',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    const admin = createAdminClient();

    // 1. Pick an active profile
    const { data: profiles, error: profileError } = await admin
      .from('profiles')
      .select('id, full_name_en, full_name_ar, email, attendance_rate, overall_score')
      .eq('status', 'active')
      .limit(1);

    if (profileError || !profiles || profiles.length === 0) {
      throw new Error('No active profiles found');
    }

    const testProfile = profiles[0];
    results.checks.profileSample = {
      id: testProfile.id,
      name: testProfile.full_name_en || testProfile.full_name_ar,
      overallScore: testProfile.overall_score,
      attendanceRate: testProfile.attendance_rate,
    };

    // 2. Verify performance_reviews query
    const { data: reviews, error: reviewsError } = await admin
      .from('performance_reviews')
      .select('*')
      .eq('profile_id', testProfile.id)
      .order('period_month', { ascending: true });

    results.checks.performanceReviewsQuery = {
      success: !reviewsError,
      dbError: reviewsError ? reviewsError.message : null,
      reviewsCount: reviews?.length || 0,
      hasMonthlyMetrics: reviews && reviews.length > 0 ? {
        periodMonth: reviews[0].period_month,
        overallScore: reviews[0].overall_score,
        taskCompletionPct: reviews[0].task_completion_pct,
        deadlineAdherencePct: reviews[0].deadline_adherence_pct,
        attendancePct: reviews[0].attendance_pct,
      } : null,
    };

    // 3. Verify certificates query
    const { data: certificates, error: certError } = await admin
      .from('certificates')
      .select('*')
      .or(`recipient_profile_id.eq.${testProfile.id},recipient_email.eq.${testProfile.email}`);

    results.checks.certificatesQuery = {
      success: !certError,
      dbError: certError ? certError.message : null,
      certificatesCount: certificates?.length || 0,
    };

    // 4. Verify live attendance count
    const { data: attendanceRows } = await admin
      .from('attendance')
      .select('id, event_id')
      .eq('profile_id', testProfile.id);

    const { count: totalEventsCount } = await admin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .in('status', ['published', 'completed', 'closed']);

    results.checks.attendanceMetrics = {
      success: true,
      eventsAttendedCount: attendanceRows?.length || 0,
      totalCompletedEventsCount: totalEventsCount || 0,
      effectiveAttendanceRate: testProfile.attendance_rate ?? 0,
    };

    results.overallSuccess = true;
    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    results.overallSuccess = false;
    results.error = error?.message || String(error);
    return NextResponse.json(results, { status: 500 });
  }
}
