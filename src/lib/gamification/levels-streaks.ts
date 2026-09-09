import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GDGoC HNU OS — Levels, Tiers & Streak Tracking (§4.13)
 */

export type GamificationTier = 'newcomer' | 'contributor' | 'achiever' | 'leader' | 'legend';

export interface TierDefinition {
  tier: GamificationTier;
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number | null;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const TIERS: TierDefinition[] = [
  {
    tier: 'newcomer',
    level: 1,
    title: 'Newcomer',
    minPoints: 0,
    maxPoints: 99,
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
    description: 'Welcome to the chapter! Begin your journey by completing onboarding and attending your first event.',
  },
  {
    tier: 'contributor',
    level: 2,
    title: 'Contributor',
    minPoints: 100,
    maxPoints: 249,
    color: '#34a853',
    bgColor: 'rgba(52, 168, 83, 0.12)',
    borderColor: 'rgba(52, 168, 83, 0.3)',
    description: 'Active contributor actively attending events and shipping tasks for the chapter.',
  },
  {
    tier: 'achiever',
    level: 3,
    title: 'Achiever',
    minPoints: 250,
    maxPoints: 499,
    color: '#4285f4',
    bgColor: 'rgba(66, 133, 244, 0.12)',
    borderColor: 'rgba(66, 133, 244, 0.3)',
    description: 'Proven achiever with consistent delivery, high attendance, and multi-committee impact.',
  },
  {
    tier: 'leader',
    level: 4,
    title: 'Leader',
    minPoints: 500,
    maxPoints: 999,
    color: '#a142f4',
    bgColor: 'rgba(161, 66, 244, 0.12)',
    borderColor: 'rgba(161, 66, 244, 0.3)',
    description: 'Chapter pillar who guides initiatives, mentors others, and drives significant outcomes.',
  },
  {
    tier: 'legend',
    level: 5,
    title: 'Legend',
    minPoints: 1000,
    maxPoints: null,
    color: '#fbbc04',
    bgColor: 'rgba(251, 188, 4, 0.12)',
    borderColor: 'rgba(251, 188, 4, 0.35)',
    description: 'Top-tier chapter legend whose all-time impact is recognized across the entire university.',
  },
];

export interface MemberTierInfo {
  tier: GamificationTier;
  level: number;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  currentPoints: number;
  minPoints: number;
  nextTierPoints: number | null;
  pointsToNextTier: number | null;
  progressPct: number;
  isMaxTier: boolean;
}

/**
 * Maps a points count to its corresponding tier and progress metrics.
 */
export function getTierForPoints(points: number): MemberTierInfo {
  const pts = Math.max(0, points);

  let currentTier = TIERS[0];
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (pts >= TIERS[i].minPoints) {
      currentTier = TIERS[i];
      break;
    }
  }

  const isMaxTier = currentTier.maxPoints === null;
  const nextTierPoints = currentTier.maxPoints !== null ? currentTier.maxPoints + 1 : null;
  const pointsToNextTier = nextTierPoints !== null ? Math.max(0, nextTierPoints - pts) : null;

  let progressPct = 100;
  if (!isMaxTier && currentTier.maxPoints !== null) {
    const tierRange = currentTier.maxPoints - currentTier.minPoints + 1;
    const earnedInTier = pts - currentTier.minPoints;
    progressPct = Math.min(100, Math.max(0, Math.round((earnedInTier / tierRange) * 100)));
  }

  return {
    tier: currentTier.tier,
    level: currentTier.level,
    title: currentTier.title,
    color: currentTier.color,
    bgColor: currentTier.bgColor,
    borderColor: currentTier.borderColor,
    currentPoints: pts,
    minPoints: currentTier.minPoints,
    nextTierPoints,
    pointsToNextTier,
    progressPct,
    isMaxTier,
  };
}

export interface MemberStreaks {
  eventAttendance: {
    currentStreak: number;
    longestStreak: number;
    lastAttendedEventTitle: string | null;
    lastAttendedDate: string | null;
  };
  taskOnTime: {
    currentStreak: number;
    longestStreak: number;
    totalCompletedOnTime: number;
  };
}

/**
 * Calculates a member's event attendance streak and on-time task delivery streak.
 * Spec §4.13: Visible streaks with no point loss on breaks.
 */
export async function calculateMemberStreaks(profileId: string): Promise<MemberStreaks> {
  const admin = createAdminClient();

  // ── 1. Event Attendance Streak ─────────────────────────────────────────────
  // Fetch completed chapter events ordered chronologically
  const { data: events } = await admin
    .from('events')
    .select('id, title, event_date, status')
    .eq('status', 'completed')
    .order('event_date', { ascending: false });

  // Fetch all attendance records for this profile
  const { data: attendances } = await admin
    .from('attendance')
    .select('event_id, check_in_time')
    .eq('profile_id', profileId);

  const attendedEventIds = new Set((attendances || []).map((a) => a.event_id));

  let currentEventStreak = 0;
  let longestEventStreak = 0;
  let tempStreak = 0;
  let lastAttendedTitle: string | null = null;
  let lastAttendedDate: string | null = null;

  const completedEvents = events || [];

  // Calculate current active streak (from most recent backward)
  for (const ev of completedEvents) {
    if (attendedEventIds.has(ev.id)) {
      currentEventStreak++;
      if (!lastAttendedTitle) {
        lastAttendedTitle = ev.title;
        lastAttendedDate = ev.event_date;
      }
    } else {
      // Streak broken
      break;
    }
  }

  // Calculate all-time longest streak (chronological from oldest to newest)
  const chronologicalEvents = [...completedEvents].reverse();
  for (const ev of chronologicalEvents) {
    if (attendedEventIds.has(ev.id)) {
      tempStreak++;
      if (tempStreak > longestEventStreak) {
        longestEventStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  // ── 2. Task On-Time Streak ─────────────────────────────────────────────────
  // Fetch tasks completed by this member ordered by completed_at desc
  const { data: assignees } = await admin
    .from('task_assignees')
    .select(`
      task_id, completed_at,
      task:tasks!inner(id, due_date, status, completed_at)
    `)
    .eq('profile_id', profileId)
    .order('completed_at', { ascending: false });

  let currentTaskStreak = 0;
  let longestTaskStreak = 0;
  let tempTaskStreak = 0;
  let totalOnTime = 0;

  const finishedTasks = (assignees || [])
    .filter((a: any) => a.task && (a.task.status === 'done' || a.completed_at))
    .map((a: any) => {
      const dueDate = a.task.due_date ? new Date(a.task.due_date).getTime() : null;
      const completedTime = a.completed_at
        ? new Date(a.completed_at).getTime()
        : a.task.completed_at
        ? new Date(a.task.completed_at).getTime()
        : Date.now();

      const isOnTime = dueDate === null || completedTime <= dueDate;
      return { isOnTime };
    });

  // Current streak
  for (const t of finishedTasks) {
    if (t.isOnTime) {
      currentTaskStreak++;
      totalOnTime++;
    } else {
      break;
    }
  }

  // Longest streak
  const chronologicalTasks = [...finishedTasks].reverse();
  for (const t of chronologicalTasks) {
    if (t.isOnTime) {
      tempTaskStreak++;
      if (tempTaskStreak > longestTaskStreak) {
        longestTaskStreak = tempTaskStreak;
      }
    } else {
      tempTaskStreak = 0;
    }
  }

  return {
    eventAttendance: {
      currentStreak: currentEventStreak,
      longestStreak: longestEventStreak,
      lastAttendedEventTitle: lastAttendedTitle,
      lastAttendedDate: lastAttendedDate,
    },
    taskOnTime: {
      currentStreak: currentTaskStreak,
      longestStreak: longestTaskStreak,
      totalCompletedOnTime: totalOnTime,
    },
  };
}
