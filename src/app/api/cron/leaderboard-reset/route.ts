import { NextResponse } from 'next/server';
import { getCurrentSeason } from '@/lib/gamification/points-engine';
import { resetSeasonJob, getSeasonalLeaderboard } from '@/lib/gamification/leaderboard';
import { verifyCronAuth } from '@/lib/cron-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron Job: Seasonal Leaderboard Reset
 * Triggered at semester transitions (Feb 1, Jul 1, Sep 1) to archive the previous season,
 * log the final podium rankings, and initiate the new competitive semester.
 *
 * Spec §4.13, §10, Checklist 22.4 & 22.6
 */
export async function GET(req: Request) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const explicitSeason = searchParams.get('newSeason');
    const newSeason = explicitSeason?.trim() || getCurrentSeason();

    const admin = createAdminClient();

    // Fetch system actor (president or system fallback)
    const { data: president } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'president')
      .maybeSingle();

    const callerId = president?.id || '00000000-0000-0000-0000-000000000000';

    // 1. Snapshot previous/current standings for archiving
    const standings = await getSeasonalLeaderboard({});

    // 2. Execute season reset job
    const result = await resetSeasonJob({
      newSeasonName: newSeason,
      callerId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to reset seasonal leaderboard' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job: 'seasonal-leaderboard-reset',
      timestamp: new Date().toISOString(),
      newSeason: result.newSeason,
      archivedPodiumCount: standings.podium.length,
      archivedParticipants: standings.totalParticipants,
      topWinner: standings.podium[0] ? standings.podium[0].fullName : null,
    });
  } catch (error: any) {
    console.error('Cron error in leaderboard-reset:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error executing seasonal leaderboard reset job' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const explicitSeason = body?.newSeasonName || body?.newSeason;
    const newSeason = explicitSeason?.trim() || getCurrentSeason();

    const admin = createAdminClient();
    const { data: president } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'president')
      .maybeSingle();

    const callerId = president?.id || '00000000-0000-0000-0000-000000000000';
    const standings = await getSeasonalLeaderboard({});

    const result = await resetSeasonJob({
      newSeasonName: newSeason,
      callerId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to reset seasonal leaderboard' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job: 'seasonal-leaderboard-reset',
      timestamp: new Date().toISOString(),
      newSeason: result.newSeason,
      archivedPodiumCount: standings.podium.length,
      archivedParticipants: standings.totalParticipants,
      topWinner: standings.podium[0] ? standings.podium[0].fullName : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error executing seasonal leaderboard reset job' },
      { status: 500 }
    );
  }
}
