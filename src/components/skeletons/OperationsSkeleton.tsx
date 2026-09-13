import React from 'react';
import { Compass, CheckSquare, Calendar } from 'lucide-react';

export function OperationsSkeleton() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Compass size={24} color="var(--google-blue)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
            Operations &amp; Logistics Checklists
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.3rem 0 0' }}>
            Track pre-event readiness, venue approvals, audiovisual testing, and on-ground team roles.
          </p>
        </div>
      </div>

      {/* 3 Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div className="skeleton-pulse" style={{ height: '14px', width: '100px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '30px', width: '50px', borderRadius: '6px' }} />
          </div>
        ))}
      </div>

      {/* Operations Event Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="skeleton-pulse" style={{ height: '20px', width: '65%', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '22px', width: '70px', borderRadius: '999px' }} />
            </div>
            <div className="skeleton-pulse" style={{ height: '14px', width: '45%', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '8px', width: '100%', borderRadius: '999px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div className="skeleton-pulse" style={{ height: '13px', width: '90px', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '32px', width: '100px', borderRadius: '8px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
