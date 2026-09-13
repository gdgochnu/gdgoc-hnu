import React from 'react';
import { BarChart3, ClipboardList, Calendar } from 'lucide-react';

export function ReportsSkeleton() {
  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(66,133,244,0.25), rgba(66,133,244,0.1))',
            border: '1px solid rgba(66,133,244,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4285f4',
          }}
        >
          <BarChart3 size={24} />
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#FFFFFF',
            }}
          >
            Reports &amp; Analytics
          </h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Committee performance · Event analytics · Spec §4.12
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.375rem',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          width: 'fit-content',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            borderRadius: '11px',
            background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(66, 133, 244, 0.1))',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            color: '#93C5FD',
          }}
        >
          <ClipboardList size={16} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Committee Reports</div>
            <div style={{ fontSize: '0.67rem', color: '#93C5FD' }}>Weekly &amp; monthly performance</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            borderRadius: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <Calendar size={16} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>Event Analytics</div>
            <div style={{ fontSize: '0.67rem' }}>Attendance · Feedback · Budget</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="input-field" style={{ height: '40px', minWidth: '180px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Select Committee...
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="skeleton-pulse" style={{ height: '36px', width: '80px', borderRadius: '8px' }} />
          <div className="skeleton-pulse" style={{ height: '36px', width: '80px', borderRadius: '8px' }} />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton-pulse" style={{ height: '14px', width: '100px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '32px', width: '60px', borderRadius: '6px' }} />
            <div className="skeleton-pulse" style={{ height: '12px', width: '80px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>

      {/* Detailed Chart/Breakdown Card */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '260px' }}>
        <div className="skeleton-pulse" style={{ height: '20px', width: '220px', borderRadius: '4px' }} />
        <div className="skeleton-pulse" style={{ height: '160px', width: '100%', borderRadius: '12px' }} />
      </div>
    </div>
  );
}
