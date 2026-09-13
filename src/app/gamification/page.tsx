import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getSeasonalLeaderboard,
  getAllTimeLeaderboard,
} from '@/lib/gamification/leaderboard';
import { getCommitteeLeaderboard } from '@/lib/gamification/committee-leaderboard';
import { getBadgeCatalog, getMemberBadges } from '@/lib/gamification/badges-engine';
import { getPointRules } from '@/lib/gamification/points-engine';
import { getRecognitionWallData } from '@/lib/gamification/recognition-engine';
import { calculateMemberStreaks } from '@/lib/gamification/levels-streaks';
import { GamificationClient } from './GamificationClient';
import { GamificationSkeleton } from '@/components/skeletons/GamificationSkeleton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gamification & Recognition — GDGoC HNU OS',
  description: 'Chapter seasonal leaderboard, committee standings, member of the month, and transparent point rules.',
};

let gamificationMetadataCache: {
  expiresAt: number;
  badgeCatalog: any;
  pointRules: any;
  departments: any[];
  members: any[];
} | null = null;

const METADATA_CACHE_TTL = 60 * 1000; // 60 seconds

async function GamificationDataLoader({
  currentUserId,
  userRole,
  initialTab,
}: {
  currentUserId: string;
  userRole: string;
  initialTab: any;
}) {
  const admin = createAdminClient();

  // Parallel fetch: user data + leaderboard data + metadata (with cache)
  const now = Date.now();
  const useMetaCache = gamificationMetadataCache && gamificationMetadataCache.expiresAt > now;

  const [
    seasonalLeaderboard,
    allTimeLeaderboard,
    committeeLeaderboard,
    recognitionData,
    myEarnedBadges,
    myStreaks,
    { data: myProfile },
    metaResult,
  ] = await Promise.all([
    getSeasonalLeaderboard({ currentUserId }),
    getAllTimeLeaderboard({ currentUserId }),
    getCommitteeLeaderboard(),
    getRecognitionWallData(),
    getMemberBadges(currentUserId),
    calculateMemberStreaks(currentUserId),
    admin.from('profiles').select('overall_score').eq('id', currentUserId).maybeSingle(),
    useMetaCache
      ? Promise.resolve(null)
      : Promise.all([
          getBadgeCatalog(),
          getPointRules(true),
          admin.from('departments').select('id, name, code').order('name'),
          admin.from('profiles').select('id, full_name, role').eq('status', 'active').order('full_name'),
        ]),
  ]);

  let badgeCatalog: any;
  let pointRules: any;
  let departments: any[];
  let members: any[];

  if (useMetaCache && gamificationMetadataCache) {
    badgeCatalog = gamificationMetadataCache.badgeCatalog;
    pointRules = gamificationMetadataCache.pointRules;
    departments = gamificationMetadataCache.departments;
    members = gamificationMetadataCache.members;
  } else if (metaResult) {
    const [bCatalog, pRules, deptsRes, membersRes] = metaResult;
    badgeCatalog = bCatalog;
    pointRules = pRules;
    departments = deptsRes.data || [];
    members = membersRes.data || [];

    gamificationMetadataCache = {
      expiresAt: Date.now() + METADATA_CACHE_TTL,
      badgeCatalog,
      pointRules,
      departments,
      members,
    };
  } else {
    badgeCatalog = [];
    pointRules = [];
    departments = [];
    members = [];
  }

  const userPoints = Number(myProfile?.overall_score || allTimeLeaderboard.myRanking?.points || 0);

  return (
    <GamificationClient
      initialSeasonalLeaderboard={seasonalLeaderboard}
      initialAllTimeLeaderboard={allTimeLeaderboard}
      initialCommitteeLeaderboard={committeeLeaderboard}
      initialRecognitionData={recognitionData}
      badgeCatalog={badgeCatalog}
      myEarnedBadges={myEarnedBadges}
      pointRules={pointRules}
      departments={departments || []}
      membersList={members || []}
      currentUserId={currentUserId}
      userRole={userRole}
      userPoints={userPoints}
      userStreaks={myStreaks}
      initialTab={initialTab}
    />
  );
}

export default async function GamificationPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect('/auth/login?redirect=/gamification');
  }

  const currentUserId = context.profile.id;
  const userRole = context.profile.role;

  const validTabs = ['leaderboard', 'committees', 'badges', 'recognition', 'rules'] as const;
  const requestedTab = params?.tab as any;
  const initialTab = validTabs.includes(requestedTab) ? requestedTab : 'leaderboard';

  return (
    <AppShell>
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          width: '100%',
        }}
      >
        <Suspense fallback={<GamificationSkeleton />}>
          <GamificationDataLoader
            currentUserId={currentUserId}
            userRole={userRole}
            initialTab={initialTab}
          />
        </Suspense>
      </div>
    </AppShell>
  );
}
