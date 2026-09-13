import React from 'react';
import { 
  Clock, 
  UserCog, 
  User, 
  Mail, 
  Phone, 
  Check, 
  RotateCcw, 
  X 
} from 'lucide-react';

export function ApprovalsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* 2 Tabs Bar - exact match with LeadershipDashboardTabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '0.5rem',
        flexWrap: 'wrap',
      }}>
        {/* Tab 1: Pending */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            background: 'rgba(66, 133, 244, 0.15)',
            color: '#93C5FD',
            fontWeight: 700,
            fontSize: '0.95rem',
            borderBottom: '2px solid var(--google-blue)',
          }}
        >
          <Clock size={18} color="var(--google-blue)" />
          <span>Pending Approvals</span>
          <div className="skeleton-pulse" style={{ height: '18px', width: '24px', borderRadius: '999px' }} />
        </div>

        {/* Tab 2: Roster */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            color: 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          <UserCog size={18} />
          <span>Roster &amp; Account Controls</span>
        </div>
      </div>

      {/* Sub-header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem', color: '#FFFFFF' }}>
          Pending Candidate Applications
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Review onboarding applications submitted by applicants, assign department roles, and approve access.
        </p>
      </div>

      {/* Candidate Applications Cards List - exact match */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {[1, 2].map((idx) => (
          <div
            key={idx}
            className="glass-panel"
            style={{
              padding: '2rem',
              border: '1px solid var(--border-subtle)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Top 3px Blue Accent Strip */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'var(--google-blue)' }} />

            {/* Header: Candidate Info */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  className="skeleton-pulse"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: '2px solid rgba(66, 133, 244, 0.3)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div className="skeleton-pulse" style={{ height: '22px', width: '160px', borderRadius: '4px' }} />
                    <div className="skeleton-pulse" style={{ height: '18px', width: '110px', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Mail size={13} color="var(--text-muted)" />
                      <div className="skeleton-pulse" style={{ height: '13px', width: '140px', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Phone size={13} color="var(--text-muted)" />
                      <div className="skeleton-pulse" style={{ height: '13px', width: '90px', borderRadius: '4px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    background: 'rgba(251, 188, 4, 0.15)',
                    color: '#FDE047',
                    border: '1px solid rgba(251, 188, 4, 0.3)',
                    fontWeight: 600,
                  }}
                >
                  Pending Review
                </div>
                <div className="skeleton-pulse" style={{ height: '13px', width: '70px', borderRadius: '4px' }} />
              </div>
            </div>

            {/* Academic & Identification Overview 4-Column Box */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.85rem',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '1rem',
              borderRadius: '12px',
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>FACULTY &amp; MAJOR</span>
                <div className="skeleton-pulse" style={{ height: '16px', width: '130px', borderRadius: '4px' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>ACADEMIC YEAR</span>
                <div className="skeleton-pulse" style={{ height: '16px', width: '90px', borderRadius: '4px' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>STUDENT ID</span>
                <div className="skeleton-pulse" style={{ height: '16px', width: '100px', borderRadius: '4px' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>WEEKLY HOURS</span>
                <div className="skeleton-pulse" style={{ height: '16px', width: '80px', borderRadius: '4px' }} />
              </div>
            </div>

            {/* Decision & Assignment Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div className="input-field" style={{ height: '38px', minWidth: '160px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Assign Committee...
                </div>
                <div className="input-field" style={{ height: '38px', minWidth: '120px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Role: Member
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #34A853, #16A34A)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    opacity: 0.8,
                  }}
                >
                  <Check size={16} />
                  <span>Approve Access</span>
                </div>
                <div
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    background: 'rgba(251, 188, 4, 0.12)',
                    border: '1px solid rgba(251, 188, 4, 0.3)',
                    color: '#FDE047',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Changes</span>
                </div>
                <div
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    background: 'rgba(234, 67, 53, 0.12)',
                    border: '1px solid rgba(234, 67, 53, 0.3)',
                    color: '#F87171',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <X size={15} />
                  <span>Reject</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
