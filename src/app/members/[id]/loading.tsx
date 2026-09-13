import React from 'react';

export default function MemberProfileLoading() {
  return (
    <div
      style={{
        padding: '2.5rem 2rem 5rem',
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* Top Controls Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div
          className="skeleton"
          style={{ width: '220px', height: '38px', borderRadius: '10px' }}
        />
        <div
          className="skeleton"
          style={{ width: '130px', height: '38px', borderRadius: '10px' }}
        />
      </div>

      {/* Hero Profile Banner Card Skeleton */}
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem 2rem',
          borderRadius: '24px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        {/* Shimmering Top Accent Strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, rgba(66, 133, 244, 0.4), rgba(234, 67, 53, 0.4), rgba(251, 188, 4, 0.4), rgba(52, 168, 83, 0.4))',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
          {/* Avatar & Main Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
            <div
              className="skeleton"
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                flexShrink: 0,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Name Skeleton */}
              <div
                className="skeleton skeleton-title"
                style={{ width: '280px', height: '32px', marginBottom: 0 }}
              />
              {/* Position & Role Pills */}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <div
                  className="skeleton"
                  style={{ width: '150px', height: '26px', borderRadius: '999px' }}
                />
                <div
                  className="skeleton"
                  style={{ width: '130px', height: '26px', borderRadius: '999px' }}
                />
              </div>
              {/* Quick Contacts Skeleton */}
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem' }}>
                <div className="skeleton" style={{ width: '90px', height: '28px', borderRadius: '8px' }} />
                <div className="skeleton" style={{ width: '100px', height: '28px', borderRadius: '8px' }} />
                <div className="skeleton" style={{ width: '85px', height: '28px', borderRadius: '8px' }} />
              </div>
            </div>
          </div>

          {/* Quick Metrics Skeleton on the Right */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div
              className="skeleton"
              style={{ width: '100px', height: '70px', borderRadius: '16px' }}
            />
            <div
              className="skeleton"
              style={{ width: '100px', height: '70px', borderRadius: '16px' }}
            />
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar Skeleton */}
      <div
        style={{
          display: 'flex',
          gap: '0.65rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
      >
        <div className="skeleton" style={{ width: '140px', height: '42px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ width: '160px', height: '42px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ width: '190px', height: '42px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ width: '170px', height: '42px', borderRadius: '12px' }} />
      </div>

      {/* Tab Content 2-Column Cards Grid Skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Card 1: About & Bio */}
        <div
          className="skeleton-card"
          style={{
            padding: '2rem',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            minHeight: '220px',
          }}
        >
          <div className="skeleton skeleton-title" style={{ width: '160px', height: '22px' }} />
          <div className="skeleton skeleton-text" style={{ width: '100%', height: '14px' }} />
          <div className="skeleton skeleton-text" style={{ width: '92%', height: '14px' }} />
          <div className="skeleton skeleton-text" style={{ width: '78%', height: '14px' }} />
          <div className="skeleton skeleton-text" style={{ width: '60%', height: '14px' }} />
        </div>

        {/* Card 2: Academic & University */}
        <div
          className="skeleton-card"
          style={{
            padding: '2rem',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            minHeight: '220px',
          }}
        >
          <div className="skeleton skeleton-title" style={{ width: '180px', height: '22px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="skeleton" style={{ width: '100%', height: '36px', borderRadius: '10px' }} />
            <div className="skeleton" style={{ width: '100%', height: '36px', borderRadius: '10px' }} />
          </div>
        </div>

        {/* Card 3: Skills & Expertise */}
        <div
          className="skeleton-card"
          style={{
            padding: '2rem',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            minHeight: '200px',
          }}
        >
          <div className="skeleton skeleton-title" style={{ width: '150px', height: '22px' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[80, 110, 95, 70, 120, 85, 100].map((w, idx) => (
              <div
                key={idx}
                className="skeleton"
                style={{ width: `${w}px`, height: '28px', borderRadius: '8px' }}
              />
            ))}
          </div>
        </div>

        {/* Card 4: Assigned Department */}
        <div
          className="skeleton-card"
          style={{
            padding: '2rem',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            minHeight: '200px',
          }}
        >
          <div className="skeleton skeleton-title" style={{ width: '170px', height: '22px' }} />
          <div className="skeleton" style={{ width: '100%', height: '60px', borderRadius: '12px' }} />
        </div>
      </div>
    </div>
  );
}
