export default function MembersLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header bar placeholder */}
      <div
        className="header-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '65px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="skeleton skeleton-avatar" style={{ width: '36px', height: '36px' }} />
          <div className="skeleton skeleton-title" style={{ width: '140px', height: '20px', marginBottom: 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="skeleton skeleton-avatar" style={{ width: '36px', height: '36px' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Main Directory Area */}
        <main
          style={{
            flex: 1,
            padding: '2.5rem 2rem',
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {/* Header Skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton" style={{ width: '120px', height: '24px', borderRadius: '999px' }} />
            <div className="skeleton skeleton-title" style={{ width: '380px', height: '36px', marginBottom: '0.2rem' }} />
            <div className="skeleton skeleton-text" style={{ width: '500px', maxWidth: '100%', height: '16px' }} />
          </div>

          {/* Search & Filter Bar Skeleton */}
          <div
            className="skeleton-card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="skeleton" style={{ flex: 1, minWidth: '240px', height: '42px', borderRadius: 'var(--radius-md)' }} />
              <div className="skeleton" style={{ width: '160px', height: '42px', borderRadius: 'var(--radius-md)' }} />
            </div>

            {/* Department Filter Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton" style={{ width: '80px', height: '28px', borderRadius: '999px' }} />
              ))}
            </div>
          </div>

          {/* Member Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="skeleton-card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  textAlign: 'center',
                }}
              >
                <div className="skeleton skeleton-avatar" style={{ width: '72px', height: '72px' }} />
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  <div className="skeleton skeleton-title" style={{ width: '140px', height: '20px', marginBottom: 0 }} />
                  <div className="skeleton" style={{ width: '90px', height: '22px', borderRadius: '999px' }} />
                  <div className="skeleton skeleton-text" style={{ width: '120px', height: '14px', marginTop: '0.4rem', marginBottom: 0 }} />
                </div>
                <div className="skeleton" style={{ width: '100%', height: '36px', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }} />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
