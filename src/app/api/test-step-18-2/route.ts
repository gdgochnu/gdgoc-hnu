import { NextResponse } from 'next/server';
import { generateEventAnalyticsReport } from '@/app/reports/actions';

/**
 * GET /api/test-step-18-2
 * Verify: Event performance + attendance analytics report generator.
 * Tests: generateEventAnalyticsReport for a 6-month window on all committees.
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // Test: last 6 months, all committees
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  try {
    const result = await generateEventAnalyticsReport({
      departmentId: 'all',
      dateFrom: sixMonthsAgo.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0],
    });

    results['1_eventAnalytics_6months_all'] = {
      success: result.success,
      error: result.error,
      summary: result.summary
        ? {
            totalEvents: result.summary.totalEvents,
            totalRegistrations: result.summary.totalRegistrations,
            totalAttendees: result.summary.totalAttendees,
            overallAttendanceRate: `${result.summary.overallAttendanceRate}%`,
            avgFeedbackScore: result.summary.avgFeedbackScore,
            eventsOverBudget: result.summary.eventsOverBudget,
            byStatus: result.summary.byStatus,
            byDepartment: result.summary.byDepartment.map((d) => ({
              code: d.departmentCode,
              events: d.eventCount,
              attendance: `${d.avgAttendanceRate}%`,
              feedback: d.avgFeedbackScore,
            })),
            topByAttendance: result.summary.topByAttendance.map((e) => ({
              title: e.title,
              rate: `${e.attendanceRate}%`,
              tier: e.performanceTier,
              score: e.performanceScore,
            })),
            topByFeedback: result.summary.topByFeedback.map((e) => ({
              title: e.title,
              rating: e.avgFeedbackScore,
              feedbackCount: e.feedbackCount,
            })),
            overBudgetEvents: result.summary.overBudgetEvents.map((e) => ({
              title: e.title,
              overBy: `EGP ${e.overBudgetAmount}`,
            })),
          }
        : null,
    };
  } catch (e: any) {
    results['1_eventAnalytics_6months_all'] = { error: e.message };
  }

  // Test 2: current month only
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  try {
    const result2 = await generateEventAnalyticsReport({
      departmentId: 'all',
      dateFrom: firstOfMonth,
      dateTo: today.toISOString().split('T')[0],
    });
    results['2_eventAnalytics_currentMonth'] = {
      success: result2.success,
      totalEvents: result2.summary?.totalEvents ?? 0,
      overallAttendanceRate: `${result2.summary?.overallAttendanceRate ?? 0}%`,
      error: result2.error,
    };
  } catch (e: any) {
    results['2_eventAnalytics_currentMonth'] = { error: e.message };
  }

  return NextResponse.json({
    step: '18.2',
    description: 'Event Performance + Attendance Analytics Report',
    timestamp: new Date().toISOString(),
    results,
  });
}
