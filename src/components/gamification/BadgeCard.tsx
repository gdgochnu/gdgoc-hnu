'use client';

import React from 'react';
import { Badge, MemberBadgeRecord, BADGE_TIER_STYLES, BadgeCategory } from '@/lib/gamification/badges-engine';
import { Award, CheckCircle2, Lock, Sparkles, Star, Users, Calendar } from 'lucide-react';

interface BadgeCardProps {
  badge: Badge;
  earnedRecord?: MemberBadgeRecord;
  compact?: boolean;
}

const categoryIcons: Record<BadgeCategory, React.ElementType> = {
  milestone: CheckCircle2,
  attendance: Calendar,
  leadership: Star,
  special: Sparkles,
};

export function BadgeCard({ badge, earnedRecord, compact = false }: BadgeCardProps) {
  const isEarned = !!earnedRecord;
  const tierStyle = BADGE_TIER_STYLES[badge.tier] || BADGE_TIER_STYLES.bronze;
  const CategoryIcon = categoryIcons[badge.category] || Award;

  const earnedDate = earnedRecord
    ? new Date(earnedRecord.awarded_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className="glass-panel"
      style={{
        padding: compact ? '1rem' : '1.25rem',
        borderRadius: '16px',
        border: isEarned
          ? `1px solid ${tierStyle.borderColor}`
          : '1px solid rgba(255, 255, 255, 0.06)',
        background: isEarned
          ? `radial-gradient(ellipse at top left, ${tierStyle.bgColor}, rgba(255, 255, 255, 0.02) 80%)`
          : 'rgba(255, 255, 255, 0.02)',
        opacity: isEarned ? 1 : 0.65,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.875rem',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s, opacity 0.2s',
        filter: isEarned ? 'none' : 'grayscale(0.6)',
      }}
    >
      {/* Top badges: Tier & Category */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {/* Tier pill */}
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              color: tierStyle.color,
              background: tierStyle.bgColor,
              border: `1px solid ${tierStyle.borderColor}`,
            }}
          >
            {tierStyle.label}
          </span>

          {/* Category pill */}
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <CategoryIcon size={11} />
            {badge.category}
          </span>
        </div>

        {/* Lock / Points Reward */}
        {isEarned ? (
          <span
            title="Earned!"
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#34a853',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <CheckCircle2 size={13} /> Earned
          </span>
        ) : (
          <span
            title="Locked"
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Lock size={12} /> Locked
          </span>
        )}
      </div>

      {/* Main info */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: isEarned ? tierStyle.bgColor : 'rgba(255, 255, 255, 0.05)',
              border: isEarned ? `1px solid ${tierStyle.borderColor}` : '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isEarned ? tierStyle.color : 'var(--text-muted)',
              fontSize: '1.15rem',
              flexShrink: 0,
            }}
          >
            🏅
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {badge.name}
            </h4>
            {badge.points_reward > 0 && (
              <span style={{ fontSize: '0.72rem', color: tierStyle.color, fontWeight: 700 }}>
                +{badge.points_reward} pts
              </span>
            )}
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {badge.description}
        </p>
      </div>

      {/* Footer / Unlock Date */}
      {isEarned && (
        <div
          style={{
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Unlocked {earnedDate}</span>
          {earnedRecord.awarded_by_profile && (
            <span>by {earnedRecord.awarded_by_profile.full_name}</span>
          )}
        </div>
      )}
    </div>
  );
}
