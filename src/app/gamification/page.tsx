import React from 'react';
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

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gamification & Recognition — GDGoC HNU OS',
  description: 'Chapter seasonal leaderboard, committee standings, member of the month, and transparent point rules.',
};

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

  const admin = createAdminClient();

  const [
    seasonalLeaderboard,
    allTimeLeaderboard,
    committeeLeaderboard,
    recognitionData,
    badgeCatalog,
    myEarnedBadges,
    pointRules,
    myStreaks,
    { data: myProfile },
    { data: departments },
    { data: members },
  ] = await Promise.all([
    getSeasonalLeaderboard({ currentUserId }),
    getAllTimeLeaderboard({ currentUserId }),
    getCommitteeLeaderboard(),
    getRecognitionWallData(),
    getBadgeCatalog(),
    getMemberBadges(currentUserId),
    getPointRules(true),
    calculateMemberStreaks(currentUserId),
    admin.from('profiles').select('overall_score').eq('id', currentUserId).maybeSingle(),
    admin.from('departments').select('id, name, code').order('name'),
    admin.from('profiles').select('id, full_name, role').eq('status', 'active').order('full_name'),
  ]);

  const userPoints = Number(myProfile?.overall_score || allTimeLeaderboard.myRanking?.points || 0);

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
      </div>
    </AppShell>
  );
}
