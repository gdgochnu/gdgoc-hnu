'use client';

import React, { useState, useTransition, useCallback } from 'react';
import { LeaderboardResult, LeaderboardMember } from '@/lib/gamification/leaderboard';
import { TierBadge } from './TierBadge';
import {
  Trophy,
  Crown,
  Medal,
  Calendar,
  Sparkles,
  Flame,
  Award,
  Filter,
  Eye,
  EyeOff,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { setLeaderboardOptInAction } from '@/app/gamification/actions';

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface LeaderboardViewProps {
  initialSeasonal: LeaderboardResult;
  initialAllTime: LeaderboardResult;
  departments: DepartmentOption[];
  currentUserId?: string;
  initialOptIn?: boolean;
}

export function LeaderboardView({
  initialSeasonal,
  initialAllTime,
  departments,
  currentUserId,
  initialOptIn = true,
}: LeaderboardViewProps) {
  const [tab, setTab] = useState<'seasonal' | 'all_time'>('seasonal');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [optIn, setOptIn] = useState<boolean>(initialOptIn);
  const [isPendingOptIn, startOptInTransition] = useTransition();

  const activeData = tab === 'seasonal' ? initialSeasonal : initialAllTime;

  // Filter rankings client-side if department filter is changed
  const filteredRankings = React.useMemo(() => {
    if (selectedDept === 'all') return activeData.rankings;
    return activeData.rankings.filter((m) => m.departmentId === selectedDept);
  }, [activeData.rankings, selectedDept]);

  const podium = filteredRankings.slice(0, 3);
  const rest = filteredRankings.slice(3);

  const handleToggleOptIn = useCallback(() => {
    const next = !optIn;
    setOptIn(next);
    startOptInTransition(async () => {
      await setLeaderboardOptInAction(next);
    });
  }, [optIn]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Controls Bar */}
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
        {/* Tab switchers */}
        <div
          style={{
            display: 'inline-flex',
            padding: '0.25rem',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            id="tab-seasonal-leaderboard"
            onClick={() => setTab('seasonal')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '9px',
              border: 'none',
              background: tab === 'seasonal' ? 'linear-gradient(135deg, var(--google-blue), #5ea8fb)' : 'transparent',
              color: tab === 'seasonal' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
            }}
          >
            <Flame size={14} /> Seasonal ({initialSeasonal.season || 'Current'})
          </button>

          <button
            id="tab-all-time-leaderboard"
            onClick={() => setTab('all_time')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '9px',
              border: 'none',
              background: tab === 'all_time' ? 'linear-gradient(135deg, #fbbc04, #f59e0b)' : 'transparent',
              color: tab === 'all_time' ? '#000' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
            }}
          >
            <Crown size={14} /> All-Time Hall of Fame
          </button>
        </div>

        {/* Right side: Department filter & Opt-in */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {departments.length > 0 && (
            <div style={{ position: 'relative' }}>
              <select
                id="leaderboard-dept-filter"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{
                  padding: '0.5rem 2rem 0.5rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                <option value="all" style={{ background: '#1a1d2e' }}>All Committees</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id} style={{ background: '#1a1d2e' }}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: '0.7rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          )}

          {/* Opt-in toggle button */}
          <button
            id="toggle-leaderboard-opt-in-btn"
            onClick={handleToggleOptIn}
            disabled={isPendingOptIn}
            title={optIn ? 'You are visible on the public leaderboard. Click to hide.' : 'You are hidden. Click to appear.'}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '10px',
              border: optIn ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
              background: optIn ? 'rgba(52, 168, 83, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              color: optIn ? '#34a853' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: isPendingOptIn ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s',
            }}
          >
            {optIn ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{optIn ? 'Visible on Board' : 'Hidden from Board'}</span>
          </button>
        </div>
      </div>

      {/* Podium (Top 3) */}
      {podium.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: podium.length === 3 ? '1fr 1.15fr 1fr' : `repeat(${podium.length}, 1fr)`,
            gap: '1.25rem',
            alignItems: 'end',
            padding: '1.5rem 0',
            maxWidth: '640px',
            margin: '0.5rem auto 1.5rem auto',
            width: '100%',
          }}
        >
          {/* Order in podium: Silver (2nd) -> Gold (1st) -> Bronze (3rd) */}
          {podium.length >= 2 && <PodiumStep member={podium[1]} place={2} medal="🥈" color="#c0c0c0" height={160} />}
          {podium.length >= 1 && <PodiumStep member={podium[0]} place={1} medal="🥇" color="#ffd700" height={205} isCenter />}
          {podium.length >= 3 && <PodiumStep member={podium[2]} place={3} medal="🥉" color="#cd7f32" height={140} />}
        </div>
      )}

      {/* Rankings List */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 120px 100px 90px',
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
          <span>Member</span>
          <span>Tier</span>
          <span style={{ textAlign: 'center' }}>Badges</span>
          <span style={{ textAlign: 'right' }}>Points</span>
        </div>

        {filteredRankings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No members found on the leaderboard yet.
          </div>
        ) : (
          filteredRankings.map((m) => {
            const isMe = m.profileId === currentUserId;
            return (
              <div
                key={m.profileId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr 120px 100px 90px',
                  alignItems: 'center',
                  padding: '0.875rem 1.25rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  background: isMe ? 'rgba(66, 133, 244, 0.08)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {/* Rank */}
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: m.rank <= 3 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {m.rank === 1 ? '🥇' : m.rank === 2 ? '🥈' : m.rank === 3 ? '🥉' : `#${m.rank}`}
                </div>

                {/* Member */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: '#fff',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      m.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>{m.fullName}</span>
                      {isMe && (
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'var(--google-blue)', color: '#fff' }}>
                          You
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {m.departmentCode} • {m.role.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                {/* Tier */}
                <div>
                  <TierBadge tier={m.tier.tier} size="sm" />
                </div>

                {/* Badges count */}
                <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  🏅 {m.badgesCount}
                </div>

                {/* Points */}
                <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: m.tier.color }}>
                  {m.points.toLocaleString()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky personal rank bar if available */}
      {activeData.myRanking && (
        <div
          className="glass-panel"
          style={{
            position: 'sticky',
            bottom: '1rem',
            padding: '1rem 1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(66, 133, 244, 0.4)',
            background: 'rgba(26, 29, 46, 0.95)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🏆</span>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Your Standing
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {activeData.myRanking.leaderboardOptIn ? (
                  <>Rank #{activeData.myRanking.rank} in Chapter</>
                ) : (
                  <>Hidden from Board (Opt-out)</>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <TierBadge points={activeData.myRanking.points} size="md" />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--google-blue)' }}>
                {activeData.myRanking.points} pts
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PodiumStep({
  member,
  place,
  medal,
  color,
  height,
  isCenter = false,
}: {
  member: LeaderboardMember;
  place: number;
  medal: string;
  color: string;
  height: number;
  isCenter?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '0.5rem',
      }}
    >
      {/* Crown / Medal */}
      <div style={{ fontSize: isCenter ? '2rem' : '1.5rem', lineHeight: 1 }}>
        {isCenter ? '👑' : medal}
      </div>

      {/* Avatar with glowing ring */}
      <div
        style={{
          width: isCenter ? '64px' : '52px',
          height: isCenter ? '64px' : '52px',
          borderRadius: '50%',
          padding: '3px',
          background: `linear-gradient(135deg, ${color}, transparent)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: '#1a1d2e',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: isCenter ? '1.15rem' : '0.95rem',
            color: '#fff',
          }}
        >
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            member.fullName.charAt(0).toUpperCase()
          )}
        </div>
      </div>

      {/* Name & Dept */}
      <div>
        <div style={{ fontWeight: 800, fontSize: isCenter ? '0.95rem' : '0.82rem', color: 'var(--text-primary)' }}>
          {member.fullName}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {member.departmentCode}
        </div>
      </div>

      <TierBadge tier={member.tier.tier} size="sm" showLevel={false} />

      {/* Pillar Base */}
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
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color }}>
          {medal}
        </div>
        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
          {member.points.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Points
        </div>
      </div>
    </div>
  );
}
