import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Compass, 
  AlertTriangle, 
  CheckCircle2, 
  Star 
} from 'lucide-react';

export function CommandCenterSkeleton() {
  return (
    <div
      style={{
        maxWidth: '1380px',
        margin: '0 auto',
        padding: '2.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.25rem',
        width: '100%',
      }}
    >
      {/* Executive Header Banner - exact match */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '2.25rem 2.5rem',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Top Google 4-Color Accent Strip */}
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
            gap: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4285F4',
                }}
              >
                <Activity size={24} />
              </div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#93C5FD',
                    background: 'rgba(66, 133, 244, 0.15)',
                    border: '1px solid rgba(66, 133, 244, 0.3)',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                  }}
                >
                  Command Center
                </span>
                <h1
                  style={{
                    fontSize: '2rem',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    color: '#FFFFFF',
                    margin: '0.35rem 0 0',
                  }}
                >
                  Command Center &amp; Health Scorecards
                </h1>
              </div>
            </div>

            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                maxWidth: '750px',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Real-time executive oversight across all chapter committees. Monitor task completion, deadline adherence, member engagement, and leadership attendance.
            </p>
          </div>

          {/* Quick action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <ShieldCheck size={16} color="#FBBC04" />
              <span>Approvals Queue</span>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '12px',
                background: 'rgba(66, 133, 244, 0.18)',
                color: '#93C5FD',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid rgba(66, 133, 244, 0.4)',
              }}
            >
              <Compass size={16} color="#4285F4" />
              <span>Operations Checklist</span>
            </div>
          </div>
        </div>
      </div>

      {/* Needs Attention Feed Shimmer */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: '18px',
          border: '1px solid rgba(234, 67, 53, 0.25)',
          background: 'rgba(234, 67, 53, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AlertTriangle size={18} color="var(--google-red)" />
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FCA5A5' }}>
            Needs Attention (Urgent Items)
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div className="skeleton-pulse" style={{ height: '42px', width: '100%', borderRadius: '10px' }} />
          <div className="skeleton-pulse" style={{ height: '42px', width: '100%', borderRadius: '10px' }} />
        </div>
      </div>

      {/* Committee Health Scorecards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Activity size={20} color="#34A853" />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Committee Health Scorecards
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="glass-panel"
              style={{
                padding: '1.5rem',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div className="skeleton-pulse" style={{ height: '18px', width: '140px', borderRadius: '4px' }} />
                  <div className="skeleton-pulse" style={{ height: '12px', width: '80px', borderRadius: '4px' }} />
                </div>
                <div className="skeleton-pulse" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
              </div>
              <div className="skeleton-pulse" style={{ height: '8px', width: '100%', borderRadius: '999px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton-pulse" style={{ height: '12px', width: '90px', borderRadius: '4px' }} />
                <div className="skeleton-pulse" style={{ height: '12px', width: '70px', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Onboarding & Event Satisfaction Widgets */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '220px' }}>
          <div className="skeleton-pulse" style={{ height: '20px', width: '180px', borderRadius: '4px' }} />
          <div className="skeleton-pulse" style={{ height: '80px', width: '100%', borderRadius: '12px' }} />
        </div>
        <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '220px' }}>
          <div className="skeleton-pulse" style={{ height: '20px', width: '180px', borderRadius: '4px' }} />
          <div className="skeleton-pulse" style={{ height: '80px', width: '100%', borderRadius: '12px' }} />
        </div>
      </div>
    </div>
  );
}
