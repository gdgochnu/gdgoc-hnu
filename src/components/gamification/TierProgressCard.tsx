'use client';

import React from 'react';
import { getTierForPoints, MemberStreaks } from '@/lib/gamification/levels-streaks';
import { TierBadge, StreakWidget } from './TierBadge';
import { Sparkles, Trophy, Flame } from 'lucide-react';

interface TierProgressCardProps {
  points: number;
  seasonPoints?: number;
  seasonName?: string;
  streaks?: MemberStreaks;
}

export function TierProgressCard({
  points,
  seasonPoints,
  seasonName = 'Fall 2026',
  streaks,
}: TierProgressCardProps) {
  const tierInfo = getTierForPoints(points);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.5rem',
        borderRadius: '20px',
        border: `1px solid ${tierInfo.borderColor}`,
        background: `radial-gradient(ellipse at top right, ${tierInfo.bgColor}, rgba(255, 255, 255, 0.02) 70%)`,
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <TierBadge points={points} size="md" />
            {streaks && (
              <StreakWidget
                eventStreak={streaks.eventAttendance.currentStreak}
                taskStreak={streaks.taskOnTime.currentStreak}
              />
            )}
          </div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Level {tierInfo.level} — {tierInfo.title}
          </h3>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: tierInfo.color, lineHeight: 1 }}>
            {points.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Total Points
          </div>
        </div>
      </div>

      {/* Progress to next tier */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.45rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {tierInfo.isMaxTier ? (
              <span style={{ color: tierInfo.color, fontWeight: 700 }}>
                👑 Max Tier Achieved (Legend)
              </span>
            ) : (
              <>
                Next Tier:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  Level {tierInfo.level + 1}
                </strong>{' '}
                ({tierInfo.pointsToNextTier} points to unlock)
              </>
            )}
          </span>
          <span style={{ fontWeight: 700, color: tierInfo.color }}>
            {tierInfo.progressPct}%
          </span>
        </div>

        {/* Progress bar track */}
        <div
          style={{
            height: '8px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${tierInfo.progressPct}%`,
              background: `linear-gradient(90deg, ${tierInfo.color}, #4285f4)`,
              borderRadius: '999px',
              transition: 'width 0.4s ease-out',
            }}
          />
        </div>
      </div>

      {/* Bottom stats pill row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '0.75rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {seasonPoints !== undefined && (
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {seasonName}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {seasonPoints} pts
            </div>
          </div>
        )}

        {streaks && (
          <>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Longest Event Streak
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ea4335' }}>
                🔥 {streaks.eventAttendance.longestStreak}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tasks On-Time
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34a853' }}>
                ⚡ {streaks.taskOnTime.totalCompletedOnTime}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
