import React from 'react';
import { 
  Trophy, 
  Users, 
  Award, 
  Sparkles, 
  BookOpen, 
  Crown, 
  Medal 
} from 'lucide-react';

export function GamificationSkeleton() {
  const tabs = [
    { label: 'Leaderboard', icon: Trophy, color: 'var(--google-yellow)' },
    { label: 'Committees', icon: Users, color: 'var(--google-blue)' },
    { label: 'Badges & Honors', icon: Award, color: '#a855f7' },
    { label: 'Recognition Wall', icon: Sparkles, color: '#ec4899' },
    { label: 'How Points Work', icon: BookOpen, color: 'var(--google-green)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Top Banner Header with Google Accent Strip - exact match */}
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
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
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
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(251, 188, 4, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={24} color="var(--google-yellow)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                Chapter Gamification &amp; Leaderboard
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>
                Compete, earn badges, and gain recognition through chapter contributions.
              </p>
            </div>
          </div>

          {/* Right My Score Card Shimmer */}
          <div
            className="glass-panel"
            style={{
              padding: '0.85rem 1.4rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                My Chapter Score
              </span>
              <div className="skeleton-pulse" style={{ height: '24px', width: '80px', borderRadius: '4px' }} />
            </div>
            <div className="skeleton-pulse" style={{ height: '28px', width: '90px', borderRadius: '999px' }} />
          </div>
        </div>
      </div>

      {/* 5-Tab Navigation Bar - exact match */}
      <div
        className="glass-panel"
        style={{
          padding: '0.5rem',
          borderRadius: '16px',
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
        }}
      >
        {tabs.map((t, idx) => {
          const TabIcon = t.icon;
          const isActive = idx === 0;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.7rem 1.25rem',
                borderRadius: '10px',
                background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.88rem',
                fontWeight: 700,
                border: isActive ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
              }}
            >
              <TabIcon size={16} color={t.color} />
              <span>{t.label}</span>
            </div>
          );
        })}
      </div>

      {/* Tier Progress Card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton-pulse" style={{ height: '18px', width: '160px', borderRadius: '4px' }} />
          <div className="skeleton-pulse" style={{ height: '18px', width: '120px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton-pulse" style={{ height: '8px', width: '100%', borderRadius: '999px' }} />
      </div>

      {/* Top 3 Podium - realistic pedestals */}
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem 1.5rem 1.5rem',
          borderRadius: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '1.5rem',
          minHeight: '280px',
        }}
      >
        {/* 2nd Place (Silver) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', width: '130px' }}>
          <div className="skeleton-pulse" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #94A3B8' }} />
          <div className="skeleton-pulse" style={{ height: '14px', width: '85px', borderRadius: '4px' }} />
          <div className="skeleton-pulse" style={{ height: '12px', width: '60px', borderRadius: '4px' }} />
          <div
            style={{
              height: '80px',
              width: '100%',
              borderRadius: '12px 12px 0 0',
              background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.25) 0%, rgba(148, 163, 184, 0.05) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 900,
              color: '#CBD5E1',
            }}
          >
            2
          </div>
        </div>

        {/* 1st Place (Gold) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', width: '145px' }}>
          <Crown size={24} color="#FDE047" />
          <div className="skeleton-pulse" style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid #FACC15' }} />
          <div className="skeleton-pulse" style={{ height: '16px', width: '95px', borderRadius: '4px' }} />
          <div className="skeleton-pulse" style={{ height: '12px', width: '65px', borderRadius: '4px' }} />
          <div
            style={{
              height: '120px',
              width: '100%',
              borderRadius: '14px 14px 0 0',
              background: 'linear-gradient(180deg, rgba(250, 204, 21, 0.25) 0%, rgba(250, 204, 21, 0.05) 100%)',
              border: '1px solid rgba(250, 204, 21, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 900,
              color: '#FDE047',
            }}
          >
            1
          </div>
        </div>

        {/* 3rd Place (Bronze) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', width: '130px' }}>
          <div className="skeleton-pulse" style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #D97706' }} />
          <div className="skeleton-pulse" style={{ height: '14px', width: '80px', borderRadius: '4px' }} />
          <div className="skeleton-pulse" style={{ height: '12px', width: '55px', borderRadius: '4px' }} />
          <div
            style={{
              height: '60px',
              width: '100%',
              borderRadius: '12px 12px 0 0',
              background: 'linear-gradient(180deg, rgba(217, 119, 6, 0.25) 0%, rgba(217, 119, 6, 0.05) 100%)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 900,
              color: '#F59E0B',
            }}
          >
            3
          </div>
        </div>
      </div>

      {/* Ranking Table Shimmer */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[4, 5, 6, 7].map((row) => (
          <div key={row} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ width: '24px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center' }}>
              #{row}
            </span>
            <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
              <div className="skeleton-pulse" style={{ height: '16px', width: '160px', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '12px', width: '100px', borderRadius: '4px' }} />
            </div>
            <div className="skeleton-pulse" style={{ height: '26px', width: '70px', borderRadius: '999px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
