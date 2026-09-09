import React from 'react';
import { getTierForPoints, GamificationTier, TIERS } from '@/lib/gamification/levels-streaks';
import { Shield, Sparkles, Flame, Award, Crown } from 'lucide-react';

interface TierBadgeProps {
  points?: number;
  tier?: GamificationTier;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
}

const tierIcons: Record<GamificationTier, React.ElementType> = {
  newcomer: Shield,
  contributor: Sparkles,
  achiever: Flame,
  leader: Award,
  legend: Crown,
};

export function TierBadge({ points = 0, tier, size = 'sm', showLevel = true }: TierBadgeProps) {
  const info = tier
    ? TIERS.find((t) => t.tier === tier) || TIERS[0]
    : getTierForPoints(points);

  const Icon = tierIcons[info.tier as GamificationTier] || Shield;

  const fontSizes = {
    sm: '0.72rem',
    md: '0.82rem',
    lg: '0.95rem',
  };

  const paddings = {
    sm: '0.15rem 0.55rem',
    md: '0.25rem 0.75rem',
    lg: '0.35rem 1rem',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      title={`Tier: ${info.title} (Level ${info.level})`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: paddings[size],
        borderRadius: '999px',
        background: info.bgColor,
        border: `1px solid ${info.borderColor}`,
        color: info.color,
        fontSize: fontSizes[size],
        fontWeight: 700,
        letterSpacing: '0.02em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <Icon size={iconSizes[size]} style={{ flexShrink: 0 }} />
      <span>{info.title}</span>
      {showLevel && (
        <span
          style={{
            fontSize: '0.62rem',
            opacity: 0.85,
            marginLeft: '0.1rem',
          }}
        >
          Lvl {info.level}
        </span>
      )}
    </span>
  );
}

interface StreakWidgetProps {
  eventStreak?: number;
  taskStreak?: number;
  compact?: boolean;
}

export function StreakWidget({ eventStreak = 0, taskStreak = 0, compact = false }: StreakWidgetProps) {
  if (eventStreak === 0 && taskStreak === 0) return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      {eventStreak > 0 && (
        <span
          title={`${eventStreak} consecutive events attended!`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            background: 'rgba(234, 67, 53, 0.15)',
            border: '1px solid rgba(234, 67, 53, 0.35)',
            color: '#ea4335',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: '0.85rem' }}>🔥</span>
          <span>{eventStreak} event{eventStreak > 1 ? 's' : ''}</span>
        </span>
      )}

      {taskStreak > 0 && !compact && (
        <span
          title={`${taskStreak} consecutive tasks shipped on time!`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            background: 'rgba(52, 168, 83, 0.15)',
            border: '1px solid rgba(52, 168, 83, 0.35)',
            color: '#34a853',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <span>⚡</span>
          <span>{taskStreak} on-time</span>
        </span>
      )}
    </div>
  );
}
