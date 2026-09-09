'use client';

import React, { useState } from 'react';
import { CommitteeLeaderboardResult, CommitteeLeaderboardEntry } from '@/lib/gamification/committee-leaderboard';
import {
  Trophy,
  Users,
  CheckCircle2,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  Layers,
  BarChart2,
} from 'lucide-react';

interface CommitteeLeaderboardViewProps {
  data: CommitteeLeaderboardResult;
}

export function CommitteeLeaderboardView({ data }: CommitteeLeaderboardViewProps) {
  const [branchFilter, setBranchFilter] = useState<'all' | 'tech' | 'non_tech'>('all');
  const [sortBy, setSortBy] = useState<'total' | 'average'>('total');

  const filtered = React.useMemo(() => {
    let list = data.rankings;
    if (branchFilter !== 'all') {
      list = list.filter((c) => c.branch === branchFilter);
    }
    if (sortBy === 'average') {
      return [...list].sort((a, b) => b.avgPointsPerMember - a.avgPointsPerMember);
    }
    return [...list].sort((a, b) => b.totalPoints - a.totalPoints);
  }, [data.rankings, branchFilter, sortBy]);

  const podium = filtered.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Branch Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Branch:
          </span>
          {(['all', 'tech', 'non_tech'] as const).map((b) => (
            <button
              key={b}
              id={`filter-branch-${b}`}
              onClick={() => setBranchFilter(b)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                border: branchFilter === b ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: branchFilter === b ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: branchFilter === b ? 'var(--google-blue)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {b === 'all' ? 'All' : b === 'tech' ? 'Technical' : 'Non-Technical'}
            </button>
          ))}
        </div>

        {/* Sort by Metric */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Rank by:
          </span>
          <button
            id="sort-by-total"
            onClick={() => setSortBy('total')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: sortBy === 'total' ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: sortBy === 'total' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: sortBy === 'total' ? '#34a853' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Total Points
          </button>
          <button
            id="sort-by-average"
            onClick={() => setSortBy('average')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: sortBy === 'average' ? '1px solid rgba(251, 188, 4, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: sortBy === 'average' ? 'rgba(251, 188, 4, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: sortBy === 'average' ? '#fbbc04' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Avg / Member
          </button>
        </div>
      </div>

      {/* Podium for top 3 committees */}
      {podium.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: podium.length === 3 ? '1fr 1.15fr 1fr' : `repeat(${podium.length}, 1fr)`,
            gap: '1rem',
            alignItems: 'end',
            padding: '0.5rem 0',
          }}
        >
          {podium.length >= 2 && <CommitteePodiumCard entry={podium[1]} place={2} medal="🥈" color="#c0c0c0" height={150} sortBy={sortBy} />}
          {podium.length >= 1 && <CommitteePodiumCard entry={podium[0]} place={1} medal="🥇" color="#ffd700" height={180} isCenter sortBy={sortBy} />}
          {podium.length >= 3 && <CommitteePodiumCard entry={podium[2]} place={3} medal="🥉" color="#cd7f32" height={135} sortBy={sortBy} />}
        </div>
      )}

      {/* Committee Table */}
      <div className="glass-panel" style={{ borderRadius: '20px', overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 110px 90px 100px 100px 140px',
            padding: '0.875rem 1.25rem',
            background: 'rgba(255, 255, 255, 0.04)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          <span>Rank</span>
          <span>Committee</span>
          <span>Branch</span>
          <span style={{ textAlign: 'center' }}>Members</span>
          <span style={{ textAlign: 'center' }}>Tasks</span>
          <span style={{ textAlign: 'right' }}>Total Pts</span>
          <span style={{ textAlign: 'right' }}>Avg / Member</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No committees found.
          </div>
        ) : (
          filtered.map((c, idx) => (
            <div
              key={c.departmentId}
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 110px 90px 100px 100px 140px',
                alignItems: 'center',
                padding: '0.875rem 1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              {/* Rank */}
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: idx < 3 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </div>

              {/* Committee info */}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {c.departmentName}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {c.departmentCode} • {c.eventsOrganized} event{c.eventsOrganized !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Branch */}
              <div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    color: c.branch === 'tech' ? 'var(--google-blue)' : '#a142f4',
                    background: c.branch === 'tech' ? 'rgba(66, 133, 244, 0.12)' : 'rgba(161, 66, 244, 0.12)',
                    border: `1px solid ${c.branch === 'tech' ? 'rgba(66, 133, 244, 0.3)' : 'rgba(161, 66, 244, 0.3)'}`,
                    textTransform: 'uppercase',
                  }}
                >
                  {c.branch === 'tech' ? 'Tech' : 'Non-Tech'}
                </span>
              </div>

              {/* Members count */}
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                👥 {c.activeMemberCount}
              </div>

              {/* Tasks */}
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                ⚡ {c.tasksCompleted}
              </div>

              {/* Total Points */}
              <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {c.totalPoints.toLocaleString()}
              </div>

              {/* Avg per member */}
              <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: '#34a853' }}>
                {c.avgPointsPerMember.toLocaleString()} pts
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CommitteePodiumCard({
  entry,
  place,
  medal,
  color,
  height,
  isCenter = false,
  sortBy = 'total',
}: {
  entry: CommitteeLeaderboardEntry;
  place: number;
  medal: string;
  color: string;
  height: number;
  isCenter?: boolean;
  sortBy?: 'total' | 'average';
}) {
  const displayScore = sortBy === 'total' ? entry.totalPoints : entry.avgPointsPerMember;
  const scoreLabel = sortBy === 'total' ? 'Total Points' : 'Avg / Member';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
      <div style={{ fontSize: isCenter ? '2rem' : '1.5rem', lineHeight: 1 }}>
        {isCenter ? '👑' : medal}
      </div>

      <div>
        <div style={{ fontWeight: 800, fontSize: isCenter ? '1rem' : '0.88rem', color: 'var(--text-primary)' }}>
          {entry.departmentName}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {entry.departmentCode} • {entry.activeMemberCount} members
        </div>
      </div>

      <div
        className="glass-panel"
        style={{
          width: '100%',
          height: `${height}px`,
          borderRadius: '16px 16px 8px 8px',
          border: `1px solid ${color}40`,
          background: `linear-gradient(180deg, ${color}20, rgba(255, 255, 255, 0.02))`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color }}>{medal}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
          {displayScore.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {scoreLabel}
        </div>
      </div>
    </div>
  );
}
