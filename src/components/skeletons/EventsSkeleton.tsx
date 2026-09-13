import React from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  MapPin, 
  Clock, 
  ChevronRight 
} from 'lucide-react';

interface EventsSkeletonProps {
  canCreate?: boolean;
}

export function EventsSkeleton({ canCreate = false }: EventsSkeletonProps = {}) {
  const tabs = ['All', 'Drafts', 'In Review', 'Published', 'Completed'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Header - exact match */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(66, 133, 244, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Calendar size={22} color="var(--google-blue)" />
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              Events Hub &amp; Lifecycle
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.4rem', maxWidth: '650px', lineHeight: 1.5 }}>
            Design and launch chapter workshops, hackathons, and study jams. Complete draft creation, attach tasks, submit for review, and issue attendance QR codes.
          </p>
        </div>

        {canCreate && (
          <div
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.92rem',
              fontWeight: 700,
              opacity: 0.8,
            }}
          >
            <Plus size={18} />
            <span>Create New Event</span>
          </div>
        )}
      </div>

      {/* 4 Stats Cards Row - exact match with colored left borders */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
      }}>
        {/* Total Events */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Events
          </span>
          <div className="skeleton-pulse" style={{ height: '32px', width: '45px', borderRadius: '6px' }} />
        </div>

        {/* Drafts */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', borderLeft: '3px solid var(--google-yellow)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Drafts in Progress
          </span>
          <div className="skeleton-pulse" style={{ height: '32px', width: '45px', borderRadius: '6px' }} />
        </div>

        {/* In Review */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', borderLeft: '3px solid var(--google-blue)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Awaiting Review
          </span>
          <div className="skeleton-pulse" style={{ height: '32px', width: '45px', borderRadius: '6px' }} />
        </div>

        {/* Published */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', borderLeft: '3px solid var(--google-green)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Live &amp; Published
          </span>
          <div className="skeleton-pulse" style={{ height: '32px', width: '45px', borderRadius: '6px' }} />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {tabs.map((tab, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  background: idx === 0 ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: idx === 0 ? '#93C5FD' : 'var(--text-secondary)',
                  border: idx === 0 ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid transparent',
                }}
              >
                {tab}
              </div>
            ))}
          </div>

          {/* Department Select */}
          <div className="input-field" style={{ height: '38px', minWidth: '170px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            All Departments
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <div
            className="input-field"
            style={{ paddingLeft: '2.4rem', height: '40px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}
          >
            <span style={{ opacity: 0.6 }}>Search events by title, venue, or keyword...</span>
          </div>
        </div>
      </div>

      {/* 6 Event Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="glass-panel"
            style={{
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '340px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* Event Cover Image */}
            <div
              className="skeleton-pulse"
              style={{
                height: '160px',
                width: '100%',
                borderRadius: '16px 16px 0 0',
              }}
            />

            {/* Card Content */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              {/* Badges row */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div className="skeleton-pulse" style={{ height: '22px', width: '70px', borderRadius: '999px' }} />
                <div className="skeleton-pulse" style={{ height: '22px', width: '90px', borderRadius: '6px' }} />
              </div>

              {/* Title lines */}
              <div className="skeleton-pulse" style={{ height: '20px', width: '85%', borderRadius: '4px' }} />

              {/* Venue */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} color="var(--text-muted)" />
                <div className="skeleton-pulse" style={{ height: '14px', width: '55%', borderRadius: '4px' }} />
              </div>

              {/* Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={14} color="var(--text-muted)" />
                <div className="skeleton-pulse" style={{ height: '14px', width: '40%', borderRadius: '4px' }} />
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div className="skeleton-pulse" style={{ width: '26px', height: '26px', borderRadius: '50%' }} />
                  <div className="skeleton-pulse" style={{ height: '12px', width: '70px', borderRadius: '4px' }} />
                </div>
                <div className="skeleton-pulse" style={{ height: '32px', width: '100px', borderRadius: '8px' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
