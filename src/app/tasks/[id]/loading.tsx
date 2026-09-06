export default function TaskDetailLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main
        style={{
          padding: '2rem 1.5rem',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        {/* Top bar skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="skeleton" style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div className="skeleton skeleton-text" style={{ width: '120px', height: '12px' }} />
              <div className="skeleton skeleton-title" style={{ width: '260px', height: '22px', marginBottom: 0 }} />
            </div>
          </div>
          <div className="skeleton" style={{ width: '140px', height: '38px', borderRadius: 'var(--radius-md)' }} />
        </div>

        {/* 2-Column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem' }}>
          {/* Main column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="skeleton-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="skeleton" style={{ width: '90px', height: '24px', borderRadius: '999px' }} />
                <div className="skeleton" style={{ width: '110px', height: '24px', borderRadius: '999px' }} />
                <div className="skeleton" style={{ width: '140px', height: '24px', borderRadius: '999px' }} />
              </div>
              <div className="skeleton skeleton-title" style={{ width: '75%', height: '30px', marginTop: '0.5rem' }} />
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '14px' }} />
              <div className="skeleton skeleton-text" style={{ width: '85%', height: '14px' }} />
              <div className="skeleton" style={{ width: '100%', height: '70px', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }} />
            </div>

            <div className="skeleton-card" style={{ padding: '1.75rem', height: '220px' }} />
            <div className="skeleton-card" style={{ padding: '1.75rem', height: '260px' }} />
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="skeleton-card" style={{ padding: '1.5rem', height: '130px' }} />
            <div className="skeleton-card" style={{ padding: '1.5rem', height: '180px' }} />
            <div className="skeleton-card" style={{ padding: '1.5rem', height: '120px' }} />
          </div>
        </div>
      </main>
    </div>
  );
}
