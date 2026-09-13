import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export function ContentCalendarSkeleton() {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(234, 67, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={22} color="var(--google-red)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              Content &amp; Event Calendar
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>
              Monthly schedule of workshops, registration deadlines, and social campaigns.
            </p>
          </div>
        </div>

        {/* Month controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="skeleton-pulse" style={{ height: '36px', width: '36px', borderRadius: '8px' }} />
          <div className="skeleton-pulse" style={{ height: '22px', width: '140px', borderRadius: '4px' }} />
          <div className="skeleton-pulse" style={{ height: '36px', width: '36px', borderRadius: '8px' }} />
        </div>
      </div>

      {/* Calendar Grid Shimmer */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Days of week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.5rem 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '90px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i + 1}</span>
              {i % 4 === 0 && (
                <div className="skeleton-pulse" style={{ height: '18px', width: '90%', borderRadius: '4px' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
