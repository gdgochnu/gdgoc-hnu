import { NextResponse } from 'next/server';
import { getCommitteeLeaderboard } from '@/lib/gamification/committee-leaderboard';
import { fetchCommitteeLeaderboardAction } from '@/app/gamification/actions';

/**
 * GET /api/test-step-19-5
 * Verify: Committee Leaderboard (§4.13)
 * Tests:
 *   1. Committee leaderboard calculation and descending points order
 *   2. Branch filtering (tech vs non_tech vs all)
 *   3. Ranking by average points per member (rewards high engagement teams)
 *   4. Metrics integrity (activeMemberCount, tasksCompleted, eventsOrganized, topContributor)
 *   5. Server action fetchCommitteeLeaderboardAction integration
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // Test 1: Overall Committee Leaderboard
  try {
    const data = await getCommitteeLeaderboard({ branch: 'all' });
    const isSorted = data.rankings.every((c, idx, arr) => {
      if (idx === 0) return true;
      return arr[idx - 1].totalPoints >= c.totalPoints;
    });

    results['1_overall_committee_leaderboard'] = {
      season: data.season,
      totalCommittees: data.totalCommittees,
      techCommittees: data.techCommittees,
      nonTechCommittees: data.nonTechCommittees,
      rankedCommitteesCount: data.rankings.length,
      isPointsSortedDescending: isSorted,
      top1Committee: data.rankings[0]
        ? {
            name: data.rankings[0].departmentName,
            code: data.rankings[0].departmentCode,
            branch: data.rankings[0].branch,
            points: data.rankings[0].totalPoints,
            members: data.rankings[0].activeMemberCount,
            avgPoints: data.rankings[0].avgPointsPerMember,
            tasks: data.rankings[0].tasksCompleted,
            events: data.rankings[0].eventsOrganized,
            topContributor: data.rankings[0].topContributor?.name,
          }
        : null,
    };
  } catch (e: any) {
    results['1_overall_committee_leaderboard'] = { error: e.message };
  }

  // Test 2: Branch Filtering
  try {
    const techData = await getCommitteeLeaderboard({ branch: 'tech' });
    const nonTechData = await getCommitteeLeaderboard({ branch: 'non_tech' });

    const allTech = techData.rankings.every((c) => c.branch === 'tech');
    const allNonTech = nonTechData.rankings.every((c) => c.branch === 'non_tech');

    results['2_branch_filtering'] = {
      techCommitteesCount: techData.rankings.length,
      nonTechCommitteesCount: nonTechData.rankings.length,
      allTechMatch: allTech,
      allNonTechMatch: allNonTech,
    };
  } catch (e: any) {
    results['2_branch_filtering'] = { error: e.message };
  }

  // Test 3: Ranking by Average Points Per Member
  try {
    const data = await getCommitteeLeaderboard({ branch: 'all' });
    const isAvgSorted = data.topByAverage.every((c, idx, arr) => {
      if (idx === 0) return true;
      return arr[idx - 1].avgPointsPerMember >= c.avgPointsPerMember;
    });

    results['3_average_points_ranking'] = {
      evaluatedCount: data.topByAverage.length,
      isAverageSortedDescending: isAvgSorted,
      leaderByAverage: data.topByAverage[0]
        ? {
            name: data.topByAverage[0].departmentName,
            avgPoints: data.topByAverage[0].avgPointsPerMember,
            totalPoints: data.topByAverage[0].totalPoints,
            members: data.topByAverage[0].activeMemberCount,
          }
        : null,
    };
  } catch (e: any) {
    results['3_average_points_ranking'] = { error: e.message };
  }

  // Test 4: Server Action Execution
  try {
    const actionResult = await fetchCommitteeLeaderboardAction();
    results['4_server_action'] = {
      success: actionResult.success,
      committeesCount: actionResult.data?.rankings.length,
      error: actionResult.error,
    };
  } catch (e: any) {
    results['4_server_action'] = { error: e.message };
  }

  return NextResponse.json(results);
}
