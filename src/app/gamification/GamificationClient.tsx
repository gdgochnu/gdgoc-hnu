'use client';

import React, { useState } from 'react';
import {
  Trophy,
  Users,
  Award,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { LeaderboardView } from '@/components/gamification/LeaderboardView';
import { CommitteeLeaderboardView } from '@/components/gamification/CommitteeLeaderboardView';
import { BadgeCard } from '@/components/gamification/BadgeCard';
import { RecognitionWallWidget } from '@/components/gamification/RecognitionWallWidget';
import { TransparencyView } from '@/components/gamification/TransparencyView';
import { TierProgressCard } from '@/components/gamification/TierProgressCard';
import type { LeaderboardResult } from '@/lib/gamification/leaderboard';
import type { CommitteeLeaderboardResult } from '@/lib/gamification/committee-leaderboard';
import type { Badge, MemberBadgeRecord } from '@/lib/gamification/badges-engine';
import type { PointRule } from '@/types/gamification';
import type { RecognitionWallData } from '@/lib/gamification/recognition-engine';
import type { MemberStreaks } from '@/lib/gamification/levels-streaks';
import {
  fetchLeaderboardsAction,
  fetchCommitteeLeaderboardAction,
  fetchRecognitionWallAction,
} from '@/app/gamification/actions';

interface GamificationClientProps {
  initialSeasonalLeaderboard: LeaderboardResult;
  initialAllTimeLeaderboard: LeaderboardResult;
  initialCommitteeLeaderboard: CommitteeLeaderboardResult;
  initialRecognitionData: RecognitionWallData;
  badgeCatalog: Badge[];
  myEarnedBadges: MemberBadgeRecord[];
  pointRules: PointRule[];
  departments: Array<{ id: string; name: string; code: string }>;
  membersList: Array<{ id: string; full_name: string; role: string }>;
  currentUserId?: string;
  userRole?: string;
  userPoints?: number;
  userStreaks?: MemberStreaks;
  initialTab?: 'leaderboard' | 'committees' | 'badges' | 'recognition' | 'rules';
}

export function GamificationClient({
  initialSeasonalLeaderboard,
  initialAllTimeLeaderboard,
  initialCommitteeLeaderboard,
  initialRecognitionData,
  badgeCatalog,
  myEarnedBadges,
  pointRules,
  departments,
  membersList,
  currentUserId,
  userRole,
  userPoints = 0,
  userStreaks,
  initialTab = 'leaderboard',
}: GamificationClientProps) {
  const [activeTab, setActiveTab] = useState<
    'leaderboard' | 'committees' | 'badges' | 'recognition' | 'rules'
  >(initialTab);

  const [seasonalData, setSeasonalData] = useState(initialSeasonalLeaderboard);
  const [allTimeData, setAllTimeData] = useState(initialAllTimeLeaderboard);
  const [committeeData, setCommitteeData] = useState(initialCommitteeLeaderboard);
  const [recognitionData, setRecognitionData] = useState(initialRecognitionData);

  const handleRefreshData = async () => {
    try {
      const [lbRes, commRes, recogRes] = await Promise.all([
        fetchLeaderboardsAction(),
        fetchCommitteeLeaderboardAction(),
        fetchRecognitionWallAction(),
      ]);

      if (lbRes.success && lbRes.seasonal && lbRes.allTime) {
        setSeasonalData(lbRes.seasonal);
        setAllTimeData(lbRes.allTime);
      }
      if (commRes.success && commRes.data) {
        setCommitteeData(commRes.data);
      }
      if (recogRes.success && recogRes.data) {
        setRecognitionData(recogRes.data);
      }
    } catch (e) {
      console.error('Failed to refresh gamification data:', e);
    }
  };

  const earnedBadgeMap = new Map(myEarnedBadges.map((b) => [b.badge_id, b]));

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, color: 'var(--google-yellow)' },
    { id: 'committees', label: 'Committees', icon: Users, color: 'var(--google-blue)' },
    { id: 'badges', label: 'Badges & Honors', icon: Award, color: '#a855f7' },
    { id: 'recognition', label: 'Recognition Wall', icon: Sparkles, color: '#ec4899' },
    { id: 'rules', label: 'How Points Work', icon: BookOpen, color: 'var(--google-green)' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Top Banner Header with Google Accent Strip */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          borderRadius: '24px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background:
              'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(251, 188, 4, 0.25), rgba(234, 67, 53, 0.25))',
                border: '1px solid rgba(251, 188, 4, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbc04',
                flexShrink: 0,
              }}
            >
              <Trophy size={28} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--google-yellow)',
                  marginBottom: '0.2rem',
                }}
              >
                Gamification & Recognition Hub (§4.13)
              </div>
              <h1
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Chapter Standing & Honors
              </h1>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Active Season:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{seasonalData.season}</strong> • 100% Transparent Point Economy
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Member Personal Tier & Streak Progress Card */}
      {userPoints !== undefined && (
        <TierProgressCard
          points={userPoints}
          seasonPoints={seasonalData.myRanking?.points}
          seasonName={seasonalData.season}
          streaks={userStreaks}
        />
      )}

      {/* Hub Navigation Tabs */}
      <div
        className="glass-panel"
        style={{
          padding: '0.5rem',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          maxWidth: '100%',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.7rem 1.25rem',
                borderRadius: '12px',
                border: isActive
                  ? `1px solid ${tab.color}`
                  : '1px solid transparent',
                background: isActive
                  ? `rgba(255, 255, 255, 0.08)`
                  : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} color={isActive ? tab.color : 'currentColor'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'leaderboard' && (
          <LeaderboardView
            initialSeasonal={seasonalData}
            initialAllTime={allTimeData}
            departments={departments}
            currentUserId={currentUserId}
          />
        )}

        {activeTab === 'committees' && (
          <CommitteeLeaderboardView data={committeeData} />
        )}

        {activeTab === 'badges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem 1.5rem',
                borderRadius: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                  Chapter Badges & Honors
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Unlocked <strong style={{ color: '#a855f7' }}>{myEarnedBadges.length}</strong> of{' '}
                  <strong style={{ color: '#fff' }}>{badgeCatalog.length}</strong> badges
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {badgeCatalog.map((badge) => {
                const earned = earnedBadgeMap.get(badge.id);
                return (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    earnedRecord={earned}
                  />
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'recognition' && (
          <RecognitionWallWidget
            data={recognitionData}
            membersList={membersList}
            currentUserId={currentUserId}
            onRefresh={handleRefreshData}
          />
        )}

        {activeTab === 'rules' && (
          <TransparencyView
            pointRules={pointRules}
            badges={badgeCatalog}
            userRole={userRole}
            onRuleUpdated={handleRefreshData}
          />
        )}
      </div>
    </div>
  );
}
