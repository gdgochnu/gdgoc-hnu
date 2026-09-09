import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCommitteeHealthScorecards } from '@/app/command-center/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    step: '16.1 - Committee Health Scorecards',
    timestamp: new Date().toISOString(),
    tests: {},
    allPassed: false,
  };

  try {
    const admin = createAdminClient();

    // 1. Check departments table
    const { data: depts, error: deptError } = await admin
      .from('departments')
      .select('id, code, name, branch')
      .limit(10);

    results.tests.departmentsTable = {
      passed: !deptError && Array.isArray(depts),
      count: depts?.length || 0,
      error: deptError?.message || null,
    };

    // 2. Direct execution of getCommitteeHealthScorecards
    const scorecardsRes = await getCommitteeHealthScorecards({ bypassAuthForAdminTest: true });

    results.tests.getCommitteeHealthScorecards = {
      passed: scorecardsRes.success,
      summary: {
        totalCommittees: scorecardsRes.summary.totalCommittees,
        healthyCount: scorecardsRes.summary.healthyCount,
        needsAttentionCount: scorecardsRes.summary.needsAttentionCount,
        criticalCount: scorecardsRes.summary.criticalCount,
        avgHealthScore: scorecardsRes.summary.avgHealthScore,
      },
      sampleScorecards: scorecardsRes.summary.scorecards.slice(0, 3).map((s) => ({
        code: s.code,
        name: s.name,
        branch: s.branch,
        overallHealthScore: s.overallHealthScore,
        healthStatus: s.healthStatus,
        taskCompletionRate: s.taskCompletionRate,
        deadlineAdherenceRate: s.deadlineAdherenceRate,
        avgMemberAttendanceRate: s.avgMemberAttendanceRate,
        headAttendanceRate: s.headAttendanceRate,
        head: s.head ? { name: s.head.fullName, attendance: s.head.attendanceRate } : null,
        alerts: s.alerts,
      })),
      error: scorecardsRes.error || null,
    };

    // 3. Verify Scorecard Structure Integrity
    let structureValid = true;
    for (const card of scorecardsRes.summary.scorecards) {
      if (
        typeof card.departmentId !== 'string' ||
        typeof card.overallHealthScore !== 'number' ||
        card.overallHealthScore < 0 ||
        card.overallHealthScore > 100 ||
        !['healthy', 'needs_attention', 'critical'].includes(card.healthStatus) ||
        typeof card.taskCompletionRate !== 'number' ||
        typeof card.deadlineAdherenceRate !== 'number' ||
        typeof card.avgMemberAttendanceRate !== 'number' ||
        !Array.isArray(card.alerts)
      ) {
        structureValid = false;
        break;
      }
    }

    results.tests.scorecardStructureIntegrity = {
      passed: structureValid,
    };

    results.allPassed =
      results.tests.departmentsTable.passed &&
      results.tests.getCommitteeHealthScorecards.passed &&
      results.tests.scorecardStructureIntegrity.passed;

    return NextResponse.json(results, { status: results.allPassed ? 200 : 500 });
  } catch (err: any) {
    results.error = err.message || String(err);
    results.allPassed = false;
    return NextResponse.json(results, { status: 500 });
  }
}
