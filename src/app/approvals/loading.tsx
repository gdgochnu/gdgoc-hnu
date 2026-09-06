export default function ApprovalsLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
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

      {/* Main Area */}
      <main
        style={{
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton" style={{ width: '130px', height: '24px', borderRadius: '999px' }} />
            <div className="skeleton skeleton-title" style={{ width: '360px', height: '36px', marginBottom: 0 }} />
            <div className="skeleton skeleton-text" style={{ width: '480px', maxWidth: '100%', height: '16px', marginBottom: 0 }} />
          </div>
          <div className="skeleton" style={{ width: '140px', height: '40px', borderRadius: 'var(--radius-md)' }} />
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="skeleton" style={{ width: '160px', height: '42px', borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton" style={{ width: '140px', height: '42px', borderRadius: 'var(--radius-md)' }} />
        </div>

        {/* Approvals Cards Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton-card"
              style={{
                padding: '1.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div className="skeleton skeleton-avatar" style={{ width: '56px', height: '56px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div className="skeleton skeleton-title" style={{ width: '180px', height: '20px', marginBottom: 0 }} />
                  <div className="skeleton skeleton-text" style={{ width: '220px', height: '14px', marginBottom: 0 }} />
                  <div className="skeleton" style={{ width: '100px', height: '20px', borderRadius: '999px' }} />
                </div>
              </div>

              {/* Action Buttons Skeleton */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="skeleton" style={{ width: '100px', height: '38px', borderRadius: 'var(--radius-md)' }} />
                <div className="skeleton" style={{ width: '100px', height: '38px', borderRadius: 'var(--radius-md)' }} />
                <div className="skeleton" style={{ width: '100px', height: '38px', borderRadius: 'var(--radius-md)' }} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
