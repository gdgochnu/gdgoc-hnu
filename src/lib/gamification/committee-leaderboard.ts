import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentSeason } from '@/lib/gamification/points-engine';

/**
 * GDGoC HNU OS — Committee Leaderboard (§4.13)
 * Ranks committees by aggregate & average member engagement to celebrate team effort.
 */

export interface CommitteeLeaderboardEntry {
  rank: number;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  branch: 'tech' | 'non_tech';
  activeMemberCount: number;
  totalPoints: number;
  avgPointsPerMember: number;
  tasksCompleted: number;
  eventsOrganized: number;
  topContributor: {
    name: string;
    avatarUrl: string | null;
    points: number;
  } | null;
}

export interface CommitteeLeaderboardResult {
  season: string;
  totalCommittees: number;
  techCommittees: number;
  nonTechCommittees: number;
  rankings: CommitteeLeaderboardEntry[];
  topByAverage: CommitteeLeaderboardEntry[];
}

export async function getCommitteeLeaderboard(params: {
  branch?: 'tech' | 'non_tech' | 'all';
  season?: string;
} = {}): Promise<CommitteeLeaderboardResult> {
  const admin = createAdminClient();
  const season = params.season || getCurrentSeason();
  const branchFilter = params.branch || 'all';

  // 1. Fetch departments
  let deptQuery = admin
    .from('departments')
    .select('id, name, code, branch')
    .order('name');

  if (branchFilter !== 'all') {
    deptQuery = deptQuery.eq('branch', branchFilter);
  }

  const { data: departments, error: deptErr } = await deptQuery;
  if (deptErr || !departments) {
    console.error('[getCommitteeLeaderboard] deptErr:', deptErr);
    return {
      season,
      totalCommittees: 0,
      techCommittees: 0,
      nonTechCommittees: 0,
      rankings: [],
      topByAverage: [],
    };
  }

  // 2. Fetch all active members and their points/department
  const { data: members } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, department_id, overall_score')
    .eq('status', 'active');

  const membersByDept = new Map<string, any[]>();
  (members || []).forEach((m) => {
    if (m.department_id) {
      const list = membersByDept.get(m.department_id) || [];
      list.push(m);
      membersByDept.set(m.department_id, list);
    }
  });

  // 3. Fetch completed tasks count per department
  const { data: tasks } = await admin
    .from('tasks')
    .select('department_id')
    .eq('status', 'done');

  const tasksCountMap = new Map<string, number>();
  (tasks || []).forEach((t) => {
    if (t.department_id) {
      tasksCountMap.set(t.department_id, (tasksCountMap.get(t.department_id) || 0) + 1);
    }
  });

  // 4. Fetch events count per department
  const { data: events } = await admin
    .from('events')
    .select('department_id')
    .in('status', ['published', 'completed']);

  const eventsCountMap = new Map<string, number>();
  (events || []).forEach((ev) => {
    if (ev.department_id) {
      eventsCountMap.set(ev.department_id, (eventsCountMap.get(ev.department_id) || 0) + 1);
    }
  });

  // 5. Build committee entries
  const entries: CommitteeLeaderboardEntry[] = departments.map((dept) => {
    const deptMembers = membersByDept.get(dept.id) || [];
    const count = deptMembers.length;

    // Calculate total points
    const totalPoints = deptMembers.reduce(
      (sum, m) => sum + Number(m.overall_score || 0),
      0
    );

    const avgPoints = count > 0 ? Math.round(totalPoints / count) : 0;

    // Find top contributor in this committee
    let topContributor = null;
    if (deptMembers.length > 0) {
      const sorted = [...deptMembers].sort(
        (a, b) => Number(b.overall_score || 0) - Number(a.overall_score || 0)
      );
      topContributor = {
        name: sorted[0].full_name,
        avatarUrl: sorted[0].avatar_url,
        points: Number(sorted[0].overall_score || 0),
      };
    }

    return {
      rank: 0,
      departmentId: dept.id,
      departmentName: dept.name,
      departmentCode: dept.code,
      branch: dept.branch as 'tech' | 'non_tech',
      activeMemberCount: count,
      totalPoints,
      avgPointsPerMember: avgPoints,
      tasksCompleted: tasksCountMap.get(dept.id) || 0,
      eventsOrganized: eventsCountMap.get(dept.id) || 0,
      topContributor,
    };
  });

  // Sort by total points desc
  const rankedByTotal = [...entries].sort((a, b) => b.totalPoints - a.totalPoints);
  rankedByTotal.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  // Also prepare top by average points per member (to reward lean, high-performing teams)
  const rankedByAvg = [...entries]
    .filter((e) => e.activeMemberCount > 0)
    .sort((a, b) => b.avgPointsPerMember - a.avgPointsPerMember);

  const techCount = departments.filter((d) => d.branch === 'tech').length;
  const nonTechCount = departments.filter((d) => d.branch === 'non_tech').length;

  return {
    season,
    totalCommittees: departments.length,
    techCommittees: techCount,
    nonTechCommittees: nonTechCount,
    rankings: rankedByTotal,
    topByAverage: rankedByAvg,
  };
}
