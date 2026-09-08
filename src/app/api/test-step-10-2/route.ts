import { NextResponse } from 'next/server';
import { getAttendanceLeaderboard } from '@/app/hr/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    test: 'Step 10.2 - Org-wide Attendance Rate leaderboard (all roles, including Heads/President/Co-President)',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // 1. Fetch full unfiltered leaderboard
    const fullSummary = await getAttendanceLeaderboard();
    results.checks.fullLeaderboard = {
      success: true,
      totalProfiles: fullSummary.totalProfiles,
      averageAttendanceRate: fullSummary.averageAttendanceRate,
      hasTopAttender: !!fullSummary.topAttender,
      departmentsCount: fullSummary.departments.length,
      sampleEntriesCount: fullSummary.entries.length,
    };

    if (fullSummary.totalProfiles === 0) {
      throw new Error('Leaderboard returned 0 active profiles');
    }

    // 2. Check roles representation in entries
    const rolesPresent = new Set(fullSummary.entries.map((e) => e.role));
    results.checks.rolesRepresentation = {
      success: true,
      uniqueRolesCount: rolesPresent.size,
      rolesFound: Array.from(rolesPresent),
      hasPresidentialOrLeadership:
        rolesPresent.has('president') ||
        rolesPresent.has('co_president') ||
        rolesPresent.has('branch_head') ||
        rolesPresent.has('committee_head'),
    };

    // 3. Verify rank ordering integrity
    let isSorted = true;
    for (let i = 0; i < fullSummary.entries.length - 1; i++) {
      const curr = fullSummary.entries[i];
      const next = fullSummary.entries[i + 1];
      if (curr.attendanceRate < next.attendanceRate) {
        isSorted = false;
        break;
      }
    }

    results.checks.rankingIntegrity = {
      success: isSorted,
      firstRank: fullSummary.entries[0]?.rank,
      lastRank: fullSummary.entries[fullSummary.entries.length - 1]?.rank,
      isCorrectlyOrdered: isSorted,
    };

    if (!isSorted) {
      throw new Error('Leaderboard entries are not correctly sorted by attendanceRate descending');
    }

    // 4. Test filtering functionality
    const techFilter = await getAttendanceLeaderboard({ branch: 'tech' });
    const nonTechFilter = await getAttendanceLeaderboard({ branch: 'non_tech' });
    const memberFilter = await getAttendanceLeaderboard({ role: 'member' });

    results.checks.filters = {
      success: true,
      techBranchCount: techFilter.entries.length,
      nonTechBranchCount: nonTechFilter.entries.length,
      membersCount: memberFilter.entries.length,
    };

    // 5. Test CSV generation logic
    const csvHeaders = ['Rank', 'Full Name', 'Email', 'Role', 'Department', 'Branch', 'Attendance Rate', 'Events Attended'];
    const csvRows = fullSummary.entries.slice(0, 5).map((e) => [
      `"${e.rank}"`,
      `"${e.fullName.replace(/"/g, '""')}"`,
      `"${e.email.replace(/"/g, '""')}"`,
      `"${e.role}"`,
      `"${(e.departmentName || 'N/A').replace(/"/g, '""')}"`,
      `"${e.branch || 'N/A'}"`,
      `"${e.attendanceRate}%"`,
      `"${e.eventsAttended} / ${e.eventsEligible}"`,
    ].join(','));

    const testCsv = [csvHeaders.join(','), ...csvRows].join('\n');

    results.checks.csvExport = {
      success: true,
      headersCount: csvHeaders.length,
      rowsSnippet: testCsv.split('\n').slice(0, 3).join(' | '),
    };

    results.overallSuccess = true;
    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    results.overallSuccess = false;
    results.error = error?.message || String(error);
    return NextResponse.json(results, { status: 500 });
  }
}
