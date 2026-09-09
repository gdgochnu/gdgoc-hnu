import { NextResponse } from 'next/server';
import { generateCommitteeReport, getAccessibleDepartments } from '@/app/reports/actions';

/**
 * GET /api/test-step-18-1
 * Verify: Committee report generator works end-to-end.
 * Tests: getAccessibleDepartments + generateCommitteeReport for weekly & monthly periods.
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // Test 1: fetch departments
  try {
    const depts = await getAccessibleDepartments();
    results['1_getAccessibleDepartments'] = {
      success: depts.success,
      count: depts.departments.length,
      departments: depts.departments.map((d) => `${d.name} (${d.code})`),
      error: depts.error,
    };
  } catch (e: any) {
    results['1_getAccessibleDepartments'] = { error: e.message };
  }

  // Test 2: generate weekly report for 'all'
  try {
    const weeklyResult = await generateCommitteeReport({
      departmentId: 'all',
      period: 'weekly',
    });
    results['2_weeklyReport_all'] = {
      success: weeklyResult.success,
      reportsGenerated: weeklyResult.reports.length,
      error: weeklyResult.error,
      sample: weeklyResult.reports[0]
        ? {
            department: weeklyResult.reports[0].departmentName,
            period: weeklyResult.reports[0].period.label,
            healthScore: weeklyResult.reports[0].overallHealthScore,
            healthStatus: weeklyResult.reports[0].healthStatus,
            tasks: {
              total: weeklyResult.reports[0].tasks.totalCreated,
              completed: weeklyResult.reports[0].tasks.completed,
              completionRate: `${weeklyResult.reports[0].tasks.completionRate}%`,
            },
            attendance: {
              events: weeklyResult.reports[0].attendance.totalEvents,
              avgRate: `${weeklyResult.reports[0].attendance.avgAttendanceRate}%`,
            },
            members: {
              active: weeklyResult.reports[0].members.totalActiveMembers,
              new: weeklyResult.reports[0].members.newMembers,
              inactive: weeklyResult.reports[0].members.inactiveMembers,
            },
            events: weeklyResult.reports[0].events.length,
            highlights: weeklyResult.reports[0].highlights,
            alerts: weeklyResult.reports[0].alerts,
          }
        : null,
    };
  } catch (e: any) {
    results['2_weeklyReport_all'] = { error: e.message };
  }

  // Test 3: generate monthly report for 'all'
  try {
    const monthlyResult = await generateCommitteeReport({
      departmentId: 'all',
      period: 'monthly',
    });
    results['3_monthlyReport_all'] = {
      success: monthlyResult.success,
      reportsGenerated: monthlyResult.reports.length,
      error: monthlyResult.error,
      periods: monthlyResult.reports.map((r) => ({
        dept: r.departmentCode,
        period: r.period.label,
        score: r.overallHealthScore,
        status: r.healthStatus,
      })),
    };
  } catch (e: any) {
    results['3_monthlyReport_all'] = { error: e.message };
  }

  return NextResponse.json({
    step: '18.1',
    description: 'Weekly/Monthly Committee Report Generator',
    timestamp: new Date().toISOString(),
    results,
  });
}
