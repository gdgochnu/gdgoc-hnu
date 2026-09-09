import { createAdminClient } from '@/lib/supabase/admin';

export interface PublicChapterStats {
  memberCount: number;
  eventsHeld: number;
  totalAttendance: number;
  certificatesIssued: number;
  activeCommittees: number;
  standoutAchievement: {
    badgeName: string;
    timesEarned: number;
  };
  generatedAt: string;
}

/**
 * Fetch public chapter stats (Counts and aggregates only, zero PII — spec §4.21)
 */
export async function getPublicChapterStats(): Promise<PublicChapterStats> {
  const admin = createAdminClient();

  // 1. Try calling the narrow public RPC
  try {
    const { data: rpcData, error: rpcErr } = await admin.rpc('get_public_chapter_stats');
    if (!rpcErr && rpcData && typeof rpcData === 'object') {
      return rpcData as PublicChapterStats;
    }
  } catch (err) {
    // Fall back to direct aggregate query below
  }

  // 2. Direct aggregate-only queries (Zero PII extracted)
  const [
    { count: memberCount },
    { count: eventsHeld },
    { count: totalAttendance },
    { count: certificatesIssued },
    { count: activeCommittees },
    { data: topBadges },
  ] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('events').select('id', { count: 'exact', head: true }).in('status', ['published', 'completed']),
    admin.from('attendance').select('id', { count: 'exact', head: true }).eq('status', 'present'),
    admin.from('certificates').select('id', { count: 'exact', head: true }),
    admin.from('departments').select('id', { count: 'exact', head: true }),
    admin
      .from('member_badges')
      .select('badge_id, badges(name)')
      .limit(100),
  ]);

  // Compute top badge if any
  let standoutBadge = 'Chapter Pioneer';
  let standoutCount = 0;

  if (topBadges && topBadges.length > 0) {
    const badgeFreq: Record<string, number> = {};
    for (const b of topBadges as any[]) {
      const name = b.badges?.name || 'Chapter Badge';
      badgeFreq[name] = (badgeFreq[name] || 0) + 1;
    }
    const sorted = Object.entries(badgeFreq).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      standoutBadge = sorted[0][0];
      standoutCount = sorted[0][1];
    }
  }

  return {
    memberCount: memberCount || 0,
    eventsHeld: eventsHeld || 0,
    totalAttendance: totalAttendance || 0,
    certificatesIssued: certificatesIssued || 0,
    activeCommittees: activeCommittees || 0,
    standoutAchievement: {
      badgeName: standoutBadge,
      timesEarned: standoutCount,
    },
    generatedAt: new Date().toISOString(),
  };
}
