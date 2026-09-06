export default function MemberProfileLoading() {
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

      <main
        style={{
          padding: '2.5rem 2rem',
          maxWidth: '1000px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Back Link Skeleton */}
        <div className="skeleton" style={{ width: '180px', height: '20px', borderRadius: '4px' }} />

        {/* Profile Banner & Header Card Skeleton */}
        <div
          className="skeleton-card"
          style={{
            padding: '2.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '2rem',
            flexWrap: 'wrap',
          }}
        >
          <div className="skeleton skeleton-avatar" style={{ width: '96px', height: '96px' }} />
          <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="skeleton skeleton-title" style={{ width: '240px', height: '32px', marginBottom: 0 }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="skeleton" style={{ width: '90px', height: '24px', borderRadius: '999px' }} />
              <div className="skeleton" style={{ width: '110px', height: '24px', borderRadius: '999px' }} />
            </div>
            <div className="skeleton skeleton-text" style={{ width: '350px', height: '16px', marginTop: '0.5rem', marginBottom: 0 }} />
            <div className="skeleton skeleton-text" style={{ width: '220px', height: '14px', marginBottom: 0 }} />
          </div>
        </div>

        {/* Tabs Bar Skeleton */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="skeleton" style={{ width: '140px', height: '40px', borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton" style={{ width: '160px', height: '40px', borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton" style={{ width: '150px', height: '40px', borderRadius: 'var(--radius-md)' }} />
        </div>

        {/* Content Section Skeleton */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <div className="skeleton-card" style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="skeleton skeleton-title" style={{ width: '140px', height: '20px' }} />
            <div className="skeleton skeleton-text" style={{ width: '100%', height: '14px' }} />
            <div className="skeleton skeleton-text" style={{ width: '90%', height: '14px' }} />
            <div className="skeleton skeleton-text" style={{ width: '70%', height: '14px' }} />
          </div>

          <div className="skeleton-card" style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="skeleton skeleton-title" style={{ width: '160px', height: '20px' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="skeleton" style={{ width: '70px', height: '26px', borderRadius: '999px' }} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
