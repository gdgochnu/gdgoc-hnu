export default function DashboardLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar Skeleton */}
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
          <div className="skeleton" style={{ width: '100px', height: '36px', borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar Skeleton (Hidden on mobile via CSS if needed) */}
        <div
          style={{
            width: '260px',
            borderRight: '1px solid var(--border-subtle)',
            padding: '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'rgba(11, 15, 25, 0.5)',
          }}
        >
          <div className="skeleton skeleton-text" style={{ width: '50%', height: '12px', marginBottom: '0.75rem' }} />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                width: '100%',
                height: '42px',
                borderRadius: 'var(--radius-md)',
              }}
            />
          ))}
        </div>

        {/* Main Content Skeleton */}
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
          {/* Header Banner Skeleton */}
          <div
            className="skeleton-card"
            style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div className="skeleton skeleton-title" style={{ width: '320px', height: '28px' }} />
            <div className="skeleton skeleton-text" style={{ width: '550px', maxWidth: '100%', height: '16px' }} />
          </div>

          {/* 4 KPI Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="skeleton skeleton-text" style={{ width: '90px', height: '14px', marginBottom: 0 }} />
                  <div className="skeleton skeleton-avatar" style={{ width: '32px', height: '32px' }} />
                </div>
                <div className="skeleton skeleton-title" style={{ width: '80px', height: '32px', marginBottom: 0 }} />
                <div className="skeleton skeleton-text" style={{ width: '120px', height: '12px', marginBottom: 0 }} />
              </div>
            ))}
          </div>

          {/* 2 Big Column Widgets */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <div className="skeleton-card" style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton skeleton-title" style={{ width: '180px', height: '20px' }} />
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-md)' }} />
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-md)' }} />
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-md)' }} />
            </div>

            <div className="skeleton-card" style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton skeleton-title" style={{ width: '180px', height: '20px' }} />
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-md)' }} />
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-md)' }} />
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-md)' }} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
