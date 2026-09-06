export default function CommitteesSettingsLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
            <div className="skeleton" style={{ width: '140px', height: '24px', borderRadius: '999px' }} />
            <div className="skeleton skeleton-title" style={{ width: '340px', height: '36px', marginBottom: 0 }} />
            <div className="skeleton skeleton-text" style={{ width: '460px', maxWidth: '100%', height: '16px', marginBottom: 0 }} />
          </div>
          <div className="skeleton" style={{ width: '160px', height: '42px', borderRadius: 'var(--radius-md)' }} />
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="skeleton skeleton-text" style={{ width: '100px', height: '14px', marginBottom: 0 }} />
              <div className="skeleton skeleton-title" style={{ width: '60px', height: '30px', marginBottom: 0 }} />
            </div>
          ))}
        </div>

        {/* Committees Grid Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton-card" style={{ minHeight: '240px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton skeleton-title" style={{ width: '160px', height: '22px', marginBottom: 0 }} />
                <div className="skeleton" style={{ width: '60px', height: '22px', borderRadius: '999px' }} />
              </div>
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '14px' }} />
              <div className="skeleton skeleton-text" style={{ width: '80%', height: '14px' }} />
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: '110px', height: '28px', borderRadius: 'var(--radius-md)' }} />
                <div className="skeleton" style={{ width: '70px', height: '28px', borderRadius: 'var(--radius-md)' }} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
